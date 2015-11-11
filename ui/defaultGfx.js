var cellImg = new Image();
cellImg.onload = function() {
	cellImg.loaded = true
	cellImgWidth = cellImg.width / mPlier
	cellImgHeight = cellImg.height / mPlier
}
cellImg.loaded = false;
cellImg.pattern = false;
cellImg.src = 'imgs/cells.jpg';

mPlier = 4

var textCaches = {};
var shouldCacheText = false
var textPad = 0;
function textCache(s, height) {
	this.to = 10000
	this.remove = this.removeAny.bind(this)
	this.text = s
	this.height = height
	this.font = this.height+"px sans serif"
	this.rendered = false
	this.id = textCache.getid(s,height)
	textCaches[this.id] = this
	this.renders = 0
	this.visible = false
	this.rerender()
}
textCache.prototype.render = function(ctx,x,y) {
	this.visible = true
	this.renders += 1
	if (this.renders>20 && shouldCacheText) {
		if (!this.timer) this.timer = setTimeout(this.remove, this.to)
		if (this.renders>500) {
			this.rendererd = false
			this.renders = 20
		}
		if (!this.rendered) {
			this.ctx.textAlign = "left";
			this.ctx.textBaseline = "top";
			this.ctx.font = this.height*2+"px sans serif"
			this.ctx.fillStyle = "white";
			this.ctx.strokeStyle = "black";
			this.ctx.lineWidth = this.height/16;

		 	this.ctx.fillText(this.text, textPad, textPad);
		 	this.ctx.strokeText(this.text, textPad, textPad);
		 	this.rendered = true
		}
		ctx.drawImage(this.canvas,x-textPad,y-textPad,this.width,this.height)
	} else {
		ctx.textAlign = "left";
		ctx.textBaseline = "top";
		ctx.font = this.font
		ctx.fillStyle = "white";
		ctx.strokeStyle = "black";
		ctx.lineWidth = this.height/32;
	 	ctx.fillText(this.text, x, y);
	 	ctx.strokeText(this.text, x, y);
	}
}

textCache.prototype.rerender = function() {
	var m_canvas = document.createElement('canvas');
	this.canvas = m_canvas
	var ctx = m_canvas.getContext('2d');
	this.ctx = ctx
	ctx.font = this.font
	ctx.fillStyle = "white";
	ctx.strokeStyle = "black";
	ctx.lineWidth = .3;
	var s = ctx.measureText(this.text)
	this.width = s.width

	this.canvas.width = this.width*2+textPad*2
	this.canvas.height = this.height*2+textPad*2
	if (!shouldCacheText) delete this.canvas
	// console.log("RERENDER",this.text,this.width,this.height,"WITH",this.font)
	// ctx.scale(10,10)
}
textCache.prototype.removeAny = function() {
	this.timer = setTimeout(this.remove, this.to)
	if (this.visible) {
		this.visible = false
		return
	}

	// console.log("FREEING",this.id)
	if (shouldCacheText) delete this.canvas
	delete textCaches[this.id]
}
textCache.getid = function(s,height) {
	return "STRING:"+s+",FONT:"+height
}

function getTextCanvas(s, height) {
	var id = textCache.getid(s, height);
	if (!(id in textCaches)) {
		new textCache(s, height)
	}
	return textCaches[id]
}

var tileSize = 100;

gfx.renderRoom = function(ctx, width, height) {
	ctx.strokeStyle = "black";
	ctx.strokeRect(0, 0, width, height);
}

gfx.renderArea = function(ctx, width, height) {
	ctx.clearRect(0,0,width, height);
}

gfx.renderBackground = function(ctx, x, y, width, height) {
	ctx.strokeStyle = "lightgray";
	offsetX = x % tileSize;
	offsetY = y % tileSize;
	ctx.beginPath();


	for (var curX=x-offsetX; curX<x+width+tileSize-offsetX; curX+=tileSize) {
		ctx.moveTo(curX,y);
		ctx.lineTo(curX,y+height);
	}
	for (var curY=Math.max(y-offsetY,0); curY<y+height+tileSize-offsetY; curY+=tileSize) {
		ctx.moveTo(x,curY);
		ctx.lineTo(x+width,curY);
	}
	ctx.stroke();
}

gfx.renderParticle = function(ctx, x, y, life, color) {
	if (renderQuality<1) {
		return
	}
	ctx.fillStyle = color;
	ctx.beginPath();
	r = life/50
	ctx.moveTo(x,y-r)
	if (renderQuality<2) {
		ctx.lineTo(x-r,y)
		ctx.lineTo(x,y+r)
		ctx.lineTo(x+r,y)
		ctx.lineTo(x,y-r)
	} else {
		ctx.lineTo(x-r*.8,y-r*.55)
		ctx.lineTo(x-r*.8,y+r*.55)
		ctx.lineTo(x,y+r)
		ctx.lineTo(x+r*.8,y+r*.55)
		ctx.lineTo(x+r*.8,y-r*.55)
		ctx.lineTo(x,y-r)
	}
	ctx.fill();
}

gfx.renderGroup = function(ctx, bbox, name, mass, players) {
	w = bbox[2]-bbox[0]
	h = bbox[3]-bbox[1]
	x = bbox[0]
	y = bbox[1]
	textX = x+w/2
	textY = y

	size = 15
	if (28*camera.yscale<150) {
		size = 20
	}
	if (28*camera.yscale<70) {
		size = 25
	}
	if (28*camera.yscale<20) {
		size = 30
	}


	t = getTextCanvas(name, size)
	if (y+h/2>camera.y+camera.height/3*2) {
		textX = textX - t.width / 2
		textY = textY - t.height
		t.render(ctx, textX, textY)
	} else {
		textX = textX - t.width / 2
		textY = y + h
		t.render(ctx, textX, textY)
	}

 	ctx.lineWidth = .3;
 	ctx.strokeStyle = players[0].color
 	ctx.strokeRect(x,y,w,h)
}

gfx.renderBacteria = function(ctx, x, y, color, mass, radius) {
	ctx.save();
	ctx.beginPath();
	bubbles = 6
	ca = Math.PI*2/(bubbles)
	for(var i=0; i<=bubbles; i++) {
		a = (x+y)/20+i*ca
		if (i==0) {
			ctx.moveTo(x+radius*.7*Math.cos(a), y+radius*.7*Math.sin(a))
		} else {
			ex = x+radius*.7*Math.cos(a)
			ey = y+radius*.7*Math.sin(a)
			if (renderQuality>1) {
				mx = x+radius*Math.cos(a-ca/2)
				my = y+radius*Math.sin(a-ca/2)
				ctx.quadraticCurveTo(mx,my,ex,ey)
			} else {
				mx = x+radius*.8*Math.cos(a-ca/2)
				my = y+radius*.8*Math.sin(a-ca/2)
				ctx.lineTo(mx,my)
				ctx.lineTo(ex,ey)
			}
		}

	}
	ctx.clip();

	gfx.renderCell(ctx, x, y, color, radius)

	ctx.restore();
}

gfx.renderVirus = function(ctx, x, y, color, mass, radius) {
	ctx.save();
	ctx.beginPath();
	d = 1
	spikes = 8
	if (renderQuality<2) {
		spikes = 6
	}
	ca = Math.PI*2/(spikes*2)
	for(var i=0; i<=spikes*2; i++) {
		a = (x+y)/20+i*ca
		if (i==0) {
			ctx.moveTo(x+radius*d*Math.cos(a), y+radius*d*Math.sin(a))
		} else {
			ctx.lineTo(x+radius*d*Math.cos(a), y+radius*d*Math.sin(a))
		}
		if (d==1) d=.65
		else d=1
	}
	ctx.clip();

	gfx.renderCell(ctx, x, y, color, radius)

	ctx.restore();

}

gfx.renderActor = function(ctx, x, y, color, mass, radius) {
	ctx.save();
	ctx.beginPath();
	ctx.arc(x, y, radius, 0, 2 * Math.PI);
	ctx.clip();

	gfx.renderCell(ctx, x, y, color, radius)



	ctx.restore();


	// if (12*camera.yscale>7) {

	// 	t = getTextCanvas(mass, 12, "12px sans serif")
	// 	textX = x - t.width / 2
	// 	textY = y
	// 	t.render(ctx, textX, textY)
	// }

 // 	ctx.lineWidth = 2;
}

gfx.renderCell = function(ctx, x, y, color, radius) {
	if (renderQuality>0) {
		if (cellImg.loaded) {
			if (!cellImg.pattern) {
				cellImg.pattern = ctx.createPattern(cellImg, 'repeat');
			}
			ctx.fillStyle = cellImg.pattern;
			pX = x-radius
			pY = y-radius
			sX = radius*2
			sY = radius*2
			pX = Math.floor(pX/cellImgWidth)*cellImgWidth
			pY = Math.floor(pY/cellImgHeight)*cellImgHeight
			sX = Math.floor((pX+sX)/cellImgWidth)*cellImgWidth
			sY = Math.floor((pY+sY)/cellImgHeight)*cellImgHeight
			ctx.save()
			ctx.translate(x-radius,y-radius);
			ctx.scale(.3,.3)
			ctx.fillRect(0,0,(radius*2/.3),(radius*2/.3));
			// ctx.translate(-(x-radius),-(y-radius));
			ctx.restore()
		}


		ctx.globalCompositeOperation = "multiply";
		ctx.fillStyle = color;
		ctx.fillRect(x-radius,y-radius,radius*2,radius*2)
		ctx.fill();
		ctx.globalCompositeOperation = "source-over";
	} else {
		ctx.fillStyle = color;
		ctx.fillRect(x-radius,y-radius,radius*2,radius*2)
		ctx.fill();
	}

	ctx.lineWidth = .5+radius*.01;
	ctx.strokeStyle = color;
	ctx.beginPath();
	ctx.arc(x, y, radius, 0, 2 * Math.PI);
	ctx.stroke();
}

var frame = 0;
gfx.renderVitamin = function(ctx, x, y, color, radius) {
	ctx.beginPath();
	ctx.fillStyle = color;
	r = radius

	parts = 8
	if (renderQuality<3) {
		parts = 6
	}
	if (renderQuality<2) {
		parts = 4
	}
	if (renderQuality<1) {
		parts = 3
	}
	ca = Math.PI*2/(parts)
	for(var i=0; i<=parts; i++) {
		a = Math.PI*2*frame/1000+i*ca
		if (i==0) {
			ctx.moveTo(x+radius*Math.cos(a), y+radius*Math.sin(a))
		} else {
			ctx.lineTo(x+radius*Math.cos(a), y+radius*Math.sin(a))
		}
	}

	ctx.fill();
}

gfx.renderMineral = function(ctx, x, y, color, radius) {
	ctx.beginPath();
	ctx.fillStyle = color;
	r = radius
	ctx.moveTo(x,y-r)
	ctx.lineTo(x-r,y)
	ctx.lineTo(x,y+r)
	ctx.lineTo(x+r,y)
	ctx.lineTo(x,y-r)
	ctx.fill();
}

gfx.renderLeaderBoard = function(ctx, leaders, x, y, width, height, connected) {
	frame += 1;
	if (frame>1000) {
		frame = 0
	}
	pxHeight = 28
	ctx.lineWidth = 1;
	ctx.textAlign = "right";
	ctx.textBaseline = "top";
	ctx.fillStyle = "white";
	ctx.strokeStyle = "black"
	ctx.font = pxHeight+"px sans serif";

	total = leaders.length
	if (leaders.length <= 0) {
		return
	}
	if (leaders.length > 8) {
		leaders.length = 8
	}

	l = connected+" players connected, "+total+" playing. FPS: "+fps+", QUALITY: "+renderQuality+", PING: "+currentSock.latency+"ms"

	nPxHeight = 14;
	t = getTextCanvas(l, nPxHeight, nPxHeight)
	t.render(ctx, x+width-t.width,0)

	l = "Top "+leaders.length+":"
	t = getTextCanvas(l, pxHeight, pxHeight)
	t.render(ctx, x+width-t.width,nPxHeight)

	for(var i=0; i<leaders.length; i+=1) {
		n = leaders[i][0]
		t = getTextCanvas(n, pxHeight, pxHeight)
		t.render(ctx, x+width-t.width - 200,i*pxHeight+nPxHeight+pxHeight)

		m = leaders[i][1]
		t = getTextCanvas(m, pxHeight, pxHeight)
		t.render(ctx, x+width-t.width,i*pxHeight+pxHeight+nPxHeight)
	}
	
}