import * as THREE from "three";
import GUI from "lil-gui";
import vertex from "./glsl/vertex.glsl";
import fragment from "./glsl/fragment.glsl";

export default class App {
  constructor() {
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
    this.camera.position.z = 4;
    this.camera.frustumCulled = false;

    this.scene = new THREE.Scene();
    this.scene.add(this.camera);

    this.holder = new THREE.Object3D();
    this.holder.sortObjects = false;
    this.scene.add(this.holder);

    // Web Audio API Setup
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

    this.gui = new GUI();
    this.time = 0;

    const uniforms = {
      time: { value: 0 },
      offsetSize: { value: 2 },
      size: { value: 2 }, // Size of the points
      frequency: { value: 0.5 },
      amplitude: { value: 0.8 },
      offsetGain: { value: 0 }, // Up and down -  default 1
      maxDistance: { value: 1.8 },
      startColor: { value: new THREE.Color(0x272e29) },
      endColor: { value: new THREE.Color(0xfffcb6) },
    };

    const green = 0x272e29;
    const yellow = 0xfffcb6;

    this.material = new THREE.ShaderMaterial({
      side: THREE.DoubleSide,
      vertexShader: vertex,
      fragmentShader: fragment,
      transparent: true,
      uniforms,
    });

    setInterval(() => {
      if (this.guiProperties.autoRandom) {
        this.guiProperties.randomizeMeshes();
      }
    }, 1000);

    this.setGUI();
    this.createCube();

    this.update();

    this.resize();
    window.addEventListener("resize", () => this.resize());
  }

  createCube() {
    let widthSeg = Math.floor(THREE.MathUtils.randInt(5, 80));
    let heightSeg = Math.floor(THREE.MathUtils.randInt(1, 80));
    let depthSeg = Math.floor(THREE.MathUtils.randInt(5, 80));

    this.geometry = new THREE.BoxGeometry(
      4,
      1,
      1,
      widthSeg,
      heightSeg,
      depthSeg
    );
    this.pointsMesh = new THREE.Points(this.geometry, this.material);
    this.holder.add(this.pointsMesh);

    this.segmentsFolder?.destroy();
    this.segmentsFolder = this.gui.addFolder("Segments");
    this.guiProperties.segments = {
      width: widthSeg,
      height: heightSeg,
      depth: depthSeg,
    };
    this.segmentsFolder.add(this.guiProperties.segments, "width", 5, 80);
    this.segmentsFolder.add(this.guiProperties.segments, "height", 1, 80);
    this.segmentsFolder.add(this.guiProperties.segments, "depth", 5, 80);
    this.segmentsFolder
      .add(this.guiProperties, "randomizeSegments")
      .name("Randomize Segments");

    this.segmentsFolder.onChange(() => {
      this.holder.remove(this.pointsMesh);
      this.geometry = new THREE.BoxGeometry(
        1,
        1,
        1,
        this.guiProperties.segments.width,
        this.guiProperties.segments.height,
        this.guiProperties.segments.depth
      );
      this.pointsMesh = new THREE.Points(this.geometry, this.material);
      this.holder.add(this.pointsMesh);
    });
  }

  createCylinder() {
    return null;
  }

  setGUI() {
    this.guiProperties = {
      segments: {},
      mesh: "Cube",
      autoRotate: false,
      autoRandom: false,
      randomizeSegments: () => {
        this.holder.remove(this.pointsMesh);
        this.createCube();
      },
      randomizeMeshes: () => {
        this.holder.remove(this.pointsMesh);
        if (Math.random() < 0.5) {
          this.guiProperties.mesh = "Cube";
          this.createCube();
        } else {
          this.guiProperties.mesh = "Cylinder";
          this.createCylinder();
        }
      },
    };

    this.gui
      .add(this.guiProperties, "mesh", ["Cube", "Cylinder"])
      .onChange((value) => {
        this.holder.remove(this.pointsMesh);
        if (value === "Cube") {
          this.createCube();
        } else {
          this.createCylinder();
        }
      })
      .listen();

    this.gui.add(this.guiProperties, "autoRotate").name("Auto Rotate");
    this.gui.add(this.guiProperties, "autoRandom").name("Auto Randomize");
    this.gui
      .add(this.guiProperties, "randomizeMeshes")
      .name("Randomize Meshes");

    this.shaderFolder = this.gui.addFolder("Shader");
    this.shaderFolder
      .add(this.material.uniforms.frequency, "value", 0, 5)
      .name("Frequency");
    this.shaderFolder
      .add(this.material.uniforms.amplitude, "value", 0, 5)
      .name("Amplitude");
    this.gui.close();
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

      this.material.uniforms.amplitude.value = Math.max(0.8, avgFrequency/80);
      this.material.uniforms.offsetGain.value = avgFrequency/30;
    }

    if (this.guiProperties.autoRotate) {
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
