import { defaultApplication as _aofApplication } from "aof/default-application";
// Fitness function FF-12607 (milestone 126 / ADR-007) — "Autostart is ONE injected
// runner, idempotent, and never a silent no-op off Windows."
//
// The BEHAVIOUR — what the runner's answer decides, what each prior state of the key
// ends as, what each preflight condition reports — is driven over fakes in
// `test/mesh/desktop/`. This control asserts the STRUCTURAL half a passing test cannot
// see: that there is no second, un-injectable path to the registry, that the platform is
// an input rather than a read, that the act is a FLAG and not a fifth command, and that
// the `claude` probe parses `loggedIn` rather than trusting an exit code that is 0 either
// way.
//
// WHY THE INJECTION LEG IS AN ABSENCE AND NOT A CALL COUNT. A direct `spawnSync("reg", …)`
// added "for the real path" beside the injected one would leave every behavioural test
// green — the fake would still be called by the tested path — while CI, and an operator's
// machine, reached the real hive. Only a sweep sees it.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { stripComments, functionBody } from "../../support/source-slice.mjs";
const listCommands = _aofApplication.listCommands;
const getCommand = _aofApplication.getCommand;

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const DESKTOP_MODULE = path.join(repoRoot, "packages", "mesh", "src", "commands", "desktop.mjs");
// 126/06's post-hoc review moved the preflight out of the command module into its own.
// This control follows it: the sweeps below run over BOTH files, which is strictly wider
// than what they swept before and is what makes the preflight's "writes nothing" claim a
// statement about a whole file rather than about a hand-maintained list of headers.
const PREFLIGHT_MODULE = path.join(repoRoot, "packages", "mesh", "src", "commands", "desktop-preflight.mjs");
// 175/02 moved the names into the layout module (175/ADR-002 §5) and the plist render into its
// own pure module (175/ADR-004 §1). FF-17503 below widens this control over both.
const LAYOUT_MODULE = path.join(repoRoot, "packages", "mesh", "src", "commands", "desktop-layout.mjs");
const LAUNCH_AGENT_MODULE = path.join(repoRoot, "packages", "mesh", "src", "commands", "desktop-launch-agent.mjs");

// The child-process APIs that cannot be injected — a call site using one of these is
// unreachable from a test, whatever the module's seams say.
const UNINJECTABLE = ["spawnSync", "execFile", "execFileSync", "execSync"];

// A hard kill in any spelling: `-KILL`, `-9` or SIGKILL.
const killsHard = (code) => /["']-(?:KILL|9)["']|SIGKILL/.test(code);

async function desktopSource() {
  return stripComments(await readFile(DESKTOP_MODULE, "utf8"));
}

async function preflightSource() {
  return stripComments(await readFile(PREFLIGHT_MODULE, "utf8"));
}

export const archTests = [
  {
    name: "arch/126 FF-12607: every registry path goes through the ONE injected runner — no un-injectable child-process call exists in the module at all, and `reg` is only ever an argument to that runner",
    run: async () => {
      const source = await desktopSource();
      const preflight = await preflightSource();
      assert.ok(source.length > 0, "the desktop module was read (non-vacuous)");
      assert.ok(preflight.length > 0, "and so was the preflight module it was split into (non-vacuous)");

      for (const [where, text] of [["desktop.mjs", source], ["desktop-preflight.mjs", preflight]]) {
        for (const api of UNINJECTABLE) {
          assert.doesNotMatch(
            text,
            new RegExp(`\\b${api}\\s*\\(`),
            `${where} contains no ${api} — an un-injectable call site is unreachable from a test`,
          );
        }
      }

      // The ONE direct `spawn(` across BOTH modules is `defaultRunner`'s, which now lives
      // in the preflight module because that is the module whose every read must be
      // injectable end to end; `desktop.mjs` imports it rather than keeping a second copy,
      // and its detached launch reaches `spawn` only as an injected `spawnFn` default.
      // Neither carries `reg`.
      const directSpawns = [...source.matchAll(/(?<![.\w])spawn\s*\(/g), ...preflight.matchAll(/(?<![.\w])spawn\s*\(/g)];
      assert.equal(directSpawns.length, 1, `exactly one direct spawn( call site across both modules, found ${directSpawns.length}`);
      const runnerBody = functionBody(preflight, "function defaultRunner");
      assert.ok(runnerBody != null, "and it is defaultRunner's — the region was found");
      assert.match(runnerBody, /spawn\(file, args/, "defaultRunner spawns whatever file it is handed");
      assert.doesNotMatch(runnerBody, /["']reg["']/, "and names no verb of its own");

      // Every `reg` literal is an ARGUMENT to the injected runner. The literal is expected
      // in this module; an un-injectable call site is not.
      const regUses = [...source.matchAll(/["']reg["']/g)];
      assert.ok(regUses.length > 0, "the module does name `reg` (non-vacuous)");
      const applyBody = functionBody(source, "async function applyAutostart");
      assert.ok(applyBody != null, "the autostart act's region was found");
      assert.match(applyBody, /await run\("reg", argv\)/, "the write and the delete each call that one runner");
      assert.equal(
        [...applyBody.matchAll(/["']reg["']/g)].length,
        regUses.length,
        "and every `reg` literal in the module is inside it",
      );

      // Both invocations carry `/f`: without it `reg add` PROMPTS on an existing value and
      // `reg delete` asks to confirm — neither is an error a fake runner can show, and both
      // hang a CLI that has no console to answer them.
      const argvBuild = applyBody.slice(applyBody.indexOf("const argv"));
      const branches = [...argvBuild.matchAll(/\[[^\]]*\]/g)].map((m) => m[0]);
      assert.equal(branches.length, 2, "one argv for the write and one for the delete");
      for (const branch of branches) {
        assert.match(branch, /"\/f"/, `a non-interactive invocation: ${branch}`);
      }
    },
  },
  {
    name: "arch/126 FF-12607: self-check — a planted `spawnSync(\"reg\", …)` beside the injected path is caught by the SAME sweep, and the shipped module is quiet in the same lane (non-vacuous)",
    run: async () => {
      const planted = 'const out = spawnSync("reg", ["add", KEY, "/v", NAME, "/f"]);\n';
      const caught = UNINJECTABLE.filter((api) => new RegExp(`\\b${api}\\s*\\(`).test(planted));
      assert.deepEqual(caught, ["spawnSync"], "a planted direct call is reported as an offender");

      const both = `${await desktopSource()}\n${await preflightSource()}`;
      const shipped = UNINJECTABLE.filter((api) => new RegExp(`\\b${api}\\s*\\(`).test(both));
      assert.deepEqual(shipped, [], "and the shipped modules are quiet in the same lane");
    },
  },
  {
    name: "arch/126 FF-12607: the platform is an INPUT at the act, never a read inside it — so both branches run on any host — and autostart is a FLAG on install, not a fifth command",
    run: async () => {
      const source = await desktopSource();

      // The admission takes the platform as an argument, and the act resolves it the way
      // `stopDesktopApp` does — `ctx.platform ?? process.platform`, at the boundary.
      const admit = functionBody(source, "function admitAutostartPlatform");
      assert.ok(admit != null, "the admission's region was found");
      assert.doesNotMatch(admit, /process\.platform/, "no `process.platform` is read inside the act itself");
      assert.match(admit, /platform === "win32" \|\| platform === "darwin"/, "admission is exact — win32 and darwin (175/ADR-004 §3) — and never case-folded");

      const applyBody = functionBody(source, "async function applyAutostart");
      assert.doesNotMatch(applyBody, /process\.platform/, "nor inside the act it guards");
      assert.match(applyBody, /admitAutostartPlatform\(options\.platform\)/, "the act is handed the platform it was given");

      // A FLAG on the existing verb, not a fifth door.
      const ids = listCommands().map((command) => command.id).filter((id) => id.startsWith("mesh:desktop")).sort();
      assert.deepEqual(ids, ["mesh:desktop-install", "mesh:desktop-run", "mesh:desktop-stop"], "no fifth mesh:desktop-* command");

      const install = getCommand("mesh:desktop-install");
      for (const flag of ["autostart", "noAutostart", "dryRun"]) {
        assert.equal(install.cli.spec.flags[flag]?.type, "boolean", `\`${flag}\` is a DECLARED boolean — the face has no \`--no-\` negation`);
      }
      // Every flag the verb spells is one it declares — the bijection gate's own rule,
      // asserted here because two of these are new.
      assert.match(install.cli.spec.usage, /--autostart\|--no-autostart/, "the usage names the pair as a pair");
      assert.match(install.cli.spec.usage, /--dry-run/, "and names the probe flag");
    },
  },
  {
    name: "arch/126 FF-12607: the value NAME is spelled once, the written data is an absolute path, and `--dry-run` covers the whole verb — no placement AND no registry write",
    run: async () => {
      const source = await desktopSource();

      // ONE spelling of the name, so a write and a removal cannot disagree about which
      // value this verb owns (ADR-007 amendment §3).
      //
      // The claim is scoped to the ACT, not the file: `desktopProcessName` spells the same
      // string as the non-Windows PROCESS name (`:desktopProcessName`), which is a
      // different subject that happens to share a value. Counting file-wide would make
      // this control assert a coincidence — so what is asserted is that the act references
      // the exported constant and never re-spells the literal.
      const applyBody = functionBody(source, "async function applyAutostart");
      assert.notEqual(applyBody, null, "the act's region was found");

      const layout = stripComments(await readFile(LAYOUT_MODULE, "utf8"));
      assert.match(layout, /export const AUTOSTART_VALUE_NAME = "aof-mesh-desktop"/, "the value name is an exported constant, in the layout module (175/ADR-002 §5)");
      assert.doesNotMatch(applyBody, /"aof-mesh-desktop"/, "the act never re-spells the name as a literal");
      assert.ok(
        [...applyBody.matchAll(/AUTOSTART_VALUE_NAME/g)].length >= 2,
        "the write and the removal both reach it through the one constant",
      );

      // The data is a path JOIN of the resolved install dir and the exe — never the bare
      // name, which would be a PATH search at login.
      assert.match(applyBody, /path\.join\(installDir, DESKTOP_APP_EXE\)/, "the value's data is the absolute co-located path");

      // `--dry-run` returns before the placement AND before the registry act, so a probe
      // never performs the act it names.
      const installBody = functionBody(source, "async function installDesktopApp");
      assert.ok(installBody != null, "the install's region was found");
      const dryRunAt = installBody.indexOf("options.dryRun === true");
      const stageAt = installBody.indexOf("mkdtemp(");
      const writableAt = installBody.indexOf("await checkWritable(");
      assert.ok(dryRunAt > 0, "the install honours --dry-run");
      assert.ok(dryRunAt < stageAt, "returning before anything is staged");
      assert.ok(dryRunAt < writableAt, "and before the writability probe, which mkdirs the install dir into existence");
      // …but AFTER the artifact refusals: a dry run that cannot name what it would install
      // has nothing to report.
      assert.ok(installBody.indexOf("app-artifact-missing") < dryRunAt, "and after the artifact refusals, which --dry-run does not weaken");
      assert.match(applyBody, /if \(options\.dryRun === true\)[\s\S]{0,120}return/, "and the registry act returns before it reaches the runner");
    },
  },
  {
    name: "arch/126 FF-12607: the preflight names its checks by code in ONE place, parses `loggedIn` rather than an exit code that is 0 either way, and writes nothing on any path",
    run: async () => {
      const source = await preflightSource();

      assert.match(
        source,
        // 126/06 appended a FOURTH code and superseded 126/04 task03's count of three. The
        // literal is matched loosely on whitespace because the frozen list is now spread
        // over several lines; what is pinned is the ORDER and that there is ONE such site.
        /PREFLIGHT_CHECKS = Object\.freeze\(\[\s*"claude-authenticated",\s*"payload-build",\s*"workspace-identity-pinned",\s*"heartbeat-hook-installed",?\s*\]\)/,
        "the four checks are named by code, in one order, in one place",
      );

      // THE TRAP: `claude auth status` exits 0 whether or not the account is logged in, so
      // the exit code is not the signal. `loggedIn` is.
      const claudeBody = functionBody(source, "async function checkClaudeAuthenticated");
      assert.ok(claudeBody != null, "the claude check's region was found");
      assert.match(claudeBody, /parsed\?\.loggedIn === true/, "the auth verdict is `loggedIn`, parsed from stdout");
      assert.match(claudeBody, /JSON\.parse\(String\(answer\?\.stdout/, "and it is parsed from STDOUT, which is where it is printed");
      assert.doesNotMatch(claudeBody, /"-p"|'-p'/, "the probe never spends a token — no `claude -p` session");

      // THE THREE READS IT MUST NOT MAKE, each a false green or a write.
      //
      // THE REGION IS THE WHOLE MODULE. It used to be a hand-kept list of five function
      // headers cut out of `desktop.mjs`, and 126/06's post-hoc review found the exact
      // failure that shape invites: 126/06 added four more functions to the preflight and
      // did not add them to the list, so a quarter of the preflight was outside the sweep
      // and this row's claim was silently false about it. A list that has to be maintained
      // alongside the code it describes will fall behind the code; a file will not.
      const preflightRegion = source;
      assert.ok(preflightRegion.length > 0, "the preflight module was read (non-vacuous)");
      assert.doesNotMatch(
        await desktopSource(),
        /PREFLIGHT_CHECKS|async function check[A-Z]/,
        "and no check has grown back inside the command module, which would put it outside this sweep again",
      );

      for (const [what, forbidden] of [
        ["resolveWorkspaceId — it answers an id for an UNPINNED workspace, so every one would read as pinned", /resolveWorkspaceId/],
        ["loadWorkspace — it merges the machine-wide mesh config over the workspace's own, and carries a load-time identity WRITE", /loadWorkspace/],
        ["deriveNodeId — this node's id is READ, never minted", /deriveNodeId/],
      ]) {
        assert.doesNotMatch(preflightRegion, forbidden, `the preflight does not reach for ${what}`);
      }
      assert.match(preflightRegion, /readSidecar\(globalMeshPaths/, "this node's id is read from the GLOBAL identity path");
      assert.match(preflightRegion, /workspacePaths\(projectRoot\)/, "and a workspace's own config is read by its project root, with no walk up");

      // It REPAIRS nothing: no write API is reachable from the preflight module at all.
      for (const writer of ["writeFile", "mkdir", "rename", "copyFile", "writeText", "writeSidecarPatch", "persistNodeId"]) {
        assert.doesNotMatch(preflightRegion, new RegExp(`\\b${writer}\\s*\\(`), `the preflight never calls ${writer}`);
      }

      // NOTHING IS RE-SPELLED THAT HAS A HOME (ADR-008 §1, and 126/06's own violation of
      // it three times over). The settings path, the ownership marker and the hook's own
      // declaration are imported from `packages/core/src/claude-settings.mjs`, not written out again —
      // a rename of `FROZEN_OWNERSHIP_MARKER` used to break this check in silence, and the
      // hook FILE used to be a constant here rather than read from the registration found.
      const composition = stripComments(await readFile(path.join(repoRoot, "packages/core/src/application/bindings/commands/mesh/desktop-preflight.mjs"), "utf8"));
      assert.match(
        composition,
        /import \{[^}]*AOF_HOOK_MARKER[^}]*CLAUDE_SETTINGS_RELPATH[^}]*claudeHookDeclarations[^}]*claudeSettingsPath[^}]*\} from "(?:\.\.\/)+claude-settings\.mjs"/,
        "the four facts with one home are imported from it",
      );
      for (const binding of ["AOF_HOOK_MARKER", "CLAUDE_SETTINGS_RELPATH", "claudeHookDeclarations", "claudeSettingsPath"]) {
        const port = new RegExp('createMeshDesktopPreflightCommands\\(\\{[^}]*\\b' + binding + '\\b');
        assert.match(preflightRegion, port, "the package accepts the shared fact");
        assert.match(composition, port, "core supplies the shared fact");
      }
      assert.doesNotMatch(preflightRegion, /"aofManaged"|\.aofManaged\b/, "the ownership marker is never re-spelled as a literal or a property");
      assert.doesNotMatch(preflightRegion, /settings\.json/, "nor is the settings path, which arrives as CLAUDE_SETTINGS_RELPATH");
      assert.doesNotMatch(preflightRegion, /run-heartbeat-enqueue/, "nor the hook file, which is read from the registration the check found");
      assert.doesNotMatch(preflightRegion, /"PostToolUse"/, "nor the event, which is read from the hook's own bundle declaration");

      // THE NODE'S WORKSPACES ARE RESOLVED ONCE. 126/06 called `resolveNodeWorkspaces`
      // twice per preflight — 334 rows enumerated twice, the store opened, mkdir'd and
      // migrated twice — on a verb whose row above says it writes nothing on any path.
      assert.equal(
        [...preflightRegion.matchAll(/workspacesFn\(/g)].length,
        1,
        "one enumeration site, whose answer both checks that need it are handed",
      );

      // EVERY SEAM THE PREFLIGHT READS IS FORWARDED BY BOTH VERBS, by construction. 126/06
      // added two seams and forwarded neither, so on the only path an operator or the
      // bijection gate takes, both reads hit the real filesystem while two suites passed
      // those keys believing they injected. The list and the reads are asserted equal.
      const declared = [...(/PREFLIGHT_SEAMS = Object\.freeze\(\[([\s\S]*?)\]\)/.exec(preflightRegion)?.[1] ?? "")
        .matchAll(/"([A-Za-z][A-Za-z0-9]*)"/g)].map((match) => match[1]);
      const read = [...new Set([...preflightRegion.matchAll(/options\.([A-Za-z][A-Za-z0-9]*)/g)].map((match) => match[1]))];
      assert.ok(declared.length >= 8, `PREFLIGHT_SEAMS was found and is non-empty (${declared.length})`);
      assert.deepEqual(
        [...read].sort(),
        [...declared].sort(),
        "the seams runPreflight reads and the list both faces forward are the SAME set",
      );

      const face = await desktopSource();
      assert.equal(
        // 175/03: each verb overrides exactly one key, the install dir it resolved, so
        // `--install-dir` reaches the bundle the darwin checks probe; every other seam is ctx's.
        [...face.matchAll(/runPreflight\(preflightSeams\(\{ \.\.\.ctx, installDir: [^,{}]+ \}\)\)/g)].length,
        2,
        "and both verbs forward that one list rather than spelling ctx keys of their own",
      );

      // IT FAILS CLOSED AT THE VERB, not one call wide. `126/06` wrapped exactly one call,
      // so a throw from anywhere else escaped into the face — and on `mesh:desktop-run`
      // that lands AFTER the app has been spawned detached.
      const runBody = functionBody(preflightRegion, "async function runPreflight");
      assert.ok(runBody != null, "runPreflight's region was found");
      const guardedCalls = [...runBody.matchAll(/await guarded\("([a-z-]+)"/g)].map((match) => match[1]);
      assert.deepEqual(
        guardedCalls,
        ["claude-authenticated", "payload-build", "workspace-identity-pinned", "heartbeat-hook-installed"],
        "every check runs inside the guard, in PREFLIGHT_CHECKS' order",
      );
    },
  },
  // ── 175/ADR-004 §4 — this control WIDENED over the darwin checks. They are their own frozen
  // list (so the four above, and Windows' answer, are untouched), each runs inside the guard,
  // and the daemons' `claude` is asked through the SAME `loggedIn` parse as the terminal's, in
  // an env of exactly the plist's PATH and HOME.
  {
    name: "arch/175 FF-12607: the darwin checks are one frozen list run inside the guard, and the daemon probe reuses the one loggedIn parse in an env of exactly launchd's PATH, HOME, USER and LOGNAME",
    run: async () => {
      const source = await preflightSource();
      assert.match(
        source,
        /PREFLIGHT_CHECKS_DARWIN = Object\.freeze\(\[\s*"macos-command-line-tools",\s*"rust-toolchain",\s*"app-not-quarantined",\s*"daemon-claude-authenticated",?\s*\]\)/,
        "the four darwin checks are named by code, in one order, in one place",
      );

      const darwinBody = functionBody(source, "async function runDarwinChecks");
      assert.ok(darwinBody != null, "the darwin checks' region was found");
      assert.deepEqual(
        [...darwinBody.matchAll(/await guarded\("([a-z-]+)"/g)].map((match) => match[1]),
        ["macos-command-line-tools", "rust-toolchain", "app-not-quarantined", "daemon-claude-authenticated"],
        "every darwin check runs inside the guard, in PREFLIGHT_CHECKS_DARWIN's order",
      );
      assert.match(functionBody(source, "async function runPreflight"), /platform !== "darwin"\) return checks/, "and they are appended on darwin only");

      assert.equal([...source.matchAll(/loggedIn === true/g)].length, 1, "ONE loggedIn verdict in the module — the daemon probe does not parse a second time");
      const daemonBody = functionBody(source, "async function checkDaemonClaudeAuthenticated");
      assert.ok(daemonBody != null, "the daemon check's region was found");
      assert.match(daemonBody, /return await checkClaudeAuthenticated\(runner,/, "it asks through the terminal check's parse, via the injected runner");
      assert.match(daemonBody, /env: \{ PATH, HOME: home, USER: user, LOGNAME: user \}/, "with an env of exactly the plist's PATH and launchd's HOME, USER and LOGNAME (175/F-09)");
      assert.doesNotMatch(daemonBody, /process\.env/, "and nothing of the terminal's environment");
    },
  },

  // ── FF-17503 (milestone 175 / ADR-003 §5, ADR-004 §1) — this control WIDENED over the darwin
  // verbs. `launchctl`, `pgrep` and `kill` reach the OS only through the one injected runner, the
  // darwin stop sends no SIGKILL, the LaunchAgent act calls no `launchctl`, and the two modules
  // 175/02 added do no I/O at all.
  {
    name: "arch/175 FF-17503: every launchctl, pgrep and kill is an argument to an injected runner, and the darwin stop path sends no SIGKILL",
    run: async () => {
      const source = await desktopSource();
      const literals = [...source.matchAll(/["'](launchctl|pgrep|kill)["']/g)].length;
      const viaRunner = [...source.matchAll(/await (?:run|kill|list)\(["'](launchctl|pgrep|kill)["']/g)].length;
      assert.ok(literals >= 4, `the module does name them (non-vacuous): ${literals}`);
      assert.equal(viaRunner, literals, "every launchctl/pgrep/kill literal is the file an injected runner is asked to run");

      for (const header of ["async function stopDesktopApp", "async function awaitExit"]) {
        const body = functionBody(source, header);
        assert.ok(body != null, `${header}'s region was found`);
        assert.equal(killsHard(body), false, `${header} sends no SIGKILL`);
      }
      assert.match(functionBody(source, "async function stopDesktopApp"), /await awaitExit\(/, "the darwin stop waits for the exit");

      const launchAgent = functionBody(source, "async function applyLaunchAgent");
      assert.ok(launchAgent != null, "the LaunchAgent act's region was found");
      assert.doesNotMatch(launchAgent, /launchctl|\brun\(/, "the LaunchAgent act calls no launchctl and no runner — it registers for the next login and starts nothing");

      for (const file of [LAYOUT_MODULE, LAUNCH_AGENT_MODULE]) {
        const text = stripComments(await readFile(file, "utf8"));
        assert.doesNotMatch(text, /node:(?:fs|child_process)|\bspawn\s*\(|\b(?:readFile|writeFile|rm|mkdir)\s*\(/, `${path.basename(file)} does no I/O`);
      }
    },
  },
  {
    name: "arch/175 FF-17503: self-check — a planted SIGKILL or a direct launchctl spawn trips the detector the shipped module passes",
    run: async () => {
      assert.equal(killsHard('await kill("kill", ["-TERM", String(pid)]);'), false);
      assert.equal(killsHard('await kill("kill", ["-KILL", String(pid)]);'), true, "a planted -KILL trips");
      assert.equal(killsHard('await kill("kill", ["-9", String(pid)]);'), true, "a planted -9 trips");
      assert.equal(killsHard("process.kill(pid, 'SIGKILL');"), true, "a planted SIGKILL trips");
      const planted = 'spawnSync("launchctl", ["kickstart", service]);';
      assert.equal([...planted.matchAll(/await (?:run|kill|list)\(["'](launchctl|pgrep|kill)["']/g)].length, 0, "a direct launchctl call is not counted as runner-borne");
    },
  },
];
