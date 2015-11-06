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
	X    int64
	Y    int64
	room *Room
	ID   int64
	Mass int64
	Type int64
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
	ID        int64
	X         float64
	Y         float64
	Direction float64
	Speed     float64
	moved     bool
	Mass      float64

	XSpeed float64
	YSpeed float64

	Player     *Player
	MergeTime  time.Time
	radius     float64
	LastUpdate time.Time
	DecayLevel float64
}

func (a *Actor) Decay() {
	m := a.Mass
	if a.DecayLevel < a.Mass {
		a.DecayLevel += a.Mass / 10000
	}
	if a.DecayLevel > a.Mass {
		a.DecayLevel = a.Mass
	}
	a.Mass -= a.DecayLevel
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

func (a *Actor) Move(x, y float64) {
	a.X = x
	a.Y = y
	consumes := []*Actor{}
	done := a.Player.room.Read("Moving player")
	for _, b := range a.Player.room.Actors[:a.Player.room.HighestID] {
		if b == a || b == nil {
			continue
		}
		dx := b.X - a.X
		dy := b.Y - a.Y
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
				a.X -= dx
				a.Y -= dy
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
		dx := float64(p.X) - a.X
		dy := float64(p.Y) - a.Y
		dist := dx*dx + dy*dy
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
	a.X = math.Min(float64(a.Player.room.Width), a.X)
	a.Y = math.Min(float64(a.Player.room.Height), a.Y)
	a.X = math.Max(0, a.X)
	a.Y = math.Max(0, a.Y)
}

var friction = .1

func (a *Actor) Tick(d time.Duration) {
	allowed := 100 / (math.Pow(.46*a.Mass, .2))
	distance := allowed * d.Seconds() * a.Speed

	dx := math.Cos(a.Direction) * distance
	dy := math.Sin(a.Direction) * distance

	a.XSpeed = math.Pow(friction, d.Seconds()) * a.XSpeed
	a.YSpeed = math.Pow(friction, d.Seconds()) * a.YSpeed
	a.X += a.XSpeed
	a.Y += a.YSpeed

	a.Move(a.X+dx, a.Y+dy)

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
	a.Mass += b.Mass * .9
	a.RecalcRadius()
	b.Remove()
	a.Player.Net.WriteSetMassActor(a)
}

func (a *Actor) ConsumePellet(b *Pellet) {
	if b.Type == 0 {
		a.DecayLevel /= 2
	} else {
		a.Mass += float64(b.Mass) * .9
	}
	a.RecalcRadius()
	b.Remove()
	a.Player.Net.WriteSetMassActor(a)
}

func (a *Actor) String() string {
	return fmt.Sprintf("%d (m:%f, o:%s)", a.ID, a.Mass, a.Player)
}

func (a *Actor) Split() {
	if a.Mass < 30 {
		return
	}
	a.Player.Net.MultiStart()
	a.Remove()
	nb := a.Player.NewActor(a.X, a.Y, a.Mass*.45)
	nb.Direction = a.Direction
	nb.Speed = a.Speed

	b := a.Player.NewActor(a.X, a.Y, a.Mass*.45)

	b.Direction = a.Direction
	b.Speed = a.Speed
	distance := b.Radius() * 2
	b.XSpeed = math.Cos(a.Direction) * distance
	b.YSpeed = math.Sin(a.Direction) * distance

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
	ID       int64
	Net      Protocol
	room     *Room
	Owns     [MaxOwns]*Actor
	EditLock sync.RWMutex
	Name     string
}

func (p *Player) NewActor(x, y, mass float64) *Actor {
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
