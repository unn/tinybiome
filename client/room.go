package client

import (
	"fmt"
	"log"
	"math"
	"math/rand"
	"sync"
	"time"
)

const MaxEnts = 256 * 256
const MaxPlayers = 1024
const MaxOwns = 16
const MaxPellets = 10000
const TickLen = 25

type Room struct {
	Width          int64
	Height         int64
	StartMass      int64
	MergeTime      int64
	Actors         [MaxEnts]*Actor
	Players        [MaxPlayers]*Player
	HighestID      int64
	Pellets        [MaxPellets]*Pellet
	PelletCount    int64
	SizeMultiplier float64

	ticker     *time.Ticker
	ChangeLock sync.RWMutex
	Changes    *sync.Cond
}

func (r *Room) run(d time.Duration) {
	r.ChangeLock.Lock()
	r.createPellets(d)
	r.checkCollisions()
	r.addDecay()
	r.updatePositions(d)
	r.sendUpdates(d)
	r.ChangeLock.Unlock()
	r.Changes.Broadcast()
}

func NewRoom() *Room {
	r := &Room{
		ticker:         time.NewTicker(time.Millisecond * TickLen),
		StartMass:      100,
		MergeTime:      10,
		SizeMultiplier: .55,
	}
	r.Changes = sync.NewCond(&sync.RWMutex{})
	log.Println(r)

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
func (r *Room) updatePositions(d time.Duration) {
	for _, actor := range r.Actors[:r.HighestID] {
		if actor == nil {
			continue
		}
		actor.Tick(d)
	}
}
func (r *Room) checkCollisions() {
	for _, actor := range r.Actors[:r.HighestID] {
		if actor == nil {
			continue
		}
		actor.CheckCollisions()
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
	for _, actor := range r.Actors[:r.HighestID] {
		if actor == nil {
			continue
		}
		actor.Decay()
	}
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
		for _, actor := range r.Actors[:r.HighestID] {
			if actor == nil {
				continue
			}
			if actor.moved {
				player.Net.WriteMoveActor(actor)
				player.Net.WriteSetMassActor(actor)
			}
		}
	}
	for _, actor := range r.Actors[:r.HighestID] {
		if actor == nil {
			continue
		}
		actor.moved = false
	}
}

func (r *Room) String() string {
	return fmt.Sprintf(`Room (MUL:%f,MAS:%d)`, r.SizeMultiplier, r.StartMass)
}

func (r *Room) SetDimensions(x, y int64) {
	r.Width = int64(x)
	r.Height = int64(y)
}

func (r *Room) getId(a *Actor) int64 {
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
	if id < 0 {
		return nil
	}
	if id > r.HighestID {
		return nil
	}
	return r.Actors[id]
}

func (r *Room) Accept(p Protocol) {
	player := &Player{Net: p, room: r, Connected: true}
	player.Sync()
}

func (r *Room) MergeTimeFromMass(mass float64) time.Duration {
	s := float64(r.MergeTime) * (1 + mass/2000)
	d := time.Duration(s*1000) * time.Millisecond
	log.Println("MERGE TIME FOR", mass, "=", s, "SECONDS =", d)

	return d
}

type Player struct {
	ID        int64
	Net       Protocol
	room      *Room
	Owns      [MaxOwns]*Actor
	EditLock  sync.RWMutex
	Name      string
	Connected bool
}

func (p *Player) Sync() {
	r := p.room

	r.ChangeLock.Lock()
	p.ID = r.getPlayerId(p)

	start := time.Now()
	t := p.Net.Transaction(false, 1024*1024*2)
	log.Println("SYNCING ROOM")
	t.WriteRoom(r)

	log.Println("SYNCING PLAYERS")
	for _, oPlayer := range r.Players {
		if oPlayer == nil {
			continue
		}
		t.WriteNewPlayer(oPlayer)
	}
	log.Println("SYNCING ACTORS")
	for _, oActor := range r.Actors[:r.HighestID] {
		if oActor == nil {
			continue
		}
		t.WriteNewActor(oActor)
	}
	log.Println("SYNCING PELLETS")
	t.WritePelletsIncoming(r.Pellets[:r.PelletCount])
	took := time.Since(start)

	log.Println("SYNCING OTHER PLAYERS")
	for _, oPlayer := range r.Players {
		if oPlayer == nil {
			continue
		}
		if oPlayer == p {
			continue
		}
		oPlayer.Net.WriteNewPlayer(p)
	}

	log.Println(p, "INITIAL SYNC COMPLETE IN", took)

	t.WriteOwns(p)

	go p.SendUpdates()

	r.ChangeLock.Unlock()
	t.Done()
	p.ReceiveUpdates()
	p.Remove()
}

func (p *Player) ReceiveUpdates() {
	for {
		reason := p.Net.GetMessage(p)
		if reason != nil {
			log.Println("REMOVING BECAUSE", reason)
			p.Connected = false
			break
		}
	}
}

func (p *Player) SendUpdates() {
	t := p.Net.Transaction(false, 1024*10)
	for {
		p.room.Changes.L.Lock()
		p.room.Changes.Wait()
		p.room.Changes.L.Unlock()
		if p.Connected {
			t.Done()
		} else {
			break
		}
	}
}

func (p *Player) UpdateDirection(actor int32, d, s float32) {

	r := p.room
	p.room.ChangeLock.RLock()
	a := r.getActor(int64(actor))
	if a != nil {
		if a.Player == p {
			a.Direction = float64(d)
			a.Speed = float64(s)
			if a.Speed > 1 {
				a.Speed = 1
			}
			if a.Speed < 0 {
				a.Speed = 0
			}
		} else {
			log.Println(a, "APPARENTLY NOT OWNED BY", p)
		}
	}

	p.room.ChangeLock.RUnlock()
}
func (p *Player) Split() {
	p.room.ChangeLock.Lock()
	for _, a := range p.Owns {
		if a != nil {
			a.Split()
		}
	}
	p.room.ChangeLock.Unlock()
}
func (p *Player) Join(name string) {
	r := p.room
	log.Println("Lock 3")
	r.ChangeLock.Lock()
	defer func() {
		log.Println("Unlock 3")
		r.ChangeLock.Unlock()
	}()
	for _, n := range p.Owns {
		if n != nil {
			return
		}
	}
	p.Rename(name)
	log.Println(name, "JOINED")
	p.NewActor(rand.Float64()*float64(r.Width), rand.Float64()*float64(r.Height), float64(r.StartMass))

}
func (p *Player) Remove() {
	r := p.room
	log.Println("Lock 4")
	r.ChangeLock.Lock()

	for _, actor := range r.Actors {
		if actor == nil {
			continue
		}
		if actor.Player == p {
			actor.Remove()
		}
	}
	r.Players[p.ID] = nil
	for _, oPlayer := range r.Players {
		if oPlayer == nil {
			continue
		}
		oPlayer.Net.WriteDestroyPlayer(p)
	}

	log.Println("Unlock 4")
	r.ChangeLock.Unlock()
}

func (p *Player) NewActor(x, y, mass float64) *Actor {
	r := p.room
	actor := &Actor{X: x, Y: y, Player: p, Mass: mass,
		MergeTime: time.Now().Add(r.MergeTimeFromMass(mass))}
	actor.RecalcRadius()
	id := r.getId(actor)
	actor.ID = id
	log.Println("NEW ACTOR", actor)

	for _, oPlayer := range r.Players {
		if oPlayer == nil {
			continue
		}
		oPlayer.Net.WriteNewActor(actor)
	}

	for n, a := range p.Owns {
		if a == nil {
			p.Owns[n] = actor
			break
		}
	}

	return actor
}

func (p *Player) String() string {
	return fmt.Sprintf("#%d (%s)", p.ID, p.Name)
}

func (p *Player) Rename(n string) {
	if len(n) > 100 {
		n = n[:100]
	}
	p.Name = n

	for _, oPlayer := range p.room.Players {
		if oPlayer == nil {
			continue
		}
		oPlayer.Net.WriteNamePlayer(p)
	}
}
