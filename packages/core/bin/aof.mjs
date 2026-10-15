#!/usr/bin/env node
// Node's module compile cache (160/ADR-004 §1) is turned on FIRST, and the CLI is reached through a
// dynamic import after it: the cache only covers modules loaded after the call, and a static import
// would be hoisted above it. Optional, because a runtime older than Node 22.1 has no such function.
import module from "node:module";

module.enableCompileCache?.();

const { run } = await import("../src/cli.mjs");

run(process.argv.slice(2)).catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
