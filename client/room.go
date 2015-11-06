package client

import (
	"log"
	"math"
	"math/rand"
	"sync"
	"time"
)

const MaxEnts = 256 * 256
const MaxPlayers = 1024
const MaxOwns = 16
const MaxPellets = 20000
const TickLen = 50

type Room struct {
	Width       int64
	Height      int64
	StartMass   int64
	MergeTime   int64
	Actors      [MaxEnts]*Actor
	Players     [MaxPlayers]*Player
	HighestID   int64
	Pellets     [MaxPellets]*Pellet
	PelletCount int64

	ticker  *time.Ticker
	emuLock sync.RWMutex
}

func (r *Room) run(d time.Duration) {
	r.updatePositions(d)
	r.createPellets(d)
	r.addDecay()
	r.sendUpdates(d)
}

func NewRoom() *Room {
	r := &Room{
		ticker:    time.NewTicker(time.Millisecond * TickLen),
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
func (r *Room) createPellets(d time.Duration) {
	perSecond := (1 - math.Pow(float64(r.PelletCount)/float64(MaxPellets), 2)) * float64(r.Width*r.Height) / 100
	for i := int64(0); i < int64(d.Seconds()*perSecond); i++ {
		if r.PelletCount < MaxPellets {
			newPel := &Pellet{
				X:    int64(rand.Intn(int(r.Width))),
				Y:    int64(rand.Intn(int(r.Height))),
				Type: int64(rand.Intn(2)),
				room: r,
			}
			newPel.Create()
		}
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
	nPlayers := 0
	for _, player := range r.Players {
		if player == nil {
			continue
		}
		nPlayers += 1
	}
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
		time.Sleep(time.Millisecond * time.Duration(TickLen/nPlayers))
	}
	for _, actor := range r.Actors[:r.HighestID] {
		if actor == nil {
			continue
		}
		actor.moved = false
	}
}

func (r *Room) SetDimensions(x, y int64) {
	r.Width = int64(x)
	r.Height = int64(y)
}

func (r *Room) Accept(p Protocol) {
	p.WriteRoom(r)
	done := r.Read("Sending all existing actors and pellets")

	start := time.Now()
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
	p.WritePelletsIncoming(r.Pellets[:r.PelletCount])
	took := time.Since(start)
	done()
	p.MultiSend()

	player := r.NewPlayer(p)
	log.Println(player, "IN LIST", r.Actors[:r.HighestID], "possible actors")

	log.Println(player, "INITIAL SYNC COMPLETE IN", took)

	for {
		reason := p.GetMessage(player)
		if reason != nil {
			log.Println("REMOVING BECAUSE", reason)
			break
		}
	}
	player.Remove()
}

func (r *Room) getId(a *Actor) int64 {
	done := r.Write("Getting new ID")
	defer done()
	for id64, found := range r.Actors {
		id := int64(id64)
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

func (r *Room) getPlayerId(p *Player) int64 {
	done := r.Write("Getting new PID")
	defer done()
	for a, found := range r.Players {
		id := int64(a)
		if found == nil {
			r.Players[id] = p
			return id
		}
	}
	log.Println("OUT OF PLAYER IDS?")
	return -1
}

func (r *Room) getActor(id int64) *Actor {
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
