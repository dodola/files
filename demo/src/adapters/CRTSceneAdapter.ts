import { WebGPURenderer } from 'three/webgpu';
import type { Pane } from 'tweakpane';
import type { IScene } from '../IScene';
import { CRTScreenScene, type CRTScreenSceneParameters } from '../scenes/CRTScreenScene';

const INITIAL_PARAMS: CRTScreenSceneParameters = {
  brightness: 1.8,
  bloomStrength: 0.8,
  bloomRadius: 0.5,
  bloomThreshold: 0.1,
  crtBarrel: 0.2,
  crtKeystoneX: 0.0,
  crtKeystoneY: 0.0,
  crtZoom: 0.97,
  pixelGapX: 0.0,
  subpixelSpacingX: 0.0,
  slotDutyX: 1.0,
  slotDutyY: 1.0,
  subpixelFeather: 0.0,
  phosphorTint: 0.15,
  beamGamma: 1.6,
  beamSpread: 1.3,
  vignetteStrength: 0.1,
  phaseShearAmount: 0.0,
  colorAttack: 20.0,
  colorDecay: 8.0,
  hsyncJitter: 0.0,
  hsyncSpeed: 6.0,
  chromaAmount: 0.0,
  rollSpeed: 0.0,
  burnInStrength: 0.0,
  burnInRate: 0.0,
};

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

    try {
      await this.renderer.init();
      this.scene = new CRTScreenScene();
      await this.scene.init(canvas, this.renderer);
      this.scene.updateParameters(INITIAL_PARAMS);
    } catch (err) {
      this.renderer.dispose();
      this.renderer = null;
      throw err;
    }

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
    const params: CRTScreenSceneParameters = { ...INITIAL_PARAMS };

    // ── Display ──────────────────────────────────────────────────────────
    const displayFolder = pane.addFolder({ title: 'Display' });
    displayFolder.addBinding(params, 'brightness', { min: 0, max: 3, step: 0.01 })
      .on('change', ({ value }) => this.scene?.updateParameters({ brightness: value }));

    // ── Phosphor ─────────────────────────────────────────────────────────
    const phosphorFolder = pane.addFolder({ title: 'Phosphor' });
    phosphorFolder.addBinding(params, 'slotDutyX', { min: 0.1, max: 1.0, step: 0.01, label: 'duty X' })
      .on('change', ({ value }) => this.scene?.updateParameters({ slotDutyX: value }));
    phosphorFolder.addBinding(params, 'slotDutyY', { min: 0.1, max: 1.0, step: 0.01, label: 'duty Y' })
      .on('change', ({ value }) => this.scene?.updateParameters({ slotDutyY: value }));
    phosphorFolder.addBinding(params, 'subpixelFeather', { min: 0.0, max: 1.0, step: 0.01, label: 'feather' })
      .on('change', ({ value }) => this.scene?.updateParameters({ subpixelFeather: value }));
    phosphorFolder.addBinding(params, 'phosphorTint', { min: 0.0, max: 0.5, step: 0.01, label: 'tint' })
      .on('change', ({ value }) => this.scene?.updateParameters({ phosphorTint: value }));
    phosphorFolder.addBinding(params, 'pixelGapX', { min: 0.0, max: 0.5, step: 0.01, label: 'pixel gap' })
      .on('change', ({ value }) => this.scene?.updateParameters({ pixelGapX: value }));
    phosphorFolder.addBinding(params, 'subpixelSpacingX', { min: 0.0, max: 0.5, step: 0.01, label: 'subpixel spacing' })
      .on('change', ({ value }) => this.scene?.updateParameters({ subpixelSpacingX: value }));

    // ── Beam ─────────────────────────────────────────────────────────────
    const beamFolder = pane.addFolder({ title: 'Beam' });
    beamFolder.addBinding(params, 'beamGamma', { min: 0.5, max: 4.0, step: 0.01, label: 'gamma' })
      .on('change', ({ value }) => this.scene?.updateParameters({ beamGamma: value }));
    beamFolder.addBinding(params, 'beamSpread', { min: 0.0, max: 5.0, step: 0.01, label: 'spread' })
      .on('change', ({ value }) => this.scene?.updateParameters({ beamSpread: value }));
    beamFolder.addBinding(params, 'vignetteStrength', { min: 0.0, max: 1.0, step: 0.01, label: 'vignette' })
      .on('change', ({ value }) => this.scene?.updateParameters({ vignetteStrength: value }));
    beamFolder.addBinding(params, 'phaseShearAmount', { min: 0.0, max: 2.0, step: 0.01, label: 'phase shear' })
      .on('change', ({ value }) => this.scene?.updateParameters({ phaseShearAmount: value }));

    // ── Color ────────────────────────────────────────────────────────────
    const colorFolder = pane.addFolder({ title: 'Color' });
    colorFolder.addBinding(params, 'colorAttack', { min: 1.0, max: 60.0, step: 0.5, label: 'attack' })
      .on('change', ({ value }) => this.scene?.updateParameters({ colorAttack: value }));
    colorFolder.addBinding(params, 'colorDecay', { min: 1.0, max: 60.0, step: 0.5, label: 'decay' })
      .on('change', ({ value }) => this.scene?.updateParameters({ colorDecay: value }));

    // ── CRT Distortion ───────────────────────────────────────────────────
    const crtFolder = pane.addFolder({ title: 'CRT' });
    crtFolder.addBinding(params, 'crtBarrel', { min: 0.0, max: 1.0, step: 0.01, label: 'barrel' })
      .on('change', ({ value }) => this.scene?.updateParameters({ crtBarrel: value }));
    crtFolder.addBinding(params, 'crtKeystoneX', { min: -0.5, max: 0.5, step: 0.01, label: 'keystone X' })
      .on('change', ({ value }) => this.scene?.updateParameters({ crtKeystoneX: value }));
    crtFolder.addBinding(params, 'crtKeystoneY', { min: -0.5, max: 0.5, step: 0.01, label: 'keystone Y' })
      .on('change', ({ value }) => this.scene?.updateParameters({ crtKeystoneY: value }));
    crtFolder.addBinding(params, 'crtZoom', { min: 0.8, max: 1.2, step: 0.01, label: 'zoom' })
      .on('change', ({ value }) => this.scene?.updateParameters({ crtZoom: value }));

    // ── Bloom ────────────────────────────────────────────────────────────
    const bloomFolder = pane.addFolder({ title: 'Bloom' });
    bloomFolder.addBinding(params, 'bloomStrength', { min: 0, max: 3, step: 0.01, label: 'strength' })
      .on('change', ({ value }) => this.scene?.updateParameters({ bloomStrength: value }));
    bloomFolder.addBinding(params, 'bloomRadius', { min: 0, max: 1, step: 0.01, label: 'radius' })
      .on('change', ({ value }) => this.scene?.updateParameters({ bloomRadius: value }));
    bloomFolder.addBinding(params, 'bloomThreshold', { min: 0, max: 1, step: 0.01, label: 'threshold' })
      .on('change', ({ value }) => this.scene?.updateParameters({ bloomThreshold: value }));

    // ── Artifacts ────────────────────────────────────────────────────────
    const artifactsFolder = pane.addFolder({ title: 'Artifacts', expanded: false });
    artifactsFolder.addBinding(params, 'hsyncJitter', { min: 0.0, max: 5.0, step: 0.1, label: 'h-sync jitter' })
      .on('change', ({ value }) => this.scene?.updateParameters({ hsyncJitter: value }));
    artifactsFolder.addBinding(params, 'hsyncSpeed', { min: 1.0, max: 30.0, step: 0.5, label: 'h-sync speed' })
      .on('change', ({ value }) => this.scene?.updateParameters({ hsyncSpeed: value }));
    artifactsFolder.addBinding(params, 'chromaAmount', { min: 0.0, max: 5.0, step: 0.1, label: 'chroma aber.' })
      .on('change', ({ value }) => this.scene?.updateParameters({ chromaAmount: value }));
    artifactsFolder.addBinding(params, 'rollSpeed', { min: -200, max: 200, step: 1, label: 'roll speed' })
      .on('change', ({ value }) => this.scene?.updateParameters({ rollSpeed: value }));

    // ── Burn-in ──────────────────────────────────────────────────────────
    const burnInFolder = pane.addFolder({ title: 'Burn-in', expanded: false });
    burnInFolder.addBinding(params, 'burnInStrength', { min: 0.0, max: 1.0, step: 0.01, label: 'strength' })
      .on('change', ({ value }) => this.scene?.updateParameters({ burnInStrength: value }));
    burnInFolder.addBinding(params, 'burnInRate', { min: 0.0, max: 0.5, step: 0.01, label: 'rate' })
      .on('change', ({ value }) => this.scene?.updateParameters({ burnInRate: value }));
  }

  onResize(width: number, height: number): void {
    this.scene?.onResize(width, height);
    this.renderer?.setSize(width, height);
  }
}
