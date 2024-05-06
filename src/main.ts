import * as T from "three";
import {
  GLTFLoader,
  KTX2Loader,
  RGBELoader,
} from "three/examples/jsm/Addons.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";

// new canvas element
const canvas = document.createElement("canvas");
const playBtn = document.getElementById("play");
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// Add the canvas to the body of the document
document.body.appendChild(canvas);

// WebGLRenderer
const renderer = new T.WebGLRenderer({
  canvas: canvas,
  antialias: true,
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.toneMapping = T.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1;
const scene = new T.Scene();

//  camera
const camera = new T.PerspectiveCamera(
  45,
  window.innerWidth / window.innerHeight,
  0.1,
  2000
);

camera.position.z = 2.3;
camera.position.y = 1.31;

const light = new T.AmbientLight("#ffffff", 1);
scene.add(light);
new OrbitControls(camera, renderer.domElement);

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
            float animationSpeed = 1.4; // Adjust this value as needed
        
            // duration of the animation in seconds
            float animationDuration = 3.0; 
        
            // Calculate the normalized time within the animation duration
            float normalizedTime = mod(time * animationSpeed, animationDuration) / animationDuration;
        
            // Define the radius of the cyan color
            float cyanRadius = 0.1; // Adjust this value as needed
        
            // Define the outer radius where the fade ends
            float outerRadius = 0.2; // Adjust this value as needed
        
        
        
            // Calculate the fade factor based on the distance from the cyan radius to the threshold distance
            float fadeFactor = smoothstep(cyanRadius, outerRadius, distanceFromCenter - normalizedTime);
        
            // Mix the colors based on the fade factor
            vec3 baseColor = mix(vec3(1.0, 0.0, 0.0), vec3(0.231, 0.4, 0.961), fadeFactor);
        
            // Output the final color
            gl_FragColor = vec4(baseColor, 1.0);
        }
        `;

let time = { value: 0 };

const ktx2Loader = new KTX2Loader().setTranscoderPath(
  "three/examples/jsm/libs/basis/"
);

new RGBELoader().load("env.hdr", function (texture) {
  texture.mapping = T.EquirectangularReflectionMapping;

  scene.background = texture;
  scene.environment = texture;

  render();

  const loader = new GLTFLoader();
  loader.setKTX2Loader(ktx2Loader);
  loader.setMeshoptDecoder(MeshoptDecoder);
  loader.load("alexa.glb", async function (gltf) {
    const model = gltf.scene;
    let lightMaterial: T.MeshStandardMaterial | null = null;
    model.traverse((node) => {
      if (node instanceof T.Mesh && node.material.name === "light") {
        lightMaterial = node.material;

        if (lightMaterial != null) {
          lightMaterial.onBeforeCompile = (shader) => {
            shader.fragmentShader = fragmentShader;
            shader.vertexShader = vertexShader;
            shader.uniforms.time = time;
          };
        }
      }
    });

    await renderer.compileAsync(model, camera, scene);

    scene.add(model);

    render();
  });
});

const material = new T.MeshStandardMaterial();
const geometry = new T.PlaneGeometry(3, 3);
const mesh = new T.Mesh(geometry, material);
mesh.rotation.x = -Math.PI / 2;

// scene.add(mesh)

material.onBeforeCompile = (shader) => {
  shader.fragmentShader = fragmentShader;
  shader.vertexShader = vertexShader;
  shader.uniforms.time = time;
};

const clock = new T.Clock();

let animationTriggered = false;
let animationCompleted = false;

playBtn?.addEventListener("click", () => {
  if (!animationTriggered || animationCompleted) {
    animationTriggered = true;
    animationCompleted = false;
    time.value = 0;
    clock.start();
  }
});

function render() {
  requestAnimationFrame(render);

  if (animationTriggered && !animationCompleted) {
    const elapsedTime = clock.getElapsedTime();
    time.value = elapsedTime;

    if (elapsedTime >= 2.0) {
      animationCompleted = true;
    }
  }

  renderer.render(scene, camera);
}
