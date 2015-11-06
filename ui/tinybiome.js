var currentRoom;
var myplayer;
var tileSize = 50;
var hidingBbox = true;

var felt = document.createElement('IMG');
felt.src = 'imgs/felt.jpg';

	ws = new WebSocket("ws://"+document.location.hostname+":5000");
	ws.onerror = function() {
		ohno("Websocket Error! Refresh in a bit, it might have been restarted...")
	}
	ws.onclose = function() {
		ohno("Websocket Closed?")
	}
	ws.onmessage = function(m) {
		v = JSON.parse(m.data)
		readMessage(v)
	}


function readMessage(v) {
	switch (v["type"]) {
	case "new":
		console.log("CREATING ACTOR", v.id, "OWNED BY", v.owner)
		p = new actor(v.id, v.owner, v.x, v.y)
		p.mass = v.mass
		break;
	case "del":
		console.log("REMOVING ACTOR", v.id)
		p = actors[v.id]
		p.remove()

		break;
	case "addpel":
		p = new pellet(v.x, v.y, v.style)
		break
	case "delpel":
		p = currentRoom.findTile(v.x,v.y).find(v.x,v.y)

		if (p) {
			p.remove()	
		} else {
			console.log("COULDNT FIND", v.x,v.y)
		}
		break

	case "addplayer":
		console.log("CREATING PLAYER", v.id)
		p = (new player(currentRoom, v.id))
		p.name = v.name ? v.name : "";
		break
	case "delplayer":
		console.log("CREATING PLAYER", v.id)
		currentRoom.players[v.id].remove()
		break
	case "nameplayer":
		currentRoom.players[v.id].name=v.name
		break
	case "own":
		console.log("NOW OWNS", v.id)
		myplayer = currentRoom.players[v.id]
		break;
	case "room":
		room = new room(v.width,v.height)
		currentRoom = room
		room.startmass = v.mass
		room.mergetime = v.mergetime
		console.log(room);
		break;
	case "move":
		p = actors[v.id]
		p.x = v.x
		p.y = v.y
		p.direction = v.d
		p.speed = v.s
		break;
	case "mass":
		p = actors[v.id]
		p.mass = v.mass
		break;
	case "multi":
		for(var i=0;i<v.parts.length;i++) {
			readMessage(v.parts[i])
		}
		break

	}
}

function rgb(r, g, b){
  return "rgb("+Math.floor(r)+","+Math.floor(g)+","+Math.floor(b)+")";
}

var c = document.getElementById("playarea");
function ohno(x) {
	var errs = document.getElementById("err");
	errs.innerHTML = x;
}
var popup;
window.onload = function() {
	window.requestAnimationFrame(render)
	window.onresize();
	document.getElementById("loginButton").onclick = function() {
		console.log("JOINING")
		n = document.getElementById("name").value;
		join = {type:"join",name:n}
		ws.send(JSON.stringify(join))
	}
}

window.onresize = function() {
    popup = document.getElementById("login");
    popup.style.left = ""+String(window.innerWidth/2 - popup.offsetWidth/2)+"px";
    popup.style.top = ""+String(window.innerHeight/2 - popup.offsetHeight/2)+"px";
    console.log("Left",window.innerWidth/2 - popup.innerWidth/2);
    c.width = window.innerWidth;
    c.height = window.innerHeight;   
    camera.width = c.width;
    camera.height = c.height;
    console.log("New Cam",camera)
}

var camera = {x:0,y:0,width:c.width,height:c.height};
var ctx = c.getContext("2d");

var mousex = c.width/2;
var mousey = c.height/2;
c.onmousemove = function(e) {
	mousex = e.offsetX;
	mousey = e.offsetY;
}
canSplit = true
document.onkeydown = function(e) {
    e = e || window.event;

	if (canSplit && e.keyCode == '32') {
    	canSplit = false
    	split = {type:"split"}
    	ws.send(JSON.stringify(split))
    }
	if (e.keyCode == '68') {
    	load_graphics_file("dark.js")
    }

}
document.onkeyup = function(e) {
    e = e || window.event;
    if (e.keyCode == '32') {
    	canSplit = true

    }

}

var gfx = {}
var gfx_loaded = {"default.js":true}

function load_graphics_file(name) {
	if (gfx_loaded[name]) {
		return
	}
	var js = document.createElement("script");
	js.type = "text/javascript";
	js.src = name;
	document.body.appendChild(js);
	gfx_loaded[name] = true
}

function render() {
	if (myplayer) {
		l = Object.keys(myplayer.owns).length
		if (l>0) {
			camX = 0;
			camY = 0;

			for (i in myplayer.owns) {
				p = myplayer.owns[i]

				camX += p.x;
				camY += p.y;
			}

			camera.x = (camX / l - camera.width / 2 + camera.x) / 2;
			camera.y = (camY / l - camera.height / 2 + camera.y) / 2;
		}
	}

	gfx.renderArea(ctx,camera.width,camera.height)
	ctx.save()
	ctx.translate(-camera.x,-camera.y)

	x = camera.x<0 ? 0 : camera.x
	y = camera.y<0 ? 0 : camera.y
	w = x + camera.width > room.width ? room.width - x : camera.width
	h = y + camera.height > room.height ? room.height - y : camera.height 

	gfx.renderBackground(ctx, x, y, w, h)

	if (currentRoom) {
		currentRoom.render(ctx)
	}

	ctx.restore()



	var actor;
	for (id in renderable) {
		actor = renderable[id]
		if (actor.postRender) {
			actor.postRender()
		}
	}

	ctx.strokeStyle = "rgba(30,60,80,.4)";
	ctx.beginPath();
	ctx.arc(mousex, mousey, 10, 0, 2 * Math.PI);
	ctx.stroke();

	if (currentRoom) {
		draw_leaderboard(ctx,currentRoom)
	}

	window.requestAnimationFrame(render)
}

lastStep = (new Date())
function step() {
	var actor;
	now = (new Date())
	diff = (now - lastStep) / 1000
	for (id in actors) {
		actor = actors[id]
		actor.step(diff)
	}
	lastStep = now


}
setInterval(step,1000/60);

// utils

function median(a,b,c) {
	return a<b? b<c? b : a<c? c : a : b<c? a<c? a : c : b; }