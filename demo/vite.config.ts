import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  root: '.',
  resolve: {
    alias: {
      './BioluminescenceSceneParameters': path.resolve(
        __dirname, 'src/stubs/BioluminescenceSceneParameters'
      ),
      './PlanetSceneParameters': path.resolve(
        __dirname, 'src/stubs/PlanetSceneParameters'
      ),
      '../oneill-cylinder/constants': path.resolve(
        __dirname, 'src/stubs/oneill-cylinder/constants'
      ),
    },
  },
  worker: {
    format: 'es',
  },
});
