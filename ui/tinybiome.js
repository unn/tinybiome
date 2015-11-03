ws = new WebSocket("ws://"+document.location.hostname+":5000");
ws.onmessage = function(m) {
	v = JSON.parse(m.data)
	switch (v["type"]) {
	case "new":
		p = new player()
		p.x = v.x
		p.y = v.y
		p.id = v.id
		players[v.id] = p
		break;
	case "del":
		p = players[v.id]
		delete players[v.id]
		break;
	case "own":
		owns = v.ids
		break;
	case "room":
		room = {width:v.width,height:v.height}
		console.log(room);
		break;
	case "move":
		p = players[v.id]
		p.x = v.x
		p.y = v.y
		break;

	}
}

var room = {width:0,height:0};

players = {}

function player() {
}

owns = []
player.prototype.render = function() {
	ctx.fillStyle = "red";
	ctx.beginPath();
	ctx.arc(this.x, this.y, 50, 0, 2 * Math.PI);
	ctx.stroke();
}
player.prototype.step = function() {

}



var c = document.getElementById("playarea");
var camera = {x:0,y:0,width:c.width,height:c.height};
var ctx = c.getContext("2d");

var mdx = mdy = 0;
c.onmousemove = function(e) {
	mdx = e.offsetX-c.width/2;
	mdy = e.offsetY-c.height/2;

}


function render() {
	ctx.clearRect(0, 0, c.width, c.height);
	ctx.save()
	ctx.translate(-camera.x,-camera.y)
	ctx.fillStyle = "black";
	ctx.fillRect(0, 0, room.width, room.height);
	ctx.fillStyle = "white";
	ctx.fillRect(2, 2, room.width-4, room.height-4);
	var player;
	for (id in players) {
		player = players[id]
		player.render()
	}
	ctx.restore()
	window.requestAnimationFrame(render)
}

function step() {
	dist = Math.sqrt(mdx*mdx+mdy*mdy);
	if (dist>=10) {
		newDist = Math.sqrt(dist-10);
		if (newDist>4) {
			newDist = 4
		}
		dx = mdx/dist*newDist;
		dy = mdy/dist*newDist;
	} else {
		dx = 0
		dy = 0
	}
	if (owns.length>0) {
		camX = 0;
		camY = 0;

		for (var i=0; i<owns.length; i+=1) {
			pid = owns[i]
			p = players[pid]
			p.x += dx
			p.y += dy
			p.x = median(p.x, 0, room.width);
			p.y = median(p.y, 0, room.height);
			mov = {type:"move",x:p.x,y:p.y,id:pid}
			ws.send(JSON.stringify(mov))
			camX += p.x;
			camY += p.y;
		}

		camera.x = camX / owns.length - camera.width / 2;
		camera.y = camY / owns.length - camera.height / 2;
	}

	var player;
	for (id in players) {
		player = players[id]
		player.step()
	}
}

window.requestAnimationFrame(render)
setInterval(step,1000/60);

// utils

function median(a,b,c) {
	return a<b? b<c? b : a<c? c : a : b<c? a<c? a : c : b; }