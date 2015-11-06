gfx.renderRoom = function(ctx, width, height) {
	ctx.strokeStyle = "white";
	ctx.strokeRect(0, 0, width, height);
}

gfx.renderArea = function(ctx, width, height) {
	ctx.fillStyle = "black";
	ctx.fillRect(0,0,width, height);
}