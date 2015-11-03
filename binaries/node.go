package main

import (
	"github.com/ethicatech/tinybiome/client"
	"golang.org/x/net/websocket"
	"log"
	"net/http"
)

func main() {
	room := client.NewRoom()
	room.SetDimensions(1000, 1000)
	cli := client.NewServer()
	cli.AddRoom(room)
	handler := websocket.Handler(cli.Accept)
	log.Println("WEBSOCKETS STARTING")
	err := http.ListenAndServe("0.0.0.0:5000", handler)
	if err != nil {
		log.Println("ERROR", err)
	}
}
