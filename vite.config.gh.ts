// GitHub Pages 专用构建：标准 Vite + 代码分割，不依赖妙搭 preset
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  base: '/payroll-sandbox/',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@shared': path.resolve(__dirname, 'shared'),
    },
  },
  build: {
    outDir: 'dist/ghpages',
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
