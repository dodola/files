/**
 * Storage3DTexture was removed from three/webgpu in Three.js 0.171.x.
 * This polyfill reconstructs it as a Data3DTexture with isStorageTexture = true,
 * which is what the WebGPU backend checks to enable STORAGE_BINDING usage and
 * to use GPUTextureDimension.ThreeD.
 */
import * as THREE from 'three';

export class Storage3DTexture extends THREE.Data3DTexture {
  constructor(width: number = 1, height: number = 1, depth: number = 1) {
    super(null, width, height, depth);
    (this as any).isStorageTexture = true;
  }
}
