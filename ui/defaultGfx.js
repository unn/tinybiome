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

var texture = PIXI.Texture.fromImage("imgs/cells.jpg");

var mPlier = 4

var tileSize = 100;

var pix = {
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
		pix.renderer = PIXI.autoDetectRenderer(canvas.width, canvas.height, {view:canvas})
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

gfx.done = function(ctx) {
	// console.log("DONE")
	ctx.renderer.render(ctx.top)
}



var countCreateRenderBackground = 0
gfx.createRenderBackground = function(pix) {
	if (!renderRenderBackground) return noop
	var g = new PIXI.Graphics();
	pix.stage.addChild(g)
	return {
		show: function(){},
		hide: function(){},
		free: function(){},
		update:function(x,y,w,h) {
			g.clear();
			g.beginFill(0xFFFFFF,1)
			g.drawRect(x,y,w,h)
			g.endFill()
		}}
}

var countCreateGroup = 0
gfx.createGroup = function(pix) { // (ctx, bbox, n, mass, myActors)
	if (!renderGroup) return noop
	var last;
	return {
		hide: function() {
		},
		show: function() {

		},
		update:function(bbox,n,mass,myActors){
			if (last) {
				pix.stage.removeChild(last)
				last.destroy()
			}
			last = new PIXI.Container()

			var text = new PIXI.Text(n,{
				font: '48px Arial', 
				stroke: "black", 
				fill: "white", 
				strokeThickness: 1});

			last.addChild(text)
			last.position.x = bbox[0]
			last.position.y = bbox[1]

			text.anchor.x = .5;
			text.scale.x = .5;
			text.scale.y = .5;
			text.position.x = (bbox[2]-bbox[0])/2
			text.position.y = bbox[3]-bbox[1]
			pix.stage.addChild(last) 
		},
		free:function(){
			pix.stage.removeChild(last)
			last.destroy()
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
				last.destroy()
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
			pix.stage.addChild(last)
		},
		free:function(){
			pix.stage.removeChild(last)
			last.destroy()
		}}
}


var countCreateRenderTile = 0
gfx.createRenderTile = function(pix) {
	if (!renderRenderTile) return noop
	var container = new PIXI.Container();
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
			}
			visible = true
		},
		container: container,
		update:function(){

		},
		free:function(){
			if (visible) pix.stage.removeChild(container)
			container.destroy()
			countCreateRenderTile -= 1
		}
	}
}

gfx.renderArea = function() {}
gfx.renderBackground = function() {}

var countCreateParticle = 0
gfx.createParticle = function(pix) { // (this.x, this.y, this.life, this.color)
	if (!renderParticle) return noop
	var bunny = genericCircle();
	var visible = false;
	var destroyed = false;
	countCreateParticle += 1
	return {
		hide: function() {
			if (visible){
				pix.stage.removeChild(bunny)
			}
			visible = false
		},
		show: function() {
			if (!visible){
				pix.stage.addChild(bunny);
			}
			visible = true
		},
		update: function(x,y,life,c) {
			var r = life / 50
			bunny.scale.x = r
			bunny.scale.y = r
			bunny.position.x = x
			bunny.position.y = y
			bunny.tint = c
		},
		free: function() {
			if (visible)
				pix.stage.removeChild(bunny)

			destroyed = true
			bunny.destroy()
			countCreateParticle -= 1
		}
	}
	return noop
}


var countCreateVitamin = 0
gfx.createVitamin = function(pix) { // (this.x, this.y, this.color, this._radius)
	if (!renderVitamin) return noop
	var rendered = false;
	var bunny = genericCircle()
	var visible = false;
	countCreateVitamin += 1
	return {
		hide: function() {
			if (visible)
				pix.stage.removeChild(bunny)
			visible = false
		},
		show: function() {
			if (!visible)
				pix.stage.addChild(bunny);
			visible = true
		},
		update: function(x,y,c,r) {
			bunny.tint = c
			bunny.scale.x = r
			bunny.scale.y = r
			bunny.position.x = x
			bunny.position.y = y
		},
		free: function() {
			if (visible)
				pix.stage.removeChild(bunny)
			bunny.destroy()
			countCreateVitamin -= 1
		}
	}
}

var countCreateMineral = 0
gfx.createMineral = function(pix) { // (this.x, this.y, this.color, this._radius)
	if (!renderMineral) return noop
	var bunny = genericCircle()
	var visible = false;
	countCreateMineral += 1
	return {
		hide: function() {
			if (visible)
				pix.stage.removeChild(bunny)
			visible = false
		},
		show: function() {
			if (!visible)
				pix.stage.addChild(bunny);
			visible = true
		},
		update: function(x,y,c,r) {
			bunny.tint = c
			bunny.scale.x = r
			bunny.scale.y = r
			bunny.position.x = x
			bunny.position.y = y
		},
		free: function() {
			if (visible)
				pix.stage.removeChild(bunny)
			bunny.destroy()
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
	var bunny = genericCell(genericCircle());
	var visible = false;
	countCreatePlayerActor += 1
	return {
		hide: function() {
			if (visible) {
				pix.stage.removeChild(bunny.container)
			}
			visible = false
		},
		show: function() {
			if (!visible) {
				pix.stage.addChild(bunny.container)
			}
			visible = true
		},
		update: function(x,y,c,mass, r) {
			bunny.front.scale.x = r
			bunny.front.scale.y = r
			// bunny.front.tint = c
			bunny.container.position.x = x
			bunny.container.position.y = y

			bunny.container.rotation = (x+y)/200
			bunny.back.tint = c
		},
		free: function() {
			if (visible) {
				pix.stage.removeChild(bunny.container)
			}
			bunny.container.destroy()
			countCreatePlayerActor -= 1
		}
	}
	return noop
}

var countCreateVirus = 0
gfx.createVirus = function(pix) { // (this.actor.x, this.actor.y, this.actor.color, this.actor.mass, this.actor.radius())
	if (!renderVirus) return noop
	var bunny = genericCell(virusBall());
	var visible = false;
	countCreateVirus += 1
	return {
		hide: function() {
			if (visible) {
				pix.stage.removeChild(bunny.container)
			}
			visible = false
		},
		show: function() {
			if (!visible) {
				pix.stage.addChild(bunny.container)
			}
			visible = true
		},
		update: function(x,y,c,mass, r) {
			bunny.front.scale.x = r
			bunny.front.scale.y = r
			// bunny.front.tint = c
			bunny.container.position.x = x
			bunny.container.position.y = y

			bunny.container.rotation = (x+y)/200
			bunny.back.tint = c
		},
		free: function() {
			if (visible) {
				pix.stage.removeChild(bunny.container)
			}
			bunny.container.destroy()
			countCreateVirus -= 1
		}
	}
	return noop
}

var countCreateBacteria = 0
gfx.createBacteria = function(pix) { // (this.actor.x, this.actor.y, this.actor.color, this.actor.mass, this.actor.radius())
	if (!renderBacteria) return noop
	var bunny = genericCell(bubbleCircle());
	var visible = false;
	countCreateBacteria += 1
	return {
		hide: function() {
			if (visible) {
				pix.stage.removeChild(bunny.container)
			}
			visible = false
		},
		show: function() {
			if (!visible) {
				pix.stage.addChild(bunny.container)
			}
			visible = true
		},
		update: function(x,y,c,mass, r) {
			bunny.front.scale.x = r
			bunny.front.scale.y = r
			// bunny.front.tint = c
			bunny.container.position.x = x
			bunny.container.position.y = y

			bunny.container.rotation = (x+y)/200
			bunny.back.tint = c
		},
		free: function() {
			if (visible) {
				pix.stage.removeChild(bunny.container)
			}
			bunny.container.destroy()
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
			var xn = Math.cos(i*a-a/2)*.4
			var yn = Math.sin(i*a-a/2)*.4
			playerMask.quadraticCurveTo(xn,yn,x,y)
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
	tilingSprite = new PIXI.extras.TilingSprite(texture, size, size);

	tilingSprite.scale.x = .3
	tilingSprite.scale.y = .3
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