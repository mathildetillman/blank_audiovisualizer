import * as THREE from "three";
import GUI from "lil-gui";
import vertex from "./glsl/vertex.glsl";
import fragment from "./glsl/fragment.glsl";

const presets = [
  {
    frequency: 0.2,
    amplitude: 0.2,
    pointSize: 2,
    widthSegments: 80,
    heightSegments: 30,
    depthSegments: 50,
    offSet: 200,
    camera: 6,
  },
  {
    frequency: 0.7,
    amplitude: 4.3,
    pointSize: 2,
    widthSegments: 80,
    heightSegments: 30,
    depthSegments: 50,
    offSet: 200,
    camera: 3,
  },
  {
    frequency: 4.63,
    amplitude: 4.8,
    pointSize: 1.4,
    widthSegments: 80,
    heightSegments: 80,
    depthSegments: 80,
    offSet: 18,
    camera: 1.2,
  },
  {
    frequency: 5,
    amplitude: 5,
    pointSize: 2.6,
    widthSegments: 80,
    heightSegments: 80,
    depthSegments: 80,
    offSet: 15.6,
    camera: 13.7,
  },
  {
    frequency: 1.31,
    amplitude: 4.3,
    pointSize: 2.26,
    widthSegments: 80,
    heightSegments: 30,
    depthSegments: 50,
    offSet: 72.2,
    camera: 0.51,
  },
  {
    frequency: 2.48,
    amplitude: 4.3,
    pointSize: 1.4,
    widthSegments: 80,
    heightSegments: 30,
    depthSegments: 50,
    offSet: 47.6,
    camera: 3.45,
  },
];

const boxWidth = 4;
const boxHeight = 1;
const boxDepth = 1;

const maxSegments = 80; // 80

const minPointSize = 0.5;
const maxPointSize = 3;

const cameraDistanceMin = 0;
const cameraDistanceMax = 30;

const green = 0x272e29;
const yellow = 0xfffcb6;

export default class App {
  constructor() {
    //* SETUP
    this.time = 0;
    this.preset = 1
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
    });
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.autoClear = false;
    document.body.appendChild(this.renderer.domElement);

    this.camera = new THREE.PerspectiveCamera(
      70,
      window.innerWidth / window.innerHeight,
      0.1,
      10000
    );
    this.camera.position.z = presets[this.preset].camera;
    this.camera.frustumCulled = false;

    this.scene = new THREE.Scene();
    this.scene.add(this.camera);

    this.holder = new THREE.Object3D();
    this.holder.sortObjects = false;
    this.scene.add(this.holder);

    //* WEB AUDIO
    this.audioContext, this.analyser, this.dataArray;
    navigator.mediaDevices
      .getUserMedia({ audio: true, video: false })
      .then((stream) => {
        this.audioContext = new (window.AudioContext ||
          window.webkitAudioContext)();
        const source = this.audioContext.createMediaStreamSource(stream);
        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = 256; // Resolution of frequency data
        source.connect(this.analyser);
        this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
        animate();
      })
      .catch((err) => {
        console.error("Error accessing microphone:", err);
      });


    //* MATERIAL
    const startPreset = presets[this.preset];
    this.material = new THREE.ShaderMaterial({
      side: THREE.DoubleSide,
      vertexShader: vertex,
      fragmentShader: fragment,
      transparent: true,
      uniforms: {
        time: { value: 0 },
        offsetSize: { value: 2 },
        size: {
          value: startPreset.pointSize,
        }, // Size of the points
        frequency: { value: startPreset.frequency },
        amplitude: { value: startPreset.amplitude },
        offsetGain: { value: startPreset.offSet }, // Up and down
        maxDistance: { value: 1.8 },
        startColor: { value: new THREE.Color(green) },
        endColor: { value: new THREE.Color(yellow) },
      },
    });

    this.gui = new GUI();
    this.setGUI();
    this.createCube();
    this.update();
    this.resize();
    window.addEventListener("resize", () => this.resize());
  }

  createCube() {
    //* MATERIAL
    const startPreset = presets[this.preset];
    this.material.uniforms.frequency.value = startPreset.frequency;
    this.material.uniforms.amplitude.value = startPreset.amplitude;
    this.material.uniforms.size.value = startPreset.pointSize;
    this.material.uniforms.offsetGain.value = startPreset.offSet;

    this.geometry = new THREE.BoxGeometry(
      boxWidth,
      boxHeight,
      boxDepth,
      startPreset.widthSegments,
      startPreset.heightSegments,
      startPreset.depthSegments
    );
    this.pointsMesh = new THREE.Points(this.geometry, this.material);
    this.holder.add(this.pointsMesh);

    //* GUI

    this.shaderFolder?.destroy();
    this.shaderFolder = this.gui.addFolder("Shader");
    this.shaderFolder
      .add(this.material.uniforms.frequency, "value", 0, 5)
      .name("Frequency");
    this.shaderFolder
      .add(this.material.uniforms.amplitude, "value", 0, 5)
      .name("Amplitude");
    this.shaderFolder
      .add(this.material.uniforms.size, "value", minPointSize, maxPointSize)
      .name("Point size");

    this.segmentsFolder?.destroy();
    this.segmentsFolder = this.gui.addFolder("Segments");

    // Define GUI properties
    this.guiProperties.segments = {
      width: startPreset.widthSegments,
      height: startPreset.heightSegments,
      depth: startPreset.depthSegments,
      offset: startPreset.offSet,
      camera: startPreset.camera,
    };

    // Add GUI properties
    this.segmentsFolder.add(
      this.guiProperties.segments,
      "width",
      1,
      maxSegments
    );
    this.segmentsFolder.add(
      this.guiProperties.segments,
      "height",
      1,
      maxSegments
    );
    this.segmentsFolder.add(
      this.guiProperties.segments,
      "depth",
      1,
      maxSegments
    );

    this.segmentsFolder.add(this.guiProperties.segments, "offset", 0, 200);
    this.segmentsFolder.add(
      this.guiProperties.segments,
      "camera",
      cameraDistanceMin,
      cameraDistanceMax
    );

    this.segmentsFolder.add(this.guiProperties, "next").name("Next");

    this.segmentsFolder.onChange(() => {
      this.holder.remove(this.pointsMesh);
      this.geometry = new THREE.BoxGeometry(
        boxWidth,
        boxHeight,
        boxDepth,
        this.guiProperties.segments.width,
        this.guiProperties.segments.height,
        this.guiProperties.segments.depth
      );
      this.pointsMesh = new THREE.Points(this.geometry, this.material);
      this.holder.add(this.pointsMesh);
      this.camera.position.z = this.guiProperties.segments.camera;
    });
  }

  setGUI() {
    this.guiProperties = {
      Rotate: false,
      segments: {},
      shader: {},
      next: () => {
        this.holder.remove(this.pointsMesh);
        this.preset = this.preset === presets.length - 1 ? 0 : this.preset + 1;
        this.createCube();
      },
    };
    this.gui.add(this.guiProperties, "Rotate").name("Rotate");
    // this.gui.close();
  }

  resize() {
    this.width = window.innerWidth;
    this.height = window.innerHeight;

    this.camera.aspect = this.width / this.height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.width, this.height);
  }

  normalize(val, max, min) {
    return (val - min) / (max - min);
  }

  update() {
    requestAnimationFrame(() => this.update());

    if (this.analyser) {
      this.analyser.getByteFrequencyData(this.dataArray);

      // Get the average volume from the frequency data
      const avgFrequency =
        this.dataArray.reduce((a, b) => a + b, 0) / this.dataArray.length;

      const bass = this.dataArray.slice(0, 10).reduce((a, b) => a + b) / 10; // Bass frequencies

      // Example: Use high frequencies to control rotation
      const treble = this.dataArray.slice(80, 128).reduce((a, b) => a + b) ; // Treble frequencies

      // this.material.uniforms.amplitude.value = Math.max(0.8, treble/2000);
      this.material.uniforms.amplitude.value = Math.max(
        0.8,
        avgFrequency / 100
      );
      this.material.uniforms.offsetGain.value =
        bass / this.guiProperties.segments.offset;
    }

    if (this.guiProperties.Rotate) {
      this.holder.rotation.x += 0.01;
      this.holder.rotation.y += 0.01;
    } else {
      this.holder.rotation.set(0, 0, 0);
    }

    this.time += 0.1;
    this.material.uniforms.time.value = this.time;

    this.renderer.render(this.scene, this.camera);
  }
}
