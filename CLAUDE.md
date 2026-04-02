# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Purpose

A CRT screen emulation demo built with Three.js WebGPU renderer and the Three Shading Language (TSL). The `demo/` directory is a fully functional Vite + TypeScript application. The root-level `.ts` files are standalone code snippets (extracted from larger projects) that are **not** part of the demo build.

## Demo Commands

All commands run from `demo/`:

```bash
npm run dev    # Vite dev server with HMR
npm run build  # tsc type-check, then vite build → demo/dist/
```

No test or lint scripts exist.

## Architecture

```
main.ts → SceneManager → IScene (interface)
                              └─ CRTSceneAdapter   (owns WebGPURenderer + RAF loop + Tweakpane)
                                    └─ CRTScreenScene  (Three.js scene, pure rendering)
```

### SceneManager (`src/SceneManager.ts`)
Holds a registry of lazy `() => IScene` factories. `switchTo(name)` disposes the current scene and Tweakpane, then constructs, mounts, and wires the new scene's pane. All resize events and disposal route through here.

### CRTSceneAdapter (`src/adapters/CRTSceneAdapter.ts`)
Implements `IScene`. Owns the `WebGPURenderer` lifecycle (create → `init()` → dispose). Drives the `requestAnimationFrame` loop (`scene.update(dt)` then `scene.render()`). Builds the Tweakpane GUI with **Display**, **CRT**, and **Bloom** folders, each binding wired to `scene.updateParameters({ key })`.

`INITIAL_PARAMS` at the top of this file is the single source of truth for startup values — it is used for both `scene.updateParameters(INITIAL_PARAMS)` after init and to seed the Tweakpane bindings.

### CRTScreenScene (`src/scenes/CRTScreenScene.ts`)
Self-contained Three.js WebGPU scene with no knowledge of `IScene`, Tweakpane, or the render loop. Key internals:

- **Two GPU storage buffers**: `currentColors` and `targetColors` (one `vec3` per logical pixel, three times logical resolution for R/G/B subpixels)
- **Color interpolation compute** (`colorComputeNode`): runs every frame, lerps subpixel values toward target with configurable `colorAttack`/`colorDecay` rates; also handles beam-scan timing and power on/off animation
- **Shader content compute** (`shaderComputeNode`): runs in `shader` display mode, writes Mandelbrot/Julia fractal colors into `targetColors`
- **Fragment shader**: maps screen UV → subpixel grid → reads `currentColors` with bilinear interpolation; applies phosphor slot mask, moiré anti-aliasing, CRT barrel distortion, vignette, bloom, and burn-in
- **PostProcessing**: `bloom(pass(scene, camera))` via the TSL display pipeline
- **Terminal subsystem**: Canvas2D with IBM VGA 8×16 font (loaded via `FontFace`) renders into a `CanvasTexture` for `terminal`/`xterm` display modes

`updateParameters(partial)` writes directly to TSL `uniform` node `.value` fields — no shader recompilation on parameter change.

### Display Mode
`CRTScreenScene` renders exclusively in **terminal** mode: a Canvas2D surface (IBM VGA 8×16 font, loaded via `FontFace`) is drawn into a `CanvasTexture` each frame when dirty, then sampled by the color compute shader via `useExternalTextureUniform`.

## Key Patterns

**Uniform-driven parameters**: All tunable values are `uniform(value, 'float')` TSL nodes. `updateParameters()` sets `.value` directly. This means Tweakpane bindings update GPU state every frame with zero recompilation.

**Renderer ownership**: `WebGPURenderer` is created in the adapter and passed into `CRTScreenScene.init(canvas, renderer)`. The scene never constructs or disposes the renderer.

**TSL shaders**: All shader logic uses TSL node functions (`Fn`, `uniform`, `vec3`, `texture`, `storage`, etc.) — never raw GLSL/WGSL.

## Type Declarations

Three.js r170+ WebGPU/TSL modules lack official `.d.ts` files. `src/types/three-modules.d.ts` declares broad `any`-typed ambients for `three/webgpu`, `three/tsl`, `OrbitControls`, and `BloomNode`. `src/types/tweakpane-core.d.ts` stubs `@tweakpane/core` internals. `src/types/dom-augments.d.ts` adds the missing `FontFaceSet.add()` to DOM lib types.

## Logical vs Physical Resolution

`CRTScreenScene` has two distinct resolutions:
- **Logical** (`logicalWidth=640`, `logicalHeight=480`): number of emulated pixels; drives storage buffer sizes and compute shader dispatch counts
- **Physical** (`screenWidth=64`, `screenHeight=48` world units): size of the Three.js mesh; camera sits at `z=50` with FOV 75°
