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
