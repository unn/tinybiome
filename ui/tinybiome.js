var currentRoom;
var myplayer;
var tileSize = 50;
var hidingBbox = true;

var felt = document.createElement('IMG');
felt.src = 'imgs/felt.jpg';

DataView.prototype.getUTF8String = function(offset, length) {
    var utf16View = [];
    for (var i = 0; i < length; ++i) {
        utf16View.push( this.getUint8(offset + i) );
    }
    return ab2str(utf16View)
};

	ws = new WebSocket("ws://"+document.location.hostname+":5000");
	ws.binaryType = "arraybuffer";
	ws.onerror = function() {
		ohno("Websocket Error! Refresh in a bit, it might have been restarted...")
	}
	ws.onclose = function() {
		ohno("Websocket Closed?")
	}
	ws.onmessage = function(m) {
		dv = new DataView(m.data)
		off = 0
		while (off < dv.byteLength) {
			off = readMessage(dv, off)
		}
	}

function readMessage(dv, off) {
	t = dv.getUint8(off)
	switch (t) {
	case 0: // JOIN
		var newroom;
		newroom = new room(dv.getInt32(off+1, true),dv.getInt32(off+5, true))
		currentRoom = newroom
		newroom.startmass = dv.getInt32(off+9, true)
		newroom.mergetime = dv.getInt32(off+13, true)
		off = off + 17
		console.log(newroom);
		break;
	case 1: // CREATE ACTOR
		id = dv.getInt32(off+1, true)
		owner = dv.getInt32(off+17, true)
		x = dv.getFloat32(off+5, true)
		y = dv.getFloat32(off+9, true)
		console.log("CREATING ACTOR",id,"BY",owner,"AT",x,y)
		p = new actor(id, owner, x, y)
		p.mass =dv.getFloat32(off+13, true)
		off = off + 21
		break;
	case 2:
		p = new pellet(dv.getInt32(off+1, true, true), dv.getInt32(off+5, true, true), dv.getInt32(off+9, true, true))
		off = off + 13
		break
	case 3:
		dx = dv.getInt32(off+1, true)
		dy = dv.getInt32(off+5, true)
		off = off + 9
		p = currentRoom.findTile(dx,dy).find(dx,dy)

		if (p) {
			p.remove()	
		} else {
			console.log("COULDNT FIND", dx, dy)
		}
		break
	case 4:
		id = dv.getInt32(off+1, true)
		len = dv.getInt32(off+5, true)
		name = dv.getUTF8String(off+9,len)
		off = off + 9 + len
		console.log("CREATING PLAYER", id, "NAME(",len,")",name)
		p = (new player(currentRoom, id))
		p.name = name ? name : "";
		break
	case 5:
		id = dv.getInt32(off+1, true)
		len = dv.getInt32(off+5, true)
		name = dv.getUTF8String(off+9,len)
		off = off + 9 + len
		console.log("RENAMING PLAYER", id)
		currentRoom.players[id].name=name
		break
	case 6:
		id = dv.getInt32(off+1, true)
		off = off + 5
		console.log("DESTROYING PLAYER", id)
		currentRoom.players[id].remove()
		break

	case 7:
		id = dv.getInt32(off+1, true)
		off = off + 5
		console.log("NOW OWNS", id)
		myplayer = currentRoom.players[id]
		break;
	case 8:
		id = dv.getInt32(off+1, true)
		off = off + 5
		console.log("REMOVING ACTOR", id)
		p = actors[id]
		p.remove()

		break;
	case 9: //move actor
		id = dv.getInt32(off+1, true)
		x = dv.getFloat32(off+5, true)
		y = dv.getFloat32(off+9, true)
		d = dv.getFloat32(off+13, true)
		s = dv.getFloat32(off+17, true)
		off = off + 21
		p = actors[id]
		p.x = x
		p.y = y
		p.direction = d
		p.speed = s
		break;
	case 10:
		id = dv.getInt32(off+1, true)
		mass = dv.getFloat32(off+5, true)
		off = off + 9
		p = actors[id]
		p.mass = mass
		break;
	case 11:
		amt = dv.getInt32(off+1, true)
		console.log("MULTI PELLET", amt)
		o = off + 5
		for(var i=0;i<amt;i++) {
			x = dv.getInt32(o, true, true)
			y = dv.getInt32(o+4, true, true)
			style = dv.getInt32(o+8, true, true)
			if (Math.random()<.0001) {
				console.log("CREATING PELLET", x, y, style)
			}
			p = new pellet(x, y, style)
			o += 12
		}
		
		off = off + 5 + amt * 12
		break
	default:
		console.log("ERROR READING", t)
	}
	return off
}
mab = new DataView(new ArrayBuffer(13))
mab.setUint8(0,1,true)
sab = new DataView(new ArrayBuffer(1))
sab.setUint8(0,2,true)

function writeJoin(name) {
	asString = str2ab(name)
	ab = new ArrayBuffer(1+4+asString.length)
	dv = new DataView(ab)
	dv.setUint8(0,0,true)
	dv.setInt32(1,asString.length,true)
	for(var i=0;i<asString.length;i+=1) {
		dv.setUint8(5+i, asString[i],true)
	}
	ws.send(ab)
}
function writeMove(id,d,s) {
	mab.setInt32(1,id,true)
	mab.setFloat32(5,d,true)
	mab.setFloat32(9,s,true)
	ws.send(mab)
}
function writeSplit() {
	ws.send(sab)
}

function ab2str(buf) {
  return String.fromCharCode.apply(null, buf);
}
function str2ab(str) {
	uintArray = []
	for (var i=0, strLen=str.length; i<strLen; i++) {
		uintArray.push(str.charCodeAt(i));
	}
	return uintArray;
}

function stringToUint(string) {
    var string = btoa(string),
        charList = string.split(''),
        uintArray = [];
    for (var i = 0; i < charList.length; i++) {
        uintArray.push(charList[i].charCodeAt(0));
    }
    console.log("NAME",uintArray)
    return uintArray;
}
function rgb(r, g, b){
  return "rgb("+Math.floor(r)+","+Math.floor(g)+","+Math.floor(b)+")";
}

var c = document.getElementById("playarea");
function ohno(x) {
	var errs = document.getElementById("err");
	errs.innerHTML = x;
}
var popup;
window.onload = function() {
	window.requestAnimationFrame(render)
	window.onresize();
	document.getElementById("loginButton").onclick = function() {
		console.log("JOINING")
		n = document.getElementById("name").value;
		writeJoin(n)
	}
}

window.onresize = function() {
    popup = document.getElementById("login");
    popup.style.left = ""+String(window.innerWidth/2 - popup.offsetWidth/2)+"px";
    popup.style.top = ""+String(window.innerHeight/2 - popup.offsetHeight/2)+"px";
    console.log("Left",window.innerWidth/2 - popup.innerWidth/2);
    c.width = window.innerWidth;
    c.height = window.innerHeight;   
    camera.width = c.width;
    camera.height = c.height;
    console.log("New Cam",camera)
}

var camera = {x:0,y:0,width:c.width,height:c.height};
var ctx = c.getContext("2d");

var mousex = c.width/2;
var mousey = c.height/2;
c.onmousemove = function(e) {
	mousex = e.offsetX;
	mousey = e.offsetY;
}
canSplit = true
document.onkeydown = function(e) {
    e = e || window.event;

	if (canSplit && e.keyCode == '32') {
    	canSplit = false
    	writeSplit()
    }
	if (e.keyCode == '68') {
    	load_graphics_file("dark.js")
    }
	if (e.keyCode == '69') {
    	load_graphics_file("tristans.js")
    }

}
document.onkeyup = function(e) {
    e = e || window.event;
    if (e.keyCode == '32') {
    	canSplit = true

    }

}

var gfx = {}
var gfx_loaded = {"default.js":true}

function load_graphics_file(name) {
	if (gfx_loaded[name]) {
		return
	}
	var js = document.createElement("script");
	js.type = "text/javascript";
	js.src = name;
	document.body.appendChild(js);
	gfx_loaded[name] = true
}

function render() {
	if (myplayer) {
		l = Object.keys(myplayer.owns).length
		if (l>0) {
			camX = 0;
			camY = 0;

			for (i in myplayer.owns) {
				p = myplayer.owns[i]

				camX += p.x;
				camY += p.y;
			}

			camera.x = (camX / l - camera.width / 2 + camera.x) / 2;
			camera.y = (camY / l - camera.height / 2 + camera.y) / 2;
		}
	}

	gfx.renderArea(ctx,camera.width,camera.height)
	ctx.save()
	ctx.translate(-camera.x,-camera.y)

	x = camera.x<0 ? 0 : camera.x
	y = camera.y<0 ? 0 : camera.y
	w = x + camera.width > room.width ? room.width - x : camera.width
	h = y + camera.height > room.height ? room.height - y : camera.height 

	gfx.renderBackground(ctx, x, y, w, h)

	if (currentRoom) {
		currentRoom.render(ctx)
	}

	ctx.restore()



	var actor;
	for (id in renderable) {
		actor = renderable[id]
		if (actor.postRender) {
			actor.postRender()
		}
	}

	ctx.strokeStyle = "rgba(30,60,80,.4)";
	ctx.beginPath();
	ctx.arc(mousex, mousey, 10, 0, 2 * Math.PI);
	ctx.stroke();

	if (currentRoom) {
		draw_leaderboard(ctx,currentRoom)
	}

	window.requestAnimationFrame(render)
}

function draw_leaderboard(ctx, room) {
	var playersWithScore = []
	for(k in room.players) {
		p = room.players[k]
		s = 0
		for(i in p.owns) {
			a = p.owns[i];
			s += a.mass
		}
		n = p.name ? p.name : "Microbe"
		playersWithScore.push([n,Math.floor(s)])
	}
	playersWithScore.sort(function(a,b){return b[1]-a[1]})

	gfx.renderLeaderBoard(ctx, playersWithScore, camera.width-400, 0, 400, 800)
}

lastStep = (new Date())
function step() {
	var actor;
	now = (new Date())
	diff = (now - lastStep) / 1000
	for (id in actors) {
		actor = actors[id]
		actor.step(diff)
	}
	lastStep = now


}
setInterval(step,1000/60);

// utils

function median(a,b,c) {
	return a<b? b<c? b : a<c? c : a : b<c? a<c? a : c : b; }