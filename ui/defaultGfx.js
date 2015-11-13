"use strict"

var cellImg = new Image();
cellImg.onload = function() {
	cellImg.loaded = true
	cellImgWidth = cellImg.width / mPlier
	cellImgHeight = cellImg.height / mPlier
}
cellImg.loaded = false;
cellImg.pattern = false;
// cellImg.src = 'imgs/cells.jpg';

var bgTex = PIXI.Texture.fromImage("imgs/bg.jpg");
var cellTex = PIXI.Texture.fromImage("imgs/cells.jpg");

var mPlier = 4

var tileSize = 100;

var pix = {
	dirty: true,
	top: new PIXI.Container(),
	stage: new PIXI.Container(),
	scale: new PIXI.Container()
}
pix.scale.addChild(pix.stage)
pix.top.addChild(pix.scale)

var renderRenderBackground = true;
var renderActor = true;

var renderLeaderBoard = true;
var renderGroup = true;
var renderParticle = true;
var renderRenderTile = true;
var renderVitamin = true;
var renderMineral = true;
var renderPlayerActor = true;
var renderVirus = true;
var renderBacteria = true;

var noop = {update:function(){},free:function(){},hide:function(){},show:function(){}};

gfx.getContext = function(canvas) {
	if (!pix.renderer) {
		pix.renderer = PIXI.autoDetectRenderer(canvas.width, canvas.height, {view:canvas,antialias:true})
	} else {
		pix.renderer.resize(canvas.width, canvas.height);
	}
	return pix
}

gfx.position = function(ctx, x, y, xscale, yscale) {
	// x -= 50
	// y -= 50
	ctx.scale.scale.x = xscale
	ctx.scale.scale.y = yscale
	ctx.stage.position.x = x
	ctx.stage.position.y = y
	// ctx.save()
	// ctx.scale(camera.xscale,camera.yscale)
	// ctx.translate(x, y)
}

function depthCompare(a,b) {
    if (!a.z) {
    	console.log("DOESNT HAVE Z", a)
    	throw "DOESNT HAVE Z"
    }
    if (!b.z) {
    	console.log("DOESNT HAVE Z", b)
    	throw "DOESNT HAVE Z"
    }
	if (a.z < b.z)
		return -1;
	if (a.z > b.z)
		return 1;
	return 0;
}


gfx.done = function(ctx) {
	// console.log("DONE")
	if (pix.dirty) {
		ctx.stage.children.sort(depthCompare);
		pix.dirty = false
	}

	ctx.renderer.render(ctx.top)
}



var countCreateRenderBackground = 0
gfx.createRenderBackground = function(pix) {
	if (!renderRenderBackground) return noop
	var g = new PIXI.Graphics();
	g.beginFill(0xFFFFFF,1)
	g.drawRect(0,0,1,1)
	g.endFill()

	var size = 50000
	var tilingSprite = new PIXI.extras.TilingSprite(bgTex, size, size);

	tilingSprite.scale.x = 1
	tilingSprite.scale.y = 1

	tilingSprite.mask = g;
	tilingSprite.z = -10;
	pix.stage.addChild(tilingSprite)
	pix.dirty = true


	g.z = -10
	pix.stage.addChild(g)
	pix.dirty = true
	return {
		show: function(){},
		hide: function(){},
		free: function(){},
		update:function(x,y,w,h) {
			g.position.x = x
			g.position.y = y
			g.scale.x = w
			g.scale.y = h
		}}
}

var countCreateGroup = 0
gfx.createGroup = function(pix) { // (ctx, bbox, n, mass, myActors)
	if (!renderGroup) return noop
	var last;
	var text;
	return {
		hide: function() {
		},
		show: function() {

		},
		update:function(bbox,n,mass,myActors){
			if (last) {
				pix.stage.removeChild(last)
				last.destroy(true)
			}
			last = new PIXI.Container()

			text = new PIXI.Text(n,{
				font: '48px Arial', 
				stroke: "black", 
				fill: "white", 
				strokeThickness: 2});

			last.addChild(text)
			last.position.x = bbox[0]
			last.position.y = bbox[1]

			text.anchor.x = .5;
			text.scale.x = .5;
			text.scale.y = .5;
			text.position.x = (bbox[2]-bbox[0])/2
			text.position.y = bbox[3]-bbox[1]
			last.z = 10
			pix.stage.addChild(last) 
			pix.dirty = true
		},
		free:function(){
			pix.stage.removeChild(last)
			last.destroy(true)
		}}
}

var frame = 0
var countCreateLeaderBoard = 0
gfx.createLeaderBoard = function(pix) { // (ctx, bbox, n, mass, myActors)
	if (!renderLeaderBoard) return noop
	var last;
	return {
		hide: function() {

		},
		show: function() {

		},
		update:function(leaders,x, y, width, height, connected){
			if (last) {
				pix.stage.removeChild(last)
				last.destroy(true)
			}
			last = new PIXI.Container()

			frame += 1;
			if (frame>1000) {
				frame = 0
			}

			var total = leaders.length
			if (leaders.length <= 0) {
				return
			}
			if (leaders.length > 8) {
				leaders.length = 8
			}

			var l = connected+" players connected, "+total+" playing. FPS: "+fps+", QUALITY: "+renderQuality+", PING: "+Math.floor(currentSock.latency*10)/10+"ms"

			var nPxHeight = 14;
			var text = new PIXI.Text(l,{
				font: nPxHeight+'px Arial', 
				stroke: "black", 
				fill: "white", 
				strokeThickness: 1});
			text.anchor.x = 1;
			text.position.x = width
			text.position.y = 0
			last.addChild(text)

			var pxHeight = 20

			ctx.lineWidth = .7;
			l = "Top "+leaders.length+":"
			var text = new PIXI.Text(l,{
				font: pxHeight+'px Arial', 
				stroke: "black", 
				fill: "white", 
				strokeThickness: 1});
			text.anchor.x = 1;
			text.position.x = width
			text.position.y = nPxHeight
			last.addChild(text)

			for(var i=0; i<leaders.length; i+=1) {
				var n = leaders[i][0]
				var text = new PIXI.Text(n,{
					font: pxHeight+'px Arial', 
					stroke: "black", 
					fill: "white", 
					strokeThickness: 1});
				text.anchor.x = 1;
				text.position.x = width - 200
				text.position.y = i*pxHeight+nPxHeight+pxHeight
				last.addChild(text)

				var m = leaders[i][1]
				var text = new PIXI.Text(m,{
					font: pxHeight+'px Arial', 
					stroke: "black", 
					fill: "white", 
					strokeThickness: 1});
				text.anchor.x = 1;
				text.position.x = width
				text.position.y = i*pxHeight+nPxHeight+pxHeight
				last.addChild(text)
			}

			last.position.x = x
			last.position.y = 0
			last.z = 20
			pix.stage.addChild(last)
			pix.dirty = true
		},
		free:function(){
			pix.stage.removeChild(last)
			last.destroy(true)
		}}
}


var countCreateRenderTile = 0
gfx.createRenderTile = function(pix) {
	if (!renderRenderTile) return noop
	var container = new PIXI.Container();
	container.z = -9
	var visible = false;
	countCreateRenderTile += 1
	return {
		hide: function() {
			if (visible) {
				pix.stage.removeChild(container)
			}
			visible = false
		},
		show: function() {
			if (!visible) {
				pix.stage.addChild(container);
				pix.dirty = true
			}
			visible = true
		},
		container: container,
		update:function(){

		},
		free:function(){
			if (visible) pix.stage.removeChild(container)
			container.destroy(true)
			countCreateRenderTile -= 1
		}
	}
}

gfx.renderArea = function() {}
gfx.renderBackground = function() {}

var countCreateParticle = 0
gfx.createParticle = function(pix) { // (this.x, this.y, this.life, this.color)
	if (!renderParticle) return noop
	var model = genericCircle();
	var visible = false;
	var destroyed = false;
	model.z = 9
	countCreateParticle += 1
	return {
		hide: function() {
			if (visible){
				pix.stage.removeChild(model)
			}
			visible = false
		},
		show: function() {
			if (!visible){
				pix.stage.addChild(model);
				pix.dirty = true
			}
			visible = true
		},
		update: function(x,y,life,c) {
			var r = life / 50
			model.scale.x = r
			model.scale.y = r
			model.position.x = x
			model.position.y = y
			model.tint = c
			model.alpha = .4
		},
		free: function() {
			if (visible)
				pix.stage.removeChild(model)

			destroyed = true
			model.destroy(true)
			countCreateParticle -= 1
		}
	}
	return noop
}


var countCreateVitamin = 0
gfx.createVitamin = function(pix) { // (this.x, this.y, this.color, this._radius)
	if (!renderVitamin) return noop
	var rendered = false;
	var model = genericCircle()
	var visible = false;
	countCreateVitamin += 1
	return {
		hide: function() {
			if (visible)
				pix.stage.removeChild(model)
			visible = false
		},
		show: function() {
			if (!visible)
				pix.stage.addChild(model);
			pix.dirty = true
			visible = true
		},
		update: function(x,y,c,r) {
			model.tint = c
			model.scale.x = r
			model.scale.y = r
			model.position.x = x
			model.position.y = y
		},
		free: function() {
			if (visible)
				pix.stage.removeChild(model)
			model.destroy(true)
			countCreateVitamin -= 1
		}
	}
}

var countCreateMineral = 0
gfx.createMineral = function(pix) { // (this.x, this.y, this.color, this._radius)
	if (!renderMineral) return noop
	var model = genericCircle()
	var visible = false;
	countCreateMineral += 1
	return {
		hide: function() {
			if (visible)
				pix.stage.removeChild(model)
			visible = false
		},
		show: function() {
			if (!visible)
				pix.stage.addChild(model);
			pix.dirty = true
			visible = true
		},
		update: function(x,y,c,r) {
			model.tint = c
			model.scale.x = r
			model.scale.y = r
			model.position.x = x
			model.position.y = y
		},
		free: function() {
			if (visible)
				pix.stage.removeChild(model)
			model.destroy(true)
			countCreateMineral -= 1
		}
	}
	return noop
}

var countCreateActor = 0
gfx.createActor = function(pix) { // (this.x,this.y,this.color,n, Math.floor(this.mass),radius)
	if (!renderActor) return noop
	return noop
}

var countCreatePlayerActor = 0
gfx.createPlayerActor = function(pix) { // (this.actor.x,this.actor.y,this.actor.color, Math.floor(this.actor.mass),radius)
	if (!renderPlayerActor) return noop
	var model = genericCell(genericHDCircle());
	model.container.z = 8
	var visible = false;
	countCreatePlayerActor += 1
	return {
		hide: function() {
			if (visible) {
				pix.stage.removeChild(model.container)
			}
			visible = false
		},
		show: function() {
			if (!visible) {
				pix.stage.addChild(model.container)
				pix.dirty = true
			}
			visible = true
		},
		update: function(x,y,c,mass, r) {
			model.front.scale.x = r
			model.front.scale.y = r
			// model.front.tint = c
			model.container.position.x = x
			model.container.position.y = y

			model.container.rotation = (x+y)/200
			model.back.tint = c
		},
		free: function() {
			if (visible) {
				pix.stage.removeChild(model.container)
			}
			model.container.destroy(true)
			countCreatePlayerActor -= 1
		}
	}
	return noop
}

var countCreateVirus = 0
gfx.createVirus = function(pix) { // (this.actor.x, this.actor.y, this.actor.color, this.actor.mass, this.actor.radius())
	if (!renderVirus) return noop
	var model = genericCell(virusBall());
	model.container.z = -5
	var visible = false;
	countCreateVirus += 1
	return {
		hide: function() {
			if (visible) {
				pix.stage.removeChild(model.container)
			}
			visible = false
		},
		show: function() {
			if (!visible) {
				pix.stage.addChild(model.container)
				pix.dirty = true
			}
			visible = true
		},
		update: function(x,y,c,mass, r) {
			model.front.scale.x = r
			model.front.scale.y = r
			// model.front.tint = c
			model.container.position.x = x
			model.container.position.y = y

			model.container.rotation = (x+y)/200
			model.back.tint = c
		},
		free: function() {
			if (visible) {
				pix.stage.removeChild(model.container)
			}
			model.container.destroy(true)
			countCreateVirus -= 1
		}
	}
	return noop
}

gfx.createBlob = function(pix) { // (this.actor.x, this.actor.y, this.actor.color, this.actor.mass, this.actor.radius())
	if (!renderVirus) return noop
	var model = bubbleCircle();
	model.z = -5
	var visible = false;
	return {
		hide: function() {
			if (visible) {
				pix.stage.removeChild(model)
			}
			visible = false
		},
		show: function() {
			if (!visible) {
				pix.stage.addChild(model)
				pix.dirty = true
			}
			visible = true
		},
		update: function(x,y,c) {
			model.scale.x = 7
			model.scale.y = 7
			// model.front.tint = c
			model.position.x = x
			model.position.y = y

			model.rotation = (x+y)/200
			model.tint = c
		},
		free: function() {
			if (visible) {
				pix.stage.removeChild(model)
			}
			model.destroy(true)
		}
	}
	return noop
}

var countCreateBacteria = 0
gfx.createBacteria = function(pix) { // (this.actor.x, this.actor.y, this.actor.color, this.actor.mass, this.actor.radius())
	if (!renderBacteria) return noop
	var model = genericCell(bubbleCircle());
	var visible = false;
	countCreateBacteria += 1
	model.container.z = -4
	return {
		hide: function() {
			if (visible) {
				pix.stage.removeChild(model.container)
			}
			visible = false
		},
		show: function() {
			if (!visible) {
				pix.stage.addChild(model.container)
				pix.dirty = true
			}
			visible = true
		},
		update: function(x,y,c,mass, r) {
			model.front.scale.x = r
			model.front.scale.y = r
			// model.front.tint = c
			model.container.position.x = x
			model.container.position.y = y

			model.container.rotation = (x+y)/200
			model.back.tint = c
		},
		free: function() {
			if (visible) {
				pix.stage.removeChild(model.container)
			}
			model.container.destroy(true)
			countCreateBacteria -= 1
		}
	}
}

var genericCircle = (function() {
	var playerMask = new PIXI.Graphics()
	playerMask.beginFill(0xFFFFFF,1);
	// playerMask.arc(0,0,1,0,Math.PI*2)

	var parts = 12
	var a = Math.PI*2/parts
	for(var i=0;i<=parts;i++) {
		var x = Math.cos(i*a)
		var y = Math.sin(i*a)
		if (i==0) {
			playerMask.moveTo(x,y)
		} else {
			playerMask.lineTo(x,y)
		}
	}

	playerMask.endFill();	
	return function() {
		return playerMask.clone()
	}
})()

var genericHDCircle = (function() {
	var playerMask = new PIXI.Graphics()
	playerMask.beginFill(0xFFFFFF,1);
	// playerMask.arc(0,0,1,0,Math.PI*2)

	var parts = 36
	var a = Math.PI*2/parts
	for(var i=0;i<=parts;i++) {
		var x = Math.cos(i*a)
		var y = Math.sin(i*a)
		if (i==0) {
			playerMask.moveTo(x,y)
		} else {
			playerMask.lineTo(x,y)
		}
	}

	playerMask.endFill();	
	return function() {
		return playerMask.clone()
	}
})()

var bubbleCircle = (function() {
	var playerMask = new PIXI.Graphics()
	playerMask.beginFill(0xFFFFFF,1);
	var parts = 10
	var a = Math.PI*2/parts
	for(var i=0;i<=parts;i++) {
		var x = Math.cos(i*a)*.7
		var y = Math.sin(i*a)*.7
		if (i==0) {
			playerMask.moveTo(x,y)
		} else {
			var xn = Math.cos(i*a-a/2)
			var yn = Math.sin(i*a-a/2)
			playerMask.quadraticCurveTo(xn,yn,x,y)
		}
	}
	playerMask.endFill();	
	return function() {
		return playerMask.clone()
	}
})()

var virusBall = (function() {
	var playerMask = new PIXI.Graphics()
	playerMask.beginFill(0xFFFFFF,1);
	var parts = 10
	var a = Math.PI*2/parts
	for(var i=0;i<=parts;i++) {
		var x = Math.cos(i*a)
		var y = Math.sin(i*a)
		if (i==0) {
			playerMask.moveTo(x,y)
		} else {

			var xa = Math.cos(i*a-a/4*3)*.3
			var ya = Math.sin(i*a-a/4*3)*.3
			var xb = Math.cos(i*a-a/2)*.7
			var yb = Math.sin(i*a-a/2)*.7
			var xc = Math.cos(i*a-a/4)*.3
			var yc = Math.sin(i*a-a/4)*.3
			playerMask.quadraticCurveTo(xa,ya,xb,yb)
			playerMask.quadraticCurveTo(xc,yc,x,y)
		}
	}
	playerMask.endFill();	
	return function() {
		return playerMask.clone()
	}
})()


function genericCell(playerMask) {
	var tilingSprite;

	var c = new PIXI.Container()

	var size = 50000
	tilingSprite = new PIXI.extras.TilingSprite(cellTex, size, size);

	tilingSprite.scale.x = .3
	tilingSprite.scale.y = .3
	tilingSprite.alpha = .8
	tilingSprite.position.x = -size/2*tilingSprite.scale.x
	tilingSprite.position.y = -size/2*tilingSprite.scale.y

	tilingSprite.mask = playerMask;
	c.addChild(tilingSprite);
	c.addChild(playerMask);
	
	return {
		container: c,
		back: tilingSprite,
		front: playerMask,
	}
}

function fromRgb(r,g,b) {
	var c = Math.floor(r)*256*256+Math.floor(g)*256+Math.floor(b)
	return c
}