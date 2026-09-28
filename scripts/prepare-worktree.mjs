// Install all workspaces into this script's own tree: root tests also bundle UI components.
// Only Yarn's cache is shared. No shell shims or links to another checkout are created.
import { runYarn, repoRoot } from './yarn.mjs';
console.log('prepare-worktree: yarn install --immutable in ' + repoRoot);
process.exit(runYarn(['install', '--immutable']));
