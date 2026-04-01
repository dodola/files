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
      this.ctx!.fillStyle = col;
      const sx = (path[0] + 0.5) * cellW;
      const sz = (path[2] + 0.5) * cellH;
      this.ctx!.beginPath();
      this.ctx!.arc(sx, sz, 4, 0, Math.PI * 2);
      this.ctx!.fill();
    });

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
