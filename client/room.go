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

type Room struct {
	Width     int
	Height    int
	StartMass int
	MergeTime int
	Actors    [MaxEnts]*Actor
	Players   [MaxPlayers]*Player

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

func (r *Room) emulateMovement() {

}

func (r *Room) checkCollisions() {

}

func (r *Room) sendUpdates() {
	r.emuLock.RLock()
	for _, actor := range r.Actors {
		if actor == nil {
			continue
		}
		if actor.moved {
			for _, player := range r.Players {
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
	}
	r.emuLock.RUnlock()
}

func (r *Room) SetDimensions(x, y int) {
	r.Width = x
	r.Height = y
}

func (r *Room) Accept(p Protocol) {
	player := &Player{Net: p, room: r, ID: r.getPlayerId()}
	player.Net.WriteRoom(r)

	r.emuLock.Lock()
	r.Players[player.ID] = player
	r.emuLock.Unlock()

	r.emuLock.RLock()
	for _, oActor := range r.Actors {
		if oActor == nil {
			continue
		}
		player.Net.WriteNewActor(oActor)
	}
	r.emuLock.RUnlock()
	player.NewActor(rand.Intn(r.Width), rand.Intn(r.Height), r.StartMass)

	for {
		reason := p.GetMessage(r)
		if reason != nil {
			log.Println("REMOVING BECAUSE", reason)
			break
		}
	}
	player.Remove()
}

func (r *Room) getId() int {
	r.emuLock.RLock()
	defer r.emuLock.RUnlock()
	for id, found := range r.Actors {
		if found == nil {
			return id
		}
	}
	return -1
}

func (r *Room) getPlayerId() int {
	r.emuLock.RLock()
	defer r.emuLock.RUnlock()
	for id, found := range r.Players {
		if found == nil {
			return id
		}
	}
	return -1
}

func (r *Room) getActor(id int) *Actor {
	r.emuLock.RLock()
	defer r.emuLock.RUnlock()
	return r.Actors[id]
}
