ws = new WebSocket("ws://"+document.location.hostname+":5000");
ws.onmessage = function(m) {
	v = JSON.parse(m.data)
	readMessage(v)
}
function readMessage(v) {
	switch (v["type"]) {
	case "new":
		p = new actor()
		p.x = v.x
		p.y = v.y
		p.id = v.id
		p.mass = v.mass
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
		p.mass = v.mass
		break;
	case "multi":
		console.log("MULTI", v.parts)
		for(var i=0;i<v.parts.length;i++) {
			readMessage(v.parts[i])
		}
		break

	}
}

var room = {width:0,height:0, startmass:50};

players = {}

function actor() {
	this.mass = room.startmass
}

owns = []
actor.prototype.postRender = function() {
	onCanvasX = this.x - camera.x
	onCanvasY = this.y - camera.y

	ctx.strokeStyle = "blue";
	ctx.beginPath();
	ctx.moveTo(onCanvasX, onCanvasY);
    ctx.lineTo(mousex, mousey);
	ctx.stroke();
}
actor.prototype.render = function() {
	radius = Math.sqrt(this.mass/Math.PI)
	// a = pi * r^2
	// sqrt(a/pi) = r
	ctx.fillStyle = "red";
	ctx.beginPath();
	ctx.arc(this.x, this.y, radius, 0, 2 * Math.PI);
	ctx.fill();
}
actor.prototype.step = function() {
	onCanvasX = this.x - camera.x
	onCanvasY = this.y - camera.y

	mdx = mousex - onCanvasX
	mdy = mousey - onCanvasY

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

	this.x += dx
	this.y += dy

	this.x = median(this.x, 0, room.width);
	this.y = median(this.y, 0, room.height);
	mov = {type:"move",x:this.x,y:this.y,id:this.id}
	ws.send(JSON.stringify(mov))
}



var c = document.getElementById("playarea");
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
    	split = {type:"split",ids:owns}
    	ws.send(JSON.stringify(split))
    }

}
document.onkeyup = function(e) {
    e = e || window.event;
    if (e.keyCode == '32') {
    	canSplit = true

    }

}

function render() {
	if (owns.length>0) {
		camX = 0;
		camY = 0;

		for (var i=0; i<owns.length; i+=1) {
			pid = owns[i]
			p = players[pid]

			camX += p.x;
			camY += p.y;
		}

		camera.x = camX / owns.length - camera.width / 2;
		camera.y = camY / owns.length - camera.height / 2;
	}

	ctx.clearRect(0, 0, c.width, c.height);
	ctx.save()
	ctx.translate(-camera.x,-camera.y)
	ctx.fillStyle = "black";
	ctx.fillRect(0, 0, room.width, room.height);
	ctx.fillStyle = "white";
	ctx.fillRect(2, 2, room.width-4, room.height-4);
	var actor;
	for (id in players) {
		actor = players[id]
		actor.render()
	}
	ctx.restore()

	var actor;
	for (id in players) {
		actor = players[id]
		actor.postRender()
	}

	ctx.strokeStyle = "blue";
	ctx.beginPath();
	ctx.arc(mousex, mousey, 50, 0, 2 * Math.PI);
	ctx.stroke();

	window.requestAnimationFrame(render)
}

function step() {



	var actor;
	for (id in players) {
		actor = players[id]
		actor.step()
	}


}

window.requestAnimationFrame(render)
setInterval(step,1000/60);

// utils

function median(a,b,c) {
	return a<b? b<c? b : a<c? c : a : b<c? a<c? a : c : b; }