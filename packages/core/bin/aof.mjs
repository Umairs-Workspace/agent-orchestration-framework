#!/usr/bin/env node
// Node's module compile cache (160/ADR-004 §1) is turned on FIRST, and the CLI is reached through a
// dynamic import after it: the cache only covers modules loaded after the call, and a static import
// would be hoisted above it. Optional, because a runtime older than Node 22.1 has no such function.
import module from "node:module";
import { existsSync } from "node:fs";
import { pathToFileURL } from "node:url";

module.enableCompileCache?.();

// A test's child aof (160/ADR-008 §3): the sharded test run builds the CLI into one bundle and names it in
// AOF_TEST_CLI_BUNDLE, and a child that finds that file loads it instead of the source's modules. Nothing
// else sets it, so every other start loads the source.
const testBundle = process.env.AOF_TEST_CLI_BUNDLE;
const { run } = testBundle && existsSync(testBundle) ? await import(pathToFileURL(testBundle).href) : await import("../src/cli.mjs");

run(process.argv.slice(2)).catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
