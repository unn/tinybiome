var currentRoom;
var myplayer;
var hidingBbox = true;

renderTileSize = 512
tilePadding = 10

function player(room, id) {
	this.room = room
	this.id = id
	this.room.players[id] = this
	this.owns = {}
	renderable["player"+this.id] = this
}
player.prototype.remove = function() {
	delete this.room.players[this.id]
	delete renderable["player"+this.id]
}
player.prototype.render = function(ctx) {
	myActors = []
	mass = 0
	
	for (i in this.owns) {
		b = this.owns[i]
		myActors.push(b)
		mass += b.mass
	}
	if (myActors.length>0) {
		bbox = this.bbox()
		n = this.name ? this.name : "Microbe"
		gfx.renderGroup(ctx, bbox, n, mass, myActors)
	}
}
player.prototype.bbox = function() {
	x = this.room.width
	y = this.room.height
	xr = 0
	yr = 0
	
	found = false
	for (i in this.owns) {
		b = this.owns[i]
		bb = b.bbox()
		if (bb[0]<x) x = bb[0]
		if (bb[1]<y) y = bb[1]
		if (bb[2]>xr) xr = bb[2]
		if (bb[3]>yr) yr = bb[3]
		found = true
	}
	if (!found) {
		return [xr,yr,x,y]
	}

	return [x-4,y-4,xr+4,yr+4]
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
	this.id = renderTile.id(x,y)
	renderable[this.id] = this
	room.tiles[this.id] = this
	this.canRender = false
	this.renderables = {}
	this.dirty = false
	this.room = room
}
renderTile.prototype.add = function(particle) {
	this.renderables[particle.id] = particle
	this.dirty = true
}
renderTile.prototype.remove = function(particle) {
	if (!this.renderables[particle.id]) {
		console.log("NOT FOUND PELLET", particle.id)
	}
	delete this.renderables[particle.id]
	this.dirty = true
}
renderTile.prototype.render = function(ctx) {
	if (Math.random()*1000<Object.keys(this.renderables).length) {
		r = pickRandomProperty(this.renderables)
		if (r) {
			r = this.renderables[r]
			this.room.addParticle(r.x,r.y,r.color)	
		}
	}
	if (this.dirty) {
		this.rerender()
	}

	myArea = this.bbox()
	screenArea = camera.bbox()
	myArea[0] = Math.max(myArea[0], screenArea[0])
	myArea[1] = Math.max(myArea[1], screenArea[1])
	myArea[2] = Math.min(myArea[2], screenArea[2])
	myArea[3] = Math.min(myArea[3], screenArea[3])

	// ctx.imageSmoothingEnabled = false
  	ctx.drawImage(this.canvas, this.x-tilePadding, this.y-tilePadding);

  	sArea = [myArea[0]-this.x,myArea[1]-this.y,myArea[2]-this.x,myArea[3]-this.y]
  	tArea = [myArea[0]+tilePadding,myArea[1]+tilePadding,myArea[2]-tilePadding,myArea[3]-tilePadding]

  	ctx.strokeStyle = "rgba(0,0,0,.2)";
  	// TODO: try optimizing drawImage to clip within camera area
	// ctx.drawImage(this.canvas, sArea[0], sArea[1], sArea[2]-sArea[0],sArea[3]-sArea[1],
	// 	tArea[0], tArea[1], tArea[2]-tArea[0],tArea[3]-tArea[1])

  	// if (this.room.findTile(mousex-camera.x,mousey-camera.y)==this) {
  	if (debugMode) {
	  	if (this.contains(mousex+camera.x,mousey+camera.y)) {
		  	ctx.strokeStyle = "rgba(0,0,0,.2)";
		  	ctx.strokeRect(this.x,this.y,renderTileSize,renderTileSize)
		  	ctx.strokeRect(this.x-tilePadding,this.y-tilePadding,tilePadding*2+renderTileSize,tilePadding*2+renderTileSize)
	  }
	 }
}
renderTile.prototype.rerender = function() {
	this.ctx.clearRect(0, 0, renderTileSize+tilePadding*2, renderTileSize+tilePadding*2);
	this.ctx.save()
	this.ctx.translate(-this.x+tilePadding,-this.y+tilePadding)

	for (id in this.renderables) {
		objectToRender = this.renderables[id]
		if (!this.contains(objectToRender.x,objectToRender.y))  {
			console.log("WTF",this,objectToRender)
		}
		objectToRender.render(this.ctx)
	}
	this.ctx.restore()
	this.dirty = false
}
renderTile.prototype.contains = function(x,y) {
	return (this.x<=x && this.y<=y && this.x+renderTileSize>x && this.y+renderTileSize>y)
}
renderTile.prototype.bbox = function() {
	return [this.x-tilePadding,this.y-tilePadding,
		this.x+renderTileSize+tilePadding,this.y+renderTileSize+tilePadding]
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
renderTile.id = function(x,y) {
	return "tile("+x+","+y+")"
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
}
particle.prototype.render = function(ctx) {
	gfx.renderParticle(ctx, this.x, this.y, this.life, this.color)
}
particle.prototype.step = function(seconds) {
	this.life -= (10*16)*seconds
	this.x += (this.xspeed*16)*seconds
	this.y += (this.yspeed*16)*seconds
	this.xspeed *= Math.pow(.90, seconds)
	this.yspeed *= Math.pow(.90, seconds)
	this.xspeed += (Math.random()*.1-.05)*16*seconds
	this.yspeed += (Math.random()*.1-.05)*16*seconds
	if (this.life<=0) this.destroy()
}
particle.prototype.destroy = function() {
	this.room.particleCount -= 1
	this.room.particles[this.id] = this.room.particles[this.room.particleCount]
	this.room.particles[this.id].id = this.id
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
	this.particles = []
	this.particleCount = 0;
}
room.prototype.step = function(seconds) {
	for(var i=0; i<this.particleCount;i++) {
		p = this.particles[i]
		p.step(seconds)
	}
}
room.prototype.findTile = function(ox,oy) {
	x = Math.floor(ox/renderTileSize)*renderTileSize
	y = Math.floor(oy/renderTileSize)*renderTileSize
	var tile_id = renderTile.id(x,y)

	return this.tiles[tile_id]
}
room.prototype.addParticle = function(x,y,color) {
	id = this.particleCount

	this.particleCount += 1

	p = new particle(id,this,x,y,color)
	return p
}
room.prototype.render = function(ctx) {
	start = (new Date())
	gfx.renderRoom(ctx,this.width,this.height)

	padding = 10
	for (id in renderable) {
		objectToRender = renderable[id]
		bbox = objectToRender.bbox()
		isTile = false
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
				continue
			}

		}
		objectToRender.render(ctx)
		if (isTile) {
			graphicsCounts.tiles += 1
		}
	}

	startP = (new Date())
	graphicsCounts.renderTime += startP - start
	for(var i=0; i<this.particleCount;i++) {
		p = this.particles[i]
		if (p.x < camera.x - padding || p.y < camera.y - padding
			|| p.x > camera.x + camera.width + padding
			|| p.y > camera.y + camera.height + padding) {
				graphicsCounts.particleSkips += 1
				continue
		}
		graphicsCounts.particles += 1
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


function pellet(x,y,style) {
	this.style = style
	this.x = x
	this.y = y
	this.id = ""+x+","+y
	mytile = currentRoom.findTile(x,y)
	if (!mytile.contains(x,y)) {
		console.log("WTF", this.id,mytile)
	}
	mytile.add(this)
	this._radius = 1.9
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
	if (this.style==0) {
		gfx.renderMineral(ctx, this.x, this.y, this.color, this._radius)
	} else {
		gfx.renderVitamin(ctx, this.x, this.y, this.color, this._radius)
	}
}
pellet.prototype.remove = function() {
	for(var i=0;i<4;i+=1) {
		currentRoom.addParticle(this.x,this.y,p.color)
	}
	myTile = currentRoom.findTile(this.x,this.y)
	if (!myTile) {
		console.log(myTile)
	}
	myTile.remove(this)
}
pellet.prototype.bbox = function() {
	r = this._radius
	return [this.x-r, this.y-r, this.x+r, this.y+r]
}

actors = {}
renderable = {}
activeRenders = {}

function actor(id, owner, x, y) {
	this.id = id
	this.x = x
	this.y = y
	this.direction = 0
	this.speed = 0

	this.xs = x
	this.ys = y

	this.mass = room.startmass
	this.mergeTimer = (new Date())
	this.mergeTimer.setSeconds(this.mergeTimer.getSeconds()+room.mergetime)
	renderable[this.id] = this
	actors[this.id] = this
	this.owner = owner
	currentRoom.players[this.owner].owns[this.id] = this
	this.lastupdate = (new Date())
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
	onCanvasX = (this.x - camera.x)*camera.xscale
	onCanvasY = (this.y - camera.y)*camera.yscale
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
	this.x = (this.xs+this.x)/2
	this.y = (this.ys+this.y)/2
	this.color = this.owner==myplayer.id ? "#33FF33" : "#FF3333";
	n = currentRoom.players[this.owner].name
	n = n ? n : "Microbe"
	gfx.renderPlayer(ctx,this.x,this.y,this.color,n, Math.floor(this.mass),radius)
}
actor.prototype.clientStep = function(seconds) {
	onCanvasX = (this.x - camera.x)*camera.xscale
	onCanvasY = (this.y - camera.y)*camera.yscale

	mdx = mousex - onCanvasX
	mdy = mousey - onCanvasY

	this.direction = Math.atan2(mdy,mdx)
	this.speed = Math.sqrt(mdx*mdx+mdy*mdy) / 40
	if (this.speed<.2) this.speed=0
	if (this.speed>1) this.speed=1

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

	now = (new Date())
	if (now-this.lastupdate>50) {
		writeMove(this.id,this.direction,this.speed)
	}

}
actor.prototype.step = function(seconds) {
	room = currentRoom
	if (this.owner==myplayer.id) {
		this.clientStep(seconds)
	}

	allowed = 100 / (Math.pow(.46*this.mass, .2))
	distance = allowed * seconds * this.speed
	mdx = Math.cos(this.direction) * distance
	mdy = Math.sin(this.direction) * distance
	particleChance = 1-1/((10 * seconds)*this.speed*this.radius())
	if (Math.random()<particleChance) {
		a = this.direction + Math.random()*Math.PI-Math.PI/2
		dx = Math.cos(a)*this.radius()
		dy = Math.sin(a)*this.radius()
		p = room.addParticle(this.x-dx,this.y-dy,this.color)
		p.xspeed = -mdx
		p.yspeed = -mdy
	}


	this.x += mdx
	this.y += mdy

	this.x = median(this.x, 0, room.width);
	this.y = median(this.y, 0, room.height);
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