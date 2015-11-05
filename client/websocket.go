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

func (s *Server) Accept(ws *websocket.Conn) {
	room := s.Room

	log.Println("New Client", ws.RemoteAddr())
	if ws.RemoteAddr().String() == "http://www.tinybio.me" {
		room.Accept(NewJsonProtocol(ws))
	}
}

func (s *Server) AddRoom(r *Room) {
	s.Room = r
}
