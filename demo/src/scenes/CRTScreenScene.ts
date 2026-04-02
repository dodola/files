/**
 * CRT Screen Scene Class
 * 
 * A WebGPU scene that renders a virtual CRT screen with RGB subpixels
 * and various distortion effects using vertex and fragment shaders.
 */

import * as THREE from 'three/webgpu';
import { WebGPURenderer, MeshBasicNodeMaterial, MeshStandardNodeMaterial, PostProcessing } from 'three/webgpu';
import { uniform, instanceIndex, Fn, float, vec3, vec4, vec2, uint, floor, clamp, uv, texture, select, pass, max, min, mrt, output, emissive, smoothstep, pow, sqrt, inverseSqrt, mix, abs, instancedArray, fract, dot, hash, modInt } from 'three/tsl';
import { bloom } from 'three/examples/jsm/tsl/display/BloomNode.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

const CP437_TO_UNICODE: number[] = [
    0x0000, 0x263A, 0x263B, 0x2665, 0x2666, 0x2663, 0x2660, 0x2022,
    0x25D8, 0x25CB, 0x25D9, 0x2642, 0x2640, 0x266A, 0x266B, 0x263C,
    0x25BA, 0x25C4, 0x2195, 0x203C, 0x00B6, 0x00A7, 0x25AC, 0x21A8,
    0x2191, 0x2193, 0x2192, 0x2190, 0x221F, 0x2194, 0x25B2, 0x25BC,
    0x0020, 0x0021, 0x0022, 0x0023, 0x0024, 0x0025, 0x0026, 0x0027,
    0x0028, 0x0029, 0x002A, 0x002B, 0x002C, 0x002D, 0x002E, 0x002F,
    0x0030, 0x0031, 0x0032, 0x0033, 0x0034, 0x0035, 0x0036, 0x0037,
    0x0038, 0x0039, 0x003A, 0x003B, 0x003C, 0x003D, 0x003E, 0x003F,
    0x0040, 0x0041, 0x0042, 0x0043, 0x0044, 0x0045, 0x0046, 0x0047,
    0x0048, 0x0049, 0x004A, 0x004B, 0x004C, 0x004D, 0x004E, 0x004F,
    0x0050, 0x0051, 0x0052, 0x0053, 0x0054, 0x0055, 0x0056, 0x0057,
    0x0058, 0x0059, 0x005A, 0x005B, 0x005C, 0x005D, 0x005E, 0x005F,
    0x0060, 0x0061, 0x0062, 0x0063, 0x0064, 0x0065, 0x0066, 0x0067,
    0x0068, 0x0069, 0x006A, 0x006B, 0x006C, 0x006D, 0x006E, 0x006F,
    0x0070, 0x0071, 0x0072, 0x0073, 0x0074, 0x0075, 0x0076, 0x0077,
    0x0078, 0x0079, 0x007A, 0x007B, 0x007C, 0x007D, 0x007E, 0x2302,
    0x00C7, 0x00FC, 0x00E9, 0x00E2, 0x00E4, 0x00E0, 0x00E5, 0x00E7,
    0x00EA, 0x00EB, 0x00E8, 0x00EF, 0x00EE, 0x00EC, 0x00C4, 0x00C5,
    0x00C9, 0x00E6, 0x00C6, 0x00F4, 0x00F6, 0x00F2, 0x00FB, 0x00F9,
    0x00FF, 0x00D6, 0x00DC, 0x00A2, 0x00A3, 0x00A5, 0x20A7, 0x0192,
    0x00E1, 0x00ED, 0x00F3, 0x00FA, 0x00F1, 0x00D1, 0x00AA, 0x00BA,
    0x00BF, 0x2310, 0x00AC, 0x00BD, 0x00BC, 0x00A1, 0x00AB, 0x00BB,
    0x2591, 0x2592, 0x2593, 0x2502, 0x2524, 0x2561, 0x2562, 0x2556,
    0x2555, 0x2563, 0x2551, 0x2557, 0x255D, 0x255C, 0x255B, 0x2510,
    0x2514, 0x2534, 0x252C, 0x251C, 0x2500, 0x253C, 0x255E, 0x255F,
    0x255A, 0x2554, 0x2569, 0x2566, 0x2560, 0x2550, 0x256C, 0x2567,
    0x2568, 0x2564, 0x2565, 0x2559, 0x2558, 0x2552, 0x2553, 0x256B,
    0x256A, 0x2518, 0x250C, 0x2588, 0x2584, 0x258C, 0x2590, 0x2580,
    0x03B1, 0x00DF, 0x0393, 0x03C0, 0x03A3, 0x03C3, 0x00B5, 0x03C4,
    0x03A6, 0x0398, 0x03A9, 0x03B4, 0x221E, 0x03C6, 0x03B5, 0x2229,
    0x2261, 0x00B1, 0x2265, 0x2264, 0x2320, 0x2321, 0x00F7, 0x2248,
    0x00B0, 0x2219, 0x00B7, 0x221A, 0x207F, 0x00B2, 0x25A0, 0x00A0
];

const CP437_TO_UNICODE_STR: string[] = CP437_TO_UNICODE.map(code => String.fromCodePoint(code));
const UNICODE_TO_CP437: Map<number, number> = (() => {
    const map = new Map<number, number>();
    CP437_TO_UNICODE.forEach((code, idx) => {
        if (!map.has(code)) {
            map.set(code, idx);
        }
    });
    return map;
})();

export interface CRTScreenSceneParameters {
    screenResolution?: string;
    terminalFontScale?: number;
    terminalFontColor?: string;
    // Screen physical layout
    screenWidth?: number;        // physical width in world units
    screenHeight?: number;       // physical height in world units
    minBrightness?: number;      // minimum brightness for pixels
    brightness?: number;         // Overall brightness multiplier (0-2)
    
    // Phosphor appearance
    slotDutyX?: number;          // horizontal subpixel fill (0.1-1.0)
    slotDutyY?: number;          // vertical subpixel fill (0.1-1.0)
    subpixelFeather?: number;    // edge softness for anti-aliasing
    phosphorTint?: number;       // secondary channel brightness (0-0.5)
    
    // Beam physics
    beamGamma?: number;          // beam falloff exponent
    beamSpread?: number;         // beam spread factor
    vignetteStrength?: number;   // corner darkening amount
    phaseShearAmount?: number;   // edge phase distortion
    scanFramerate?: number;      // How many times per second to scan all pixels (e.g., 30)
    beamPixelDuration?: number;  // Effective time the beam dwells on each pixel (multiplier)
    
    // Color interpolation
    colorAttack?: number;        // Attack rate for color changes (higher = faster)
    colorDecay?: number;         // Decay rate for color changes (higher = faster)
    
    // CRT distortion
    crtBarrel?: number;
    crtKeystoneX?: number;
    crtKeystoneY?: number;
    crtZoom?: number;
    
    // Bloom
    bloomStrength?: number;
    bloomRadius?: number;
    bloomThreshold?: number;

    // Power on/off effect
    powerOn?: boolean;
    powerOnDuration?: number;
    powerWarmupDuration?: number;
    powerOffDuration?: number;
    powerOffEndDuration?: number;
    powerFlash?: number;

    // H-sync jitter
    hsyncJitter?: number;     // max horizontal displacement in subpixel columns (0 = off)
    hsyncSpeed?: number;      // noise time multiplier (higher = faster jitter)

    // Chromatic aberration
    chromaAmount?: number;    // max channel separation in subpixel columns (0 = off)

    // Horizontal roll
    rollSpeed?: number;       // rows per second (0 = off, negative = downward)

    // Burn-in
    burnInStrength?: number;  // how visible the ghost image is (0–1)
    burnInRate?: number;      // how fast the burn-in accumulates (0–1 per second)
}

export class CRTScreenScene {
    private static readonly BLOOM_LAYER = 1;

    private renderer: WebGPURenderer | null = null;
    private scene: THREE.Scene | null = null;
    private camera: THREE.PerspectiveCamera | null = null;
    private bloomCamera: THREE.PerspectiveCamera | null = null;
    private controls: OrbitControls | null = null;
    private canvas: HTMLCanvasElement | null = null;
    
    private screenMesh: THREE.Mesh | null = null;

    // Post-processing
    private postProcessing: PostProcessing | null = null;
    private bloomNode: any = null;
    
    // Pixel screen uniforms
    // CRT distortion uniforms
    private crtBarrelUniform: any = null;
    private crtKeystoneXUniform: any = null;
    private crtKeystoneYUniform: any = null;
    private crtZoomUniform: any = null;
    
    // Brightness and color interpolation uniforms
    private minBrightnessUniform: any = null;
    private brightnessUniform: any = null;
    private colorAttackUniform: any = null;
    private colorDecayUniform: any = null;

    // Power effect uniforms
    private powerOnUniform: any = null;
    private powerTransitionUniform: any = null;
    private powerDirectionUniform: any = null;
    private powerFlashUniform: any = null;
    private powerWarmupUniform: any = null;
    private powerCollapseRatioUniform: any = null;
    private useExternalContentUniform: any = null;
    private useExternalTextureUniform: any = null;
    
    // Static pattern uniforms (used for non-terminal fallback)
    private staticSpeedUniform: any = null;
    private staticContrastUniform: any = null;
    
    // Phosphor uniforms
    private slotDutyXUniform: any = null;
    private slotDutyYUniform: any = null;
    private subpixelFeatherUniform: any = null;
    private phosphorTintUniform: any = null;
    private screenLightModeUniform: any = null;
    
    // Beam physics uniforms
    private beamGammaUniform: any = null;
    private beamSpreadUniform: any = null;
    private vignetteStrengthUniform: any = null;
    private phaseShearAmountUniform: any = null;

    // Physical distortion effects
    private hsyncJitterUniform: any = null;
    private hsyncSpeedUniform: any = null;
    private chromaAmountUniform: any = null;
    private rollSpeedUniform: any = null;
    private burnInStrengthUniform: any = null;
    
    // Beam scan uniforms
    private scanFramerateUniform: any = null;
    private scanHeadUniform: any = null;
    private beamPixelDurationUniform: any = null;
    
    // GPU compute shader color system
    private currentColors: any = null;  // GPU storage buffer for current colors
    private targetColors: any = null;   // GPU storage buffer for target colors
    private colorComputeNode: any = null; // Compute shader for interpolation
    private targetColorArray: Float32Array | null = null; // CPU-side target buffer (only updated when needed)
    private targetColorsNeedUpdate = false;
    private burnInBuffer: Float32Array | null = null;      // CPU-side burn-in accumulation (pixels × 3)
    private burnInTexture: THREE.DataTexture | null = null; // GPU texture for burn-in

    // External content source (images/video)
    private contentCanvas: HTMLCanvasElement | null = null;
    private contentContext: CanvasRenderingContext2D | null = null;
    private contentTexture: THREE.CanvasTexture | null = null;
    private contentTextureNode: any = null;
    private contentSource: CanvasImageSource | null = null;
    private contentIsVideo = false;
    private contentDirty = false;
    private useExternalContent = false;
    private videoFrameHandle: number | null = null;
    private videoFrameSource: HTMLVideoElement | null = null;

    // Terminal rendering
    private terminalDirty = false;
    private terminalCols = 0;
    private terminalRows = 0;
    private terminalCursorX = 0;
    private terminalCursorY = 0;
    private terminalBuffer: Uint16Array | null = null;
    private terminalColorBuffer: Uint32Array | null = null;
    private terminalCurrentColor = 0x33ff66;
    private terminalColorCache = new Map<number, string>();
    private terminalColorScratch = new THREE.Color();
    private terminalFontLoaded = false;
    private terminalFontLoading = false;
    private readonly terminalFontFamily = 'IBM VGA 8x16';
    private readonly terminalCharWidth = 8;
    private readonly terminalCharHeight = 16;
    private readonly terminalPaddingChars = 1;
    private readonly terminalForeground = '#33ff66';
    private readonly terminalBackground = '#000000';
    private terminalCursorBlinkTime = 0;
    private readonly terminalCursorBlinkInterval = 0.5;
    private terminalCursorVisible = true;

    // Demo animation
    private demoQueue: Array<{ text: string; color: number; delay: number }> = [];
    private demoCharTimer = 0;
    private demoCharIdx = 0;
    private demoActive = false;
    private demoLoopTimer = 0;
    private demoLoopFrame = 0;
    private readonly DEMO_CHAR_DELAY = 0.022;  // seconds per character (typewriter speed)
    private readonly DEMO_LOOP_INTERVAL = 0.12; // seconds per spinner frame


    private lastUpdateTime: number = 0;
    private timeUniform = uniform(0, 'float');
    private deltaTimeUniform = uniform(0, 'float');
    
    // Beam scan state
    private scanHead: number = 0;  // Current scan position (fractional)

    // Power transition state
    private powerTransition = 1;
    private powerDirection = 0;
    private powerWarmup = 1;
    
    // Default resolution and scale (matches previous VGA sizing)
    private static readonly DEFAULT_LOGICAL_WIDTH = 640;
    private static readonly DEFAULT_LOGICAL_HEIGHT = 480;
    private static readonly DEFAULT_SCREEN_WIDTH = 64.0;
    private static readonly DEFAULT_SCREEN_HEIGHT = 48.0;
    private static readonly DEFAULT_RESOLUTION_PRESET =
        `${CRTScreenScene.DEFAULT_LOGICAL_WIDTH}x${CRTScreenScene.DEFAULT_LOGICAL_HEIGHT}`;

    private logicalWidth = CRTScreenScene.DEFAULT_LOGICAL_WIDTH;
    private logicalHeight = CRTScreenScene.DEFAULT_LOGICAL_HEIGHT;

    // Scene parameters
    private parameters: CRTScreenSceneParameters = {
        screenResolution: CRTScreenScene.DEFAULT_RESOLUTION_PRESET,
        terminalFontScale: 3,
        terminalFontColor: '#33ff66',
        screenWidth: CRTScreenScene.DEFAULT_SCREEN_WIDTH,
        screenHeight: CRTScreenScene.DEFAULT_SCREEN_HEIGHT,
        minBrightness: 0.01,
        brightness: 1.8,
        powerOn: true,
        powerOnDuration: 0.8,
        powerWarmupDuration: 1.6,
        powerOffDuration: 0.45,
        powerOffEndDuration: 0.0,
        powerFlash: 0.6,
        slotDutyX: 0.65,             // 65% horizontal fill
        slotDutyY: 0.68,             // 68% vertical fill
        subpixelFeather: 0.08,
        phosphorTint: 0.15,
        colorAttack: 20.0,    // Fast attack for responsive color changes
        colorDecay: 15.0,     // Slower decay for smooth fading
        beamGamma: 1.6,
        beamSpread: 1.3,
        vignetteStrength: 0.1,
        phaseShearAmount: 0.0,
        crtBarrel: 0.0,
        crtKeystoneX: 0.0,
        crtKeystoneY: 0.0,
        crtZoom: 1.0,
        bloomStrength: 1.88,
        bloomRadius: 0.0,
        bloomThreshold: 0.0,
        scanFramerate: 30,           // Scan all pixels 30 times per second
        beamPixelDuration: 5.0,      // Effective dwell time multiplier
    };
    
    private time = 0;

    constructor() {
        console.log('CRTScreenScene constructor');
    }

    private parseResolutionPreset(value?: string): { width: number; height: number } | null {
        if (!value) {
            return null;
        }
        const match = value.trim().match(/^(\d+)\s*x\s*(\d+)$/i);
        if (!match) {
            return null;
        }
        const width = Number(match[1]);
        const height = Number(match[2]);
        if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
            return null;
        }
        return { width, height };
    }

    private setLogicalResolution(value?: string): void {
        const parsed = this.parseResolutionPreset(value);
        if (!parsed) {
            return;
        }
        if (parsed.width === this.logicalWidth && parsed.height === this.logicalHeight) {
            return;
        }
        this.logicalWidth = parsed.width;
        this.logicalHeight = parsed.height;
        this.rebuildResolution();
    }

    private getScreenPhysicalWidth(): number {
        return this.parameters.screenWidth ?? CRTScreenScene.DEFAULT_SCREEN_WIDTH;
    }

    private getScreenPhysicalHeight(): number {
        return this.parameters.screenHeight ?? CRTScreenScene.DEFAULT_SCREEN_HEIGHT;
    }

    private rebuildResolution(): void {
        if (!this.renderer || !this.scene) {
            return;
        }

        this.scanHead = 0;
        this.targetColorsNeedUpdate = false;
        if (this.contentTexture) {
            this.contentTexture.dispose();
        }
        this.contentTexture = null;
        this.contentTextureNode = null;
        this.ensureContentCanvas();
        this.contentDirty = true;
        this.resetTerminalBuffer();
        this.clearVideoFrameCallback();
        this.currentColors = null;
        this.targetColors = null;
        this.colorComputeNode = null;
        this.targetColorArray = null;

        this.initializeGPUComputeShaders();
        this.createCRTScreen();
        this.applyDisplayMode();
    }

    async init(canvas: HTMLCanvasElement, renderer: WebGPURenderer): Promise<void> {
        this.canvas = canvas;
        this.renderer = renderer;
        
        // Scene setup
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x000000);
        
        // Camera setup
        this.camera = new THREE.PerspectiveCamera(
            75,
            canvas.width / canvas.height,
            0.1,
            1000
        );
        this.camera.position.set(0, 0, 50);  // Good viewing distance for default screen
        this.camera.lookAt(0, 0, 0);
        this.camera.layers.enable(CRTScreenScene.BLOOM_LAYER);

        this.bloomCamera = this.camera.clone();
        this.bloomCamera.layers.set(CRTScreenScene.BLOOM_LAYER);
        
        // Controls
        this.controls = new OrbitControls(this.camera, canvas);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        
        // Initialize GPU compute shaders FIRST
        this.initializeGPUComputeShaders();
        
        // Create the CRT screen visualization
        this.createCRTScreen();
        
        // Initialize post-processing
        this.initPostProcessing();
        this.applyDisplayMode();
    }

    update(deltaTime: number): void {
        const clampedDelta = Math.min(deltaTime, 1 / 60);
        this.time += clampedDelta;
        
        // Update time uniforms for GPU compute shader
        this.timeUniform.value = this.time;
        this.deltaTimeUniform.value = clampedDelta;

        // Update power transition
        this.updatePowerTransition(clampedDelta);
        this.updatePowerWarmup(clampedDelta);

        this.updateTerminalBlink(clampedDelta);
        this.updateDemoAnimation(clampedDelta);

        // Update beam scan position
        if (this.scanHeadUniform) {
            const totalSubpixels = this.logicalWidth * this.logicalHeight * 3;
            const scanFramerate = this.parameters.scanFramerate ?? 30;
            const pixelsPerSecond = totalSubpixels * scanFramerate;
            const pixelsThisFrame = pixelsPerSecond * clampedDelta;
            
            // Update scan head position
            this.scanHead = (this.scanHead + pixelsThisFrame) % totalSubpixels;
            
            // Update uniforms for GPU
            this.scanHeadUniform.value = this.scanHead;
        }
        
        // Update target colors on GPU if needed (rare)
        this.updateContentFrame();
        if (this.targetColorsNeedUpdate) {
            this.updateGPUTargetColors();
            this.targetColorsNeedUpdate = false;
        }

        // Burn-in accumulation
        const burnInRate = this.parameters.burnInRate ?? 0.0;
        if (burnInRate > 0 && this.burnInBuffer && this.burnInTexture && this.currentColors) {
            const colorsArray = this.currentColors.array as Float32Array;
            const decay = Math.pow(0.9, clampedDelta * 60);
            const accumulate = burnInRate * clampedDelta;
            const totalPix = this.logicalWidth * this.logicalHeight;
            for (let i = 0; i < totalPix; i++) {
                // currentColors stores R,G,B per pixel (3 floats); burnInBuffer is RGBA (4 floats)
                this.burnInBuffer[i * 4 + 0] = this.burnInBuffer[i * 4 + 0] * decay + colorsArray[i * 3 + 0] * accumulate;
                this.burnInBuffer[i * 4 + 1] = this.burnInBuffer[i * 4 + 1] * decay + colorsArray[i * 3 + 1] * accumulate;
                this.burnInBuffer[i * 4 + 2] = this.burnInBuffer[i * 4 + 2] * decay + colorsArray[i * 3 + 2] * accumulate;
                this.burnInBuffer[i * 4 + 3] = 1.0;
            }
            this.burnInTexture.needsUpdate = true;
        }

        // Execute GPU compute shader for color interpolation
        if (this.colorComputeNode && this.renderer) {
            this.renderer.computeAsync(this.colorComputeNode);
        }
        
        // Update controls
        if (this.controls) {
            this.controls.update();
        }
        this.syncBloomCamera();
    }

    render(): void {
        if (!this.renderer || !this.scene || !this.camera) return;
        
        if (this.postProcessing) {
            this.postProcessing.render();
        } else {
            this.renderer.render(this.scene, this.camera);
        }
    }

    onResize(width: number, height: number): void {
        if (!this.renderer || !this.camera) return;

        const safeWidth = Math.max(1, Math.floor(width));
        const safeHeight = Math.max(1, Math.floor(height));

        this.renderer.setSize(safeWidth, safeHeight, false);
        this.camera.aspect = safeWidth / safeHeight;
        this.camera.updateProjectionMatrix();
        if (this.bloomCamera) {
            this.bloomCamera.aspect = safeWidth / safeHeight;
            this.bloomCamera.updateProjectionMatrix();
        }
    }

    cleanup(): void {
        if (this.controls) {
            this.controls.dispose();
        }

        this.clearVideoFrameCallback();

        if (this.screenMesh) {
            this.scene?.remove(this.screenMesh);
            if (this.screenMesh.geometry) this.screenMesh.geometry.dispose();
            if (this.screenMesh.material) {
                (this.screenMesh.material as THREE.Material).dispose();
            }
        }

        // GPU resources are automatically cleaned up
        this.currentColors = null;
        this.targetColors = null;
        this.targetColorArray = null;
        this.colorComputeNode = null;
        this.powerOnUniform = null;
        this.powerTransitionUniform = null;
        this.powerDirectionUniform = null;
        this.powerFlashUniform = null;
        this.powerWarmupUniform = null;
        this.powerCollapseRatioUniform = null;
        this.useExternalContentUniform = null;
        this.useExternalTextureUniform = null;
        this.screenLightModeUniform = null;
        this.contentCanvas = null;
        this.contentContext = null;
        if (this.contentTexture) {
            this.contentTexture.dispose();
        }
        this.contentTexture = null;
        this.contentTextureNode = null;
        if (this.burnInTexture) {
            this.burnInTexture.dispose();
        }
        this.burnInTexture = null;
        this.burnInBuffer = null;
        this.contentSource = null;
        this.contentDirty = false;
        this.contentIsVideo = false;
        this.useExternalContent = false;
        this.videoFrameHandle = null;
        this.videoFrameSource = null;
        this.terminalDirty = false;
        this.terminalCols = 0;
        this.terminalRows = 0;
        this.terminalCursorX = 0;
        this.terminalCursorY = 0;
        this.terminalBuffer = null;
        this.terminalColorBuffer = null;
        this.terminalColorCache.clear();
        this.terminalFontLoaded = false;
        this.terminalFontLoading = false;
        this.terminalCursorBlinkTime = 0;
        this.terminalCursorVisible = true;
        this.bloomCamera = null;
    }

    private syncBloomCamera(): void {
        if (!this.camera || !this.bloomCamera) {
            return;
        }
        this.bloomCamera.position.copy(this.camera.position);
        this.bloomCamera.quaternion.copy(this.camera.quaternion);
        this.bloomCamera.scale.copy(this.camera.scale);
        this.bloomCamera.updateMatrixWorld(true);
        this.bloomCamera.projectionMatrix.copy(this.camera.projectionMatrix);
        this.bloomCamera.projectionMatrixInverse.copy(this.camera.projectionMatrixInverse);
    }

    updateParameters(params: Partial<CRTScreenSceneParameters>): void {
        const prevPowerOn = this.parameters.powerOn ?? true;
        const prevTerminalScale = this.parameters.terminalFontScale ?? 1;
        const prevResolution = this.parameters.screenResolution ?? CRTScreenScene.DEFAULT_RESOLUTION_PRESET;
        Object.assign(this.parameters, params);

        if (params.screenResolution !== undefined && params.screenResolution !== prevResolution) {
            this.setLogicalResolution(this.parameters.screenResolution);
        }
        if (params.terminalFontScale !== undefined && params.terminalFontScale !== prevTerminalScale) {
            this.resetTerminalBuffer();
        }
        if (params.powerOn !== undefined) {
            if (params.powerOn !== prevPowerOn) {
                this.startPowerTransition(params.powerOn);
            } else if (this.powerOnUniform) {
                this.powerOnUniform.value = params.powerOn ? 1.0 : 0.0;
            }
        }
        if (params.powerWarmupDuration !== undefined) {
            this.updateWarmupUniform();
        }
        if (params.powerOffDuration !== undefined || params.powerOffEndDuration !== undefined) {
            this.updatePowerCollapseRatio();
        }
        if (params.screenWidth !== undefined || params.screenHeight !== undefined) {
            this.createCRTScreen();
        }

        if (params.terminalFontColor !== undefined) {
            this.terminalCurrentColor = this.parseTerminalColor(params.terminalFontColor);
            this.terminalDirty = true;
        }

        if (this.minBrightnessUniform && params.minBrightness !== undefined) {
            this.minBrightnessUniform.value = params.minBrightness;
        }
        if (this.brightnessUniform && params.brightness !== undefined) {
            this.brightnessUniform.value = params.brightness;
        }
        if (this.colorAttackUniform && params.colorAttack !== undefined) {
            this.colorAttackUniform.value = params.colorAttack;
        }
        if (this.colorDecayUniform && params.colorDecay !== undefined) {
            this.colorDecayUniform.value = params.colorDecay;
        }
        if (this.powerFlashUniform && params.powerFlash !== undefined) {
            this.powerFlashUniform.value = params.powerFlash;
        }

        // Phosphor uniforms
        if (this.slotDutyXUniform && params.slotDutyX !== undefined) {
            this.slotDutyXUniform.value = params.slotDutyX;
        }
        if (this.slotDutyYUniform && params.slotDutyY !== undefined) {
            this.slotDutyYUniform.value = params.slotDutyY;
        }
        if (this.subpixelFeatherUniform && params.subpixelFeather !== undefined) {
            this.subpixelFeatherUniform.value = params.subpixelFeather;
        }
        if (this.phosphorTintUniform && params.phosphorTint !== undefined) {
            this.phosphorTintUniform.value = params.phosphorTint;
        }

        // Beam physics uniforms
        if (this.beamGammaUniform && params.beamGamma !== undefined) {
            this.beamGammaUniform.value = params.beamGamma;
        }
        if (this.beamSpreadUniform && params.beamSpread !== undefined) {
            this.beamSpreadUniform.value = params.beamSpread;
        }
        if (this.vignetteStrengthUniform && params.vignetteStrength !== undefined) {
            this.vignetteStrengthUniform.value = params.vignetteStrength;
        }
        if (this.phaseShearAmountUniform && params.phaseShearAmount !== undefined) {
            this.phaseShearAmountUniform.value = params.phaseShearAmount;
        }

        // Physical distortion effects
        if (this.hsyncJitterUniform && params.hsyncJitter !== undefined) {
            this.hsyncJitterUniform.value = params.hsyncJitter;
        }
        if (this.hsyncSpeedUniform && params.hsyncSpeed !== undefined) {
            this.hsyncSpeedUniform.value = params.hsyncSpeed;
        }
        if (this.chromaAmountUniform && params.chromaAmount !== undefined) {
            this.chromaAmountUniform.value = params.chromaAmount;
        }
        if (this.rollSpeedUniform && params.rollSpeed !== undefined) {
            this.rollSpeedUniform.value = params.rollSpeed;
        }
        if (this.burnInStrengthUniform && params.burnInStrength !== undefined) {
            this.burnInStrengthUniform.value = params.burnInStrength;
        }
        
        // CRT uniforms
        if (this.crtBarrelUniform && params.crtBarrel !== undefined) {
            this.crtBarrelUniform.value = params.crtBarrel;
        }
        if (this.crtKeystoneXUniform && params.crtKeystoneX !== undefined) {
            this.crtKeystoneXUniform.value = params.crtKeystoneX;
        }
        if (this.crtKeystoneYUniform && params.crtKeystoneY !== undefined) {
            this.crtKeystoneYUniform.value = params.crtKeystoneY;
        }
        if (this.crtZoomUniform && params.crtZoom !== undefined) {
            this.crtZoomUniform.value = params.crtZoom;
        }
        
        // Bloom parameters
        if (this.bloomNode) {
            if (params.bloomStrength !== undefined) {
                this.bloomNode.strength.value = params.bloomStrength;
            }
            if (params.bloomRadius !== undefined) {
                this.bloomNode.radius.value = params.bloomRadius;
            }
            if (params.bloomThreshold !== undefined) {
                this.bloomNode.threshold.value = params.bloomThreshold;
            }
        }
        // Beam scan parameters
        if (this.scanFramerateUniform && params.scanFramerate !== undefined) {
            this.scanFramerateUniform.value = params.scanFramerate;
        }
        if (this.beamPixelDurationUniform && params.beamPixelDuration !== undefined) {
            this.beamPixelDurationUniform.value = params.beamPixelDuration;
        }
    }

    setVideoElement(videoElement: HTMLVideoElement | null): void {
        this.setContentSource(videoElement);
    }

    private applyDisplayMode(): void {
        this.ensureContentCanvas();
        this.ensureTerminalBuffer();
        this.ensureTerminalFont();
        this.useExternalContent = true;
        if (this.useExternalContentUniform) {
            this.useExternalContentUniform.value = 1.0;
        }
        if (this.useExternalTextureUniform) {
            this.useExternalTextureUniform.value = 1.0;
        }
        this.terminalDirty = true;
        this.terminalCursorVisible = true;
        this.terminalCursorBlinkTime = 0;
        this.clearVideoFrameCallback();
        this.startDemoAnimation();
    }

    setContentSource(source: CanvasImageSource | null): void {
        if (source === this.contentSource) {
            return;
        }

        this.contentSource = source;
        this.contentIsVideo = !!source && source instanceof HTMLVideoElement;
        this.contentDirty = true;
        this.targetColorsNeedUpdate = false;

        this.clearVideoFrameCallback();

        if (!source) {
            this.applyDisplayMode();
            return;
        }

        this.ensureContentCanvas();

        if (!this.contentIsVideo) {
            this.refreshContentFromSource();
        } else {
            this.setupVideoFrameCallback(source as HTMLVideoElement);
        }

        this.applyDisplayMode();
    }

    setPixelBuffer(buffer: Float32Array): void {
        if (!this.targetColorArray) return;
        if (buffer.length !== this.targetColorArray.length) {
            console.warn('Invalid buffer size for CRT content');
            return;
        }

        this.targetColorArray.set(buffer);
        this.targetColorsNeedUpdate = true;
        this.contentSource = null;
        this.contentIsVideo = false;
        this.contentDirty = false;
        this.useExternalContent = true;
        if (this.useExternalContentUniform) {
            this.useExternalContentUniform.value = 1.0;
        }
        if (this.useExternalTextureUniform) {
            this.useExternalTextureUniform.value = 0.0;
        }
    }

    disableExternalContent(): void {
        this.contentSource = null;
        this.contentIsVideo = false;
        this.contentDirty = false;
        this.useExternalContent = false;
        if (this.useExternalContentUniform) {
            this.useExternalContentUniform.value = 0.0;
        }
        if (this.useExternalTextureUniform) {
            this.useExternalTextureUniform.value = 0.0;
        }
        this.clearVideoFrameCallback();
    }

    private ensureContentCanvas(): void {
        const width = this.logicalWidth;
        const height = this.logicalHeight;
        const hadCanvas = !!this.contentCanvas;

        if (!this.contentCanvas) {
            this.contentCanvas = document.createElement('canvas');
        }

        if (this.contentCanvas.width !== width || this.contentCanvas.height !== height) {
            this.contentCanvas.width = width;
            this.contentCanvas.height = height;
        }

        if (!this.contentContext || !hadCanvas) {
            this.contentContext = this.contentCanvas.getContext('2d');
        }

        if (!this.contentTexture) {
            this.contentTexture = new THREE.CanvasTexture(this.contentCanvas);
            this.contentTexture.colorSpace = THREE.SRGBColorSpace;
            this.contentTexture.minFilter = THREE.LinearFilter;
            this.contentTexture.magFilter = THREE.LinearFilter;
            this.contentTexture.wrapS = THREE.ClampToEdgeWrapping;
            this.contentTexture.wrapT = THREE.ClampToEdgeWrapping;
            this.contentTexture.generateMipmaps = false;
            this.contentTexture.needsUpdate = true;
        } else {
            this.contentTexture.image = this.contentCanvas;
            this.contentTexture.needsUpdate = true;
        }
    }

    private updateContentFrame(): void {
        this.ensureContentCanvas();
        this.ensureTerminalBuffer();
        this.ensureTerminalFont();
        if (this.terminalDirty) {
            this.renderTerminal();
        }
    }


    private getTerminalScale(): number {
        const rawScale = this.parameters.terminalFontScale ?? 1;
        const safeScale = Math.max(1, Math.min(10, Math.floor(rawScale)));
        return safeScale;
    }

    private getTerminalCharWidth(): number {
        return this.terminalCharWidth * this.getTerminalScale();
    }

    private getTerminalCharHeight(): number {
        return this.terminalCharHeight * this.getTerminalScale();
    }

    private getTerminalContentCols(): number {
        return Math.max(1, this.terminalCols - (this.terminalPaddingChars * 2));
    }

    private getTerminalContentRows(): number {
        return Math.max(1, this.terminalRows - (this.terminalPaddingChars * 2));
    }

    private resetTerminalBuffer(): void {
        this.terminalBuffer = null;
        this.terminalColorBuffer = null;
        this.terminalDirty = true;
        this.terminalCursorX = 0;
        this.terminalCursorY = 0;
        this.ensureTerminalBuffer();
    }

    private ensureTerminalBuffer(): void {
        const charWidth = this.getTerminalCharWidth();
        const charHeight = this.getTerminalCharHeight();
        const cols = Math.max(1, Math.floor(this.logicalWidth / charWidth));
        const rows = Math.max(1, Math.floor(this.logicalHeight / charHeight));

        if (this.terminalBuffer && this.terminalCols === cols && this.terminalRows === rows) {
            if (!this.terminalColorBuffer || this.terminalColorBuffer.length !== this.terminalBuffer.length) {
                this.terminalCurrentColor = this.parseTerminalColor(this.parameters.terminalFontColor);
                this.terminalColorBuffer = new Uint32Array(this.terminalBuffer.length);
                this.terminalColorBuffer.fill(this.terminalCurrentColor);
                this.terminalDirty = true;
            }
            return;
        }

        this.terminalCols = cols;
        this.terminalRows = rows;
        this.terminalCursorX = 0;
        this.terminalCursorY = 0;
        this.terminalBuffer = new Uint16Array(cols * rows);
        this.terminalBuffer.fill(32);
        this.terminalCurrentColor = this.parseTerminalColor(this.parameters.terminalFontColor);
        this.terminalColorBuffer = new Uint32Array(cols * rows);
        this.terminalColorBuffer.fill(this.terminalCurrentColor);
        this.terminalDirty = true;
    }

    private ensureTerminalFont(): void {
        if (this.terminalFontLoaded || this.terminalFontLoading) {
            return;
        }
        if (typeof FontFace === 'undefined' || !document?.fonts) {
            return;
        }

        this.terminalFontLoading = true;
        const font = new FontFace(
            this.terminalFontFamily,
            'url(/fonts/oldschool_pc/Web437_IBM_VGA_8x16.woff)'
        );

        font.load()
            .then(loaded => {
                document.fonts.add(loaded);
                this.terminalFontLoaded = true;
                this.terminalFontLoading = false;
                this.terminalDirty = true;
            })
            .catch(() => {
                this.terminalFontLoading = false;
            });
    }

    private renderTerminal(): void {
        if (!this.contentCanvas || !this.contentContext || !this.contentTexture || !this.terminalBuffer) {
            return;
        }

        const charWidth = this.getTerminalCharWidth();
        const charHeight = this.getTerminalCharHeight();
        const terminalColor = this.parameters.terminalFontColor ?? this.terminalForeground;

        this.contentContext.fillStyle = this.terminalBackground;
        this.contentContext.fillRect(0, 0, this.contentCanvas.width, this.contentCanvas.height);
        this.contentContext.textBaseline = 'top';
        this.contentContext.textAlign = 'left';
        this.contentContext.imageSmoothingEnabled = false;
        this.contentContext.font = `${charHeight}px '${this.terminalFontFamily}', monospace`;

        const pad = this.terminalPaddingChars;
        const contentCols = this.getTerminalContentCols();
        const contentRows = this.getTerminalContentRows();
        const cursorX = this.terminalCursorVisible ? Math.min(this.terminalCursorX, contentCols - 1) : -1;
        const cursorY = this.terminalCursorVisible ? Math.min(this.terminalCursorY, contentRows - 1) : -1;
        const cursorIndex = cursorX >= 0 && cursorY >= 0
            ? (cursorY + pad) * this.terminalCols + (cursorX + pad)
            : -1;

        for (let row = 0; row < contentRows; row++) {
            const start = (row + pad) * this.terminalCols + pad;
            const y = (row + pad) * charHeight;
            for (let col = 0; col < contentCols; col++) {
                const idx = start + col;
                if (idx === cursorIndex) {
                    continue;
                }
                const code = this.terminalBuffer[idx] ?? 32;
                if (code === 32) {
                    continue;
                }
                const glyph = CP437_TO_UNICODE_STR[code] ?? ' ';
                if (glyph === ' ') {
                    continue;
                }
                const colorValue = this.terminalColorBuffer
                    ? this.terminalColorBuffer[idx]
                    : this.terminalCurrentColor;
                this.contentContext.fillStyle = this.getTerminalColorCss(colorValue);
                const x = (col + pad) * charWidth;
                this.contentContext.fillText(glyph, x, y);
            }
        }

        if (this.terminalCursorVisible) {
            const cursorIdx = cursorIndex;
            if (cursorIdx >= 0) {
                const code = this.terminalBuffer[cursorIdx] ?? 32;
                const glyph = CP437_TO_UNICODE_STR[code] ?? ' ';
                const x = (cursorX + pad) * charWidth;
                const y = (cursorY + pad) * charHeight;
                this.contentContext.fillStyle = this.getTerminalColorCss(this.terminalCurrentColor) ?? terminalColor;
                this.contentContext.fillRect(x, y, charWidth, charHeight);
                this.contentContext.fillStyle = this.terminalBackground;
                this.contentContext.fillText(glyph, x, y);
            }
        }

        this.contentTexture.needsUpdate = true;
        this.terminalDirty = false;
    }

    private updateTerminalBlink(deltaTime: number): void {
        this.terminalCursorBlinkTime += deltaTime;
        if (this.terminalCursorBlinkTime >= this.terminalCursorBlinkInterval) {
            this.terminalCursorBlinkTime -= this.terminalCursorBlinkInterval;
            this.terminalCursorVisible = !this.terminalCursorVisible;
            this.terminalDirty = true;
        }
    }

    private parseTerminalColor(value?: string): number {
        const fallback = this.terminalForeground;
        const color = this.terminalColorScratch;
        try {
            color.set(value ?? fallback);
        } catch {
            color.set(fallback);
        }
        const r = Math.max(0, Math.min(255, Math.round(color.r * 255)));
        const g = Math.max(0, Math.min(255, Math.round(color.g * 255)));
        const b = Math.max(0, Math.min(255, Math.round(color.b * 255)));
        return (r << 16) | (g << 8) | b;
    }

    private getTerminalColorCss(value: number): string {
        const cached = this.terminalColorCache.get(value);
        if (cached) {
            return cached;
        }
        const hex = value.toString(16).padStart(6, '0');
        const css = `#${hex}`;
        this.terminalColorCache.set(value, css);
        return css;
    }

    private writeTerminalChar(charCode: number): void {
        if (!this.terminalBuffer) {
            return;
        }
        if (!this.terminalColorBuffer || this.terminalColorBuffer.length !== this.terminalBuffer.length) {
            this.terminalCurrentColor = this.parseTerminalColor(this.parameters.terminalFontColor);
            this.terminalColorBuffer = new Uint32Array(this.terminalBuffer.length);
            this.terminalColorBuffer.fill(this.terminalCurrentColor);
        }

        const pad = this.terminalPaddingChars;
        const contentCols = this.getTerminalContentCols();
        const contentRows = this.getTerminalContentRows();
        const idx = (this.terminalCursorY + pad) * this.terminalCols + (this.terminalCursorX + pad);
        this.terminalBuffer[idx] = charCode;
        if (this.terminalColorBuffer) {
            this.terminalColorBuffer[idx] = this.terminalCurrentColor;
        }
        this.terminalCursorX += 1;

        if (this.terminalCursorX >= contentCols) {
            this.terminalCursorX = 0;
            this.terminalCursorY += 1;
        }

        if (this.terminalCursorY >= contentRows) {
            this.scrollTerminal();
        }
        this.terminalDirty = true;
        this.terminalCursorVisible = true;
        this.terminalCursorBlinkTime = 0;
    }

    private newlineTerminal(): void {
        this.terminalCursorX = 0;
        this.terminalCursorY += 1;
        if (this.terminalCursorY >= this.getTerminalContentRows()) {
            this.scrollTerminal();
        }
        this.terminalDirty = true;
        this.terminalCursorVisible = true;
        this.terminalCursorBlinkTime = 0;
    }

    private scrollTerminal(): void {
        if (!this.terminalBuffer) {
            return;
        }

        const pad = this.terminalPaddingChars;
        const contentCols = this.getTerminalContentCols();
        const contentRows = this.getTerminalContentRows();
        if (!this.terminalColorBuffer) {
            this.terminalColorBuffer = new Uint32Array(this.terminalBuffer.length);
            this.terminalColorBuffer.fill(this.terminalCurrentColor);
        }

        for (let row = 0; row < contentRows - 1; row++) {
            const srcStart = (row + 1 + pad) * this.terminalCols + pad;
            const dstStart = (row + pad) * this.terminalCols + pad;
            this.terminalBuffer.copyWithin(dstStart, srcStart, srcStart + contentCols);
            this.terminalColorBuffer.copyWithin(dstStart, srcStart, srcStart + contentCols);
        }

        const lastRowStart = (contentRows - 1 + pad) * this.terminalCols + pad;
        this.terminalBuffer.fill(32, lastRowStart, lastRowStart + contentCols);
        this.terminalColorBuffer.fill(this.terminalCurrentColor, lastRowStart, lastRowStart + contentCols);
        this.terminalCursorY = contentRows - 1;
    }

    private backspaceTerminal(): void {
        if (!this.terminalBuffer) {
            return;
        }

        const contentCols = this.getTerminalContentCols();
        if (this.terminalCursorX > 0) {
            this.terminalCursorX -= 1;
        } else if (this.terminalCursorY > 0) {
            this.terminalCursorY -= 1;
            this.terminalCursorX = contentCols - 1;
        } else {
            return;
        }

        const pad = this.terminalPaddingChars;
        const idx = (this.terminalCursorY + pad) * this.terminalCols + (this.terminalCursorX + pad);
        this.terminalBuffer[idx] = 32;
        if (this.terminalColorBuffer) {
            this.terminalColorBuffer[idx] = this.terminalCurrentColor;
        }
        this.terminalDirty = true;
        this.terminalCursorVisible = true;
        this.terminalCursorBlinkTime = 0;
    }

    // ── Demo animation ──────────────────────────────────────────────────────

    private startDemoAnimation(): void {
        this.demoQueue = [];
        this.demoCharIdx = 0;
        this.demoCharTimer = 0;
        this.demoLoopTimer = 0;
        this.demoLoopFrame = 0;
        this.demoActive = true;

        const C = {
            green:   0x33ff66,
            cyan:    0x55ffff,
            yellow:  0xffff55,
            white:   0xffffff,
            grey:    0x888888,
            red:     0xff4444,
            magenta: 0xff55ff,
        };

        const q = (text: string, color: number, delay = this.DEMO_CHAR_DELAY) => {
            this.demoQueue.push({ text, color, delay });
        };

        // Boot header
        q('╔══════════════════════════════════════════════╗\n', C.cyan, 0);
        q('║  WebGPU CRT Terminal  v1.0  © 2025           ║\n', C.cyan, 0);
        q('╚══════════════════════════════════════════════╝\n', C.cyan, 0);
        q('\n', C.green, 0);

        // BIOS-style system check lines
        q('BIOS', C.yellow, 0.04);
        q(' v2.11.0 ', C.white, 0.04);
        q('initialising hardware...\n', C.grey, 0.03);
        q('CPU  ', C.yellow, 0.0);
        q('Three.js WebGPU Renderer ', C.white, 0.03);
        q('[', C.grey, 0.0);
        q('OK', C.green, 0.06);
        q(']\n', C.grey, 0.0);
        q('MEM  ', C.yellow, 0.0);
        q('GPU Storage Buffers      ', C.white, 0.03);
        q('[', C.grey, 0.0);
        q('OK', C.green, 0.06);
        q(']\n', C.grey, 0.0);
        q('PHO  ', C.yellow, 0.0);
        q('Phosphor Slot Mask       ', C.white, 0.03);
        q('[', C.grey, 0.0);
        q('OK', C.green, 0.06);
        q(']\n', C.grey, 0.0);
        q('BLM  ', C.yellow, 0.0);
        q('Bloom Post-Processing    ', C.white, 0.03);
        q('[', C.grey, 0.0);
        q('OK', C.green, 0.06);
        q(']\n', C.grey, 0.0);
        q('SYS  ', C.yellow, 0.0);
        q('TSL Compute Shaders      ', C.white, 0.03);
        q('[', C.grey, 0.0);
        q('OK', C.green, 0.06);
        q(']\n', C.grey, 0.0);
        q('\n', C.green, 0);
        q('Loading CRT surface geometry..........', C.grey, 0.025);
        q(' done\n', C.green, 0.0);
        q('Calibrating beam scan parameters......', C.grey, 0.025);
        q(' done\n', C.green, 0.0);
        q('Warming up phosphor emitter...........', C.grey, 0.025);
        q(' done\n', C.green, 0.0);
        q('\n', C.green, 0);
        q('┌─────────────────────────────────────────────┐\n', C.magenta, 0);
        q('│  THREE.js r170+  WebGPU  TSL  Tweakpane     │\n', C.magenta, 0);
        q('│  Subpixel rendering · Bloom · Beam physics  │\n', C.magenta, 0);
        q('└─────────────────────────────────────────────┘\n', C.magenta, 0);
        q('\n', C.green, 0);
        q('System ready.\n', C.white, 0.05);
        q('\n', C.green, 0);
        q('C:\\> _', C.green, 0.05);
    }

    private encodeToCP437(text: string): number[] {
        const codes: number[] = [];
        for (const ch of text) {
            if (ch === '\n') {
                codes.push(0x0A);
                continue;
            }
            const cp = ch.codePointAt(0) ?? 32;
            const mapped = UNICODE_TO_CP437.get(cp);
            if (mapped !== undefined) {
                codes.push(mapped);
            } else {
                codes.push(63); // '?'
            }
        }
        return codes;
    }

    private updateDemoAnimation(dt: number): void {
        if (!this.demoActive) return;

        // Phase 1: typewriter queue
        if (this.demoCharIdx < this.demoQueue.length) {
            const entry = this.demoQueue[this.demoCharIdx];
            this.demoCharTimer += dt;
            const codes = this.encodeToCP437(entry.text);
            // How many characters to emit this frame
            const charsToEmit = entry.delay <= 0
                ? codes.length
                : Math.floor(this.demoCharTimer / entry.delay);

            if (charsToEmit > 0 && codes.length > 0) {
                this.demoCharTimer = entry.delay <= 0 ? 0 : this.demoCharTimer % entry.delay;
                const prevColor = this.terminalCurrentColor;
                this.terminalCurrentColor = entry.color;
                for (let i = 0; i < Math.min(charsToEmit, codes.length); i++) {
                    const code = codes[i];
                    if (code === 0x0A) {
                        this.terminalCursorX = 0;
                        this.terminalCursorY += 1;
                        if (this.terminalCursorY >= this.getTerminalContentRows()) {
                            this.scrollTerminal();
                        }
                    } else {
                        this.writeTerminalChar(code);
                    }
                }
                this.terminalCurrentColor = prevColor;
                this.terminalDirty = true;

                // If all chars emitted, advance queue
                if (charsToEmit >= codes.length) {
                    this.demoCharIdx++;
                    this.demoCharTimer = 0;
                }
            }
            return;
        }

        // Phase 2: spinner/pulse after boot text is done
        this.demoLoopTimer += dt;
        if (this.demoLoopTimer >= this.DEMO_LOOP_INTERVAL) {
            this.demoLoopTimer = 0;
            this.demoLoopFrame++;
            this.renderDemoSpinner();
        }
    }

    private renderDemoSpinner(): void {
        if (!this.terminalBuffer) return;
        const spinChars = [179, 47, 196, 92]; // CP437: │ / ─ \
        const frame = this.demoLoopFrame % spinChars.length;
        // Find last character position (the '_' cursor after 'C:\> _')
        // Replace it with spinner frame + underscore
        const cols = this.getTerminalContentCols();
        const rows = this.getTerminalContentRows();
        const pad = this.terminalPaddingChars;
        const row = Math.min(this.terminalCursorY, rows - 1);
        const col = Math.max(0, this.terminalCursorX - 1);
        const idx = (row + pad) * this.terminalCols + (col + pad);
        if (this.terminalBuffer && idx >= 0 && idx < this.terminalBuffer.length) {
            this.terminalBuffer[idx] = spinChars[frame];
            if (this.terminalColorBuffer) {
                this.terminalColorBuffer[idx] = 0x33ff66;
            }
            this.terminalDirty = true;
        }
        // suppress unused-warning for cols
        void cols;
    }

    handleTerminalKey(event: KeyboardEvent): void {

        if (event.key === 'Backspace') {
            event.preventDefault();
            this.backspaceTerminal();
            return;
        }
        if (event.key === 'Enter') {
            event.preventDefault();
            this.newlineTerminal();
            return;
        }
        if (event.key === 'Tab') {
            event.preventDefault();
            for (let i = 0; i < 4; i++) {
                this.writeTerminalChar(32);
            }
            return;
        }
        if (event.key.length === 1) {
            const codePoint = event.key.codePointAt(0);
            if (codePoint !== undefined) {
                const mapped = UNICODE_TO_CP437.get(codePoint);
                if (mapped !== undefined) {
                    event.preventDefault();
                    this.writeTerminalChar(mapped);
                }
            }
        }
    }

    private refreshContentFromSource(): void {
        if (!this.contentSource || !this.contentContext || !this.contentCanvas || !this.contentTexture) {
            return;
        }

        const sourceSize = this.getContentSourceSize(this.contentSource);
        if (!sourceSize || sourceSize.width <= 0 || sourceSize.height <= 0) {
            return;
        }

        const destWidth = this.contentCanvas.width;
        const destHeight = this.contentCanvas.height;

        this.contentContext.drawImage(this.contentSource, 0, 0, destWidth, destHeight);

        this.contentTexture.needsUpdate = true;
        this.contentDirty = false;
    }

    private setupVideoFrameCallback(video: HTMLVideoElement): void {
        this.videoFrameSource = video;
        if ('requestVideoFrameCallback' in video) {
            const onFrame = () => {
                this.contentDirty = true;
                if (this.videoFrameSource === video) {
                    this.videoFrameHandle = video.requestVideoFrameCallback(onFrame);
                }
            };
            this.videoFrameHandle = video.requestVideoFrameCallback(onFrame);
        }
    }

    private clearVideoFrameCallback(): void {
        if (this.videoFrameSource && this.videoFrameHandle !== null) {
            if ('cancelVideoFrameCallback' in this.videoFrameSource) {
                this.videoFrameSource.cancelVideoFrameCallback(this.videoFrameHandle);
            }
        }
        this.videoFrameHandle = null;
        this.videoFrameSource = null;
    }

    private getContentSourceSize(source: CanvasImageSource): { width: number; height: number } | null {
        if (source instanceof HTMLVideoElement) {
            return { width: source.videoWidth, height: source.videoHeight };
        }
        if (source instanceof HTMLImageElement) {
            return { width: source.naturalWidth || source.width, height: source.naturalHeight || source.height };
        }
        if (source instanceof HTMLCanvasElement) {
            return { width: source.width, height: source.height };
        }
        if (typeof OffscreenCanvas !== 'undefined' && source instanceof OffscreenCanvas) {
            return { width: source.width, height: source.height };
        }
        if (typeof ImageBitmap !== 'undefined' && source instanceof ImageBitmap) {
            return { width: source.width, height: source.height };
        }
        return null;
    }

    private startPowerTransition(nextOn: boolean): void {
        if (!this.powerOnUniform || !this.powerTransitionUniform || !this.powerDirectionUniform) {
            return;
        }

        const duration = nextOn
            ? (this.parameters.powerOnDuration ?? 0.8)
            : this.getPowerOffTotalDuration();
        const clampedDuration = Math.max(0.0, duration);

        this.powerOnUniform.value = nextOn ? 1.0 : 0.0;
        if (nextOn) {
            const warmupDuration = this.parameters.powerWarmupDuration ?? 1.6;
            this.powerWarmup = warmupDuration <= 0.0 ? 1.0 : 0.0;
            this.updateWarmupUniform();
        }

        if (clampedDuration <= 0.0) {
            this.powerTransition = 1.0;
            this.powerDirection = 0.0;
            this.powerTransitionUniform.value = 1.0;
            this.powerDirectionUniform.value = 0.0;
            return;
        }

        this.powerTransition = 0.0;
        this.powerDirection = nextOn ? 1.0 : -1.0;
        this.powerTransitionUniform.value = 0.0;
        this.powerDirectionUniform.value = this.powerDirection;
        if (!nextOn) {
            this.updatePowerCollapseRatio();
        }
    }

    private updatePowerTransition(deltaTime: number): void {
        if (!this.powerTransitionUniform || !this.powerDirectionUniform) {
            return;
        }

        if (this.powerDirection === 0) {
            return;
        }

        const duration = this.powerDirection > 0
            ? (this.parameters.powerOnDuration ?? 0.8)
            : this.getPowerOffTotalDuration();
        const safeDuration = Math.max(0.001, duration);

        this.powerTransition = Math.min(this.powerTransition + (deltaTime / safeDuration), 1.0);
        this.powerTransitionUniform.value = this.powerTransition;

        if (this.powerTransition >= 1.0) {
            this.powerDirection = 0.0;
            this.powerDirectionUniform.value = 0.0;
        }
    }

    private getPowerOffTotalDuration(): number {
        const offDuration = Math.max(0.0, this.parameters.powerOffDuration ?? 0.45);
        const endDuration = Math.max(0.0, this.parameters.powerOffEndDuration ?? 0.0);
        return offDuration + endDuration;
    }

    private updatePowerCollapseRatio(): void {
        if (!this.powerCollapseRatioUniform) {
            return;
        }

        const offDuration = Math.max(0.0, this.parameters.powerOffDuration ?? 0.45);
        const endDuration = Math.max(0.0, this.parameters.powerOffEndDuration ?? 0.0);
        const total = offDuration + endDuration;
        const ratio = total > 0.0 ? offDuration / total : 1.0;
        this.powerCollapseRatioUniform.value = ratio;
    }

    private updatePowerWarmup(deltaTime: number): void {
        if (!this.powerWarmupUniform) {
            return;
        }

        if (!(this.parameters.powerOn ?? true)) {
            return;
        }

        if (this.powerWarmup >= 1.0) {
            return;
        }

        const duration = this.parameters.powerWarmupDuration ?? 1.6;
        if (duration <= 0.0) {
            this.powerWarmup = 1.0;
            this.updateWarmupUniform();
            return;
        }

        this.powerWarmup = Math.min(this.powerWarmup + (deltaTime / duration), 1.0);
        this.updateWarmupUniform();
    }

    private updateWarmupUniform(): void {
        if (!this.powerWarmupUniform) {
            return;
        }

        this.powerWarmupUniform.value = this.powerWarmup;
    }

    dispose(): void {
        this.cleanup();
    }

    private initializeGPUComputeShaders(): void {
        const screenWidth = this.logicalWidth;
        const screenHeight = this.logicalHeight;
        const totalSubpixels = screenWidth * screenHeight * 3;
        const totalPixels = screenWidth * screenHeight;

        this.ensureContentCanvas();
        if (this.contentTexture) {
            this.contentTextureNode = texture(this.contentTexture);
        }
        
        // Initialize CPU-side target array (only updated when content changes)
        this.targetColorArray = new Float32Array(totalPixels * 3);

        // Create GPU storage buffers
        this.currentColors = instancedArray(totalSubpixels, 'vec3');
        this.targetColors = instancedArray(this.targetColorArray, 'vec3');

        if (!this.minBrightnessUniform) {
            this.minBrightnessUniform = uniform(this.parameters.minBrightness ?? 0.1, 'float');
        } else {
            this.minBrightnessUniform.value = this.parameters.minBrightness ?? 0.1;
        }
        if (!this.colorAttackUniform) {
            this.colorAttackUniform = uniform(this.parameters.colorAttack ?? 8.0, 'float');
        } else {
            this.colorAttackUniform.value = this.parameters.colorAttack ?? 8.0;
        }
        if (!this.colorDecayUniform) {
            this.colorDecayUniform = uniform(this.parameters.colorDecay ?? 4.0, 'float');
        } else {
            this.colorDecayUniform.value = this.parameters.colorDecay ?? 4.0;
        }
        this.useExternalContentUniform = uniform(this.useExternalContent ? 1.0 : 0.0, 'float');
        this.useExternalTextureUniform = uniform(this.useExternalContent ? 1.0 : 0.0, 'float');

        // Initialize beam scan uniforms
        this.scanFramerateUniform = uniform(this.parameters.scanFramerate ?? 30, 'float');
        this.scanHeadUniform = uniform(0, 'float');
        this.beamPixelDurationUniform = uniform(this.parameters.beamPixelDuration ?? 1.0, 'float');
        
        // Power effect uniforms (used by compute shader)
        this.powerWarmup = this.parameters.powerOn ? 1.0 : 0.0;
        this.powerOnUniform = uniform(this.parameters.powerOn ? 1.0 : 0.0, 'float');
        this.powerTransitionUniform = uniform(1.0, 'float');
        this.powerDirectionUniform = uniform(0.0, 'float');
        this.powerFlashUniform = uniform(this.parameters.powerFlash ?? 0.6, 'float');
        this.powerWarmupUniform = uniform(this.powerWarmup, 'float');
        this.powerCollapseRatioUniform = uniform(1.0, 'float');
        this.updatePowerCollapseRatio();
        
        // Create GPU compute shader for color interpolation and animation
        const computeShaderFn = Fn(() => {
            // Get subpixel index
            const idx = instanceIndex;
            
            // Get current color from storage
            const currentColor = this.currentColors.element(idx);
            
            // Calculate which logical pixel and subpixel this is
            // CRT scans horizontally: left to right, top to bottom
            // Layout: row 0 all columns, then row 1 all columns, etc.
            const totalColumns = uint(screenWidth * 3);  // Total subpixel columns
            const rowIdx = idx.div(totalColumns);        // Which row (0 to screenHeight-1)
            const columnIdx = idx.modInt(totalColumns);     // Which column (0 to screenWidth*3-1)
            const pixelX = columnIdx.div(uint(3));       // Which logical pixel horizontally
            const pixelY = rowIdx;                       // Which logical pixel vertically
            const subpixelIdx = columnIdx.modInt(uint(3));  // 0=R, 1=G, 2=B

            // Normalized pixel position for power collapse ([-1, 1])
            const screenWidthF = float(screenWidth);
            const screenHeightF = float(screenHeight);
            const nx = pixelX.toFloat().add(float(0.5)).div(screenWidthF).mul(float(2.0)).sub(float(1.0));
            const ny = pixelY.toFloat().add(float(0.5)).div(screenHeightF).mul(float(2.0)).sub(float(1.0));
            const nxAbs = abs(nx);
            const nyAbs = abs(ny);
            
            // Power transition controls active scan region
            const powerPhase = this.powerTransitionUniform;
            const powerDir = this.powerDirectionUniform;
            const isPoweringOn = powerDir.greaterThan(float(0.5));
            const isTransition = abs(powerDir).greaterThan(float(0.1));
            const minExtentX = float(1.0).div(screenWidthF);
            const minExtentY = float(1.0).div(screenHeightF);
            
            const collapseRatio = max(this.powerCollapseRatioUniform, float(0.001));
            const collapsePhase = clamp(powerPhase.div(collapseRatio), 0.0, 1.0);
            const widthPhase = select(isPoweringOn, powerPhase, collapsePhase);
            const onWidthX = mix(minExtentX, float(1.0), smoothstep(float(0.0), float(0.6), widthPhase));
            const onWidthY = mix(minExtentY, float(1.0), smoothstep(float(0.2), float(1.0), widthPhase));
            const offWidthY = mix(float(1.0), minExtentY, smoothstep(float(0.0), float(0.6), widthPhase));
            const offWidthX = mix(float(1.0), minExtentX, smoothstep(float(0.3), float(1.0), widthPhase));
            const steadyExtentX = select(this.powerOnUniform.greaterThan(float(0.5)), float(1.0), minExtentX);
            const steadyExtentY = select(this.powerOnUniform.greaterThan(float(0.5)), float(1.0), minExtentY);
            const widthX = select(isTransition, select(isPoweringOn, onWidthX, offWidthX), steadyExtentX);
            const widthY = select(isTransition, select(isPoweringOn, onWidthY, offWidthY), steadyExtentY);
            const featherPixels = float(4.0);
            const featherX = featherPixels.div(screenWidthF);
            const featherY = featherPixels.div(screenHeightF);
            const edgeX = smoothstep(widthX, widthX.add(featherX), nxAbs);
            const edgeY = smoothstep(widthY, widthY.add(featherY), nyAbs);
            const xCover = float(1.0).sub(edgeX);
            const yCover = float(1.0).sub(edgeY);
            const inActiveFactor = xCover.mul(yCover);

            // Sample content texture for terminal display
            const contentUV = vec2(
                pixelX.toFloat().add(float(0.5)).div(screenWidthF),
                float(1.0).sub(pixelY.toFloat().add(float(0.5)).div(screenHeightF))
            );
            const contentSample = texture(this.contentTexture, contentUV);
            const intensity = select(
                subpixelIdx.equal(uint(0)), contentSample.r,
                select(subpixelIdx.equal(uint(1)), contentSample.g, contentSample.b)
            );
            
            // Create target color (single channel intensity, stored in all RGB for shader compatibility)
            const targetIntensity = intensity.add(this.minBrightnessUniform.mul(this.powerOnUniform));
            const targetColor = vec3(targetIntensity, targetIntensity, targetIntensity);
            
            // Continuous scan timing based on floating scan head
            const totalSubpixelsF = float(totalSubpixels);
            const scanHead = this.scanHeadUniform;
            const idxF = idx.toFloat();
            const delta = scanHead.sub(idxF);
            const deltaWrapped = select(
                delta.greaterThanEqual(float(0.0)),
                delta,
                delta.add(totalSubpixelsF)
            );
            const pixelsPerSecond = this.scanFramerateUniform.mul(totalSubpixelsF);
            const safePixelsPerSecond = max(pixelsPerSecond, float(0.0001));
            const timeSinceHit = deltaWrapped.div(safePixelsPerSecond);
            const baseDwell = float(1.0).div(safePixelsPerSecond);
            
            // Simulate the beam hitting the pixel and then decay
            // First: Apply attack with beamPixelDuration (fake longer dwell)
            // Then: Apply decay for remaining time based on position
            let finalColor = currentColor;
            
            // If in scan window: First attack to target, then decay
            const attackDiff = targetColor.sub(currentColor);
            
            // Beam current envelope and boost as active area collapses
            const onLevel = smoothstep(float(0.0), float(1.0), powerPhase);
            const offLevel = float(1.0).sub(smoothstep(float(0.0), float(1.0), powerPhase));
            const steadyLevel = select(this.powerOnUniform.greaterThan(float(0.5)), float(1.0), float(0.0));
            const transitionLevel = select(isPoweringOn, onLevel, offLevel);
            const baseLevel = select(isTransition, transitionLevel, steadyLevel);
            const onFlash = smoothstep(float(0.0), float(0.2), powerPhase)
                .mul(float(1.0).sub(smoothstep(float(0.2), float(0.6), powerPhase)));
            const offFlash = smoothstep(float(0.0), float(0.15), powerPhase)
                .mul(float(1.0).sub(smoothstep(float(0.15), float(0.4), powerPhase)));
            const flash = select(isPoweringOn, onFlash, offFlash);
            const flashBoost = float(1.0).add(this.powerFlashUniform.mul(flash));
            const warmupLevel = smoothstep(float(0.0), float(1.0), this.powerWarmupUniform);
            const offBoostMax = float(6.0);
            const offDurationScale = mix(float(1.0), offBoostMax, powerPhase);
            const durationScale = select(
                isTransition,
                select(isPoweringOn, float(1.0), offDurationScale),
                float(1.0)
            );
            const beamCurrent = baseLevel.mul(flashBoost).mul(warmupLevel).mul(durationScale);
            
            // Attack phase: Use beamPixelDuration to fake longer beam dwell
            // This is packed into the infinitesimal actual beam time
            const dwellTime = baseDwell.mul(this.beamPixelDurationUniform).mul(durationScale);
            const dwellHalf = dwellTime.mul(0.5);
            const beamStart = timeSinceHit.sub(dwellHalf);
            const beamEnd = timeSinceHit.add(dwellHalf);
            const shutterTime = max(this.deltaTimeUniform, float(0.000001));
            const overlapStart = max(float(0.0), beamStart);
            const overlapEnd = min(shutterTime, beamEnd);
            const overlapTime = clamp(overlapEnd.sub(overlapStart), 0.0, dwellTime);
            const exposureTime = overlapTime
                .mul(safePixelsPerSecond)
                .mul(this.deltaTimeUniform)
                .mul(inActiveFactor);
            const attackStrength = this.colorAttackUniform
                .mul(exposureTime)
                .mul(beamCurrent);
            const attackAlpha = clamp(
                float(1.0).sub(
                    pow(float(2.718281828), attackStrength.mul(float(-1.0)))
                ),
                0.0,
                1.0
            );
            finalColor = finalColor.add(attackDiff.mul(attackAlpha));
            
            // Decay phase: After beam passes, decay based on position
            // Pixels at start of scan (position 0) decay for full deltaTime
            // Pixels at end of scan (position 1) have minimal decay time
            const decayTarget = vec3(0.0, 0.0, 0.0);  // Always decay toward black
            const decayDiff = decayTarget.sub(finalColor);
            
            const decayAlpha = clamp(
                float(1.0).sub(
                    pow(float(2.718281828), this.colorDecayUniform.mul(this.deltaTimeUniform).mul(float(-1.0)))
                ),
                0.0,
                1.0
            );
            const newColor = finalColor.add(decayDiff.mul(decayAlpha));
            
            // Store result back
            this.currentColors.element(idx).assign(newColor);
        });
        
        // Create compute node for parallel execution
        this.colorComputeNode = computeShaderFn().compute(totalSubpixels);
    }
    
    private initPostProcessing(): void {
        if (!this.renderer || !this.scene || !this.camera) return;
        
        const scenePass = pass(this.scene, this.camera);
        // Set up MRT (Multiple Render Targets) for proper emissive handling
        scenePass.setMRT(mrt({ output, emissive }));
        
        // Get the base scene color
        const scenePassColor = scenePass.getTextureNode('output');
        const bloomCamera = this.bloomCamera ?? this.camera;
        const bloomPass = pass(this.scene, bloomCamera);
        bloomPass.setMRT(mrt({ output, emissive }));
        const bloomPassColor = bloomPass.getTextureNode('output');
        
        // Create bloom from the scene
        this.bloomNode = bloom(
            bloomPassColor,
            this.parameters.bloomStrength ?? 3.0,
            this.parameters.bloomRadius ?? 1.0,
            this.parameters.bloomThreshold ?? 0.01
        );
        
        this.postProcessing = new PostProcessing(this.renderer);
        // Add bloom to the base scene color (not replace it!)
        this.postProcessing.outputNode = scenePassColor.add(this.bloomNode);
    }

    private createCRTScreen(): void {
        if (!this.scene || !this.renderer || !this.currentColors) {
            console.warn('Cannot create CRT screen: missing required components');
            return;
        }
        
        const screenWidth = this.logicalWidth;
        const screenHeight = this.logicalHeight;
        const screenPhysicalWidth = this.getScreenPhysicalWidth();
        const screenPhysicalHeight = this.getScreenPhysicalHeight();
        const totalColumns = screenWidth * 3;
        const totalSubpixels = screenWidth * screenHeight * 3;
        
        console.log('Creating CRT screen:', {
            screenWidth,
            screenHeight,
            totalInstances: totalSubpixels
        });
        
        const geom = new THREE.PlaneGeometry(screenPhysicalWidth, screenPhysicalHeight, 1, 1);
        
        const mat = new MeshStandardNodeMaterial({
            transparent: false
        });
        
        // Avoid disappearing quads from backface culling or depth fighting
        mat.side = THREE.DoubleSide;
        mat.depthWrite = false;
        mat.depthTest = true;  // Keep depth testing on
        
        // CRT uniforms
        this.crtBarrelUniform = uniform(this.parameters.crtBarrel ?? -0.07, 'float');
        this.crtKeystoneXUniform = uniform(this.parameters.crtKeystoneX ?? 0.0, 'float');
        this.crtKeystoneYUniform = uniform(this.parameters.crtKeystoneY ?? 0.0, 'float');
        this.crtZoomUniform = uniform(this.parameters.crtZoom ?? 0.97, 'float');
        this.brightnessUniform = uniform(this.parameters.brightness ?? 1.0, 'float');

        
        // Phosphor uniforms - these control the visual gap/black matrix
        this.slotDutyXUniform = uniform(this.parameters.slotDutyX ?? 0.65, 'float');  // horizontal fill
        this.slotDutyYUniform = uniform(this.parameters.slotDutyY ?? 0.85, 'float');  // vertical fill
        this.subpixelFeatherUniform = uniform(this.parameters.subpixelFeather ?? 0.08, 'float');  // anti-aliasing
        this.phosphorTintUniform = uniform(this.parameters.phosphorTint ?? 0.15, 'float');  // secondary brightness
        this.screenLightModeUniform = uniform(0.0, 'float');
        
        // Beam physics uniforms
        this.beamGammaUniform = uniform(this.parameters.beamGamma ?? 1.6, 'float');
        this.beamSpreadUniform = uniform(this.parameters.beamSpread ?? 1.3, 'float');
        this.vignetteStrengthUniform = uniform(this.parameters.vignetteStrength ?? 0.1, 'float');
        this.phaseShearAmountUniform = uniform(this.parameters.phaseShearAmount ?? 0.0, 'float');

        // Physical distortion effects
        this.hsyncJitterUniform = uniform(this.parameters.hsyncJitter ?? 0.0, 'float');
        this.hsyncSpeedUniform  = uniform(this.parameters.hsyncSpeed  ?? 6.0, 'float');
        this.chromaAmountUniform = uniform(this.parameters.chromaAmount ?? 0.0, 'float');
        this.rollSpeedUniform   = uniform(this.parameters.rollSpeed   ?? 0.0, 'float');
        this.burnInStrengthUniform = uniform(this.parameters.burnInStrength ?? 0.0, 'float');

        // Burn-in CPU buffer + DataTexture (RGBA float, 4 components per pixel)
        this.burnInBuffer = new Float32Array(screenWidth * screenHeight * 4);
        if (this.burnInTexture) this.burnInTexture.dispose();
        this.burnInTexture = new THREE.DataTexture(
            this.burnInBuffer, screenWidth, screenHeight,
            THREE.RGBAFormat, THREE.FloatType
        );
        this.burnInTexture.minFilter = THREE.LinearFilter;
        this.burnInTexture.magFilter = THREE.LinearFilter;
        this.burnInTexture.needsUpdate = true;
        
        mat.colorNode = vec4(0, 0, 0, 1);

        const totalColumnsU = uint(totalColumns);
        const totalColumnsF = float(totalColumns);
        const screenHeightF = float(screenHeight);

        mat.emissiveNode = Fn(() => {
            const uvNode = uv();
            const nx = uvNode.x.mul(float(2.0)).sub(float(1.0));
            const ny = uvNode.y.mul(float(2.0)).sub(float(1.0));

            const nxScreen = nx;
            const nyScreen = ny;
            const uvScreen = vec2(nxScreen.mul(0.5).add(0.5), nyScreen.mul(0.5).add(0.5));
            const edgeSoft = float(0.002);
            const insideX = smoothstep(float(0.0), edgeSoft, uvScreen.x)
                .mul(smoothstep(float(0.0), edgeSoft, float(1.0).sub(uvScreen.x)));
            const insideY = smoothstep(float(0.0), edgeSoft, uvScreen.y)
                .mul(smoothstep(float(0.0), edgeSoft, float(1.0).sub(uvScreen.y)));
            const inBounds = insideX.mul(insideY);

            const projR2 = nx.mul(nx).add(ny.mul(ny));
            const projR4 = projR2.mul(projR2);
            const k = this.crtBarrelUniform;
            const facRaw = float(1.0).add(k.mul(projR2)).add(k.mul(float(0.25)).mul(projR4));
            const fac = clamp(facRaw, 0.2, 5.0);
            let dx = nxScreen.mul(fac);
            let dy = nyScreen.mul(fac);
            dx = dx.add(this.crtKeystoneXUniform.mul(nyScreen));
            dy = dy.add(this.crtKeystoneYUniform.mul(nxScreen));
            const nxFinalRaw = dx.mul(this.crtZoomUniform);
            const nyFinalRaw = dy.mul(this.crtZoomUniform);

            const cornerR2 = float(2.0);
            const cornerR4 = cornerR2.mul(cornerR2);
            const cornerFacRaw = float(1.0).add(k.mul(cornerR2)).add(k.mul(float(0.25)).mul(cornerR4));
            const cornerFac = clamp(cornerFacRaw, 0.2, 5.0);

            const cornerAX = float(1.0);
            const cornerAY = float(1.0);
            const cornerBX = float(-1.0);
            const cornerBY = float(1.0);
            const cornerCX = float(1.0);
            const cornerCY = float(-1.0);
            const cornerDX = float(-1.0);
            const cornerDY = float(-1.0);

            const cornerDxA = cornerAX.mul(cornerFac).add(this.crtKeystoneXUniform.mul(cornerAY));
            const cornerDyA = cornerAY.mul(cornerFac).add(this.crtKeystoneYUniform.mul(cornerAX));
            const cornerNxA = cornerDxA.mul(this.crtZoomUniform);
            const cornerNyA = cornerDyA.mul(this.crtZoomUniform);
            const cornerMaxA = max(abs(cornerNxA), abs(cornerNyA));

            const cornerDxB = cornerBX.mul(cornerFac).add(this.crtKeystoneXUniform.mul(cornerBY));
            const cornerDyB = cornerBY.mul(cornerFac).add(this.crtKeystoneYUniform.mul(cornerBX));
            const cornerNxB = cornerDxB.mul(this.crtZoomUniform);
            const cornerNyB = cornerDyB.mul(this.crtZoomUniform);
            const cornerMaxB = max(abs(cornerNxB), abs(cornerNyB));

            const cornerDxC = cornerCX.mul(cornerFac).add(this.crtKeystoneXUniform.mul(cornerCY));
            const cornerDyC = cornerCY.mul(cornerFac).add(this.crtKeystoneYUniform.mul(cornerCX));
            const cornerNxC = cornerDxC.mul(this.crtZoomUniform);
            const cornerNyC = cornerDyC.mul(this.crtZoomUniform);
            const cornerMaxC = max(abs(cornerNxC), abs(cornerNyC));

            const cornerDxD = cornerDX.mul(cornerFac).add(this.crtKeystoneXUniform.mul(cornerDY));
            const cornerDyD = cornerDY.mul(cornerFac).add(this.crtKeystoneYUniform.mul(cornerDX));
            const cornerNxD = cornerDxD.mul(this.crtZoomUniform);
            const cornerNyD = cornerDyD.mul(this.crtZoomUniform);
            const cornerMaxD = max(abs(cornerNxD), abs(cornerNyD));

            const cornerMax = max(max(cornerMaxA, cornerMaxB), max(cornerMaxC, cornerMaxD));
            const normScale = float(1.0).div(max(float(1.0), cornerMax));
            const nxFinal = nxFinalRaw.mul(normScale);
            const nyFinal = nyFinalRaw.mul(normScale);
            const uvProjection = vec2(nxFinal.mul(0.5).add(0.5), nyFinal.mul(0.5).add(0.5));
            const projInsideX = smoothstep(float(0.0), edgeSoft, uvProjection.x)
                .mul(smoothstep(float(0.0), edgeSoft, float(1.0).sub(uvProjection.x)));
            const projInsideY = smoothstep(float(0.0), edgeSoft, uvProjection.y)
                .mul(smoothstep(float(0.0), edgeSoft, float(1.0).sub(uvProjection.y)));
            const inBoundsProjection = projInsideX.mul(projInsideY);

            const uvSample = vec2(uvProjection.x, float(1.0).sub(uvProjection.y));

            // B3: Horizontal roll — shift uvSample.y by time * rollSpeed / screenHeight
            const rollOffset = fract(this.timeUniform.mul(this.rollSpeedUniform).div(screenHeightF));
            const uvRolled = vec2(uvSample.x, fract(uvSample.y.add(rollOffset)));

            // B1: H-sync jitter — per-row horizontal displacement
            const rowIndex = floor(uvRolled.y.mul(screenHeightF));
            const jitterHash = hash(vec2(rowIndex, floor(this.timeUniform.mul(this.hsyncSpeedUniform))));
            const jitterOffset = jitterHash.sub(0.5).mul(2.0).mul(this.hsyncJitterUniform).div(totalColumnsF);
            const uvJittered = vec2(uvRolled.x.add(jitterOffset), uvRolled.y);

            // B2: Chromatic aberration — sample R, G, B at laterally offset UVs
            const chromaScale = this.chromaAmountUniform.div(totalColumnsF);
            const uvR = vec2(uvJittered.x.sub(chromaScale), uvJittered.y);
            const uvG = uvJittered;
            const uvB = vec2(uvJittered.x.add(chromaScale), uvJittered.y);

            // Helper: sample color buffer at given uv, returns vec3(r, g, b) intensities
            const sampleColors = Fn(([sUv]: any[]) => {
                const pc = sUv.mul(vec2(float(screenWidth), screenHeightF));
                const cx = clamp(pc.x, float(0.0), float(screenWidth - 1));
                const cy = clamp(pc.y, float(0.0), screenHeightF.sub(float(1.0)));
                const x0 = floor(cx);
                const y0 = floor(cy);
                const x1 = min(x0.add(float(1.0)), float(screenWidth - 1));
                const y1 = min(y0.add(float(1.0)), screenHeightF.sub(float(1.0)));
                const fx = cx.sub(x0);
                const fy = cy.sub(y0);
                const i00 = y0.toUint().mul(totalColumnsU).add(x0.toUint().mul(uint(3)));
                const i10 = y0.toUint().mul(totalColumnsU).add(x1.toUint().mul(uint(3)));
                const i01 = y1.toUint().mul(totalColumnsU).add(x0.toUint().mul(uint(3)));
                const i11 = y1.toUint().mul(totalColumnsU).add(x1.toUint().mul(uint(3)));
                const r = mix(
                    mix(this.currentColors.element(i00).r, this.currentColors.element(i10).r, fx),
                    mix(this.currentColors.element(i01).r, this.currentColors.element(i11).r, fx),
                    fy
                );
                const g = mix(
                    mix(this.currentColors.element(i00.add(uint(1))).r, this.currentColors.element(i10.add(uint(1))).r, fx),
                    mix(this.currentColors.element(i01.add(uint(1))).r, this.currentColors.element(i11.add(uint(1))).r, fx),
                    fy
                );
                const b = mix(
                    mix(this.currentColors.element(i00.add(uint(2))).r, this.currentColors.element(i10.add(uint(2))).r, fx),
                    mix(this.currentColors.element(i01.add(uint(2))).r, this.currentColors.element(i11.add(uint(2))).r, fx),
                    fy
                );
                return vec3(r, g, b);
            });

            const rgbR = sampleColors(uvR);
            const rgbG = sampleColors(uvG);
            const rgbB = sampleColors(uvB);
            const redIntensity = rgbR.x;
            const greenIntensity = rgbG.y;
            const blueIntensity = rgbB.z;

            const subpixelCoord = uvProjection.mul(vec2(totalColumnsF, screenHeightF));
            const safeR2 = max(nxFinal.mul(nxFinal).add(nyFinal.mul(nyFinal)), float(0.000001));
            const invLen = inverseSqrt(safeR2);
            const dirPre = vec2(nxFinal, nyFinal).mul(invLen);
            const phaseShear = this.phaseShearAmountUniform.mul(sqrt(projR2)).mul(dirPre.x);
            const subpixelCoordSheared = vec2(subpixelCoord.x.add(phaseShear), subpixelCoord.y);

            const subpixelIndexX = floor(subpixelCoordSheared.x);
            const subpixelIndexY = floor(subpixelCoordSheared.y);
            const clampedX = clamp(subpixelIndexX, float(0.0), totalColumnsF.sub(float(1.0)));
            const clampedY = clamp(subpixelIndexY, float(0.0), screenHeightF.sub(float(1.0)));
            const columnIdx = clampedX.toUint();
            const subpixelIdx = columnIdx.modInt(uint(3));
            const isRed = subpixelIdx.equal(uint(0));
            const isGreen = subpixelIdx.equal(uint(1));
            const isBlue = subpixelIdx.equal(uint(2));
            const beamCoord = uvProjection.mul(vec2(totalColumnsF, screenHeightF));
            const beamLocal = fract(beamCoord).sub(vec2(0.5, 0.5));
            const beamDist = sqrt(dot(beamLocal, beamLocal));
            const beamRadius = float(0.35).add(this.subpixelFeatherUniform.mul(float(2.5)));
            const beamWeight = smoothstep(beamRadius, float(0.0), beamDist);

            const channelIntensity = select(
                isRed,
                redIntensity,
                select(isGreen, greenIntensity, blueIntensity)
            ).mul(inBoundsProjection);
            const intensity = channelIntensity.mul(beamWeight);
            const tint = vec3(
                select(isRed, float(1.0), this.phosphorTintUniform),
                select(isGreen, float(1.0), this.phosphorTintUniform),
                select(isBlue, float(1.0), this.phosphorTintUniform)
            );

            const uvLocal = fract(subpixelCoordSheared).sub(vec2(0.5, 0.5));

            const subpixelColor = tint.mul(intensity);
            const tintedColor = subpixelColor;

            const slotDutyX = this.slotDutyXUniform;
            const slotDutyY = this.slotDutyYUniform;
            const feather = this.subpixelFeatherUniform;
            const halfSizeX = slotDutyX.mul(0.5);
            const halfSizeY = slotDutyY.mul(0.5);
            const distX = halfSizeX.sub(abs(uvLocal.x));
            const distY = halfSizeY.sub(abs(uvLocal.y));
            const maskX = smoothstep(float(0.0), feather, distX);
            const maskY = smoothstep(float(0.0), feather, distY);
            const cover = maskX.mul(maskY);

            const p = vec2(nxFinal, nyFinal);
            const rho2 = p.x.mul(p.x).add(p.y.mul(p.y));
            const cosTheta = inverseSqrt(float(1.0).add(this.beamSpreadUniform.mul(rho2)));
            const gain = pow(cosTheta, this.beamGammaUniform);

            const vignetteAmount = float(1.0).sub(this.vignetteStrengthUniform);
            const vignette = mix(float(1.0), vignetteAmount, rho2);

            const lightPass = this.screenLightModeUniform;
            const baseColor = tintedColor.mul(cover);
            const triadColor = vec3(redIntensity, greenIntensity, blueIntensity).mul(inBoundsProjection).mul(beamWeight);
            const finalColor = mix(baseColor, triadColor, lightPass);

            // B4: Burn-in — blend in ghost image from DataTexture
            const burnInColor = texture(this.burnInTexture!, uvJittered).rgb;
            const withBurnIn = mix(finalColor, burnInColor, this.burnInStrengthUniform);
            return withBurnIn.mul(gain).mul(vignette).mul(this.brightnessUniform).mul(inBounds);
        })();

        mat.opacityNode = float(1.0);

        const mesh = new THREE.Mesh(geom, mat);
        mesh.frustumCulled = false;
        
        // Cleanup old visualization
        if (this.screenMesh) {
            this.scene.remove(this.screenMesh);
            if (this.screenMesh.geometry) this.screenMesh.geometry.dispose();
            if (this.screenMesh.material) {
                (this.screenMesh.material as THREE.Material).dispose();
            }
        }
        
        this.screenMesh = mesh;
        this.screenMesh.layers.set(CRTScreenScene.BLOOM_LAYER);
        this.screenMesh.position.set(0, 0, 0);
        this.scene.add(this.screenMesh);
        
        console.log('CRT screen created with', totalSubpixels, 'subpixel samples');
    }
    
    // Stub for updating GPU target colors when content changes
    private updateGPUTargetColors(): void {
        if (this.targetColors && this.targetColorArray) {
            const storageAttribute = this.targetColors.value;
            if (storageAttribute && storageAttribute.array) {
                storageAttribute.array.set(this.targetColorArray);
                storageAttribute.needsUpdate = true;
            }
        }
    }
}
