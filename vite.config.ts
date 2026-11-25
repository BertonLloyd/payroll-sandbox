import { defineConfig } from '@lark-apaas/coding-preset-vite-react';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@shared': path.resolve(__dirname, 'shared'),
    },
  },
  server: {
    port: 8001,
    host: '0.0.0.0',
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
});
