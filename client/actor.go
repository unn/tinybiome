package client

import (
	"fmt"
	"log"
	"math"
	"sync"
	"time"
)

// types: 0 vitamind, 1 mineral
type Pellet struct {
	X    int
	Y    int
	room *Room
	ID   int
	Mass int
	Type int
}

func (p *Pellet) Create() {
	p.Mass = 3
	done := p.room.Write("Creating Pellet")
	if p.room.PelletCount < MaxPellets {
		for _, b := range p.room.Players {
			if b == nil {
				continue
			}
			b.Net.WriteNewPellet(p)
		}
		p.ID = p.room.PelletCount
		p.room.Pellets[p.ID] = p
		p.room.PelletCount += 1
	}
	done()
}
func (p *Pellet) Remove() {
	done := p.room.Write("Removing Pellet")
	for _, b := range p.room.Players {
		if b == nil {
			continue
		}
		b.Net.WriteDestroyPellet(p)
	}
	r := p.room
	r.PelletCount -= 1
	r.Pellets[p.ID] = r.Pellets[r.PelletCount]
	r.Pellets[p.ID].ID = p.ID

	done()

}

type Actor struct {
	ID         int
	X          int
	Y          int
	moved      bool
	Mass       int
	Player     *Player
	MergeTime  time.Time
	radius     float64
	LastUpdate time.Time
	DecayLevel int
}

func (a *Actor) Decay() {
	m := a.Mass
	if a.DecayLevel < a.Mass {
		a.DecayLevel += 1
	}
	if a.DecayLevel > a.Mass {
		a.DecayLevel = a.Mass
	}
	a.Mass -= a.DecayLevel / 1000
	if a.Mass != m {
		a.Player.Net.WriteSetMassActor(a)
	}
}
func (a *Actor) RecalcRadius() {
	a.radius = math.Sqrt(float64(a.Mass) / math.Pi)
}
func (a *Actor) Radius() float64 {
	return a.radius
}

func (a *Actor) Move(x, y int) {
	dx := float64(x - a.X)
	dy := float64(y - a.Y)
	dist := math.Sqrt(dx*dx + dy*dy)
	allowed := 1.2 * (4 / (math.Pow(.46*float64(a.Mass), .1)))
	frames := time.Since(a.LastUpdate).Seconds() * 1000 / (1000 / 60)
	allowed = allowed * frames
	a.LastUpdate = time.Now()
	if dist > allowed {
		dx = dx / dist * allowed
		dy = dy / dist * allowed
	}

	a.X += int(dx)
	a.Y += int(dy)

	consumes := []*Actor{}
	done := a.Player.room.Read("Moving player")
	for _, b := range a.Player.room.Actors[:a.Player.room.HighestID] {
		if b == a || b == nil {
			continue
		}
		dx := float64(b.X - a.X)
		dy := float64(b.Y - a.Y)
		dist := math.Sqrt(dx*dx + dy*dy)
		if dist == 0 {
			dist = .01
		}
		allowedDist := a.Radius() + b.Radius()
		depth := allowedDist - dist
		if depth > 0 {
			if b.Player == a.Player && !a.CanEat(b) {
				dx = dx / dist * depth
				dy = dy / dist * depth
				a.X -= int(dx)
				a.Y -= int(dy)
				a.Player.Net.WriteMoveActor(a)
			}
			if (dist < a.Radius() || dist < b.Radius()) && a.CanEat(b) {
				consumes = append(consumes, b)
			}
		}
	}
	pellets := []*Pellet{}
	r := a.Player.room
	for _, p := range r.Pellets[:r.PelletCount] {
		dx := p.X - a.X
		dy := p.Y - a.Y
		dist := float64(dx*dx + dy*dy)
		allowedDist := 3 + a.Radius()
		if dist < allowedDist*allowedDist {
			pellets = append(pellets, p)
		}
	}

	done()

	for i := 0; i < len(consumes); i += 1 {
		a.Consume(consumes[i])
	}
	for i := 0; i < len(pellets); i += 1 {
		a.ConsumePellet(pellets[i])
	}
	a.moved = true
}

func (a *Actor) CanMerge() bool {
	return a.MergeTime.Before(time.Now())
}

func (a *Actor) CanEat(b *Actor) bool {
	if a.Player == b.Player {
		if a.CanMerge() && b.CanMerge() {
			return true
		}
		return false
	}
	if float64(a.Mass) > float64(b.Mass)*1.10 {
		return true
	}
	return false
}

func (a *Actor) Consume(b *Actor) {
	log.Println(a, "CONSUMES", b)
	a.Mass += int(float64(b.Mass) * .9)
	a.RecalcRadius()
	b.Remove()
	a.Player.Net.WriteSetMassActor(a)
}

func (a *Actor) ConsumePellet(b *Pellet) {
	if b.Type == 0 {
		a.DecayLevel /= 2
	} else {
		a.Mass += int(float64(b.Mass) * .9)
	}
	a.RecalcRadius()
	b.Remove()
	a.Player.Net.WriteSetMassActor(a)
}

func (a *Actor) String() string {
	return fmt.Sprintf("%d (m:%d, o:%s)", a.ID, a.Mass, a.Player)
}

func (a *Actor) Split() {
	if a.Mass < 30 {
		return
	}
	a.Player.Net.MultiStart()
	a.Player.NewActor(a.X-1, a.Y-1, int(float64(a.Mass)*.45))
	a.Player.NewActor(a.X+1, a.Y+1, int(float64(a.Mass)*.45))
	a.Remove()
	a.Player.Net.MultiSend()
}

func (a *Actor) Remove() {
	a.Player.EditLock.Lock()
	for n, oActor := range a.Player.Owns {
		if oActor == a {
			a.Player.Owns[n] = nil
			break
		}
	}
	a.Player.EditLock.Unlock()

	a.Player.Net.WriteOwns(a.Player)

	r := a.Player.room
	done := r.Write("Removing actor")
	r.Actors[a.ID] = nil
	for _, player := range r.Players {
		if player == nil {
			continue
		}
		player.Net.WriteDestroyActor(a)
	}
	done()
}

type Player struct {
	ID       int
	Net      Protocol
	room     *Room
	Owns     [MaxOwns]*Actor
	EditLock sync.RWMutex
	Name     string
}

func (p *Player) NewActor(x, y, mass int) *Actor {
	r := p.room
	actor := &Actor{X: x, Y: y, Player: p, Mass: mass,
		MergeTime: time.Now().Add(time.Duration(r.MergeTime) * time.Second)}
	actor.RecalcRadius()
	id := r.getId(actor)
	actor.ID = id
	log.Println("NEW ACTOR", actor)

	done := r.Read("Updating players on new actor")
	for _, oPlayer := range r.Players {
		if oPlayer == nil {
			continue
		}
		oPlayer.Net.WriteNewActor(actor)
	}
	done()

	p.EditLock.Lock()
	for n, a := range p.Owns {
		if a == nil {
			p.Owns[n] = actor
			break
		}
	}
	p.EditLock.Unlock()

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
	done := r.Write("Removing player")
	r.Players[p.ID] = nil
	for _, oPlayer := range r.Players {
		if oPlayer == nil {
			continue
		}
		oPlayer.Net.WriteDestroyPlayer(p)
	}
	done()
}

func (p *Player) String() string {
	return fmt.Sprintf("#%d (%s)", p.ID, p.Name)
}

func (p *Player) Rename(n string) {
	if len(n) > 100 {
		n = n[:100]
	}
	p.Name = n
	done := p.room.Read("Updating name to player")
	for _, oPlayer := range p.room.Players {
		if oPlayer == nil {
			continue
		}
		oPlayer.Net.WriteNamePlayer(p)
	}
	done()
}
