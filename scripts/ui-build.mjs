import { runYarn } from './yarn.mjs';
// Resolve build tools from their owning workspace, independent of hoisting.
process.exit(runYarn(['workspace', '@aof/ui', 'build']));
