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
var size = 1024
var colorsTex = PIXI.Texture.fromImage("imgs/colors.png");
colorsTex.baseTexture.width = 256
colorsTex.baseTexture.height = 256

var redTex = new PIXI.Texture(colorsTex);

redTex.frame = new PIXI.Rectangle(16*12,16*1,16,16)
// var blueTex = PIXI.Texture.fromImage("imgs/colors.png");
// blueTex.frame = new PIXI.Rectangle(10*11,10*0,10,10)

var blueTex = new PIXI.Texture(colorsTex);
blueTex.frame = new PIXI.Rectangle(16*11,16*0,16,16)

var redModel = function() {
	var m = new PIXI.Sprite(redTex)
	m.anchor.x = .5
	m.anchor.y = .5
	return m
}
var blueModel = function() {
	var m = new PIXI.Sprite(blueTex)
	m.anchor.x = .5
	m.anchor.y = .5
	return m
}

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

function anyLeaks() {
	var d = {}
	d["countCreateRenderBackground"] =countCreateRenderBackground
	d["countCreateGroup"] =countCreateGroup
	d["countCreateLeaderBoard"] =countCreateLeaderBoard
	d["countCreateRenderTile"] =countCreateRenderTile
	d["countCreateParticle"] =countCreateParticle
	d["countCreateVitamin"] =countCreateVitamin
	d["countCreateMineral"] =countCreateMineral
	d["countCreateActor"] =countCreateActor
	d["countCreatePlayerActor"] =countCreatePlayerActor
	d["countCreateVirus"] =countCreateVirus
	d["countCreateBacteria"] =countCreateBacteria
	d["countCreateBlob"] =countCreateBlob
	return d
}

var font = "Verdana, Geneva, sans-serif";

var noop = {update:function(){},free:function(){},hide:function(){},show:function(){}};

gfx.start = function() {
	console.log("STARTING")
}
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

	g.z = -10
	pix.stage.addChild(g)
	pix.dirty = true
	countCreateRenderBackground += 1
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
	var last = new PIXI.Container();
	last.z = 10

	var text = new PIXI.Text("",{
		font: '48px '+font, 
		stroke: "black", 
		fill: "white", 
		strokeThickness: 2});

	text.anchor.x = .5;
	text.anchor.y = .5;
	text.scale.x = .5;
	text.scale.y = .5;
	last.addChild(text)
	pix.stage.addChild(last)
	pix.dirty = true
	countCreateGroup += 1
	return {
		hide: function() {
			last.visible = false
		},
		show: function() {
			last.visible = true;
		},
		update:function(bbox,n,mass,myActors){
			last.position.x = bbox[0]
			last.position.y = bbox[1]

			text.text = n
			text.position.x = (bbox[2]-bbox[0])/2
			text.position.y = (bbox[3]-bbox[1])/2
		},
		free:function(){
			pix.stage.removeChild(last)
			last.destroy(false)
		}
	}
}

var frame = 0
var countCreateLeaderBoard = 0
gfx.createLeaderBoard = function(pix) { // (ctx, bbox, n, mass, myActors)
	if (!renderLeaderBoard) return noop
	var last = new PIXI.Container()
	var maxLeaders = 8;

	var nPxHeight = 14;
	var debugText = new PIXI.Text("NYFO",{
		font: nPxHeight+'px '+font, 
		stroke: "black", 
		fill: "white", 
		strokeThickness: 1});
	debugText.anchor.x = 1;
	debugText.position.x = 0
	debugText.position.y = 0
	last.addChild(debugText)

	var pxHeight = 24

	ctx.lineWidth = .7;
	var headerText = new PIXI.Text("NYFO",{
		font: pxHeight+'px '+font, 
		stroke: "black", 
		fill: "white", 
		strokeThickness: 1});
	headerText.anchor.x = 1;
	headerText.position.x = 0
	headerText.position.y = nPxHeight
	last.addChild(headerText)

	var leaderTexts = []
	var massTexts = []
	for(var i=0; i<maxLeaders; i+=1) {
		var nameText = new PIXI.Text("NYFO",{
			font: pxHeight+'px '+font, 
			stroke: "black", 
			fill: "white", 
			strokeThickness: 1});
		nameText.anchor.x = 1;
		nameText.position.x = 0 - 200
		nameText.position.y = i*pxHeight+nPxHeight+pxHeight
		nameText.visible = false
		last.addChild(nameText)
		leaderTexts.push(nameText)

		var massText = new PIXI.Text("NYFO",{
			font: pxHeight+'px '+font, 
			stroke: "black", 
			fill: "white", 
			strokeThickness: 1});
		massText.anchor.x = 1;
		massText.position.x = 0
		massText.position.y = i*pxHeight+nPxHeight+pxHeight
		massText.visible = false
		last.addChild(massText)
		massTexts.push(massText)
	}


	last.z = 20
	pix.stage.addChild(last)

	countCreateLeaderBoard += 1
	return {
		hide: function() {

		},
		show: function() {

		},
		update:function(leaders,x, y, width, height, connected){
			for(var i=0; i<maxLeaders; i+=1) {
				massTexts[i].visible = false
				leaderTexts[i].visible = false
			}

			var total = leaders.length
			if (leaders.length <= 0) {
				return
			}
			if (leaders.length > maxLeaders) {
				leaders.length = maxLeaders
			}

			var l = connected+" players connected, "+total+" playing. FPS: "+fps+", QUALITY: "+renderQuality+", PING: "+Math.floor(currentRoom.server.latency*10)/10+"ms"
			debugText.text = l
			debugText.x = width

			l = "Top "+leaders.length+":"
			headerText.text = l
			headerText.position.x = width

			for(var i=0; i<leaders.length; i+=1) {
				var n = leaders[i][0]
				leaderTexts[i].text = n
				leaderTexts[i].position.x = width - 200
				leaderTexts[i].visible = true

				var m = leaders[i][1]
				massTexts[i].text = m
				massTexts[i].position.x = width
				massTexts[i].visible = true
			}

			last.position.x = x
			last.position.y = 0
		},
		free:function(){
			pix.stage.removeChild(last)
			last.destroy(true)
			countCreateLeaderBoard -= 1
		}}
}


var countCreateRenderTile = 0
var renderTileProps = {
	scale: false,
	position: false,
	rotation: false,
	uvs: false,
	alpha: false
}

gfx.createRenderTile = function(pix) {
	if (!renderRenderTile) return noop
	var container = new PIXI.ParticleContainer(1000,renderTileProps);
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
		addChild: function(pell) {
			container.addChild(pell)
		},
		removeChild: function(pell) {
			container.removeChild(pell)
		},
		update:function(){

		},
		free:function(){
			if (visible) pix.stage.removeChild(container)
			countCreateRenderTile -= 1
		}
	}
}



var countCreateVitamin = 0
gfx.createVitamin = function(pix) { // (this.x, this.y, this.color, this._radius)
	if (!renderVitamin) return noop
	var rendered = false;
	var model = redModel()
	var visible = false;
	countCreateVitamin += 1
	return {
		attach: function(o) {
			o.addChild(model)
		},
		detach: function(o) {
			o.removeChild(model)
		},
		update: function(x,y,c,r) {
			model.scale.x = r/16
			model.scale.y = r/16
			model.position.x = x
			model.position.y = y
			model.rotation = Math.random()*Math.PI
		},
		free: function() {
			model.destroy()
			countCreateVitamin -= 1
		}
	}
}

var countCreateMineral = 0
gfx.createMineral = function(pix) { // (this.x, this.y, this.color, this._radius)
	if (!renderMineral) return noop
	
	var model = blueModel()
	var visible = false;
	countCreateMineral += 1
	return {
		attach: function(o) {
			o.addChild(model)
		},
		detach: function(o) {
			o.removeChild(model)
		},
		update: function(x,y,c,r) {
			model.scale.x = r/16
			model.scale.y = r/16
			model.position.x = x
			model.position.y = y
			model.rotation = Math.random()*Math.PI
		},
		free: function() {
			if (visible)
				pix.stage.removeChild(model)
			// throw "Destroying"
			model.destroy()
			countCreateMineral -= 1
		}
	}
	return noop
}












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
			model.container.z = 8 + mass / 100000
			var scale = r/512+.1
			model.back.scale.x = scale
			model.back.scale.y = scale
			model.back.position.x = -size/2*scale
			model.back.position.y = -size/2*scale
		},
		free: function() {
			if (visible) {
				pix.stage.removeChild(model.container)
			}
			model.container.destroy(false)
			model.front.destroy(false)
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
			var scale = r/512+.1
			model.back.scale.x = scale
			model.back.scale.y = scale
			model.back.position.x = -size/2*scale
			model.back.position.y = -size/2*scale
		},
		free: function() {
			if (visible) {
				pix.stage.removeChild(model.container)
			}
			model.container.destroy(false)
			model.front.destroy(false)
			countCreateVirus -= 1
		}
	}
	return noop
}

var countCreateBlob = 0;
gfx.createBlob = function(pix) { // (this.actor.x, this.actor.y, this.actor.color, this.actor.mass, this.actor.radius())
	if (!renderVirus) return noop
	var model = bubbleCircle();
	model.z = -5
	var visible = false;
	countCreateBlob += 1

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
			var scale = 7/512+.1
			model.back.scale.x = scale
			model.back.scale.y = scale
			model.back.position.x = -size/2*scale
			model.back.position.y = -size/2*scale
		},
		free: function() {
			if (visible) {
				pix.stage.removeChild(model)
			}
			model.destroy(true)
			countCreateBlob -= 1
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
			var scale = r/512+.1
			model.back.scale.x = scale
			model.back.scale.y = scale
			model.back.position.x = -size/2*scale
			model.back.position.y = -size/2*scale
		},
		free: function() {
			if (visible) {
				pix.stage.removeChild(model.container)
			}
			model.container.destroy(false)
			model.front.destroy(false)
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

var texturedCells = true;
function genericCell(playerMask) {
	var tilingSprite;
	if (texturedCells) {
		var tilingSprite = new PIXI.Sprite(cellTex);
		var c = new PIXI.Container()
		tilingSprite.mask = playerMask;

		c.addChild(tilingSprite);
		c.addChild(playerMask);
		
		return {
			container: c,
			back: tilingSprite,
			front: playerMask,
		}
	} else {
		playerMask.alpha = .8
		
		return {
			container: playerMask,
			back: playerMask,
			front: playerMask,
		}
	}


}

function fromRgb(r,g,b) {
	var c = Math.floor(r)*256*256+Math.floor(g)*256+Math.floor(b)
	return c
}