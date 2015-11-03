package main

import (
	"net/http"
)

func init() {
	fs := http.FileServer(http.Dir("./ui"))
	go http.ListenAndServe(":8000", fs)
}
