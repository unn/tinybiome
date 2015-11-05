package client

import (
	"golang.org/x/net/websocket"
	"log"
	"net"
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

var allowedHosts = map[string]struct{}{
	"http://www.tinybio.me": struct{}{},
	"http://localhost:8080": struct{}{},
}

func (s *Server) Accept(ws *websocket.Conn) {
	room := s.Room
	a := ws.Request().RemoteAddr
	ip, _, _ := net.SplitHostPort(a)
	reject := false
	s.Lock.Lock()
	if _, found := s.IPS[ip]; found {
		reject = true
	} else {
		s.IPS[ip] = struct{}{}
	}
	s.Lock.Unlock()

	if _, found := allowedHosts[ws.RemoteAddr().String()]; found {
		reject = true
	}

	if !reject {
		log.Println("New Client", ip)
		room.Accept(NewJsonProtocol(ws))
	} else {
		log.Println("REJECTING", ip)
	}

	s.Lock.Lock()
	delete(s.IPS, ip)
	s.Lock.Unlock()
}

func (s *Server) AddRoom(r *Room) {
	s.Room = r
}
