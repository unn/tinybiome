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

type Actor struct {
	ID     int
	X      int
	Y      int
	moved  bool
	Mass   int
	Player *Player
}

func (a *Actor) Move(x, y int) {
	a.X = x
	a.Y = y
	a.moved = true
}

func (a *Actor) Split() {
	if a.Mass < 10 {
		return
	}
	a.Player.Net.MultiStart()
	a.Remove()
	a.Player.NewActor(a.X-10, a.Y-10, int(float64(a.Mass)*.45))
	a.Player.NewActor(a.X+10, a.Y+10, int(float64(a.Mass)*.45))
	a.Player.Net.MultiSend()
}

func (a *Actor) Remove() {
	r := a.Player.room
	r.emuLock.Lock()
	r.Actors[a.ID] = nil
	for _, player := range r.Players {
		if player == nil {
			continue
		}
		player.Net.WriteDestroyActor(a)
	}
	r.emuLock.Unlock()

	a.Player.EditLock.Lock()
	for n, oActor := range a.Player.Owns {
		if oActor == a {
			a.Player.Owns[n] = nil
			break
		}
	}
	a.Player.EditLock.Unlock()
}

type Player struct {
	ID       int
	Net      Protocol
	room     *Room
	Owns     [MaxOwns]*Actor
	EditLock sync.RWMutex
}

func (p *Player) NewActor(x, y, mass int) *Actor {
	r := p.room
	id := r.getId()
	actor := &Actor{ID: id, X: x, Y: y, Player: p, Mass: mass}

	r.emuLock.Lock()
	r.Actors[id] = actor
	r.emuLock.Unlock()

	r.emuLock.RLock()
	for _, oPlayer := range r.Players {
		if oPlayer == nil {
			continue
		}
		oPlayer.Net.WriteNewActor(actor)
	}
	r.emuLock.RUnlock()

	p.EditLock.Lock()
	for n, a := range p.Owns {
		if a == nil {
			p.Owns[n] = actor
			break
		}
	}
	p.EditLock.Unlock()

	p.Net.WriteOwns(p)

	return actor
}

func (p *Player) Remove() {
	r := p.room
	for _, actor := range r.Actors {
		if actor == nil {
			continue
		}
		if actor.Player == p {
			actor.Remove()
		}
	}
}

type Room struct {
	Width     int
	Height    int
	StartMass int
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
		StartMass: 50,
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
