// Scene, Camera, and Renderer
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xfff9e1); // Light sky blue
const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
let firstload = true;

// Append renderer to the specific container
const container = document.getElementById('ThreeD-model-container');
container.appendChild(renderer.domElement);

// Ambient Lighting
const light = new THREE.AmbientLight(0xffffff, 1); // Soft white light
scene.add(light);

// Directional Lighting
const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5); // Color and intensity
directionalLight.position.set(5, 10, 7.5); // Position
directionalLight.castShadow = true; // Enable shadows
scene.add(directionalLight);

let MODEL;

// Load the 3D Model
const loader = new THREE.GLTFLoader();
loader.load(
    './assets/models/test.glb', // Path to your model file
    function (gltf) {
        MODEL = gltf.scene;
        scene.add(MODEL);
        MODEL.position.set(0, 0, 0); // Optional: Adjust position
    },
    function (xhr) {
        console.log((xhr.loaded / xhr.total * 100) + '% loaded'); // Loading progress
    },
    function (error) {
        console.error('An error happened while loading the model', error);
    }
);

const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.update();

// Camera Position
camera.position.z = 4;

// Function to resize the renderer based on the container's size
function resizeRendererToDisplaySize() {
    const width = container.clientWidth;
    const height = container.clientHeight;
    if (renderer.domElement.width !== width || renderer.domElement.height !== height) {
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    }
}

// Function to spin the model slowly
function spin() {
    if (MODEL) {
        MODEL.rotation.y -= 0.005; // Rotate the model on the Y-axis
    }
}

const animate = function () {
    requestAnimationFrame(animate);
    spin();
    resizeRendererToDisplaySize(); // Adjust size dynamically
    renderer.render(scene, camera);
};

animate();

// Handle window resize
window.addEventListener('resize', () => {
    resizeRendererToDisplaySize();
});