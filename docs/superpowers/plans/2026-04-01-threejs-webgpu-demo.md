# Three.js WebGPU Demo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 搭建 `demo/` Vite 项目，将仓库 6 个 Three.js WebGPU 场景整合为带侧边栏导航和 Tweakpane 实时参数面板的可运行 demo。

**Architecture:** 每个场景通过适配器实现统一 `IScene` 接口（`mount/dispose/buildPane/onResize`），`SceneManager` 负责生命周期切换。原始场景文件不修改，缺失依赖通过 `stubs/` 目录补全，Vite alias 重定向 import 路径。

**Tech Stack:** Vite 5, TypeScript 5, Three.js r171+, Tweakpane 4

---

## File Map

| 文件 | 职责 |
|------|------|
| `demo/index.html` | 入口 HTML，sidebar + canvas 布局 |
| `demo/package.json` | 依赖声明 |
| `demo/tsconfig.json` | TypeScript 配置 |
| `demo/vite.config.ts` | Vite 配置 + alias |
| `demo/src/main.ts` | DOM 初始化，ResizeObserver，SceneManager 创建 |
| `demo/src/styles.css` | sidebar + canvas 全局样式 |
| `demo/src/IScene.ts` | IScene 接口定义 |
| `demo/src/SceneManager.ts` | 场景切换生命周期 |
| `demo/src/scenes/` | 原始文件复制（不修改） |
| `demo/src/stubs/BioluminescenceSceneParameters.ts` | 补全缺失依赖 |
| `demo/src/stubs/PlanetSceneParameters.ts` | 补全缺失依赖 |
| `demo/src/stubs/oneill-cylinder/constants.ts` | 补全缺失依赖 |
| `demo/src/adapters/CRTSceneAdapter.ts` | CRTScreenScene 适配器 |
| `demo/src/adapters/BioluminescenceAdapter.ts` | BioluminescenceScene 适配器 |
| `demo/src/adapters/PlanetAdapter.ts` | PlanetScene 适配器 |
| `demo/src/adapters/FroxelFogAdapter.ts` | BoxFroxelPipeline 宿主场景 |
| `demo/src/adapters/AsciiMaterialAdapter.ts` | asciiMaterial 宿主场景 |
| `demo/src/adapters/VoxelWorkerAdapter.ts` | voxelPathfindingWorker 2D 可视化 |

---

## Task 1: 项目脚手架

**Files:**
- Create: `demo/package.json`
- Create: `demo/tsconfig.json`
- Create: `demo/vite.config.ts`
- Create: `demo/index.html`
- Create: `demo/src/styles.css`

- [ ] **Step 1: 创建 package.json**

```json
{
  "name": "threejs-webgpu-demo",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build"
  },
  "dependencies": {
    "three": "^0.171.0",
    "tweakpane": "^4.0.5"
  },
  "devDependencies": {
    "typescript": "^5.4.0",
    "vite": "^5.2.0"
  }
}
```

写入到 `demo/package.json`。

- [ ] **Step 2: 创建 tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noUnusedLocals": false,
    "noUnusedParameters": false,
    "skipLibCheck": true,
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src"]
}
```

写入到 `demo/tsconfig.json`。

- [ ] **Step 3: 创建 vite.config.ts**

```typescript
import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  root: '.',
  resolve: {
    alias: {
      './BioluminescenceSceneParameters': path.resolve(
        __dirname, 'src/stubs/BioluminescenceSceneParameters'
      ),
      './PlanetSceneParameters': path.resolve(
        __dirname, 'src/stubs/PlanetSceneParameters'
      ),
      '../oneill-cylinder/constants': path.resolve(
        __dirname, 'src/stubs/oneill-cylinder/constants'
      ),
    },
  },
  worker: {
    format: 'es',
  },
});
```

写入到 `demo/vite.config.ts`。

- [ ] **Step 4: 创建 index.html**

```html
<!DOCTYPE html>
<html lang="zh">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Three.js WebGPU Demo</title>
    <link rel="stylesheet" href="/src/styles.css" />
  </head>
  <body>
    <div id="app">
      <aside id="sidebar">
        <h2>Scenes</h2>
        <ul id="scene-list">
          <li data-scene="crt" class="active">CRT Screen</li>
          <li data-scene="bioluminescence">Bioluminescence</li>
          <li data-scene="planet">Planet</li>
          <li data-scene="froxel">Froxel Fog</li>
          <li data-scene="ascii">ASCII Material</li>
          <li data-scene="voxel">Voxel Worker</li>
        </ul>
      </aside>
      <main id="main">
        <canvas id="canvas"></canvas>
      </main>
    </div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

写入到 `demo/index.html`。

- [ ] **Step 5: 创建 styles.css**

```css
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

html, body { height: 100%; overflow: hidden; }

#app {
  display: flex;
  height: 100vh;
  background: #0a0a0a;
  color: #e0e0e0;
  font-family: system-ui, sans-serif;
}

#sidebar {
  width: 200px;
  flex-shrink: 0;
  padding: 16px 0;
  background: #111;
  border-right: 1px solid #222;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

#sidebar h2 {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: #666;
  padding: 0 16px 8px;
  border-bottom: 1px solid #222;
}

#scene-list {
  list-style: none;
  display: flex;
  flex-direction: column;
}

#scene-list li {
  padding: 10px 16px;
  cursor: pointer;
  font-size: 13px;
  color: #aaa;
  border-left: 2px solid transparent;
  transition: background 0.1s, color 0.1s;
}

#scene-list li:hover { background: #1a1a1a; color: #fff; }

#scene-list li.active {
  color: #fff;
  border-left-color: #4a9eff;
  background: #1a1a1a;
}

#main {
  flex: 1;
  position: relative;
  overflow: hidden;
}

#canvas {
  display: block;
  width: 100%;
  height: 100%;
}

.tp-dfwv {
  position: fixed !important;
  top: 12px !important;
  right: 12px !important;
  z-index: 100;
}
```

写入到 `demo/src/styles.css`。

- [ ] **Step 6: 安装依赖**

```bash
cd demo && npm install
```

Expected: `node_modules/` 创建，无错误。

- [ ] **Step 7: 提交**

```bash
cd /home/dodola/github/files
git add demo/
git commit -m "feat: scaffold Vite project with layout and styles"
```

---

## Task 2: IScene 接口 + SceneManager

**Files:**
- Create: `demo/src/IScene.ts`
- Create: `demo/src/SceneManager.ts`

- [ ] **Step 1: 创建 IScene.ts**

```typescript
import type { Pane } from 'tweakpane';

export interface IScene {
  mount(canvas: HTMLCanvasElement): Promise<void>;
  dispose(): void;
  buildPane(pane: Pane): void;
  onResize(width: number, height: number): void;
}
```

写入到 `demo/src/IScene.ts`。

- [ ] **Step 2: 创建 SceneManager.ts**

```typescript
import { Pane } from 'tweakpane';
import type { IScene } from './IScene';

type SceneFactory = () => IScene;

export class SceneManager {
  private currentScene: IScene | null = null;
  private currentPane: Pane | null = null;
  private readonly canvas: HTMLCanvasElement;
  private readonly factories = new Map<string, SceneFactory>();

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
  }

  register(name: string, factory: SceneFactory): void {
    this.factories.set(name, factory);
  }

  async switchTo(name: string): Promise<void> {
    // Dispose existing
    if (this.currentScene) {
      this.currentScene.dispose();
      this.currentScene = null;
    }
    if (this.currentPane) {
      this.currentPane.dispose();
      this.currentPane = null;
    }

    const factory = this.factories.get(name);
    if (!factory) {
      console.error(`No scene registered: ${name}`);
      return;
    }

    const scene = factory();
    await scene.mount(this.canvas);
    this.currentScene = scene;

    const pane = new Pane({ title: name });
    scene.buildPane(pane);
    this.currentPane = pane;
  }

  onResize(width: number, height: number): void {
    this.currentScene?.onResize(width, height);
  }

  dispose(): void {
    this.currentScene?.dispose();
    this.currentPane?.dispose();
  }
}
```

写入到 `demo/src/SceneManager.ts`。

- [ ] **Step 3: 提交**

```bash
cd /home/dodola/github/files
git add demo/src/IScene.ts demo/src/SceneManager.ts
git commit -m "feat: add IScene interface and SceneManager"
```

---

## Task 3: Stubs — 补全缺失依赖

**Files:**
- Create: `demo/src/stubs/oneill-cylinder/constants.ts`
- Create: `demo/src/stubs/BioluminescenceSceneParameters.ts`
- Create: `demo/src/stubs/PlanetSceneParameters.ts`

- [ ] **Step 1: 创建 constants.ts**

```typescript
export const FROXEL_PIXEL_SIZE = 8;
export const FROXEL_SLICE_COUNT = 64;
export const MAX_FROXEL_SLICES = 128;
```

写入到 `demo/src/stubs/oneill-cylinder/constants.ts`。

- [ ] **Step 2: 创建 BioluminescenceSceneParameters.ts**

```typescript
export type BioluminescenceSceneParameters = {
  particleCount: 256 | 1024 | 4096 | 16384;
  particleSize: number;
  particleWakeStrength: number;
  particleDrag: number;
  particleNoiseStrength: number;
  particleNoiseFrequency: number;
  particleNoiseDrag: number;
  particleGravity: number;
  activationScale: number;
  activationSpeed: number;
  densityResX: number;
  densityResY: number;
  densityResZ: number;
  particleDensityStrength: number;
  fieldResX: number;
  fieldResY: number;
  fieldResZ: number;
  fieldDissipation: number;
  fieldSplatStrength: number;
  fieldSplatRadius: number;
  bubbleSizeMin: number;
  bubbleSizeMax: number;
  bubbleGravity: number;
  bubbleViscosity: number;
  bubbleSpawnRate: number;
  bubbleSpawnArea: number;
  bubbleAutoEmit: boolean;
  bubbleColor: string;
  bubbleDriftStrength: number;
  bubbleDriftFrequency: number;
  bubbleDriftDrag: number;
  bubbleRepelStrength: number;
  bubbleRepelRadius: number;
  bubbleWakeStrength: number;
  bubbleWakeLength: number;
  bubbleWakeAngle: number;
  energyAccumulationRate: number;
  energyDecayRate: number;
  activationEnergyThreshold: number;
  activationDuration: number;
  refractoryPeriod: number;
  sparkleMin: number;
  sparkleMax: number;
  volumeWidth: number;
  volumeHeight: number;
  volumeDepth: number;
  showVolume: boolean;
  baseColor: string;
  activeColor: string;
  baseAlpha: number;
  activeAlpha: number;
  emissiveStrength: number;
  bloomStrength: number;
  bloomRadius: number;
  bloomThreshold: number;
  backgroundColor: string;
};

export const BIOLUMINESCENCE_SCENE_DEFAULTS: BioluminescenceSceneParameters = {
  particleCount: 4096,
  particleSize: 0.03,
  particleWakeStrength: 0.6,
  particleDrag: 1.0,
  particleNoiseStrength: 0.1,
  particleNoiseFrequency: 0.6,
  particleNoiseDrag: 0.5,
  particleGravity: 0.0,
  activationScale: 3.0,
  activationSpeed: 1.0,
  densityResX: 32,
  densityResY: 16,
  densityResZ: 32,
  particleDensityStrength: 0.3,
  fieldResX: 64,
  fieldResY: 32,
  fieldResZ: 64,
  fieldDissipation: 0.98,
  fieldSplatStrength: 1.0,
  fieldSplatRadius: 0.3,
  bubbleSizeMin: 2.0,
  bubbleSizeMax: 6.0,
  bubbleGravity: 9.81,
  bubbleViscosity: 0.5,
  bubbleSpawnRate: 20.0,
  bubbleSpawnArea: 0.0,
  bubbleAutoEmit: false,
  bubbleColor: '#ffffff',
  bubbleDriftStrength: 0.0,
  bubbleDriftFrequency: 0.5,
  bubbleDriftDrag: 1.2,
  bubbleRepelStrength: 0.8,
  bubbleRepelRadius: 0.08,
  bubbleWakeStrength: 0.5,
  bubbleWakeLength: 1.0,
  bubbleWakeAngle: 0.5,
  energyAccumulationRate: 0.1,
  energyDecayRate: 0.02,
  activationEnergyThreshold: 1.0,
  activationDuration: 0.5,
  refractoryPeriod: 1.0,
  sparkleMin: 0.5,
  sparkleMax: 1.4,
  volumeWidth: 6.0,
  volumeHeight: 4.0,
  volumeDepth: 6.0,
  showVolume: false,
  baseColor: '#00bcd4',
  activeColor: '#7dffb0',
  baseAlpha: 0.2,
  activeAlpha: 0.95,
  emissiveStrength: 1.6,
  bloomStrength: 1.0,
  bloomRadius: 0.5,
  bloomThreshold: 0.1,
  backgroundColor: '#000000',
};
```

写入到 `demo/src/stubs/BioluminescenceSceneParameters.ts`。

- [ ] **Step 3: 创建 PlanetSceneParameters.ts**

```typescript
export type PlanetSceneParameters = {
  ambientStrength: number;
  sunColor: string;
  sphere1FogDensity: number;
  sphere1AtmosphereAltitude: number;
  sphere1FalloffPower: number;
  sphere1MultiScatterBoost: number;
  sphere1PhaseG: number;
  sphere1RayleighStrength: number;
  sphere1MieStrength: number;
  sphere1RayleighColor: string;
  sphere1MieColor: string;
  sphere2FogDensity: number;
  sphere2AtmosphereAltitude: number;
  sphere2FalloffPower: number;
  sphere2MultiScatterBoost: number;
  sphere2PhaseG: number;
  sphere2RayleighStrength: number;
  sphere2MieStrength: number;
  sphere2RayleighColor: string;
  sphere2MieColor: string;
};

export const PLANET_SCENE_DEFAULTS: PlanetSceneParameters = {
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
```

写入到 `demo/src/stubs/PlanetSceneParameters.ts`。

- [ ] **Step 4: 提交**

```bash
cd /home/dodola/github/files
git add demo/src/stubs/
git commit -m "feat: add stubs for missing scene dependencies"
```

---

## Task 4: 复制原始场景文件

**Files:**
- Create: `demo/src/scenes/CRTScreenScene.ts` (copy)
- Create: `demo/src/scenes/BioluminescenceScene.ts` (copy)
- Create: `demo/src/scenes/PlanetScene.ts` (copy)
- Create: `demo/src/scenes/BoxFroxelPipeline.ts` (copy)
- Create: `demo/src/scenes/asciiMaterial.ts` (copy)
- Create: `demo/src/scenes/voxelPathfindingWorker.ts` (copy)

- [ ] **Step 1: 复制所有场景文件**

```bash
mkdir -p demo/src/scenes
cp CRTScreenScene.ts demo/src/scenes/
cp BioluminescenceScene.ts demo/src/scenes/
cp PlanetScene.ts demo/src/scenes/
cp BoxFroxelPipeline.ts demo/src/scenes/
cp asciiMaterial.ts demo/src/scenes/
cp voxelPathfindingWorker.ts demo/src/scenes/
```

从仓库根目录执行（`/home/dodola/github/files/`）。

- [ ] **Step 2: 验证文件存在**

```bash
ls demo/src/scenes/
```

Expected: 6 个 `.ts` 文件均存在。

- [ ] **Step 3: 提交**

```bash
cd /home/dodola/github/files
git add demo/src/scenes/
git commit -m "feat: copy original scene files into demo project"
```

---

## Task 5: CRTSceneAdapter

**Files:**
- Create: `demo/src/adapters/CRTSceneAdapter.ts`

注意：`CRTScreenScene.init(canvas, renderer)` 需要外部传入已初始化的 `WebGPURenderer`。适配器在 `mount()` 中自行创建 renderer，再传给 `init()`。

- [ ] **Step 1: 创建 CRTSceneAdapter.ts**

```typescript
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

    this.scene = new CRTScreenScene({ shaderType: 'mandelbrot', displayMode: 'shader' });
    await this.scene.init(canvas, this.renderer);

    this.startLoop();
  }

  private startLoop(): void {
    const loop = (time: number) => {
      if (!this.scene || !this.renderer) return;
      const dt = (time - this.lastTime) / 1000;
      this.lastTime = time;
      this.scene.update(dt);
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
```

写入到 `demo/src/adapters/CRTSceneAdapter.ts`。

- [ ] **Step 2: 提交**

```bash
cd /home/dodola/github/files
git add demo/src/adapters/CRTSceneAdapter.ts
git commit -m "feat: add CRTSceneAdapter"
```

---

## Task 6: BioluminescenceAdapter

**Files:**
- Create: `demo/src/adapters/BioluminescenceAdapter.ts`

- [ ] **Step 1: 创建 BioluminescenceAdapter.ts**

```typescript
import type { Pane } from 'tweakpane';
import type { IScene } from '../IScene';
import { BioluminescenceScene } from '../scenes/BioluminescenceScene';

export class BioluminescenceAdapter implements IScene {
  private scene: BioluminescenceScene | null = null;
  private rafId: number | null = null;
  private lastTime = 0;

  async mount(canvas: HTMLCanvasElement): Promise<void> {
    this.scene = new BioluminescenceScene();
    await this.scene.init(canvas);
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
    this.scene = null;
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
```

写入到 `demo/src/adapters/BioluminescenceAdapter.ts`。

- [ ] **Step 2: 提交**

```bash
cd /home/dodola/github/files
git add demo/src/adapters/BioluminescenceAdapter.ts
git commit -m "feat: add BioluminescenceAdapter"
```

---

## Task 7: PlanetAdapter

**Files:**
- Create: `demo/src/adapters/PlanetAdapter.ts`

- [ ] **Step 1: 创建 PlanetAdapter.ts**

```typescript
import type { Pane } from 'tweakpane';
import type { IScene } from '../IScene';
import { PlanetScene } from '../scenes/PlanetScene';

export class PlanetAdapter implements IScene {
  private scene: PlanetScene | null = null;
  private rafId: number | null = null;

  async mount(canvas: HTMLCanvasElement): Promise<void> {
    this.scene = new PlanetScene();
    await this.scene.init(canvas);
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
    this.scene = null;
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
```

写入到 `demo/src/adapters/PlanetAdapter.ts`。

- [ ] **Step 2: 提交**

```bash
cd /home/dodola/github/files
git add demo/src/adapters/PlanetAdapter.ts
git commit -m "feat: add PlanetAdapter"
```

---

## Task 8: FroxelFogAdapter

**Files:**
- Create: `demo/src/adapters/FroxelFogAdapter.ts`

`BoxFroxelPipeline` 是纯计算管线，需要宿主场景提供 shadow map 等基础设施。此适配器构建一个最小宿主场景（球体 + 平行光 + OrbitControls），在 render loop 中调用 `pipeline.compute()` 后渲染。Shadow map 简化为 dummy texture（pipeline 的 `shadowReadyUniform` 设为 0 跳过阴影采样）。

- [ ] **Step 1: 创建 FroxelFogAdapter.ts**

```typescript
import * as THREE from 'three/webgpu';
import { WebGPURenderer } from 'three/webgpu';
import { uniform, texture, vec2, vec3, vec4 } from 'three/tsl';
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
  private shadowReadyUniform = uniform(0, 'float'); // 0 = no shadow
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

      // Update camera uniforms
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
```

写入到 `demo/src/adapters/FroxelFogAdapter.ts`。

- [ ] **Step 2: 提交**

```bash
cd /home/dodola/github/files
git add demo/src/adapters/FroxelFogAdapter.ts
git commit -m "feat: add FroxelFogAdapter with host scene"
```

---

## Task 9: AsciiMaterialAdapter

**Files:**
- Create: `demo/src/adapters/AsciiMaterialAdapter.ts`

`buildAsciiMaterial()` 需要大量外部 uniform 和纹理。此适配器用程序生成占位纹理驱动它，展示 ASCII 渲染效果。

- [ ] **Step 1: 创建 AsciiMaterialAdapter.ts**

```typescript
import * as THREE from 'three/webgpu';
import { WebGPURenderer } from 'three/webgpu';
import { uniform, vec2 } from 'three/tsl';
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
  // Fill with simple noise as placeholder glyph data
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

    this.renderer = new WebGPURenderer({ canvas, antialias: false });
    this.renderer.setPixelRatio(1);
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
    let t = 0;
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
      cellWidth: 8,
      cellHeight: 8,
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
```

写入到 `demo/src/adapters/AsciiMaterialAdapter.ts`。

- [ ] **Step 2: 提交**

```bash
cd /home/dodola/github/files
git add demo/src/adapters/AsciiMaterialAdapter.ts
git commit -m "feat: add AsciiMaterialAdapter with procedural textures"
```

---

## Task 10: VoxelWorkerAdapter

**Files:**
- Create: `demo/src/adapters/VoxelWorkerAdapter.ts`

无 WebGPU，用 2D canvas 可视化路径结果（俯视图）。

- [ ] **Step 1: 创建 VoxelWorkerAdapter.ts**

```typescript
import type { Pane } from 'tweakpane';
import type { IScene } from '../IScene';

type OutboundMessage =
  | { type: 'path'; id: number; path: number[] }
  | { type: 'done'; id: number }
  | { type: 'cancelled'; id: number };

export class VoxelWorkerAdapter implements IScene {
  private worker: Worker | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private paths: number[][] = [];
  private jobId = 0;

  private gridParams = {
    countX: 20,
    countY: 4,
    countZ: 20,
    maxPaths: 10,
    maxTries: 500,
  };

  async mount(canvas: HTMLCanvasElement): Promise<void> {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');

    this.worker = new Worker(
      new URL('../scenes/voxelPathfindingWorker.ts', import.meta.url),
      { type: 'module' }
    );

    this.worker.onmessage = (e: MessageEvent<OutboundMessage>) => {
      const msg = e.data;
      if (msg.type === 'path') {
        this.paths.push(msg.path);
        this.draw();
      } else if (msg.type === 'done') {
        this.draw();
      }
    };

    this.sendBuildMessage();
  }

  private sendBuildMessage(): void {
    if (!this.worker) return;
    this.paths = [];
    const { countX, countY, countZ, maxPaths, maxTries } = this.gridParams;
    const instanceCount = countX * countY * countZ;
    const paramA = new Float32Array(instanceCount).fill(0.5);
    const paramB = new Float32Array(instanceCount).fill(0.5);
    const paramC = new Float32Array(instanceCount).fill(0.5);

    this.worker.postMessage({
      type: 'build',
      id: ++this.jobId,
      grid: {
        countX, countY, countZ,
        startX: 0, startY: 0, startZ: 0,
        voxelSizeXZ: 1, voxelHeight: 1,
        basePlatformHeight: 0,
        xEdgesOpen: false, zEdgesOpen: false, twoSided: false,
        gridX: countX, gridZ: countZ,
        gridStartX: 0, gridStartZ: 0,
        step: 1,
        instanceCount,
        paramA: paramA.buffer,
        paramB: paramB.buffer,
        paramC: paramC.buffer,
        minHeightUnits: 1, maxHeightUnits: 3,
        minPedestalUnits: 0, maxPedestalUnits: 1,
        minPaddingUnits: 0, maxPaddingUnits: 0,
        minPedestalPaddingUnits: 0, maxPedestalPaddingUnits: 0,
        minPedestalTaperX: 0, maxPedestalTaperX: 0,
        minPedestalTaperZ: 0, maxPedestalTaperZ: 0,
        minTaperX: 0, maxTaperX: 0,
        minTaperZ: 0, maxTaperZ: 0,
        buildingExponent: 1, pedestalExponent: 1,
        paddingLimitCap: 0, rollStep: 0, twistStep: 0,
      },
      maxPaths,
      maxTries,
      maxPathsPerVertex: 2,
    }, [paramA.buffer, paramB.buffer, paramC.buffer]);
  }

  private draw(): void {
    if (!this.ctx || !this.canvas) return;
    const w = this.canvas.width;
    const h = this.canvas.height;
    const { countX, countZ } = this.gridParams;
    this.ctx.fillStyle = '#111';
    this.ctx.fillRect(0, 0, w, h);

    const cellW = w / countX;
    const cellH = h / countZ;

    // Draw grid
    this.ctx.strokeStyle = '#333';
    this.ctx.lineWidth = 0.5;
    for (let x = 0; x <= countX; x++) {
      this.ctx.beginPath();
      this.ctx.moveTo(x * cellW, 0);
      this.ctx.lineTo(x * cellW, h);
      this.ctx.stroke();
    }
    for (let z = 0; z <= countZ; z++) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, z * cellH);
      this.ctx.lineTo(w, z * cellH);
      this.ctx.stroke();
    }

    // Draw paths (XZ projection)
    const colors = ['#4af', '#fa4', '#4fa', '#f4a', '#a4f', '#ff4', '#4ff', '#f44', '#4f4', '#44f'];
    this.paths.forEach((path, idx) => {
      if (path.length < 2) return;
      const col = colors[idx % colors.length];
      this.ctx!.strokeStyle = col;
      this.ctx!.lineWidth = 2;
      this.ctx!.beginPath();
      for (let i = 0; i < path.length; i += 3) {
        const px = (path[i] + 0.5) * cellW;
        const pz = (path[i + 2] + 0.5) * cellH;
        if (i === 0) this.ctx!.moveTo(px, pz);
        else this.ctx!.lineTo(px, pz);
      }
      this.ctx!.stroke();
      // Start dot
      this.ctx!.fillStyle = col;
      const sx = (path[0] + 0.5) * cellW;
      const sz = (path[2] + 0.5) * cellH;
      this.ctx!.beginPath();
      this.ctx!.arc(sx, sz, 4, 0, Math.PI * 2);
      this.ctx!.fill();
    });

    // Label
    this.ctx.fillStyle = '#888';
    this.ctx.font = '12px monospace';
    this.ctx.fillText(`Paths found: ${this.paths.length}`, 8, 20);
  }

  dispose(): void {
    this.worker?.terminate();
    this.worker = null;
    this.canvas = null;
    this.ctx = null;
    this.paths = [];
  }

  buildPane(pane: Pane): void {
    pane.addBinding(this.gridParams, 'countX', { min: 5, max: 40, step: 1 });
    pane.addBinding(this.gridParams, 'countZ', { min: 5, max: 40, step: 1 });
    pane.addBinding(this.gridParams, 'maxPaths', { min: 1, max: 50, step: 1 });
    pane.addBinding(this.gridParams, 'maxTries', { min: 100, max: 5000, step: 100 });
    pane.addButton({ title: 'Re-run' }).on('click', () => this.sendBuildMessage());
  }

  onResize(width: number, height: number): void {
    if (!this.canvas) return;
    this.canvas.width = width;
    this.canvas.height = height;
    this.draw();
  }
}
```

写入到 `demo/src/adapters/VoxelWorkerAdapter.ts`。

- [ ] **Step 2: 提交**

```bash
cd /home/dodola/github/files
git add demo/src/adapters/VoxelWorkerAdapter.ts
git commit -m "feat: add VoxelWorkerAdapter with 2D path visualization"
```

---

## Task 11: main.ts — 入口连接一切

**Files:**
- Create: `demo/src/main.ts`

- [ ] **Step 1: 创建 main.ts**

```typescript
import { SceneManager } from './SceneManager';
import { CRTSceneAdapter } from './adapters/CRTSceneAdapter';
import { BioluminescenceAdapter } from './adapters/BioluminescenceAdapter';
import { PlanetAdapter } from './adapters/PlanetAdapter';
import { FroxelFogAdapter } from './adapters/FroxelFogAdapter';
import { AsciiMaterialAdapter } from './adapters/AsciiMaterialAdapter';
import { VoxelWorkerAdapter } from './adapters/VoxelWorkerAdapter';

const canvas = document.getElementById('canvas') as HTMLCanvasElement;
const sceneList = document.getElementById('scene-list') as HTMLUListElement;

const manager = new SceneManager(canvas);
manager.register('crt', () => new CRTSceneAdapter());
manager.register('bioluminescence', () => new BioluminescenceAdapter());
manager.register('planet', () => new PlanetAdapter());
manager.register('froxel', () => new FroxelFogAdapter());
manager.register('ascii', () => new AsciiMaterialAdapter());
manager.register('voxel', () => new VoxelWorkerAdapter());

// Sidebar navigation
sceneList.addEventListener('click', (e) => {
  const li = (e.target as HTMLElement).closest('li');
  if (!li) return;
  const name = li.dataset.scene;
  if (!name) return;
  sceneList.querySelectorAll('li').forEach(el => el.classList.remove('active'));
  li.classList.add('active');
  manager.switchTo(name);
});

// Resize handling
const resizeObserver = new ResizeObserver((entries) => {
  for (const entry of entries) {
    const { width, height } = entry.contentRect;
    canvas.width = width * window.devicePixelRatio;
    canvas.height = height * window.devicePixelRatio;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    manager.onResize(width, height);
  }
});
resizeObserver.observe(canvas.parentElement!);

// Launch default scene
manager.switchTo('crt');
```

写入到 `demo/src/main.ts`。

- [ ] **Step 2: 提交**

```bash
cd /home/dodola/github/files
git add demo/src/main.ts
git commit -m "feat: add main.ts entry point wiring all scenes"
```

---

## Task 12: 启动验证

- [ ] **Step 1: 启动开发服务器**

```bash
cd /home/dodola/github/files/demo && npm run dev
```

Expected output（示例）：
```
  VITE v5.x.x  ready in xxx ms
  ➜  Local:   http://localhost:5173/
```

- [ ] **Step 2: 验证 TypeScript 无报错**

```bash
cd /home/dodola/github/files/demo && npx tsc --noEmit
```

Expected: 无输出（或仅警告，无 error）。

如果出现 Three.js TSL 类型错误，在 `tsconfig.json` 中加入 `"skipLibCheck": true`（已包含在 Task 1 的配置中）。

- [ ] **Step 3: 最终提交**

```bash
cd /home/dodola/github/files
git add -A
git commit -m "feat: complete Three.js WebGPU demo with all scene adapters"
```

---

## Self-Review

**Spec coverage check:**
- ✅ Vite 项目结构 → Task 1
- ✅ IScene 接口 → Task 2
- ✅ SceneManager → Task 2
- ✅ 缺失 stubs → Task 3
- ✅ 原始文件复制 → Task 4
- ✅ CRT adapter → Task 5
- ✅ Bioluminescence adapter → Task 6
- ✅ Planet adapter → Task 7
- ✅ BoxFroxelPipeline adapter → Task 8
- ✅ ASCII Material adapter → Task 9
- ✅ VoxelWorker adapter → Task 10
- ✅ main.ts 入口 → Task 11
- ✅ 侧边栏 UI → Task 1 (index.html) + Task 11 (main.ts click handler)
- ✅ Tweakpane 面板 → SceneManager.buildPane() + 每个 adapter.buildPane()
- ✅ onResize → 每个 adapter 均实现
- ✅ 启动验证 → Task 12

**Placeholder scan:** 无 TBD/TODO。

**Type consistency:**
- `IScene` 接口贯穿所有 adapter，方法签名一致
- `SceneManager.switchTo()` 调用 `mount/dispose/buildPane/onResize`，与接口匹配
- `updateParameters()` 调用与各场景源码签名一致
