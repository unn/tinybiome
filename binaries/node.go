package main

import (
	"github.com/ethicatech/tinybiome/client"
	"golang.org/x/net/websocket"
	"log"
	"net/http"
	"runtime"
)

func init() {
	runtime.SetBlockProfileRate(1)
	room := client.NewRoom()
	room.SetDimensions(3000, 3000)
	cli := client.NewServer()
	cli.AddRoom(room)
	handler := websocket.Handler(cli.Accept)
	log.Println("WEBSOCKETS STARTING")
	go func() {
		add := settings()["ws_address"].(string)
		err := http.ListenAndServe(add, handler)
		if err != nil {
			log.Println("ERROR", err)
		}
		wg.Signal()
	}()
}
