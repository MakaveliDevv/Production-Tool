import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import path from 'path';

export default defineConfig({
  root: 'src',
  base: './',
  plugins: [ vue() ],
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    rollupOptions: {
      input: path.resolve(__dirname, 'src/index.html')
    }
  }
});
