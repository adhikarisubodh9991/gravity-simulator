const canvas = document.getElementById('canvas');

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b0f1a);

const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 18, 35);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);

scene.add(new THREE.AmbientLight(0xffffff, 0.35));
const sun = new THREE.DirectionalLight(0xffffff, 1.0);
sun.position.set(10, 20, 8);
scene.add(sun);

const world = new CANNON.World();
world.gravity.set(0, -20, 0);

const floorBody = new CANNON.Body({ mass: 0, shape: new CANNON.Plane() });
floorBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
floorBody.position.y = -8;
world.addBody(floorBody);

const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(120, 120),
  new THREE.MeshStandardMaterial({ color: 0x16213a })
);
floor.rotation.x = -Math.PI / 2;
floor.position.y = -8;
scene.add(floor);

const sphereBody = new CANNON.Body({
  mass: 8,
  shape: new CANNON.Sphere(2)
});
sphereBody.position.set(0, 30, 0);
world.addBody(sphereBody);

const sphere = new THREE.Mesh(
  new THREE.SphereGeometry(2, 32, 32),
  new THREE.MeshStandardMaterial({ color: 0x3ea6ff })
);
scene.add(sphere);

function animate() {
  requestAnimationFrame(animate);
  world.step(1 / 60);

  sphere.position.copy(sphereBody.position);
  sphere.quaternion.copy(sphereBody.quaternion);

  if (sphereBody.position.y < -20) {
    sphereBody.position.set((Math.random() - 0.5) * 10, 30, (Math.random() - 0.5) * 10);
    sphereBody.velocity.set(0, 0, 0);
    sphereBody.angularVelocity.set(0, 0, 0);
  }

  renderer.render(scene, camera);
}
animate();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
