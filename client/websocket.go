package client

import (
	"golang.org/x/net/websocket"
	"log"
	"net"
	"net/http"
	"sync"
)

type Server struct {
	Room *Room
	Lock sync.RWMutex
	IPS  map[string]struct{}
	WSH  websocket.Handler
}

func NewServer() *Server {
	cli := &Server{IPS: map[string]struct{}{}}
	cli.WSH = websocket.Handler(cli.Accept)
	return cli
}

var allowedHosts = map[string]struct{}{
	"http://www.tinybio.me": struct{}{},
	"http://localhost:8080": struct{}{},
}

func (s *Server) Handler(res http.ResponseWriter, req *http.Request) {
	a := req.RemoteAddr
	ip, _, _ := net.SplitHostPort(a)

	s.Lock.Lock()
	if _, found := s.IPS[ip]; found {
		res.WriteHeader(400)
		s.Lock.Unlock()
		log.Println("REJECTING", ip)
		return
	} else {
		s.IPS[ip] = struct{}{}
	}

	s.Lock.Unlock()

	log.Println("New Client", ip)
	s.WSH.ServeHTTP(res, req)

	log.Println("CLIENT LEAVING", ip)
	s.Lock.Lock()
	delete(s.IPS, ip)
	s.Lock.Unlock()
}

func (s *Server) Accept(ws *websocket.Conn) {
	if _, found := allowedHosts[ws.RemoteAddr().String()]; !found {
		return
	}

	room := s.Room
	room.Accept(NewJsonProtocol(ws))

}

func (s *Server) AddRoom(r *Room) {
	s.Room = r
}
