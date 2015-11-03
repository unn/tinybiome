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
	room.Accept(NewJsonProtocol(ws))
}

func (s *Server) AddRoom(r *Room) {
	s.Room = r
}
