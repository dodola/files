import { SceneManager } from './SceneManager';
import { CRTSceneAdapter } from './adapters/CRTSceneAdapter';

const canvas = document.getElementById('canvas') as HTMLCanvasElement;

const manager = new SceneManager(canvas);
manager.register('crt', () => new CRTSceneAdapter());

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

manager.switchTo('crt');
