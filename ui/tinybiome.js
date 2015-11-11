var currentRoom;
var currentSock;
var myplayer;
var tileSize = 50;
var hidingBbox = true;
var debugMode = false;
var maxCamPad = 150;
var camPad = maxCamPad;
var maxQuality = 3;

DataView.prototype.getUTF8String = function(offset, length) {
    var utf16View = [];
    for (var i = 0; i < length; ++i) {
        utf16View.push( this.getUint8(offset + i) );
    }
    return ab2str(utf16View)
};

var ws;

function server(location) {
	var self = this;
	this.ws = new WebSocket("ws://"+location)
	this.servers = [];
	this.ws.onopen = function() {
	}
	this.ws.onerror = function() {
		ohno("Websocket Error! Refresh in a bit, it might have been restarted...")
	}
	this.ws.onclose = function() {
		ohno("Websocket Closed?")
	}
	this.ws.onmessage = function(m) {
		d = JSON.parse(m.data)
		if (d.meth=="add") {
			new sock(d.address);
		}
		if (d.meth=="rem") {
			s = self.findServer(d.address)
			self.removeServer(s)
		}
	}
}
server.prototype.connectTo = function(sock) {
	if (currentSock==sock) return
	if (currentSock) {
		currentSock.dc()
	}
	currentSock = sock
	if (currentSock.connected) {
		currentSock.writeSync()
	}
}
server.prototype.addServer = function(sock) {
	this.servers.push(sock)
	this.ensureConnected()
}
server.prototype.ensureConnected = function() {
	console.log("EC",currentSock)
	if (!currentSock) {
		if (this.servers.length>=1) {
			this.connectTo(this.servers[0])
		}
	}
	console.log("EC",currentSock.connected,currentSock)
}
server.prototype.findServer = function(location) {
	for(var i=0;i<this.servers;i+=1) {
		if (this.servers[i].location == location) {
			return this.servers[i]
		}
	}
}
server.prototype.removeServer = function(sock) {
	for(var i=0;i<this.servers;i+=1) {
		if (this.servers[i] == sock) {
			this.servers.splice(i, 1);
			break
		}
	}
	this.ensureConnected()
}


function sock(location) {
	console.log("NEW SERVER", this)
	this.location = location
	this.messageHandlers = [
		this.handleNewRoom.bind(this),
		this.handleNewActor.bind(this),
		this.handleNewPellet.bind(this),
		this.handleRemovePellet.bind(this),
		this.handleNewPlayer.bind(this),
		this.handleRenamePlayer.bind(this),
		this.handleDestroyPlayer.bind(this),
		this.handleOwnPlayer.bind(this),
		this.handleRemoveActor.bind(this),
		this.handleMoveActor.bind(this),
		this.handleSetMass.bind(this),
		this.handleMultiPellet.bind(this),
		this.handleDescribeActor.bind(this),
		this.handleSync.bind(this),
		this.handlePong.bind(this)]
	this.messageMap = []
	this.latency = 100;
	this.ws = new WebSocket("ws://"+location)
	this.lastPong = (new Date());


	this.ele = document.getElementById("servertemplate").cloneNode();
	document.getElementById("serverlist").appendChild(this.ele)
	this.ele.innerHTML = this.location


	var self = this;


	this.ele.onclick = function() {
		servers.connectTo(self)
	}

	this.connected = false
	this.ws.binaryType = "arraybuffer";
	this.mytick = this.tick.bind(this)
	this.myremove = this.remove.bind(this)
	this.ws.onopen = function() {
		self.connected = true
		if (currentSock==self)
			self.writeSync()
		console.log("CONNECTED TO",location)
		self.mytick()
		servers.addServer(self)
	}
	this.ws.onerror = function() {
		self.myremove()
		ohno("Websocket Error! Refresh in a bit, it might have been restarted...")
	}
	this.ws.onclose = function() {
		console.log("CLOSED",self)
		self.myremove()
	}
	this.ws.onmessage = this.onmessage.bind(this)
}
sock.prototype.dc = function() {
	console.log("DISCON FROM", this)
	if (currentSock==this) {
		currentSock=null
	}
	this.ws.close()
	this.connected = false
}
sock.prototype.remove = function() {
	if (currentSock==this) {
		currentSock=null
	}
	console.log("REMOVING", this)
	servers.removeServer(this)
	document.getElementById("serverlist").removeChild(this.ele)
	new sock(this.location)
}
sock.prototype.tick = function() {
	if (this.connected) {
		this.writePing()
		setTimeout(this.mytick,1000);
	}
}
sock.prototype.onmessage = function(m){
	dv = new DataView(m.data)
	off = 0
	while (off < dv.byteLength) {
		olf = off
		if (this.synced) {
			off = this.readMessage(dv, off)
		} else {
			off = this.handleSync(dv, off-1)
			this.synced = true
		}
		// console.log(off-olf)
	}
}
sock.prototype.readMessage = function(dv, off) {
	t = dv.getUint8(off)
	h = this.messageHandlers[this.messageMap[t]]
	if (!h) {
		console.log("UNKNOWN TYPE", t, "MAPPED TO", this.messageMap[t])
		return off+1000000
	}
	v = h(dv, off)
	return v
}
sock.prototype.handleSync = function(dv, off) {
	l = dv.getUint8(off+1)
	this.messageMap = []
	for(var i=0; i<l; i++) {
		this.messageMap[dv.getUint8(off+2+i)] = i
	}
	return off+l+2
}
sock.prototype.handleNewRoom = function(dv, off) {
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
		
		console.log("NEW ROOM",{width:width,height:height,sm:newroom.sizemultiplier,mass:newroom.startmass})
		return off + 25
}
sock.prototype.handleNewActor = function(dv, off) {
		id = dv.getInt32(off+1, true)
		x = dv.getFloat32(off+5, true)
		y = dv.getFloat32(off+9, true)
		mass = dv.getFloat32(off+13, true)
		console.log("CREATING ACTOR",id,"AT",x,y)
		p = new actor(id, x, y)
		p.mass = mass
		return off + 17
}
sock.prototype.handleNewPellet = function(dv, off) {
		p = new pellet(dv.getInt32(off+1, true), dv.getInt32(off+5, true), dv.getInt32(off+9, true))
		return off + 13
}
sock.prototype.handleRemovePellet = function(dv, off) {
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
sock.prototype.handleNewPlayer = function(dv, off) {
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
sock.prototype.handleRenamePlayer = function(dv, off) {
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
sock.prototype.handleDestroyPlayer = function(dv, off) {
		id = dv.getInt32(off+1, true)
		console.log("DESTROYING PLAYER", id)
		currentRoom.players[id].remove()

		return off + 5
}
sock.prototype.handleOwnPlayer = function(dv, off) {
		id = dv.getInt32(off+1, true)
		console.log("NOW OWNS", id)
		myplayer = currentRoom.players[id]
		return off + 5
}
sock.prototype.handleRemoveActor = function(dv, off) {
		id = dv.getInt32(off+1, true)
		console.log("REMOVING ACTOR", id)
		p = actors[id]
		p.remove()
		return off + 5

}
sock.prototype.handleMoveActor = function(dv, off) {
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
sock.prototype.handleSetMass = function(dv, off) {
		id = dv.getInt32(off+1, true)
		mass = dv.getFloat32(off+5, true)
		p = actors[id]
		p.setmass( mass )
		return off + 9
}
sock.prototype.handleMultiPellet = function(dv, off) {
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
sock.prototype.handleDescribeActor = function(dv, off) {
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
sock.prototype.handlePong = function(dv, off) {
	now = (new Date());
	this.latency = now-this.lastPing;
	console.log("PING",this.latency)
	this.ele.innerHTML = "(PING "+this.latency+"ms) "+this.location
	return off+1
}

sock.prototype.writeJoin = function(name) {
	asString = str2ab(name)
	ab = new ArrayBuffer(1+4+asString.length)
	dv = new DataView(ab)
	dv.setUint8(0,0,true)
	dv.setInt32(1,asString.length,true)
	for(var i=0;i<asString.length;i+=1) {
		dv.setUint8(5+i, asString[i],true)
	}
	this.ws.send(ab)
}

mab = new DataView(new ArrayBuffer(13))
mab.setUint8(0,1,true)
sock.prototype.writeMove = function(id,d,s) {

	mab.setInt32(1,id,true)
	mab.setFloat32(5,d,true)
	mab.setFloat32(9,s,true)
	this.ws.send(mab)
}
sock.prototype.writeSplit = function() {
	sab = new DataView(new ArrayBuffer(1))
	sab.setUint8(0,2,true)
	this.ws.send(sab)
}
sock.prototype.writeSync = function() {
	console.log("SYNCING",this.location)
	actors = {}
	renderable = {}
	steppers = {}
	sab = new DataView(new ArrayBuffer(1))
	sab.setUint8(0,3,true)
	this.ws.send(sab)
}

sock.prototype.writePing = function() {
	this.lastPing = (new Date())
	sab = new DataView(new ArrayBuffer(1))
	sab.setUint8(0,4,true)
	this.ws.send(sab)

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
	servers = new server(document.location.hostname+":4000")
	setQuality(maxQuality-1)
	window.requestAnimationFrame(render)
	window.onresize();
	document.getElementById("loginButton").onclick = function() {
		console.log("JOINING")
		n = document.getElementById("name").value;
		currentSock.writeJoin(n)
	}
}

var resFactor = 1;
window.onresize = function() {
    popup = document.getElementById("mainfloat");
    popup.style.left = ""+String(window.innerWidth/2 - popup.offsetWidth/2)+"px";
    popup.style.top = ""+String(window.innerHeight/2 - popup.offsetHeight/2)+"px";
    canvas.width = window.innerWidth*resFactor;
    canvas.height = window.innerHeight*resFactor;
    canvas.style.width = window.innerWidth;
    canvas.style.height = window.innerHeight;
    canvas.cwidth = window.innerWidth;
    canvas.cheight = window.innerHeight;
    ctx = canvas.getContext("2d")

    console.log("New Cam",camera)
}

var camera = {x:0,y:0,width:canvas.width,height:canvas.height,xscale:1,yscale:1};
camera.bbox = function() {
	return [camera.x,camera.y,camera.x+camera.width,camera.y+camera.height]
}
var ctx = canvas.getContext("2d");

var mousex = canvas.width/2;
var mousey = canvas.height/2;
canvas.onmousemove = function(e) {
	mousex = e.offsetX/canvas.cwidth*canvas.width;
	mousey = e.offsetY/canvas.cheight*canvas.height;
}
canSplit = true
document.onkeydown = function(e) {
    e = e || window.event;

	if (canSplit && e.keyCode == '32') {
    	canSplit = false
    	currentSock.writeSplit()
    }
    if (e.keyCode == '144') {
    	debugMode = true
    }
    if (e.keyCode == '27') {

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


var renderQuality = -1;
var lastFps = (new Date());
var newFps = 0;

function setQuality(q) {
	if (renderQuality!=q) {
		switch (q) {
		case 0:
			resFactor = .4;
			window.onresize();
			break;
		case 1:
			resFactor = .6;
			window.onresize();
			break;
		case 2:
			resFactor = .8;
			window.onresize();
			break;
		case 3:
			resFactor = .9;
			window.onresize();
			break;
		}
	}
	renderQuality=q
}
function render() {
	window.requestAnimationFrame(render)
	newFps += 1
	now = (new Date())
	if (now-lastFps>1000) {
		lastFps = now
		fps = newFps
		newFps = 0

		// if (fps>55) {
		// 	if (renderQuality < maxQuality) {
		// 		setQuality(renderQuality+1)
		// 	}
		// }
		// if (fps<30 + renderQuality*5) {
		// 	if (renderQuality > 0) {
		// 		setQuality(renderQuality-1)
		// 	}
		// }
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
		if (Math.random()<.01) {
			console.log("CAMERA",size)
		}
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