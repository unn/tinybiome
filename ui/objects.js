"use strict"

var hidingBbox = true;

var renderTileSize = 250;
var tilePadding = 5;

var darkGreen = 0x303C00;
var lightGreen = 0xB4CC48;
var red = 0x840000;
var green = 0x788418;
var orange = 0xCC480C;
var lightBlue = 0x9CC0CC;
var fadedRed = 0xB46C6C;
var sand = 0xF0E49C;
var deepBlue = 0x3C6C78;
var brightOrange = 0xFCA800;


function player(room, id) {
	this.room = room
	this.id = id
	this.room.players[id] = this
	this.owns = {}
	this.room.renderable.push(this)
	this.gfx = gfx.createGroup(pix)
}
player.prototype.remove = function() {
	this.gfx.free()
	this.room.renderable.splice(this.room.renderable.indexOf(this),1)
}
player.prototype.quit = function() {
	delete this.room.players[this.id]
	this.remove()
}
player.prototype.free = function() {
	this.gfx.free()
}
player.prototype.render = function(ctx) {
	var myActors = []
	var mass = 0
	
	for (var i in this.owns) {
		var b = this.owns[i]
		myActors.push(b)
		mass += b.mass
	}
	if (myActors.length>0) {
		var bbox = this.bbox()
		var n = this.name ? this.name : "Microbe"
		this.gfx.update(bbox, n, mass, myActors)
	}
}
var randomActorId = null;
var randomActorTime = (new Date());
player.prototype.bbox = function() {
	var x = this.room.width
	var y = this.room.height
	var xr = 0
	var yr = 0
	
	var found = false
	for (var i in this.owns) {
		var b = this.owns[i]
		var bb = b.bbox()
		if (!bb) {
			console.log("BB ERROR",bb)
		}
		if (isNaN(bb[0])) {
			console.log("BB ERROR",bb,b)
		}
		if (bb[0]<x) x = bb[0]
		if (bb[1]<y) y = bb[1]
		if (bb[2]>xr) xr = bb[2]
		if (bb[3]>yr) yr = bb[3]
		found = true
	}
	if (!found) {
		
	}

	if (isNaN(x)) {
		console.log("BB ERROR", x, y, xr, yr)
	}
	return [x-4,y-4,xr+4,yr+4]
}

function renderTile(room,x,y) {
	this.x = x
	this.y = y
	this.id = renderTile.id(x,y)
	this.room = room
	this.room.renderable.push(this)
	this.count = 0
	this.room.tiles[this.id] = this
	this.canRender = false
	this.renderable = []
	this.dirty = false
	this.freeadd = true
	this.visible = false
	this.gfx = gfx.createRenderTile(pix)
}
renderTile.prototype.addChild = function(pell) {
	this.count += 1
	// if (pell.id in this.renderable) {
	// 	console.log("Duplicate Pellet", pell)
	// 	this.renderable[pell.id].remove()
	// }
	// this.renderable.splice(this.renderable.indexOf(pell),1)
	this.renderable.push(pell)
	pell.gfx.attach(this.gfx)

}
renderTile.prototype.removeChild = function(pell) {
	pell.gfx.detach(this.gfx)
	this.renderable.splice(this.renderable.indexOf(pell),1)
}
renderTile.prototype.render = function(ctx) {
	if (Math.random()*1000<this.renderable.length) {
		var i = Math.floor(Math.random()*this.renderable.length)
		if (i) {
			var r = this.renderable[i]
			this.room.addParticle(r.x,r.y,r.color)	
		}
	}
}
renderTile.prototype.contains = function(x,y) {
	return (this.x<=x && this.y<=y && this.x+renderTileSize>x && this.y+renderTileSize>y)
}
renderTile.prototype.bbox = function() {
	return [this.x-tilePadding,this.y-tilePadding,
		this.x+renderTileSize+tilePadding,this.y+renderTileSize+tilePadding]
}
renderTile.prototype.find = function(x,y) {
	for(var i=0; i<this.renderable.length;i++) {
		if (this.renderable[i].x == x && this.renderable[i].y == y ) {
			return this.renderable[i]
		}
	}
}
renderTile.id = function(x,y) {
	return "a_t("+x+","+y+")"
}
renderTile.prototype.remove = function() {
	console.info("REMOVING RENDERTILE WITH",this.renderable.length)
	while(this.renderable.length>0) {
		this.renderable[0].remove()
	}
	this.room.renderable.splice(this.room.renderable.indexOf(this),1)
	this.gfx.free()
}
renderTile.prototype.addParticle = function(x,y,c) {
	this.room.addParticle(x,y,c)
}

function pellet(parent, x,y,style) {
	this.style = style
	this.x = x
	this.y = y
	this.id = ""+x+","+y
	this.parent = parent
	this._radius = 4

	if (this.style==0) {
		this.gfx = gfx.createMineral(ctx)
		this.color = fromRgb(Math.random()*100,Math.random()*100,255)
	}
	if (this.style==1) {
		this.gfx = gfx.createVitamin(ctx)
		this.color = fromRgb(255,Math.random()*100,Math.random()*100)
	}
	this.gfx.update(this.x, this.y, this.color, this._radius)
	this.parent.addChild(this)
}
pellet.prototype.remove = function() {
	for(var i=0;i<4;i+=1) {
		this.parent.addParticle(this.x,this.y,this.color)
	}
	this.parent.removeChild(this)
	this.gfx.free()
}
pellet.prototype.bbox = function() {
	var r = this._radius
	return [this.x-r, this.y-r, this.x+r, this.y+r]
}



function pickRandomProperty(obj) {
    var result;
    var count = 0;
    for (var prop in obj)
        if (Math.random() < 1/++count)
           result = prop;
    return result;
}

function particle(id,room,x,y,color) {
	this.id = id
	this.x = x
	this.y = y
	this.xspeed = Math.random()*3-1.5
	this.yspeed = Math.random()*3-1.5
	this.life = 100
	this.color = color
	this.room = room
	this.room.particles[id] = this
	this.gfx = gfx.createParticle(pix)
	this.destroyed = false
}
particle.prototype.render = function(ctx) {
	this.gfx.update(this.x, this.y, this.life, this.color)
}
particle.prototype.step = function(seconds) {
	this.life -= (10*16)*seconds
	this.x += (this.xspeed*16)*seconds
	this.y += (this.yspeed*16)*seconds
	this.xspeed *= Math.pow(.90, seconds)
	this.yspeed *= Math.pow(.90, seconds)
	this.xspeed += (Math.random()*.1-.05)*16*seconds
	this.yspeed += (Math.random()*.1-.05)*16*seconds
	if (this.life<=0) this.remove()
}
particle.prototype.remove = function() {
	if (this.destroyed) {
		throw new Exception("DOUBLE DESTROY")
	}
	this.destroyed = true
	this.gfx.free()
	this.room.particleCount -= 1
	this.room.particles[this.id] = this.room.particles[this.room.particleCount]
	this.room.particles[this.id].id = this.id
}


function room(server, width, height) {
	this.tiles = {}
	this.width = width
	this.height = height
	this.server = server

	this.players = {}
	this.actors = {}
	this.steppers = {}
	this.renderable = []

	for(var x=0; x<width; x+=renderTileSize) {
		for(var y=0; y<height; y+=renderTileSize) {
			new renderTile(this,x,y)
		}
	}

	this.particles = []
	this.particleCount = 0;
}
room.prototype.getCameraBbox = function() {
	if (this.myplayer) {
		return this.myplayer.bbox()
	}
	var now = (new Date());
	if (now-randomActorTime>5000 || !randomActorId || !this.actors[randomActorId]) {
		randomActorTime = now
		randomActorId = pickRandomProperty(this.actors)
	}
	var a = this.actors[randomActorId]
	if (!a) {
		var x = this.width/2
		var y = this.height/2
		return [x/2-400,y/2-400,x/2+400,y/2+400]
	}

	var bb = a.bbox()
	if (!bb) {
		console.log("BB ERROR",bb)
	}
	bb = [bb[0],bb[1],bb[2],bb[3]]
	bb[0] -= 200
	bb[1] -= 200
	bb[2] += 200
	bb[3] += 200
	if (isNaN(bb[0])) {
		console.log("BB ERROR",bb, a)
	}
	return bb
}
room.prototype.step = function(seconds) {
	var actor;
	for (var id in this.steppers) {
		actor = this.steppers[id]
		actor.step(seconds)
	}

	for(var i=0; i<this.particleCount;i++) {
		var p = this.particles[i]
		p.step(seconds)
		while (p!=this.particles[i]) {
			p = this.particles[i]
			p.step(seconds)
		}
	}
}
room.prototype.findTile = function(ox,oy) {
	var x = Math.floor(ox/renderTileSize)*renderTileSize
	var y = Math.floor(oy/renderTileSize)*renderTileSize
	var tile_id = renderTile.id(x,y)

	return this.tiles[tile_id]
}
room.prototype.addParticle = function(x,y,color) {
	var id = this.particleCount

	this.particleCount += 1

	var p = new particle(id,this,x,y,color)
	return p
}
room.prototype.remove = function() {
	console.log("REMOVING ROOM",this.id,"WITH",this.renderable.length,"RENDERABLES")
	while(this.renderable.length>0) {
		this.renderable[0].remove()
	}
	for(var i=0;i<this.particleCount;i++) {
		this.particles[i].remove()
	}
	this.actors = {}
}
room.prototype.render = function(ctx) {
	var start = (new Date())

	var padding = 10
	for(var id = 0; id < this.renderable.length; id++) {
		var objectToRender = this.renderable[id]
		var bbox = objectToRender.bbox()
		var isTile = false
		if ( objectToRender instanceof renderTile) {
			isTile = true
		}
		if (hidingBbox) {
			if (bbox[2] < camera.x - padding || bbox[3] < camera.y - padding
				|| bbox[0] > camera.x + camera.width + padding
				|| bbox[1] > camera.y + camera.height + padding) {
				if (isTile) {
					graphicsCounts.tileSkips += 1
				}
				objectToRender.gfx.hide()
				continue
			}
		}
		objectToRender.gfx.show()
		// if (Math.random()<.01) {
		// 	console.log("RENDERING",objectToRender)
		// }
		objectToRender.render(ctx)
		if (isTile) {
			graphicsCounts.tiles += 1
		}
	}

	var startP = (new Date())
	graphicsCounts.renderTime += startP - start
	for(var i=0; i<this.particleCount;i++) {
		var p = this.particles[i]
		if (p.x < camera.x - padding || p.y < camera.y - padding
			|| p.x > camera.x + camera.width + padding
			|| p.y > camera.y + camera.height + padding) {
				graphicsCounts.particleSkips += 1
				p.gfx.hide()
				continue
		}
		graphicsCounts.particles += 1
		p.gfx.show()
		p.render(ctx)
	}
	graphicsCounts.particleTime += (new Date()) - startP
}
room.prototype.findCollisions = function(actor) {
	rts = renderTileSize
	bb = actor.bbox()
	bb[0] = Math.floor(bb[0]/rts)*rts
	bb[1] = Math.floor(bb[1]/rts)*rts
	bb[2] = Math.floor(bb[2]/rts)*rts
	bb[3] = Math.floor(bb[3]/rts)*rts
	for(var x=bb[0];x<=bb[2];x+=rts) {
		for(var y=bb[1];y<=bb[3];y+=rts) {
			found = this.findTile(x,y)
			if (found) found.findCollisions(actor)
		}
	}
}






function actor(room, id, x, y) {
	this.room = room
	this.id = id
	this.x = x
	this.y = y
	this.direction = 0
	this.speed = 0

	this.xs = x
	this.ys = y

	this.mass = room.startmass
	this.newmass = this.mass
	this.mergeTimer = (new Date())
	this.mergeTimer.setSeconds(this.mergeTimer.getSeconds()+room.mergetime)
	this.room.renderable.push(this)
	this.room.steppers[this.id] = this
	this.room.actors[this.id] = this

	this.owner = null
	this.inview = false

	this.gfx = noop;
	this.bb = []
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
	var r = this.radius()
	this.bb[0] = this.x-r
	this.bb[1] = this.y-r
	this.bb[2] = this.x+r
	this.bb[3] = this.y+r
	// [2707.2190938111135, 3086.8755672544276, 2718.5028854820685, 3098.1593589253825] 
	// Object {x: 2237.860989646591, y: 2852.517463089905, width: 950, height: 480}
	return this.bb
}
actor.prototype.setmass = function(m) {
	this.newmass = m
}
actor.prototype.radius = function() {return Math.pow(this.mass, this.room.sizemultiplier)}
actor.prototype.render = function(ctx) {
	this.inview = true
	if (this.owner) if (this.owner.render) return this.owner.render(ctx)
	var radius = this.radius()
	// a = pi * r^2
	// sqrt(a/pi) = r
	this.color = "#000000";
	var n = "Something..?"
	this.gfx.update(this.x,this.y,this.color,n, Math.floor(this.mass),radius)

}
actor.prototype.setVelocity = function(s,d) {
	this.direction = d
	this.speed = s
}
actor.prototype.setPosition = function(x,y) {
	var allowed = 500 / (this.room.speedmultiplier * Math.pow(this.mass + 50, .5))
	var distance = allowed * this.room.server.latency/2000 * this.speed

	this.xs = x + Math.cos(this.direction) * distance
	this.ys = y + Math.sin(this.direction) * distance
	this.xs = x
	this.ys = y
}
actor.prototype.step = function(seconds) {
	this.mass = (this.newmass+this.mass*4)/5


	var room = this.room

	var allowed = 500 / (room.speedmultiplier * Math.pow(this.mass + 50, .5))
	var distance = allowed * seconds * this.speed
	var mdx = Math.cos(this.direction) * distance
	var mdy = Math.sin(this.direction) * distance

	if (this.inview) {
		var particleChance = 1-1/((10 * seconds)*this.speed*this.radius())
		if (Math.random()<particleChance*renderQuality/4) {
			var a = this.direction + Math.random()*Math.PI-Math.PI/2
			var dx = Math.cos(a)*this.radius()
			var dy = Math.sin(a)*this.radius()
			var p = room.addParticle(this.x-dx,this.y-dy,this.color)
			if (p) {
				p.xspeed = -mdx
				p.yspeed = -mdy
			}
		}
	}

	this.x = (this.xs+this.x*3)/4
	this.y = (this.ys+this.y*3)/4

	this.x += mdx
	this.y += mdy

	this.x = median(this.x, 0, room.width);
	this.y = median(this.y, 0, room.height);

	this.inview = false
	if (this.owner) if (this.owner.step) this.owner.step(seconds)
}
actor.prototype.remove = function() {
	console.info("REMOVING",this.gfx,this.owner)
	this.gfx.free()
	this.room.renderable.splice(this.room.renderable.indexOf(this),1)
	delete this.room.steppers[this.id]
	delete this.room.actors[this.id]
	if (this.owner) if (this.owner.remove) this.owner.remove()
}

function playeractor(room, aid, pid) {
	this.room = room
	this.actor = this.room.actors[aid]
	this.actor.owner = this
	this.owner = this.room.players[pid]
	this.owner.owns[aid] = this.actor
	this.id = "pa"+aid+","+pid
	if (this.room.myplayer) {
		if (this.owner == this.room.myplayer) {
			document.getElementById("mainfloat").style.display="none";
		}
	}
	this.lastupdate = (new Date())
	this.gfx = gfx.createPlayerActor(pix)
	this.actor.gfx = this.gfx
	this.removed = false
}
playeractor.prototype.remove = function() {
	this.removed = true
	delete this.owner.owns[this.actor.id]
	if (this.owner == this.room.myplayer) {
		if (Object.keys(this.room.myplayer.owns).length==0) {
			document.getElementById("mainfloat").style.display="block";
		}
	}
}
playeractor.prototype.step = function(seconds) {
	if (this.owner==this.room.myplayer) {
		var actor = this.actor;
		var onCanvasX = (actor.x - camera.x)*camera.xscale
		var onCanvasY = (actor.y - camera.y)*camera.yscale

		var mdx = mousex - onCanvasX
		var mdy = mousey - onCanvasY

		actor.direction = Math.atan2(mdy,mdx)
		actor.speed = (Math.sqrt(mdx*mdx+mdy*mdy)*canvas.cwidth/canvas.width-5) / 100
		if (actor.speed<0) actor.speed=0
		if (actor.speed>1) actor.speed=1

		// for (i in this.room.myplayer.owns) {
		// 	b = this.room.myplayer.owns[i]
		// 	if (this == b) {
		// 		continue
		// 	}
		// 	dx = b.x - actor.x
		// 	dy = b.y - actor.y
		// 	dist = Math.sqrt(dx*dx + dy*dy)
		// 	if (dist == 0) {
		// 		dist = .01
		// 	}
		// 	allowedDist = actor.radius() + b.radius()
		// 	depth = allowedDist - dist
		// 	if (depth > 0) {
		// 		if (actor.mergetime > (new Date()) || b.mergetime > (new Date())) {
		// 			dx = dx / dist * depth
		// 			dy = dy / dist * depth
		// 			actor.x -= dx
		// 			actor.y -= dy
		// 		}
		// 	}
		// }

		var now = (new Date())
		if (now-this.lastupdate>3) {
			this.room.server.writeMove(actor.id,actor.direction,actor.speed)
			this.lastupdate = now
		}
	}
}
playeractor.prototype.render = function(ctx) {
	var radius = this.actor.radius()
	// a = pi * r^2
	// sqrt(a/pi) = r
	this.actor.color = this.owner==this.room.myplayer ? green : red;
	var n = this.owner.name
	n = n ? n : "Microbe"
	this.gfx.update(this.actor.x,this.actor.y,this.actor.color, Math.floor(this.actor.mass),radius)
}

function virus(room, aid) {
	this.room = room
	this.actor = this.room.actors[aid]
	this.actor.owner = this
	this.actor.color = 0xFF0000
	this.gfx = gfx.createVirus(pix)
	this.actor.gfx = this.gfx
}
virus.prototype.render = function(ctx) {
	this.gfx.update(this.actor.x, this.actor.y, this.actor.color, this.actor.mass, this.actor.radius())
}


function bacteria(room, aid) {
	this.room = room
	this.actor = this.room.actors[aid]
	this.actor.owner = this
	this.actor.color = lightBlue
	this.gfx = gfx.createBacteria(pix)
	this.actor.gfx = this.gfx
}
bacteria.prototype.render = function(ctx) {
	this.gfx.update(this.actor.x, this.actor.y, this.actor.color, this.actor.mass, this.actor.radius())
}
function blob(room, aid) {
	this.room = room
	this.actor = this.room.actors[aid]
	this.actor.owner = this
	this.actor.color = lightBlue
	this.gfx = gfx.createBlob(pix)
	this.actor.gfx = this.gfx
}
blob.prototype.render = function(ctx) {
	this.gfx.update(this.actor.x, this.actor.y, this.actor.color)
}