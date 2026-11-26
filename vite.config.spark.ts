// 妙搭 spark.json 托管模式构建：产出 dist/output（同源 HTML）+ dist/output_resource（CDN 资源）
import fs from 'node:fs';
import path from 'node:path';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// 构建期由部署链路注入；本地直接构建缺省回退
const basePath = process.env.MIAODA_CLIENT_BASE_PATH || '/';
const cdnPrefix = process.env.MIAODA_RESOURCE_CDN_PREFIX;

function miaodaOutputPlugin(): Plugin {
  return {
    name: 'miaoda-output',
    apply: 'build',
    closeBundle() {
      const dist = path.resolve(__dirname, 'dist');
      const client = path.join(dist, 'client');
      const output = path.join(dist, 'output');
      const outputResource = path.join(dist, 'output_resource');

      fs.rmSync(output, { recursive: true, force: true });
      fs.rmSync(outputResource, { recursive: true, force: true });
      fs.mkdirSync(output, { recursive: true });

      // assets 之外的产物（index.html + public 平铺资源）→ 同源 output
      for (const entry of fs.readdirSync(client)) {
        if (entry === 'assets') continue;
        fs.cpSync(path.join(client, entry), path.join(output, entry), {
          recursive: true,
        });
      }

      // assets → CDN 桶
      const assets = path.join(client, 'assets');
      if (fs.existsSync(assets)) {
        fs.cpSync(assets, path.join(outputResource, 'assets'), {
          recursive: true,
        });
      }

      // routes.json：扫描 src 内 <Route path> 生成路由枚举，SPA 各路由均由 index.html 服务
      const routes = collectRoutePaths(path.resolve(__dirname, 'src')).map(
        (p) => ({ path: p, file: 'index.html' }),
      );
      fs.writeFileSync(
        path.join(output, 'routes.json'),
        JSON.stringify(routes, null, 2) + '\n',
      );

      // 清理中间产物
      fs.rmSync(client, { recursive: true, force: true });
    },
  };
}

function collectRoutePaths(srcDir: string): string[] {
  const paths = new Set<string>(['/']);
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(p);
      } else if (/\.(tsx|jsx|ts|js)$/.test(entry.name)) {
        const code = fs.readFileSync(p, 'utf-8');
        for (const m of code.matchAll(
          /<Route[^>]*\bpath=["']([^"']+)["']/g,
        )) {
          const route = m[1];
          if (route.includes('*')) continue;
          paths.add(route.startsWith('/') ? route : `/${route}`);
        }
      }
    }
  };
  walk(srcDir);
  return [...paths];
}

export default defineConfig({
  plugins: [react(), tailwindcss(), miaodaOutputPlugin()],
  base: cdnPrefix || basePath,
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@shared': path.resolve(__dirname, 'shared'),
    },
  },
  build: {
    outDir: 'dist/client',
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
