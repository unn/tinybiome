package main

import (
	"github.com/ethicatech/tinybiome/client"
	"golang.org/x/net/websocket"
	"log"
	"net/http"
)

func init() {
	room := client.NewRoom()
	room.SetDimensions(1000, 1000)
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
