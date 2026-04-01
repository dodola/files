import * as THREE from 'three/webgpu';
import { WebGPURenderer } from 'three/webgpu';
import { uniform, texture } from 'three/tsl';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { Pane } from 'tweakpane';
import type { IScene } from '../IScene';
import { BoxFroxelPipeline, type FogVolumeConfig } from '../scenes/BoxFroxelPipeline';

export class FroxelFogAdapter implements IScene {
  private renderer: WebGPURenderer | null = null;
  private scene: THREE.Scene | null = null;
  private camera: THREE.PerspectiveCamera | null = null;
  private controls: OrbitControls | null = null;
  private pipeline: BoxFroxelPipeline | null = null;
  private rafId: number | null = null;

  // Uniforms passed to BoxFroxelPipeline
  private froxelResolutionUniform = uniform(new THREE.Vector3(1, 1, 1), 'vec3');
  private froxelStepUniform = uniform(1.0, 'float');
  private cameraProjectionInverseUniform = uniform(new THREE.Matrix4());
  private cameraWorldMatrixUniform = uniform(new THREE.Matrix4());
  private cameraNearUniform = uniform(0.1, 'float');
  private cameraFarUniform = uniform(100.0, 'float');
  private fogDensityUniform = uniform(1.0, 'float');
  private cameraIsOrthographicUniform = uniform(0, 'float');
  private shadowReadyUniform = uniform(0, 'float');
  private shadowBiasUniform = uniform(0.001, 'float');
  private shadowMapSizeUniform = uniform(new THREE.Vector2(1, 1));
  private shadowMatrixUniform = uniform(new THREE.Matrix4());
  private shadowWebGPUUniform = uniform(1, 'float');

  private fogVolumes: FogVolumeConfig[] = [
    { type: 'sphere', center: new THREE.Vector3(0, 0, 0), radius: 2.0, density: 1.0 },
  ];

  async mount(canvas: HTMLCanvasElement): Promise<void> {
    const width = canvas.clientWidth || window.innerWidth;
    const height = canvas.clientHeight || window.innerHeight;

    this.renderer = new WebGPURenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(width, height);
    await this.renderer.init();

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x111111);

    this.camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 100);
    this.camera.position.set(0, 3, 8);
    this.camera.lookAt(0, 0, 0);
    this.cameraNearUniform.value = this.camera.near;
    this.cameraFarUniform.value = this.camera.far;

    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableDamping = true;

    // Dummy shadow texture
    const dummyShadowTex = new THREE.DepthTexture(1, 1);
    const shadowTextureNode = texture(dummyShadowTex as any);

    // Sphere mesh
    const geo = new THREE.SphereGeometry(1, 32, 32);
    const mat = new THREE.MeshStandardMaterial({ color: 0x888888 });
    this.scene.add(new THREE.Mesh(geo, mat));

    // Light
    const light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(5, 10, 5);
    this.scene.add(light);
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.2));

    this.pipeline = new BoxFroxelPipeline({
      froxelResolutionUniform: this.froxelResolutionUniform,
      froxelStepUniform: this.froxelStepUniform,
      cameraProjectionInverseUniform: this.cameraProjectionInverseUniform,
      cameraWorldMatrixUniform: this.cameraWorldMatrixUniform,
      cameraNearUniform: this.cameraNearUniform,
      cameraFarUniform: this.cameraFarUniform,
      fogDensityUniform: this.fogDensityUniform,
      cameraIsOrthographicUniform: this.cameraIsOrthographicUniform,
      shadowDepthTextureNode: shadowTextureNode,
      shadowReadyUniform: this.shadowReadyUniform,
      shadowBiasUniform: this.shadowBiasUniform,
      shadowMapSizeUniform: this.shadowMapSizeUniform,
      shadowMatrixUniform: this.shadowMatrixUniform,
      shadowWebGPUUniform: this.shadowWebGPUUniform,
    });

    this.pipeline.init(width, height, this.camera);
    this.pipeline.setFogVolumes(this.fogVolumes);

    this.startLoop();
  }

  private startLoop(): void {
    const loop = () => {
      if (!this.renderer || !this.scene || !this.camera || !this.pipeline) return;
      this.controls?.update();

      this.cameraProjectionInverseUniform.value.copy(this.camera.projectionMatrixInverse);
      this.cameraWorldMatrixUniform.value.copy(this.camera.matrixWorld);

      this.pipeline.compute(this.renderer);
      this.renderer.render(this.scene, this.camera);
      this.rafId = requestAnimationFrame(loop);
    };
    this.rafId = requestAnimationFrame(loop);
  }

  dispose(): void {
    if (this.rafId !== null) cancelAnimationFrame(this.rafId);
    this.pipeline?.dispose();
    this.controls?.dispose();
    this.renderer?.dispose();
    this.pipeline = null;
    this.renderer = null;
    this.scene = null;
    this.camera = null;
  }

  buildPane(pane: Pane): void {
    const params = {
      fogDensity: 1.0,
      volume0Radius: 2.0,
      volume0Density: 1.0,
      volume0Enabled: true,
    };

    pane.addBinding(params, 'fogDensity', { min: 0, max: 10, step: 0.1 })
      .on('change', ({ value }) => { this.fogDensityUniform.value = value; });

    const volFolder = pane.addFolder({ title: 'Volume 0 (Sphere)' });
    volFolder.addBinding(params, 'volume0Enabled')
      .on('change', ({ value }) => {
        this.fogVolumes[0].enabled = value;
        this.pipeline?.setFogVolumes(this.fogVolumes);
      });
    volFolder.addBinding(params, 'volume0Radius', { min: 0.1, max: 10, step: 0.1 })
      .on('change', ({ value }) => {
        this.fogVolumes[0].radius = value;
        this.pipeline?.setFogVolumes(this.fogVolumes);
      });
    volFolder.addBinding(params, 'volume0Density', { min: 0, max: 5, step: 0.1 })
      .on('change', ({ value }) => {
        this.fogVolumes[0].density = value;
        this.pipeline?.setFogVolumes(this.fogVolumes);
      });
  }

  onResize(width: number, height: number): void {
    if (!this.camera || !this.renderer || !this.pipeline) return;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
    this.pipeline.init(width, height, this.camera);
    this.pipeline.setFogVolumes(this.fogVolumes);
  }
}
