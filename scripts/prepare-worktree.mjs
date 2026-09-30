// Install all workspaces into this script's own tree: root tests also bundle UI components.
// Only Yarn's cache is shared. No shell shims or links to another checkout are created.
import { runYarn, repoRoot } from './yarn.mjs';
console.log('prepare-worktree: yarn install --immutable in ' + repoRoot);
// Skip lifecycle execution even for reviewed exceptions during ordinary preparation.
// Release Linux native compilation is an explicit `yarn rebuild node-pty` step.
process.exit(runYarn(['install', '--immutable', '--mode=skip-build']));
