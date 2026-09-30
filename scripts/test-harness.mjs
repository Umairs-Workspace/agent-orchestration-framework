export async function runCases(tests) {
  let failures = 0;
  // Per-test hermetic global AOF home (34/story 00) — see scripts/test-unit.mjs for the
  // rationale: the node identity is machine-wide now, so each test gets its OWN empty
  // global home to stop identity/global-store state leaking across tests (or onto the real
  // machine). The integration lane below keeps process.env untouched afterward.
  //
  // Rooted under ~/.aof-test (never ~/.aof, the real machine's global home) — a fixed,
  // dedicated, gitignored test root, not raw OS tmpdir, so stray test fixtures are
  // trivially auditable/wipeable in one place instead of scattered across the OS temp dir.
  const { homedir } = await import("node:os");
  const { join } = await import("node:path");
  const { rmSync } = await import("node:fs");
  const ghRoot = join(homedir(), ".aof-test", `gh-${process.pid}`);
  let ghIndex = 0;

  console.log("# unit");
  for (const { name, run } of tests) {
    const prevHome = process.env.AOF_GLOBAL_HOME;
    process.env.AOF_GLOBAL_HOME = join(ghRoot, `t-${ghIndex++}`);
    try {
      await run();
      console.log(`ok - ${name}`);
    } catch (error) {
      failures += 1;
      console.error(`not ok - ${name}`);
      console.error(error.stack ?? error.message);
    } finally {
      if (prevHome === undefined) delete process.env.AOF_GLOBAL_HOME;
      else process.env.AOF_GLOBAL_HOME = prevHome;
    }
  }
  try { rmSync(ghRoot, { recursive: true, force: true }); } catch { /* best-effort cleanup */ }

  console.log(`# executed ${tests.length} cases; failures ${failures}`);
  return failures;
}
