# Three.js WebGPU Demo — Design Spec

**Date:** 2026-04-01
**Status:** Approved

## Goal

搭建一个 Vite + TypeScript 本地开发项目，将仓库中 6 个独立 Three.js WebGPU 场景文件整合为一个可运行的 demo，带侧边栏场景切换和 Tweakpane 实时参数面板。

---

## Project Structure

```
demo/
├── index.html
├── package.json              # vite, three, tweakpane
├── tsconfig.json
└── src/
    ├── main.ts               # 入口：布局渲染，初始化 SceneManager
    ├── SceneManager.ts       # 场景生命周期管理
    ├── scenes/               # 原始文件直接复制（不修改）
    │   ├── CRTScreenScene.ts
    │   ├── BioluminescenceScene.ts
    │   ├── PlanetScene.ts
    │   ├── BoxFroxelPipeline.ts
    │   ├── asciiMaterial.ts
    │   └── voxelPathfindingWorker.ts
    ├── adapters/             # IScene 适配器，每个场景一个文件
    │   ├── CRTSceneAdapter.ts
    │   ├── BioluminescenceAdapter.ts
    │   ├── PlanetAdapter.ts
    │   ├── FroxelFogAdapter.ts
    │   ├── AsciiMaterialAdapter.ts
    │   └── VoxelWorkerAdapter.ts
    └── stubs/                # 补全的缺失依赖
        ├── BioluminescenceSceneParameters.ts
        ├── PlanetSceneParameters.ts
        └── oneill-cylinder/
            └── constants.ts
```

原始 `scenes/` 文件中的 import 路径通过 Vite `resolve.alias` 重定向到 `stubs/`。

---

## UI Layout

```
┌─────────────────────────────────────────────────────┐
│  sidebar (200px)  │  canvas (flex-1, 100vh)         │
│                   │                                  │
│  ● CRT Screen     │                                  │
│  ○ Bioluminescence│      <WebGPU canvas>             │
│  ○ Planet         │                                  │
│  ○ Box Froxel Fog │                                  │
│  ○ ASCII Material │                                  │
│  ○ Voxel Worker   │                                  │
│                   │                      ┌─────────┐ │
│                   │                      │Tweakpane│ │
│                   │                      │(右上角) │ │
└─────────────────────────────────────────────────────┘
```

- 侧边栏固定宽度 200px，深色主题
- canvas 填充剩余空间，跟随 resize 通知当前场景
- Tweakpane panel 悬浮于右上角，随场景切换销毁重建

---

## IScene Interface

所有场景适配器实现此接口：

```typescript
interface IScene {
  mount(canvas: HTMLCanvasElement): Promise<void>
  dispose(): void
  buildPane(pane: Pane): void    // Tweakpane 面板构建
  onResize(w: number, h: number): void
}
```

---

## SceneManager

```
switchTo(name) →
  1. currentScene.dispose()
  2. pane.dispose()
  3. new SceneClass()
  4. await scene.mount(canvas)
  5. pane = new Pane()
  6. scene.buildPane(pane)
```

---

## Adapter Strategy

| 场景 | 适配器说明 |
|------|-----------|
| `CRTScreenScene` | 直接包装，调用 `init()` / `cleanup()`，`buildPane` 暴露所有 `CRTScreenSceneParameters` 字段 |
| `BioluminescenceScene` | 包装 `init()` / `cleanup()`，`buildPane` 暴露粒子、gas field、bloom 参数 |
| `PlanetScene` | 包装 `init()` / `cleanup()`，`buildPane` 通过 `updateParameters()` 联动 |
| `BoxFroxelPipeline` | 新建宿主场景（含光源、球体 mesh、OrbitControls），在其内部实例化 `BoxFroxelPipeline`，`buildPane` 暴露 `FogVolumeConfig` 字段 |
| `asciiMaterial` | 新建宿主场景（含全屏 quad mesh），调用 `buildAsciiMaterial()` 创建材质，`buildPane` 暴露 uniform 参数 |
| `voxelPathfindingWorker` | 无 WebGPU：宿主直接 `new Worker()`，发送 `build` 消息，用 2D canvas 可视化路径结果 |

---

## Stubs / Missing Dependencies

### `stubs/oneill-cylinder/constants.ts`
```typescript
export const FROXEL_PIXEL_SIZE = 8;
export const FROXEL_SLICE_COUNT = 64;
export const MAX_FROXEL_SLICES = 128;
```

### `stubs/BioluminescenceSceneParameters.ts`

从源码 uniform 初始值反推的默认参数：

| 参数 | 默认值 | 类型 |
|------|--------|------|
| particleCount | 4096 | `256 \| 1024 \| 4096 \| 16384` |
| particleSize | 0.03 | number |
| particleWakeStrength | 0.6 | number |
| particleDrag | 1.0 | number |
| particleNoiseStrength | 0.1 | number |
| particleNoiseFrequency | 0.6 | number |
| particleNoiseDrag | 0.5 | number |
| particleGravity | 0.0 | number |
| activationScale | 3.0 | number |
| activationSpeed | 1.0 | number |
| densityResX/Y/Z | 32/16/32 | number |
| particleDensityStrength | 0.3 | number |
| fieldResX/Y/Z | 64/32/64 | number |
| fieldDissipation | 0.98 | number |
| fieldSplatStrength | 1.0 | number |
| fieldSplatRadius | 0.3 | number |
| bubbleSizeMin | 2.0 | number |
| bubbleSizeMax | 6.0 | number |
| bubbleGravity | 9.81 | number |
| bubbleViscosity | 0.5 | number |
| bubbleSpawnRate | 20.0 | number |
| bubbleSpawnArea | 0.0 | number |
| bubbleAutoEmit | false | boolean |
| bubbleColor | `'#ffffff'` | string |
| bubbleDriftStrength | 0.0 | number |
| bubbleDriftFrequency | 0.5 | number |
| bubbleDriftDrag | 1.2 | number |
| bubbleRepelStrength | 0.8 | number |
| bubbleRepelRadius | 0.08 | number |
| bubbleWakeStrength | 0.5 | number |
| bubbleWakeLength | 1.0 | number |
| bubbleWakeAngle | 0.5 | number |
| energyAccumulationRate | 0.1 | number |
| energyDecayRate | 0.02 | number |
| activationEnergyThreshold | 1.0 | number |
| activationDuration | 0.5 | number |
| refractoryPeriod | 1.0 | number |
| sparkleMin | 0.5 | number |
| sparkleMax | 1.4 | number |
| volumeWidth | 6.0 | number |
| volumeHeight | 4.0 | number |
| volumeDepth | 6.0 | number |
| showVolume | false | boolean |
| baseColor | `'#00bcd4'` | string |
| activeColor | `'#7dffb0'` | string |
| baseAlpha | 0.2 | number |
| activeAlpha | 0.95 | number |
| emissiveStrength | 1.6 | number |
| bloomStrength | 1.0 | number |
| bloomRadius | 0.5 | number |
| bloomThreshold | 0.1 | number |
| backgroundColor | `'#000000'` | string |

### `stubs/PlanetSceneParameters.ts`

| 参数 | 默认值 | 类型 |
|------|--------|------|
| ambientStrength | 0.05 | number |
| sunColor | `'#ffffff'` | string |
| sphere1FogDensity | 3.0 | number |
| sphere1AtmosphereAltitude | 0.3 | number |
| sphere1FalloffPower | 4.0 | number |
| sphere1MultiScatterBoost | 0.3 | number |
| sphere1PhaseG | 0.7 | number |
| sphere1RayleighStrength | 1.0 | number |
| sphere1MieStrength | 0.5 | number |
| sphere1RayleighColor | `'#4488ff'` | string |
| sphere1MieColor | `'#ffddaa'` | string |
| sphere2FogDensity | 1.0 | number |
| sphere2AtmosphereAltitude | 0.6 | number |
| sphere2FalloffPower | 2.0 | number |
| sphere2MultiScatterBoost | 0.1 | number |
| sphere2PhaseG | 0.3 | number |
| sphere2RayleighStrength | 0.3 | number |
| sphere2MieStrength | 0.1 | number |
| sphere2RayleighColor | `'#aaccff'` | string |
| sphere2MieColor | `'#ffffff'` | string |

---

## Dependencies

```json
{
  "dependencies": {
    "three": "^0.171.0",
    "tweakpane": "^4.0.0"
  },
  "devDependencies": {
    "vite": "^5.0.0",
    "typescript": "^5.0.0"
  }
}
```

> Three.js r170+ 是 WebGPU renderer + TSL 所需的最低版本。

---

## Vite Alias Config

```typescript
// vite.config.ts
resolve: {
  alias: {
    './BioluminescenceSceneParameters': '/src/stubs/BioluminescenceSceneParameters',
    './PlanetSceneParameters': '/src/stubs/PlanetSceneParameters',
    '../oneill-cylinder/constants': '/src/stubs/oneill-cylinder/constants',
  }
}
```
