package main

import (
	"encoding/json"
	"flag"
	"fmt"
	"github.com/ethicatech/tinybiome/client"
	"golang.org/x/net/websocket"
	"log"
	"net/http"
	_ "net/http/pprof"
	"runtime"
	"time"
)

func main() {
	port := 3000
	p := flag.Int("port", 3000, "Which port to run the server on")
	flag.Parse()
	if p != nil {
		port = *p
	}
	d, e := websocket.Dial("ws://localhost:4000", "", "http://server.go")
	if e != nil {
		d, e = websocket.Dial("ws://www.tinybio.me:4000", "", "http://server.go")
		log.Println("LOCAL SERVER DOWN", e)
		if e != nil {
			log.Panicln("MASTER SERVER DOWN", e)
		}
	}
	writer := json.NewEncoder(d)

	runtime.SetBlockProfileRate(1)
	room := client.NewRoom()
	room.SetDimensions(5000, 5000)
	cli := client.NewServer()
	cli.AddRoom(room)
	log.Println("WEBSOCKETS STARTING")
	http.HandleFunc("/", cli.Handler)
	add := fmt.Sprintf("0.0.0.0:%d", port)
	log.Println("STARTING ON", add)

	go func() {
		err := http.ListenAndServe(add, nil)
		if err != nil {
			log.Println("ERROR", err)
		}
	}()

	writer.Encode(map[string]interface{}{"meth": "addme", "port": port})
	for {
		time.Sleep(time.Second)
		if e := writer.Encode(map[string]interface{}{"meth": "ping"}); e != nil {
			break
		}
	}

}
