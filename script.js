let sndctx;
let source;
let startTime = 0;
let pausedAt = 0;
let audioBuffer;
let isPlaying = false;
let funct = new Function("t","return 0");

min=Math.min;max=Math.max;

var c = document.getElementById("viz");
var ctx = c.getContext("2d");

ctx.filLStyle = "white"
ctx.fillRect(0,0,400,256);
let hp = [0,0];
if (!sndctx) sndctx = new AudioContext();
let src;
let node;
const op = document.getElementById("hpf");
if (localStorage.getItem("enabledHPF") != undefined) {localStorage.setItem("enabledHPF",false);}
else {op.enabled = localStorage.getItem("enabledHPF");}
op.addEventListener('change',()=>{
	localStorage.setItem("enabledHPF",op.checked);
})

function play() {
	// if (typeof src != "undefined" && typeof node != "undefined") stop();

	document.getElementById("playBtn").disabled = true;
	document.getElementById("stopBtn").disabled = false;
	src = sndctx.createBufferSource();
	node = sndctx.createScriptProcessor(4096,1,1);

	const sr = 48000;
	const faksr = Number(document.getElementById("sr").value) || 8000;
	let cod = document.getElementById("t").value;
	const mathNames = Object.getOwnPropertyNames(Math);
	mathNames.push("int");
	var binded = mathNames.map(k => Math[k]);
	binded[45] = Math.floor;
	let funct = new Function(...mathNames,"t",`return ${cod}`).bind(null, ...binded);
	let mode = document.getElementById("mode").value;
	let advt = 0;
   // index 0 = prev,
   // index 1 = filt
	hp = [0,0];
	let last = 0;
	let w = 0;
	node.onaudioprocess = (audioProcessingEvent)=>{
		let output = audioProcessingEvent.outputBuffer.getChannelData(0);
		const ratio = faksr / sndctx.sampleRate;
		for (let sample = 0; sample < output.length; sample++) {
			let t = (sample+advt*output.length) / 48000 * faksr | 0;
			if (w<=0) {
			switch (mode) {
				case "Bytebeat":
					last = (funct(t) & 255) / 128 - 0.5 || 0;
					break;
				case "Signed Bytebeat":
					last = (funct(t) + 128 & 255) / 128 - 0.5 || 0;
					break;
				case "Floatbeat":
					last = max(min(funct(t)||0,1),-1);
					break;
				case "Bitbeat":
					last = (funct(t)&1)*2-1||0;
					break;
				case "Bitbeat (Alt)":
					last = (funct(t)>1)*2-1||0;
					break;
				case "2048Mode":
					last = (funct(t) & 2047) / 1024 - 0.5 || 0;;
					break;
			}
			w++;
			}
			w-=ratio;
			output[sample]=last;
			hp[0] = output[sample];
			if (op.checked) {
				hp[1] = hp[0]*.001+hp[1]*.999;
			}

			output[sample] = output[sample]-hp[1];

			ctx.fillStyle = "black";
			ctx.fillRect(sample/4096*800,0,1,256);

			ctx.fillStyle = "white";
			ctx.fillRect(sample/4096*800,128-output[sample]*63,1,1);
		}
		advt++;
	};

	src.connect(node);
	node.connect(sndctx.destination);
	src.start();

}

function stop() {
	document.getElementById("playBtn").disabled = false;
	document.getElementById("stopBtn").disabled = true;
	src.disconnect(node);
	node.disconnect(sndctx.destination);
	src.stop();
}

function changeUrl() {
	let url = new URL(window.location.href);
	let info = {form: document.getElementById("t").value, length:Number(document.getElementById("tim").value) || 30, faksr: Number(document.getElementById("sr").value) || 8000, mode: document.getElementById("mode").value};
	let elm = Base64.encodeURI(JSON.stringify(info));
	let encodedForUrl = "v2_"+elm;

	url.searchParams.set("byte",encodedForUrl)

	history.replaceState(null, "", url);
}

function loadUrlData() {
	let params = new URLSearchParams(location.search);

	let raw = params.get("byte");

	if (!raw) return null;

	try {
		if (raw.startsWith("v1_")) {
			return JSON.parse(
				Base64.decode(raw.slice(3))
			);
		}
		else if (raw.startsWith("v2_")) {
			return JSON.parse(
				Base64.decode(raw.slice(3))
			);
		}
	}
	catch (err) {
		console.error("Invalid URL data:", err);
	}

	return null;
}

let data = loadUrlData();

if (data) {
	document.getElementById("t").value = data.form ?? "";
	document.getElementById("tim").value = data.length ?? 60;
	document.getElementById("sr").value = data.faksr ?? 8000;
	document.getElementById("mode").value = data.mode ?? "Bytebeat";
}

document.getElementById("t").addEventListener("input",changeUrl)
document.getElementById("sr").addEventListener("input",changeUrl)
document.getElementById("tim").addEventListener("input",changeUrl)
document.getElementById("mode").onchange = changeUrl;