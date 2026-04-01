import { WebGPURenderer } from 'three/webgpu';
import type { Pane } from 'tweakpane';
import type { IScene } from '../IScene';
import { PlanetScene } from '../scenes/PlanetScene';

export class PlanetAdapter implements IScene {
  private scene: PlanetScene | null = null;
  private renderer: WebGPURenderer | null = null;
  private rafId: number | null = null;

  async mount(canvas: HTMLCanvasElement): Promise<void> {
    const width = canvas.clientWidth || window.innerWidth;
    const height = canvas.clientHeight || window.innerHeight;
    this.renderer = new WebGPURenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(width, height);
    await this.renderer.init();
    this.scene = new PlanetScene();
    await this.scene.init(canvas, this.renderer);
    this.startLoop();
  }

  private startLoop(): void {
    const loop = () => {
      if (!this.scene) return;
      this.scene.update();
      this.scene.render();
      this.rafId = requestAnimationFrame(loop);
    };
    this.rafId = requestAnimationFrame(loop);
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
      ambientStrength: 0.05,
      sunColor: '#ffffff',
      sphere1FogDensity: 3.0,
      sphere1AtmosphereAltitude: 0.3,
      sphere1FalloffPower: 4.0,
      sphere1MultiScatterBoost: 0.3,
      sphere1PhaseG: 0.7,
      sphere1RayleighStrength: 1.0,
      sphere1MieStrength: 0.5,
      sphere1RayleighColor: '#4488ff',
      sphere1MieColor: '#ffddaa',
      sphere2FogDensity: 1.0,
      sphere2AtmosphereAltitude: 0.6,
      sphere2FalloffPower: 2.0,
      sphere2MultiScatterBoost: 0.1,
      sphere2PhaseG: 0.3,
      sphere2RayleighStrength: 0.3,
      sphere2MieStrength: 0.1,
      sphere2RayleighColor: '#aaccff',
      sphere2MieColor: '#ffffff',
    };

    const lightFolder = pane.addFolder({ title: 'Lighting' });
    lightFolder.addBinding(params, 'ambientStrength', { min: 0, max: 1, step: 0.01 })
      .on('change', ({ value }) => this.scene?.updateParameters({ ambientStrength: value }));
    lightFolder.addBinding(params, 'sunColor')
      .on('change', ({ value }) => this.scene?.updateParameters({ sunColor: value }));

    const atm1 = pane.addFolder({ title: 'Atmosphere 1 (Inner)' });
    atm1.addBinding(params, 'sphere1FogDensity', { min: 0, max: 20, step: 0.1 })
      .on('change', ({ value }) => this.scene?.updateParameters({ sphere1FogDensity: value }));
    atm1.addBinding(params, 'sphere1AtmosphereAltitude', { min: 0.01, max: 2, step: 0.01 })
      .on('change', ({ value }) => this.scene?.updateParameters({ sphere1AtmosphereAltitude: value }));
    atm1.addBinding(params, 'sphere1FalloffPower', { min: 0.5, max: 20, step: 0.1 })
      .on('change', ({ value }) => this.scene?.updateParameters({ sphere1FalloffPower: value }));
    atm1.addBinding(params, 'sphere1MultiScatterBoost', { min: 0, max: 2, step: 0.01 })
      .on('change', ({ value }) => this.scene?.updateParameters({ sphere1MultiScatterBoost: value }));
    atm1.addBinding(params, 'sphere1PhaseG', { min: -0.99, max: 0.99, step: 0.01 })
      .on('change', ({ value }) => this.scene?.updateParameters({ sphere1PhaseG: value }));
    atm1.addBinding(params, 'sphere1RayleighStrength', { min: 0, max: 5, step: 0.01 })
      .on('change', ({ value }) => this.scene?.updateParameters({ sphere1RayleighStrength: value }));
    atm1.addBinding(params, 'sphere1MieStrength', { min: 0, max: 5, step: 0.01 })
      .on('change', ({ value }) => this.scene?.updateParameters({ sphere1MieStrength: value }));
    atm1.addBinding(params, 'sphere1RayleighColor')
      .on('change', ({ value }) => this.scene?.updateParameters({ sphere1RayleighColor: value }));
    atm1.addBinding(params, 'sphere1MieColor')
      .on('change', ({ value }) => this.scene?.updateParameters({ sphere1MieColor: value }));

    const atm2 = pane.addFolder({ title: 'Atmosphere 2 (Outer)' });
    atm2.addBinding(params, 'sphere2FogDensity', { min: 0, max: 10, step: 0.1 })
      .on('change', ({ value }) => this.scene?.updateParameters({ sphere2FogDensity: value }));
    atm2.addBinding(params, 'sphere2AtmosphereAltitude', { min: 0.01, max: 2, step: 0.01 })
      .on('change', ({ value }) => this.scene?.updateParameters({ sphere2AtmosphereAltitude: value }));
    atm2.addBinding(params, 'sphere2FalloffPower', { min: 0.5, max: 20, step: 0.1 })
      .on('change', ({ value }) => this.scene?.updateParameters({ sphere2FalloffPower: value }));
    atm2.addBinding(params, 'sphere2MultiScatterBoost', { min: 0, max: 2, step: 0.01 })
      .on('change', ({ value }) => this.scene?.updateParameters({ sphere2MultiScatterBoost: value }));
    atm2.addBinding(params, 'sphere2PhaseG', { min: -0.99, max: 0.99, step: 0.01 })
      .on('change', ({ value }) => this.scene?.updateParameters({ sphere2PhaseG: value }));
    atm2.addBinding(params, 'sphere2RayleighStrength', { min: 0, max: 5, step: 0.01 })
      .on('change', ({ value }) => this.scene?.updateParameters({ sphere2RayleighStrength: value }));
    atm2.addBinding(params, 'sphere2MieStrength', { min: 0, max: 5, step: 0.01 })
      .on('change', ({ value }) => this.scene?.updateParameters({ sphere2MieStrength: value }));
    atm2.addBinding(params, 'sphere2RayleighColor')
      .on('change', ({ value }) => this.scene?.updateParameters({ sphere2RayleighColor: value }));
    atm2.addBinding(params, 'sphere2MieColor')
      .on('change', ({ value }) => this.scene?.updateParameters({ sphere2MieColor: value }));
  }

  onResize(width: number, height: number): void {
    this.scene?.onResize(width, height);
  }
}
