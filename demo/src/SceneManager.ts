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
