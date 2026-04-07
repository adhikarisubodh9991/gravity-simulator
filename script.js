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

const objects = [];

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

function clearAll() {
  for (const obj of objects) {
    world.removeBody(obj.body);
    scene.remove(obj.mesh);
  }
  objects.length = 0;
}

document.getElementById('drop-sphere').addEventListener('click', addSphere);
document.getElementById('drop-box').addEventListener('click', addBox);
document.getElementById('clear').addEventListener('click', clearAll);

function animate() {
  requestAnimationFrame(animate);
  world.step(1 / 60);

  for (const obj of objects) {
    obj.mesh.position.copy(obj.body.position);
    obj.mesh.quaternion.copy(obj.body.quaternion);
  }

  renderer.render(scene, camera);
}
animate();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
