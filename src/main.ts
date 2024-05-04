import * as T from "three";
import { GLTFLoader, RGBELoader } from "three/examples/jsm/Addons.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

// new canvas element
const canvas = document.createElement("canvas");

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// Add the canvas to the body of the document
document.body.appendChild(canvas);

// WebGLRenderer
const renderer = new T.WebGLRenderer({
  canvas: canvas,
});
renderer.setSize(window.innerWidth, window.innerHeight);

const scene = new T.Scene();

const pmremGenerator = new T.PMREMGenerator(renderer);

//  camera
const camera = new T.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.01,
  1000
);
camera.position.z = 2.3;
camera.position.y = 1.31;

const light = new T.AmbientLight("#ffffff", 1);
scene.add(light);
new OrbitControls(camera, renderer.domElement);

const hdriLoader = new RGBELoader();
hdriLoader.load("env.hdr", function (texture) {
  const envMap = pmremGenerator.fromEquirectangular(texture).texture;
  texture.dispose();
  // scene.background = envMap
  scene.environment = envMap;
});

const vertexShader = `
        varying vec2 vUv;

        void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }

        `;

        const fragmentShader = `
        uniform float time;
        
        varying vec2 vUv;
        
        void main() {
            // Calculate the distance from the center of the rectangle
            float distanceFromCenter = length(vUv - 0.5);
        
            // Define the speed of the animation
            float animationSpeed = 1.0; // Adjust this value as needed
        
            // Define the duration of the animation in seconds
            float animationDuration = 3.0; // Adjust this value as needed
        
            // Calculate the normalized time within the animation duration
            float normalizedTime = mod(time * animationSpeed, animationDuration) / animationDuration;
        
            // Define the radius of the cyan color
            float cyanRadius = 0.1; // Adjust this value as needed
        
            // Define the outer radius where the fade ends
            float outerRadius = 0.2; // Adjust this value as needed
        
        
        
            // Calculate the fade factor based on the distance from the cyan radius to the threshold distance
            float fadeFactor = smoothstep(cyanRadius, outerRadius, distanceFromCenter - normalizedTime);
        
            // Mix the colors based on the fade factor
            vec3 baseColor = mix(vec3(0.0, 1.0, 1.0), vec3(0.231, 0.4, 0.961), fadeFactor);
        
            // Output the final color
            gl_FragColor = vec4(baseColor, 1.0);
        }
        `;
        
let time = { value: 0 }; // initialize the time uniform

// GLTFLoader
const gltfLoader = new GLTFLoader();
gltfLoader.load("alexa.glb", (gltf) => {
  const model = gltf.scene;
  let lightMaterial: T.MeshStandardMaterial | null = null;
  model.traverse((node) => {
    if (node instanceof T.Mesh && node.material.name === "light") {
      lightMaterial = node.material;

      if (lightMaterial != null) {
        lightMaterial.onBeforeCompile = (shader) => {
          shader.fragmentShader = fragmentShader
          shader.vertexShader = vertexShader
          // Define uniforms for the material
          shader.uniforms.time = time;
   
        };
      }
    }
  });
  scene.add(model);
});

const material = new T.MeshStandardMaterial()
const geometry = new T.PlaneGeometry(3,3)
const mesh = new T.Mesh(geometry,material)
mesh.rotation.x = - Math.PI/2

// scene.add(mesh)

material.onBeforeCompile = (shader) => {
  shader.fragmentShader = fragmentShader
  shader.vertexShader = vertexShader
  shader.uniforms.time = time;

}

const clock = new T.Clock();

// Render function
function render() {
  requestAnimationFrame(render);
  const elapsedTime = clock.getElapsedTime();
  time.value = elapsedTime;
  renderer.render(scene, camera);
}

render();
