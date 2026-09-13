// Fitness function: acd-session-run-reconciliation (milestone 38 / ADR-004,
// AMENDED by milestone 48 / ADR-004 + ADR-010 R3) — "a run+session on one workspace
// yields ONE line (the run's), a session-only workspace yields the (session)
// fallback, and two workspaces yield two lines" — with the rule now applied at the
// RENDER instead of on the WIRE.
//
// WHAT m38 DECIDED, AND WHY IT MOVED. m38's F1 review found that the render helper
// `ui/src/fleet/runs.mjs` cannot perform run→workspace attribution: `activeRuns` is
// the frozen m23 `string[]` of bare run ids (23/ADR-002; `ui/src/fleet/api.ts`),
// carrying NO workspace id, so the fact the subsumption rule needs was not on the
// wire. m38 therefore applied the rule UPSTREAM, in the assembler
// (`src/mesh/launcher.mjs`), by DROPPING a same-workspace session before publishing.
// m48/ADR-004 removes that premise rather than overruling it: the missing fact now
// rides each session entry as `workspaceHasRun` (stamped by the assembler — still
// the only place workspace attribution exists), so the producer drops NOTHING and
// the formatter applies the identical predicate one hop later. The wire becomes
// COMPLETE (any live session is addressable as `(nodeId, sessionId)` — m48's whole
// premise, which the old filter made structurally impossible) and the rendered
// output is unchanged for every payload.
//
// Proofs (1 and 4 are the AMENDED halves; 2 and 3 are m38's own producer-fed cases,
// carried UNCHANGED — which is what makes "the rendered behaviour is preserved" a
// measurement rather than a claim):
//  1. BEHAVIOURAL, both halves of the move over ONE real producer-fed record —
//     a run AND a live session on the SAME workspace: (producer) the assembled
//     `sessions[]` CONTAINS that session, carrying `workspaceHasRun: true` and its
//     own `sessionId`, while `activeRuns` still carries the run; (formatter) the
//     render of that record is DEEP-EQUAL to the render of the pre-m48 payload for
//     the same situation — one line, no `(session)` line.
//  2. BEHAVIOURAL — a session-only workspace (no run anywhere): the assembled
//     record's `sessions[]` retains it — the render helper renders the (session)
//     fallback. UNCHANGED from m38.
//  3. BEHAVIOURAL — a run in one workspace + a live session in ANOTHER
//     (unsubsumed) workspace: both survive onto the assembled record — two
//     workspaces, two facts, exactly SPEC's "a node working two repos shows both".
//     UNCHANGED from m38.
//  4. BEHAVIOURAL (m48/ADR-010 R3) — an ABSENT, `null`, `"true"` or `"false"`
//     `workspaceHasRun` NEVER subsumes: each still contributes its line. Absent is
//     the pre-m48 node mid-rollout, whose sessions were already subsumed at ITS own
//     producer; the strictness is what stops the string `"false"` hiding live work.
//  Self-check (m03 non-vacuous), INVERTED with the rule — two plants, each asserted
//  to have LANDED in the source before it is asserted to trip:
//   (a) a FORMATTER that ignores `workspaceHasRun` (the filter deleted, and the
//       truthiness variant) — executed as a real module built from the real source,
//       rendering the duplicate `(session)` line / hiding a `"false"` session;
//   (b) a PRODUCER that re-introduces the wire-side filter — detected in the
//       synthesized source, and shown to cost the addressable session while
//       rendering identically, which is exactly why the defect could hide.
import assert from "node:assert/strict";
import { mkdtemp, rm, mkdir, writeFile, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { loadWorkspace } from "../../../src/work.mjs";
import { startLauncher } from "../../../src/mesh/launcher.mjs";
import { openGlobalWorkProjectionStore } from "../../../src/global-work-store.mjs";
import { startSession } from "../../../src/mesh/session.mjs";
import { fleetCurrentWorkLines } from "../../../ui/src/fleet/runs.mjs";

const NODE_ID = "node-a";
const NOW = "2026-07-10T12:00:00.000Z";

const repoRoot = fileURLToPath(new URL("../../../", import.meta.url));
const FORMATTER_FILE = path.join("ui", "src", "fleet", "runs.mjs");
const PRODUCER_FILE = path.join("src", "mesh", "launcher.mjs");

// Source is read NORMALISED (this tree is CRLF in places and LF in others — story 01's
// files landed LF beside m38's CRLF ones), so every detector and every plant below is
// about what the code SAYS, never about how a checkout ended its lines.
async function readSource(relative) {
  return (await readFile(path.join(repoRoot, relative), "utf8")).replace(/\r\n/g, "\n");
}

// CODE only — a detector that counted prose would flag this milestone's own
// documentation for existing (the ADR text names these keys constantly).
//
// ORDER MATTERS (TECH_DEBT item 24): LINE comments are stripped FIRST. Blocks-first lets
// a `/*` inside a line comment (`templates/work/<type>/*.md`) open a PHANTOM block that
// swallows everything to the next `*/` — measured at 33,549 characters across five src/
// modules, work.mjs's `loadWorkspace` among them. `acd-session-ttl-reuses-isstale` has
// had the correct order all along. The `(^|[^:])` guard stays: a `://` is not a comment.
function stripComments(source) {
  return source.replace(/(^|[^:])\/\/.*$/gm, "$1").replace(/\/\*[\s\S]*?\*\//g, "");
}

// The balanced `(…)` slice that STARTS at `openIndex` — `.filter(` callbacks nest
// parentheses, so a regex cannot bound one.
function balancedParens(source, openIndex) {
  let depth = 0;
  for (let i = openIndex; i < source.length; i += 1) {
    if (source[i] === "(") depth += 1;
    else if (source[i] === ")") {
      depth -= 1;
      if (depth === 0) return source.slice(openIndex, i + 1);
    }
  }
  return null;
}

// Every `.filter(…)` argument list in `source` that mentions `token`.
function filtersMentioning(source, token) {
  const code = stripComments(source);
  const found = [];
  let from = 0;
  for (;;) {
    const at = code.indexOf(".filter(", from);
    if (at < 0) break;
    from = at + ".filter(".length;
    const args = balancedParens(code, at + ".filter".length);
    if (args && args.includes(token)) found.push(args.replace(/\s+/g, " "));
  }
  return found;
}

// PRODUCER (m48/ADR-004 + ADR-009) — the wire carries the FACT, never the policy:
// no `.filter(…)` in the launcher may consult the run set (that is the DELETED m38
// wire-side subsumption), and the set must instead be HANDED to `readLiveSessions`,
// which is the projection's one home.
function producerViolations(source) {
  const violations = [];
  for (const predicate of filtersMentioning(source, "workspacesWithRuns")) {
    violations.push(`${PRODUCER_FILE}: a \`.filter(…)\` consults the run set — \`${predicate}\` — which is m48/ADR-004's DELETED wire-side subsumption: a session doing assignment work would vanish from the only record that could name it`);
  }
  const handOff = stripComments(source).match(/readLiveSessions\(([\s\S]*?)\);/);
  if (handOff == null || !handOff[1].includes("workspacesWithRuns")) {
    violations.push(`${PRODUCER_FILE}: the run set is not handed to readLiveSessions — m48/ADR-009 puts the stamp in the projection's ONE home, and without the hand-off the formatter has no fact to apply the rule to`);
  }
  return violations;
}

// FORMATTER (m48/ADR-004 + ADR-010 R3) — exactly ONE subsumption predicate, and it
// is a STRICT comparison against boolean `true`.
function formatterViolations(source) {
  const predicates = filtersMentioning(source, "workspaceHasRun");
  if (predicates.length === 0) {
    return [`${FORMATTER_FILE}: no \`.filter(…)\` reads workspaceHasRun — the formatter ignores the run fact and renders a DUPLICATE \`working · <repo> (session)\` line beside the run line (m48/ADR-004)`];
  }
  if (predicates.length > 1) {
    return [`${FORMATTER_FILE}: ${predicates.length} filters read workspaceHasRun — the policy has ONE home`];
  }
  const [predicate] = predicates;
  return /!==\s*true/.test(predicate)
    ? []
    : [`${FORMATTER_FILE}: the subsumption predicate \`${predicate}\` is not a STRICT comparison against boolean true — m48/ADR-010 R3: an absent or non-boolean workspaceHasRun is an UNSTATED fact and never subsumes, and a truthiness test reads the STRING "false" as true and hides a live session`];
}

// Load a PLANTED variant of the real formatter as a real module. `ui/src/fleet/runs.mjs`
// imports nothing (measured: a zero-import leaf), so a mutated copy in a temp dir is
// the real code path with one line changed — not a re-implementation of it.
async function loadPlantedFormatter(source) {
  const dir = await mkdtemp(path.join(os.tmpdir(), "aof-acd-planted-formatter-"));
  const file = path.join(dir, "runs.mjs");
  await writeFile(file, source, "utf8");
  const module = await import(`${pathToFileURL(file).href}?v=${Math.random()}`);
  return { fleetCurrentWorkLines: module.fleetCurrentWorkLines, cleanup: () => rm(dir, { recursive: true, force: true }) };
}

function manualTicker() {
  const handles = [];
  return {
    handles,
    start(intervalSeconds, onTick) {
      const handle = { intervalSeconds, onTick, stopped: false };
      handles.push(handle);
      return handle;
    },
    stop(handle) { handle.stopped = true; },
  };
}

async function makeFixtureRepo() {
  const tmp = await mkdtemp(path.join(os.tmpdir(), "aof-acd-session-run-reconciliation-"));
  const root = path.join(tmp, "repo");
  const home = path.join(tmp, "home");
  const workDir = path.join(root, "wiki", "work");
  await mkdir(workDir, { recursive: true });
  await mkdir(path.join(root, ".aof"), { recursive: true });
  const workspaceId = "ws-A";
  const config = { name: "fixture", work: { dir: "./wiki/work" }, mesh: { nodeId: NODE_ID, fabric: "tailscale", workspaceId } };
  await writeFile(path.join(root, ".aof", "aof.config.json"), `${JSON.stringify(config, null, 2)}\n`, "utf8");
  return { tmp, root, home, workDir, workspaceId, env: { AOF_GLOBAL_HOME: home } };
}

async function makeSecondaryWorkspace(tmp, slug) {
  const root = path.join(tmp, `repo-${slug}`);
  const workDir = path.join(root, "wiki", "work");
  await mkdir(workDir, { recursive: true });
  return { root, workDir };
}

async function seedWorkspaceRegistration(env, { workspaceId, workDir, nodeId = NODE_ID }) {
  const store = await openGlobalWorkProjectionStore({ env });
  try {
    store.db.prepare(`
      INSERT OR REPLACE INTO global_workspace_descriptors
        (workspace_id, project_root, work_dir, name, mesh_enabled, control_node, member_node_ids_json, published_at, descriptor_path)
      VALUES (?, ?, ?, ?, 1, NULL, '[]', ?, ?)
    `).run(workspaceId, path.dirname(workDir), workDir, workspaceId, NOW, `descriptor-${workspaceId}.json`);
    store.db.prepare("INSERT OR REPLACE INTO global_node_workspaces (node_id, workspace_id) VALUES (?, ?)").run(nodeId, workspaceId);
  } finally {
    store.close();
  }
}

async function seedRunningRun(workDirRoot, itemDirName, runId) {
  const milestoneDir = path.join(workDirRoot, itemDirName);
  await mkdir(milestoneDir, { recursive: true });
  await writeFile(path.join(milestoneDir, "SPEC.md"), "---\ntype: milestone\nnumber: 99\nslug: demo\nstatus: in-progress\ntitle: Demo\n---\n", "utf8");
  const runsDir = path.join(milestoneDir, "runs");
  await mkdir(runsDir, { recursive: true });
  const record = {
    runId, itemRef: "99", state: "running", attempt: 1, outcome: null,
    sessionId: null, brief: {}, createdAt: NOW, updatedAt: NOW,
    failureReason: null, heartbeatAt: null, retryOf: null, reclaimedAt: null,
  };
  await writeFile(path.join(runsDir, `${runId}.json`), JSON.stringify(record, null, 2), "utf8");
}

async function assembleOnce(root, env) {
  const ws = await loadWorkspace(root, undefined, { env });
  const handle = await startLauncher(ws, {
    exec: async () => ({ stdout: JSON.stringify({ BackendState: "Running", Self: { HostName: NODE_ID, DNSName: `${NODE_ID}.tail1a2b.ts.net.`, TailscaleIPs: ["100.1.1.1"], Online: true }, Peer: {} }), status: 0 }),
    platform: "linux",
    peerPollTicker: manualTicker(),
    propagationTicker: manualTicker(),
    streamServer: false,
    streamClient: false,
    now: () => NOW,
    globalWorkStoreOptions: { env },
  });
  handle.stop?.();
  return handle.record;
}

export const archTests = [
  {
    name: "arch/48 ADR-004 (acd-session-run-reconciliation): a run AND a live session on the SAME workspace — the session RIDES the wire stamped workspaceHasRun true, and the render is deep-equal to the pre-m48 payload's (behavioural, end-to-end)",
    run: async () => {
      const fixture = await makeFixtureRepo();
      try {
        await seedRunningRun(fixture.workDir, "38_milestone_demo", "run-a1");
        const ws = await loadWorkspace(fixture.root, undefined, { env: fixture.env });
        await startSession(ws, { nodeId: NODE_ID, workspaceId: fixture.workspaceId, repo: "alpha", assistant: "claude-code", sessionId: "sess-A", now: NOW });

        const record = await assembleOnce(fixture.root, fixture.env);

        // ── the PRODUCER half (INVERTED by m48/ADR-004: this assertion read
        //    "…is subsumed — absent from the assembled sessions[]" until this change).
        assert.ok(record.activeRuns.includes("run-a1"), "activeRuns still carries the run — this is an addition to the wire, never a substitution");
        const session = record.sessions.find((s) => s.workspaceId === fixture.workspaceId);
        assert.ok(session, "the SAME-workspace session is PRESENT on the assembled sessions[] — the producer drops nothing");
        assert.equal(session.workspaceHasRun, true, "…carrying the FACT the formatter needs: workspaceHasRun true");
        assert.equal(session.sessionId, "sess-A", "…and its own id, so the busiest session in the fleet is addressable as (nodeId, sessionId)");

        // ── the FORMATTER half: the rendered outcome is the SAME one m38 shipped.
        //    The comparison is against the payload a PRE-m48 producer emitted for this
        //    exact situation (it had already dropped the session), which is what makes
        //    "preserved byte-for-byte" a measurement rather than a claim.
        const rendered = fleetCurrentWorkLines(record);
        const preM48Payload = { activeRuns: record.activeRuns, sessions: [] };
        assert.deepEqual(rendered, fleetCurrentWorkLines(preM48Payload), "the complete wire renders DEEP-EQUAL to the pre-m48 payload — same lines, same token, same state");
        assert.equal(rendered.lines.length, 1, "the render helper sees exactly one line for this workspace");
        assert.ok(!rendered.lines.some((line) => line.includes("(session)")), "no (session) line is emitted — the run wins");
        assert.deepEqual(rendered.lines, ["running 1 run"], "…and it is the run line, verbatim");
      } finally {
        await rm(fixture.tmp, { recursive: true, force: true });
      }
    },
  },
  {
    name: "arch/38 ADR-004 (acd-session-run-reconciliation): a session-only workspace (no run anywhere) survives onto the assembled record — the render helper shows the (session) fallback (behavioural)",
    run: async () => {
      const fixture = await makeFixtureRepo();
      try {
        const ws = await loadWorkspace(fixture.root, undefined, { env: fixture.env });
        await startSession(ws, { nodeId: NODE_ID, workspaceId: fixture.workspaceId, repo: "alpha", assistant: "claude-code", now: NOW });

        const record = await assembleOnce(fixture.root, fixture.env);
        assert.deepEqual(record.activeRuns, [], "no run anywhere");
        assert.ok(record.sessions.some((s) => s.workspaceId === fixture.workspaceId), "the session-only workspace's session survives");

        const rendered = fleetCurrentWorkLines(record);
        assert.deepEqual(rendered.lines, ["working · alpha (session)"]);
      } finally {
        await rm(fixture.tmp, { recursive: true, force: true });
      }
    },
  },
  {
    name: "arch/38 ADR-004 (acd-session-run-reconciliation): a run in one workspace + a live session in ANOTHER (unsubsumed) workspace both survive — two workspaces, two lines (SPEC 'a node working two repos shows both', behavioural)",
    run: async () => {
      const fixture = await makeFixtureRepo();
      try {
        const second = await makeSecondaryWorkspace(fixture.tmp, "second");
        await seedWorkspaceRegistration(fixture.env, { workspaceId: "ws-B", workDir: second.workDir });
        await seedRunningRun(fixture.workDir, "38_milestone_demo", "run-a1");
        const ws = await loadWorkspace(fixture.root, undefined, { env: fixture.env });
        await startSession(ws, { nodeId: NODE_ID, workspaceId: "ws-B", repo: "beta", assistant: "claude-code", now: NOW });

        const record = await assembleOnce(fixture.root, fixture.env);
        assert.ok(record.activeRuns.includes("run-a1"));
        assert.ok(record.sessions.some((s) => s.workspaceId === "ws-B"), "the DIFFERENT-workspace session is NOT subsumed");

        const rendered = fleetCurrentWorkLines(record);
        assert.equal(rendered.lines.length, 2, "two current-work lines");
        assert.ok(rendered.lines.includes("running 1 run"));
        assert.ok(rendered.lines.includes("working · beta (session)"));
      } finally {
        await rm(fixture.tmp, { recursive: true, force: true });
      }
    },
  },
  {
    name: "arch/48 ADR-010 R3 (acd-session-run-reconciliation): an ABSENT or non-boolean workspaceHasRun NEVER subsumes — a pre-m48 node's session, and a malformed value, each still contribute their line (behavioural)",
    run: async () => {
      // Every row is the SAME situation — one running run, one live session in
      // `other` — differing only in what the entry says about the run fact. Only the
      // stated boolean `true` subsumes; everything else is an UNSTATED fact, and an
      // unstated fact renders (m48/ADR-010 R3). The asymmetry is the argument:
      // absent⇒false can at worst show a line that could have been hidden; absent⇒true
      // HIDES live work — a node reading `idle` while it works.
      const rows = [
        { case: "the key ABSENT (a pre-m48 node mid-rollout, already subsumed at its OWN producer)", entry: {} },
        { case: "null", entry: { workspaceHasRun: null } },
        { case: "the STRING \"true\" (not the boolean)", entry: { workspaceHasRun: "true" } },
        { case: "the STRING \"false\"", entry: { workspaceHasRun: "false" } },
        { case: "the number 1", entry: { workspaceHasRun: 1 } },
        { case: "the boolean false", entry: { workspaceHasRun: false } },
      ];
      for (const row of rows) {
        const rendered = fleetCurrentWorkLines({
          activeRuns: ["run-a1"],
          sessions: [{ sessionId: "sess-A", workspaceId: "ws-A", repo: "other", assistant: "claude-code", lastPingAt: NOW, ...row.entry }],
        });
        assert.deepEqual(rendered.lines, ["running 1 run", "working · other (session)"], `${row.case}: the session still contributes its line`);
      }
      // …and the ONE value that does subsume.
      const subsumed = fleetCurrentWorkLines({
        activeRuns: ["run-a1"],
        sessions: [{ sessionId: "sess-A", workspaceId: "ws-A", repo: "other", assistant: "claude-code", lastPingAt: NOW, workspaceHasRun: true }],
      });
      assert.deepEqual(subsumed.lines, ["running 1 run"], "the boolean true — the only stated fact — subsumes");
    },
  },
  {
    name: "arch/48 ADR-004 (acd-session-run-reconciliation): self-check (a) — a planted FORMATTER that ignores workspaceHasRun renders the duplicate (session) line the real one suppresses, and a planted TRUTHINESS predicate hides a live session (non-vacuous)",
    run: async () => {
      const real = await readSource(FORMATTER_FILE);
      assert.deepEqual(formatterViolations(real), [], "the REAL formatter carries exactly one subsumption predicate, strict against boolean true");

      // The real source's ONE predicate, located rather than re-spelled — every plant
      // below is that exact text replaced, so a plant cannot silently stop landing
      // when the line is reworded.
      const predicate = "\n    .filter((session) => session?.workspaceHasRun !== true)";
      assert.ok(real.includes(predicate), `the plant is anchored at the real predicate (\`${predicate.trim()}\`) — a plant that does not land proves nothing`);

      // A producer-fed shape: the exact record the first proof assembles (a run and
      // its own session, stamped), plus a session in a DIFFERENT workspace so the
      // plants are proven to change ONLY the subsumed one.
      const record = {
        activeRuns: ["run-a1"],
        sessions: [
          { sessionId: "sess-A", workspaceId: "ws-A", repo: "alpha", assistant: "claude-code", lastPingAt: NOW, workspaceHasRun: true },
          { sessionId: "sess-B", workspaceId: "ws-B", repo: "beta", assistant: "claude-code", lastPingAt: NOW, workspaceHasRun: false },
        ],
      };
      const realRendered = fleetCurrentWorkLines(record);
      assert.deepEqual(realRendered.lines, ["running 1 run", "working · beta (session)"], "the REAL formatter names only the unaccounted-for repo");

      // PLANT (a1) — the filter DELETED: the formatter ignores the run fact entirely.
      // This is precisely what a merge window in which only the producer half landed
      // would show a real operator on the live fleet.
      {
        const plantedSource = real.replace(predicate, "");
        assert.notEqual(plantedSource, real, "plant (a1) LANDED — the predicate is gone from the planted source");
        assert.equal(formatterViolations(plantedSource).length, 1, "…and the detector FLAGS it (it would not have caught the real one)");
        const planted = await loadPlantedFormatter(plantedSource);
        try {
          const plantedRendered = planted.fleetCurrentWorkLines(record);
          assert.deepEqual(plantedRendered.lines, ["running 1 run", "working · alpha, beta (session)"], "the planted formatter draws the SUBSUMED repo too — the duplicate line");
          assert.notDeepEqual(plantedRendered.lines, realRendered.lines, "…so the planted (buggy) formatter disagrees with the real one on the SAME producer-fed record");
        } finally {
          await planted.cleanup();
        }
      }

      // PLANT (a2) — TRUTHINESS instead of `!== true` (m48/ADR-010 R3's clause): it
      // agrees with the real formatter on every boolean payload and disagrees exactly
      // where it matters — the STRING "false", which states nothing and must render.
      {
        const plantedSource = real.replace(predicate, "\n    .filter((session) => !session?.workspaceHasRun)");
        assert.ok(plantedSource.includes("!session?.workspaceHasRun"), "plant (a2) LANDED — the predicate is now a truthiness test");
        assert.equal(formatterViolations(plantedSource).length, 1, "…and the detector FLAGS the loose comparison");
        const planted = await loadPlantedFormatter(plantedSource);
        try {
          const malformed = {
            activeRuns: ["run-a1"],
            sessions: [{ sessionId: "sess-A", workspaceId: "ws-A", repo: "alpha", assistant: "claude-code", lastPingAt: NOW, workspaceHasRun: "false" }],
          };
          assert.deepEqual(fleetCurrentWorkLines(malformed).lines, ["running 1 run", "working · alpha (session)"], "the REAL formatter renders a session whose workspaceHasRun is the string \"false\"");
          assert.deepEqual(planted.fleetCurrentWorkLines(malformed).lines, ["running 1 run"], "…the planted truthiness formatter HIDES it — live work reading as nothing at all");
        } finally {
          await planted.cleanup();
        }
      }
    },
  },
  {
    name: "arch/48 ADR-004 (acd-session-run-reconciliation): self-check (b) — a planted PRODUCER that re-introduces the wire-side filter is detected in source, and costs the addressable session while rendering identically (non-vacuous)",
    run: async () => {
      const real = await readSource(PRODUCER_FILE);
      assert.deepEqual(producerViolations(real), [], "the REAL producer carries no wire-side subsumption filter, and hands the run set to readLiveSessions");

      // The hand-off line as the real source spells it — the plant is anchored there,
      // so it re-creates the m38 line at the exact site ADR-004 deleted it from.
      const handOff = "sessions = await readLiveSessions(ws, nodeId, { ...options, workspacesWithRuns });";
      assert.ok(real.includes(handOff), `the plant is anchored at the real hand-off (\`${handOff}\`)`);
      const plantedSource = real.replace(
        handOff,
        "sessions = (await readLiveSessions(ws, nodeId, { ...options, workspacesWithRuns })).filter((session) => !workspacesWithRuns.has(session.workspaceId));",
      );
      assert.notEqual(plantedSource, real, "plant (b) LANDED — the deleted filter is back in the planted source");
      const flagged = producerViolations(plantedSource);
      assert.equal(flagged.length, 1, "…and the detector FLAGS it (it would not have caught the real one)");
      assert.match(flagged[0], /wire-side subsumption/, "…naming what it caught");

      // WHY IT MATTERS, behaviourally — and why this defect could hide for a whole
      // milestone: the planted producer renders IDENTICALLY. What it costs is the
      // address. `workspaceHasRun` is exactly `workspacesWithRuns.has(workspaceId)`,
      // so filtering on it is the same wire the plant would publish.
      const record = {
        activeRuns: ["run-a1"],
        sessions: [
          { sessionId: "sess-A", workspaceId: "ws-A", repo: "alpha", assistant: "claude-code", lastPingAt: NOW, workspaceHasRun: true },
          { sessionId: "sess-B", workspaceId: "ws-B", repo: "beta", assistant: "claude-code", lastPingAt: NOW, workspaceHasRun: false },
        ],
      };
      const plantedWire = { ...record, sessions: record.sessions.filter((session) => session.workspaceHasRun !== true) };
      assert.deepEqual(fleetCurrentWorkLines(plantedWire), fleetCurrentWorkLines(record), "the planted producer renders identically — no operator would ever see it");
      assert.equal(record.sessions.some((session) => session.sessionId === "sess-A"), true, "the REAL wire carries the working session's id");
      assert.equal(plantedWire.sessions.some((session) => session.sessionId === "sess-A"), false, "…the planted wire has dropped it: the busiest session in the fleet is no longer addressable as (nodeId, sessionId), which is the whole capability m48 exists to deliver");
    },
  },
];
