// Traceability wiring for milestone 126 / story 06, task
// 00_a-fourth-check-and-the-count-it-supersedes.feature.
//
// `heartbeat-hook-installed` is the FOURTH preflight check (ADR-007 §4), appended last so
// the three that shipped with `126/04` keep their order. It asks two questions of every
// workspace on this node: does its `.claude/settings.json` register the `claude-run-heartbeat`
// bundle hook, and is the file that registration names on disk. Both, because a registration
// pointing at a missing file fails at hook time and reads as healthy from the settings alone.
//
// WHY THE CHECK EXISTS, MEASURED. On the control node, 2026-09-10, a supervised loop was
// declared in a workspace registering four `aofManaged` hooks and not this one. Its runtime
// died after about a minute; with no hook no `heartbeatAt` was ever stamped, so the attempt's
// last observed liveness fell back to the `updatedAt` the reclaim wrote 8½ hours later and
// `aof work loop 01 --resume` halted `deadline-exhausted, elapsedMs=30851979` against a
// 7,200,000 ms ceiling. Nothing warned. `aof work update` installs the hook, so the condition
// was always fixable — only the report was missing.
//
// WHAT 126/06's POST-HOC REVIEW ADDED HERE. The story was accepted before any review ran, and
// the review found this suite asserting "on both faces" and "the `--json` envelope carries
// them as an ordered list of four" against `renderPreflight` alone — neither verb was invoked
// anywhere in it and no test touched a `--json` envelope, so those rows would have passed
// against a stub that always answers `pass`. The face rows below drive the two registered
// verbs and read the envelope their own `cli.json` produces. The rest of the additions are the
// review's blockers and defects: the two seams reaching the real filesystem on both faces, the
// all-skipped false `pass`, the marker accepted anywhere in the document, the constant probed
// instead of the registration, the unbounded offender list, and the throws that escaped.
//
// NOTHING HERE REACHES THE REAL MACHINE. Every workspace, settings document, hook-file answer
// and bundle declaration is injected; the check writes nothing on any path, which the
// repairs-nothing case asserts by handing it seams that record every call.
import assert from "node:assert/strict";
import path from "node:path";

import {
  PREFLIGHT_CHECKS,
  PREFLIGHT_SEAMS,
  runPreflight,
  renderPreflight,
} from "../../../src/commands/mesh/desktop-preflight.mjs";
import { getCommand, invoke } from "../../../src/command-core.mjs";
import { withMeshDesktopFixture, seedInstalledApp, DESKTOP_APP_EXE } from "../../support/mesh-desktop-fixture.mjs";

// The argv `markedEntry` writes: the script resolved at run time through the harness's own
// token, never a checkout's absolute path. The check reads the file to probe FROM HERE, which
// is what makes an overridden declaration checkable and a stale canonical file uncatchable.
const HOOK_ARG = "${CLAUDE_PROJECT_DIR}/.claude/hooks/aof/run-heartbeat-enqueue.mjs";

const entry = (id, args = [HOOK_ARG]) => ({ type: "command", command: "node", args, aofManaged: id });
const under = (event, ...entries) => ({ hooks: { [event]: [{ matcher: ".*", hooks: entries }] } });

const REGISTERED = under("PostToolUse", entry("claude-run-heartbeat"));
const NOT_REGISTERED = under("PostToolUse", entry("claude-artifact-sync"));

// The bundle's own declaration of the hook, injected. Its EVENT is what the check compares a
// registration against; nothing in the check re-spells it.
const DECLARATION = { id: "claude-run-heartbeat", event: "PostToolUse", claude: { args: [HOOK_ARG] } };

// The three checks that are NOT this story's subject, answered green so a failure here can
// only be the fourth one's.
function probes(overrides = {}) {
  return {
    env: {},
    nodeId: overrides.nodeId === undefined ? "fixture-node" : overrides.nodeId,
    claudeFn: async () => ({ stdout: JSON.stringify({ loggedIn: true, authMethod: "claude.ai" }), stderr: "", code: 0 }),
    buildInfoFn: () => ({ mode: "payload", buildId: "fixture.20260910T000000", installedAt: null }),
    workspacesFn: overrides.workspacesFn ?? (async () => overrides.workspaces ?? { ok: true, workspaces: [], skipped: [] }),
    workspaceConfigFn: async () => ({ mesh: { workspaceId: "fixture-ws" } }),
    settingsFn: overrides.settingsFn ?? (async () => REGISTERED),
    hookFileFn: overrides.hookFileFn ?? (async () => true),
    bundleHookFn: overrides.bundleHookFn ?? (() => DECLARATION),
  };
}

const only = (preflight) => preflight.find((item) => item.code === "heartbeat-hook-installed");
const oneWorkspace = { ok: true, workspaces: [{ projectRoot: "/ws/only" }], skipped: [] };

export const meshDesktopPreflightHeartbeatTests = [
  // Scenario: the preflight reports FOUR checks, in one order, on both faces.
  {
    name: "126/06 task00 the preflight reports FOUR checks in one order — the count that supersedes 126/04 task03's three",
    async run() {
      assert.deepEqual(
        [...PREFLIGHT_CHECKS],
        ["claude-authenticated", "payload-build", "workspace-identity-pinned", "heartbeat-hook-installed"],
        "four codes, the new one LAST so the three that shipped keep their order",
      );

      const preflight = await runPreflight(probes({ workspaces: { ok: true, workspaces: [{ projectRoot: "/ws/a" }], skipped: [] } }));
      assert.equal(preflight.length, 4, "exactly four checks are reported");
      assert.deepEqual(preflight.map((item) => item.code), [...PREFLIGHT_CHECKS], "in PREFLIGHT_CHECKS' order");

      const lines = renderPreflight(preflight);
      const text = Array.isArray(lines) ? lines.join("\n") : String(lines);
      assert.equal(preflight.filter((item) => item.code === "heartbeat-hook-installed").length, 1, "the fourth code appears once");
      assert.match(text, /heartbeat-hook-installed/, "and it reaches the shared render both faces print");
    },
  },

  // Scenario (same row, the half the delivered suite asserted against the render alone): "on
  // BOTH faces", and "the `--json` envelope carries them as an ordered list of four".
  {
    name: "126/06 task00 BOTH REGISTERED VERBS are driven, and each `--json` envelope carries the four codes in order — the leg that was asserted against renderPreflight alone",
    async run() {
      await withMeshDesktopFixture(async ({ installDir, appArtifactPath, bootstrapperArtifactPath }) => {
        await seedInstalledApp(installDir);
        const seams = probes({ workspaces: { ok: true, workspaces: [{ projectRoot: "/ws/a" }], skipped: [] } });

        const installed = await invoke(
          "mesh:desktop-install",
          { installDir, appArtifact: appArtifactPath, bootstrapperArtifact: bootstrapperArtifactPath },
          { ...seams, platform: "win32" },
        );
        const launched = await invoke(
          "mesh:desktop-run",
          { installDir },
          { ...seams, spawnFn: () => ({ pid: 1, on() {}, unref() {} }) },
        );

        for (const [face, result] of [["mesh:desktop-install", installed], ["mesh:desktop-run", launched]]) {
          const envelope = getCommand(face).cli.json(result);
          assert.equal(envelope.ok, true, `${face}: the envelope reports success`);
          assert.ok(Array.isArray(envelope.preflight), `${face}: the envelope carries preflight as a LIST`);
          assert.equal(envelope.preflight.length, 4, `${face}: an ordered list of FOUR`);
          assert.deepEqual(
            envelope.preflight.map((item) => item.code),
            [...PREFLIGHT_CHECKS],
            `${face}: in PREFLIGHT_CHECKS' order`,
          );
          assert.equal(
            envelope.preflight.find((item) => item.code === "heartbeat-hook-installed").status,
            "pass",
            `${face}: the fourth check really ran over the injected seams — a stub could not know this`,
          );
        }

        assert.deepEqual(installed.preflight, launched.preflight, "and the two faces report the SAME four");
      });
    },
  },

  // BLOCKER (126/06 review): both new seams were dropped on both faces, so the two reads hit
  // the real filesystem on the only path an operator takes and no caller could displace them.
  {
    name: "126/06 task00 the two 126/06 seams REACH the check through both verbs' ctx — the drop that made every operator-path read hit the real filesystem",
    async run() {
      await withMeshDesktopFixture(async ({ installDir, appArtifactPath, bootstrapperArtifactPath }) => {
        await seedInstalledApp(installDir);

        for (const [face, input, extra] of [
          ["mesh:desktop-install", { installDir, appArtifact: appArtifactPath, bootstrapperArtifact: bootstrapperArtifactPath }, { platform: "win32" }],
          ["mesh:desktop-run", { installDir }, { spawnFn: () => ({ pid: 1, on() {}, unref() {} }) }],
        ]) {
          const settingsCalls = [];
          const hookFileCalls = [];
          const bundleCalls = [];
          const result = await invoke(face, input, {
            ...probes({
              workspaces: { ok: true, workspaces: [{ projectRoot: "/ws/injected" }], skipped: [] },
              settingsFn: async (root) => {
                settingsCalls.push(root);
                return REGISTERED;
              },
              hookFileFn: async (hookPath) => {
                hookFileCalls.push(hookPath);
                return true;
              },
              bundleHookFn: () => {
                bundleCalls.push("asked");
                return DECLARATION;
              },
            }),
            ...extra,
          });

          assert.deepEqual(settingsCalls, ["/ws/injected"], `${face}: the injected settingsFn was called — not the real filesystem`);
          assert.equal(hookFileCalls.length, 1, `${face}: the injected hookFileFn was called`);
          assert.equal(bundleCalls.length, 1, `${face}: the injected bundle declaration was read once`);
          assert.equal(
            result.preflight.find((item) => item.code === "heartbeat-hook-installed").status,
            "pass",
            `${face}: and its answer is the one the seams gave`,
          );
        }
      });
    },
  },

  // The forwarding is by CONSTRUCTION, not by two hand-kept lists: a seam the check reads and
  // the faces do not forward is the defect above, and this is what makes it unrepeatable.
  {
    name: "126/06 task00 every seam runPreflight reads is named in PREFLIGHT_SEAMS, which is the ONE list both faces forward",
    async run() {
      const source = await (await import("node:fs/promises")).readFile(
        new URL("../../../src/commands/mesh/desktop-preflight.mjs", import.meta.url),
        "utf8",
      );
      const read = new Set([...source.matchAll(/options\.([A-Za-z][A-Za-z0-9]*)/g)].map((match) => match[1]));
      const forwarded = new Set(PREFLIGHT_SEAMS);
      for (const seam of read) {
        assert.ok(forwarded.has(seam), `\`options.${seam}\` is read but not in PREFLIGHT_SEAMS, so no face forwards it`);
      }
      assert.ok(read.size >= 8, `non-vacuous: the sweep found ${read.size} option reads`);

      const face = await (await import("node:fs/promises")).readFile(
        new URL("../../../src/commands/mesh/desktop.mjs", import.meta.url),
        "utf8",
      );
      assert.equal(
        [...face.matchAll(/runPreflight\(preflightSeams\(ctx\)\)/g)].length,
        2,
        "and both verbs forward that one list rather than spelling keys of their own",
      );
    },
  },

  // Scenario Outline: the check over each condition — and a probe that cannot answer is a fail.
  {
    name: "126/06 task00 outline the check over each condition — registered-and-present passes, and every other shape is a FAIL that names what it found",
    async run() {
      const cases = [
        {
          why: "registers the id and the file is present",
          settingsFn: async () => REGISTERED,
          hookFileFn: async () => true,
          status: "pass",
          names: [],
        },
        {
          why: "registers the id but the file is absent — the shape that fails silently at hook time",
          settingsFn: async () => REGISTERED,
          hookFileFn: async () => false,
          status: "fail",
          names: ["/ws/only", "run-heartbeat-enqueue.mjs"],
        },
        {
          why: "omits the id entirely — the measured test-bed's shape",
          settingsFn: async () => NOT_REGISTERED,
          hookFileFn: async () => true,
          status: "fail",
          names: ["/ws/only", "claude-run-heartbeat"],
        },
        {
          why: "the settings document cannot be read — a probe that cannot answer is a FAIL, never a pass",
          settingsFn: async () => {
            throw new Error("ENOENT: no such file or directory");
          },
          hookFileFn: async () => true,
          status: "fail",
          names: ["/ws/only", "ENOENT"],
        },
      ];

      for (const testCase of cases) {
        const found = only(await runPreflight(probes({ workspaces: oneWorkspace, settingsFn: testCase.settingsFn, hookFileFn: testCase.hookFileFn })));
        assert.equal(found.status, testCase.status, testCase.why);
        for (const named of testCase.names) {
          assert.ok(found.message.includes(named), `${testCase.why} — the message names ${named} (got: ${found.message})`);
        }
      }
    },
  },

  // DEFECT (126/06 review): the marker was accepted ANYWHERE in the document, so a marker
  // under a key the harness never dispatches reported `pass` — the exact silent green the
  // check exists to refuse, one level up from the one it was written for.
  {
    name: "126/06 task00 the registration must sit under the event the hook is DECLARED for — a marker parked elsewhere in the document dispatches nothing and is a FAIL",
    async run() {
      const parked = [
        {
          why: "under a different event than the declaration names",
          settings: under("SessionEnd", entry("claude-run-heartbeat")),
          names: ["SessionEnd", "PostToolUse"],
        },
        {
          why: "outside the `hooks` map entirely — an operator's disabled shelf",
          settings: { hooks: {}, disabledByOperator: [entry("claude-run-heartbeat")] },
          names: ["outside the `hooks` map"],
        },
        {
          why: "at the document root, with no `hooks` map at all",
          settings: entry("claude-run-heartbeat"),
          names: ["outside the `hooks` map"],
        },
      ];

      for (const testCase of parked) {
        const found = only(await runPreflight(probes({ workspaces: oneWorkspace, settingsFn: async () => testCase.settings })));
        assert.equal(found.status, "fail", testCase.why);
        for (const named of testCase.names) {
          assert.ok(found.message.includes(named), `${testCase.why} — names ${named} (got: ${found.message})`);
        }
      }

      // Non-vacuity, and the other half of the same rule: the event comes from the DECLARATION,
      // so a bundle that declares the hook on another event makes that other event the right one.
      const moved = only(await runPreflight(probes({
        workspaces: oneWorkspace,
        settingsFn: async () => under("SessionEnd", entry("claude-run-heartbeat")),
        bundleHookFn: () => ({ ...DECLARATION, event: "SessionEnd" }),
      })));
      assert.equal(moved.status, "pass", "the check follows the declaration rather than a constant beside it");
    },
  },

  // DEFECT (126/06 review): the file was a hardcoded constant while the real entry carries its
  // path in `args`. An overridden hook got a false FAIL; a stale canonical file beside a missing
  // registered one got a false PASS.
  {
    name: "126/06 task00 the file probed is the one the REGISTRATION names, not a constant beside the check — so an override is checkable and a stale canonical file is not mistaken for it",
    async run() {
      const overridden = "${CLAUDE_PROJECT_DIR}/tools/heartbeat.mjs";
      const probed = [];
      const found = only(await runPreflight(probes({
        workspaces: oneWorkspace,
        settingsFn: async () => under("PostToolUse", entry("claude-run-heartbeat", [overridden])),
        hookFileFn: async (hookPath) => {
          probed.push(hookPath);
          return false;
        },
      })));

      assert.equal(probed.length, 1, "one probe, for the file the registration names");
      assert.equal(probed[0], path.resolve("/ws/only", "/ws/only/tools/heartbeat.mjs"), "the ${CLAUDE_PROJECT_DIR} token is substituted exactly as the harness would");
      assert.ok(!probed[0].includes("run-heartbeat-enqueue"), "the canonical file is NOT what was asked about");
      assert.equal(found.status, "fail");
      assert.ok(found.message.includes(overridden), `the verdict names the file as the settings file spells it (got: ${found.message})`);
      assert.ok(!found.message.includes("\\"), "and it prints the separator the settings, the bundle and the docs all use");

      // The registration that names no file at all is its own answer, not "not registered".
      const nameless = only(await runPreflight(probes({
        workspaces: oneWorkspace,
        settingsFn: async () => under("PostToolUse", entry("claude-run-heartbeat", [])),
      })));
      assert.equal(nameless.status, "fail");
      assert.ok(nameless.message.includes("names no file to run"), `got: ${nameless.message}`);
    },
  },

  // Scenario: every workspace that lacks the hook is named, not just the first.
  {
    name: "126/06 task00 EVERY workspace that lacks the hook is named, and the one that carries it is not",
    async run() {
      const workspaces = {
        ok: true,
        workspaces: [{ projectRoot: "/ws/good" }, { projectRoot: "/ws/bad-one" }, { projectRoot: "/ws/bad-two" }],
        skipped: [],
      };
      const found = only(await runPreflight(probes({
        workspaces,
        settingsFn: async (root) => (root === "/ws/good" ? REGISTERED : NOT_REGISTERED),
      })));

      assert.equal(found.status, "fail");
      assert.ok(found.message.includes("/ws/bad-one"), "the first offender is named");
      assert.ok(found.message.includes("/ws/bad-two"), "and so is the second — a report that stops at the first is a report of one fault");
      assert.ok(!found.message.includes("/ws/good"), "the healthy workspace is not named");
    },
  },

  // DEFECT (126/06 review): the offender list was joined verbatim — measured 33,030 characters
  // for 300 offenders. F-28's lesson had been applied to the skip list, not to the list that
  // actually explodes.
  {
    name: "126/06 task00 the offender list is BOUNDED — three hundred offenders still produce a verdict an operator can read, and the ones not named are counted",
    async run() {
      const workspaces = {
        ok: true,
        workspaces: Array.from({ length: 300 }, (_, index) => ({ projectRoot: `/ws/project-number-${index}` })),
        skipped: Array.from({ length: 327 }, (_, index) => ({ workspaceId: `ws-${index}`, reason: "workdir-missing" })),
      };
      const found = only(await runPreflight(probes({ workspaces, settingsFn: async () => NOT_REGISTERED })));

      assert.equal(found.status, "fail");
      assert.ok(found.message.length < 1200, `the whole verdict stays readable (got ${found.message.length} characters)`);
      assert.ok(found.message.includes("/ws/project-number-0"), "the first offender is still named");
      assert.match(found.message, /and \d+ more not named/, "and the remainder is COUNTED rather than dropped in silence");
      assert.ok(found.message.includes("327 workspace(s) skipped"), "skips are counted too (F-28)");
      assert.ok(found.message.includes("aof work update"), "the remedy is named, because a fault with no remedy is an accusation");
    },
  },

  // DEFECT (126/06 review): `aof work update` cannot be run "in" a transient temp-launcher root
  // whose settings are unreadable, so one remedy sentence over both classes is permanently red
  // with an inapplicable instruction. Three such roots exist on the live control node.
  {
    name: "126/06 task00 a workspace that could not be READ is reported as its own class — `aof work update` is offered only where it is the remedy",
    async run() {
      const workspaces = {
        ok: true,
        workspaces: [{ projectRoot: "/ws/no-hook" }, { projectRoot: "/tmp/launcher-abc" }],
        skipped: [],
      };
      const mixed = only(await runPreflight(probes({
        workspaces,
        settingsFn: async (root) => {
          if (root === "/tmp/launcher-abc") throw new Error("ENOENT");
          return NOT_REGISTERED;
        },
      })));
      assert.equal(mixed.status, "fail");
      assert.ok(mixed.message.includes("run `aof work update` in each: /ws/no-hook"), `the remedy is scoped to the class it fixes (got: ${mixed.message})`);
      assert.ok(mixed.message.includes("does not fix"), "and the unreadable class says so in its own sentence");
      assert.ok(mixed.message.includes("/tmp/launcher-abc"), "naming the root it could not read");

      // Unreadable ALONE is still a fail — nothing was checked, so nothing can be vouched for —
      // and it does not tell the operator to run a command that would change nothing.
      const unreadableOnly = only(await runPreflight(probes({
        workspaces: { ok: true, workspaces: [{ projectRoot: "/tmp/launcher-abc" }], skipped: [] },
        settingsFn: async () => {
          throw new Error("ENOENT");
        },
      })));
      assert.equal(unreadableOnly.status, "fail");
      assert.ok(!unreadableOnly.message.includes("run `aof work update` in each"), `no inapplicable remedy (got: ${unreadableOnly.message})`);

      // A settings document that PARSES but is not an object is an unreadable SHAPE, not an
      // absent registration: `aof work update` would refuse to merge into it.
      for (const shape of [[], "true", 7, true, null]) {
        const found = only(await runPreflight(probes({ workspaces: oneWorkspace, settingsFn: async () => shape })));
        assert.equal(found.status, "fail", `${JSON.stringify(shape)} is a fail`);
        assert.ok(
          found.message.includes("rather than a settings object"),
          `${JSON.stringify(shape)} is reported as a shape, not as "no hook registered" (got: ${found.message})`,
        );
      }
    },
  },

  // Scenario: a node with no workspaces registered is a pass, not a fault.
  {
    name: "126/06 task00 a node with no workspaces registered is a PASS — there is nothing that could lose its liveness",
    async run() {
      const found = only(await runPreflight(probes({ workspaces: { ok: true, workspaces: [], skipped: [] } })));
      assert.equal(found.status, "pass");
      assert.match(found.message, /No workspace is registered to this node/);
    },
  },

  // BLOCKER (126/06 review): GENUINELY NONE and ALL SKIPPED are different facts, and the check
  // answered `pass — No workspace is registered to this node` for both. This node carries 327
  // skips, so the false one was the live path; its sibling already reports FAIL on that answer.
  {
    name: "126/06 task00 ALL SKIPPED is not the same fact as NONE REGISTERED — a node whose every row was skipped checked nothing and cannot report a pass",
    async run() {
      const allSkipped = {
        ok: true,
        workspaces: [],
        skipped: Array.from({ length: 327 }, (_, index) => ({ workspaceId: `ws-${index}`, reason: "workdir-missing" })),
      };
      const found = only(await runPreflight(probes({ workspaces: allSkipped })));
      assert.equal(found.status, "fail", "nothing was checked, so nothing can be vouched for");
      assert.ok(found.message.includes("327"), `the verdict says how many (got: ${found.message})`);
      assert.ok(!found.message.includes("No workspace is registered to this node"), "and it does not claim a fact that is untrue");

      // The sibling that was already right about this answer stays right, and the two now agree.
      const preflight = await runPreflight(probes({ workspaces: allSkipped }));
      const sibling = preflight.find((item) => item.code === "workspace-identity-pinned");
      assert.equal(sibling.status, "fail", "workspace-identity-pinned reported FAIL on this answer all along");
    },
  },

  // Scenario: an unenumerable node is a FAIL rather than a silent pass.
  {
    name: "126/06 task00 an unenumerable node is a FAIL rather than a silent pass — in all three ways it can fail to answer",
    async run() {
      const noIdentity = only(await runPreflight(probes({ nodeId: null })));
      assert.equal(noIdentity.status, "fail", "no node identity yet");
      assert.match(noIdentity.message, /could not be enumerated/);

      const threw = only(await runPreflight(probes({
        workspacesFn: async () => {
          throw new Error("the projection store would not open");
        },
      })));
      assert.equal(threw.status, "fail", "the resolver threw");
      assert.ok(threw.message.includes("the projection store would not open"), "and it carries what the resolver said");

      const notOk = only(await runPreflight(probes({ workspaces: { ok: false, workspaces: [], skipped: [] } })));
      assert.equal(notOk.status, "fail", "the resolver answered ok:false — empty workspaces there means 'did not answer', never 'none'");

      // A DEGRADED answer — `ok:true` with a non-array where a list belongs — is a short report,
      // never a TypeError out of the verb.
      const degraded = await runPreflight(probes({ workspaces: { ok: true, workspaces: null, skipped: "many" } }));
      assert.equal(only(degraded).status, "pass", "no workspaces and no skips readable ⇒ nothing registered");
      assert.equal(degraded.length, 4, "and all four checks still answered");
    },
  },

  // Scenario: the check repairs nothing and reaches nothing it was not given.
  {
    name: "126/06 task00 the check REPAIRS nothing, reaches only its injected seams, counts skips rather than listing them, and names the remedy",
    async run() {
      const calls = [];
      const workspaces = {
        ok: true,
        workspaces: [{ projectRoot: "/ws/bad" }],
        // A live control node carries hundreds of these; F-28 measured a sibling check
        // printing 16,827 characters of them on one line, which is a verdict no operator
        // can read. This one COUNTS them.
        skipped: Array.from({ length: 327 }, (_, index) => ({ workspaceId: `ws-${index}`, reason: "workdir-missing" })),
      };
      const found = only(await runPreflight(probes({
        workspaces,
        settingsFn: async (root) => {
          calls.push(["settings", root]);
          return NOT_REGISTERED;
        },
        hookFileFn: async (hookPath) => {
          calls.push(["hookFile", hookPath]);
          return true;
        },
      })));

      assert.equal(found.status, "fail");
      assert.ok(found.message.includes("aof work update"), "the remedy is named, because a fault with no remedy is an accusation");
      assert.ok(found.message.includes("327 workspace(s) skipped"), "skips are COUNTED, not enumerated (F-28)");
      assert.ok(found.message.length < 1000, `the whole message stays readable (got ${found.message.length} characters)`);
      assert.deepEqual(calls, [["settings", "/ws/bad"]], "one read, for the workspace the resolver named, and no hook-file probe behind a failed registration test");
    },
  },

  // DEFECT (126/06 review): "fails closed" was ONE call wide. A throw from the registration
  // search or from an injected `hookFileFn` escaped `runPreflight` into the face — and on
  // `mesh:desktop-run` that lands AFTER the app has been spawned detached, enveloping a launch
  // that succeeded as a refusal.
  {
    name: "126/06 task00 fails closed AT THE VERB — a throw from any probe becomes a reported FAIL, never an escaping error behind an app that is already running",
    async run() {
      const throwers = [
        { why: "the hook-file probe", overrides: { hookFileFn: async () => { throw new Error("probe exploded"); } } },
        { why: "the bundle declaration", overrides: { bundleHookFn: () => { throw new Error("bundle unreadable"); } } },
      ];
      for (const thrower of throwers) {
        const preflight = await runPreflight(probes({ workspaces: oneWorkspace, ...thrower.overrides }));
        assert.equal(preflight.length, 4, `${thrower.why}: all four checks still answered`);
        assert.equal(only(preflight).status, "fail", `${thrower.why}: reported, not thrown`);
      }

      // And the one that matters most: through the FACE, after the detached spawn.
      await withMeshDesktopFixture(async ({ installDir }) => {
        await seedInstalledApp(installDir);
        const launched = await invoke(
          "mesh:desktop-run",
          { installDir },
          {
            ...probes({
              workspaces: oneWorkspace,
              hookFileFn: async () => {
                throw new Error("probe exploded");
              },
            }),
            spawnFn: () => ({ pid: 1, on() {}, unref() {} }),
          },
        );
        assert.equal(launched.ok, true, "the launch that succeeded is still reported as a success");
        assert.equal(launched.appPath, path.join(installDir, DESKTOP_APP_EXE));
        assert.equal(only(launched.preflight).status, "fail", "and the broken probe reports itself instead of enveloping the launch");
      });
    },
  },

  // DEFECT (126/06 review): a duplicated row named its workspace twice, and a row naming neither
  // a project root nor a work dir printed "an unnamed root" beside a remedy nobody could type.
  {
    name: "126/06 task00 a duplicated row is one workspace, and a row that names no root at all is reported as unreadable rather than given a remedy that cannot be run",
    async run() {
      const duplicated = only(await runPreflight(probes({
        workspaces: {
          ok: true,
          workspaces: [{ workspaceId: "a", projectRoot: "/ws/twice" }, { workspaceId: "b", projectRoot: "/ws/twice" }],
          skipped: [],
        },
        settingsFn: async () => NOT_REGISTERED,
      })));
      assert.equal(duplicated.status, "fail");
      assert.equal(
        duplicated.message.split("/ws/twice").length - 1,
        1,
        `one workspace is named once, not once per row (got: ${duplicated.message})`,
      );

      const rootless = only(await runPreflight(probes({
        workspaces: { ok: true, workspaces: [{ workspaceId: "ws-rootless" }], skipped: [] },
      })));
      assert.equal(rootless.status, "fail");
      assert.ok(rootless.message.includes("ws-rootless"), `the row is named by its id (got: ${rootless.message})`);
      assert.ok(!rootless.message.includes("an unnamed root"), "not as 'an unnamed root'");
      assert.ok(!rootless.message.includes("run `aof work update` in each"), "and it is not handed a remedy that could not be typed");
    },
  },

  // DEFECT (126/06 review): `resolveNodeWorkspaces` ran TWICE per preflight — 334 rows
  // enumerated twice, `mkdir` + `new DatabaseSync` + `migrateSchema` twice — on a verb whose
  // register row says it writes nothing on any path. The two checks could also see different
  // workspace sets, which nothing prevented.
  {
    name: "126/06 task00 the node's workspaces are resolved ONCE per preflight, and both checks read that one answer",
    async run() {
      let calls = 0;
      const preflight = await runPreflight(probes({
        workspacesFn: async () => {
          calls += 1;
          return { ok: true, workspaces: [{ projectRoot: `/ws/call-${calls}` }], skipped: [] };
        },
        settingsFn: async () => REGISTERED,
      }));

      assert.equal(calls, 1, "one enumeration, not one per check");
      const identity = preflight.find((item) => item.code === "workspace-identity-pinned");
      assert.ok(identity.message.includes("1 registered workspace(s)"), "the identity check read the one answer");
      assert.ok(only(preflight).message.includes("1 registered workspace(s)"), "and so did the heartbeat check — the same one");
    },
  },
];
