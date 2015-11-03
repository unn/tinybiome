package main

import (
	"github.com/ethicatech/tinybiome/client"
	"golang.org/x/net/websocket"
	"net/http"
)

func main() {
	room := client.NewRoom()
	room.SetDimensions(1000, 1000)
	cli := client.NewServer()
	cli.AddRoom(room)
	handler := websocket.Handler(cli.Accept)
	http.ListenAndServe(":5000", handler)
}
