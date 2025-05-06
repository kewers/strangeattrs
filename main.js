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

// Set up attractor system
const maxPoints = 10000;
const positions = new Float32Array(maxPoints * 3);
let pointCount = 0;

// Geometry and material for points
const geometry = new THREE.BufferGeometry();
geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

// Add color attribute for rainbow effect
const colors = new Float32Array(maxPoints * 3);
geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

const material = new THREE.PointsMaterial({
  size: 0.1,
  vertexColors: true,
  transparent: true,
  opacity: 0.8
});

const pointCloud = new THREE.Points(geometry, material);
scene.add(pointCloud);

// Add axes helper
const axesHelper = new THREE.AxesHelper(20);
scene.add(axesHelper);

// Current point coordinates
let x = 0.1, y = 0, z = 0;

// Attractor parameters
let params = {
  // Lorenz parameters
  lorenz: {
    sigma: 10,
    rho: 28,
    beta: 2.666,
    dt: 0.01
  },
  // Aizawa parameters
  aizawa: {
    a: 0.95,
    b: 0.7,
    c: 0.6,
    d: 3.5,
    e: 0.25,
    f: 0.1,
    dt: 0.01
  },
  // Rössler parameters
  rossler: {
    a: 0.2,
    b: 0.2,
    c: 5.7,
    dt: 0.01
  },
  // Chen parameters
  chen: {
    a: 35,
    b: 3,
    c: 28,
    dt: 0.001
  },
  // Thomas parameters
  thomas: {
    b: 0.208186,
    dt: 0.05
  },
  // Dadras parameters
  dadras: {
    a: 3,
    b: 2.7,
    c: 1.7,
    d: 2,
    e: 9,
    dt: 0.01
  }
};

// Current attractor type
let currentAttractor = 'lorenz';

// Handle window resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Reset function
function resetAttractor() {
  // Reset current point
  x = 0.1;
  y = 0;
  z = 0;

  // Clear point cloud
  pointCount = 0;
  positions.fill(0);
  colors.fill(0);
  geometry.attributes.position.needsUpdate = true;
  geometry.attributes.color.needsUpdate = true;
  geometry.setDrawRange(0, pointCount);

  // Update UI inputs based on current attractor
  updateUIFromParams();
}

// Update UI to reflect current parameters
function updateUIFromParams() {
  // First hide all parameter groups
  document.querySelectorAll('.attractor-params').forEach(el => {
    el.style.display = 'none';
  });

  // Show only the current attractor's parameters
  const currentParamDiv = document.getElementById(`${currentAttractor}-params`);
  if (currentParamDiv) {
    currentParamDiv.style.display = 'block';
  }

  // Update the attractor selector
  document.getElementById('attractor-type').value = currentAttractor;

  // Update all parameter inputs for the current attractor
  const currentParams = params[currentAttractor];
  if (currentParams) {
    Object.keys(currentParams).forEach(key => {
      const input = document.getElementById(`${currentAttractor}-${key}`);
      if (input) {
        input.value = currentParams[key];
      }
    });
  }
}

// Update parameters from UI
function updateParametersFromUI() {
  const currentParams = params[currentAttractor];
  if (currentParams) {
    Object.keys(currentParams).forEach(key => {
      const input = document.getElementById(`${currentAttractor}-${key}`);
      if (input) {
        currentParams[key] = parseFloat(input.value);
      }
    });
  }
}

// Change attractor type
function changeAttractor(type) {
  currentAttractor = type;
  resetAttractor();
}

// Attractor equations
function computeNextPoint() {
  let dx = 0, dy = 0, dz = 0;

  switch (currentAttractor) {
    case 'lorenz':
      const { sigma, rho, beta, dt } = params.lorenz;
      dx = sigma * (y - x) * dt;
      dy = (x * (rho - z) - y) * dt;
      dz = (x * y - beta * z) * dt;
      break;

    case 'aizawa':
      const { a, b, c, d, e, f, dt: dtA } = params.aizawa;
      dx = (z - b) * x - d * y;
      dy = d * x + (z - b) * y;
      dz = c + a * z - z * z * z / 3 - (x * x + y * y) * (1 + e * z) + f * z * x * x * x;
      dx *= dtA;
      dy *= dtA;
      dz *= dtA;
      break;

    case 'rossler':
      const { a: aR, b: bR, c: cR, dt: dtR } = params.rossler;
      dx = (-y - z) * dtR;
      dy = (x + aR * y) * dtR;
      dz = (bR + z * (x - cR)) * dtR;
      break;

    case 'chen':
      const { a: aC, b: bC, c: cC, dt: dtC } = params.chen;
      dx = aC * (y - x) * dtC;
      dy = ((cC - aC) * x - x * z + cC * y) * dtC;
      dz = (x * y - bC * z) * dtC;
      break;

    case 'thomas':
      const { b: bT, dt: dtT } = params.thomas;
      dx = (Math.sin(y) - bT * x) * dtT;
      dy = (Math.sin(z) - bT * y) * dtT;
      dz = (Math.sin(x) - bT * z) * dtT;
      break;

    case 'dadras':
      const { a: aD, b: bD, c: cD, d: dD, e: eD, dt: dtD } = params.dadras;
      dx = (y - aD * x + bD * y * z) * dtD;
      dy = (cD * y - x * z + z) * dtD;
      dz = (dD * x * y - eD * z) * dtD;
      break;
  }

  x += dx;
  y += dy;
  z += dz;

  return new THREE.Vector3(x, y, z);
}

// Color function - creates rainbow color effect
function getColor(i) {
  const phi = i / maxPoints * Math.PI * 2;
  const r = Math.sin(phi) * 0.5 + 0.5;
  const g = Math.sin(phi + 2 * Math.PI / 3) * 0.5 + 0.5;
  const b = Math.sin(phi + 4 * Math.PI / 3) * 0.5 + 0.5;
  return { r, g, b };
}

// Animation loop
function animate() {
  requestAnimationFrame(animate);

  // Update parameters from UI
  updateParametersFromUI();

  // Compute next point
  const newPoint = computeNextPoint();

  // Add point to buffer
  if (pointCount < maxPoints) {
    positions[pointCount * 3] = newPoint.x;
    positions[pointCount * 3 + 1] = newPoint.y;
    positions[pointCount * 3 + 2] = newPoint.z;

    // Add color
    const color = getColor(pointCount);
    colors[pointCount * 3] = color.r;
    colors[pointCount * 3 + 1] = color.g;
    colors[pointCount * 3 + 2] = color.b;

    pointCount++;
  } else {
    // Shift points to create a trail effect
    for (let i = 0; i < maxPoints - 1; i++) {
      positions[i * 3] = positions[(i + 1) * 3];
      positions[i * 3 + 1] = positions[(i + 1) * 3 + 1];
      positions[i * 3 + 2] = positions[(i + 1) * 3 + 2];

      colors[i * 3] = colors[(i + 1) * 3];
      colors[i * 3 + 1] = colors[(i + 1) * 3 + 1];
      colors[i * 3 + 2] = colors[(i + 1) * 3 + 2];
    }

    positions[(maxPoints - 1) * 3] = newPoint.x;
    positions[(maxPoints - 1) * 3 + 1] = newPoint.y;
    positions[(maxPoints - 1) * 3 + 2] = newPoint.z;

    // Add color for newest point
    const color = getColor(maxPoints - 1);
    colors[(maxPoints - 1) * 3] = color.r;
    colors[(maxPoints - 1) * 3 + 1] = color.g;
    colors[(maxPoints - 1) * 3 + 2] = color.b;
  }

  // Update geometry
  geometry.attributes.position.needsUpdate = true;
  geometry.attributes.color.needsUpdate = true;
  geometry.setDrawRange(0, pointCount);

  // Render
  controls.update();
  renderer.render(scene, camera);
}

// Create UI for attractor selection and parameters
function createUI() {
  const uiContainer = document.createElement('div');
  uiContainer.style.position = 'absolute';
  uiContainer.style.top = '10px';
  uiContainer.style.left = '10px';
  uiContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
  uiContainer.style.color = 'white';
  uiContainer.style.padding = '10px';
  uiContainer.style.borderRadius = '5px';
  uiContainer.style.fontFamily = 'Arial, sans-serif';
  uiContainer.style.zIndex = '1000';
  uiContainer.style.maxWidth = '300px';
  uiContainer.style.maxHeight = '80vh';
  uiContainer.style.overflowY = 'auto';

  // Attractor type selector
  const typeSelector = document.createElement('div');
  typeSelector.innerHTML = `
        <label for="attractor-type">Attractor Type:</label>
        <select id="attractor-type">
            <option value="lorenz">Lorenz</option>
            <option value="aizawa">Aizawa</option>
            <option value="rossler">Rössler</option>
            <option value="chen">Chen</option>
            <option value="thomas">Thomas</option>
            <option value="dadras">Dadras</option>
        </select>
    `;
  uiContainer.appendChild(typeSelector);

  // Reset button
  const resetButton = document.createElement('button');
  resetButton.id = 'reset';
  resetButton.textContent = 'Reset';
  resetButton.style.marginLeft = '10px';
  typeSelector.appendChild(resetButton);

  // Parameters for Lorenz attractor
  const lorenzParams = document.createElement('div');
  lorenzParams.id = 'lorenz-params';
  lorenzParams.className = 'attractor-params';
  lorenzParams.innerHTML = `
        <h3>Lorenz Parameters</h3>
        <div>
            <label for="lorenz-sigma">Sigma:</label>
            <input type="range" id="lorenz-sigma" min="1" max="20" step="0.1" value="10">
            <span id="lorenz-sigma-value">10</span>
        </div>
        <div>
            <label for="lorenz-rho">Rho:</label>
            <input type="range" id="lorenz-rho" min="0" max="100" step="0.1" value="28">
            <span id="lorenz-rho-value">28</span>
        </div>
        <div>
            <label for="lorenz-beta">Beta:</label>
            <input type="range" id="lorenz-beta" min="0" max="10" step="0.001" value="2.666">
            <span id="lorenz-beta-value">2.666</span>
        </div>
        <div>
            <label for="lorenz-dt">Speed:</label>
            <input type="range" id="lorenz-dt" min="0.001" max="0.05" step="0.001" value="0.01">
            <span id="lorenz-dt-value">0.01</span>
        </div>
    `;
  uiContainer.appendChild(lorenzParams);

  // Parameters for Aizawa attractor
  const aizawaParams = document.createElement('div');
  aizawaParams.id = 'aizawa-params';
  aizawaParams.className = 'attractor-params';
  aizawaParams.style.display = 'none';
  aizawaParams.innerHTML = `
        <h3>Aizawa Parameters</h3>
        <div>
            <label for="aizawa-a">a:</label>
            <input type="range" id="aizawa-a" min="0.1" max="2" step="0.01" value="0.95">
            <span id="aizawa-a-value">0.95</span>
        </div>
        <div>
            <label for="aizawa-b">b:</label>
            <input type="range" id="aizawa-b" min="0.1" max="2" step="0.01" value="0.7">
            <span id="aizawa-b-value">0.7</span>
        </div>
        <div>
            <label for="aizawa-c">c:</label>
            <input type="range" id="aizawa-c" min="0.1" max="2" step="0.01" value="0.6">
            <span id="aizawa-c-value">0.6</span>
        </div>
        <div>
            <label for="aizawa-d">d:</label>
            <input type="range" id="aizawa-d" min="1" max="10" step="0.1" value="3.5">
            <span id="aizawa-d-value">3.5</span>
        </div>
        <div>
            <label for="aizawa-e">e:</label>
            <input type="range" id="aizawa-e" min="0.1" max="1" step="0.01" value="0.25">
            <span id="aizawa-e-value">0.25</span>
        </div>
        <div>
            <label for="aizawa-f">f:</label>
            <input type="range" id="aizawa-f" min="0.01" max="0.5" step="0.01" value="0.1">
            <span id="aizawa-f-value">0.1</span>
        </div>
        <div>
            <label for="aizawa-dt">Speed:</label>
            <input type="range" id="aizawa-dt" min="0.001" max="0.05" step="0.001" value="0.01">
            <span id="aizawa-dt-value">0.01</span>
        </div>
    `;
  uiContainer.appendChild(aizawaParams);

  // Parameters for Rössler attractor
  const rosslerParams = document.createElement('div');
  rosslerParams.id = 'rossler-params';
  rosslerParams.className = 'attractor-params';
  rosslerParams.style.display = 'none';
  rosslerParams.innerHTML = `
        <h3>Rössler Parameters</h3>
        <div>
            <label for="rossler-a">a:</label>
            <input type="range" id="rossler-a" min="0.1" max="0.4" step="0.01" value="0.2">
            <span id="rossler-a-value">0.2</span>
        </div>
        <div>
            <label for="rossler-b">b:</label>
            <input type="range" id="rossler-b" min="0.1" max="0.4" step="0.01" value="0.2">
            <span id="rossler-b-value">0.2</span>
        </div>
        <div>
            <label for="rossler-c">c:</label>
            <input type="range" id="rossler-c" min="1" max="14" step="0.1" value="5.7">
            <span id="rossler-c-value">5.7</span>
        </div>
        <div>
            <label for="rossler-dt">Speed:</label>
            <input type="range" id="rossler-dt" min="0.001" max="0.05" step="0.001" value="0.01">
            <span id="rossler-dt-value">0.01</span>
        </div>
    `;
  uiContainer.appendChild(rosslerParams);

  // Parameters for Chen attractor
  const chenParams = document.createElement('div');
  chenParams.id = 'chen-params';
  chenParams.className = 'attractor-params';
  chenParams.style.display = 'none';
  chenParams.innerHTML = `
        <h3>Chen Parameters</h3>
        <div>
            <label for="chen-a">a:</label>
            <input type="range" id="chen-a" min="20" max="50" step="0.1" value="35">
            <span id="chen-a-value">35</span>
        </div>
        <div>
            <label for="chen-b">b:</label>
            <input type="range" id="chen-b" min="1" max="10" step="0.1" value="3">
            <span id="chen-b-value">3</span>
        </div>
        <div>
            <label for="chen-c">c:</label>
            <input type="range" id="chen-c" min="10" max="40" step="0.1" value="28">
            <span id="chen-c-value">28</span>
        </div>
        <div>
            <label for="chen-dt">Speed:</label>
            <input type="range" id="chen-dt" min="0.0001" max="0.01" step="0.0001" value="0.001">
            <span id="chen-dt-value">0.001</span>
        </div>
    `;
  uiContainer.appendChild(chenParams);

  // Parameters for Thomas attractor
  const thomasParams = document.createElement('div');
  thomasParams.id = 'thomas-params';
  thomasParams.className = 'attractor-params';
  thomasParams.style.display = 'none';
  thomasParams.innerHTML = `
        <h3>Thomas Parameters</h3>
        <div>
            <label for="thomas-b">b:</label>
            <input type="range" id="thomas-b" min="0.1" max="0.3" step="0.001" value="0.208186">
            <span id="thomas-b-value">0.208186</span>
        </div>
        <div>
            <label for="thomas-dt">Speed:</label>
            <input type="range" id="thomas-dt" min="0.01" max="0.1" step="0.01" value="0.05">
            <span id="thomas-dt-value">0.05</span>
        </div>
    `;
  uiContainer.appendChild(thomasParams);

  // Parameters for Dadras attractor
  const dadrasParams = document.createElement('div');
  dadrasParams.id = 'dadras-params';
  dadrasParams.className = 'attractor-params';
  dadrasParams.style.display = 'none';
  dadrasParams.innerHTML = `
        <h3>Dadras Parameters</h3>
        <div>
            <label for="dadras-a">a:</label>
            <input type="range" id="dadras-a" min="1" max="5" step="0.1" value="3">
            <span id="dadras-a-value">3</span>
        </div>
        <div>
            <label for="dadras-b">b:</label>
            <input type="range" id="dadras-b" min="1" max="5" step="0.1" value="2.7">
            <span id="dadras-b-value">2.7</span>
        </div>
        <div>
            <label for="dadras-c">c:</label>
            <input type="range" id="dadras-c" min="0.5" max="3" step="0.1" value="1.7">
            <span id="dadras-c-value">1.7</span>
        </div>
        <div>
            <label for="dadras-d">d:</label>
            <input type="range" id="dadras-d" min="0.5" max="5" step="0.1" value="2">
            <span id="dadras-d-value">2</span>
        </div>
        <div>
            <label for="dadras-e">e:</label>
            <input type="range" id="dadras-e" min="5" max="15" step="0.1" value="9">
            <span id="dadras-e-value">9</span>
        </div>
        <div>
            <label for="dadras-dt">Speed:</label>
            <input type="range" id="dadras-dt" min="0.001" max="0.05" step="0.001" value="0.01">
            <span id="dadras-dt-value">0.01</span>
        </div>
    `;
  uiContainer.appendChild(dadrasParams);

  document.body.appendChild(uiContainer);

  // Set up event listeners for UI
  document.getElementById('attractor-type').addEventListener('change', function() {
    changeAttractor(this.value);
  });

  document.getElementById('reset').addEventListener('click', resetAttractor);

  // Set up event listeners for sliders
  document.querySelectorAll('input[type="range"]').forEach(slider => {
    const valueSpan = document.getElementById(`${slider.id}-value`);

    // Initial update
    if (valueSpan) {
      valueSpan.textContent = slider.value;
    }

    // Update on change
    slider.addEventListener('input', function() {
      if (valueSpan) {
        valueSpan.textContent = this.value;
      }
    });
  });
}

// Initialize UI
createUI();

// Start animation
animate();
