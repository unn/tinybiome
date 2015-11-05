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
const MaxPellets = 10000

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

func (r *Room) run() {
	r.createPellets()
	r.checkCollisions()
	r.sendUpdates()
}

func NewRoom() *Room {
	r := &Room{
		ticker:    time.NewTicker(time.Millisecond * 10),
		StartMass: 100,
		MergeTime: 10,
	}

	go func() {
		for range r.ticker.C {
			r.run()
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

type lockTracker struct {
	t      *time.Timer
	rw     *sync.RWMutex
	title  string
	read   bool
	locked bool
}

func (r *Room) createPellets() {
	if r.PelletCount < MaxPellets {
		newPel := &Pellet{
			X:    rand.Intn(r.Width),
			Y:    rand.Intn(r.Height),
			room: r,
		}
		newPel.Create()
	}
}

func (r *Room) checkCollisions() {

}

func (r *Room) sendUpdates() {
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
				if actor.Player == player {
					continue
				}
				if player == nil {
					continue
				}
				player.Net.WriteMoveActor(actor)
				player.Net.WriteSetMassActor(actor)
			}
			actor.moved = false
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
	player := &Player{Net: p, room: r}
	player.ID = r.getPlayerId(player)
	player.Net.WriteRoom(r)

	log.Println(player, "IN LIST", r.Actors[:r.HighestID], "possible actors")

	done := r.Read("Sending all existing actors and pellets")
	player.Net.MultiStart()
	for _, oActor := range r.Actors[:r.HighestID] {
		if oActor == nil {
			continue
		}
		player.Net.WriteNewActor(oActor)
	}
	player.Net.MultiSend()
	player.Net.MultiStart()
	for _, pel := range r.Pellets[:r.PelletCount] {
		player.Net.WriteNewPellet(pel)
	}
	player.Net.MultiSend()
	done()

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

func NewLockTracker(title string, rw *sync.RWMutex, read bool) func() {
	l := &lockTracker{nil, rw, title, read, false}
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
}
func (l *lockTracker) Timed() {
	if l.locked {
		log.Println("NEVER UNLOCKED", l.title)
	} else {
		log.Println("FAILED TO LOCK", l.title)
	}
}
