package main

import (
	"log"
	"net/http"
	_ "net/http/pprof"
)

func init() {
	fs := http.FileServer(http.Dir("./ui"))
	http.Handle("/", fs)
	go func() {
		log.Println("WEBSERVER STARTING")
		add := settings()["http_address"].(string)
		err := http.ListenAndServe(add, nil)
		if err != nil {
			log.Println("ERROR", err)
		}
		wg.Signal()
	}()
}
