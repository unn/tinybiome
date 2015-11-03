package main

import (
	"log"
	"net/http"
)

func init() {
	fs := http.FileServer(http.Dir("./ui"))
	go func() {
		log.Println("WEBSERVER STARTING")
		err := http.ListenAndServe("0.0.0.0:8080", fs)
		if err != nil {
			log.Println("ERROR", err)
		}
	}()
}
