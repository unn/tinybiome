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

func (s *Server) Accept(ws *websocket.Conn) {
	if _, found := allowedHosts[ws.RemoteAddr().String()]; !found {
		return
	}

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

	if !reject {
		log.Println("New Client", ip)
		room.Accept(NewJsonProtocol(ws))
		s.Lock.Lock()
		delete(s.IPS, ip)
		s.Lock.Unlock()
	} else {
		log.Println("REJECTING", ip)
	}

}

func (s *Server) AddRoom(r *Room) {
	s.Room = r
}
