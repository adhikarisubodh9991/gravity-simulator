const canvas = document.getElementById('canvas');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b0f1a);

const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 22, 42);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);

scene.add(new THREE.AmbientLight(0xffffff, 0.35));
const sun = new THREE.DirectionalLight(0xffffff, 1.0);
sun.position.set(10, 20, 10);
scene.add(sun);

const world = new CANNON.World();
world.gravity.set(0, -20, 0);
world.defaultContactMaterial.friction = 0.4;
world.defaultContactMaterial.restitution = 0.5;

const floorBody = new CANNON.Body({ mass: 0, shape: new CANNON.Plane() });
floorBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
floorBody.position.y = -10;
world.addBody(floorBody);

const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(160, 160),
  new THREE.MeshStandardMaterial({ color: 0x18233c })
);
floor.rotation.x = -Math.PI / 2;
floor.position.y = -10;
scene.add(floor);
let floorSize = { w: 160, h: 160 };
let voidY = -80;

const objects = [];
let soundOn = true;
let audioCtx = null;
let frameCount = 0;
let fps = 0;
let lastFpsAt = performance.now();

function ping(freq = 440, duration = 0.05) {
  if (!soundOn) return;
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'triangle';
  osc.frequency.value = freq;
  gain.gain.value = 0.03;
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + duration);
}

function addSphere() {
  const r = 2;
  const body = new CANNON.Body({ mass: 8, shape: new CANNON.Sphere(r) });
  body.position.set((Math.random() - 0.5) * 20, 35, (Math.random() - 0.5) * 20);
  world.addBody(body);

  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(r, 24, 24),
    new THREE.MeshStandardMaterial({ color: 0x48a9ff })
  );
  scene.add(mesh);

  body.addEventListener('collide', () => ping(300 + Math.random() * 200, 0.03));
  objects.push({ body, mesh });
}

function addBox() {
  const s = 3;
  const shape = new CANNON.Box(new CANNON.Vec3(s / 2, s / 2, s / 2));
  const body = new CANNON.Body({ mass: 10, shape });
  body.position.set((Math.random() - 0.5) * 20, 35, (Math.random() - 0.5) * 20);
  world.addBody(body);

  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(s, s, s),
    new THREE.MeshStandardMaterial({ color: 0xff8a65 })
  );
  scene.add(mesh);

  objects.push({ body, mesh });
}

function addCylinder() {
  const r = 1.5;
  const h = 4;
  const body = new CANNON.Body({ mass: 9, shape: new CANNON.Cylinder(r, r, h, 16) });
  body.position.set((Math.random() - 0.5) * 20, 35, (Math.random() - 0.5) * 20);
  world.addBody(body);

  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(r, r, h, 16),
    new THREE.MeshStandardMaterial({ color: 0x7fd1b9 })
  );
  scene.add(mesh);
  body.addEventListener('collide', () => ping(200 + Math.random() * 240, 0.03));
  objects.push({ body, mesh });
}

function addCone() {
  const r = 1.8;
  const h = 4;
  // approximation in physics for simplicity
  const body = new CANNON.Body({ mass: 8, shape: new CANNON.Sphere(r * 0.85) });
  body.position.set((Math.random() - 0.5) * 20, 35, (Math.random() - 0.5) * 20);
  world.addBody(body);

  const mesh = new THREE.Mesh(
    new THREE.ConeGeometry(r, h, 20),
    new THREE.MeshStandardMaterial({ color: 0xffd166 })
  );
  scene.add(mesh);
  objects.push({ body, mesh });
}

function addPyramid() {
  const s = 3;
  const body = new CANNON.Body({ mass: 9, shape: new CANNON.Box(new CANNON.Vec3(s / 2, s / 2, s / 2)) });
  body.position.set((Math.random() - 0.5) * 20, 35, (Math.random() - 0.5) * 20);
  world.addBody(body);

  const mesh = new THREE.Mesh(
    new THREE.ConeGeometry(s * 0.8, s, 4),
    new THREE.MeshStandardMaterial({ color: 0xc77dff })
  );
  scene.add(mesh);
  objects.push({ body, mesh });
}

function clearAll() {
  for (const obj of objects) {
    world.removeBody(obj.body);
    scene.remove(obj.mesh);
  }
  objects.length = 0;
}

function applyEnvironment() {
  const w = Math.max(80, Math.min(500, Number(document.getElementById('ground-w').value) || 160));
  const h = Math.max(80, Math.min(500, Number(document.getElementById('ground-h').value) || 160));
  voidY = Number(document.getElementById('void-y').value) || -80;
  floorSize = { w, h };

  floor.geometry.dispose();
  floor.geometry = new THREE.PlaneGeometry(w, h);
}

document.getElementById('drop-sphere').addEventListener('click', addSphere);
document.getElementById('drop-box').addEventListener('click', addBox);
document.getElementById('drop-cylinder').addEventListener('click', addCylinder);
document.getElementById('drop-cone').addEventListener('click', addCone);
document.getElementById('drop-pyramid').addEventListener('click', addPyramid);
document.getElementById('clear').addEventListener('click', clearAll);
document.getElementById('apply-env').addEventListener('click', applyEnvironment);
document.getElementById('sound-on').addEventListener('change', (e) => {
  soundOn = !!e.target.checked;
});

const gravityInput = document.getElementById('gravity');
const frictionInput = document.getElementById('friction');
const bounceInput = document.getElementById('bounce');

gravityInput.addEventListener('input', () => {
  const v = Number(gravityInput.value);
  world.gravity.set(0, -v, 0);
  document.getElementById('gravity-v').textContent = String(v);
});

frictionInput.addEventListener('input', () => {
  const v = Number(frictionInput.value);
  world.defaultContactMaterial.friction = v;
  document.getElementById('friction-v').textContent = v.toFixed(2);
});

bounceInput.addEventListener('input', () => {
  const v = Number(bounceInput.value);
  world.defaultContactMaterial.restitution = v;
  document.getElementById('bounce-v').textContent = v.toFixed(2);
});

function animate() {
  requestAnimationFrame(animate);
  world.step(1 / 60);

  for (const obj of objects) {
    obj.mesh.position.copy(obj.body.position);
    obj.mesh.quaternion.copy(obj.body.quaternion);
  }

  for (let i = objects.length - 1; i >= 0; i -= 1) {
    const o = objects[i];
    const xOut = Math.abs(o.body.position.x) > floorSize.w / 2;
    const zOut = Math.abs(o.body.position.z) > floorSize.h / 2;
    const yOut = o.body.position.y < voidY;
    if (xOut || zOut || yOut) {
      world.removeBody(o.body);
      scene.remove(o.mesh);
      objects.splice(i, 1);
    }
  }

  frameCount += 1;
  const now = performance.now();
  if (now - lastFpsAt >= 1000) {
    fps = frameCount;
    frameCount = 0;
    lastFpsAt = now;
    document.getElementById('stat-fps').textContent = String(fps);
  }
  document.getElementById('stat-objects').textContent = String(objects.length);

  renderer.render(scene, camera);
}
animate();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
