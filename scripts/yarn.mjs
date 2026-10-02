// A checked-in JS executable avoids global installs and Windows .cmd shell shims.
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export const yarnPath = fileURLToPath(new URL('../.yarn/releases/yarn-4.18.1.cjs', import.meta.url));
export const repoRoot = fileURLToPath(new URL('../', import.meta.url));

export function runYarn(args, cwd = repoRoot) {
  const result = spawnSync(process.execPath, [yarnPath, ...args], { cwd, stdio: 'inherit', shell: false });
  if (result.error) console.error(`Yarn failed to start: ${result.error.message}`);
  return result.status ?? 1;
}
