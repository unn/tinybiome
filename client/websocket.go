package client

import (
	"golang.org/x/net/websocket"
	"log"
)

type Server struct {
	Room *Room
}

func NewServer() *Server {
	return &Server{}
}

var allowedHosts = map[string]struct{}{
	"http://www.tinybio.me": struct{}{},
	"http://localhost:8080": struct{}{},
}

func (s *Server) Accept(ws *websocket.Conn) {
	room := s.Room

	log.Println("New Client", ws.RemoteAddr())
	if _, found := allowedHosts[ws.RemoteAddr().String()]; found {
		room.Accept(NewJsonProtocol(ws))
	}
}

func (s *Server) AddRoom(r *Room) {
	s.Room = r
}
