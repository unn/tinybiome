package client

import (
	"log"
	"sync"
	"time"
)

const MaxEnts = 256 * 256

type Actor struct {
	ID    int
	X     int
	Y     int
	Net   Protocol
	moved bool
}

type Room struct {
	Width   int
	Height  int
	Sockets [MaxEnts]*Actor

	ticker  *time.Ticker
	emuLock sync.RWMutex
}

func (r *Room) run() {
	r.emuLock.RLock()
	defer r.emuLock.RUnlock()

	r.emulateMovement()
	r.checkCollisions()
	r.sendUpdates()
}

func NewRoom() *Room {
	r := &Room{
		ticker: time.NewTicker(time.Millisecond * 10),
	}

	go func() {
		for range r.ticker.C {
			r.run()
		}
	}()
	return r
}

func (r *Room) emulateMovement() {

}

func (r *Room) checkCollisions() {

}

func (r *Room) sendUpdates() {
	r.emuLock.RLock()
	for id, actor := range r.Sockets {
		if actor == nil {
			continue
		}
		if actor.moved {
			for oId, oActor := range r.Sockets {
				if oId == id {
					continue
				}
				if oActor == nil {
					continue
				}
				oActor.Net.WriteMovePlayer(actor)
			}
			actor.moved = false
		}
	}
	r.emuLock.RUnlock()
}

func (r *Room) SetDimensions(x, y int) {
	r.Width = x
	r.Height = y
}

func (r *Room) Accept(p Protocol) {
	id := r.getId()
	actor := &Actor{ID: id, X: 50, Y: 50, Net: p}

	actor.Net.WriteRoom(r)

	r.emuLock.Lock()
	r.Sockets[id] = actor
	r.emuLock.Unlock()

	r.emuLock.RLock()
	for _, oActor := range r.Sockets {
		if oActor == nil {
			continue
		}
		actor.Net.WriteNewPlayer(oActor)
		if oActor == actor {
			oActor.Net.WriteOwnsPlayer(actor)
		} else {
			oActor.Net.WriteNewPlayer(actor)
		}
	}

	r.emuLock.RUnlock()

	for {
		reason := p.GetMessage(r)
		if reason != nil {
			log.Println("REMOVING BECAUSE", reason)
			break
		}
	}
	r.Remove(actor)
}

func (r *Room) Moved(actor *Actor) {
	actor.moved = true
}

func (r *Room) Remove(actor *Actor) {
	r.emuLock.Lock()
	r.Sockets[actor.ID] = nil
	for _, oActor := range r.Sockets {
		if oActor == nil {
			continue
		}
		oActor.Net.WriteDestroyPlayer(actor)
	}
	r.emuLock.Unlock()
}

func (r *Room) getId() int {
	r.emuLock.RLock()
	defer r.emuLock.RUnlock()
	for id, found := range r.Sockets {
		if found == nil {
			return id
		}
	}
	return -1
}

func (r *Room) getActor(id int) *Actor {
	r.emuLock.RLock()
	defer r.emuLock.RUnlock()
	return r.Sockets[id]

}
