package main

import (
	"encoding/json"
	"fmt"
	"golang.org/x/net/websocket"
	"log"
	"net"
	"net/http"
	"sync"
)

var servers = make(map[*server]struct{})
var clients = make(map[*client]struct{})
var slock sync.RWMutex

func main() {
	m := http.NewServeMux()
	m.Handle("/", websocket.Handler(newConn))
	go http.ListenAndServe("0.0.0.0:4000", m)

	w := http.NewServeMux()
	fs := http.FileServer(http.Dir("./ui"))
	w.Handle("/", fs)

	log.Println("ABOUT TO LISTEN FOR HTTP")
	http.ListenAndServe("0.0.0.0:80", w)
}

type server struct {
	ip   string
	port int
}

func (s *server) addr() string {
	return fmt.Sprintf("%s:%d", s.ip, s.port)
}

type client struct {
	ws *websocket.Conn
}

func newConn(ws *websocket.Conn) {
	ra := ws.Request().RemoteAddr
	ip, _, _ := net.SplitHostPort(ra)
	j := json.NewDecoder(ws)
	w := json.NewEncoder(ws)

	slock.RLock()
	for s, _ := range servers {
		w.Encode(map[string]interface{}{"meth": "add", "address": s.addr()})
	}
	slock.RUnlock()

	var p *server
	var v map[string]interface{}
	for {
		e := j.Decode(&v)
		if e != nil {
			log.Println("ERR", e)
			if p != nil {
				slock.Lock()
				delete(servers, p)
				slock.Unlock()
			}
			break
		}
		switch v["meth"].(string) {
		case "addme":
			p = &server{ip: ip, port: int(v["port"].(float64))}
			log.Println("NEW SERVER", p)
			slock.Lock()
			servers[p] = struct{}{}
			slock.Unlock()
		case "ping":

		}
	}
}
