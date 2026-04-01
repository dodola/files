import { WebGPURenderer } from 'three/webgpu';
import type { Pane } from 'tweakpane';
import type { IScene } from '../IScene';
import { BioluminescenceScene } from '../scenes/BioluminescenceScene';

export class BioluminescenceAdapter implements IScene {
  private scene: BioluminescenceScene | null = null;
  private renderer: WebGPURenderer | null = null;
  private rafId: number | null = null;
  private lastTime = 0;

  async mount(canvas: HTMLCanvasElement): Promise<void> {
    const width = canvas.clientWidth || window.innerWidth;
    const height = canvas.clientHeight || window.innerHeight;
    this.renderer = new WebGPURenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(width, height);
    await this.renderer.init();
    this.scene = new BioluminescenceScene();
    await this.scene.init(canvas, this.renderer);
    this.startLoop();
  }

  private startLoop(): void {
    const loop = (time: number) => {
      if (!this.scene) return;
      const dt = (time - this.lastTime) / 1000;
      this.lastTime = time;
      this.scene.update(dt);
      this.scene.render();
      this.rafId = requestAnimationFrame(loop);
    };
    this.rafId = requestAnimationFrame((t) => {
      this.lastTime = t;
      loop(t);
    });
  }

  dispose(): void {
    if (this.rafId !== null) cancelAnimationFrame(this.rafId);
    this.scene?.cleanup();
    this.renderer?.dispose();
    this.scene = null;
    this.renderer = null;
  }

  buildPane(pane: Pane): void {
    if (!this.scene) return;
    const params = {
      particleSize: 0.03,
      particleNoiseStrength: 0.1,
      particleGravity: 0.0,
      activationScale: 3.0,
      activationSpeed: 1.0,
      bubbleAutoEmit: false,
      bubbleGravity: 9.81,
      bubbleSpawnRate: 20.0,
      baseColor: '#00bcd4',
      activeColor: '#7dffb0',
      baseAlpha: 0.2,
      activeAlpha: 0.95,
      emissiveStrength: 1.6,
      bloomStrength: 1.0,
      bloomThreshold: 0.1,
      backgroundColor: '#000000',
    };

    const particleFolder = pane.addFolder({ title: 'Particles' });
    particleFolder.addBinding(params, 'particleSize', { min: 0.005, max: 0.2, step: 0.001 })
      .on('change', ({ value }) => this.scene?.updateParameters({ particleSize: value }));
    particleFolder.addBinding(params, 'particleNoiseStrength', { min: 0, max: 1, step: 0.01 })
      .on('change', ({ value }) => this.scene?.updateParameters({ particleNoiseStrength: value }));
    particleFolder.addBinding(params, 'particleGravity', { min: -2, max: 2, step: 0.01 })
      .on('change', ({ value }) => this.scene?.updateParameters({ particleGravity: value }));
    particleFolder.addBinding(params, 'activationScale', { min: 0.5, max: 10, step: 0.1 })
      .on('change', ({ value }) => this.scene?.updateParameters({ activationScale: value }));
    particleFolder.addBinding(params, 'activationSpeed', { min: 0.1, max: 5, step: 0.1 })
      .on('change', ({ value }) => this.scene?.updateParameters({ activationSpeed: value }));

    const bubbleFolder = pane.addFolder({ title: 'Bubbles' });
    bubbleFolder.addBinding(params, 'bubbleAutoEmit')
      .on('change', ({ value }) => this.scene?.updateParameters({ bubbleAutoEmit: value }));
    bubbleFolder.addBinding(params, 'bubbleGravity', { min: 0, max: 20, step: 0.1 })
      .on('change', ({ value }) => this.scene?.updateParameters({ bubbleGravity: value }));
    bubbleFolder.addBinding(params, 'bubbleSpawnRate', { min: 1, max: 100, step: 1 })
      .on('change', ({ value }) => this.scene?.updateParameters({ bubbleSpawnRate: value }));

    const colorFolder = pane.addFolder({ title: 'Colors' });
    colorFolder.addBinding(params, 'baseColor')
      .on('change', ({ value }) => this.scene?.updateParameters({ baseColor: value }));
    colorFolder.addBinding(params, 'activeColor')
      .on('change', ({ value }) => this.scene?.updateParameters({ activeColor: value }));
    colorFolder.addBinding(params, 'baseAlpha', { min: 0, max: 1, step: 0.01 })
      .on('change', ({ value }) => this.scene?.updateParameters({ baseAlpha: value }));
    colorFolder.addBinding(params, 'activeAlpha', { min: 0, max: 1, step: 0.01 })
      .on('change', ({ value }) => this.scene?.updateParameters({ activeAlpha: value }));
    colorFolder.addBinding(params, 'emissiveStrength', { min: 0, max: 5, step: 0.1 })
      .on('change', ({ value }) => this.scene?.updateParameters({ emissiveStrength: value }));
    colorFolder.addBinding(params, 'backgroundColor')
      .on('change', ({ value }) => this.scene?.updateParameters({ backgroundColor: value }));

    const bloomFolder = pane.addFolder({ title: 'Bloom' });
    bloomFolder.addBinding(params, 'bloomStrength', { min: 0, max: 3, step: 0.01 })
      .on('change', ({ value }) => this.scene?.updateParameters({ bloomStrength: value }));
    bloomFolder.addBinding(params, 'bloomThreshold', { min: 0, max: 1, step: 0.01 })
      .on('change', ({ value }) => this.scene?.updateParameters({ bloomThreshold: value }));
  }

  onResize(width: number, height: number): void {
    this.scene?.onResize(width, height);
  }
}
