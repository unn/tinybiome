var currentRoom;
var myplayer;
var tileSize = 50;
var hidingBbox = true;
var debugMode = false;
var maxCamPad = 150;
var camPad = maxCamPad;

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
			olf = off
			if (ws.synced) {
				off = readMessage(dv, off)
			} else {
				off = handleSync(dv, off-1)
				ws.synced = true
			}
			// console.log(off-olf)
		}
	}

messageHandlers = [
	handleNewRoom, handleNewActor, handleNewPellet, 
	handleRemovePellet, handleNewPlayer, handleRenamePlayer,
	handleDestroyPlayer, handleOwnPlayer, handleRemoveActor,
	handleMoveActor, handleSetMass, handleMultiPellet, 
	handleDescribeActor, handleSync]
var messageMap = []
function handleSync(dv, off) {
	l = dv.getUint8(off+1)
	messageMap = []
	for(var i=0; i<l; i++) {
		messageMap[dv.getUint8(off+2+i)] = i
	}
	return off+l+2
}
function readMessage(dv, off) {
	t = dv.getUint8(off)
	h = messageHandlers[messageMap[t]]
	if (!h) {
		console.log("UNKNOWN TYPE", t, "MAPPED TO", messageMap[t])
		return off+1000000
	}
	v = h(dv, off)
	return v
}
function handleNewRoom(dv, off) {
		var newroom;
		console.log("NEW ROOM INCOMING")
		width = dv.getInt32(off+1, true)
		height = dv.getInt32(off+5, true)
		newroom = new room(width,height)
		newroom.sizemultiplier = .7
		
		currentRoom = newroom
		newroom.startmass = dv.getInt32(off+9, true)
		newroom.mergetime = dv.getInt32(off+13, true)
		newroom.sizemultiplier = dv.getFloat32(off+17, true)
		newroom.speedmultiplier = dv.getFloat32(off+21, true)
		
		console.log("NEW ROOM",{width:width,height:height,sm:newroom.sizemultiplier})
		return off + 25
}
function handleNewActor(dv, off) {
		id = dv.getInt32(off+1, true)
		x = dv.getFloat32(off+5, true)
		y = dv.getFloat32(off+9, true)
		mass = dv.getFloat32(off+13, true)
		console.log("CREATING ACTOR",id,"AT",x,y)
		p = new actor(id, x, y)
		p.mass = mass
		return off + 17
}
function handleNewPellet(dv, off) {
		p = new pellet(dv.getInt32(off+1, true), dv.getInt32(off+5, true), dv.getInt32(off+9, true))
		return off + 13
}
function handleRemovePellet(dv, off) {
		dx = dv.getInt32(off+1, true)
		dy = dv.getInt32(off+5, true)
		p = currentRoom.findTile(dx,dy).find(dx,dy)

		if (p) {
			p.remove()	
		} else {
			console.log("COULDNT FIND", dx, dy)
		}
		return off + 9
}
function handleNewPlayer(dv, off) {
		id = dv.getInt32(off+1, true)
		len = dv.getInt32(off+5, true)
		if (len<100000 && len > -1) {
			name = dv.getUTF8String(off+9,len)
			console.log("CREATING PLAYER", id, "NAME(",len,")",name)
			p = (new player(currentRoom, id))
			p.name = name ? name : "";
		} else {
			console.log("INCORRECT LEN", len)
		}
		return off + 9 + len
}
function handleRenamePlayer(dv, off) {
		id = dv.getInt32(off+1, true)
		len = dv.getInt32(off+5, true)
		if (len<100000 && len > -1) {
			name = dv.getUTF8String(off+9,len)
			console.log("RENAMING PLAYER", id)
			currentRoom.players[id].name=name
		} else {
			console.log("INCORRECT LEN", len)
		}
		return off + 9 + len
}
function handleDestroyPlayer(dv, off) {
		id = dv.getInt32(off+1, true)
		console.log("DESTROYING PLAYER", id)
		currentRoom.players[id].remove()

		return off + 5
}
function handleOwnPlayer(dv, off) {
		id = dv.getInt32(off+1, true)
		console.log("NOW OWNS", id)
		myplayer = currentRoom.players[id]
		return off + 5
}
function handleRemoveActor(dv, off) {
		id = dv.getInt32(off+1, true)
		console.log("REMOVING ACTOR", id)
		p = actors[id]
		p.remove()
		return off + 5

}
function handleMoveActor(dv, off) {
		id = dv.getInt32(off+1, true)
		x = dv.getFloat32(off+5, true)
		y = dv.getFloat32(off+9, true)
		d = dv.getFloat32(off+13, true)
		s = dv.getFloat32(off+17, true)

		p = actors[id]
		p.xs = x
		p.ys = y
		p.direction = d
		p.speed = s

		return off + 21
}
function handleSetMass(dv, off) {
		id = dv.getInt32(off+1, true)
		mass = dv.getFloat32(off+5, true)
		p = actors[id]
		p.setmass( mass )
		return off + 9
}
function handleMultiPellet(dv, off) {
		amt = dv.getInt32(off+1, true)
		if (amt<1000000) {
			try {
				for(i in currentRoom.tiles) {
					currentRoom.tiles[i].freeadd = false
				}
			}
			catch(e) { console.log(e) }
			console.log("MULTI PELLET", amt)

			o = off + 5
			for(var i=0;i<amt;i++) {
				x = dv.getInt32(o, true)
				y = dv.getInt32(o+4, true)
				style = dv.getInt32(o+8, true)
				if (Math.random()<.0001) {
					console.log("CREATING PELLET", x, y, style)
				}
				p = new pellet(x, y, style)
				o += 12
			}


			try {
				for(i in currentRoom.tiles) {
					currentRoom.tiles[i].freeadd = true
				}
			}
			catch(e) { }
		} else {
			console.log("ERROR SIZE", amt)
		}
		
		return off + 5 + amt * 12
}
function handleDescribeActor(dv, off) {
		t = dv.getUint8(off+1)
		switch (t) {
		case 0:
			aid = dv.getInt32(off+2, true)
			pid = dv.getInt32(off+6, true)
			console.log("ACTOR",aid,"IS PLAYERACTOR")
			
			a = new playeractor(aid,pid)
			return off + 10
		case 1:
			aid = dv.getInt32(off+2, true)
			console.log("ACTOR",aid,"IS VIRUS")
			
			a = new virus(aid)
			return off + 6
		case 2:
			aid = dv.getInt32(off+2, true)
			console.log("ACTOR",aid,"IS BACTERIA")
			
			a = new bacteria(aid)
			return off + 6

		}
}

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

mab = new DataView(new ArrayBuffer(13))
mab.setUint8(0,1,true)
function writeMove(id,d,s) {

	mab.setInt32(1,id,true)
	mab.setFloat32(5,d,true)
	mab.setFloat32(9,s,true)
	ws.send(mab)
}
function writeSplit() {
	sab = new DataView(new ArrayBuffer(1))
	sab.setUint8(0,2,true)
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

var canvas = document.getElementById("playarea");
function ohno(x) {
	var errs = document.getElementById("err");
	document.getElementById("mainfloat").style.display="block";
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
    popup = document.getElementById("mainfloat");
    popup.style.left = ""+String(window.innerWidth/2 - popup.offsetWidth/2)+"px";
    popup.style.top = ""+String(window.innerHeight/2 - popup.offsetHeight/2)+"px";
    console.log("Left",window.innerWidth/2 - popup.innerWidth/2);
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;   
    console.log("New Cam",camera)
}

var camera = {x:0,y:0,width:canvas.width,height:canvas.height,xscale:1,yscale:1};
camera.bbox = function() {
	return [camera.x,camera.y,camera.x+canvas.width,camera.y+camera.height]
}
var ctx = canvas.getContext("2d");

var mousex = canvas.width/2;
var mousey = canvas.height/2;
canvas.onmousemove = function(e) {
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
    if (e.keyCode == '144') {
    	debugMode = true
    }
    if (debugMode) {
		if (e.keyCode == '68') {
	    	load_graphics_file("dark.js")
	    }
		if (e.keyCode == '69') {
	    	load_graphics_file("tristans.js")
	    }
	}

}
document.onkeyup = function(e) {
    e = e || window.event;
    if (e.keyCode == '32') {
    	canSplit = true

    }

}

function handleScroll(e) {
	console.log(e)
	camPad += e.deltaY/4
	if (camPad>maxCamPad) {
		camPad = maxCamPad
	}
	if (camPad < 10) {
		camPad = 10
	}
}
canvas.addEventListener("mousewheel", handleScroll, false);
canvas.addEventListener("DOMMouseScroll", handleScroll, false);

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

var renderCycles = 0
var graphicsCounts;
var fps = 30;


var renderQuality = 2;
var lastFps = (new Date());
var newFps = 0;
function render() {
	window.requestAnimationFrame(render)
	newFps += 1
	now = (new Date())
	if (now-lastFps>1000) {
		lastFps = now
		fps = newFps
		newFps = 0

		if (fps>50) {
			if (renderQuality < 3) {
				renderQuality += 1
			}
		}
		if (fps<30 + renderQuality*5) {
			if (renderQuality > 0) {
				renderQuality -= 1
			}
		}
	}

	renderCycles -= 1
	if (renderCycles <= 0) {
		if (graphicsCounts) {
			graphicsCounts.tiles /= 100
			graphicsCounts.particles /= 100
			graphicsCounts.tileSkips /= 100
			graphicsCounts.particleSkips /= 100
			graphicsCounts.renderTime /= 100
			graphicsCounts.particleTime /= 100
			graphicsCounts.fps = fps
			if (debugMode) {
				console.log(JSON.stringify(graphicsCounts))
			}
		}
		graphicsCounts = {tiles:0, particles:0, tileSkips:0, 
			particleSkips: 0, renderTime:0,
			particleTime: 0}
		renderCycles = 100
	}

	if (renderQuality<2) {
		if ((renderCycles%2)==1) {
			return
		}
	}
	gfx.renderArea(ctx,canvas.width,canvas.height)
	ctx.save()

	if (myplayer) {
		size = myplayer.bbox()
		size[0] -= camPad
		size[1] -= camPad
		size[2] += camPad
		size[3] += camPad

		width = size[2]-size[0]
		height = size[3]-size[1]
		ratio = canvas.width/canvas.height
		haveRatio = width/height
		if (haveRatio<ratio) {
			width = width/haveRatio*ratio
		}
		if (haveRatio>ratio) {
			height = height*haveRatio/ratio
		}
		midPointX = (size[2]+size[0])/2
		midPointY = (size[3]+size[1])/2

		camera.x = (midPointX -width/2 + camera.x*3) / 4;
		camera.y = (midPointY -height/2 + camera.y*3) / 4;

		camera.width = (width+camera.width)/2
		camera.height = (height+camera.height)/2

		camera.xscale = canvas.width/camera.width
		camera.yscale = canvas.height/camera.height
		ctx.scale(camera.xscale,camera.yscale)
		ctx.translate(-camera.x,-camera.y)
	}

	

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
}

function draw_leaderboard(ctx, room) {
	var playersWithScore = []
	total = 0
	for(k in room.players) {
		total += 1
		p = room.players[k]
		s = 0
		for(i in p.owns) {
			a = p.owns[i];
			s += a.mass
		}
		if (s!=0) {
			n = p.name ? p.name : "Microbe"
			playersWithScore.push([n,Math.floor(s)])
		}
	}
	playersWithScore.sort(function(a,b){return b[1]-a[1]})
	gfx.renderLeaderBoard(ctx, playersWithScore, canvas.width-400, 0, 400, 800, total)
}

lastStep = (new Date())
function step() {
	var actor;
	now = (new Date())
	diff = (now - lastStep) / 1000
	if (currentRoom) {
		currentRoom.step(diff)
	}
	lastStep = now


}
setInterval(step,1000/60);

// utils

function median(a,b,c) {
	return a<b? b<c? b : a<c? c : a : b<c? a<c? a : c : b; }