// 妙搭裸目录发布专用构建：相对路径自包含产物，不依赖妙搭 preset 与平台占位符
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  base: './',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@shared': path.resolve(__dirname, 'shared'),
    },
  },
  build: {
    outDir: 'dist/miaoda',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('recharts') || id.includes('/d3-')) {
            return 'charts';
          }
          if (id.includes('xlsx')) return 'xlsx';
          if (
            id.includes('/react') ||
            id.includes('react-router') ||
            id.includes('/scheduler')
          ) {
            return 'react';
          }
          return 'vendor';
        },
      },
    },
  },
});
