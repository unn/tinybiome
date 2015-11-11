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

font = "Verdana, Geneva, sans-serif"
fontPrefix = "bold "

mPlier = 4

var tileSize = 100;

var pix = {
	top: new PIXI.Container(),
	stage: new PIXI.Container(),
	scale: new PIXI.Container()
}
pix.scale.addChild(pix.stage)
pix.top.addChild(pix.scale)

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



gfx.createRenderBackground = function(pix) {
	var g = new PIXI.Graphics();
	pix.stage.addChild(g)
	return {update:function(x,y,w,h) {
		g.clear();
		g.beginFill(0xFFFFFF,1)
		g.drawRect(x,y,w,h)
		g.endFill()
	}, free:function(){}}
}

gfx.createGroup = function(pix) { // (ctx, bbox, n, mass, myActors)
	var last;
	return {update:function(bbox,n,mass,myActors){
		// if (last) {
		// 	pix.stage.removeChild(last)
		// }
		// last = new PIXI.Container()

		// var text = new PIXI.Text(n,{
		// 	font: '24px Arial', 
		// 	stroke: "black", 
		// 	fill: "white", 
		// 	strokeThickness: 1});

		// last.addChild(text)
		// last.position.x = bbox[0]
		// last.position.y = bbox[1]

		// text.anchor.x = .5;
		// text.position.x = (bbox[2]-bbox[0])/2
		// text.position.y = bbox[3]-bbox[1]
		// pix.stage.addChild(last)

	},free:function(){
		pix.stage.removeChild(last)
	}}
}

var frame = 0
gfx.createLeaderBoard = function(pix) { // (ctx, bbox, n, mass, myActors)
	var last;
	return {update:function(leaders,x, y, width, height, connected){
		// if (last) {
		// 	pix.stage.removeChild(last)
		// }
		// last = new PIXI.Container()

		// frame += 1;
		// if (frame>1000) {
		// 	frame = 0
		// }

		// total = leaders.length
		// if (leaders.length <= 0) {
		// 	return
		// }
		// if (leaders.length > 8) {
		// 	leaders.length = 8
		// }

		// l = connected+" players connected, "+total+" playing. FPS: "+fps+", QUALITY: "+renderQuality+", PING: "+Math.floor(currentSock.latency*10)/10+"ms"

		// nPxHeight = 14;
		// var text = new PIXI.Text(l,{
		// 	font: '24px Arial', 
		// 	stroke: "black", 
		// 	fill: "white", 
		// 	strokeThickness: 1});
		// text.anchor.x = 1;
		// text.position.x = x+width
		// text.position.y = 0
		// last.addChild(text)

		// pxHeight = 20

		// ctx.lineWidth = .7;
		// l = "Top "+leaders.length+":"
		// var text = new PIXI.Text(l,{
		// 	font: '24px Arial', 
		// 	stroke: "black", 
		// 	fill: "white", 
		// 	strokeThickness: 1});
		// text.anchor.x = 1;
		// text.position.x = x+width
		// text.position.y = nPxHeight
		// last.addChild(text)

		// for(var i=0; i<leaders.length; i+=1) {
		// 	n = leaders[i][0]
		// 	var text = new PIXI.Text(n,{
		// 		font: '24px Arial', 
		// 		stroke: "black", 
		// 		fill: "white", 
		// 		strokeThickness: 1});
		// 	text.anchor.x = 1;
		// 	text.position.x = x+width - 200
		// 	text.position.y = i*pxHeight+nPxHeight+pxHeight
		// 	last.addChild(text)

		// 	m = leaders[i][1]
		// 	var text = new PIXI.Text(m,{
		// 		font: '24px Arial', 
		// 		stroke: "black", 
		// 		fill: "white", 
		// 		strokeThickness: 1});
		// 	text.anchor.x = 1;
		// 	text.position.x = x+width
		// 	text.position.y = i*pxHeight+nPxHeight+pxHeight
		// 	last.addChild(text)
		// }

		// last.position.x = width
		// last.position.y = 0
		// pix.stage.addChild(last)

	},free:function(){
		pix.stage.removeChild(last)
	}}
}


gfx.createRenderTile = function(pix) {
	var container = new PIXI.Container();
	var rendered = false;
	return {
		container: container,
		update:function(){
			if (!rendered) {
				rendered = true
				pix.stage.addChild(container);
			}
		},
		free:function(){
			if (rendered) {
				rendered = false
				pix.stage.removeChild(container);
			}	
		}
	}
}

gfx.renderArea = function() {}
gfx.renderBackground = function() {}

gfx.createParticle = function(pix) { // (this.x, this.y, this.life, this.color)
	var rendered = false;
	var bunny = genericCircle();
	return {
		update: function(x,y,life,c) {
			if (!rendered) {
				pix.stage.addChild(bunny);
				rendered = true
			}
			r = life / 50
			bunny.scale.x = r
			bunny.scale.y = r
			bunny.position.x = x
			bunny.position.y = y
			bunny.tint = c
		},
		free: function() {
			if (rendered) {
				rendered = false
				bunny.clear()
				pix.stage.removeChild(bunny)
			}
		}
	}
	return {update:function(){},free:function(){}}
}


gfx.createVitamin = function(pix) { // (this.x, this.y, this.color, this._radius)
	var rendered = false;
	var bunny = genericCircle()
	return {
		update: function(x,y,c,r) {
			if (!rendered) {
				pix.stage.addChild(bunny);
				rendered = true
			}
			bunny.tint = c
			bunny.scale.x = r
			bunny.scale.y = r
			bunny.position.x = x
			bunny.position.y = y
		},
		free: function() {
			if (rendered) {
				rendered = false
				pix.stage.removeChild(bunny)
			}
		}
	}
	return {update:function(){},free:function(){}}
}

gfx.createMineral = function(pix) { // (this.x, this.y, this.color, this._radius)
	var rendered = false;
	var bunny = genericCircle()
	return {
		update: function(x,y,c,r) {
			if (!rendered) {
				pix.stage.addChild(bunny);
				rendered = true
			}
			bunny.tint = c
			bunny.scale.x = r
			bunny.scale.y = r
			bunny.position.x = x
			bunny.position.y = y
		},
		free: function() {
			if (rendered) {
				rendered = false
				pix.stage.removeChild(bunny)
			}
		}
	}
	return {update:function(){},free:function(){}}
}

gfx.createActor = function(pix) { // (this.x,this.y,this.color,n, Math.floor(this.mass),radius)
	return {update:function(){},free:function(){}}
}

gfx.createPlayerActor = function(pix) { // (this.actor.x,this.actor.y,this.actor.color, Math.floor(this.actor.mass),radius)
	var rendered = false;
	var playerMask;
	var tilingSprite;
	return {
		update: function(x,y,c,mass,r) {
			if (!rendered) {
				tilingSprite = new PIXI.extras.TilingSprite(texture, 5000, 5000);
				playerMask = new PIXI.Graphics()
				playerMask.beginFill(fromRgb(40,250,190),1);
				playerMask.arc(0,0,1,0,Math.PI*2)
				playerMask.endFill();
				pix.stage.addChild(playerMask);

				tilingSprite.mask = playerMask;
				pix.stage.addChild(tilingSprite);
				rendered = true
			}
			playerMask.scale.x = r
			playerMask.scale.y = r
			playerMask.position.x = x
			playerMask.position.y = y
			tilingSprite.tint = c
			tilingSprite.scale.x = .3
			tilingSprite.scale.y = .3
			tilingSprite.position.x = x-2500*tilingSprite.scale.x
			tilingSprite.position.y = y-2500*tilingSprite.scale.y

		},
		free: function() {
			rendered = false
			pix.stage.removeChild(tilingSprite)
			pix.stage.removeChild(playerMask);
		}
	}
	return {update:function(){},free:function(){}}
}

gfx.createVirus = function(pix) { // (this.actor.x, this.actor.y, this.actor.color, this.actor.mass, this.actor.radius())
	var rendered = false;
	var bunny = genericCell(virusBall());
	return {
		update: function(x,y,c,mass, r) {
			if (!rendered) {
				pix.stage.addChild(bunny.container);
				rendered = true
			}
			bunny.container.scale.x = r
			bunny.container.scale.y = r
			// bunny.container.tint = c
			bunny.container.position.x = x
			bunny.container.position.y = y

			bunny.container.rotation = (x+y)/200
			bunny.back.tint = c
		},
		free: function() {
			rendered = false
			pix.stage.removeChild(bunny.container)
		}
	}
	return {update:function(){},free:function(){}}
}

gfx.createBacteria = function(pix) { // (this.actor.x, this.actor.y, this.actor.color, this.actor.mass, this.actor.radius())
	var rendered = false;
	var bunny = genericCell(bubbleCircle());
	return {
		update: function(x,y,c,mass, r) {
			if (!rendered) {
				pix.stage.addChild(bunny.container);
				rendered = true
			}
			bunny.container.scale.x = r
			bunny.container.scale.y = r
			// bunny.container.tint = c
			bunny.container.position.x = x
			bunny.container.position.y = y

			bunny.container.rotation = (x+y)/200

			bunny.back.tint = c
		},
		free: function() {
			rendered = false
			pix.stage.removeChild(bunny.container)
		}
	}
}

var genericCircle = (function() {
	var playerMask = new PIXI.Graphics()
	playerMask.beginFill(0xFFFFFF,1);
	// playerMask.arc(0,0,1,0,Math.PI*2)

	parts = 12
	a = Math.PI*2/parts
	for(var i=0;i<=parts;i++) {
		x = Math.cos(i*a)*.8
		y = Math.sin(i*a)*.8
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
	parts = 10
	a = Math.PI*2/parts
	for(var i=0;i<=parts;i++) {
		x = Math.cos(i*a)*.7
		y = Math.sin(i*a)*.7
		if (i==0) {
			playerMask.moveTo(x,y)
		} else {
			xn = Math.cos(i*a-a/2)
			yn = Math.sin(i*a-a/2)
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
	parts = 10
	a = Math.PI*2/parts
	for(var i=0;i<=parts;i++) {
		x = Math.cos(i*a)
		y = Math.sin(i*a)
		if (i==0) {
			playerMask.moveTo(x,y)
		} else {
			xn = Math.cos(i*a-a/2)*.4
			yn = Math.sin(i*a-a/2)*.4
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

	tilingSprite.scale.x = .01
	tilingSprite.scale.y = .01
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
	c = Math.floor(r)*256*256+Math.floor(g)*256+Math.floor(b)
	return c
}