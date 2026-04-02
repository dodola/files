import { WebGPURenderer } from 'three/webgpu';
import type { Pane } from 'tweakpane';
import type { IScene } from '../IScene';
import { CRTScreenScene, type CRTScreenSceneParameters } from '../scenes/CRTScreenScene';

export class CRTSceneAdapter implements IScene {
  private scene: CRTScreenScene | null = null;
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

    this.scene = new CRTScreenScene();
    await this.scene.init(canvas, this.renderer);
    this.scene.updateParameters({ shaderType: 'mandelbrot', displayMode: 'shader' });

    this.startLoop();
  }

  private startLoop(): void {
    const loop = (time: number) => {
      if (!this.scene || !this.renderer) return;
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
    const params: CRTScreenSceneParameters = {
      displayMode: 'shader',
      shaderType: 'mandelbrot',
      brightness: 1.0,
      bloomStrength: 0.8,
      bloomRadius: 0.5,
      bloomThreshold: 0.1,
      crtAmount: 0.5,
      crtBarrel: 0.2,
      moireStrength: 0.3,
      screenCurvature: 0.1,
    };

    const displayFolder = pane.addFolder({ title: 'Display' });
    displayFolder.addBinding(params, 'displayMode', {
      options: { shader: 'shader', static: 'static', terminal: 'terminal' },
    }).on('change', ({ value }) => this.scene?.updateParameters({ displayMode: value as CRTScreenSceneParameters['displayMode'] }));

    displayFolder.addBinding(params, 'shaderType', {
      options: { mandelbrot: 'mandelbrot', julia: 'julia' },
    }).on('change', ({ value }) => this.scene?.updateParameters({ shaderType: value as 'mandelbrot' | 'julia' }));

    displayFolder.addBinding(params, 'brightness', { min: 0, max: 2, step: 0.01 })
      .on('change', ({ value }) => this.scene?.updateParameters({ brightness: value }));

    const crtFolder = pane.addFolder({ title: 'CRT' });
    crtFolder.addBinding(params, 'crtAmount', { min: 0, max: 1, step: 0.01 })
      .on('change', ({ value }) => this.scene?.updateParameters({ crtAmount: value }));
    crtFolder.addBinding(params, 'crtBarrel', { min: 0, max: 1, step: 0.01 })
      .on('change', ({ value }) => this.scene?.updateParameters({ crtBarrel: value }));
    crtFolder.addBinding(params, 'screenCurvature', { min: 0, max: 1, step: 0.01 })
      .on('change', ({ value }) => this.scene?.updateParameters({ screenCurvature: value }));
    crtFolder.addBinding(params, 'moireStrength', { min: 0, max: 1, step: 0.01 })
      .on('change', ({ value }) => this.scene?.updateParameters({ moireStrength: value }));

    const bloomFolder = pane.addFolder({ title: 'Bloom' });
    bloomFolder.addBinding(params, 'bloomStrength', { min: 0, max: 3, step: 0.01 })
      .on('change', ({ value }) => this.scene?.updateParameters({ bloomStrength: value }));
    bloomFolder.addBinding(params, 'bloomRadius', { min: 0, max: 1, step: 0.01 })
      .on('change', ({ value }) => this.scene?.updateParameters({ bloomRadius: value }));
    bloomFolder.addBinding(params, 'bloomThreshold', { min: 0, max: 1, step: 0.01 })
      .on('change', ({ value }) => this.scene?.updateParameters({ bloomThreshold: value }));
  }

  onResize(width: number, height: number): void {
    this.scene?.onResize(width, height);
    this.renderer?.setSize(width, height);
  }
}
