
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
		console.log("HELLO", v.id)
		p = new actor()
		p.x = v.x
		p.y = v.y
		p.id = v.id
		p.mass = v.mass
		actors[v.id] = p
		break;
	case "del":
		console.log("GOODBYE", v.id)
		p = actors[v.id]
		delete actors[v.id]
		break;
	case "own":
		console.log("NOW OWNS", v.ids)
		for(var i=0; i<owns.length; i++) {
			actors[owns[i]].owned = false
		}
		owns = v.ids

		for(var i=0; i<owns.length; i++) {
			actors[owns[i]].owned = true
		}
		if (owns.length==0) {
			document.getElementById("login").style.display="block";
		} else {
			document.getElementById("login").style.display="none";
		}
		break;
	case "room":
		room = {width:v.width,height:v.height,startmass:v.mass,mergetime:v.mergetime}
		console.log(room);
		break;
	case "move":
		p = actors[v.id]
		p.x = v.x
		p.y = v.y
		break;
	case "mass":
		p = actors[v.id]
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

actors = {}

function actor() {
	this.mass = room.startmass
	this.owned = false
	this.mergeTimer = (new Date())
	this.mergeTimer.setSeconds(this.mergeTimer.getSeconds()+room.mergetime)
}

owns = []
actor.prototype.postRender = function() {
	onCanvasX = this.x - camera.x
	onCanvasY = this.y - camera.y
	dx = mousex-onCanvasX
	dy = mousey-onCanvasY
	dist = Math.sqrt(dx*dx+dy*dy)
	dx = dx / dist * (dist-10)
	dy = dy / dist * (dist-10)
	if (this.owned) {
		ctx.strokeStyle = "rgba(30,60,80,.4)";
		ctx.beginPath();
		ctx.moveTo(onCanvasX, onCanvasY);
	    ctx.lineTo(onCanvasX+dx, onCanvasY+dy);
		ctx.stroke();
	}
}
actor.prototype.radius = function() {return Math.sqrt(this.mass/Math.PI)}
actor.prototype.render = function() {
	radius = this.radius()
	// a = pi * r^2
	// sqrt(a/pi) = r

	ctx.fillStyle = this.owned ? "#009900" : "#990000";
	ctx.beginPath();
	ctx.arc(this.x, this.y, radius, 0, 2 * Math.PI);
	ctx.fill();

	ctx.fillStyle = this.owned ? "#33FF33" : "#FF3333";
	ctx.beginPath();
	ctx.arc(this.x, this.y, radius*.8, 0, 2 * Math.PI);
	ctx.fill();
}
actor.prototype.step = function() {
	if (this.owned) {
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

		for (var i = 0; i < owns.length; i++) {
			b = actors[owns[i]]
			if (this == b) {
				continue
			}
			dx = b.x - this.x
			dy = b.y - this.y
			dist = Math.sqrt(dx*dx + dy*dy)
			if (dist == 0) {
				dist = .01
			}
			allowedDist = this.radius() + b.radius()
			depth = allowedDist - dist
			if (depth > 0) {
				if (this.mergetime > (new Date()) || b.mergetime > (new Date())) {
					dx = dx / dist * depth
					dy = dy / dist * depth
					this.x -= dx
					this.y -= dy
				}
			}
		}

		this.x = median(this.x, 0, room.width);
		this.y = median(this.y, 0, room.height);



		mov = {type:"move",x:this.x,y:this.y,id:this.id}
		ws.send(JSON.stringify(mov))
	}
}



var c = document.getElementById("playarea");
function ohno(x) {
	var errs = document.getElementById("err");
	errs.innerHTML = x;
}
var popup;
window.onload = function() {
	window.onresize();
	document.getElementById("loginButton").onclick = function() {
		console.log("JOINING")
		join = {type:"join"}
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

tileSize = 50;

function render() {
	if (owns.length>0) {
		camX = 0;
		camY = 0;

		for (var i=0; i<owns.length; i+=1) {
			pid = owns[i]
			p = actors[pid]

			camX += p.x;
			camY += p.y;
		}

		camera.x = camX / owns.length - camera.width / 2;
		camera.y = camY / owns.length - camera.height / 2;
	}

	ctx.clearRect(0, 0, c.width, c.height);
	ctx.save()
	ctx.translate(-camera.x,-camera.y)

	ctx.strokeStyle = "lightgray";
	offsetX = camera.x % tileSize;
	offsetY = camera.y % tileSize;
	ctx.beginPath();

	for (var x=Math.max(camera.x-offsetX,0); x<Math.min(camera.x+camera.width-offsetX,room.width); x+=tileSize) {
		ctx.moveTo(x,Math.max(camera.y,0));
		ctx.lineTo(x,Math.min(camera.y+camera.height,room.height));
	}
	for (var y=Math.max(camera.y-offsetY,0); y<Math.min(camera.y+camera.width-offsetY,room.height); y+=tileSize) {
		ctx.moveTo(Math.max(camera.x,0),y);
		ctx.lineTo(Math.min(camera.x+camera.width,room.width),y);
	}
	ctx.stroke();


	ctx.strokeStyle = "black";
	ctx.strokeRect(0, 0, room.width, room.height);
	var actor;
	for (id in actors) {
		actor = actors[id]
		actor.render()
	}
	ctx.restore()

	var actor;
	for (id in actors) {
		actor = actors[id]
		actor.postRender()
	}

	ctx.strokeStyle = "rgba(30,60,80,.4)";
	ctx.beginPath();
	ctx.arc(mousex, mousey, 10, 0, 2 * Math.PI);
	ctx.stroke();

	window.requestAnimationFrame(render)
}

function step() {



	var actor;
	for (id in actors) {
		actor = actors[id]
		actor.step()
	}


}

window.requestAnimationFrame(render)
setInterval(step,1000/60);

// utils

function median(a,b,c) {
	return a<b? b<c? b : a<c? c : a : b<c? a<c? a : c : b; }