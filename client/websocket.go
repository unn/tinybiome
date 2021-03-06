package client

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"net"
	"net/http"
	"sync"
	"time"

	"golang.org/x/net/websocket"
)

var defaultConf = []byte(`{
		"name":"Unnamed Server",
		"port":3000,
		"origins": [
			"http://www.tinybio.me",
			"http://localhost:8080",
			"http://localhost",
			"http://96.50.20.37:8080",
			"http://96.50.20.37",
			"http://192.168.0.17"],
		"rooms":[{
			"name": "Long-term games!",
			"width":2500, "height":2500,
			"maxviruses": 40,
			"maxbacteria": 25,
			"maxsplit": 16,
			"minsplitmass": 35,
			"mergetime": 15,
			"sizemultiplier": 0.64,
			"speedmultiplier": 0.4,
			"startmass": 40,
			"maxpellets": 10000}
		]
	}`)

var ConfigInvalidJson = errors.New("Config file not valid JSON")

type ServerConfig struct {
	Name    string        `json:"name"`
	Port    int           `json:"port"`
	Rooms   []*RoomConfig `json:"rooms"`
	Origins []string      `json:"origins"`
}

func NewServerConfigDefault() *ServerConfig {
	sc := &ServerConfig{}
	if e := json.Unmarshal(defaultConf, sc); e != nil {
		log.Panicln("DEFAULT SERVER CONFIG ERROR", e)
		return nil
	}

	return sc
}
func NewServerConfigFromReader(reader io.Reader) (*ServerConfig, error) {
	sc := NewServerConfigDefault()
	j := json.NewDecoder(reader)
	if err := j.Decode(sc); err != nil {
		return nil, ConfigInvalidJson
	}
	return sc, nil
}

type Server struct {
	Rooms   []*Room
	Lock    sync.RWMutex
	IPS     map[string]int
	WSH     websocket.Handler
	Config  *ServerConfig
	Origins map[string]struct{}
}

func NewServer(sc *ServerConfig) *Server {
	cli := &Server{Config: sc, Rooms: make([]*Room, 0), Origins: make(map[string]struct{})}
	for n, roomConfig := range sc.Rooms {
		nr := NewRoom(roomConfig)
		cli.Rooms = append(cli.Rooms, nr)
		nr.ID = n
	}
	for _, origin := range sc.Origins {
		cli.Origins[origin] = struct{}{}
	}

	log.Println("NEW SERVER", sc)

	return cli
}

func (s *Server) String() string {
	return fmt.Sprintf("SRV %s", s.Config.Name)
}

func (s *Server) CommunicateWithMaster() {
	d, e := websocket.Dial("ws://localhost:4000", "", "http://server.go")
	if e != nil {
		d, e = websocket.Dial("ws://www.tinybio.me:4000", "", "http://server.go")
		log.Println("LOCAL SERVER DOWN", e)
		if e != nil {
			log.Panicln("MASTER SERVER DOWN", e)
		}
	}
	writer := json.NewEncoder(d)

	writer.Encode(map[string]interface{}{"meth": "addme", "port": s.Config.Port})
	for {
		time.Sleep(time.Second)
		if e := writer.Encode(map[string]interface{}{"meth": "ping"}); e != nil {
			break
		}
	}
}

func (s *Server) Start() error {
	s.IPS = map[string]int{}
	s.WSH = websocket.Handler(s.Accept)

	log.Println("WEBSOCKETS STARTING")
	http.HandleFunc("/", s.Handler)
	add := fmt.Sprintf("0.0.0.0:%d", s.Config.Port)
	log.Println("STARTING ON", add)

	go s.CommunicateWithMaster()
	if err := http.ListenAndServe(add, nil); err != nil {
		log.Println("ERROR", err)
	}
	return nil
}

func (s *Server) Handler(res http.ResponseWriter, req *http.Request) {
	o := req.Header.Get("Origin")
	if _, found := s.Origins[o]; !found {
		log.Println("REJECTED BECAUSE ORIGIN NOT ALLOWED:", o)
		return
	}

	a := req.RemoteAddr
	ip, _, _ := net.SplitHostPort(a)

	s.Lock.Lock()
	if n, found := s.IPS[ip]; found {
		if n >= 8 {
			res.WriteHeader(400)
			s.Lock.Unlock()
			log.Println("REJECTING DUE TO DDOS-LIKE BEHAVIOUR", ip)
			return
		}
		s.IPS[ip] = n + 1
	} else {
		s.IPS[ip] = 0
	}

	s.Lock.Unlock()

	log.Println("CLIENT ENTERS", ip)

	defer func() {
		log.Println("CLIENT EXITS", ip)
		s.Lock.Lock()
		s.IPS[ip] -= 1
		s.Lock.Unlock()
	}()

	s.WSH.ServeHTTP(res, req)

}

func (s *Server) Accept(ws *websocket.Conn) {
	ws.PayloadType = websocket.BinaryFrame
	if _, err := NewConnection(s, ws); err != nil {
		ws.SetDeadline(time.Now().Add(2 * time.Millisecond))
		ws.Close()
	}
}
