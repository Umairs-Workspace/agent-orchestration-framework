// Fitness function: acd-captured-producer-fixture (milestone 38 / ADR-008)
//
// THE INVARIANT (ADR-008). Wherever we do NOT own the producer — a vendor hook
// payload, an HTTP route, a CROSS-LANGUAGE surface — the contract test must be fed a
// REAL CAPTURED payload from that producer, and that captured fixture must still
// MATCH what the producer emits today. A fixture that drifts from its producer is a
// fixture that proves nothing.
//
// THIS FILE GUARDS THE CROSS-LANGUAGE SURFACE: the Rust desktop
// (app/desktop/crates/core/src/view_model.rs) structurally CANNOT import the JS
// projection (ui/src/fleet/runs.mjs) — the ADR-004 reconciliation rule therefore has
// TWO implementations (JS `fleetCurrentWorkLines`, Rust `current_work`). The binding
// discipline that replaces the (false) "both UIs call the same function" guarantee is:
// BOTH implementations are exercised against the SAME REAL CAPTURED producer payload.
//
// The suite DOES run the Rust tests (`cargo test (app/desktop)` — scripts/test.mjs).
// What cargo CANNOT do is the part that matters here: a Rust test can only check the
// Rust code against the fixture SITTING NEXT TO IT — it has no way to reach the JS
// producer, so a fixture that has drifted from what `aof` actually emits stays green
// forever (that is precisely how F7/F8 shipped). This arch-test closes that hole from
// the Node side: it asserts the Rust surface's captured fixtures are (a) genuinely
// captured, (b) still PRODUCER-SHAPED against a record the REAL producer assembles in
// this very test run, and (c) pinned to the SAME rendered line the JS projection
// derives from them — so the two implementations cannot silently drift apart.
//
// GROUNDED IN THE FINDINGS: F1 (JS fixture shaped to the consumer), F8 (the same
// defect in Rust), F7 (the desktop never read `sessions` at all — its fixtures never
// carried one, because they were hand-written), F4/F6/F9 (the same class at the hook
// payload, the HTTP route, and the mounted component).
//
// PROOFS (every detector is a PURE function over source text, so the real Rust source
// and the planted violations run through the IDENTICAL code path):
//  1. The fixtures EXIST and are genuinely captured — each `REAL_CAPTURED_*` const
//     carries capture PROVENANCE (a comment naming the real `aof …` command whose
//     verbatim stdout it is). A hand-authored fixture is a violation.
//  2. Each captured fixture is PRODUCER-SHAPED — compared field-by-field against a
//     presence record assembled by the REAL producer in this very test (not against a
//     hand-written expectation): the frozen five-key set/order on the node this build
//     produced, `activeRuns` a bare `string[]`, `sessions[i]` exactly the producer's
//     four keys. Producer changes shape + fixture not re-captured ⇒ CI fails.
//  3. CROSS-SURFACE AGREEMENT — the line the JS projection derives from each captured
//     payload is pinned VERBATIM as an asserted literal in the Rust surface. If either
//     implementation of the ADR-004 rule drifts, the literal no longer matches.
//  4. SELF-CHECK (non-vacuous) — a planted un-captured fixture (no provenance), a
//     planted producer-drifted fixture (object-shaped `activeRuns`, a 4-key presence,
//     an invented session field) and a planted drifted Rust render literal are each
//     FLAGGED by the same detectors that return zero violations for the real tree.
import assert from "node:assert/strict";
import { mkdtemp, rm, mkdir, writeFile, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadWorkspace } from "../../../src/work.mjs";
import { startLauncher } from "../../../src/mesh/launcher.mjs";
import { startSession } from "../../../src/mesh/session.mjs";
import { fleetCurrentWorkLines } from "../../../ui/src/fleet/runs.mjs";
// The DECLARED one home for "which sessions survive the run filter, projected to their
// repo" (test/support/session-line-rule.mjs — the m49 rule module). Imported rather than
// re-implemented here: a third copy of the survivor projection is a third thing that can
// disagree with the formatter, which is the defect class this whole file exists over.
import { survivingRepos } from "../../support/session-line-rule.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, "..", "..", "..");
// The CROSS-LANGUAGE surface under this rule: the Rust desktop's view-model (the
// second implementation of ADR-004's reconciliation rule).
const RUST_VIEW_MODEL = "app/desktop/crates/core/src/view_model.rs";

const NODE_ID = "node-a";
const NOW = "2026-07-12T12:00:00.000Z";

// ─────────────────────────────────────────────────────────── detectors (pure) ──

// Every `REAL_CAPTURED_*` fixture const in a Rust source, with the contiguous comment
// block immediately above it (its capture provenance).
function capturedFixtures(source) {
  const fixtures = [];
  const re = /const\s+([A-Z0-9_]*REAL_CAPTURED[A-Z0-9_]*)\s*:\s*&str\s*=\s*r#"([\s\S]*?)"#;/g;
  for (const match of source.matchAll(re)) {
    const before = source.slice(0, match.index).split(/\r?\n/);
    const provenance = [];
    for (let i = before.length - 1; i >= 0; i -= 1) {
      const line = before[i].trim();
      if (line.startsWith("//")) provenance.unshift(line);
      else if (line === "") continue;
      else break;
    }
    fixtures.push({ name: match[1], raw: match[2], provenance: provenance.join("\n") });
  }
  return fixtures;
}

// PROOF 1 — a fixture must be CAPTURED from the real producer, and say how.
function provenanceViolations(fixtures) {
  const violations = [];
  for (const fixture of fixtures) {
    const said = /captur/i.test(fixture.provenance);
    const command = /\baof\s+[a-z][a-z-]*/.test(fixture.provenance);
    if (!said || !command) {
      violations.push(`${fixture.name}: no capture provenance — a cross-language fixture must record that it is REAL CAPTURED stdout and name the \`aof …\` command it came from (ADR-008)`);
    }
  }
  return violations;
}

// PROOF 2 — the fixture still matches what the producer emits TODAY. `producer` is a
// live record assembled by the real production seam in this test run.
function producerShapeViolations(fixtures, producer) {
  const violations = [];
  for (const fixture of fixtures) {
    let doc;
    try {
      doc = JSON.parse(fixture.raw);
    } catch (error) {
      violations.push(`${fixture.name}: not parseable as the producer's JSON stdout (${error.message})`);
      continue;
    }
    const nodes = Array.isArray(doc.nodes) ? doc.nodes : [];
    if (nodes.length === 0) {
      violations.push(`${fixture.name}: carries no nodes[] — this is not a real \`aof mesh status --json\` payload`);
      continue;
    }
    // The node THIS build produced (`local: true`) must carry the CURRENT producer's
    // exact record shape. (A peer node in a real capture may legitimately predate a
    // key — ADR-001's absent-is-benign additive evolution — so only element shape is
    // enforced there.)
    const local = nodes.find((node) => node.local === true);
    if (!local) {
      violations.push(`${fixture.name}: no \`local: true\` node — a real capture always names the machine it was taken on`);
      continue;
    }
    if (!local.presence || typeof local.presence !== "object") {
      violations.push(`${fixture.name}: the local node carries no presence record`);
      continue;
    }
    const keys = Object.keys(local.presence);
    if (JSON.stringify(keys) !== JSON.stringify(producer.presenceKeys)) {
      violations.push(`${fixture.name}: local presence keys ${JSON.stringify(keys)} have DRIFTED from the producer's ${JSON.stringify(producer.presenceKeys)} — re-capture the fixture`);
    }
    for (const node of nodes) {
      const presence = node.presence;
      if (!presence || typeof presence !== "object") continue;
      const runs = presence.activeRuns;
      if (runs !== undefined) {
        if (!Array.isArray(runs)) {
          violations.push(`${fixture.name}: ${node.nodeId}'s activeRuns is not an array`);
        } else {
          for (const run of runs) {
            if (typeof run !== "string") {
              violations.push(`${fixture.name}: ${node.nodeId}'s activeRuns carries a NON-STRING element ${JSON.stringify(run)} — the producer emits bare run-id strings (F1/F8)`);
            }
          }
        }
      }
      const sessions = presence.sessions;
      if (sessions !== undefined) {
        if (!Array.isArray(sessions)) {
          violations.push(`${fixture.name}: ${node.nodeId}'s sessions is not an array`);
        } else {
          for (const session of sessions) {
            const sessionKeys = Object.keys(session ?? {});
            if (JSON.stringify(sessionKeys) !== JSON.stringify(producer.sessionKeys)) {
              violations.push(`${fixture.name}: ${node.nodeId}'s session entry keys ${JSON.stringify(sessionKeys)} have DRIFTED from the producer's ${JSON.stringify(producer.sessionKeys)}`);
            }
          }
        }
      }
    }
  }
  return violations;
}

// The Rust string-literal form of a rendered line (`·` is written `\u{b7}` in the
// Rust source's escaped literals).
function rustLiteral(line) {
  return `"${line.replace(/·/g, "\\u{b7}")}"`;
}

// PROOF 3 — the OTHER implementation of the ADR-004 rule pins the SAME rendered line
// the JS implementation derives from the SAME captured payload.
function crossSurfaceDriftViolations(fixtures, rustSource) {
  const violations = [];
  for (const fixture of fixtures) {
    let doc;
    try {
      doc = JSON.parse(fixture.raw);
    } catch {
      continue; // already reported by producerShapeViolations
    }
    const local = (doc.nodes ?? []).find((node) => node.local === true);
    if (!local) continue;
    const lines = fleetCurrentWorkLines(local.presence ?? {}).lines;
    for (const line of lines) {
      if (!rustSource.includes(rustLiteral(line))) {
        violations.push(
          `${fixture.name}: the JS projection renders ${JSON.stringify(line)} for this captured payload, but the Rust surface pins no such assertion (${rustLiteral(line)}) — the two implementations of the ADR-004 rule have DRIFTED`,
        );
      }
    }
  }
  return violations;
}

// PROOF 5 (milestone 49 / story 01 / task 01 — ADR-010's NON-VACUITY CLAUSE) — the
// gate's OWN COVERAGE, because a gate that has never had a fixture for its subject is a
// gate nobody knows can fire.
//
// MEASURED, 2026-08-13, before this clause was written: NONE of the four fixtures
// captured before this story carried two live sessions in one repo — not merely on the
// `local: true` node the gate reads, but on ANY node of ANY of them. So
// `crossSurfaceDriftViolations` above was green, honest about everything it covered, and
// STRUCTURALLY BLIND to the repo-dedupe rule milestone 49 lands in both implementations
// at once. The only guaranteed-red gate on a JS-only edit was the plain JS pin, which is
// not cross-language at all.
//
// TWO THINGS THIS CLAUSE IS DELIBERATELY STRICTER ABOUT THAN "any fixture, any node":
//   · THE `local: true` NODE ONLY. `crossSurfaceDriftViolations` picks the local node and
//     derives no line from any peer, so a fixture whose duplicates sit on a PEER gives the
//     gate nothing to pin — and a clause satisfied by it would certify teeth that do not
//     exist.
//   · AN EMPTY `activeRuns`. With a run present the JS renders a `running N runs` line
//     too, while the Rust `current_work` short-circuits to `Running{…}` and never reads
//     sessions at all — so the payload's own agreement would be about the RUN line and the
//     dedupe rule would go unpinned one layer down. ADR-010 says "two live sessions in one
//     repo WITH NO RUN"; this is that, as a check rather than a hope.
// A session the run set already accounts for (`workspaceHasRun === true`) is not counted,
// for the same reason: it contributes no repo to the line the gate pins.
// The count map this clause reasons over: the SURVIVING sessions (the imported, declared
// projection) tallied by their exact repo string. ONE home inside this file — the lanes
// below read the duplicated repo off THIS map rather than guessing at it from a session's
// position in the array, which is not a fact the payload guarantees.
function survivingRepoCounts(local) {
  const counts = new Map();
  for (const repo of survivingRepos(local?.presence?.sessions)) {
    counts.set(repo, (counts.get(repo) ?? 0) + 1);
  }
  return counts;
}

// The SURVIVING sessions of the one repo that qualified the fixture — the repo read off
// the count map above, never off `sessions[0]`. Shared by the lanes below so the planted
// counter-example drives the SHIPPED derivation rather than a re-implemented twin of it
// (the m46 defect this file already names).
function duplicatedRepoSessions(local) {
  const duplicated = [...survivingRepoCounts(local)].find(([, count]) => count >= 2);
  if (!duplicated) return { repo: null, sessions: [] };
  const sessions = (Array.isArray(local?.presence?.sessions) ? local.presence.sessions : []).filter(
    (session) => session?.repo === duplicated[0] && session?.workspaceHasRun !== true,
  );
  return { repo: duplicated[0], sessions };
}

function duplicateRepoFixtureViolations(fixtures) {
  for (const fixture of fixtures) {
    let doc;
    try {
      doc = JSON.parse(fixture.raw);
    } catch {
      continue; // already reported by producerShapeViolations
    }
    const local = (doc.nodes ?? []).find((node) => node.local === true);
    if (!local) continue;
    const runs = local.presence?.activeRuns;
    if (!Array.isArray(runs) || runs.length > 0) continue;
    if ([...survivingRepoCounts(local).values()].some((count) => count >= 2)) return [];
  }
  return [
    "no captured fixture carries TWO LIVE SESSIONS IN ONE REPO on its `local: true` node with an EMPTY `activeRuns` — so `crossSurfaceDriftViolations` derives no counted line from any payload and cannot see a JS↔Rust divergence on the repo-dedupe rule at all (m49/ADR-010's non-vacuity clause). Capture one; do not hand-write it.",
  ];
}

// ─────────────────────────────────────────────────── the real producer (proof 2) ─

function manualTicker() {
  return {
    start(intervalSeconds, onTick) {
      return { intervalSeconds, onTick, stopped: false };
    },
    stop(handle) {
      handle.stopped = true;
    },
  };
}

// Assemble a presence record through the REAL production seams (a real session record
// minted by `startSession`, aggregated + published by the launcher's
// `assembleCurrentPresenceRecord`) — the SAME code path that produced the captured
// fixtures' stdout. Its SHAPE is the yardstick every captured fixture is held to.
async function produceProducerShape() {
  const tmp = await mkdtemp(path.join(os.tmpdir(), "aof-acd-captured-producer-"));
  const root = path.join(tmp, "repo");
  const home = path.join(tmp, "home");
  const workDir = path.join(root, "wiki", "work");
  await mkdir(workDir, { recursive: true });
  await mkdir(path.join(root, ".aof"), { recursive: true });
  await writeFile(
    path.join(root, ".aof", "aof.config.json"),
    `${JSON.stringify({ name: "fixture", work: { dir: "./wiki/work" }, mesh: { nodeId: NODE_ID, fabric: "tailscale", workspaceId: "ws-A" } }, null, 2)}\n`,
    "utf8",
  );
  const env = { AOF_GLOBAL_HOME: home };
  const ws = await loadWorkspace(root, undefined, { env });
  await startSession(ws, { nodeId: NODE_ID, workspaceId: "ws-A", repo: "aof", assistant: "claude-code", now: NOW });

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
  const record = handle.record;
  await rm(tmp, { recursive: true, force: true });
  return {
    record,
    presenceKeys: Object.keys(record),
    sessionKeys: Object.keys(record.sessions[0] ?? {}),
  };
}

async function readRustSurface() {
  return readFile(path.join(REPO, RUST_VIEW_MODEL), "utf8");
}

export const archTests = [
  {
    name: "arch/38 ADR-008 (acd-captured-producer-fixture): the cross-language (Rust) surface tests against REAL CAPTURED producer payloads, each carrying capture provenance — a hand-authored fixture fails CI",
    run: async () => {
      const rust = await readRustSurface();
      const fixtures = capturedFixtures(rust);
      // Non-vacuity: the rule has something to govern. Deleting the captured fixtures
      // (the easiest way to "make the test pass") fails HERE.
      assert.ok(
        fixtures.length >= 2,
        `${RUST_VIEW_MODEL} must test the reconciliation rule against REAL CAPTURED producer payloads (found ${fixtures.length})`,
      );
      const violations = provenanceViolations(fixtures);
      assert.deepEqual(violations, [], `a cross-language fixture is not provably captured from the producer:\n${violations.join("\n")}`);
    },
  },

  {
    // RED BY DESIGN, FOR THE SECOND TIME, AS OF milestone 50 / story 04 (2026-08-14) —
    // and this is the rule WORKING, not the rule failing. m50/ADR-008 decision 8 appended
    // `relaying` to the session entry (the worker's stated producer fact, hop 2 of four),
    // so the five `REAL_CAPTURED_*` payloads below — captured from a DEPLOYED build on the
    // operator's real fleet, and re-captured once already after m48 — now carry SIX-key
    // sessions against a producer that emits SEVEN, and are correctly reported as DRIFTED.
    // The discharge is the same one the m48 instance had, unchanged and repeated verbatim
    // below; the yardstick above tracks the producer BY CONSTRUCTION (it is read off the
    // real `readLiveSessions`), so there is nothing to "fix" in this file.
    //
    // ── THE ORIGINAL INSTANCE, KEPT because the pattern is the point ──
    // RED BY DESIGN AS OF milestone 48 / story 01 (2026-08-11). m48/ADR-005 grew the
    // session entry to the frozen ordered six, so the three `REAL_CAPTURED_*` payloads
    // below — captured from a DEPLOYED build on the operator's real fleet — carried
    // four-key sessions and were correctly reported as DRIFTED. This lane cannot be
    // discharged from a test run:
    // ADR-008 forbids hand-editing a captured payload (that is the F1/F7/F8 defect
    // class this file exists to make impossible), and `provenanceViolations` demands
    // each fixture be verbatim `aof mesh status --json` stdout. The discharge is an
    // OPERATOR-IN-THE-LOOP RE-CAPTURE — deploy the post-m48 build, run
    // `aof mesh status --json` on a machine with a live session, replace all three
    // payloads with the new stdout and update their provenance comments — and it is
    // worth doing ONCE, after stories 48/00 and 48/02 have landed too: a capture taken
    // mid-milestone would pin a half-milestone shape and need re-taking. Named in
    // ARCHITECTURE.md ADR-010's build note (C.3) so it is scheduled rather than
    // discovered. DO NOT make this green by editing a payload or weakening a detector.
    name: "arch/38 ADR-008 (acd-captured-producer-fixture): every captured fixture is still PRODUCER-SHAPED — compared against a record assembled by the REAL producer in this test (frozen five keys / string[] activeRuns / the producer's session keys), so a producer shape-change with a stale fixture fails CI",
    run: async () => {
      const producer = await produceProducerShape();
      assert.deepEqual(producer.presenceKeys, ["nodeId", "heartbeatAt", "activeRuns", "sessions", "aofVersion", "buildId"], "the producer's frozen record (the yardstick; buildId is the m42/item-1 sixth additive key)");
      // milestone 48 / story 01 (ADR-005) froze the ordered SIX; milestone 50 / ADR-008
      // decision 8 APPENDED `relaying` at the tail as the SEVENTH — the insertion-at-head
      // / append-at-tail / never-reorder shape m48 declares for this projection. This is
      // the YARDSTICK (what `readLiveSessions` emits today), not a captured fixture, so
      // it moves with the producer by design: that is the whole mechanism by which a
      // producer shape-change with a stale cross-language fixture fails CI below.
      assert.deepEqual(producer.sessionKeys, ["sessionId", "workspaceId", "repo", "assistant", "lastPingAt", "workspaceHasRun", "relaying"], "the producer's session projection (the yardstick)");

      const rust = await readRustSurface();
      const fixtures = capturedFixtures(rust);
      const violations = producerShapeViolations(fixtures, producer);
      assert.deepEqual(violations, [], `a captured fixture has drifted from the producer:\n${violations.join("\n")}`);
    },
  },

  {
    name: "arch/38 ADR-008 (acd-captured-producer-fixture): the TWO implementations of the ADR-004 rule agree on the SAME captured payload — the JS projection's line is the exact literal the Rust surface pins (the discipline that replaces the false 'both UIs call one function' guarantee)",
    run: async () => {
      const rust = await readRustSurface();
      const fixtures = capturedFixtures(rust);
      const violations = crossSurfaceDriftViolations(fixtures, rust);
      assert.deepEqual(violations, [], `the JS and Rust implementations of the reconciliation rule disagree on a captured payload:\n${violations.join("\n")}`);

      // Non-vacuity: the captured payloads genuinely exercise the SESSION path (an
      // all-idle fixture set would make the agreement check trivially true).
      const working = fixtures.filter((fixture) => {
        const doc = JSON.parse(fixture.raw);
        const local = (doc.nodes ?? []).find((node) => node.local === true);
        return fleetCurrentWorkLines(local?.presence ?? {}).state === "working";
      });
      assert.ok(working.length >= 1, "at least one captured payload carries live work (a session), so the agreement assertion has teeth");

      // NON-VACUITY, SECOND CLAUSE (m49/story 01/ADR-010) — and the sharper one: the
      // fixture set must exercise the REPO-DEDUPE rule, or this agreement check is green
      // over a branch it cannot see. Asserted HERE, in the lane it qualifies, so the gate
      // REFUSES TO RUN without such a payload rather than quietly certifying nothing.
      const vacuous = duplicateRepoFixtureViolations(fixtures);
      assert.deepEqual(vacuous, [], `the cross-surface agreement check has no teeth on the repo-dedupe rule:\n${vacuous.join("\n")}`);
    },
  },

  {
    name: "arch/38 ADR-008 (acd-captured-producer-fixture): self-check — an un-captured fixture, a producer-drifted fixture (object-shaped activeRuns / 4-key presence / invented session key) and a drifted Rust render literal are each FLAGGED by the same detectors the real tree passes (non-vacuous)",
    run: async () => {
      const producer = {
        presenceKeys: ["nodeId", "heartbeatAt", "activeRuns", "sessions", "aofVersion", "buildId"],
        // m48/ADR-005's ordered six — the same yardstick the producer-fed lane above
        // reads off `readLiveSessions`, restated here for the PLANTED fixtures only.
        sessionKeys: ["sessionId", "workspaceId", "repo", "assistant", "lastPingAt", "workspaceHasRun"],
      };

      // ── planted: a HAND-AUTHORED fixture (no capture provenance) ─────────────
      const plantedHandAuthored = `
    // A handy fixture for the desktop tests.
    const REAL_CAPTURED_MADE_UP: &str = r#"{"nodes":[{"nodeId":"n1","local":true,"presence":{"nodeId":"n1","heartbeatAt":"${NOW}","activeRuns":[],"sessions":[],"aofVersion":"0.1.0","buildId":"source"}}],"boards":[],"isControlNode":true}"#;
`;
      const handAuthored = capturedFixtures(plantedHandAuthored);
      assert.equal(handAuthored.length, 1, "the planted fixture is seen by the extractor");
      assert.equal(provenanceViolations(handAuthored).length, 1, "a fixture with no capture provenance is flagged");
      // …and the REAL fixtures pass the SAME detector.
      const rust = await readRustSurface();
      const real = capturedFixtures(rust);
      assert.deepEqual(provenanceViolations(real), [], "the real captured fixtures carry provenance");

      // ── planted: PRODUCER DRIFT — the F8/F1 object-shaped run element ────────
      const driftedRuns = capturedFixtures(`
    // REAL — captured live via \`aof mesh status --json\`.
    const REAL_CAPTURED_DRIFTED_RUNS: &str = r#"{"nodes":[{"nodeId":"n1","local":true,"presence":{"nodeId":"n1","heartbeatAt":"${NOW}","activeRuns":[{"ref":"35/02","title":"UI"}],"sessions":[],"aofVersion":"0.1.0","buildId":"source"}}],"boards":[],"isControlNode":true}"#;
`);
      const runsViolations = producerShapeViolations(driftedRuns, producer);
      assert.equal(runsViolations.length, 1, `an object-shaped activeRuns element is flagged (got ${JSON.stringify(runsViolations)})`);

      // ── planted: PRODUCER DRIFT — a presence that predates the additive fifth
      //    key on the node THIS build produced (a stale, never-re-captured fixture) ─
      const driftedKeys = capturedFixtures(`
    // REAL — captured live via \`aof mesh status --json\`.
    const REAL_CAPTURED_STALE_SHAPE: &str = r#"{"nodes":[{"nodeId":"n1","local":true,"presence":{"nodeId":"n1","heartbeatAt":"${NOW}","activeRuns":[],"aofVersion":"0.1.0"}}],"boards":[],"isControlNode":true}"#;
`);
      assert.equal(producerShapeViolations(driftedKeys, producer).length, 1, "a stale (pre-sessions) local presence shape is flagged");

      // ── planted: PRODUCER DRIFT — an invented session field ──────────────────
      const driftedSession = capturedFixtures(`
    // REAL — captured live via \`aof mesh status --json\`.
    const REAL_CAPTURED_DRIFTED_SESSION: &str = r#"{"nodes":[{"nodeId":"n1","local":true,"presence":{"nodeId":"n1","heartbeatAt":"${NOW}","activeRuns":[],"sessions":[{"workspaceId":"ws-A","repo":"aof","assistant":"claude-code","lastPingAt":"${NOW}","ref":"38/00"}],"aofVersion":"0.1.0","buildId":"source"}}],"boards":[],"isControlNode":true}"#;
`);
      assert.equal(producerShapeViolations(driftedSession, producer).length, 1, "a session entry carrying a key the producer never emits is flagged");

      // ── planted: CROSS-SURFACE DRIFT — the Rust surface renders the same
      //    captured payload differently from the JS projection ───────────────────
      const driftedRust = rust.replaceAll("working \\u{b7} aof (session)", "working: aof [session]");
      assert.notEqual(driftedRust, rust, "the planted mutation genuinely changed the Rust surface's pinned literal");
      const driftViolations = crossSurfaceDriftViolations(real, driftedRust);
      assert.ok(driftViolations.length >= 1, `a drifted Rust render literal is flagged (got ${JSON.stringify(driftViolations)})`);
      // …and the REAL Rust surface passes the SAME detector.
      assert.deepEqual(crossSurfaceDriftViolations(real, rust), [], "the real Rust surface agrees with the JS projection on every captured payload");
    },
  },

  // ───────────────────────────────────────────────────────────────────────────────
  // MILESTONE 49 / story 01 / task 01 (tasks/01_both-surfaces-say-the-same-words.feature;
  // ADR-010) — THE TEETH. Task 00 lands the repo-dedupe rule in both languages; these
  // lanes are what make a divergence between them FAIL CI, plus the non-vacuity clause
  // that stops a future re-capture quietly dropping the payload that does it.
  // ───────────────────────────────────────────────────────────────────────────────

  {
    // Scenario: a captured payload finally carries two live sessions in one repo.
    // Against the pre-m49 tree this lane FAILS at its first assertion: there were four
    // fixtures and none doubled a repo, on any node.
    name: "arch/49 ADR-010 (acd-captured-producer-fixture): a CAPTURED payload finally carries two live sessions in ONE repo on its local node — the case the cross-language gate was structurally blind to",
    run: async () => {
      const rust = await readRustSurface();
      const fixtures = capturedFixtures(rust);
      assert.deepEqual(duplicateRepoFixtureViolations(fixtures), [], "at least one captured fixture's `local: true` node holds a repo with TWO OR MORE live sessions");
      assert.ok(fixtures.length >= 5, `the captured fixture set is at least five (found ${fixtures.length})`);

      // The qualifying fixture, found the same way the clause finds it.
      const dup = fixtures.find((fixture) => duplicateRepoFixtureViolations([fixture]).length === 0);
      assert.ok(dup, "the qualifying fixture is identifiable");
      const local = JSON.parse(dup.raw).nodes.find((node) => node.local === true);

      // THE DUPLICATED REPO IS READ OFF THE CLAUSE'S OWN COUNT MAP, never off
      // `sessions[0]` (review fix, QA F1). A capture's session order is the store's, not
      // the rule's: the perfectly legal re-capture ordering `[demo, aof, aof]` satisfies
      // the clause on `aof` while `sessions[0].repo` is `demo` — a filter keyed on the
      // first session would then yield ONE element and fail here for a payload that is
      // entirely correct, and (worse) had it yielded two, every assertion below would
      // have been evaluating the WRONG sessions. Green today only because the shipped
      // fixture happens to be all-`aof`; the lane below drives that ordering through this
      // same derivation.
      const { repo: duplicatedRepo, sessions: sameRepo } = duplicatedRepoSessions(local);
      assert.ok(duplicatedRepo, "the clause's own count map names a repo holding two or more surviving sessions");
      assert.ok(sameRepo.length >= 2, "…and the two same-repo sessions are on that local node");

      // They are DISTINCT RECORDS, not one session read twice: m48/ADR-002 keys a session
      // on the 4-part `(nodeId, workspaceId, assistant, sessionId)` leaf, so distinct
      // `sessionId`s OR distinct workspaces is what makes two records. (On a
      // case-insensitive filesystem two ids differing only in CASE collapse to one record
      // — m48/OUTCOME's open Gap — so the ids must differ by more than case.)
      const ids = sameRepo.map((session) => session.sessionId);
      const workspaces = sameRepo.map((session) => session.workspaceId);
      const distinctRecords = new Set(ids).size === ids.length || new Set(workspaces).size === workspaces.length;
      assert.ok(distinctRecords, `the same-repo sessions are distinct records (sessionIds ${JSON.stringify(ids)}, workspaces ${JSON.stringify(workspaces)})`);
      assert.equal(
        new Set(ids.map((id) => String(id).toLowerCase())).size,
        new Set(ids).size,
        "…and they were not made distinct by letter case alone (a case-insensitive filesystem would have written ONE record)",
      );

      // The JS line derived from that fixture's local node carries the count form.
      const [line, ...rest] = fleetCurrentWorkLines(local.presence).lines;
      assert.deepEqual(rest, [], "the local node renders exactly ONE line — no run line beside it");
      assert.ok(line.includes(" \u{d7}2"), `the derived line carries the count form " ×2" (got ${JSON.stringify(line)})`);
    },
  },

  {
    // Scenario: the lane above survives a LEGAL re-capture whose session order puts a
    // singleton first (review fix, QA F1 — a latent false red, and the nastier half is
    // that a passing version of it would have asserted over the WRONG sessions).
    //
    // `[demo, aof, aof]` is not a contrived ordering: `sessions[]` arrives in the store's
    // order, which no rule fixes, and ADR-008 REQUIRES re-capture whenever the producer
    // changes shape — so the next capture may legitimately arrive in any order at all. The
    // clause qualifies this payload on `aof`; `sessions[0].repo` is `demo`.
    name: "arch/49 ADR-010 (acd-captured-producer-fixture): a duplicate-repo payload ordered `[demo, aof, aof]` — a singleton FIRST — is qualified and dissected correctly, off the count map and not off sessions[0]",
    run: async () => {
      const session = (id, workspace, repo) =>
        `{"sessionId":"${id}","workspaceId":"${workspace}","repo":"${repo}","assistant":"claude-code","lastPingAt":"${NOW}","workspaceHasRun":false}`;
      const reordered = capturedFixtures(`
    // REAL — captured live via \`aof mesh status --json\`.
    const REAL_CAPTURED_REORDERED: &str = r#"{"nodes":[{"nodeId":"n1","local":true,"stale":false,"presence":{"nodeId":"n1","heartbeatAt":"${NOW}","activeRuns":[],"sessions":[${session("s-demo", "ws-3", "demo")},${session("s-aof-1", "ws-1", "aof")},${session("s-aof-2", "ws-2", "aof")}],"aofVersion":"0.1.0","buildId":"source"}}],"boards":[],"isControlNode":true}"#;
`);
      assert.equal(reordered.length, 1, "the planted payload is seen by the extractor");
      const local = JSON.parse(reordered[0].raw).nodes.find((node) => node.local === true);
      assert.equal(local.presence.sessions[0].repo, "demo", "the ordering under test really does put the SINGLETON first");

      // It is a payload the SHIPPED clause accepts — so the lane above would run over it.
      assert.deepEqual(duplicateRepoFixtureViolations(reordered), [], "the clause qualifies this payload (on `aof`, its doubled repo)");

      // THE OLD EXPRESSION IS DRIVEN TO ITS FAILURE, not merely described: keying on the
      // first session yields ONE element, and `assert.ok(sameRepo.length >= 2)` would have
      // gone red on an entirely correct payload.
      const keyedOnFirst = local.presence.sessions.filter((s) => s.repo === local.presence.sessions[0].repo);
      assert.equal(keyedOnFirst.length, 1, "the pre-fix keying (sessions[0].repo) collects ONE session — the false red");

      // …and the shipped derivation collects the right two, so every assertion the lane
      // above makes over them is about the sessions the clause actually grouped.
      const { repo, sessions } = duplicatedRepoSessions(local);
      assert.equal(repo, "aof", "the derivation names the repo the COUNT MAP doubled");
      assert.deepEqual(sessions.map((s) => s.sessionId), ["s-aof-1", "s-aof-2"], "…and collects exactly that repo's two surviving sessions");
      assert.deepEqual(
        sessions.map((s) => s.repo),
        ["aof", "aof"],
        "…never the singleton `demo`, which is what the pre-fix filter would have handed the distinct-record and case clauses",
      );

      // The rendered line for that ordering is the counted, sorted one — the count is on
      // `aof`, and `demo` (one session) carries no sign.
      assert.deepEqual(fleetCurrentWorkLines(local.presence).lines, ["working \u{b7} aof \u{d7}2, demo (session)"]);
    },
  },

  {
    // Scenario: the two implementations agree on the duplicate-repo payload, and the gate
    // is what says so — same detector, same code path as the four existing payloads, no
    // special case for the new one.
    name: "arch/49 ADR-010 (acd-captured-producer-fixture): the gate NOW SEES the repo-dedupe rule — the Rust surface pins the exact counted line the JS renders for the captured duplicate-repo payload, with the sign as a RAW U+00D7",
    run: async () => {
      const rust = await readRustSurface();
      const fixtures = capturedFixtures(rust);
      assert.deepEqual(crossSurfaceDriftViolations(fixtures, rust), [], "no cross-surface drift over EVERY captured fixture, the new one included");

      const dup = fixtures.find((fixture) => duplicateRepoFixtureViolations([fixture]).length === 0);
      const local = JSON.parse(dup.raw).nodes.find((node) => node.local === true);
      const line = fleetCurrentWorkLines(local.presence).lines[0];

      // The gate and the source are COMPARED, never eyeballed: the literal the Rust
      // surface must contain is exactly what `rustLiteral` produces for that line.
      const literal = rustLiteral(line);
      assert.ok(rust.includes(literal), `the Rust surface contains the JS-rendered line as a quoted literal (${literal})`);
      assert.equal(literal, `"${line.replace("·", "\\u{b7}")}"`, "…and that literal is the shipped escape's own output, not a hand-written twin");

      // TRAP 2, made failable. `rustLiteral` escapes `·` and NOTHING ELSE, so the
      // multiplication sign must be a RAW U+00D7 codepoint in the Rust source. A Rust
      // assertion spelled `\u{d7}2` agrees perfectly at RUNTIME and still makes this gate
      // report a drift that does not exist — the confusing red a builder would otherwise
      // hit at the end of the commit and be tempted to resolve by weakening the detector.
      const at = literal.indexOf("2", literal.indexOf("\u{d7}"));
      assert.equal(literal.codePointAt(at - 1), 0x00d7, "the sign in the required literal is U+00D7, read as a codepoint");
      assert.equal(rust.includes(literal.replace("\u{d7}", "\\u{d7}")), false, "…and the Rust source does NOT spell that line's sign as the escape \\u{d7}");

      // AND THE GATE GOES RED WHEN THE TWO RULES DISAGREE — the whole point of the
      // fifth fixture, proven rather than asserted. A Rust surface that had NOT
      // deduplicated would pin the pre-m49 line for this payload; plant exactly that.
      const preM49 = line.replace(/ \u{d7}2/u, `, ${local.presence.sessions[0].repo}`);
      assert.notEqual(preM49, line, "the plant genuinely differs from the delivered line");
      const dividedRust = rust.replaceAll(literal, rustLiteral(preM49));
      assert.notEqual(dividedRust, rust, "the planted mutation genuinely changed the Rust surface's pinned literal");
      const drift = crossSurfaceDriftViolations([dup], dividedRust);
      assert.equal(drift.length, 1, `a Rust surface that did not deduplicate is FLAGGED against the JS that does (got ${JSON.stringify(drift)})`);
    },
  },

  {
    // Scenario: removing the duplicate-repo fixture fails CI instead of returning the
    // gate to blindness. The PLANT is asserted to have landed BEFORE the detector runs —
    // a string-replace that matched nothing would make a detector look sharp while
    // proving nothing (the m46 defect in `affordanceFormViolations`, where the one plant
    // was fed to a locally re-implemented copy so the SHIPPED function was never once
    // driven to a violation).
    name: "arch/49 ADR-010 (acd-captured-producer-fixture): DELETING the duplicate-repo fixture fails CI instead of silently returning the gate to blindness (non-vacuous, through the shipped clause)",
    run: async () => {
      const rust = await readRustSurface();
      const real = capturedFixtures(rust);
      assert.deepEqual(duplicateRepoFixtureViolations(real), [], "the real source satisfies the clause with no violation");

      // Delete the qualifying fixture from a COPY of the real source — found by the
      // clause's own predicate, so this survives a future rename of the const.
      const dup = real.find((fixture) => duplicateRepoFixtureViolations([fixture]).length === 0);
      const planted = rust.replace(`const ${dup.name}: &str = r#"${dup.raw}"#;`, "");
      assert.notEqual(planted, rust, "the planted copy is genuinely different from the real source");
      const plantedFixtures = capturedFixtures(planted);
      assert.equal(plantedFixtures.length, real.length - 1, "…and the copy carries exactly one fewer captured fixture");

      const violations = duplicateRepoFixtureViolations(plantedFixtures);
      assert.equal(violations.length, 1, `exactly one violation is reported (got ${JSON.stringify(violations)})`);
      assert.match(violations[0], /two live sessions in one repo/i, "…and its text names what is missing");

      // …and the clause reports NOTHING for the real source, through the SAME code path.
      assert.deepEqual(duplicateRepoFixtureViolations(capturedFixtures(rust)), [], "the real source passes the same detector");
    },
  },

  {
    // Scenario: a duplicate-repo fixture whose duplicates sit on a PEER node does not
    // count. The sharpest thing in this gate and the one a reviewer cannot see in a diff:
    // `crossSurfaceDriftViolations` reads ONLY the `local: true` node, so the natural
    // "any node, any fixture" clause would pass on a payload that gives the gate no teeth
    // whatsoever — a green non-vacuity assertion over a blind gate.
    name: "arch/49 ADR-010 (acd-captured-producer-fixture): a duplicate-repo payload whose duplicates sit on a PEER node does NOT satisfy the clause — the gate derives no line from a peer",
    run: async () => {
      const peerOnly = capturedFixtures(`
    // REAL — captured live via \`aof mesh status --json\`.
    const REAL_CAPTURED_PEER_DUP: &str = r#"{"nodes":[{"nodeId":"peer","stale":false,"presence":{"nodeId":"peer","heartbeatAt":"${NOW}","activeRuns":[],"sessions":[{"sessionId":"s1","workspaceId":"ws-1","repo":"demo","assistant":"claude-code","lastPingAt":"${NOW}","workspaceHasRun":false},{"sessionId":"s2","workspaceId":"ws-1","repo":"demo","assistant":"claude-code","lastPingAt":"${NOW}","workspaceHasRun":false}],"aofVersion":"0.1.0","buildId":"source"}},{"nodeId":"n1","local":true,"stale":false,"presence":{"nodeId":"n1","heartbeatAt":"${NOW}","activeRuns":[],"sessions":[{"sessionId":"s3","workspaceId":"ws-2","repo":"aof","assistant":"claude-code","lastPingAt":"${NOW}","workspaceHasRun":false}],"aofVersion":"0.1.0","buildId":"source"}}],"boards":[],"isControlNode":true}"#;
`);
      assert.equal(peerOnly.length, 1, "the planted fixture is seen by the extractor");
      // The peer genuinely holds two sessions in one repo…
      const peer = JSON.parse(peerOnly[0].raw).nodes.find((node) => node.nodeId === "peer");
      assert.equal(peer.presence.sessions.length, 2, "the peer node really does hold two same-repo sessions");
      assert.equal(fleetCurrentWorkLines(peer.presence).lines[0], "working \u{b7} demo \u{d7}2 (session)", "…and a counted line would be derivable FROM IT, if anything derived one");

      // …and the clause still reports a violation, because the gate never looks there.
      assert.equal(duplicateRepoFixtureViolations(peerOnly).length, 1, "the clause is satisfied ONLY by the node the gate derives its line from");

      // Proof that the gate derives no line from the peer: run the SHIPPED detector
      // against an EMPTY Rust source, which reports one violation per line it required.
      const required = crossSurfaceDriftViolations(peerOnly, "");
      assert.equal(required.length, 1, `exactly one line is required of the Rust source (got ${JSON.stringify(required)})`);
      assert.match(required[0], /working \\u\{b7\} aof \(session\)/, "…and it is the LOCAL node's line — nothing about the peer's two sessions is ever pinned");
    },
  },

  {
    // Scenario: the duplicate-repo fixture carries no active run, so the line it pins is
    // the dedupe line. With a run present the JS renders two lines while the Rust renders
    // only the run line (its `current_work` short-circuit), so the gate would happily pin
    // `running 1 run`, agree, and still see nothing about deduplication. SESSION_WITH_RUN
    // is exactly that shape today — asserted here as the counter-example.
    name: "arch/49 ADR-010 (acd-captured-producer-fixture): the duplicate-repo fixture carries NO active run, so the literal the gate requires is the (session) line and not a `running N runs` line",
    run: async () => {
      const rust = await readRustSurface();
      const fixtures = capturedFixtures(rust);
      const dup = fixtures.find((fixture) => duplicateRepoFixtureViolations([fixture]).length === 0);
      const local = JSON.parse(dup.raw).nodes.find((node) => node.local === true);

      assert.deepEqual(local.presence.activeRuns, [], "the duplicate-repo fixture's local node has an EMPTY activeRuns");
      const lines = fleetCurrentWorkLines(local.presence).lines;
      assert.equal(lines.length, 1, "the JS formatter derives exactly ONE line from it");
      assert.ok(lines[0].endsWith(" (session)"), "…and that line is the `(session)` line");
      assert.equal(lines[0].startsWith("running "), false, "…never a `running N runs` line");
      assert.ok(rust.includes(rustLiteral(lines[0])), "so the literal the gate then requires of the Rust source is that (session) line");

      // The counter-example, from the fixture set itself: a payload WITH a run pins the
      // run line and its session contributes nothing — which is why a duplicate-repo
      // fixture carrying a run would leave the dedupe rule unpinned one layer down.
      const withRun = fixtures.find((fixture) => {
        const node = (JSON.parse(fixture.raw).nodes ?? []).find((n) => n.local === true);
        return (node?.presence?.activeRuns ?? []).length > 0;
      });
      assert.ok(withRun, "the fixture set still carries a payload with a running run");
      const runLocal = JSON.parse(withRun.raw).nodes.find((node) => node.local === true);
      assert.deepEqual(fleetCurrentWorkLines(runLocal.presence).lines, ["running 1 run"], "…and it pins the RUN line, its live session contributing nothing");
    },
  },

  {
    // Scenario Outline: a fifth fixture that was TYPED rather than captured is refused —
    // each row is a way a hand-typed fixture gets in, and each is already refused by a
    // shipped detector. Rows 3-6 were proven non-vacuous by the self-check lane above;
    // they are re-driven here because the FIFTH fixture is the first one authored after
    // those plants were written, and the claim is "the new fixture passes the same
    // detectors", not "the detectors exist".
    name: "arch/49 ADR-010 (acd-captured-producer-fixture): a fifth fixture that was TYPED rather than captured is refused by the shipped detectors (Examples: 7 rows), and the real five pass every one of them",
    run: async () => {
      // DERIVED FROM THE REAL PRODUCER, not hand-listed. This stub used to hard-code the
      // key lists, and at milestone 50 that made it the LAST stale copy of the yardstick:
      // ADR-008 appended `relaying` as the session entry's seventh key, the main clause
      // above moved with the producer as designed, the fixtures were re-captured — and
      // this row then failed, because line 791 asserts the REAL fixtures pass
      // `producerShapeViolations` against *this* object. A self-check holding its own
      // frozen idea of the producer refuses every legitimate re-capture, which is the
      // opposite of what ADR-008 requires. Sharing the one producer seam keeps every row
      // below meaningful (each plants a shape the producer does not emit, whatever the
      // producer currently emits) and cannot go stale again.
      const producer = await produceProducerShape();
      const dupSessions = `[{"sessionId":"s1","workspaceId":"ws-1","repo":"demo","assistant":"claude-code","lastPingAt":"${NOW}","workspaceHasRun":false},{"sessionId":"s2","workspaceId":"ws-1","repo":"demo","assistant":"claude-code","lastPingAt":"${NOW}","workspaceHasRun":false}]`;
      const payload = (sessions = dupSessions, { local = true, runs = "[]" } = {}) =>
        `{"nodes":[{"nodeId":"n1",${local ? `"local":true,` : ""}"stale":false,"presence":{"nodeId":"n1","heartbeatAt":"${NOW}","activeRuns":${runs},"sessions":${sessions},"aofVersion":"0.1.0","buildId":"source"}}],"boards":[],"isControlNode":true}`;
      const plant = (comment, body) => capturedFixtures(`
    ${comment}
    const REAL_CAPTURED_FIFTH_CANDIDATE: &str = r#"${body}"#;
`);

      const rows = [
        {
          case: "no provenance at all",
          fixture: plant("// A handy fixture for the desktop tests: two sessions, one repo.", payload()),
          detector: (fixtures) => provenanceViolations(fixtures),
          detectorName: "provenanceViolations",
        },
        {
          case: "provenance that names no command",
          fixture: plant("// REAL — captured live from the fleet, honest.", payload()),
          detector: (fixtures) => provenanceViolations(fixtures),
          detectorName: "provenanceViolations",
        },
        {
          case: "a session entry the producer never emits (an extra key beside the ordered six)",
          fixture: plant("// REAL — captured live via \\`aof mesh status --json\\`.", payload(`[{"sessionId":"s1","workspaceId":"ws-1","repo":"demo","assistant":"claude-code","lastPingAt":"${NOW}","workspaceHasRun":false,"ref":"49/01"}]`)),
          detector: (fixtures) => producerShapeViolations(fixtures, producer),
          detectorName: "producerShapeViolations",
        },
        {
          case: "a session entry missing the producer's keys (the pre-m48 four-key shape)",
          fixture: plant("// REAL — captured live via \\`aof mesh status --json\\`.", payload(`[{"workspaceId":"ws-1","repo":"demo","assistant":"claude-code","lastPingAt":"${NOW}"}]`)),
          detector: (fixtures) => producerShapeViolations(fixtures, producer),
          detectorName: "producerShapeViolations",
        },
        {
          case: "a stale local presence shape (not the producer's frozen key order)",
          fixture: capturedFixtures(`
    // REAL — captured live via \\\`aof mesh status --json\\\`.
    const REAL_CAPTURED_FIFTH_CANDIDATE: &str = r#"{"nodes":[{"nodeId":"n1","local":true,"stale":false,"presence":{"nodeId":"n1","heartbeatAt":"${NOW}","activeRuns":[],"aofVersion":"0.1.0"}}],"boards":[],"isControlNode":true}"#;
`),
          detector: (fixtures) => producerShapeViolations(fixtures, producer),
          detectorName: "producerShapeViolations",
        },
        {
          case: "activeRuns carrying {ref,title} objects instead of id strings",
          fixture: plant("// REAL — captured live via \\`aof mesh status --json\\`.", payload(dupSessions, { runs: `[{"ref":"49/01","title":"dedupe"}]` })),
          detector: (fixtures) => producerShapeViolations(fixtures, producer),
          detectorName: "producerShapeViolations",
        },
        {
          // Row 7 matters more than it looks: a payload with no local node is skipped by
          // `crossSurfaceDriftViolations` entirely, so it would be a fixture that adds a
          // const and no coverage at all.
          case: "no local node",
          fixture: plant("// REAL — captured live via \\`aof mesh status --json\\`.", payload(dupSessions, { local: false })),
          detector: (fixtures) => producerShapeViolations(fixtures, producer),
          detectorName: "producerShapeViolations",
        },
      ];

      const rust = await readRustSurface();
      const real = capturedFixtures(rust);
      for (const row of rows) {
        assert.equal(row.fixture.length, 1, `${row.case}: the planted candidate is seen by the extractor`);
        assert.ok(row.detector(row.fixture).length >= 1, `${row.case}: ${row.detectorName} reports a violation`);
        // …and the four existing fixtures PLUS the real fifth report none through that
        // same detector.
        assert.deepEqual(row.detector(real), [], `${row.case}: the real captured fixtures pass ${row.detectorName}`);
      }
      assert.ok(real.length >= 5, "…and there are five of them");
    },
  },

  {
    // Scenario: the four existing captured payloads still pass every clause, unchanged.
    // Adding a fixture must not move the four that exist.
    //
    // "None of the four payload strings was edited" is a claim about THIS DIFF, and the
    // evidence for it is the diff itself — a byte-level pin here (a hash of each payload)
    // would refuse the next LEGITIMATE re-capture, which ADR-008 requires rather than
    // forbids. What is asserted instead is the thing an edit would have to break to
    // matter: each of the four still renders the exact line it rendered before this story,
    // and every shipped detector still reports zero over the whole set.
    name: "arch/49 ADR-010 (acd-captured-producer-fixture): the four payloads captured before this story still render their own lines, unchanged — the fifth is additive",
    run: async () => {
      const rust = await readRustSurface();
      const fixtures = capturedFixtures(rust);
      const lineOf = (fixture) => {
        const local = (JSON.parse(fixture.raw).nodes ?? []).find((node) => node.local === true);
        return fleetCurrentWorkLines(local?.presence ?? {}).lines.join(" / ");
      };
      const byName = new Map(fixtures.map((fixture) => [fixture.name, lineOf(fixture)]));
      assert.equal(byName.get("REAL_CAPTURED_LIVE_SESSION_STATUS"), "working \u{b7} aof (session)");
      assert.equal(byName.get("REAL_CAPTURED_TWO_SESSIONS_STATUS"), "working \u{b7} aof, beta (session)");
      assert.equal(byName.get("REAL_CAPTURED_TWO_SESSIONS_NON_ALPHA_STATUS"), "working \u{b7} aof, pilot-app-portal (session)");
      assert.equal(byName.get("REAL_CAPTURED_SESSION_WITH_RUN_STATUS"), "running 1 run");

      // AT LEAST ONE fixture satisfies the duplicate-repo clause. `>= 1`, not `=== 1`
      // (review fix): an equality here is a ratchet pointing the wrong way — it would
      // refuse a future SIXTH capture that also doubled a repo, penalising added coverage
      // of the very case this story exists for. That the four are untouched is already
      // carried by the four literal line pins above, which is the claim that matters.
      const qualifying = fixtures.filter((fixture) => duplicateRepoFixtureViolations([fixture]).length === 0);
      assert.ok(qualifying.length >= 1, `at least one captured fixture exercises the duplicate-repo case (got ${JSON.stringify(qualifying.map((f) => f.name))})`);
      assert.deepEqual(provenanceViolations(fixtures), [], "every fixture, old and new, carries capture provenance");
      assert.deepEqual(crossSurfaceDriftViolations(fixtures, rust), [], "every fixture, old and new, agrees across the two implementations");
    },
  },
];
