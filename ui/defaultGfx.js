var felt = document.createElement('IMG');
felt.src = 'imgs/felt.jpg';
var tileSize = 50;

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
	ctx.fillStyle = color;
	ctx.beginPath();
	r = life/50
	ctx.moveTo(x,y-r)
	ctx.lineTo(x-r*.8,y-r*.55)
	ctx.lineTo(x-r*.8,y+r*.55)
	ctx.lineTo(x,y+r)
	ctx.lineTo(x+r*.8,y+r*.55)
	ctx.lineTo(x+r*.8,y-r*.55)
	ctx.lineTo(x,y-r)
	ctx.fill();
}

gfx.renderGroup = function(ctx, bbox, name, mass, players) {
	w = bbox[2]-bbox[0]
	h = bbox[3]-bbox[1]
	x = bbox[0]
	y = bbox[1]
	textX = x+w/2
	textY = y

	ctx.lineWidth = 1;
	ctx.textAlign = "center";
	ctx.fillStyle = "white";
	ctx.strokeStyle = "black";
	ctx.font = "28px sans serif";
	ctx.textBaseline = "bottom";
 	ctx.fillText(name, textX, textY);
 	ctx.strokeText(name, textX, textY);

 	ctx.lineWidth = .3;
 	ctx.strokeStyle = players[0].color
 	ctx.strokeRect(x,y,w,h)
}

gfx.renderPlayer = function(ctx, x, y, color, name, mass, radius) {
	ctx.save();
	ctx.beginPath();
	ctx.arc(x, y, radius, 0, 2 * Math.PI);
	ctx.clip();
	ctx.drawImage(felt,x-radius,y-radius, radius*2, radius*2);

	ctx.globalCompositeOperation = "multiply";
	ctx.fillStyle = color;
	ctx.beginPath();
	ctx.fillRect(x-radius,y-radius,radius*2,radius*2)
	ctx.fill();
	ctx.globalCompositeOperation = "source-over";

	ctx.restore();

	ctx.lineWidth = radius*.1;
	ctx.strokeStyle = color;
	ctx.beginPath();
	ctx.arc(x, y, radius, 0, 2 * Math.PI);
	ctx.stroke();
	ctx.lineWidth = 1;

	ctx.lineWidth = .3;
	ctx.textAlign = "center";
	ctx.fillStyle = "white";
	ctx.strokeStyle = "black";
	ctx.font = "12px sans serif";
	ctx.textBaseline = "top";
 	ctx.fillText(mass, x, y);
 	ctx.strokeText(mass, x, y);

 	ctx.lineWidth = 2;
}

gfx.renderVitamin = function(ctx, x, y, color, radius) {
	ctx.beginPath();
	ctx.fillStyle = color;
	r = radius
	ctx.moveTo(x,y-r)
	ctx.lineTo(x-r*.8,y-r*.55)
	ctx.lineTo(x-r*.8,y+r*.55)
	ctx.lineTo(x,y+r)
	ctx.lineTo(x+r*.8,y+r*.55)
	ctx.lineTo(x+r*.8,y-r*.55)
	ctx.lineTo(x,y-r)
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

gfx.renderLeaderBoard = function(ctx, leaders, x, y, width, height) {
	ctx.lineWidth = .7;
	ctx.textAlign = "right";
	ctx.textBaseline = "top";
	ctx.fillStyle = "white";
	ctx.strokeStyle = "black"
	ctx.font = "20px sans serif";
	ctx.lineWidth = 1;

	l = "Leaderboard"
	ctx.fillText(l, x+width,0)
	ctx.strokeText(l, x+width,0)

	for(var i=0; i<leaders.length; i+=1) {
		n = leaders[i][0]
		ctx.fillText(n, x+width - 100,i*20+20)
		ctx.strokeText(n, x+width - 100,i*20+20)

		m = leaders[i][1]
		ctx.fillText(m, x+width,i*20+20)
		ctx.strokeText(m, x+width,i*20+20)
	}
	
}