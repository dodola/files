import type { Pane } from 'tweakpane';

export interface IScene {
  mount(canvas: HTMLCanvasElement): Promise<void>;
  dispose(): void;
  buildPane(pane: Pane): void;
  onResize(width: number, height: number): void;
}
