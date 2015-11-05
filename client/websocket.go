package client

import (
	"golang.org/x/net/websocket"
	"log"
	"sync"
)

type Server struct {
	Room *Room
	Lock sync.RWMutex
	IPS  map[string]struct{}
}

func NewServer() *Server {
	return &Server{IPS: map[string]struct{}{}}
}

var allowedHosts = map[string]struct{}{
	"http://www.tinybio.me": struct{}{},
	"http://localhost:8080": struct{}{},
}

func (s *Server) Accept(ws *websocket.Conn) {
	room := s.Room
	a := ws.Request().RemoteAddr
	reject := false
	s.Lock.Lock()
	if _, found := s.IPS[a]; found {
		reject = true
	} else {
		s.IPS[a] = struct{}{}
	}
	s.Lock.Unlock()

	if _, found := allowedHosts[ws.RemoteAddr().String()]; !found {
		reject = true
	}

	if !reject {
		log.Println("New Client", a)
		room.Accept(NewJsonProtocol(ws))
	} else {
		log.Println("REJECTING", a)
	}

	s.Lock.Lock()
	delete(s.IPS, a)
	s.Lock.Unlock()
}

func (s *Server) AddRoom(r *Room) {
	s.Room = r
}
