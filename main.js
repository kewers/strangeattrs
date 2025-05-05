import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// Scene setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(30, 30, 30);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Orbit controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;

// Lorenz attractor parameters
let sigma = 10;
let rho = 28;
let beta = 2.666;
let dt = 0.01; // Time step (speed)

// Current point
let x = 0.1, y = 0, z = 0;

// Store points for the trail
const maxPoints = 10000;
const positions = new Float32Array(maxPoints * 3);
let pointCount = 0;

// Geometry and material for points
const geometry = new THREE.BufferGeometry();
geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
const material = new THREE.PointsMaterial({ color: 0xff4444, size: 0.1 });
const pointCloud = new THREE.Points(geometry, material);
scene.add(pointCloud);

// Add axes helper
const axesHelper = new THREE.AxesHelper(20);
scene.add(axesHelper);

// Handle window resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Reset function
function resetAttractor() {
  // Reset parameters to initial values
  sigma = 10;
  rho = 28;
  beta = 2.666;
  dt = 0.01;

  // Reset current point
  x = 0.1;
  y = 0;
  z = 0;

  // Clear point cloud
  pointCount = 0;
  positions.fill(0); // Clear positions array
  geometry.attributes.position.needsUpdate = true;
  geometry.setDrawRange(0, pointCount);

  // Update UI inputs
  document.getElementById('sigma').value = sigma;
  document.getElementById('rho').value = rho;
  document.getElementById('beta').value = beta;
  document.getElementById('speed').value = dt;
}

// Add reset button event listener
document.getElementById('reset').addEventListener('click', resetAttractor);

// Update parameters from UI
function updateParameters() {
  sigma = parseFloat(document.getElementById('sigma').value);
  rho = parseFloat(document.getElementById('rho').value);
  beta = parseFloat(document.getElementById('beta').value);
  dt = parseFloat(document.getElementById('speed').value);
}

// Lorenz equations
function computeLorenz() {
  const dx = sigma * (y - x) * dt;
  const dy = (x * (rho - z) - y) * dt;
  const dz = (x * y - beta * z) * dt;
  x += dx;
  y += dy;
  z += dz;
  return new THREE.Vector3(x, y, z);
}

// Animation loop
function animate() {
  requestAnimationFrame(animate);

  // Update parameters
  updateParameters();

  // Compute next point
  const newPoint = computeLorenz();

  // Add point to buffer
  if (pointCount < maxPoints) {
    positions[pointCount * 3] = newPoint.x;
    positions[pointCount * 3 + 1] = newPoint.y;
    positions[pointCount * 3 + 2] = newPoint.z;
    pointCount++;
  } else {
    // Shift points to create a trail effect
    for (let i = 0; i < maxPoints - 1; i++) {
      positions[i * 3] = positions[(i + 1) * 3];
      positions[i * 3 + 1] = positions[(i + 1) * 3 + 1];
      positions[i * 3 + 2] = positions[(i + 1) * 3 + 2];
    }
    positions[(maxPoints - 1) * 3] = newPoint.x;
    positions[(maxPoints - 1) * 3 + 1] = newPoint.y;
    positions[(maxPoints - 1) * 3 + 2] = newPoint.z;
  }

  // Update geometry
  geometry.attributes.position.needsUpdate = true;
  geometry.setDrawRange(0, pointCount);

  // Render
  controls.update();
  renderer.render(scene, camera);
}

animate();
