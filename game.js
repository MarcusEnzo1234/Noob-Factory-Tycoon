import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";

const canvas = document.getElementById("c");

// UI
const menu = document.getElementById("menu");
const btnPlay = document.getElementById("btnPlay");
const btnHow = document.getElementById("btnHow");
const howPanel = document.getElementById("howPanel");

const hud = document.getElementById("hud");
const crosshair = document.getElementById("crosshair");
const moneyEl = document.getElementById("money");

const shop = document.getElementById("shop");
const shopClose = document.getElementById("shopClose");
const buyDropperBtn = document.getElementById("buyDropper");
const buyConveyorBtn = document.getElementById("buyConveyor");
const buyBonusBtn = document.getElementById("buyBonus");
const buySpeedBtn = document.getElementById("buySpeed");

// ---------- Helpers ----------
function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

function makeSmileyTexture() {
  const c = document.createElement("canvas");
  c.width = 256; c.height = 256;
  const ctx = c.getContext("2d");

  // yellow head
  ctx.fillStyle = "#ffd54a";
  ctx.fillRect(0, 0, c.width, c.height);

  // eyes + smile (Roblox-ish)
  ctx.fillStyle = "#111";
  ctx.beginPath(); ctx.arc(85, 100, 14, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(171, 100, 14, 0, Math.PI * 2); ctx.fill();

  ctx.strokeStyle = "#111";
  ctx.lineWidth = 16;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.arc(128, 150, 58, 0.1 * Math.PI, 0.9 * Math.PI);
  ctx.stroke();

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

// ---------- Three.js Setup ----------
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x070a12);

const camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.1, 250);
camera.position.set(0, 4.5, 10);

const ambient = new THREE.AmbientLight(0xffffff, 0.55);
scene.add(ambient);

const sun = new THREE.DirectionalLight(0xffffff, 1.0);
sun.position.set(12, 22, 10);
sun.castShadow = false;
scene.add(sun);

const hemi = new THREE.HemisphereLight(0x9ad7ff, 0x2b2b2b, 0.55);
scene.add(hemi);

// Ground
const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(200, 200),
  new THREE.MeshStandardMaterial({ color: 0x0f1524, roughness: 0.95, metalness: 0.0 })
);
ground.rotation.x = -Math.PI / 2;
ground.position.y = 0;
scene.add(ground);

// Subtle grid
const grid = new THREE.GridHelper(200, 80, 0x2b395a, 0x17233b);
grid.position.y = 0.01;
scene.add(grid);

// ---------- Player (Roblox Noob) ----------
const player = new THREE.Group();
scene.add(player);

const headTex = makeSmileyTexture();
const matYellow = new THREE.MeshStandardMaterial({ color: 0xffd54a, roughness: 0.8 });
const matBlue = new THREE.MeshStandardMaterial({ color: 0x2f6bff, roughness: 0.75 });
const matGreen = new THREE.MeshStandardMaterial({ color: 0x2fd25a, roughness: 0.75 });

const head = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.1, 1.1), new THREE.MeshStandardMaterial({ map: headTex, roughness: 0.75 }));
head.position.set(0, 2.55, 0);

const torso = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.6, 0.9), matBlue);
torso.position.set(0, 1.55, 0);

const armL = new THREE.Mesh(new THREE.BoxGeometry(0.55, 1.4, 0.55), matYellow);
armL.position.set(-1.05, 1.55, 0);

const armR = new THREE.Mesh(new THREE.BoxGeometry(0.55, 1.4, 0.55), matYellow);
armR.position.set(1.05, 1.55, 0);

const legL = new THREE.Mesh(new THREE.BoxGeometry(0.65, 1.4, 0.65), matGreen);
legL.position.set(-0.45, 0.55, 0);

const legR = new THREE.Mesh(new THREE.BoxGeometry(0.65, 1.4, 0.65), matGreen);
legR.position.set(0.45, 0.55, 0);

player.add(head, torso, armL, armR, legL, legR);
player.position.set(0, 0, 8);

// Camera rig (FPS-ish)
let yaw = 0;
let pitch = 0;

const camRig = new THREE.Group();
camRig.position.copy(player.position);
scene.add(camRig);
camRig.add(camera);
camera.position.set(0, 2.6, 0); // first-person view height

// ---------- Input / Pointer Lock ----------
const keys = new Set();
let running = false;
let pointerLocked = false;

window.addEventListener("keydown", (e) => {
  keys.add(e.code);

  if (e.code === "Tab") {
    e.preventDefault();
    if (running) toggleShop();
  }
});
window.addEventListener("keyup", (e) => keys.delete(e.code));

function requestLock() {
  if (!pointerLocked) canvas.requestPointerLock();
}

document.addEventListener("pointerlockchange", () => {
  pointerLocked = (document.pointerLockElement === canvas);
  crosshair.classList.toggle("hidden", !pointerLocked);
});

window.addEventListener("mousemove", (e) => {
  if (!pointerLocked || !running) return;
  const sens = 0.0022;
  yaw -= e.movementX * sens;
  pitch -= e.movementY * sens;
  pitch = clamp(pitch, -1.1, 1.1);
});

// Click canvas to lock
canvas.addEventListener("mousedown", () => {
  if (!running) return;
  if (!shop.classList.contains("hidden")) return;
  requestLock();
});

// ---------- Tycoon World ----------
const tycoon = {
  money: 0,
  dropperCount: 1,
  coinValue: 1,
  conveyorSpeed: 1.0,
  moveSpeed: 7.0,
  coins: [],
  lastDrop: 0,
  dropInterval: 0.65,
};

function setMoney(v) {
  tycoon.money = Math.max(0, Math.floor(v));
  moneyEl.textContent = tycoon.money.toString();
}

function canAfford(cost) { return tycoon.money >= cost; }

function spend(cost) {
  if (!canAfford(cost)) return false;
  setMoney(tycoon.money - cost);
  return true;
}

// Base platform
const base = new THREE.Mesh(
  new THREE.BoxGeometry(16, 0.8, 14),
  new THREE.MeshStandardMaterial({ color: 0x111a2e, roughness: 0.85 })
);
base.position.set(0, 0.4, -8);
scene.add(base);

// Neon trims
const trim = new THREE.Mesh(
  new THREE.BoxGeometry(16.2, 0.12, 14.2),
  new THREE.MeshStandardMaterial({ color: 0x0a152a, emissive: 0x2244ff, emissiveIntensity: 0.25 })
);
trim.position.set(0, 0.84, -8);
scene.add(trim);

// Dropper (spawns coins)
const dropperGroup = new THREE.Group();
dropperGroup.position.set(-5.4, 1.1, -12);
scene.add(dropperGroup);

const dropperBody = new THREE.Mesh(
  new THREE.BoxGeometry(2.0, 2.0, 2.0),
  new THREE.MeshStandardMaterial({ color: 0x1a2a4a, roughness: 0.75, metalness: 0.1 })
);
dropperBody.position.y = 1.0;

const dropperNozzle = new THREE.Mesh(
  new THREE.BoxGeometry(0.6, 0.6, 0.6),
  new THREE.MeshStandardMaterial({ color: 0x33e6ff, emissive: 0x33e6ff, emissiveIntensity: 0.6, roughness: 0.4 })
);
dropperNozzle.position.set(0, 0.2, 1.1);

dropperGroup.add(dropperBody, dropperNozzle);

// Conveyor
const conveyor = new THREE.Mesh(
  new THREE.BoxGeometry(10.0, 0.35, 2.2),
  new THREE.MeshStandardMaterial({ color: 0x1b2236, roughness: 0.95 })
);
conveyor.position.set(0.2, 1.0, -10.2);
scene.add(conveyor);

const conveyorGlow = new THREE.Mesh(
  new THREE.BoxGeometry(10.0, 0.06, 2.2),
  new THREE.MeshStandardMaterial({ color: 0x0b1224, emissive: 0x33e6ff, emissiveIntensity: 0.18 })
);
conveyorGlow.position.set(0.2, 1.2, -10.2);
scene.add(conveyorGlow);

// Collector
const collector = new THREE.Mesh(
  new THREE.BoxGeometry(2.8, 1.7, 2.8),
  new THREE.MeshStandardMaterial({ color: 0x14213d, roughness: 0.7, metalness: 0.1 })
);
collector.position.set(5.8, 1.25, -10.2);
scene.add(collector);

const collectorRing = new THREE.Mesh(
  new THREE.TorusGeometry(1.15, 0.12, 18, 40),
  new THREE.MeshStandardMaterial({ color: 0x40ff8a, emissive: 0x40ff8a, emissiveIntensity: 0.5, roughness: 0.4 })
);
collectorRing.rotation.x = Math.PI / 2;
collectorRing.position.copy(collector.position).add(new THREE.Vector3(0, 1.0, 0));
scene.add(collectorRing);

// Buy pads (in-world)
const pads = [];
function makePad(label, cost, pos, onBuy) {
  const g = new THREE.Group();
  g.position.copy(pos);

  const pad = new THREE.Mesh(
    new THREE.CylinderGeometry(0.9, 0.9, 0.18, 24),
    new THREE.MeshStandardMaterial({ color: 0x0f1a33, emissive: 0x7c5cff, emissiveIntensity: 0.25, roughness: 0.6 })
  );
  pad.position.y = 0.15;

  const top = new THREE.Mesh(
    new THREE.CylinderGeometry(0.85, 0.85, 0.06, 24),
    new THREE.MeshStandardMaterial({ color: 0x101a31, emissive: 0x33e6ff, emissiveIntensity: 0.35, roughness: 0.4 })
  );
  top.position.y = 0.26;

  g.add(pad, top);
  scene.add(g);

  pads.push({ group: g, cost, label, onBuy });
}

makePad("Dropper", 50, new THREE.Vector3(-2.0, 0.0, -6.0), () => buyDropper());
makePad("Conveyor", 75, new THREE.Vector3(0.8, 0.0, -6.0), () => buyConveyor());
makePad("Bonus", 100, new THREE.Vector3(3.6, 0.0, -6.0), () => buyBonus());
makePad("Speed", 60, new THREE.Vector3(6.4, 0.0, -6.0), () => buySpeed());

// ---------- Coins ----------
const coinMat = new THREE.MeshStandardMaterial({ color: 0xffd54a, emissive: 0xffd54a, emissiveIntensity: 0.20, roughness: 0.55 });
function spawnCoin() {
  const coin = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.08, 18), coinMat);
  coin.rotation.x = Math.PI / 2;
  coin.position.set(dropperGroup.position.x, 2.0, dropperGroup.position.z + 1.45);
  scene.add(coin);

  tycoon.coins.push({
    mesh: coin,
    state: "fall",
    t: 0,
  });
}

function updateCoins(dt) {
  const speed = 2.2 * tycoon.conveyorSpeed;

  for (let i = tycoon.coins.length - 1; i >= 0; i--) {
    const c = tycoon.coins[i];
    const m = c.mesh;

    // spin
    m.rotation.z += dt * 8;

    if (c.state === "fall") {
      m.position.y -= dt * 3.2;
      if (m.position.y <= 1.18) {
        m.position.y = 1.18;
        c.state = "belt";
      }
    } else if (c.state === "belt") {
      m.position.x += dt * speed;

      // if reaches collector area
      if (m.position.x >= collector.position.x - 0.7) {
        // reward
        setMoney(tycoon.money + tycoon.coinValue);

        // pop effect (scale quickly)
        scene.remove(m);
        tycoon.coins.splice(i, 1);
      }
    }
  }
}

// ---------- Player Movement ----------
const playerRadius = 0.55;
let velY = 0;
let grounded = true;

function getForwardRight() {
  const forward = new THREE.Vector3(0, 0, -1).applyEuler(new THREE.Euler(0, yaw, 0));
  const right = new THREE.Vector3(1, 0, 0).applyEuler(new THREE.Euler(0, yaw, 0));
  return { forward, right };
}

function updatePlayer(dt) {
  // camera rotation
  camRig.position.copy(player.position);
  camRig.rotation.set(0, yaw, 0);
  camera.rotation.set(pitch, 0, 0);

  // movement
  const { forward, right } = getForwardRight();
  let moveX = 0, moveZ = 0;

  if (keys.has("KeyW")) { moveX += forward.x; moveZ += forward.z; }
  if (keys.has("KeyS")) { moveX -= forward.x; moveZ -= forward.z; }
  if (keys.has("KeyA")) { moveX -= right.x; moveZ -= right.z; }
  if (keys.has("KeyD")) { moveX += right.x; moveZ += right.z; }

  let len = Math.hypot(moveX, moveZ);
  if (len > 0) { moveX /= len; moveZ /= len; }

  const moveSpeed = tycoon.moveSpeed;
  player.position.x += moveX * moveSpeed * dt;
  player.position.z += moveZ * moveSpeed * dt;

  // simple bounds
  player.position.x = clamp(player.position.x, -90, 90);
  player.position.z = clamp(player.position.z, -90, 90);

  // gravity / jump
  const jumpPressed = keys.has("Space");
  if (jumpPressed && grounded) {
    velY = 6.5;
    grounded = false;
  }
  velY -= 18 * dt;
  player.position.y += velY * dt;

  if (player.position.y <= 0) {
    player.position.y = 0;
    velY = 0;
    grounded = true;
  }
}

function updatePlayerModel() {
  // third-person model follows player, but slightly behind; keep it simple
  const behind = new THREE.Vector3(0, 0, 0.0).applyEuler(new THREE.Euler(0, yaw, 0));
  player.children.forEach(() => {});
  // rotate body to face yaw
  player.rotation.y = yaw;
}

// ---------- Interactions ----------
function distXZ(a, b) {
  const dx = a.x - b.x;
  const dz = a.z - b.z;
  return Math.hypot(dx, dz);
}

function tryInteract() {
  // pad buy
  for (const p of pads) {
    const d = distXZ(player.position, p.group.position);
    if (d < 1.25) {
      p.onBuy();
      return;
    }
  }
}

window.addEventListener("keydown", (e) => {
  if (!running) return;
  if (e.code === "KeyE") {
    tryInteract();
  }
});

// ---------- Shop / Upgrades ----------
function buyDropper() {
  const cost = 50 + (tycoon.dropperCount - 1) * 35;
  if (!spend(cost)) return;
  tycoon.dropperCount += 1;
  // faster spawn (cap)
  tycoon.dropInterval = Math.max(0.22, tycoon.dropInterval - 0.07);
}

function buyConveyor() {
  const cost = 75 + Math.floor((tycoon.conveyorSpeed - 1) * 60);
  if (!spend(cost)) return;
  tycoon.conveyorSpeed = Math.min(3.0, tycoon.conveyorSpeed + 0.35);
}

function buyBonus() {
  const cost = 100 + (tycoon.coinValue - 1) * 80;
  if (!spend(cost)) return;
  tycoon.coinValue = Math.min(10, tycoon.coinValue + 1);
}

function buySpeed() {
  const cost = 60 + Math.floor((tycoon.moveSpeed - 7) * 35);
  if (!spend(cost)) return;
  tycoon.moveSpeed = Math.min(12.0, tycoon.moveSpeed + 0.8);
}

buyDropperBtn.addEventListener("click", buyDropper);
buyConveyorBtn.addEventListener("click", buyConveyor);
buyBonusBtn.addEventListener("click", buyBonus);
buySpeedBtn.addEventListener("click", buySpeed);

function toggleShop(forceState) {
  const wantOpen = typeof forceState === "boolean"
    ? forceState
    : shop.classList.contains("hidden");

  shop.classList.toggle("hidden", !wantOpen);
  shop.setAttribute("aria-hidden", wantOpen ? "false" : "true");

  // if shop opens, unlock mouse
  if (wantOpen) {
    if (document.pointerLockElement) document.exitPointerLock();
  } else {
    // can relock by clicking canvas
  }
}

shopClose.addEventListener("click", () => toggleShop(false));

// ---------- Menu ----------
btnHow.addEventListener("click", () => {
  howPanel.classList.toggle("hidden");
});

btnPlay.addEventListener("click", () => {
  menu.classList.add("hidden");
  hud.classList.remove("hidden");
  running = true;
  setMoney(25); // starter cash
  // prompt player to click canvas to lock
});

// ---------- Resize ----------
window.addEventListener("resize", () => {
  renderer.setSize(innerWidth, innerHeight);
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
});

// ---------- Loop ----------
const clock = new THREE.Clock();

function tick() {
  const dt = Math.min(clock.getDelta(), 0.05);

  if (running) {
    updatePlayer(dt);
    updatePlayerModel();

    // Spawn coins based on droppers
    tycoon.lastDrop += dt;
    if (tycoon.lastDrop >= tycoon.dropInterval) {
      tycoon.lastDrop = 0;
      // spawn multiple coins depending on droppers (lightweight)
      const count = Math.min(4, tycoon.dropperCount);
      for (let i = 0; i < count; i++) spawnCoin();
    }

    updateCoins(dt);

    // animate collector ring
    collectorRing.rotation.z += dt * 1.6;
  }

  renderer.render(scene, camera);
  requestAnimationFrame(tick);
}

tick();
