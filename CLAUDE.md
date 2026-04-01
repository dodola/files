# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Purpose

This is an informal code snippet repository ("using GitHub like it's pastebin"). Files are standalone TypeScript snippets extracted from larger projects — they have missing dependencies and are not meant to compile in isolation.

## Code Architecture

All files use **Three.js r170+ with WebGPU renderer** (`three/webgpu`) and the **Three Shading Language (TSL)** node-based shader system (`three/tsl`). There is no build system or package.json.

### Patterns used across files

- **TSL shaders**: All shader logic uses TSL node functions (`Fn`, `uniform`, `vec3`, `texture`, etc.) — never raw GLSL/WGSL
- **Class-based scenes**: Visual scenes (`BioluminescenceScene`, `CRTScreenScene`, `PlanetScene`) encapsulate Three.js objects as private fields with their own lifecycle management
- **GPU Compute**: `BioluminescenceScene` and `BoxFroxelPipeline` use WebGPU compute shaders via `Storage3DTexture`, `StorageBufferAttribute`, `textureStore`, and `atomicAdd`
- **Uniform-driven parameters**: Runtime-tunable values are passed as `uniform(...)` nodes to allow live updates without shader recompilation
- **Web Worker isolation**: `voxelPathfindingWorker.ts` uses typed discriminated union message protocols (`InboundMessage`/`OutboundMessage`) for CPU-heavy pathfinding off the main thread

### Files

| File | Description |
|------|-------------|
| `asciiMaterial.ts` | Builds a `MeshBasicNodeMaterial` for ASCII-art rendering using glyph atlas textures and TSL |
| `BioluminescenceScene.ts` | GPU-compute particle system simulating bioluminescent creatures with MRT and bloom |
| `BoxFroxelPipeline.ts` | Volumetric fog froxel pipeline with sphere fog volumes and shadow mapping |
| `CRTScreenScene.ts` | CRT screen emulation with RGB subpixels, scanlines, CP437 mapping, and multiple display modes |
| `PlanetScene.ts` | Multi-layer atmospheric scattering (Rayleigh + Mie) with shadow passes |
| `voxelPathfindingWorker.ts` | Web Worker for A* voxel-grid pathfinding with streaming results |

### Missing dependencies (referenced but not in repo)

- `./BioluminescenceSceneParameters`
- `./PlanetSceneParameters`
- `../oneill-cylinder/constants` (exports `FROXEL_PIXEL_SIZE`, `FROXEL_SLICE_COUNT`, `MAX_FROXEL_SLICES`)
