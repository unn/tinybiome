package main

import (
	"log"
	"net/http"
)

func init() {
	fs := http.FileServer(http.Dir("./ui"))
	go func() {
		log.Println("WEBSERVER STARTING")
		add := settings()["http_address"].(string)
		err := http.ListenAndServe(add, fs)
		if err != nil {
			log.Println("ERROR", err)
		}
		wg.Signal()
	}()
}
