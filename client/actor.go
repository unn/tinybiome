package client

import (
	"fmt"
	"log"
	"math"
	"math/rand"
	"time"
)

// types: 0 vitamind, 1 mineral
type Pellet struct {
	X    int64
	Y    int64
	room *Room
	ID   int64
	TID  int64
	Mass int64
	Type int64
}

func (p *Pellet) Create() {
	p.Mass = 3
	for _, b := range p.room.Players {
		if b == nil {
			continue
		}
		b.Net.WriteNewPellet(p)
	}
	p.ID = p.room.PelletCount
	p.room.Pellets[p.ID] = p
	p.room.PelletCount += 1
	tx := int(p.X / int64(TileSize))
	ty := int(p.Y / int64(TileSize))

	t := p.room.PelletTiles[tx][ty]
	p.TID = t.PelletCount
	t.Pellets[p.TID] = p
	t.PelletCount += 1
}
func (p *Pellet) Remove() {
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

	tx := int(p.X / int64(TileSize))
	ty := int(p.Y / int64(TileSize))

	t := p.room.PelletTiles[tx][ty]
	t.PelletCount -= 1
	t.Pellets[p.TID] = t.Pellets[t.PelletCount]
	t.Pellets[p.TID].TID = p.TID

}

type Actor struct {
	Owner     Owner
	room      *Room
	ID        int64
	X         float64
	Y         float64
	Direction float64
	Speed     float64
	moved     bool
	Mass      float64

	XSpeed float64
	YSpeed float64
	radius float64
}

func NewActor(r *Room) *Actor {
	a := &Actor{room: r}
	r.AddTicker(a)
	id := r.getId(a)
	a.ID = id
	return a
}
func (a *Actor) RecalcRadius() {
	a.radius = math.Pow(a.Mass/math.Pi, a.room.SizeMultiplier)
}
func (a *Actor) Radius() float64 {
	return a.radius
}

func (a *Actor) CheckCollisions() {
	r := a.Radius()
	rad := int64(a.Radius() * a.Radius())
	t := time.Now()

	ix := int64(int64(a.X-r) / TileSize)
	iy := int64(int64(a.Y-r) / TileSize)
	ax := int64(a.X)
	ay := int64(a.Y)
	ex := int64(int64(a.X+r) / TileSize)
	ey := int64(int64(a.Y+r) / TileSize)

	if ix < 0 {
		ix = 0
	}
	if iy < 0 {
		iy = 0
	}
	if ex > a.room.Width/TileSize-1 {
		ex = a.room.Width/TileSize - 1
	}
	if ey > a.room.Height/TileSize-1 {
		ey = a.room.Height/TileSize - 1
	}

	for ix := ix; ix <= ex; ix += 1 {
		for iy := iy; iy <= ey; iy += 1 {

			tile := a.room.PelletTiles[ix][iy]
			pels := tile.Pellets[:tile.PelletCount]

			for _, p := range pels {
				dx := p.X - ax
				dy := p.Y - ay
				if dx*dx+dy*dy < rad {
					a.Owner.PelletCollision(p)
				}
			}
		}
	}
	took := time.Since(t)
	if took > 1*time.Millisecond {
		log.Println("QR TOOK", took)
	}

	consumes := []*Actor{}
	for _, b := range a.room.Actors[:a.room.HighestID] {
		if b == a || b == nil {
			continue
		}
		dx := b.X - a.X
		dy := b.Y - a.Y
		dist := dx*dx + dy*dy
		if dist == 0 {
			dist = .01
		}
		allowedDist := a.Radius() + b.Radius()
		if dist < allowedDist*allowedDist {
			dist = math.Sqrt(dist)
			depth := allowedDist - dist
			if a.Owner.ShouldCollide(b) {
				tot := a.Mass + b.Mass

				a.X -= dx / dist * depth * b.Mass / tot
				a.Y -= dy / dist * depth * b.Mass / tot
				b.X += dx / dist * depth * a.Mass / tot
				b.Y += dy / dist * depth * a.Mass / tot

				a.XSpeed = ((a.XSpeed - math.Min(dx/dist*depth/2*b.Mass/tot, 6)) + a.XSpeed) / 2
				a.YSpeed = ((a.YSpeed - math.Min(dy/dist*depth/2*b.Mass/tot, 6)) + a.YSpeed) / 2
				b.XSpeed = ((b.XSpeed + math.Min(dx/dist*depth/2*a.Mass/tot, 6)) + b.XSpeed) / 2
				b.YSpeed = ((b.YSpeed + math.Min(dy/dist*depth/2*a.Mass/tot, 6)) + b.YSpeed) / 2
			}
			if dist < a.Radius() || dist < b.Radius() {
				consumes = append(consumes, b)
			}
		}
	}

	if len(consumes) > 0 {
		for i := 0; i < len(consumes); i += 1 {
			a.Owner.ActorCollision(consumes[i])
		}
	}
	a.moved = true
	a.X = math.Min(float64(a.room.Width), a.X)
	a.Y = math.Min(float64(a.room.Height), a.Y)
	a.X = math.Max(0, a.X)
	a.Y = math.Max(0, a.Y)
}

var friction = .1

func (a *Actor) Tick(d time.Duration) {
	allowed := 500 / (a.room.SpeedMultiplier * math.Pow(a.Mass+50, .5))
	distance := allowed * d.Seconds() * a.Speed

	dx := math.Cos(a.Direction) * distance
	dy := math.Sin(a.Direction) * distance

	a.XSpeed = math.Pow(friction, d.Seconds()) * a.XSpeed
	a.YSpeed = math.Pow(friction, d.Seconds()) * a.YSpeed
	a.X += a.XSpeed
	a.Y += a.YSpeed

	a.X += dx
	a.Y += dy
}

func (a *Actor) String() string {
	return fmt.Sprintf("%d (m:%f)", a.ID, a.Mass)
}

func (a *Actor) Remove() {
	r := a.room
	r.Actors[a.ID] = nil
	for _, player := range r.Players {
		if player == nil {
			continue
		}
		player.Net.WriteDestroyActor(a)
	}
	r.RemoveTicker(a)
}

type Owner interface {
	PelletCollision(*Pellet)
	ActorCollision(*Actor)
	ShouldCollide(*Actor) bool
}

type PlayerActor struct {
	Actor      *Actor
	Player     *Player
	MergeTime  time.Time
	DecayLevel float64
}

func (a *PlayerActor) Remove() {
	for n, oActor := range a.Player.Owns {
		if oActor == a {
			a.Player.Owns[n] = nil
			break
		}
	}
	a.Actor.Remove()
}

func (oa *PlayerActor) Split() {
	a := oa.Actor
	if a.Mass < 40 {
		return
	}
	emptySlots := 0
	for _, n := range oa.Player.Owns {
		if n == nil {
			emptySlots += 1
		}
	}
	if emptySlots < 1 {
		return
	}

	a.Mass *= .5
	oa.MergeTime = oa.MergeTime.Add(oa.Player.room.MergeTimeFromMass(a.Mass))
	a.RecalcRadius()

	distance := math.Sqrt(a.Radius()*3) * 1
	XSpeed := math.Cos(a.Direction)
	YSpeed := math.Sin(a.Direction)

	b := oa.Player.NewActor(a.X+XSpeed*a.Radius(), a.Y+YSpeed*a.Radius(), a.Mass)

	b.Direction = a.Direction
	b.Speed = a.Speed

	d := math.Sqrt(distance)
	b.XSpeed = XSpeed * d
	b.YSpeed = YSpeed * d
}

func (a *PlayerActor) String() string {
	return fmt.Sprintf("PA %s (%s)", a.Player, a.Actor)
}

func (a *PlayerActor) ActorCollision(b *Actor) {
	if otherPlayerActor, isPlayer := b.Owner.(*PlayerActor); isPlayer {
		if !a.CanEat(otherPlayerActor) {
			return
		}
		log.Println(a, "CONSUMES", b)
		otherActor := otherPlayerActor.Actor
		if a.Player == otherPlayerActor.Player {
			a.Actor.Mass += otherActor.Mass
			a.MergeTime = a.MergeTime.Add(a.Player.room.MergeTimeFromMass(otherActor.Mass))
		} else {
			a.Actor.Mass += otherActor.Mass * .65
			a.DecayLevel -= otherActor.Mass / a.Actor.Mass
		}
		a.Actor.RecalcRadius()
		otherPlayerActor.Remove()
	}
}

func (a *PlayerActor) PelletCollision(b *Pellet) {
	if b.Type == 0 {
		a.DecayLevel -= 10 * float64(b.Mass) / a.Actor.Mass
	} else {
		a.Actor.Mass += float64(b.Mass) * .9
	}
	a.Actor.RecalcRadius()
	b.Remove()
}

func (a *PlayerActor) ShouldCollide(b *Actor) bool {
	if otherPlayerActor, isPlayer := b.Owner.(*PlayerActor); isPlayer {
		if a.Player == otherPlayerActor.Player {
			if a.CanMerge() && otherPlayerActor.CanMerge() {
				return false
			}
			return true
		} else {
			return a.Player.ClanName == otherPlayerActor.Player.ClanName && a.Player.ClanName != ""
		}
	}
	return false
}

func (a *PlayerActor) Decay(d time.Duration) {
	if a.Actor.Mass > 150 {
		a.DecayLevel += (a.Actor.Mass - 150) / 1000000
	}
	if a.DecayLevel < -1 {
		a.DecayLevel = -1
	}
	if a.DecayLevel > 1 {
		a.DecayLevel = 1
	}
	if a.DecayLevel > (a.Actor.Mass-150)/300 {
		a.DecayLevel = (a.Actor.Mass - 150) / 300
	}

	if a.DecayLevel > 0 {
		a.Actor.Mass -= a.DecayLevel
	}
}

func (pa *PlayerActor) CanEat(pb *PlayerActor) bool {
	a := pa.Actor
	b := pb.Actor
	if pa.Player == pb.Player {
		if pa.CanMerge() && pb.CanMerge() {
			log.Println(a, "CAN MERGE", b)
			if a.Mass >= b.Mass {
				return true
			} else {
				log.Println(a, "CANT MERGE BECAUSE MASS", b)
			}
		}
		return false
	}
	if float64(a.Mass) > float64(b.Mass)*1.10 {
		return true
	}
	return false
}

func (a *PlayerActor) CanMerge() bool {
	return a.MergeTime.Before(time.Now())
}

type RandomWalker struct {
	Actor *Actor
	Room  *Room
}

func NewRandomWalker(r *Room) *RandomWalker {
	rw := &RandomWalker{}
	rw.Room = r
	rw.Actor = r.NewActor(
		float64(rand.Int63n(r.Width)),
		float64(rand.Int63n(r.Height)),
		150)
	rw.Actor.Owner = rw
	r.AddTicker(rw)
	rw.Room.VirusCount += 1
	return rw
}
func (rw *RandomWalker) PelletCollision(*Pellet) {

}
func (rw *RandomWalker) ActorCollision(a *Actor) {
	if a.Mass > rw.Actor.Mass {
		if asPA, isPA := a.Owner.(*PlayerActor); isPA {
			for range [3]byte{} {
				asPA.Split()
			}
			rw.Remove()
			asPA.Actor.Mass += rw.Actor.Mass * .8
		}
	}
}
func (rw *RandomWalker) ShouldCollide(*Actor) bool {
	return false
}
func (rw *RandomWalker) Tick(d time.Duration) {

}
func (rw *RandomWalker) Remove() {
	rw.Actor.Remove()
	rw.Room.VirusCount -= 1
	rw.Room.RemoveTicker(rw)
}
