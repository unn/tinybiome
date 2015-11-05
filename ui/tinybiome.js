var currentRoom;
var myplayer;

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
		if (p.owner == myplayer.id) {
			p.x = v.x
			p.y = v.y
		}
		p.lastUpdateX = v.x
		p.lastUpdateY = v.y
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

renderTiles = {}
renderTileSize = 250
tilePadding = 10

function player(room, id) {
	this.room = room
	this.id = id
	this.room.players[id] = this
	this.owns = {}
}
player.prototype.remove = function() {
	delete this.room.players[this.id]
}

function renderTile(room,x,y) {
	var m_canvas = document.createElement('canvas');
	m_canvas.width = renderTileSize + tilePadding*2;
	m_canvas.height = renderTileSize + tilePadding*2;
	var m_context = m_canvas.getContext('2d');
	this.canvas = m_canvas
	this.ctx = m_context
	this.x = x
	this.y = y
	this.id = "tile("+this.x+","+this.y+")"
	renderable[this.id] = this
	room.tiles[this.id] = this
	this.canRender = false
	this.renderables = {}
	this.dirty = false
}
renderTile.prototype.add = function(particle) {
	this.renderables[particle.id] = particle
	this.dirty = true
}
renderTile.prototype.remove = function(particle) {
	delete this.renderables[particle.id]
	this.dirty = true
}
renderTile.prototype.render = function(ctx) {
	if (this.dirty) {
		this.rerender()
	}
  	ctx.drawImage(this.canvas, this.x-tilePadding, this.y-tilePadding);

  	if (this.contains(mousex+camera.x,mousey+camera.y)) {
	  	ctx.strokeStyle = "rgba(0,0,0,.2)";
	  	ctx.strokeRect(this.x,this.y,renderTileSize,renderTileSize)
	  	ctx.strokeRect(this.x-tilePadding,this.y-tilePadding,tilePadding*2+renderTileSize,tilePadding*2+renderTileSize)
  }
}
renderTile.prototype.rerender = function() {
	console.log("rerendering",this.id)
	this.ctx.clearRect(0, 0, c.width, c.height);
	this.ctx.save()
	this.ctx.translate(-this.x+tilePadding,-this.y+tilePadding)

	for (id in this.renderables) {
		objectToRender = this.renderables[id]
		objectToRender.render(this.ctx)
	}
	this.ctx.restore()
	this.dirty = false
}
renderTile.prototype.contains = function(x,y) {
	return (this.x<x && this.y<y && this.x+renderTileSize>=x && this.y+renderTileSize>=y)
}
renderTile.prototype.bbox = function() {
	return [this.x,this.y,this.x+renderTileSize,this.y+renderTileSize]
}
renderTile.prototype.findCollisions = function(actor) {
	for(pel in this.renderables) {
		p = this.renderables[pel]
		if (actor.contains(p)) {
			p.remove()
			actor.mass += 5
		}
	}
}
renderTile.prototype.find = function(x,y) {
	id = ""+x+","+y
	return this.renderables[id]
}

function room(width, height) {
	this.tiles = {}
	this.width = width
	this.height = height
	for(var x=0; x<width; x+=renderTileSize) {
		for(var y=0; y<height; y+=renderTileSize) {
			new renderTile(this,x,y)
		}
	}
	this.players = {}
}
room.prototype.findTile = function(x,y) {
	var tile_id = "tile("+Math.floor(x/renderTileSize)*renderTileSize+","+Math.floor(y/renderTileSize)*renderTileSize+")"
	return this.tiles[tile_id]
}
room.prototype.render = function(ctx) {
	renderDetails = {"ms":new Date(),"skips":0,"renders":0}
	ctx.strokeStyle = "black";
	ctx.strokeRect(0, 0, room.width, room.height);

	padding = 10
	for (id in renderable) {
		objectToRender = renderable[id]
		bbox = objectToRender.bbox()
		if (hidingBbox) {
			if (bbox[2] < camera.x - padding || bbox[3] < camera.y - padding
				|| bbox[0] > camera.x + camera.width + padding
				|| bbox[1] > camera.y + camera.height + padding) {
				renderDetails.skips += 1
				continue
			}

		}
		renderDetails.renders += 1
		objectToRender.render(ctx)
	}
	renderDetails.ms = (new Date()) - renderDetails.ms
}
room.prototype.findCollisions = function(actor) {
	bb = actor.bbox()
	bb[0] = Math.floor(bb[0]/renderTileSize)*renderTileSize
	bb[1] = Math.floor(bb[1]/renderTileSize)*renderTileSize
	bb[2] = Math.floor(bb[2]/renderTileSize)*renderTileSize
	bb[3] = Math.floor(bb[3]/renderTileSize)*renderTileSize
	for(var x=bb[0];x<=bb[2];x+=renderTileSize) {
		for(var y=bb[1];y<=bb[3];y+=renderTileSize) {
			found = this.findTile(x,y)
			if (found) found.findCollisions(actor)
		}
	}
}

function draw_leaderboard(ctx, room) {
	var playersWithScore = []
	for(k in room.players) {
		p = room.players[k]
		s = 0
		for(i in p.owns) {
			a = p.owns[i];
			s += a.mass
		}
		playersWithScore.push([p.name,s])
	}
	playersWithScore.sort(function(a,b){return b[1]-a[1]})

	ctx.textAlign = "right";
	ctx.textBaseline = "top";
	ctx.fillStyle = "white";
	ctx.strokeStyle = "black"
	ctx.font = "20px sans serif";

	l = "Leaderboard"
	ctx.fillText(l, camera.width,0)
	ctx.strokeText(l, camera.width,0)

	for(var i=0; i<playersWithScore.length; i+=1) {
		n = playersWithScore[i][0] ? playersWithScore[i][0] : "Microbe"
		ctx.fillText(n, camera.width - 100,i*20+20)
		ctx.strokeText(n, camera.width - 100,i*20+20)

		m = playersWithScore[i][1]
		ctx.fillText(m, camera.width,i*20+20)
		ctx.strokeText(m, camera.width,i*20+20)
	}
	console.log(JSON.stringify(playersWithScore))
	
}

function pellet(x,y,style) {
	this.style = style
	this.x = x
	this.y = y
	this.id = ""+x+","+y
	currentRoom.findTile(x,y).add(this)
	this._radius = 3
	if (this.style==0) {
		this.color = rgb(Math.random()*100,Math.random()*100,255)
	}
	if (this.style==1) {
		this.color = rgb(255,Math.random()*100,Math.random()*100)
	}
}
pellet.prototype.radius = function() {
	return this._radius
}
pellet.prototype.render = function(ctx) {
	ctx.fillStyle = this.color;
	ctx.beginPath();
	ctx.arc(this.x, this.y, this._radius, 0, 2 * Math.PI);
	ctx.fill();
}
pellet.prototype.remove = function() {
	myTile = currentRoom.findTile(this.x,this.y)
	myTile.remove(this)
}
pellet.prototype.bbox = function() {
	r = this._radius
	return [this.x-r, this.y-r, this.x+r, this.y+r]
}

actors = {}
renderable = {}
activeRenders = {}

function rgb(r, g, b){
  return "rgb("+Math.floor(r)+","+Math.floor(g)+","+Math.floor(b)+")";
}

function actor(id, owner, x, y) {
	this.id = id
	this.x = x
	this.y = y
	this.lastUpdateX = this.x
	this.lastUpdateY = this.y
	this.mass = room.startmass
	this.mergeTimer = (new Date())
	this.mergeTimer.setSeconds(this.mergeTimer.getSeconds()+room.mergetime)
	renderable[this.id] = this
	actors[this.id] = this
	this.owner = owner
	currentRoom.players[this.owner].owns[this.id] = this
	if (myplayer) {
		if (this.owner == myplayer.id) {
			document.getElementById("login").style.display="none";
		}
	}
}

actor.prototype.contains = function(actor) {
	dx = actor.x - this.x
	dy = actor.y - this.y
	dist = dx*dx+dy*dy
	allowedDist = actor.radius() + this.radius()
	if (dist < allowedDist*allowedDist) {
		return true
	}
	return false
}
actor.prototype.bbox = function() {
	r = this.radius()
	bb = [this.x-r, this.y-r, this.x+r, this.y+r]
	// [2707.2190938111135, 3086.8755672544276, 2718.5028854820685, 3098.1593589253825] 
	// Object {x: 2237.860989646591, y: 2852.517463089905, width: 950, height: 480}
	return bb
}
actor.prototype.postRender = function() {
	onCanvasX = this.x - camera.x
	onCanvasY = this.y - camera.y
	dx = mousex-onCanvasX
	dy = mousey-onCanvasY
	dist = Math.sqrt(dx*dx+dy*dy)
	dx = dx / dist * (dist-10)
	dy = dy / dist * (dist-10)
	if (this.owner == myplayer.id) {
		ctx.strokeStyle = "rgba(30,60,80,.4)";
		ctx.beginPath();
		ctx.moveTo(onCanvasX, onCanvasY);
	    ctx.lineTo(onCanvasX+dx, onCanvasY+dy);
		ctx.stroke();
	}
}
actor.prototype.radius = function() {return Math.sqrt(this.mass/Math.PI)}
actor.prototype.render = function(ctx) {
	radius = this.radius()
	// a = pi * r^2
	// sqrt(a/pi) = r
	ctx.fillStyle = this.owner==myplayer.id ? "#009900" : "#990000";
	ctx.beginPath();
	ctx.arc(this.x, this.y, radius, 0, 2 * Math.PI);
	ctx.fill();

	ctx.fillStyle = this.owner==myplayer.id ? "#33FF33" : "#FF3333";
	ctx.beginPath();
	ctx.arc(this.x, this.y, radius*.8, 0, 2 * Math.PI);
	ctx.fill();

	ctx.textAlign = "center";
	ctx.fillStyle = "white";
	ctx.strokeStyle = "black";
	ctx.font = "28px serif";
	ctx.textBaseline = "bottom";
	n = currentRoom.players[this.owner].name
	n = n ? n : "Microbe"
 	ctx.fillText(n, this.x, this.y);
 	ctx.strokeText(n, this.x, this.y);


	ctx.textBaseline = "top";
 	ctx.fillText(this.mass, this.x, this.y);
 	ctx.strokeText(this.mass, this.x, this.y);
}
actor.prototype.step = function() {
	if (this.owner==myplayer.id) {
		onCanvasX = this.x - camera.x
		onCanvasY = this.y - camera.y

		mdx = mousex - onCanvasX
		mdy = mousey - onCanvasY

		dist = Math.sqrt(mdx*mdx+mdy*mdy);
		maxSpeed = 4/(Math.pow(.46*this.mass,.1))

		// mass between 10 - 500000
		// 

		if (dist>=10) {
			newDist = Math.sqrt(dist-10);
			if (newDist>maxSpeed) {
				newDist = maxSpeed
			}
			dx = mdx/dist*newDist;
			dy = mdy/dist*newDist;
		} else {
			dx = 0
			dy = 0
		}

		this.x += dx
		this.y += dy

		for (i in myplayer.owns) {
			b = myplayer.owns[i]
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

		dx = this.lastUpdateX-this.x
		dy = this.lastUpdateY-this.y
		distSinceLU = Math.sqrt(dx*dx+dy*dy)
		if (distSinceLU > 4 || Math.random() < .1) {
			mov = {type:"move",x:this.x,y:this.y,id:this.id}
			ws.send(JSON.stringify(mov))
			console.log(mov)
			this.lastUpdateX = this.x
			this.lastUpdateY = this.y
		}
	} else {
		this.x = (this.x*3+this.lastUpdateX)/4
		this.y = (this.y*3+this.lastUpdateY)/4
	}
}
actor.prototype.remove = function() {
	delete renderable[this.id]
	delete actors[this.id]
	delete currentRoom.players[this.owner].owns[this.id]
	if (this.owner == myplayer.id) {
		if (Object.keys(myplayer.owns).length==0) {
			document.getElementById("login").style.display="block";
		}
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

}
document.onkeyup = function(e) {
    e = e || window.event;
    if (e.keyCode == '32') {
    	canSplit = true

    }

}

tileSize = 50;
hidingBbox = true;


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

			camera.x = camX / l - camera.width / 2;
			camera.y = camY / l - camera.height / 2;
		}
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