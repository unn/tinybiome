package main

import (
	"encoding/json"
	"os"
	"sync"
)

var wg *sync.Cond

func init() {
	l := &sync.Mutex{}
	l.Lock()
	wg = sync.NewCond(l)
}

func main() {
	wg.Wait()
}

func settings() (settings map[string]interface{}) {
	f, _ := os.OpenFile("default.conf", 0, 0)
	json.NewDecoder(f).Decode(&settings)
	return
}
