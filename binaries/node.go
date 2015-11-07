package main

import (
	"github.com/ethicatech/tinybiome/client"
	"log"
	"net/http"
	"runtime"
)

func init() {
	runtime.SetBlockProfileRate(1)
	room := client.NewRoom()
	room.SetDimensions(2000, 2000)
	cli := client.NewServer()
	cli.AddRoom(room)
	log.Println("WEBSOCKETS STARTING")
	m := http.NewServeMux()
	m.HandleFunc("/", cli.Handler)
	go func() {
		add := settings()["ws_address"].(string)
		err := http.ListenAndServe(add, m)
		if err != nil {
			log.Println("ERROR", err)
		}
		wg.Signal()
	}()
}
