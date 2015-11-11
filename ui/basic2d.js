var cellImg = new Image();
cellImg.onload = function() {
	cellImg.loaded = true
	cellImgWidth = cellImg.width / mPlier
	cellImgHeight = cellImg.height / mPlier
}
cellImg.loaded = false;
cellImg.pattern = false;
cellImg.src = 'imgs/cells.jpg';

font = "Verdana, Geneva, sans-serif"
fontPrefix = "bold "

mPlier = 4

var tileSize = 100;

gfx.getContext = function(canvas) {
	return canvas.getContext("2d")
}

// return an object with a .free(), .cache(particles), and .render(ctx, x, y)
gfx.renderTile = function() {
	return {
		free: function() {
			if (this.canvas) {
				delete this.canvas
			}
		},
		cache: function(renderables) {
			if (!(this.canvas)) {
				console.log("CREATING RENDERTILE", this.id)
				var m_canvas = document.createElement('canvas');

				this.to = setTimeout(this.clear, 100)
				m_canvas.width = renderTileSize + tilePadding*2;
				m_canvas.height = renderTileSize + tilePadding*2;
				var m_context = m_canvas.getContext('2d');
				this.canvas = m_canvas
				this.ctx = m_context
			}

			this.ctx.clearRect(0, 0, renderTileSize+tilePadding*2, renderTileSize+tilePadding*2);
			this.ctx.save()
			this.ctx.translate(-this.x+tilePadding,-this.y+tilePadding)

			for (id in this.renderables) {
				objectToRender = this.renderables[id]
				objectToRender.render(this.ctx)
			}
			this.ctx.restore()
		},
		render: function(ctx,x,y) {
			ctx.drawImage(this.canvas, x, y);
		}
	}
}



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

	size = 12
	if (28*camera.yscale<150) {
		size = 17
	}
	if (28*camera.yscale<70) {
		size = 24
	}
	if (28*camera.yscale<20) {
		size = 30
	}


	ctx.lineWidth = 1;
	ctx.textAlign = "center";
	ctx.fillStyle = "white";
	ctx.strokeStyle = "black"
	ctx.font = fontPrefix+size+"px "+font;

	if (y+n/2>camera.y+camera.height/3*2) {
		textX = n
		textY = textY
		ctx.textBaseline = "bottom";
		ctx.fillText(name, textX, textY)
		ctx.strokeText(name, textX, textY)
	} else {
		textX = textX
		textY = y + h
		ctx.textBaseline = "top";
		ctx.fillText(name, textX, textY)
		ctx.strokeText(name, textX, textY)
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

	// 	textX = m - / 2
	// 	textY m y
	// 	ctx.fillText(ctx, textX, textY)
	// strokeText.fillText(ctx, textX, textY)
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
	ctx.textAlign = "right";
	ctx.textBaseline = "top";
	ctx.fillStyle = "white";
	ctx.strokeStyle = "black"

	total = leaders.length
	if (leaders.length <= 0) {
		return
	}
	if (leaders.length > 8) {
		leaders.length = 8
	}

	l = connected+" players connected, "+total+" playing. FPS: "+fps+", QUALITY: "+renderQuality+", PING: "+Math.floor(currentSock.latency*10)/10+"ms"

	nPxHeight = 14;
	ctx.lineWidth = .4;
	ctx.font = fontPrefix+nPxHeight+"px "+font;
	ctx.fillText(l, x+width,0)
	ctx.strokeText(l, x+width,0)

	pxHeight = 20
	ctx.font = fontPrefix+pxHeight+"px "+font;

	ctx.lineWidth = .7;
	l = "Top "+leaders.length+":"
	ctx.fillText(l, x+width,nPxHeight)
	ctx.strokeText(l, x+width,nPxHeight)

	for(var i=0; i<leaders.length; i+=1) {
		n = leaders[i][0]

		ctx.fillText(n, x+width - 200,i*pxHeight+nPxHeight+pxHeight)
		ctx.strokeText(n, x+width - 200,i*pxHeight+nPxHeight+pxHeight)

		m = leaders[i][1]

		ctx.fillText(m, x+width,i*pxHeight+pxHeight+nPxHeight)
		ctx.strokeText(m, x+width,i*pxHeight+pxHeight+nPxHeight)
	}
	
}

gfx.position = function(ctx, x, y, xscale, yscale) {
	ctx.save()
	ctx.scale(camera.xscale,camera.yscale)
	ctx.translate(x, y)
}

gfx.done = function(ctx) {
	ctx.restore()
}