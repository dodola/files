import * as THREE from 'three/webgpu';
import { WebGPURenderer } from 'three/webgpu';
import { uniform } from 'three/tsl';
import type { Pane } from 'tweakpane';
import type { IScene } from '../IScene';
import { buildAsciiMaterial } from '../scenes/asciiMaterial';

function makeGradientTexture(width: number, height: number): THREE.DataTexture {
  const data = new Uint8Array(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    const v = Math.floor((i / (width * height)) * 255);
    data[i * 4 + 0] = v;
    data[i * 4 + 1] = v;
    data[i * 4 + 2] = v;
    data[i * 4 + 3] = 255;
  }
  const tex = new THREE.DataTexture(data, width, height, THREE.RGBAFormat);
  tex.needsUpdate = true;
  return tex;
}

function makeCheckerTexture(size: number): THREE.DataTexture {
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      const on = ((x >> 3) ^ (y >> 3)) & 1;
      const v = on ? 200 : 50;
      data[idx] = v; data[idx + 1] = v; data[idx + 2] = v; data[idx + 3] = 255;
    }
  }
  const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  tex.needsUpdate = true;
  return tex;
}

function makeGlyphAtlas(cols: number, rows: number, cellSize: number): THREE.DataTexture {
  const w = cols * cellSize;
  const h = rows * cellSize;
  const data = new Uint8Array(w * h * 4);
  for (let i = 0; i < w * h; i++) {
    const v = Math.random() > 0.5 ? 255 : 0;
    data[i * 4 + 0] = v; data[i * 4 + 1] = v; data[i * 4 + 2] = v; data[i * 4 + 3] = 255;
  }
  const tex = new THREE.DataTexture(data, w, h, THREE.RGBAFormat);
  tex.needsUpdate = true;
  return tex;
}

export class AsciiMaterialAdapter implements IScene {
  private renderer: WebGPURenderer | null = null;
  private scene: THREE.Scene | null = null;
  private camera: THREE.OrthographicCamera | null = null;
  private rafId: number | null = null;

  private viewportSizeUniform = uniform(new THREE.Vector2(1, 1));
  private gridSizeUniform = uniform(new THREE.Vector2(80, 45));
  private gridOriginUniform = uniform(new THREE.Vector2(0, 0));
  private gridDisplaySizeUniform = uniform(new THREE.Vector2(1, 1));
  private displayCellSizeUniform = uniform(new THREE.Vector2(8, 8));
  private atlasSizeUniform = uniform(new THREE.Vector2(128, 128));
  private tileSizeUniform = uniform(new THREE.Vector2(8, 8));
  private atlasColsUniform = uniform(16);
  private gradientIndexUniform = uniform(0);
  private debugTimeUniform = uniform(0.0);
  private emailDyeDebugEnabledUniform = uniform(0);
  private emailDyeDebugCenterUniform = uniform(new THREE.Vector2(0, 0));
  private emailDyeDebugHalfSizeUniform = uniform(new THREE.Vector2(0, 0));

  async mount(canvas: HTMLCanvasElement): Promise<void> {
    const width = canvas.clientWidth || window.innerWidth;
    const height = canvas.clientHeight || window.innerHeight;

    this.renderer = new WebGPURenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(width, height);
    await this.renderer.init();

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x000000);
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    this.viewportSizeUniform.value.set(width, height);
    this.gridDisplaySizeUniform.value.set(width, height);

    const atlasTexture = makeGlyphAtlas(16, 16, 8);
    const glyphTexture = makeGlyphAtlas(16, 16, 8);
    const colorTexture = makeCheckerTexture(256);
    const sourceTexture = makeCheckerTexture(256);
    const gradientTexture = makeGradientTexture(256, 1);

    const material = buildAsciiMaterial({
      atlasTexture,
      glyphTexture,
      colorTexture,
      sourceTexture,
      gradientTexture,
      gradientRowCount: 1,
      useRampDither: false,
      useGradientSignal: false,
      invertGradient: false,
      glyphRampIndices: [0, 1, 2, 3, 4, 5, 6, 7],
      viewportSizeUniform: this.viewportSizeUniform,
      gridSizeUniform: this.gridSizeUniform,
      gridOriginUniform: this.gridOriginUniform,
      gridDisplaySizeUniform: this.gridDisplaySizeUniform,
      displayCellSizeUniform: this.displayCellSizeUniform,
      atlasSizeUniform: this.atlasSizeUniform,
      tileSizeUniform: this.tileSizeUniform,
      atlasColsUniform: this.atlasColsUniform,
      gradientIndexUniform: this.gradientIndexUniform,
      debugTimeUniform: this.debugTimeUniform,
      emailDyeDebugEnabledUniform: this.emailDyeDebugEnabledUniform,
      emailDyeDebugCenterUniform: this.emailDyeDebugCenterUniform,
      emailDyeDebugHalfSizeUniform: this.emailDyeDebugHalfSizeUniform,
    });

    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
    this.scene.add(quad);

    this.startLoop();
  }

  private startLoop(): void {
    const loop = (time: number) => {
      if (!this.renderer || !this.scene || !this.camera) return;
      this.debugTimeUniform.value = time / 1000;
      this.renderer.render(this.scene, this.camera);
      this.rafId = requestAnimationFrame(loop);
    };
    this.rafId = requestAnimationFrame(loop);
  }

  dispose(): void {
    if (this.rafId !== null) cancelAnimationFrame(this.rafId);
    this.renderer?.dispose();
    this.renderer = null;
    this.scene = null;
    this.camera = null;
  }

  buildPane(pane: Pane): void {
    const params = {
      gridCols: 80,
      gridRows: 45,
    };

    pane.addBinding(params, 'gridCols', { min: 10, max: 200, step: 1 })
      .on('change', ({ value }) => {
        this.gridSizeUniform.value.x = value;
        this.displayCellSizeUniform.value.x = (this.viewportSizeUniform.value.x / value);
      });
    pane.addBinding(params, 'gridRows', { min: 5, max: 120, step: 1 })
      .on('change', ({ value }) => {
        this.gridSizeUniform.value.y = value;
        this.displayCellSizeUniform.value.y = (this.viewportSizeUniform.value.y / value);
      });
  }

  onResize(width: number, height: number): void {
    if (!this.renderer || !this.camera) return;
    this.renderer.setSize(width, height);
    this.viewportSizeUniform.value.set(width, height);
    this.gridDisplaySizeUniform.value.set(width, height);
  }
}
