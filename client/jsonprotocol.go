package client

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"math/rand"
	"strings"
	"time"
)

type Protocol interface {
	GetMessage(*Player) error
	WriteNewActor(*Actor)
	WriteDestroyActor(*Actor)
	WriteNewPlayer(*Player)
	WriteDestroyPlayer(*Player)
	WriteNamePlayer(*Player)
	WriteOwns(*Player)
	WriteRoom(*Room)
	WriteMoveActor(*Actor)
	WriteSetMassActor(*Actor)
	WriteNewPellet(*Pellet)
	WriteDestroyPellet(*Pellet)
	WritePelletsIncoming([]*Pellet)

	MultiStart()
	MultiSteal(Protocol)
	MultiSend()
}

type JsonProtocol struct {
	RW     io.ReadWriter
	W      *json.Encoder
	R      *json.Decoder
	Buffer []string
	T      time.Time
	Count  int
}

func NewJsonProtocol(ws io.ReadWriter) Protocol {
	w := json.NewEncoder(ws)
	r := json.NewDecoder(ws)
	return Protocol(&JsonProtocol{RW: ws, W: w, R: r, Buffer: nil,
		T: time.Now()})
}

// runs in a goroutine
func (s *JsonProtocol) GetMessage(p *Player) error {
	r := p.room
	decoded := map[string]interface{}{}
	err := s.R.Decode(&decoded)
	if time.Since(s.T) > 100*time.Millisecond {
		s.T = time.Now()
		s.Count = 0
	}
	s.Count += 1

	if err != nil {
		return err
	}
	if s.Count > 100 {
		log.Println("DROPPING")
		return nil
	}

	switch decoded["type"] {
	case "move":
		pid := int64(decoded["id"].(float64))
		p := r.getActor(pid)
		if p != nil {
			p.Direction = decoded["d"].(float64)
			p.Speed = decoded["s"].(float64)
			if p.Speed > 1 {
				p.Speed = 1
			}
			if p.Speed < 0 {
				p.Speed = 0
			}
		}
	case "split":
		for _, a := range p.Owns {
			if a != nil {
				a.Split()
			}
		}
	case "join":
		p.Rename(decoded["name"].(string))
		for _, n := range p.Owns {
			if n != nil {
				return nil
			}
		}
		p.NewActor(rand.Float64()*float64(r.Width), rand.Float64()*float64(r.Height), float64(r.StartMass))
	}
	return nil
}

func (s *JsonProtocol) send(dat string) {
	if s.Buffer == nil {
		s.RW.Write([]byte(dat))
	} else {
		s.Buffer = append(s.Buffer, dat)
	}
}

// sends updates
func (s *JsonProtocol) WriteRoom(r *Room) {
	roomStr := `{"type":"room","width":%d,"height":%d,"mass":%d,"mergetime":%d}`
	dat := fmt.Sprintf(roomStr, r.Width, r.Height, r.StartMass, r.MergeTime)
	s.send(dat)

}

func (s *JsonProtocol) WriteNewActor(actor *Actor) {
	newPlayer := `{"type":"new","x":%f,"y":%f,"id":%d,"mass":%f,"owner":%d}`
	dat := fmt.Sprintf(newPlayer, actor.X, actor.Y, actor.ID, actor.Mass, actor.Player.ID)
	s.send(dat)
}

func (s *JsonProtocol) WriteNewPellet(pellet *Pellet) {
	str := `{"type":"addpel","x":%d,"y":%d,"style":%d}`
	dat := fmt.Sprintf(str, pellet.X, pellet.Y, pellet.Type)
	s.send(dat)
}

func (s *JsonProtocol) WriteDestroyPellet(pellet *Pellet) {
	str := `{"type":"delpel","x":%d,"y":%d}`
	dat := fmt.Sprintf(str, pellet.X, pellet.Y)
	s.send(dat)
}

func (s *JsonProtocol) WriteNewPlayer(player *Player) {
	o := map[string]interface{}{"type": "addplayer",
		"id": player.ID, "name": player.Name}
	s.W.Encode(o)
}

func (s *JsonProtocol) WriteNamePlayer(player *Player) {
	o := map[string]interface{}{"type": "nameplayer",
		"id": player.ID, "name": player.Name}
	s.W.Encode(o)
}

func (s *JsonProtocol) WriteDestroyPlayer(player *Player) {
	str := `{"type":"delplayer","id":%d}`
	dat := fmt.Sprintf(str, player.ID)
	s.send(dat)
}

func (s *JsonProtocol) WriteOwns(player *Player) {
	ownsPlayer := `{"type":"own","id":%d}`
	dat := fmt.Sprintf(ownsPlayer, player.ID)
	s.send(dat)
}

func (s *JsonProtocol) WriteDestroyActor(actor *Actor) {
	delPlayer := `{"type":"del","id":%d}`
	dat := fmt.Sprintf(delPlayer, actor.ID)
	s.send(dat)
}

func (s *JsonProtocol) WriteMoveActor(actor *Actor) {
	delPlayer := `{"type":"move","id":%d,"x":%f,"y":%f,"d":%f,"s":%f}`
	dat := fmt.Sprintf(delPlayer, actor.ID, actor.X, actor.Y, actor.Direction, actor.Speed)
	s.send(dat)
}

func (s *JsonProtocol) WriteSetMassActor(actor *Actor) {
	delPlayer := `{"type":"mass","id":%d,"mass":%f}`
	dat := fmt.Sprintf(delPlayer, actor.ID, actor.Mass)
	s.send(dat)
}

func (s *JsonProtocol) WritePelletsIncoming(p []*Pellet) {
	// delPlayer := `{"type":"mass","id":%d,"mass":%f}`
	// dat := fmt.Sprintf(delPlayer, actor.ID, actor.Mass)
	// s.send(dat)
}

func (s *JsonProtocol) MultiStart() {
	s.Buffer = make([]string, 0)
}

func (s *JsonProtocol) MultiSteal(p Protocol) {
	s.Buffer = p.(*JsonProtocol).Buffer
}

func (s *JsonProtocol) MultiSend() {
	if len(s.Buffer) > 0 {
		dat := `{"type":"multi","parts":[` + strings.Join(s.Buffer, ",") + `]}`
		s.RW.Write([]byte(dat))
	}
	s.Buffer = nil
}
