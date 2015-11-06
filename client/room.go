package client

import (
	"log"
	"math/rand"
	"sync"
	"time"
)

const MaxEnts = 256 * 256
const MaxPlayers = 1024
const MaxOwns = 16
const MaxPellets = 5000

type Room struct {
	Width       int
	Height      int
	StartMass   int
	MergeTime   int
	Actors      [MaxEnts]*Actor
	Players     [MaxPlayers]*Player
	HighestID   int
	Pellets     [MaxPellets]*Pellet
	PelletCount int

	ticker  *time.Ticker
	emuLock sync.RWMutex
}

func (r *Room) run(d time.Duration) {
	r.updatePositions(d)
	r.createPellets()
	r.addDecay()
	r.sendUpdates(d)
}

func NewRoom() *Room {
	r := &Room{
		ticker:    time.NewTicker(time.Millisecond * 10),
		StartMass: 100,
		MergeTime: 10,
	}

	go func() {
		lastTick := time.Now()
		for range r.ticker.C {
			now := time.Now()
			r.run(now.Sub(lastTick))
			lastTick = now
		}
	}()
	return r
}

func (r *Room) Read(title string) func() {
	return NewLockTracker(title, &r.emuLock, true)
}
func (r *Room) Write(title string) func() {
	return NewLockTracker(title, &r.emuLock, false)
}
func (r *Room) updatePositions(d time.Duration) {
	for _, actor := range r.Actors[:r.HighestID] {
		if actor == nil {
			continue
		}
		actor.Tick(d)
	}
}
func (r *Room) createPellets() {
	if r.PelletCount < MaxPellets {
		newPel := &Pellet{
			X:    rand.Intn(r.Width),
			Y:    rand.Intn(r.Height),
			Type: rand.Intn(2),
			room: r,
		}
		newPel.Create()
	}
}

func (r *Room) addDecay() {
	done := r.Read("Add Decay")
	for _, actor := range r.Actors[:r.HighestID] {
		if actor == nil {
			continue
		}
		actor.Decay()
	}
	done()
}

func (r *Room) sendUpdates(d time.Duration) {
	for _, player := range r.Players {
		if player == nil {
			continue
		}
		player.Net.MultiStart()
		for _, actor := range r.Actors[:r.HighestID] {
			if actor == nil {
				continue
			}
			if actor.moved {
				player.Net.WriteMoveActor(actor)
				player.Net.WriteSetMassActor(actor)
			}
		}
		player.Net.MultiSend()
	}
	for _, actor := range r.Actors[:r.HighestID] {
		if actor == nil {
			continue
		}
		actor.moved = false
	}
}

func (r *Room) SetDimensions(x, y int) {
	r.Width = x
	r.Height = y
}

func (r *Room) Accept(p Protocol) {

	p.WriteRoom(r)
	done := r.Read("Sending all existing actors and pellets")
	p.MultiStart()
	for _, oPlayer := range r.Players {
		if oPlayer == nil {
			continue
		}
		p.WriteNewPlayer(oPlayer)
	}
	for _, oActor := range r.Actors[:r.HighestID] {
		if oActor == nil {
			continue
		}
		p.WriteNewActor(oActor)
	}
	for _, pel := range r.Pellets[:r.PelletCount] {
		p.WriteNewPellet(pel)
	}
	p.MultiSend()
	done()

	player := r.NewPlayer(p)
	log.Println(player, "IN LIST", r.Actors[:r.HighestID], "possible actors")

	log.Println(player, "INITIAL SYNC COMPLETE")

	for {
		reason := p.GetMessage(player)
		if reason != nil {
			log.Println("REMOVING BECAUSE", reason)
			break
		}
	}
	player.Remove()
}

func (r *Room) getId(a *Actor) int {
	done := r.Write("Getting new ID")
	defer done()
	for id, found := range r.Actors {
		if found == nil {
			if id+1 > r.HighestID {
				r.HighestID = id + 1
			}
			r.Actors[id] = a
			return id
		}
	}
	log.Println("OUT OF ACTOR IDS?")
	return -1
}

func (r *Room) getPlayerId(p *Player) int {
	done := r.Write("Getting new PID")
	defer done()
	for id, found := range r.Players {
		if found == nil {
			r.Players[id] = p
			return id
		}
	}
	log.Println("OUT OF PLAYER IDS?")
	return -1
}

func (r *Room) getActor(id int) *Actor {
	done := r.Read("Looking up Actor")
	defer done()
	return r.Actors[id]
}

func (r *Room) NewPlayer(p Protocol) *Player {
	player := &Player{Net: p, room: r}
	player.ID = r.getPlayerId(player)
	done := r.Read("Updating players on new player")
	for _, oPlayer := range r.Players {
		if oPlayer == nil {
			continue
		}
		oPlayer.Net.WriteNewPlayer(player)
	}
	done()
	player.Net.WriteOwns(player)
	return player
}

type lockTracker struct {
	st     time.Time
	t      *time.Timer
	rw     *sync.RWMutex
	title  string
	read   bool
	locked bool
}

func NewLockTracker(title string, rw *sync.RWMutex, read bool) func() {
	l := &lockTracker{time.Now(), nil, rw, title, read, false}
	l.t = time.AfterFunc(time.Second, l.Timed)
	if read {
		rw.RLock()
	} else {
		rw.Lock()
	}
	l.locked = true
	return l.Done
}
func (l *lockTracker) Done() {
	if l.read {
		l.rw.RUnlock()
	} else {
		l.rw.Unlock()
	}
	l.t.Stop()
	if time.Since(l.st) > time.Second {
		log.Println("TOOK", time.Since(l.st), l.title)
	}
}

func (l *lockTracker) Timed() {
	if l.locked {
		log.Println("NEVER UNLOCKED", l.title)
	} else {
		log.Println("FAILED TO LOCK", l.title)
	}
}
