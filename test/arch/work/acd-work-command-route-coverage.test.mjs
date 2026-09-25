// Fitness function for milestone 08 / ADR-004 inv. 1, GENERALISED by milestone 15
// / ADR-005 from "exactly six" to REGISTRY-DERIVED (route ↔ command BIJECTION):
// "The /api/work/<op> set served by board-ui.mjs is in BIJECTION with the
//  registry's work:* commands — every served route maps to a registered work:<op>
//  command, AND every registered work:* command has a served route. The set is
//  DERIVED from listCommands() (NOT hard-coded), so adding work:doctor (the 7th) —
//  or any future work:* — is covered with no edit ('no new door')."
//
// Structural proof: source-grep `board-ui.mjs` for the `pathname === "/api/work/<op>"`
// route literals, and derive the command op set from
// `listCommands().filter(c=>c.id.startsWith("work:")).map(c=>c.id.slice(5))`. Assert
// the two-way map: (a) every served route maps to a registered work:<op> command;
// (b) every registered work:* command has a served route. (graph:*/project:*/
// import:* are NOT served on /api/work and are correctly excluded by the prefix.)
// Behavioural proof (the acd-board-single-server stand-up idiom): build a temp
// fixture stream, stand up `serveSetupUi(null,{projectDir,port:0})`, loop the
// DERIVED op set hitting each `/api/work/<op>` route, asserting a JSON envelope
// (200/4xx) — i.e. each route is served via the registry, not 404-unrouted.
import assert from "node:assert/strict";
import { mkdtemp, rm, mkdir, writeFile, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getCommand, listCommands } from "../../../src/command-core.mjs";
import { serveSetupUi } from "../../../src/setup-ui.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const BOARD_UI = path.join(repoRoot, "src", "board-ui.mjs");

// Commands whose BOARD face is deliberately deferred — registered into the core
// (so the CLI bijection covers them, acd-work-command-cli-bijection) but NOT
// served on /api/work. They are excluded from the /api/work bijection here exactly
// as the notion:* prefix excludes the milestone-17/18 commands — a sanctioned,
// documented carve-out, not a regression.
//
// Milestone 21 (ADR-001/ADR-003) wires the run READ path: it surfaces
// `work:run-status` on the new `/api/work/run-status` route, so `run-status`
// LEAVES this carve-out and the route↔command bijection re-tightens to require it
// (honouring 19/R1 — surfacing a command-core command trips the route-coverage
// guard, not just the CLI bijection; m19's RETROSPECTIVE foretold this entry
// coming out with no further edit). `run-start` + `run-complete` STAY deferred:
// they are NOT board read routes — the rerun reaches the agent via the m03 ADR-006
// terminal launch (typed PTY input), never a `/api/work` route (21/ADR-002).
// `run-retry` (m20/ADR-003) likewise stays deferred — m21 ships the FRESH path;
// m20's resume is a later additive delta on the same affordance.
//
// `insert-milestone` / `insert-uat` (m41/story 02, ADR-002) stay deferred too:
// ARCHITECTURE ADR-002 scopes the milestone to "a new mechanical CLI subcommand
// family" wired through cli.mjs + the acd-work-command-cli-bijection guard only —
// no board affordance is asked for (framing/placement is an operator CLI action,
// mirroring the existing `add-*` skills, which are also CLI/prompt-only, never a
// board button). A future board "insert" UI is a separate, deliberate decision —
// this carve-out documents the deferral, not an oversight. `insert-story` (m41/
// story 03) joins the SAME carve-out for the SAME reason — the nested axis is
// the same CLI-only mechanical surface, no board affordance requested.
// `insert-chore` / `promote-gap` (m39/story 03, ADR-001) join the SAME carve-out
// for the SAME reason: the chore insert seam + the gap-promotion verb are
// mechanical CLI actions, no board affordance requested here either.
// `upgrade` (m40/story 02, ADR-005) joins the SAME carve-out for the SAME
// reason: ARCHITECTURE.md's story boundary scopes this milestone to "the
// work-upgrade.mjs engine, the `aof upgrade` CLI face" — no board affordance
// is asked for (a data-mutating migration run is a deliberate CLI/operator
// action, mirroring `aof migrate`'s CLI-only face). A future board "upgrade"
// button is a separate, deliberate decision — this carve-out documents the
// deferral, not an oversight.
const BOARD_DEFERRED = new Set([
  "run-start",
  "run-complete",
  "run-retry",
  // 348 auto-resume — `resume` is run-retry's re-entry face (the sweep + the act
  // over the SAME store authority), so it inherits run-retry's deferral for the
  // SAME reason: resuming a killed run reaches the agent through the m03/ADR-006
  // terminal launch, never a `/api/work` route. A board "what is waiting to come
  // back" panel is a real future affordance — a separate, deliberate decision, and
  // this carve-out records the deferral rather than an oversight.
  // milestone 54 / story 01 (54/ADR-003 §4) — `grade` is deferred for a reason no other
  // member has: a `GET /api/work/grade` that executed the declared rubric would let a PAGE
  // LOAD spawn a test run, and this very gate stands the server up and hits every served
  // route. The grade still reaches the board — it rides the run record (`brief.grade`,
  // 54/ADR-008 §3) and arrives through `work:run-status` unchanged, so `src/board-ui.mjs`
  // and `ui/` gain nothing. This is a deliberate carve-out, not an oversight.
  "grade",
  // milestone 96 / story 04 (96/ADR-008) — `regression-gate` is deferred for exactly `grade`'s
  // reason, and it is the stronger case of the two: a `GET /api/work/regression-gate` would let a
  // PAGE LOAD run the WHOLE tree, and this very gate stands the server up and hits every served
  // route. What the gate produces is a FILE in the milestone's folder (`REGRESSION.md`), and it is
  // deferred on the same terms as 78's `EXECUTION.md`: neither is in `src/work/artifacts.mjs`'s
  // requestable manifest, so neither is board-readable today, and adding a read affordance is a
  // separate, deliberate decision. This entry records both deferrals, not an oversight.
  "regression-gate",
  "resume",
  "insert-milestone",
  "insert-uat",
  "insert-story",
  "insert-chore",
  "promote-gap",
  // milestone 71 / story 01 (71/ADR-004) — `promote-finding` inherits `promote-gap`'s deferral for
  // the same reason and one stronger: the promotion is a VERB the review lane calls, and ADR-004
  // refuses even a `/aof:` door for it, because a second entry point bypasses ADR-003's four
  // ordered questions — the only bound between a capped review loop and an unbounded backlog. A
  // board BUTTON would be exactly that door. This carve-out records the decision, not an oversight.
  "promote-finding",
  // milestone 127 / story 02 (127/ADR-003 §1) — `promote` inherits the insert family's carve-out
  // (a mechanical CLI placement act, and no board affordance was asked for) and one reason
  // stronger: the mint belongs where the operator's STREAM is (ADR-003 §7 — `work:continue|refine|
  // verify` refuse a backlog ref as `phase-backlog-ref` for the same reason, task 04), and a served
  // `/api/work/promote` would let the board HOST mint a number from its own copy of the stream. A
  // deliberate carve-out recorded here, not an oversight.
  "promote",
  // milestone 127 / story 03 (127/ADR-004 §1) — `archive` inherits `promote`'s carve-out: a
  // mechanical CLI act over the operator's own tree (a done driver's folder moves under
  // `archive/`), no board affordance was asked for, and a served `/api/work/archive` would let
  // the board HOST move folders in a checkout it does not own. A deliberate carve-out recorded
  // here, not an oversight.
  "archive",
  "upgrade",
  // m42 wave (d) leg d1 (wave-3 tail) — work:ui is the BOARD LAUNCHER itself
  // (a launcher-seam command: probe run + cli.launch serve body). A board
  // serving a "launch the board" route makes no sense — the verb is the door
  // INTO the board, so it is CLI-only by nature, not a deferred affordance.
  "ui",
  // m42 wave (d) leg d1 (wave-3 tail, the CLI-only batch) — operator/diagnostic
  // CLI verbs with no board affordance asked for: find (the board has its own
  // list/resolve reads), observe (a transcript-mining diagnostic), the headroom
  // toggle pair (machine-level plugin config, an operator CLI action).
  "find",
  "observe",
  // `debt` — the tech-debt ledger's maintenance face. Deferred on `find`/`observe`'s terms plus
  // one of its own: its subject is a committed markdown file at the work-directory root that the
  // operator already has open, and its one WRITING act (`--prune --write`) is meant to land as a
  // reviewable diff. A board button that silently deleted entries from a tracked file would be a
  // door onto exactly the act that most needs to show up in `git diff`.
  "debt",
  "use-headroom",
  "unuse-headroom",
  // init/update render the ACD bundle into a repo — machine-level install
  // actions an operator runs from the CLI; the board has no install affordance
  // asked for.
  "init",
  "update",
  // chore 51 — init-config is init's CONFIG half (the second call `/aof:init`
  // makes, carrying the agent-inferred tag vocabulary). It joins init/update in
  // the SAME carve-out for the SAME reason: an install-time, machine-level
  // config write an operator (or the `/aof:init` command) runs from the CLI, with
  // no board affordance asked for.
  "init-config",
  // m42 wave (d) leg d1 (the CLI-only batch, closing half) — the model-config
  // trio (the aof:delegate skill's surface): operator CLI decisions over
  // .aof/aof.config.json (interactive pickers in their argv adapters); no
  // board affordance asked for.
  "orchestrator",
  "delegation",
  "delegation-model",
  // story 65 / task 02 — `dispatch` is the LOCAL concurrent-dispatch door: it resolves a
  // ready story's own worktree on the item's own branch, reports the live lanes and the
  // configured concurrency bound, sweeps stranded lanes and cleans finished ones. It joins
  // run-start/run-complete/resume in this carve-out for the SAME reason they are here: the
  // act reaches an agent through a spawned session / the m03 ADR-006 terminal launch, never
  // a `/api/work` route, and the story asks for no board affordance. A board "dispatch the
  // ready set" panel is a real future affordance and a separate, deliberate decision — this
  // entry records the deferral, not an oversight.
  "dispatch",
  // 2026-08-16 — `status` is the ITEM-LIFECYCLE door (`aof work status <ref> [<status>]`).
  // It is deferred for a stronger reason than the rest of this carve-out: the board must
  // NOT have a status route at all. acd-board-write-isolation asserts exactly that
  // (`no /api/work/status or /api/work/restatus route`) — the board DERIVES status and
  // never writes it, so a lifecycle move is an operator/agent CLI act by design, not an
  // affordance awaiting a future decision.
  "status",
  // 2026-08-20 (VERIFICATION F-14) — the loop REGISTRY reads (m52/story 03). Deferred
  // for the same stronger reason as `status`: the board must not have these routes at
  // all. m52's own FF-5202 asserts that `ui/` never references the loop family, so a
  // served `/api/work/loops-*` would be a door no UI is permitted to open. Registry
  // inspection is a CLI/graph act by design, not an affordance awaiting a decision.
  "loops-show",
  "loops-graph",
  "loops-validate",
  // 2026-08-27 (55/VERIFICATION F-55-01-1) — `loops-groundedness` (m55/story 01) joins its three
  // siblings above, in the SAME carve-out and for the SAME stronger reason: it is a loop REGISTRY
  // read, so a served `/api/work/loops-groundedness` would be a door no UI is permitted to open
  // (m52's FF-5202 asserts `ui/` never references the loop family). The story briefly added that
  // route and re-pinned FF-5307's frozen board seam around it; the route was removed at the 55/01
  // gate and the seam restored, because a board face for this family is not a deferral awaiting a
  // decision — it is a decision already recorded at 53's gate. The report reaches its one real
  // consumer in-process (`invokeRegistered("work:loops-groundedness")`, src/commands/loop.mjs),
  // never over HTTP.
  "loops-groundedness",
  // story 79 — `loop-document` is the loop registry's ONE writer: it projects the four reads
  // above onto a committed markdown document at the work-directory root. It joins their carve-out
  // and inherits their STRONGER reason unchanged: 52/FF-5202 asserts `ui/` never references the
  // loop family, so a served `/api/work/loop-document` would be a door no UI is permitted to
  // open — and this one would also WRITE a tracked file on a page load, which is the shape
  // 54/ADR-003 §4 refuses for `grade`. Regenerating the document is an operator/CI act reached
  // through `aof work loops document --write`, and the drift check that reds when it goes stale
  // gates the TEST SUITE, never a route. A decision already recorded (chore 64 closed this
  // family's route gap by documented carve-out), not a deferral awaiting one.
  "loop-document",
  // milestone 78 / story 02 (ADR-008) — `loop-record` is the PER-ITEM execution record's one
  // command: it projects the item's run records against the declared registry and writes
  // `EXECUTION.md` into the item's own folder. It joins this carve-out on a DECISION ALREADY
  // RECORDED, not a deferral awaiting one. The milestone's own SPEC.md asked for the opposite
  // ("`work:loops-*` becomes board-reachable"); chore 64 — done — closed that gap in the OPPOSITE
  // direction, by documented carve-out rather than by route, recording that "a board face for this
  // family is not a deferral awaiting a decision — it is a decision already recorded at 53's gate",
  // because 52/FF-5202 asserts `ui/` never references the loop family. So the SPEC's scope item is
  // withdrawn and this command inherits the same stronger reason: a served
  // `/api/work/loop-record` would be a door no UI is permitted to open — and it would also WRITE a
  // tracked file on a page load, the shape 54/ADR-003 §4 refuses for `grade`. The record's surface
  // is the one SPEC.md names: a committed markdown file the operator already has in their editor.
  "loop-record",
  // milestone 57 / story 03 — a local git/history counter invoked by the build
  // loop and operator. No board affordance is part of the story.
  "ratchet",
  // milestone 57 / story 04 — an operator/loop read over local feedback and run
  // records; the story defines no board affordance.
  "counters",
  // 2026-08-20 (VERIFICATION F-14) — milestone 53's loop shell and its three local
  // phase drivers. `drive-refine` / `drive-continue` / `drive-verify` each SPAWN an
  // interactive agent session: they take exactly the `dispatch` carve-out above, and
  // for exactly its reason — the act reaches an agent through a spawned session, never
  // a `/api/work` route. `loop` joins them because the loop shell IS those drivers in
  // sequence; its registered run is the read-only probe (FF-5304) and its executing
  // form is the `cli.launch` body, which no HTTP route may reach. A board "drive this
  // range" panel is a real future affordance and a separate, deliberate decision —
  // these four entries record the deferral, not an oversight.
  "loop",
  "drive-refine",
  "drive-continue",
  "drive-verify",
  // milestone 59 / story 04 — `audit` takes the carve-out `grade` takes, and for the same reason
  // (54/ADR-003 §4): a served `/api/work/audit` would let a PAGE LOAD spawn a bounded child per
  // cited control, and this very gate stands the server up and hits every served route. The story
  // asks for no board affordance — the audit is an operator/loop CLI act, and its report reaches a
  // reader through `--json` or its declared reporting edges, never over HTTP. A deliberate
  // carve-out, recorded here rather than an oversight.
  "audit",
  // milestone 61 / story 06 — the acceptor is an operator/loop report and its only
  // mutating form requires an explicit CLI request. No board affordance is part of the
  // story; serving it here would create a second surface for that explicit commit act.
  "acceptor",
  // milestone 62 / story 04 — the tuner walks the work tree, run store and
  // transcript-derived observation index. It is an operator read, not a page-load route.
  "tune",
  // milestone 63 / story 05 (63/ADR-008 §7) — `trigger` joins acceptor/audit/grade/tune in this
  // carve-out for a reason of its own, and one this very gate makes concrete: its level
  // pre-flight reaches `work:doctor` and `work:loops-groundedness` through the registry, so a
  // served `/api/work/trigger` would let a PAGE LOAD walk the whole work tree — and the
  // behavioural leg below stands the server up and hits every served route. The story asks for no
  // board affordance: the resolution is read by a crontab line, a CI step or a dispatch tick, each
  // of which runs the argv it is handed. A deliberate deferral, recorded rather than an oversight.
  "trigger",
  // story 128 — `memory` joins on `find`/`observe`'s terms: recall is a CLI and HOOK affordance
  // (the bundle prompts run `aof work memory recall … --block` and paste the block into agent
  // context; the read hooks parse its `--json` records array), and no board button is asked
  // for. The verb rode the ladder as a "deliberately-unrouted door" until 125's README control
  // measured what that costs; registering it is what lets that control resolve the five
  // `aof work memory` lines the README spells. A board "what does memory know about this item"
  // panel is a real future affordance and a separate, deliberate decision — this entry records
  // the deferral, not an oversight.
  "memory",
]);

// The op set DERIVED from the registry — every work:* command's op segment, minus
// the board-deferred family. This is the canonical set the /api/work bijection is
// asserted over (NOT a hard-coded literal), so a new board-served work:* command
// (15's doctor, or any future one) is covered with no edit.
const commandOps = () =>
  listCommands()
    .filter((command) => command.id.startsWith("work:"))
    .map((command) => command.id.slice("work:".length))
    .filter((op) => !BOARD_DEFERRED.has(op))
    .sort();

// Discount comments so a comment naming a route literal is not counted as a route.
function stripComments(source) {
  return source.replace(/\/\/[^\n]*/g, "").replace(/\/\*[\s\S]*?\*\//g, "");
}

// Extract the op segment from every `pathname === "/api/work/<op>"` route literal.
function routeOps(source) {
  const ops = new Set();
  const re = /pathname\s*===\s*["']\/api\/work\/([\w-]+)["']/g;
  let match;
  while ((match = re.exec(source)) !== null) ops.add(match[1]);
  return [...ops].sort();
}

async function buildFixture() {
  const repo = await mkdtemp(path.join(os.tmpdir(), "aof-route-coverage-"));
  const workDir = path.join(repo, "wiki", "work");
  await mkdir(path.join(repo, ".aof"), { recursive: true });
  const storyDir = path.join(workDir, "03_milestone_board", "stories", "01_story_board");
  await mkdir(storyDir, { recursive: true });
  await writeFile(
    path.join(repo, ".aof", "aof.config.json"),
    JSON.stringify({ name: "fixture", work: { dir: "./wiki/work" } }, null, 2),
    "utf8"
  );
  await writeFile(
    path.join(workDir, "03_milestone_board", "SPEC.md"),
    "---\ntype: milestone\nnumber: 03\nslug: board\nstatus: in-progress\ntitle: \"Board\"\ncreated: 2026-06-19\nupdated: 2026-06-19\n---\n# 03\n",
    "utf8"
  );
  await writeFile(
    path.join(storyDir, "STORY.md"),
    "---\ntype: story\nnumber: 01\nslug: board\nstatus: in-progress\ntitle: \"Board story\"\nparent: 3\ncreated: 2026-06-19\nupdated: 2026-06-19\n---\n",
    "utf8"
  );
  await writeFile(path.join(storyDir, "STATE.md"), "# 01 · State\n", "utf8");
  return repo;
}

// One request per op against the running board. Reads are GET; feedback is a POST
// with a valid body (so it answers 200, not 400 missing-note) — the point is that
// the ROUTE is served via the registry, whatever the status.
async function hitRoute(url, op) {
  // `continue` is the second POST (2026-07-26) — THE single "continue this task
  // [--node]" door. It carries a same-origin guard, so the probe sends the server's own
  // origin; the fixture item has no prior run, so it resolves `where: "local"` and mints
  // nothing (this probe never dispatches anything to a real node).
  // The three PHASE DOORS (continue 2026-07-26; refine/verify m42 wave (b)) share
  // one probe shape: same-origin POST, fixture item with no prior run resolves
  // `where: "local"` and mints nothing.
  // m43 / story 04 (ADR-010/R4.2) — `resync` joins the same POST probe shape: a same-origin
  // POST carrying a ref. The fixture is not mesh-configured and its cache holds no row for
  // "03/01", so the door answers the coded `resync-no-owner` document at 200 without
  // dispatching anything or entering its bounded poll.
  if (op === "continue" || op === "refine" || op === "verify" || op === "resync") {
    return fetch(new URL(`/api/work/${op}`, url), {
      method: "POST",
      headers: { "content-type": "application/json", origin: new URL(url).origin },
      body: JSON.stringify({ ref: "03/01" }),
    });
  }
  // 131/04 — feedback passes the board's write admission too, so the probe sends the server's
  // own origin.
  if (op === "feedback") {
    return fetch(new URL("/api/work/feedback", url), {
      method: "POST",
      headers: { "content-type": "application/json", origin: new URL(url).origin },
      body: JSON.stringify({ ref: "03/01", note: "route coverage probe", actor: "arch-test" }),
    });
  }
  // milestone 131 / story 04 (ADR-006 §3) — `answer` is a same-origin POST like the doors. The
  // fixture holds no ask for "03/01" and no parked worker, so the verb answers 409
  // `answer-not-waiting` as a served JSON envelope — never the namespace's `not-found`.
  if (op === "answer") {
    return fetch(new URL("/api/work/answer", url), {
      method: "POST",
      headers: { "content-type": "application/json", origin: new URL(url).origin },
      body: JSON.stringify({ ref: "03/01", text: "route coverage probe" }),
    });
  }
  const query =
    op === "doc" ? "?ref=03&doc=SPEC"
    : op === "tasks" ? "?ref=03/01"
    : op === "run-status" ? "?ref=03/01"
    : "";
  // doctor is a read like list/validate — a bare GET answers the advisory
  // envelope. run-status reads 03/01's runs/ (absent ⇒ an empty { ref, runs: [] }).
  return fetch(new URL(`/api/work/${op}${query}`, url));
}

export const archTests = [
  {
    name: "arch/15 ADR-005: the served /api/work routes are in BIJECTION with the registry's work:* commands (registry-derived, not hard-coded)",
    run: async () => {
      const source = stripComments(await readFile(BOARD_UI, "utf8"));
      const served = routeOps(source);
      const commands = commandOps();
      // The two-way bijection: the served-route set equals the registry-derived
      // work:* op set. Adding work:doctor (the 7th) is covered with no edit — the
      // expectation is DERIVED from listCommands(), not a literal six.
      assert.deepEqual(
        served,
        commands,
        `board-ui.mjs serves exactly the registry's work:* ops {${commands.join(", ")}} — got {${served.join(", ")}}`
      );
    },
  },
  {
    name: "arch/15 ADR-005: every served route maps to a registered work:<op> command (no UI route without a command)",
    run: async () => {
      const source = stripComments(await readFile(BOARD_UI, "utf8"));
      for (const op of routeOps(source)) {
        const id = `work:${op}`;
        const command = getCommand(id);
        assert.ok(command, `route /api/work/${op} maps to a registered command id "${id}" (getCommand is defined)`);
        assert.equal(command.id, id, `getCommand("${id}").id is "${id}"`);
      }
    },
  },
  {
    name: "arch/15 ADR-005: every registered work:* command has a served /api/work route (no command without a door)",
    run: async () => {
      const served = new Set(routeOps(stripComments(await readFile(BOARD_UI, "utf8"))));
      for (const op of commandOps()) {
        assert.ok(served.has(op), `registered command work:${op} has a served /api/work/${op} route (no command without a door)`);
      }
    },
  },
  {
    name: "arch/15 ADR-005 (behavioural): each /api/work route answers a JSON envelope via the registry (looped over the derived set)",
    run: async () => {
      const repo = await buildFixture();
      const { server, url } = await serveSetupUi(null, { projectDir: repo, port: 0 });
      try {
        for (const op of commandOps()) {
          const response = await hitRoute(url, op);
          // Served via the registry → a JSON envelope (2xx success or 4xx error),
          // NEVER an unrouted 404-not-found or a 5xx crash.
          assert.ok(
            response.status < 500,
            `/api/work/${op} answers without a server error (got ${response.status})`
          );
          assert.ok(
            response.headers.get("content-type")?.includes("application/json"),
            `/api/work/${op} answers with a JSON envelope`
          );
          const body = await response.json();
          assert.ok(body !== null && body !== undefined, `/api/work/${op} returns a JSON body`);
          // An error envelope must be the frozen { ok:false, error, code } shape;
          // a 404 here would mean the route is NOT served (the failure inv.1 guards).
          if (response.status >= 400) {
            assert.notEqual(
              body.code,
              "not-found",
              `/api/work/${op} is a SERVED route, not an unrouted /api/work* 404`
            );
          }
        }
      } finally {
        await new Promise((resolve) => server.close(resolve));
        await rm(repo, { recursive: true, force: true });
      }
    },
  },
];
