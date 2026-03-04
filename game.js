import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";

const canvas = document.getElementById("game");

// UI
const menu = document.getElementById("menu");
const startBtn = document.getElementById("startBtn");
const hud = document.getElementById("hud");
const moneyText = document.getElementById("moneyText");

const hoverTip = document.getElementById("hoverTip");
const hoverTitle = document.getElementById("hoverTitle");
const hoverSub = document.getElementById("hoverSub");

function clamp(v, a, b){ return Math.max(a, Math.min(b, v)); }

// ---------- Renderer / Scene ----------
const renderer = new THREE.WebGLRenderer({ canvas, antialias:true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x9fd5ff);

const camera = new THREE.PerspectiveCamera(70, innerWidth/innerHeight, 0.1, 800);

scene.add(new THREE.HemisphereLight(0xffffff, 0x556677, 0.9));
const sun = new THREE.DirectionalLight(0xffffff, 1.0);
sun.position.set(30, 45, 20);
scene.add(sun);

// ---------- World (plot like screenshot) ----------
const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(400, 400),
  new THREE.MeshStandardMaterial({ color: 0x7fc36e, roughness: 1.0 })
);
ground.rotation.x = -Math.PI/2;
scene.add(ground);

const plotSize = 72;
const plot = new THREE.Mesh(
  new THREE.PlaneGeometry(plotSize, plotSize),
  new THREE.MeshStandardMaterial({ color: 0x74bf6f, roughness: 1.0 })
);
plot.rotation.x = -Math.PI/2;
plot.position.y = 0.02;
scene.add(plot);

const grid = new THREE.GridHelper(plotSize, 24, 0x2d6f37, 0x2d6f37);
grid.position.y = 0.03;
scene.add(grid);

// border
const borderMat = new THREE.MeshStandardMaterial({ color: 0xa46d50, roughness: 0.95 });
function borderPiece(w,h,d,x,z){
  const m = new THREE.Mesh(new THREE.BoxGeometry(w,h,d), borderMat);
  m.position.set(x, h/2, z);
  scene.add(m);
}
const bw = plotSize, bh = 1.2, bt = 2.4;
borderPiece(bw+bt, bh, bt, 0, -plotSize/2 - bt/2);
borderPiece(bw+bt, bh, bt, 0,  plotSize/2 + bt/2);
borderPiece(bt, bh, bw, -plotSize/2 - bt/2, 0);
borderPiece(bt, bh, bw,  plotSize/2 + bt/2, 0);

// trees outside
function makeTree(x,z){
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.55,0.65,4,6),
    new THREE.MeshStandardMaterial({ color: 0x6a3f2b, roughness: 1.0 })
  );
  trunk.position.set(x, 2, z);
  const top = new THREE.Mesh(
    new THREE.BoxGeometry(3.6,3.6,3.6),
    new THREE.MeshStandardMaterial({ color: 0x2f7d3a, roughness: 1.0 })
  );
  top.position.set(x, 5.2, z);
  scene.add(trunk, top);
}
for (let i=0;i<18;i++){
  const x = (Math.random()*280)-140;
  const z = (Math.random()*280)-140;
  if (Math.abs(x) < plotSize/2 + 12 && Math.abs(z) < plotSize/2 + 12) continue;
  makeTree(x,z);
}

// ---------- Roblox Noob ----------
function makeSmileyTexture(){
  const c = document.createElement("canvas");
  c.width = 256; c.height = 256;
  const ctx = c.getContext("2d");

  ctx.fillStyle = "#ffd54a";
  ctx.fillRect(0,0,256,256);

  ctx.fillStyle = "#111";
  ctx.beginPath(); ctx.arc(92, 110, 14, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(164, 110, 14, 0, Math.PI*2); ctx.fill();

  ctx.strokeStyle = "#111";
  ctx.lineWidth = 16;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.arc(128, 152, 62, 0.15*Math.PI, 0.85*Math.PI);
  ctx.stroke();

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

const noob = new THREE.Group();
scene.add(noob);

const matYellow = new THREE.MeshStandardMaterial({ color: 0xffd54a, roughness: 0.9 });
const matBlue   = new THREE.MeshStandardMaterial({ color: 0x2f6bff, roughness: 0.85 });
const matGreen  = new THREE.MeshStandardMaterial({ color: 0x2fd25a, roughness: 0.85 });

const head = new THREE.Mesh(
  new THREE.BoxGeometry(1.15,1.15,1.15),
  new THREE.MeshStandardMaterial({ map: makeSmileyTexture(), roughness: 0.85 })
);
head.position.set(0, 3.0, 0);

const torso = new THREE.Mesh(new THREE.BoxGeometry(1.55, 1.7, 0.9), matBlue);
torso.position.set(0, 1.95, 0);

const armL = new THREE.Mesh(new THREE.BoxGeometry(0.55,1.55,0.55), matYellow);
armL.position.set(-1.1, 1.95, 0);

const armR = new THREE.Mesh(new THREE.BoxGeometry(0.55,1.55,0.55), matYellow);
armR.position.set( 1.1, 1.95, 0);

const legL = new THREE.Mesh(new THREE.BoxGeometry(0.7,1.6,0.7), matGreen);
legL.position.set(-0.45, 0.8, 0);

const legR = new THREE.Mesh(new THREE.BoxGeometry(0.7,1.6,0.7), matGreen);
legR.position.set( 0.45, 0.8, 0);

noob.add(head, torso, armL, armR, legL, legR);
noob.position.set(-18, 0, 12);

// ---------- Controls / Camera ----------
const keys = new Set();
window.addEventListener("keydown", (e)=> keys.add(e.code));
window.addEventListener("keyup", (e)=> keys.delete(e.code));

let running = false;

let camYaw = -0.85;   // same vibe as screenshot angle
let camPitch = 0.33;
let dragging = false;
let lastX=0, lastY=0;

window.addEventListener("contextmenu", (e)=> e.preventDefault());
window.addEventListener("mousedown", (e)=>{
  if (!running) return;
  if (e.button === 2){
    dragging = true;
    lastX = e.clientX; lastY = e.clientY;
  }
});
window.addEventListener("mouseup", (e)=>{
  if (e.button === 2) dragging = false;
});
window.addEventListener("mousemove", (e)=>{
  // tooltip follows cursor
  hoverTip.style.left = `${e.clientX + 14}px`;
  hoverTip.style.top = `${e.clientY + 14}px`;

  if (!running || !dragging) return;
  const dx = e.clientX - lastX;
  const dy = e.clientY - lastY;
  lastX = e.clientX; lastY = e.clientY;
  camYaw -= dx * 0.006;
  camPitch = clamp(camPitch - dy * 0.006, 0.12, 0.85);
});

// ---------- Money / Tycoon ----------
const state = {
  money: 150,
  speed: 9.5,
  incomeBoost: 0,
  owned: new Set(),
};

function setMoney(v){
  state.money = Math.max(0, Math.floor(v));
  moneyText.textContent = `$${state.money}`;
}
setMoney(state.money);

// ---------- Pads + Labels (the BIG screenshot feature) ----------
const padDefs = [
  { id:"small",   name:"Small Dropper",   cost:0,    perSec:5,  color:0x9cff57, labelPos:new THREE.Vector3(0,0,0) },
  { id:"conv",    name:"Conveyor Belt",   cost:50,   perSec:0,  color:0x5ff4ff, labelPos:new THREE.Vector3(0,0,0) },
  { id:"ref",     name:"Refinery",        cost:75,   perSec:8,  color:0x4dd6ff, labelPos:new THREE.Vector3(0,0,0) },
  { id:"med",     name:"Medium Dropper",  cost:100,  perSec:12, color:0xa889ff, labelPos:new THREE.Vector3(0,0,0) },
  { id:"mega",    name:"Mega Dropper",    cost:250,  perSec:25, color:0xffd24a, labelPos:new THREE.Vector3(0,0,0) },
  { id:"quant",   name:"Quantum Processor",cost:500, perSec:55, color:0xff7d7d, labelPos:new THREE.Vector3(0,0,0) },
];

const pads = [];
const defById = new Map(padDefs.map(d=>[d.id,d]));

// 2D labels in 3D using Sprite
function makeLabelSprite(textLines){
  const c = document.createElement("canvas");
  c.width = 512; c.height = 256;
  const ctx = c.getContext("2d");

  // background
  ctx.fillStyle = "rgba(0,0,0,0.55)";
  roundRect(ctx, 10, 10, 492, 236, 18);
  ctx.fill();

  // text
  ctx.fillStyle = "rgba(255,255,255,0.95)";
  ctx.font = "bold 44px system-ui, Arial";
  ctx.textBaseline = "top";
  ctx.fillText(textLines[0], 26, 24);

  if (textLines[1]) {
    ctx.fillStyle = "rgba(234,240,255,0.9)";
    ctx.font = "bold 34px system-ui, Arial";
    ctx.fillText(textLines[1], 26, 82);
  }

  // price pill
  if (textLines[2]) {
    const pillText = textLines[2];
    const w = ctx.measureText(pillText).width + 42;
    const x = 26;
    const y = 150;
    ctx.fillStyle = "rgba(47,158,68,0.95)";
    roundRect(ctx, x, y, w, 62, 16);
    ctx.fill();

    ctx.fillStyle = "white";
    ctx.font = "900 34px system-ui, Arial";
    ctx.fillText(pillText, x + 18, y + 14);
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.SpriteMaterial({ map: tex, transparent:true });
  const spr = new THREE.Sprite(mat);
  spr.scale.set(10, 5, 1); // size in world
  return spr;
}

function roundRect(ctx, x, y, w, h, r){
  ctx.beginPath();
  ctx.moveTo(x+r, y);
  ctx.arcTo(x+w, y, x+w, y+h, r);
  ctx.arcTo(x+w, y+h, x, y+h, r);
  ctx.arcTo(x, y+h, x, y, r);
  ctx.arcTo(x, y, x+w, y, r);
  ctx.closePath();
}

function makePad(def, x, z){
  const group = new THREE.Group();
  group.position.set(x, 0, z);

  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(3.6, 3.6, 0.65, 40),
    new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.92 })
  );
  base.position.y = 0.32;

  const ring = new THREE.Mesh(
    new THREE.CylinderGeometry(3.25, 3.25, 0.22, 40),
    new THREE.MeshStandardMaterial({
      color: def.color,
      emissive: def.color,
      emissiveIntensity: 0.30,
      roughness: 0.6
    })
  );
  ring.position.y = 0.62;

  const item = new THREE.Mesh(
    new THREE.BoxGeometry(1.9, 1.9, 1.9),
    new THREE.MeshStandardMaterial({ color: def.color, roughness: 0.7 })
  );
  item.position.y = 1.7;

  // label like screenshot (stacked black box with green price)
  const lockedText = def.cost === 0 ? "" : `LOCKED ($${def.cost})`;
  const priceText = def.cost === 0 ? "FREE!" : `$${def.cost}`;
  const spr = makeLabelSprite([def.name, lockedText, priceText]);
  spr.position.set(4.2, 4.8, 0); // offset like screenshot
  group.add(spr);

  group.add(base, ring, item);
  scene.add(group);

  ring.userData.isPad = true;
  ring.userData.defId = def.id;
  pads.push(ring);

  return { group, ring, label: spr, defId: def.id };
}

// layout cluster similar to screenshot
const padObjs = [];
padObjs.push(makePad(defById.get("small"),  26,  24));
padObjs.push(makePad(defById.get("conv"),   14,  10));
padObjs.push(makePad(defById.get("ref"),    28,   6));
padObjs.push(makePad(defById.get("med"),     4,   2));
padObjs.push(makePad(defById.get("mega"),   -6,  10));
padObjs.push(makePad(defById.get("quant"),   10, -2));

// buy by standing on pad + press E
function distXZ(a, b){
  const dx = a.x - b.x;
  const dz = a.z - b.z;
  return Math.hypot(dx, dz);
}

function tryBuyNearest(){
  let best = null;
  let bestD = 999;
  for (const p of padObjs){
    const d = distXZ(noob.position, p.group.position);
    if (d < bestD){ bestD = d; best = p; }
  }
  if (!best || bestD > 4.2) return;

  const def = defById.get(best.defId);
  if (!def) return;
  if (state.owned.has(def.id)) return;
  if (def.cost > state.money) return;

  // buy
  setMoney(state.money - def.cost);
  state.owned.add(def.id);

  // make label show "OWNED"
  const spr = best.label;
  spr.material.map.dispose();
  spr.material.map = makeLabelSprite([def.name, "OWNED", ""]).material.map;
  spr.material.needsUpdate = true;

  // brighten ring
  best.ring.material.emissiveIntensity = 0.55;
}

window.addEventListener("keydown", (e)=>{
  if (!running) return;
  if (e.code === "KeyE") tryBuyNearest();
});

// income per second
let incomeTimer = 0;
function incomePerSec(){
  let sum = 0;
  for (const def of padDefs){
    if (state.owned.has(def.id)) sum += def.perSec;
  }
  sum += state.incomeBoost;
  return sum;
}

// ---------- Hover (small helper tip) ----------
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2(0,0);
window.addEventListener("mousemove", (e)=>{
  const rect = renderer.domElement.getBoundingClientRect();
  mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
});

function updateHover(){
  if (!running){
    hoverTip.classList.add("hidden");
    return;
  }
  raycaster.setFromCamera(mouse, camera);
  const hits = raycaster.intersectObjects(pads, false);
  if (hits.length === 0){
    hoverTip.classList.add("hidden");
    return;
  }
  const obj = hits[0].object;
  const def = defById.get(obj.userData.defId);
  if (!def){
    hoverTip.classList.add("hidden");
    return;
  }
  hoverTitle.textContent = def.name;
  hoverSub.textContent = state.owned.has(def.id) ? "Owned" : (def.cost === 0 ? "Press E to claim" : "Press E to buy");
  hoverTip.classList.remove("hidden");
}

// ---------- Movement + 3rd person camera ----------
function updateNoob(dt){
  const forward = new THREE.Vector3(Math.sin(camYaw), 0, Math.cos(camYaw));
  const right   = new THREE.Vector3(forward.z, 0, -forward.x);

  const move = new THREE.Vector3(0,0,0);
  if (keys.has("KeyW")) move.add(forward);
  if (keys.has("KeyS")) move.sub(forward);
  if (keys.has("KeyA")) move.sub(right);
  if (keys.has("KeyD")) move.add(right);

  if (move.lengthSq() > 0){
    move.normalize();
    noob.position.addScaledVector(move, state.speed * dt);
    noob.rotation.y = Math.atan2(move.x, move.z);
  }

  noob.position.x = clamp(noob.position.x, -140, 140);
  noob.position.z = clamp(noob.position.z, -140, 140);
  noob.position.y = 0;
}

function updateCamera(){
  const dist = 18;
  const height = 10;

  const cx = noob.position.x - Math.sin(camYaw) * dist;
  const cz = noob.position.z - Math.cos(camYaw) * dist;
  const cy = noob.position.y + height * camPitch + 3.2;

  camera.position.set(cx, cy, cz);
  camera.lookAt(noob.position.x, noob.position.y + 3.2, noob.position.z);
}

// ---------- Start ----------
startBtn.addEventListener("click", ()=>{
  menu.style.display = "none";
  hud.classList.remove("hidden");
  running = true;

  // give small dropper free (like screenshot)
  state.owned.add("small");
});

// ---------- Loop ----------
const clock = new THREE.Clock();

function tick(){
  const dt = Math.min(clock.getDelta(), 0.05);

  if (running){
    updateNoob(dt);
    updateCamera();
    updateHover();

    incomeTimer += dt;
    if (incomeTimer >= 1){
      incomeTimer = 0;
      const inc = incomePerSec();
      if (inc > 0) setMoney(state.money + inc);
    }
  } else {
    // menu camera
    camera.position.set(0, 45, 65);
    camera.lookAt(0, 0, 0);
  }

  renderer.render(scene, camera);
  requestAnimationFrame(tick);
}
tick();

window.addEventListener("resize", ()=>{
  renderer.setSize(innerWidth, innerHeight);
  camera.aspect = innerWidth/innerHeight;
  camera.updateProjectionMatrix();
});
