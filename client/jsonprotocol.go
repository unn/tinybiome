package client

import (
	"encoding/json"
	"fmt"
	"io"
)

type Protocol interface {
	GetMessage(*Room) error
	WriteNewPlayer(*Actor)
	WriteDestroyPlayer(*Actor)
	WriteOwnsPlayer(*Actor)
	WriteRoom(*Room)
	WriteMovePlayer(*Actor)
}

type JsonProtocol struct {
	RW io.ReadWriter
	W  *json.Encoder
	R  *json.Decoder
}

func NewJsonProtocol(ws io.ReadWriter) Protocol {
	w := json.NewEncoder(ws)
	r := json.NewDecoder(ws)
	return Protocol(&JsonProtocol{ws, w, r})
}

// runs in a goroutine
func (s *JsonProtocol) GetMessage(r *Room) error {
	decoded := map[string]interface{}{}
	err := s.R.Decode(&decoded)
	if err != nil {
		return err
	}
	switch decoded["type"] {
	case "move":
		pid := int(decoded["id"].(float64))
		p := r.getActor(pid)
		p.X = int(decoded["x"].(float64))
		p.Y = int(decoded["y"].(float64))
		r.Moved(p)

	}
	return nil
}

// sends updates
func (s *JsonProtocol) WriteRoom(r *Room) {
	roomStr := `{"type":"room","width":%d,"height":%d}`
	dat := fmt.Sprintf(roomStr, r.Width, r.Height)
	s.RW.Write([]byte(dat))
}

func (s *JsonProtocol) WriteNewPlayer(actor *Actor) {
	newPlayer := `{"type":"new","x":%d,"y":%d,"id":%d}`
	dat := fmt.Sprintf(newPlayer, actor.X, actor.Y, actor.ID)
	s.RW.Write([]byte(dat))
}

func (s *JsonProtocol) WriteOwnsPlayer(actor *Actor) {
	ownsPlayer := `{"type":"own","ids":[%d]}`
	dat := fmt.Sprintf(ownsPlayer, actor.ID)
	s.RW.Write([]byte(dat))
}

func (s *JsonProtocol) WriteDestroyPlayer(actor *Actor) {
	delPlayer := `{"type":"del","id":%d}`
	dat := fmt.Sprintf(delPlayer, actor.ID)
	s.RW.Write([]byte(dat))
}

func (s *JsonProtocol) WriteMovePlayer(actor *Actor) {
	delPlayer := `{"type":"move","id":%d,"x":%d,"y":%d}`
	dat := fmt.Sprintf(delPlayer, actor.ID, actor.X, actor.Y)
	s.RW.Write([]byte(dat))
}
