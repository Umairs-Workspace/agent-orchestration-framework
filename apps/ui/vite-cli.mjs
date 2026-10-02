// Optional development tooling belongs to the UI workspace. Core asks this public
// entry lazily, so CLI startup and packaged UI serving need no Vite installation.
import { createRequire } from 'node:module';
import path from 'node:path';

export function viteCliPath() {
  const require = createRequire(import.meta.url);
  return path.join(path.dirname(require.resolve('vite/package.json')), 'bin/vite.js');
}
