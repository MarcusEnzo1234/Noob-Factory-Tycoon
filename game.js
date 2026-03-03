import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";

const canvas = document.getElementById("game");

// UI
const menu = document.getElementById("menu");
const startBtn = document.getElementById("startBtn");
const hud = document.getElementById("hud");
const moneyText = document.getElementById("moneyText");

const shop = document.getElementById("shop");
const shopBtn = document.getElementById("shopBtn");
const shopClose = document.getElementById("shopClose");
const buySpeed = document.getElementById("buySpeed");
const buyBoost = document.getElementById("buyBoost");

const tip = document.getElementById("tip");
const tipName = document.getElementById("tipName");
const tipCost = document.getElementById("tipCost");

function clamp(v, a, b){ return Math.max(a, Math.min(b, v)); }

// ---------- Three Setup ----------
const renderer = new THREE.WebGLRenderer({ canvas, antialias:true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x9fd5ff); // bright sky-ish like screenshot

const camera = new THREE.PerspectiveCamera(70, innerWidth/innerHeight, 0.1, 500);

// lights
scene.add(new THREE.HemisphereLight(0xffffff, 0x445566, 0.85));
const sun = new THREE.DirectionalLight(0xffffff, 1.0);
sun.position.set(30, 45, 20);
scene.add(sun);

// ---------- World (flat base + trees + grid) ----------
const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(300, 300),
  new THREE.MeshStandardMaterial({ color: 0x7cc06a, roughness: 1.0 })
);
ground.rotation.x = -Math.PI/2;
scene.add(ground);

// tycoon plot grid like screenshot
const plotSize = 70;
const plot = new THREE.Mesh(
  new THREE.PlaneGeometry(plotSize, plotSize),
  new THREE.MeshStandardMaterial({ color: 0x6fbf6d, roughness: 1.0 })
);
plot.rotation.x = -Math.PI/2;
plot.position.set(0, 0.02, 0);
scene.add(plot);

const grid = new THREE.GridHelper(plotSize, 20, 0x2b6e35, 0x2b6e35);
grid.position.set(0, 0.03, 0);
scene.add(grid);

// plot border
const borderMat = new THREE.MeshStandardMaterial({ color: 0xa06a4d, roughness: 0.95 });
function borderPiece(w,h,d,x,z){
  const m = new THREE.Mesh(new THREE.BoxGeometry(w,h,d), borderMat);
  m.position.set(x, h/2, z);
  scene.add(m);
}
const bw = plotSize, bh = 1.2, bt = 2.2;
borderPiece(bw+bt, bh, bt, 0, -plotSize/2 - bt/2);
borderPiece(bw+bt, bh, bt, 0,  plotSize/2 + bt/2);
borderPiece(bt, bh, bw, -plotSize/2 - bt/2, 0);
borderPiece(bt, bh, bw,  plotSize/2 + bt/2, 0);

// simple lowpoly trees
function makeTree(x,z){
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.5,0.6,4,6),
    new THREE.MeshStandardMaterial({ color: 0x6a3f2b, roughness: 1.0 })
  );
  trunk.position.set(x, 2, z);
  const top = new THREE.Mesh(
    new THREE.BoxGeometry(3.5,3.5,3.5),
    new THREE.MeshStandardMaterial({ color: 0x2f7d3a, roughness: 1.0 })
  );
  top.position.set(x, 5.2, z);
  scene.add(trunk, top);
}
for (let i=0;i<16;i++){
  const x = (Math.random()*220)-110;
  const z = (Math.random()*220)-110;
  if (Math.abs(x) < plotSize/2 + 10 && Math.abs(z) < plotSize/2 + 10) continue;
  makeTree(x,z);
}

// ---------- Roblox-style Noob ----------
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
  ctx.arc(128, 150, 60, 0.15*Math.PI, 0.85*Math.PI);
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
noob.position.set(-20, 0, 10);

// ---------- Tycoon System ----------
const state = {
  running: false,
  money: 150, // matches screenshot vibe
  speed: 9,
  incomeBoost: 0,
  machinesBuilt: new Set(),
};

function setMoney(v){
  state.money = Math.max(0, Math.floor(v));
  moneyText.textContent = `$${state.money}`;
}
setMoney(state.money);

// machines list (pads unlock these)
const machineDefs = [
  { id:"smallDropper",  name:"Small Dropper",    cost:0,   income: 5,  color:0x9cff57 },
  { id:"conveyor",      name:"Conveyor Belt",    cost:50,  income: 0,  color:0x5ff4ff },
  { id:"mediumDropper", name:"Medium Dropper",   cost:100, income: 12, color:0xa889ff },
  { id:"refinery",      name:"Refinery",         cost:200, income: 25, color:0xff7d7d },
  { id:"megaDropper",   name:"Mega Dropper",     cost:300, income: 40, color:0xffd24a },
];

// pad meshes for raycast hover
const pads = [];
const padToDef = new Map();

function makePad(def, x, z){
  const g = new THREE.Group();
  g.position.set(x, 0, z);

  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(3.5, 3.5, 0.6, 32),
    new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 })
  );
  base.position.y = 0.3;

  const ring = new THREE.Mesh(
    new THREE.CylinderGeometry(3.2, 3.2, 0.22, 32),
    new THREE.MeshStandardMaterial({ color: def.color, emissive: def.color, emissiveIntensity: 0.35, roughness: 0.5 })
  );
  ring.position.y = 0.62;

  const item = new THREE.Mesh(
    new THREE.BoxGeometry(1.8, 1.8, 1.8),
    new THREE.MeshStandardMaterial({ color: def.color, roughness: 0.65 })
  );
  item.position.y = 1.6;

  g.add(base, ring, item);
  scene.add(g);

  // store for hover raycast (use ring)
  ring.userData.isPad = true;
  ring.userData.defId = def.id;
  pads.push(ring);
  padToDef.set(def.id, def);

  return g;
}

// pad layout like screenshot (cluster)
makePad(machineDefs[0],  25,  25);   // Small Dropper FREE-ish
makePad(machineDefs[1],  10,  10);   // Conveyor
makePad(machineDefs[2],   0,   0);   // Medium
makePad(machineDefs[3],  18,  -6);   // Refinery
makePad(machineDefs[4],  -8,   6);   // Mega

// ---------- Income over time ----------
let incomeTimer = 0;
function getIncomePerTick(){
  let income = 0;
  for (const def of machineDefs){
    if (state.machinesBuilt.has(def.id)) income += def.income;
  }
  income += state.incomeBoost;
  return income;
}

// ---------- Character movement (WASD) + 3rd person camera ----------
const keys = new Set();
window.addEventListener("keydown", (e)=>{
  keys.add(e.code);

  // press E to buy if hovering
  if (e.code === "KeyE" && state.running){
    if (hoveredPad) tryBuyHovered();
  }
});
window.addEventListener("keyup", (e)=> keys.delete(e.code));

let camYaw = -0.9;   // nice angle like screenshot
let camPitch = 0.35;
let dragging = false;
let lastX = 0;
let lastY = 0;

window.addEventListener("mousedown",(e)=>{
  if (!state.running) return;
  // right mouse drag to rotate camera
  if (e.button === 2){
    dragging = true;
    lastX = e.clientX;
    lastY = e.clientY;
  }
});
window.addEventListener("mouseup",(e)=>{
  if (e.button === 2) dragging = false;
});
window.addEventListener("contextmenu",(e)=> e.preventDefault());

window.addEventListener("mousemove",(e)=>{
  if (!state.running) return;
  if (!dragging) return;
  const dx = e.clientX - lastX;
  const dy = e.clientY - lastY;
  lastX = e.clientX; lastY = e.clientY;

  camYaw -= dx * 0.006;
  camPitch = clamp(camPitch - dy * 0.006, 0.12, 0.85);
});

function updateNoob(dt){
  // direction based on camera yaw
  const forward = new THREE.Vector3(Math.sin(camYaw), 0, Math.cos(camYaw));
  const right   = new THREE.Vector3(forward.z, 0, -forward.x);

  let move = new THREE.Vector3(0,0,0);
  if (keys.has("KeyW")) move.add(forward);
  if (keys.has("KeyS")) move.sub(forward);
  if (keys.has("KeyA")) move.sub(right);
  if (keys.has("KeyD")) move.add(right);

  if (move.lengthSq() > 0){
    move.normalize();
    noob.position.addScaledVector(move, state.speed * dt);

    // rotate noob to face move direction
    const ang = Math.atan2(move.x, move.z);
    noob.rotation.y = ang;
  }

  // keep inside world bounds
  noob.position.x = clamp(noob.position.x, -120, 120);
  noob.position.z = clamp(noob.position.z, -120, 120);
  noob.position.y = 0;
}

function updateCamera(){
  const dist = 16;
  const height = 10;

  const cx = noob.position.x - Math.sin(camYaw) * dist;
  const cz = noob.position.z - Math.cos(camYaw) * dist;
  const cy = noob.position.y + height * camPitch + 3;

  camera.position.set(cx, cy, cz);
  camera.lookAt(noob.position.x, noob.position.y + 3.2, noob.position.z);
}

// ---------- Hover tooltip with raycaster ----------
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2(0,0);
let hoveredPad = null;

window.addEventListener("mousemove", (e)=>{
  const rect = renderer.domElement.getBoundingClientRect();
  mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);

  // move tooltip near cursor
  tip.style.left = `${e.clientX + 14}px`;
  tip.style.top  = `${e.clientY + 14}px`;
});

function updateHover(){
  if (!state.running){
    tip.classList.add("hidden");
    hoveredPad = null;
    return;
  }

  raycaster.setFromCamera(mouse, camera);
  const hits = raycaster.intersectObjects(pads, false);

  if (hits.length === 0){
    tip.classList.add("hidden");
    hoveredPad = null;
    return;
  }

  hoveredPad = hits[0].object;
  const def = padToDef.get(hoveredPad.userData.defId);
  if (!def){
    tip.classList.add("hidden");
    hoveredPad = null;
    return;
  }

  tipName.textContent = def.name;
  tipCost.textContent = def.cost === 0 ? "FREE!" : `$${def.cost}`;
  tip.classList.remove("hidden");
}

function tryBuyHovered(){
  const def = padToDef.get(hoveredPad.userData.defId);
  if (!def) return;

  if (state.machinesBuilt.has(def.id)) return; // already owned

  if (def.cost > state.money) return; // not enough

  // buy
  setMoney(state.money - def.cost);
  state.machinesBuilt.add(def.id);

  // small feedback: brighten pad
  hoveredPad.material.emissiveIntensity = 0.6;
}

// ---------- Build some visible machines when purchased ----------
const machineObjects = new Map();

function spawnMachine(def){
  if (machineObjects.has(def.id)) return;

  const g = new THREE.Group();
  g.position.set(-10 + Math.random()*12, 0, -8 + Math.random()*12);

  const base = new THREE.Mesh(
    new THREE.BoxGeometry(6, 1, 6),
    new THREE.MeshStandardMaterial({ color: 0x2b2b2b, roughness: 0.9 })
  );
  base.position.y = 0.5;

  const body = new THREE.Mesh(
    new THREE.BoxGeometry(3.5, 4, 3.5),
    new THREE.MeshStandardMaterial({ color: def.color, roughness: 0.7 })
  );
  body.position.y = 3;

  const glow = new THREE.Mesh(
    new THREE.BoxGeometry(3.8, 0.25, 3.8),
    new THREE.MeshStandardMaterial({ color: 0x111111, emissive: def.color, emissiveIntensity: 0.25 })
  );
  glow.position.y = 1.2;

  g.add(base, glow, body);
  scene.add(g);
  machineObjects.set(def.id, g);
}

function syncMachines(){
  for (const def of machineDefs){
    if (state.machinesBuilt.has(def.id)) spawnMachine(def);
  }
}

// ---------- Shop GUI ----------
function toggleShop(on){
  const open = (typeof on === "boolean") ? on : shop.classList.contains("hidden");
  shop.classList.toggle("hidden", !open);
}
shopBtn.addEventListener("click", ()=> toggleShop(true));
shopClose.addEventListener("click", ()=> toggleShop(false));

buySpeed.addEventListener("click", ()=>{
  const cost = 60;
  if (state.money < cost) return;
  setMoney(state.money - cost);
  state.speed = Math.min(14, state.speed + 1.2);
});

buyBoost.addEventListener("click", ()=>{
  const cost = 120;
  if (state.money < cost) return;
  setMoney(state.money - cost);
  state.incomeBoost += 1;
});

// ---------- Start game transition ----------
startBtn.addEventListener("click", ()=>{
  menu.style.display = "none";
  hud.classList.remove("hidden");
  state.running = true;

  // give FREE small dropper at start like screenshot
  state.machinesBuilt.add("smallDropper");
  syncMachines();
});

// ---------- Loop ----------
const clock = new THREE.Clock();

function tick(){
  const dt = Math.min(clock.getDelta(), 0.05);

  if (state.running){
    updateNoob(dt);
    updateCamera();
    updateHover();

    // income tick (like tycoon cash)
    incomeTimer += dt;
    if (incomeTimer >= 1.0){
      incomeTimer = 0;
      const inc = getIncomePerTick();
      if (inc > 0) setMoney(state.money + inc);
    }

    syncMachines();
  } else {
    // menu camera idle
    camera.position.set(0, 45, 55);
    camera.lookAt(0, 0, 0);
  }

  renderer.render(scene, camera);
  requestAnimationFrame(tick);
}

tick();

// resize
window.addEventListener("resize", ()=>{
  renderer.setSize(innerWidth, innerHeight);
  camera.aspect = innerWidth/innerHeight;
  camera.updateProjectionMatrix();
});
