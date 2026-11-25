// 生成 SPA 深链回退：复制 index.html 为 404.html
import fs from 'node:fs';
import path from 'node:path';

const dir = path.resolve('dist/ghpages');
fs.copyFileSync(path.join(dir, 'index.html'), path.join(dir, '404.html'));
console.log('SPA 404 fallback generated at', dir);
