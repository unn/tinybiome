package client

import (
	"fmt"
	"log"
	"math"
	"math/rand"
	"regexp"
	"sort"
	"sync"
	"time"
)

const MaxEnts = 256 * 256
const MaxPlayers = 1024
const MaxOwns = 16
const MaxPellets = 12000
const MaxTickers = 12000
const TickLen = 25

const MaxViruses = 60
const MaxBacteria = 30
const TileSize = int64(100)

type Ticker interface {
	Tick(time.Duration)
	Write(ProtocolDown)
	Remove()
}

type Tile struct {
	PelletCount int64
	Pellets     [MaxPellets]*Pellet
}

func NewTile() *Tile {
	return &Tile{}
}

type Room struct {
	Width           int64
	Height          int64
	StartMass       int64
	MergeTime       int64
	Actors          [MaxEnts]*Actor
	Players         [MaxPlayers]*Player
	Tickers         [MaxTickers]Ticker
	HighestID       int64
	Pellets         [MaxPellets]*Pellet
	PelletTiles     [][]*Tile
	PelletCount     int64
	SizeMultiplier  float64
	SpeedMultiplier float64
	PlayerCount     int64

	VirusCount    int64
	BacteriaCount int64

	ticker     *time.Ticker
	ChangeLock sync.RWMutex
}

func NewRoom() *Room {
	r := &Room{
		ticker:          time.NewTicker(time.Millisecond * TickLen),
		StartMass:       50,
		MergeTime:       10,
		SizeMultiplier:  .6,
		SpeedMultiplier: .4,
	}
	log.Println(r)

	return r
}

func (r *Room) run(d time.Duration) {
	t := time.Now()
	r.ChangeLock.Lock()
	r.createThings(d)
	r.checkCollisions()
	r.doTicks(d)
	r.sendUpdates()
	for _, player := range r.Players {
		if player != nil {
			player.SendBuffer()
		}
	}
	r.ChangeLock.Unlock()
	took := time.Since(t)
	if took > time.Millisecond*10 {
		log.Println("TICK TOOK", took)
	}
}
func (r *Room) checkCollisions() {
	t := time.Now()
	for _, actor := range r.Actors[:r.HighestID] {
		if actor == nil {
			continue
		}
		actor.CheckCollisions()
	}
	took := time.Since(t)
	if took > time.Millisecond*1 {
		log.Println("CHECKCOLS TOOK", took, "FOR", r.HighestID)
	}
}
func (r *Room) createThings(d time.Duration) {
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

	if r.VirusCount < MaxViruses {
		NewVirus(r)
	}
	if r.BacteriaCount < MaxBacteria {
		NewBacteria(r)
	}
}

func (r *Room) doTicks(d time.Duration) {
	t := time.Now()
	for _, player := range r.Tickers {
		if player != nil {
			player.Tick(d)
		}
	}
	took := time.Since(t)
	if took > time.Millisecond*1 {
		log.Println("DOTICK TOOK", took)
	}
}

func (r *Room) sendUpdates() {
	for _, player := range r.Players {
		if player == nil {
			continue
		}
		for _, actor := range r.Actors[:r.HighestID] {
			if actor == nil {
				continue
			}
			if actor.X != actor.oldx || actor.Y != actor.oldy {
				player.Net.WriteMoveActor(actor)
			}
			if actor.oldm != actor.Mass {
				player.Net.WriteSetMassActor(actor)
			}
		}
	}
	for _, actor := range r.Actors[:r.HighestID] {
		if actor == nil {
			continue
		}
		actor.oldx = actor.X
		actor.oldy = actor.Y
		actor.oldm = actor.Mass
	}
}

func (r *Room) String() string {
	return fmt.Sprintf(`Room (MUL:%f,MAS:%d)`, r.SizeMultiplier, r.StartMass)
}

func (r *Room) SetDimensions(x, y int64) {
	r.Width = int64(x)
	r.Height = int64(y)
	r.PelletTiles = make([][]*Tile, r.Width/TileSize)
	for i := int64(0); i < r.Width/TileSize; i += 1 {
		r.PelletTiles[i] = make([]*Tile, r.Height/TileSize)
		for j := int64(0); j < r.Height/TileSize; j += 1 {
			r.PelletTiles[i][j] = NewTile()
		}
	}

	go func() {
		lastTick := time.Now()
		for range r.ticker.C {
			now := time.Now()
			r.run(now.Sub(lastTick))
			lastTick = now
		}
	}()
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
	NewPlayer(r, p)
}

func (r *Room) MergeTimeFromMass(mass float64) time.Duration {
	s := float64(r.MergeTime) * (1 + mass/2000)
	d := time.Duration(s*1000) * time.Millisecond
	log.Println("MERGE TIME FOR", mass, "=", s, "SECONDS =", d)

	return d
}
func (r *Room) NewActor(x, y, mass float64) *Actor {
	actor := NewActor(r)
	actor.X = x
	actor.Y = y
	actor.Mass = mass
	actor.RecalcRadius()
	log.Println("NEW ACTOR", actor)
	return actor
}
func (r *Room) AddTicker(t Ticker) {
	for n, o := range r.Tickers {
		if o == nil {
			r.Tickers[n] = t
			return
		}
	}
}
func (r *Room) RemoveTicker(t Ticker) {
	for n, o := range r.Tickers {
		if o == t {
			r.Tickers[n] = nil
			return
		}
	}
}

type Player struct {
	ID        int64
	Net       Protocol
	room      *Room
	Owns      [MaxOwns]Ticker
	EditLock  sync.RWMutex
	Name      string
	Connected bool
	WriteChan chan []byte
	ClanName  string
	Synced    bool
	Joined    bool
}

func NewPlayer(r *Room, p Protocol) *Player {
	player := &Player{Net: p, room: r, Connected: true}
	go player.SendUpdates()
	log.Println(player, "STARTING LOOP")
	p.WriteRoom(r)
	player.ReceiveUpdates()
	player.Remove()
	return player
}
func (p *Player) Tick(d time.Duration) {
	for _, actor := range p.Owns {
		if actor != nil {
			actor.Tick(d)
		}
	}
}
func (p *Player) Sync() {
	if p.Synced {
		return
	}
	p.Synced = true
	r := p.room

	r.ChangeLock.Lock()

	p.ID = r.getPlayerId(p)
	p.room.AddTicker(p)

	log.Println("SYNCING", p)
	start := time.Now()
	log.Println("SYNCING ROOM")
	p.Net.WriteRoom(r)

	log.Println("SYNCING OTHER PLAYERS")
	for _, oPlayer := range r.Players {
		if oPlayer == nil {
			continue
		}
		oPlayer.Net.WriteNewPlayer(p)
	}
	p.Net.WriteOwns(p)

	log.Println("SYNCING TICKERS")
	for _, oPlayer := range r.Tickers {
		if oPlayer == nil {
			continue
		}
		if oPlayer == p {
			continue
		}
		oPlayer.Write(p.Net)
	}

	log.Println("SYNCING PELLETS")
	p.Net.WritePelletsIncoming(r.Pellets[:r.PelletCount])
	took := time.Since(start)

	log.Println(p, "INITIAL SYNC COMPLETE IN", took)
	p.Net.Save()

	r.ChangeLock.Unlock()
	log.Println(p, "SENDING")
}
func (p *Player) Write(pn ProtocolDown) {
	pn.WriteNewPlayer(p)
	for _, actor := range p.Owns {
		if actor != nil {
			actor.Write(pn)
		}
	}
}
func (p *Player) SendBuffer() {
	p.Net.Save()
}
func (p *Player) ReceiveUpdates() {
	for {
		reason := p.Net.GetMessage(p)
		if reason != nil {
			log.Println("REMOVING BECAUSE", reason)
			break
		}
	}
}

func (p *Player) SendUpdates() {
	for {
		e := p.Net.Flush()
		if e != nil {
			log.Println("ERROR SENDING", e)
			break
		}
	}
}

func (p *Player) UpdateDirection(actor int32, d, s float32) {

	r := p.room
	p.room.ChangeLock.RLock()
	a := r.getActor(int64(actor))
	if a != nil {
		op, isPA := a.Owner.(*PlayerActor)
		if isPA {
			if op.Player == p {
				a.Direction = float64(d)
				a.Speed = float64(s)
				if a.Speed > 1 {
					a.Speed = 1
				}
				if a.Speed < 0 {
					a.Speed = 0
				}
			}
		} else {
			log.Println(a, "APPARENTLY NOT OWNED BY", p)
		}
	}

	p.room.ChangeLock.RUnlock()
}

type PlayerActorList []Ticker

func (a PlayerActorList) Len() int      { return len(a) }
func (a PlayerActorList) Swap(i, j int) { a[i], a[j] = a[j], a[i] }
func (a PlayerActorList) Less(i, j int) bool {
	if a[i] == nil {
		return true
	}
	if a[j] == nil {
		return true
	}
	aA := a[i].(*PlayerActor)
	aB := a[j].(*PlayerActor)
	return aA.Actor.Mass > aB.Actor.Mass
}

func (p *Player) Split() {
	p.room.ChangeLock.Lock()
	n := make([]Ticker, len(p.Owns[:]))
	copy(n, p.Owns[:])
	sorted := PlayerActorList(n)
	sort.Sort(sorted)
	for _, a := range sorted {
		if a != nil {
			a.(*PlayerActor).Split()
		}
	}
	p.room.ChangeLock.Unlock()
}
func (p *Player) Ping() {
	p.room.ChangeLock.Lock()
	p.Net.WritePong()
	p.Net.WriteRoom(p.room)
	p.Net.Save()
	p.room.ChangeLock.Unlock()
}
func (p *Player) Join(name string) {
	if !p.Synced {
		log.Println("PLAYER NOT SYNCED YET", p)
		return
	}

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

	if !p.Joined {
		p.Joined = true
		p.room.PlayerCount += 1
	}

	p.Rename(name)
	log.Println(name, "JOINED")
	p.NewPlayerActor(rand.Float64()*float64(r.Width), rand.Float64()*float64(r.Height), float64(r.StartMass))

}
func (p *Player) Remove() {
	if p.Synced {
		r := p.room
		log.Println("Lock 4")
		r.ChangeLock.Lock()
		for _, ticker := range p.Owns {
			if ticker == nil {
				continue
			}
			ticker.Remove()
		}
		r.Players[p.ID] = nil
		r.RemoveTicker(p)
		if p.Joined {
			r.PlayerCount -= 1
		}
		for _, oPlayer := range r.Players {
			if oPlayer == nil {
				continue
			}
			oPlayer.Net.WriteDestroyPlayer(p)
		}
		log.Println("Unlock 4")
		log.Println("CLOSING CHAN")
		r.ChangeLock.Unlock()
	}

}

func (p *Player) NewPlayerActor(x, y, mass float64) *PlayerActor {
	r := p.room
	playerActor := &PlayerActor{
		Actor:     r.NewActor(x, y, mass),
		Player:    p,
		MergeTime: time.Now().Add(r.MergeTimeFromMass(mass)),
	}
	playerActor.Actor.Owner = playerActor

	for _, oPlayer := range r.Players {
		if oPlayer == nil {
			continue
		}
		playerActor.Write(oPlayer.Net)
	}

	for n, a := range p.Owns {
		if a == nil {
			p.Owns[n] = playerActor
			break
		}
	}

	return playerActor
}

func (p *Player) String() string {
	return fmt.Sprintf("PL #%d (%s, %s)", p.ID, p.Name, p.Net)
}

var clanRegex = regexp.MustCompile(`^\[(.*)\]`)

func (p *Player) Rename(n string) {
	if len(n) > 100 {
		n = n[:100]
	}
	p.Name = n

	names := clanRegex.FindStringSubmatch(n)
	if names != nil {
		p.ClanName = names[0]
		log.Println(p, "JOINED CLAN", p.ClanName)
	}

	for _, oPlayer := range p.room.Players {
		if oPlayer == nil {
			continue
		}
		oPlayer.Net.WriteNamePlayer(p)
	}
}
