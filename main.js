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

// Geometry and material for line
const geometry = new THREE.BufferGeometry();
geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

// Add color attribute for rainbow effect
const colors = new Float32Array(maxPoints * 3);
geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

const material = new THREE.LineBasicMaterial({
  vertexColors: true,
  linewidth: 2, // Note: linewidth may be capped at 1 on some systems
  transparent: true,
  opacity: 0.8
});

const line = new THREE.Line(geometry, material);
scene.add(line);

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

// Derivative functions for each attractor
function lorenzDerivatives(x, y, z, params) {
  const { sigma, rho, beta } = params;
  const dx = sigma * (y - x);
  const dy = x * (rho - z) - y;
  const dz = x * y - beta * z;
  return { dx, dy, dz };
}

function aizawaDerivatives(x, y, z, params, k) {
  const { a, b, c, d, e, f } = params;
  const dx = ((z / k - b) * x - d * y);
  const dy = (d * x + (z / k - b) * y);
  const dz = (k * c + a * z - z * z * z / (3 * k * k) - (x * x + y * y) / k * (1 + e * z / k) + f * z * x * x * x / (k * k * k));
  return { dx, dy, dz };
}

function rosslerDerivatives(x, y, z, params) {
  const { a, b, c } = params;
  const dx = -y - z;
  const dy = x + a * y;
  const dz = b + z * (x - c);
  return { dx, dy, dz };
}

function chenDerivatives(x, y, z, params) {
  const { a, b, c } = params;
  const dx = a * (y - x);
  const dy = (c - a) * x - x * z + c * y;
  const dz = x * y - b * z;
  return { dx, dy, dz };
}

function thomasDerivatives(x, y, z, params) {
  const { b } = params;
  const dx = Math.sin(y) - b * x;
  const dy = Math.sin(z) - b * y;
  const dz = Math.sin(x) - b * z;
  return { dx, dy, dz };
}

function dadrasDerivatives(x, y, z, params) {
  const { a, b, c, d, e } = params;
  const dx = y - a * x + b * y * z;
  const dy = c * y - x * z + z;
  const dz = d * x * y - e * z;
  return { dx, dy, dz };
}

// Reset function
function resetAttractor() {
  const k = 10;
  if (currentAttractor === 'aizawa') {
    x = 0.1 * k; // Scale initial x
    y = 0 * k;
    z = 0 * k;
  } else {
    x = 0.1;
    y = 0;
    z = 0;
  }
  pointCount = 0;
  positions.fill(0);
  colors.fill(0);
  geometry.attributes.position.needsUpdate = true;
  geometry.attributes.color.needsUpdate = true;
  geometry.setDrawRange(0, pointCount);
  updateUIFromParams();
}

// Update UI to reflect current parameters
function updateUIFromParams() {
  document.querySelectorAll('.attractor-params').forEach(el => {
    el.style.display = 'none';
  });
  const currentParamDiv = document.getElementById(`${currentAttractor}-params`);
  if (currentParamDiv) {
    currentParamDiv.style.display = 'block';
  }
  document.getElementById('attractor-type').value = currentAttractor;
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

// Attractor equations with RK4
function computeNextPoint() {
  let dx = 0, dy = 0, dz = 0;
  const k = 10; // Scaling factor for Aizawa

  switch (currentAttractor) {
    case 'lorenz': {
      const { dt } = params.lorenz;
      // k1
      let { dx: k1x, dy: k1y, dz: k1z } = lorenzDerivatives(x, y, z, params.lorenz);
      k1x *= dt; k1y *= dt; k1z *= dt;
      // k2
      let { dx: k2x, dy: k2y, dz: k2z } = lorenzDerivatives(x + k1x / 2, y + k1y / 2, z + k1z / 2, params.lorenz);
      k2x *= dt; k2y *= dt; k2z *= dt;
      // k3
      let { dx: k3x, dy: k3y, dz: k3z } = lorenzDerivatives(x + k2x / 2, y + k2y / 2, z + k2z / 2, params.lorenz);
      k3x *= dt; k3y *= dt; k3z *= dt;
      // k4
      let { dx: k4x, dy: k4y, dz: k4z } = lorenzDerivatives(x + k3x, y + k3y, z + k3z, params.lorenz);
      k4x *= dt; k4y *= dt; k4z *= dt;
      // Update
      dx = (k1x + 2 * k2x + 2 * k3x + k4x) / 6;
      dy = (k1y + 2 * k2y + 2 * k3y + k4y) / 6;
      dz = (k1z + 2 * k2z + 2 * k3z + k4z) / 6;
      break;
    }
    case 'aizawa': {
      const { dt: dtA } = params.aizawa;
      // k1
      let { dx: k1x, dy: k1y, dz: k1z } = aizawaDerivatives(x, y, z, params.aizawa, k);
      k1x *= dtA; k1y *= dtA; k1z *= dtA;
      // k2
      let { dx: k2x, dy: k2y, dz: k2z } = aizawaDerivatives(x + k1x / 2, y + k1y / 2, z + k1z / 2, params.aizawa, k);
      k2x *= dtA; k2y *= dtA; k2z *= dtA;
      // k3
      let { dx: k3x, dy: k3y, dz: k3z } = aizawaDerivatives(x + k2x / 2, y + k2y / 2, z + k2z / 2, params.aizawa, k);
      k3x *= dtA; k3y *= dtA; k3z *= dtA;
      // k4
      let { dx: k4x, dy: k4y, dz: k4z } = aizawaDerivatives(x + k3x, y + k3y, z + k3z, params.aizawa, k);
      k4x *= dtA; k4y *= dtA; k4z *= dtA;
      // Update
      dx = (k1x + 2 * k2x + 2 * k3x + k4x) / 6;
      dy = (k1y + 2 * k2y + 2 * k3y + k4y) / 6;
      dz = (k1z + 2 * k2z + 2 * k3z + k4z) / 6;
      break;
    }
    case 'rossler': {
      const { dt: dtR } = params.rossler;
      // k1
      let { dx: k1x, dy: k1y, dz: k1z } = rosslerDerivatives(x, y, z, params.rossler);
      k1x *= dtR; k1y *= dtR; k1z *= dtR;
      // k2
      let { dx: k2x, dy: k2y, dz: k2z } = rosslerDerivatives(x + k1x / 2, y + k1y / 2, z + k1z / 2, params.rossler);
      k2x *= dtR; k2y *= dtR; k2z *= dtR;
      // k3
      let { dx: k3x, dy: k3y, dz: k3z } = rosslerDerivatives(x + k2x / 2, y + k2y / 2, z + k2z / 2, params.rossler);
      k3x *= dtR; k3y *= dtR; k3z *= dtR;
      // k4
      let { dx: k4x, dy: k4y, dz: k4z } = rosslerDerivatives(x + k3x, y + k3y, z + k3z, params.rossler);
      k4x *= dtR; k4y *= dtR; k4z *= dtR;
      // Update
      dx = (k1x + 2 * k2x + 2 * k3x + k4x) / 6;
      dy = (k1y + 2 * k2y + 2 * k3y + k4y) / 6;
      dz = (k1z + 2 * k2z + 2 * k3z + k4z) / 6;
      break;
    }
    case 'chen': {
      const { dt: dtC } = params.chen;
      // k1
      let { dx: k1x, dy: k1y, dz: k1z } = chenDerivatives(x, y, z, params.chen);
      k1x *= dtC; k1y *= dtC; k1z *= dtC;
      // k2
      let { dx: k2x, dy: k2y, dz: k2z } = chenDerivatives(x + k1x / 2, y + k1y / 2, z + k1z / 2, params.chen);
      k2x *= dtC; k2y *= dtC; k2z *= dtC;
      // k3
      let { dx: k3x, dy: k3y, dz: k3z } = chenDerivatives(x + k2x / 2, y + k2y / 2, z + k2z / 2, params.chen);
      k3x *= dtC; k3y *= dtC; k3z *= dtC;
      // k4
      let { dx: k4x, dy: k4y, dz: k4z } = chenDerivatives(x + k3x, y + k3y, z + k3z, params.chen);
      k4x *= dtC; k4y *= dtC; k4z *= dtC;
      // Update
      dx = (k1x + 2 * k2x + 2 * k3x + k4x) / 6;
      dy = (k1y + 2 * k2y + 2 * k3y + k4y) / 6;
      dz = (k1z + 2 * k2z + 2 * k3z + k4z) / 6;
      break;
    }
    case 'thomas': {
      const { dt: dtT } = params.thomas;
      // k1
      let { dx: k1x, dy: k1y, dz: k1z } = thomasDerivatives(x, y, z, params.thomas);
      k1x *= dtT; k1y *= dtT; k1z *= dtT;
      // k2
      let { dx: k2x, dy: k2y, dz: k2z } = thomasDerivatives(x + k1x / 2, y + k1y / 2, z + k1z / 2, params.thomas);
      k2x *= dtT; k2y *= dtT; k2z *= dtT;
      // k3
      let { dx: k3x, dy: k3y, dz: k3z } = thomasDerivatives(x + k2x / 2, y + k2y / 2, z + k2z / 2, params.thomas);
      k3x *= dtT; k3y *= dtT; k3z *= dtT;
      // k4
      let { dx: k4x, dy: k4y, dz: k4z } = thomasDerivatives(x + k3x, y + k3y, z + k3z, params.thomas);
      k4x *= dtT; k4y *= dtT; k4z *= dtT;
      // Update
      dx = (k1x + 2 * k2x + 2 * k3x + k4x) / 6;
      dy = (k1y + 2 * k2y + 2 * k3y + k4y) / 6;
      dz = (k1z + 2 * k2z + 2 * k3z + k4z) / 6;
      break;
    }
    case 'dadras': {
      const { dt: dtD } = params.dadras;
      // k1
      let { dx: k1x, dy: k1y, dz: k1z } = dadrasDerivatives(x, y, z, params.dadras);
      k1x *= dtD; k1y *= dtD; k1z *= dtD;
      // k2
      let { dx: k2x, dy: k2y, dz: k2z } = dadrasDerivatives(x + k1x / 2, y + k1y / 2, z + k1z / 2, params.dadras);
      k2x *= dtD; k2y *= dtD; k2z *= dtD;
      // k3
      let { dx: k3x, dy: k3y, dz: k3z } = dadrasDerivatives(x + k2x / 2, y + k2y / 2, z + k2z / 2, params.dadras);
      k3x *= dtD; k3y *= dtD; k3z *= dtD;
      // k4
      let { dx: k4x, dy: k4y, dz: k4z } = dadrasDerivatives(x + k3x, y + k3y, z + k3z, params.dadras);
      k4x *= dtD; k4y *= dtD; k4z *= dtD;
      // Update
      dx = (k1x + 2 * k2x + 2 * k3x + k4x) / 6;
      dy = (k1y + 2 * k2y + 2 * k3y + k4y) / 6;
      dz = (k1z + 2 * k2z + 2 * k3z + k4z) / 6;
      break;
    }
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
  updateParametersFromUI();
  const newPoint = computeNextPoint();

  if (pointCount < maxPoints) {
    positions[pointCount * 3] = newPoint.x;
    positions[pointCount * 3 + 1] = newPoint.y;
    positions[pointCount * 3 + 2] = newPoint.z;
    const color = getColor(pointCount);
    colors[pointCount * 3] = color.r;
    colors[pointCount * 3 + 1] = color.g;
    colors[pointCount * 3 + 2] = color.b;
    pointCount++;
  } else {
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
    const color = getColor(maxPoints - 1);
    colors[(maxPoints - 1) * 3] = color.r;
    colors[(maxPoints - 1) * 3 + 1] = color.g;
    colors[(maxPoints - 1) * 3 + 2] = color.b;
  }

  geometry.attributes.position.needsUpdate = true;
  geometry.attributes.color.needsUpdate = true;
  geometry.setDrawRange(0, pointCount);
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

  const resetButton = document.createElement('button');
  resetButton.id = 'reset';
  resetButton.textContent = 'Reset';
  resetButton.style.marginLeft = '10px';
  typeSelector.appendChild(resetButton);

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

  document.getElementById('attractor-type').addEventListener('change', function() {
    changeAttractor(this.value);
  });

  document.getElementById('reset').addEventListener('click', resetAttractor);

  document.querySelectorAll('input[type="range"]').forEach(slider => {
    const valueSpan = document.getElementById(`${slider.id}-value`);
    if (valueSpan) {
      valueSpan.textContent = slider.value;
    }
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
