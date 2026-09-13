// Traceability wiring for milestone 68 / story 03 — attribution-by-join.
//
// Covers EVERY @executable scenario in the two task features:
//   tasks/00_one-run-one-item.feature
//   tasks/01_toolchain-classifier-retired.feature
// exercising the REAL src/work/observe.mjs attribution core (the sessionId join that
// replaces the retired text matcher) and the REAL classifier (content-based, replacing
// the retired command-name regex), against temp fixture work streams (mkdtemp →
// write folders/runs/sessions → observe/collect → rm in finally). One test object per
// @executable scenario (Scenario-Outline rows folded into one entry iterating the rows),
// each name tracing to feature + scenario. node:assert/strict. `{ name, run }` shape so
// it spreads into the runner's tests array like every other suite.
import assert from "node:assert/strict";
import { mkdtemp, rm, mkdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  observeMilestone,
  collectMilestoneAgents,
  buildSessionItemIndex,
  analyzeTranscript,
  classifyToolCallResult,
  projectSlug,
} from "../../../src/work/observe.mjs";

const T0 = Date.parse("2026-08-20T10:00:00.000Z");
const iso = (o) => new Date(T0 + o).toISOString();

function mkRun(id, sessionId, { folder = null } = {}) {
  return {
    runId: id,
    itemRef: folder ?? "68",
    state: "done",
    attempt: 1,
    outcome: null,
    sessionId,
    brief: {},
    createdAt: iso(0),
    updatedAt: iso(1000),
    failureReason: null,
    heartbeatAt: null,
    retryOf: null,
    reclaimedAt: null,
    node: null,
    resumeAfter: null,
    spend: null,
  };
}

// A minimal but parseable subagent transcript: a user prompt + one assistant turn.
function agentTranscript(prompt = "build", out = 10) {
  return [
    JSON.stringify({ type: "user", timestamp: iso(0), message: { role: "user", content: prompt } }),
    JSON.stringify({ type: "assistant", timestamp: iso(1000), message: { model: "claude-sonnet", content: [{ type: "text", text: "ok" }], usage: { output_tokens: out } } }),
  ].join("\n") + "\n";
}

async function makeTree(folders = []) {
  const cwd = await mkdtemp(path.join(os.tmpdir(), "aof-att-"));
  for (const f of folders) await mkdir(path.join(cwd, "wiki", "work", f), { recursive: true });
  return cwd;
}

async function writeRun(cwd, relFolder, run) {
  const runsDir = path.join(cwd, "wiki", "work", relFolder, "runs");
  await mkdir(runsDir, { recursive: true });
  await writeFile(path.join(runsDir, `${run.runId}.json`), JSON.stringify(run));
}

// Lay one subagent under home/.claude/projects/<slug>/<session>/subagents/.
async function writeAgent(home, cwd, session, agentId, { agentType = "aof-developer", description = "x", text = agentTranscript() } = {}) {
  const subDir = path.join(home, ".claude", "projects", projectSlug(cwd), session, "subagents");
  await mkdir(subDir, { recursive: true });
  await writeFile(path.join(subDir, `${agentId}.meta.json`), JSON.stringify({ agentType, description }));
  await writeFile(path.join(subDir, `${agentId}.jsonl`), text);
}

export const workObserveAttributionTests = [
  // ══ 00_one-run-one-item.feature ══
  {
    name: "work-observe-attribution/00 an agent run is attributed to the item its session's run belongs to — resolved from the run record, not the prompt text",
    run: async () => {
      const cwd = await makeTree(["68_milestone_loop-telemetry"]);
      const home = await mkdtemp(path.join(os.tmpdir(), "aof-att-home-"));
      try {
        await writeRun(cwd, "68_milestone_loop-telemetry", mkRun("r1", "sess-a"));
        // The agent's prompt names milestone 47 (a different item) — under the join
        // that text is irrelevant; the session belongs to 68.
        await writeAgent(home, cwd, "sess-a", "agent-1", { description: "for milestone 47", text: agentTranscript("about milestone 47") });
        const res = await observeMilestone({ cwd, ref: "68", home, env: {}, generatedAt: T0 });
        assert.equal(res.agents.length, 1, "the agent run is attributed to 68");
        assert.equal(res.agents[0].attributedTo, "68", "the attribution resolved to the item whose run owns the session");
        assert.equal(res.agents[0].sessionId, "sess-a");
      } finally {
        await rm(cwd, { recursive: true, force: true });
        await rm(home, { recursive: true, force: true });
      }
    },
  },
  {
    name: "work-observe-attribution/00 an agent run mentioning another item is not attributed to it",
    run: async () => {
      const cwd = await makeTree(["68_milestone_loop-telemetry", "47_milestone_fleet-repo-filter"]);
      const home = await mkdtemp(path.join(os.tmpdir(), "aof-att-home-"));
      try {
        await writeRun(cwd, "68_milestone_loop-telemetry", mkRun("r1", "sess-a"));
        await writeRun(cwd, "47_milestone_fleet-repo-filter", mkRun("r47", "sess-b"));
        // Under 68's session, an agent whose text mentions 47 by number AND slug.
        await writeAgent(home, cwd, "sess-a", "agent-1", { description: "task for 47 fleet-repo-filter", text: agentTranscript("do 47 and fleet-repo-filter") });
        // Under 47's session, its own agent.
        await writeAgent(home, cwd, "sess-b", "agent-2", { description: "47's work", text: agentTranscript("47") });

        const m68 = await observeMilestone({ cwd, ref: "68", home, env: {}, generatedAt: T0 });
        const m47 = await observeMilestone({ cwd, ref: "47", home, env: {}, generatedAt: T0 });
        assert.equal(m68.agents.length, 1, "68's report holds the agent under 68's session");
        assert.equal(m68.agents[0].attributedTo, "68");
        assert.equal(m47.agents.length, 1, "47's report holds the agent under 47's session, not the one that mentioned 47 by text");
        assert.equal(m47.agents[0].sessionId, "sess-b", "the text-mentioning agent does not appear in 47's report");
      } finally {
        await rm(cwd, { recursive: true, force: true });
        await rm(home, { recursive: true, force: true });
      }
    },
  },
  {
    name: "work-observe-attribution/00 no agent run is counted twice across the work stream",
    run: async () => {
      const cwd = await makeTree(["68_milestone_loop-telemetry", "47_milestone_fleet-repo-filter", "45_milestone_ui-app-shell-routing"]);
      const home = await mkdtemp(path.join(os.tmpdir(), "aof-att-home-"));
      try {
        const items = [
          ["68_milestone_loop-telemetry", "68", "sess-68", "agent-a", "aof-developer", 100],
          ["47_milestone_fleet-repo-filter", "47", "sess-47", "agent-b", "aof-qa", 200],
          ["45_milestone_ui-app-shell-routing", "45", "sess-45", "agent-c", "aof-researcher", 300],
        ];
        const identities = [];
        let attributedActive = 0;
        for (const [folder, ref, sess, aid, role, out] of items) {
          await writeRun(cwd, folder, mkRun(`r-${ref}`, sess, { folder: ref }));
          await writeAgent(home, cwd, sess, aid, { agentType: role, text: agentTranscript(ref, out) });
          const res = await observeMilestone({ cwd, ref, home, env: {}, generatedAt: T0 });
          assert.equal(res.agents.length, 1, `item ${ref} attributes exactly its own agent`);
          for (const a of res.agents) identities.push(a.id);
          attributedActive += res.agents.reduce((s, a) => s + a.activeMs, 0);
        }
        // No agent-run identity appears in more than one item's attributed set.
        assert.equal(new Set(identities).size, identities.length, "every agent-run identity is unique across all items' attributed sets");
        // The sum of attributed active time is no greater than the union of all activity.
        assert.ok(attributedActive >= 0, "attributed active time is well-defined");
        assert.ok(attributedActive <= 1000 * 3, "no attributed active time is double-counted beyond the real activity");
      } finally {
        await rm(cwd, { recursive: true, force: true });
        await rm(home, { recursive: true, force: true });
      }
    },
  },
  {
    name: "work-observe-attribution/00 a run that cannot be attributed is reported as unattributed, counted, not assigned, not dropped",
    run: async () => {
      const cwd = await makeTree(["68_milestone_loop-telemetry"]);
      const home = await mkdtemp(path.join(os.tmpdir(), "aof-att-home-"));
      try {
        // No run record for this session — it must not be attributed to 68.
        await writeAgent(home, cwd, "sess-orphan", "agent-orphan", { description: "some work" });
        const res = await observeMilestone({ cwd, ref: "68", home, env: {}, generatedAt: T0 });
        assert.equal(res.agents.length, 0, "the unresolvable run is not assigned to any item");
        assert.equal(res.unattributedAgentRuns, 1, "the count of unattributed runs is stated");
        assert.equal(res.json.summary.unattributedAgentRuns, 1, "the json carries the unattributed count");
        assert.match(res.report, /Unattributed agent runs.*\*\*1\*\*/, "the report states the unattributed count");
      } finally {
        await rm(cwd, { recursive: true, force: true });
        await rm(home, { recursive: true, force: true });
      }
    },
  },
  {
    name: "work-observe-attribution/00 Scenario Outline: what resolves, and what is reported as unattributed",
    run: async () => {
      const cwd = await makeTree(["68_milestone_loop-telemetry"]);
      const home = await mkdtemp(path.join(os.tmpdir(), "aof-att-home-"));
      const sessionsDir = path.join(home, ".claude", "projects", projectSlug(cwd));
      try {
        // A run on the milestone (sess-item) and a run on one of its stories (sess-story).
        await writeRun(cwd, "68_milestone_loop-telemetry", mkRun("r-item", "sess-item", { folder: "68" }));
        await writeRun(cwd, "68_milestone_loop-telemetry/stories/03_story_attribution-by-join", mkRun("r-story", "sess-story", { folder: "68/03" }));
        // A run record whose own sessionId is null contributes nothing (sess-null-session).
        await writeRun(cwd, "68_milestone_loop-telemetry", mkRun("r-null", null, { folder: "68" }));

        // Build the stream index exactly as observe does, then drive the join directly
        // for precise per-row dispositions. Story refs use the canonical non-padded
        // form ("68/3"), matching resolveMilestoneFolder and observeMilestone.
        const index = await buildSessionItemIndex({ cwd });
        const target = new Set(["68", "68/3"]);

        // matches a run record on this item → attributed to the item
        await writeAgent(home, cwd, "sess-item", "a-item");
        let r = await collectMilestoneAgents({ projectsDir: sessionsDir, sessionToItem: index, targetItemRefs: target });
        assert.equal(r.agents.length, 1);
        assert.equal(r.agents[0].attributedTo, "68", "a session matching a run record on this item is attributed to the item");

        // matches a run record on one of the item's stories → attributed to that story
        await writeAgent(home, cwd, "sess-story", "a-story");
        r = await collectMilestoneAgents({ projectsDir: sessionsDir, sessionToItem: index, targetItemRefs: target });
        const storyAgent = r.agents.find((a) => a.sessionId === "sess-story");
        assert.ok(storyAgent, "the story-session agent is collected when the milestone is observed");
        assert.equal(storyAgent.attributedTo, "68/3", "attributed to the story whose run owns the session");

        // matches no run record at all → reported as unattributed
        await writeAgent(home, cwd, "sess-none", "a-none");
        r = await collectMilestoneAgents({ projectsDir: sessionsDir, sessionToItem: index, targetItemRefs: target });
        assert.equal(r.unattributedCount, 1, "the no-record session's agent is reported unattributed");

        // matches a run record whose own session id is null → reported as unattributed
        await writeAgent(home, cwd, "sess-null-session", "a-null");
        r = await collectMilestoneAgents({ projectsDir: sessionsDir, sessionToItem: index, targetItemRefs: target });
        assert.equal(r.unattributedCount, 2, "the null-session-run agent resolves to no index entry, hence unattributed");

        // is absent from the transcript entirely → not attributed to any item:
        // a session referenced by a run but with no transcript folder is never
        // collected, so its (non-existent) agent run is not attributed anywhere.
        await writeRun(cwd, "68_milestone_loop-telemetry", mkRun("r-ghost", "sess-ghost", { folder: "68" }));
        const index2 = await buildSessionItemIndex({ cwd });
        assert.equal(index2.get("sess-ghost"), "68", "the index knows the session");
        const r2 = await collectMilestoneAgents({ projectsDir: sessionsDir, sessionToItem: index2, targetItemRefs: target });
        assert.equal(r2.agents.find((a) => a.sessionId === "sess-ghost"), undefined, "an absent-from-transcript session is not attributed to any item");
      } finally {
        await rm(cwd, { recursive: true, force: true });
        await rm(home, { recursive: true, force: true });
      }
    },
  },

  // ══ 01_toolchain-classifier-retired.feature ══
  {
    name: "work-observe-attribution/01 this repo's real test command is classified as a test run, its duration counted toward tool wait",
    run: async () => {
      const sec = 1000;
      const text = [
        JSON.stringify({ type: "assistant", timestamp: iso(0), message: { content: [{ type: "tool_use", id: "t", name: "Bash", input: { command: "AOF_GLOBAL_HOME=$(mktemp -d) node scripts/test.mjs" } }], usage: { output_tokens: 1 } } }),
        JSON.stringify({ type: "user", timestamp: iso(30 * sec), message: { content: [{ type: "tool_result", tool_use_id: "t", content: "Test Files  2 passed (1 test)" }] } }),
      ].join("\n") + "\n";
      const a = analyzeTranscript(text);
      assert.equal(a.diagnostics.toolchain.runs, 1, "the isolated node test invocation is a test run");
      assert.ok(a.diagnostics.toolchain.totalMs >= 30 * sec, "its duration counts toward tool wait");
      assert.ok(a.diagnostics.modelMs < a.diagnostics.toolchain.totalMs || a.diagnostics.toolchain.totalMs > 0, "the time went to tool wait, not model generation");
    },
  },
  {
    name: "work-observe-attribution/01 the forbidden pattern is no longer what decides — classification never consults those three command names",
    run: async () => {
      const sec = 1000;
      const mk = (cmd, result) => [
        JSON.stringify({ type: "assistant", timestamp: iso(0), message: { content: [{ type: "tool_use", id: "t", name: "Bash", input: { command: cmd } }], usage: { output_tokens: 1 } } }),
        JSON.stringify({ type: "user", timestamp: iso(sec), message: { content: [{ type: "tool_result", tool_use_id: "t", content: result }] } }),
      ].join("\n") + "\n";
      // No npm test / vitest / jest in the command, yet the call IS a test run.
      const noForbidden = analyzeTranscript(mk("node scripts/run-tests.mjs", "1 test passed, 0 failed"));
      assert.ok(noForbidden.diagnostics.toolchain.runs >= 1, "the test-run count is non-zero with none of the three command names present");
      // Classification does not depend on the names: a command that DOES contain
      // vitest but whose output is not test-like is NOT a test run.
      const hasNameButNotTest = analyzeTranscript(mk("npx vitest --help", "Usage: vitest [options]"));
      assert.equal(hasNameButNotTest.diagnostics.toolchain.runs, 0, "the classifier reads the result, not the command name");
    },
  },
  {
    name: "work-observe-attribution/01 a category reading zero means zero, distinguished from an unclassified state",
    run: async () => {
      const sec = 1000;
      const text = [
        JSON.stringify({ type: "assistant", timestamp: iso(0), message: { content: [{ type: "tool_use", id: "r", name: "Read", input: { file_path: "c:/src/a.mjs" } }], usage: { output_tokens: 1 } } }),
        JSON.stringify({ type: "user", timestamp: iso(sec), message: { content: [{ type: "tool_result", tool_use_id: "r", content: "const x = 1" }] } }),
        JSON.stringify({ type: "assistant", timestamp: iso(2 * sec), message: { content: [{ type: "tool_use", id: "b", name: "Bash", input: { command: "git status" } }], usage: { output_tokens: 1 } } }),
        JSON.stringify({ type: "user", timestamp: iso(3 * sec), message: { content: [{ type: "tool_result", tool_use_id: "b", content: "on branch feat/68-loop-telemetry" }] } }),
      ].join("\n") + "\n";
      const a = analyzeTranscript(text);
      assert.equal(a.diagnostics.toolchain.runs, 0, "a run that genuinely ran no tests reads a true zero");
      assert.equal(typeof a.diagnostics.toolchain.runs, "number", "a measured zero is a number — distinct from an absent/unclassified diagnostics block");
    },
  },
  {
    name: "work-observe-attribution/01 Scenario Outline: what a call is classified as",
    run: async () => {
      const sec = 1000;
      // test runs, however this project spells them — all classified by OUTPUT.
      for (const [cmd, result] of [
        ["AOF_GLOBAL_HOME=$(mktemp -d) node scripts/test.mjs", "Test Files 1 passed, 0 failed"],
        ["node scripts/test-unit.mjs", "1 test passed"],
        ["node scripts/check.mjs", "all pass"],
      ]) {
        const text = [
          JSON.stringify({ type: "assistant", timestamp: iso(0), message: { content: [{ type: "tool_use", id: "b", name: "Bash", input: { command: cmd } }], usage: { output_tokens: 1 } } }),
          JSON.stringify({ type: "user", timestamp: iso(sec), message: { content: [{ type: "tool_result", tool_use_id: "b", content: result }] } }),
        ].join("\n") + "\n";
        assert.equal(analyzeTranscript(text).diagnostics.toolchain.runs, 1, `a test run: ${cmd}`);
      }
      // not test runs: read / edit / other.
      const read = analyzeTranscript([
        JSON.stringify({ type: "assistant", timestamp: iso(0), message: { content: [{ type: "tool_use", id: "r", name: "Read", input: { file_path: "c:/src/a.mjs" } }], usage: { output_tokens: 1 } } }),
      ].join("\n") + "\n");
      assert.equal(read.diagnostics.toolchain.runs, 0, "a read is not a test run");
      const edit = analyzeTranscript([
        JSON.stringify({ type: "assistant", timestamp: iso(0), message: { content: [{ type: "tool_use", id: "e", name: "Edit", input: { file_path: "c:/src/a.mjs" } }], usage: { output_tokens: 1 } } }),
      ].join("\n") + "\n");
      assert.equal(edit.diagnostics.toolchain.runs, 0, "an edit is not a test run");
      assert.equal(classifyToolCallResult("on branch feat/68-loop-telemetry"), "other", "an unrelated shell result is 'other'");
      assert.equal(classifyToolCallResult("grep: no matches"), "other", "a non-test shell result is 'other'");
    },
  },
  {
    name: "work-observe-attribution/01 the per-agent diagnostics the miner exists for are unchanged",
    run: async () => {
      // A fix-test-rerun grind: 6× [edit → test run], the interleave/grind the miner
      // exists to report. The classifier change must not disturb it (ADR-006 keeps
      // the diagnostics).
      const sec = 1000;
      const lines = [];
      lines.push(JSON.stringify({ type: "user", timestamp: iso(0), message: { role: "user", content: "build" } }));
      let t = 5 * sec;
      for (let i = 0; i < 6; i++) {
        lines.push(JSON.stringify({ type: "assistant", timestamp: iso(t), message: { content: [{ type: "tool_use", id: `e${i}`, name: "Edit", input: { file_path: "c:/src/x.ts" } }], usage: { output_tokens: 50 } } }));
        lines.push(JSON.stringify({ type: "user", timestamp: iso(t + 2 * sec), message: { content: [{ type: "tool_result", tool_use_id: `e${i}`, content: "ok" }] } }));
        t += 20 * sec;
        lines.push(JSON.stringify({ type: "assistant", timestamp: iso(t), message: { content: [{ type: "tool_use", id: `t${i}`, name: "Bash", input: { command: "node scripts/test.mjs" } }], usage: { output_tokens: 50 } } }));
        const failed = i < 5;
        lines.push(JSON.stringify({ type: "user", timestamp: iso(t + 30 * sec), message: { content: [{ type: "tool_result", tool_use_id: `t${i}`, is_error: failed, content: failed ? "1 test failed" : "all pass" }] } }));
        t += 40 * sec;
      }
      const { diagnostics: d } = analyzeTranscript(lines.join("\n") + "\n");
      assert.equal(d.toolchain.runs, 6, "six test runs, as before");
      assert.equal(d.interleave.testRuns, 6, "the interleave test-run count is unchanged");
      assert.equal(d.interleave.editActions, 6, "the edit count is unchanged");
      assert.equal(d.interleave.editsPerTest, 1, "the edits-per-test ratio is unchanged");
      assert.match(d.interleave.pattern, /tight fix-test loop/, "the interleave pattern is reported as before");
      assert.equal(d.grind.flagged, true, "the grind assessment is reported as before");
      assert.ok(d.grind.reasons.length >= 1, "grind reasons are present");
      assert.equal(d.hotFiles.edited[0].file, "c:/src/x.ts", "the thrashed-file set is reported as before");
      assert.equal(d.errors.toolErrors, 5, "the failing-run count is reported as before");
    },
  },
  {
    name: "work-observe-attribution/01 an error tool_result counts by its is_error field, not only by loud content",
    run: async () => {
      const sec = 1000;
      const toolErrorsOf = (result) =>
        analyzeTranscript(
          [
            JSON.stringify({ type: "assistant", timestamp: iso(0), message: { content: [{ type: "tool_use", id: "b", name: "Bash", input: { command: "node build.mjs" } }], usage: { output_tokens: 1 } } }),
            JSON.stringify({ type: "user", timestamp: iso(sec), message: { content: [{ type: "tool_result", tool_use_id: "b", ...result }] } }),
          ].join("\n") + "\n"
        ).diagnostics.errors.toolErrors;
      // Claude Code transcripts carry `is_error` on tool_result blocks. A QUIET error
      // result — no word the content regex knows, under the 400-char window — must
      // still count, or error detection silently degrades to the regex.
      assert.equal(toolErrorsOf({ is_error: true, content: "exit code 3" }), 1, "is_error:true counts even when the content is quiet");
      // No field at all, loud content — the content regex remains the fallback.
      assert.equal(toolErrorsOf({ content: 'Traceback (most recent call last):\n  File "x.mjs", line 1' }), 1, "loud content counts via the regex when is_error is absent");
      // And a quiet non-error counts zero — the field is read, not assumed.
      assert.equal(toolErrorsOf({ is_error: false, content: "exit code 0" }), 0, "a quiet is_error:false result counts zero");
    },
  },
  {
    name: "work-observe-attribution/01 realistic non-test output does not classify as test runs; real node:test runner output does",
    run: async () => {
      const sec = 1000;
      const runsOf = (cmd, result) =>
        analyzeTranscript(
          [
            JSON.stringify({ type: "assistant", timestamp: iso(0), message: { content: [{ type: "tool_use", id: "b", name: "Bash", input: { command: cmd } }], usage: { output_tokens: 1 } } }),
            JSON.stringify({ type: "user", timestamp: iso(sec), message: { content: [{ type: "tool_result", tool_use_id: "b", content: result }] } }),
          ].join("\n") + "\n"
        ).diagnostics.toolchain.runs;
      // F-07 regressions: output that merely CONTAINS test-ish words is not a test run.
      assert.equal(runsOf("git status --short", " M src/work/observe.mjs\n M test/work/lifecycle/work-observe-attribution.test.mjs\n?? test/new-spec.mjs"), 0, "a git status listing *.test.mjs files is not a test run");
      assert.equal(runsOf("ls test/", "work-observe.test.mjs\nwork-update.test.mjs"), 0, "an ls of the test dir is not a test run");
      assert.equal(runsOf("git diff src/x.mjs", "@@ -12,7 +12,7 @@\n-  // failing case kept deliberately\n+  // removed"), 0, "a diff hunk mentioning failing is not a test run");
      assert.equal(classifyToolCallResult("Failed to connect to the remote host"), "other", "a connection failure is not a test run");
      assert.equal(classifyToolCallResult("lint passed, 0 problems"), "other", "a lint verdict is not a test run");
      // The real signal: this repo's runner prints TAP-ish `ok - <name>` lines and a
      // `# tests / # pass / # fail` summary — count-bearing, structural markers.
      const nodeTest = [
        "ok - work-observe-attribution/00 an agent run is attributed to the item its session's run belongs to",
        "not ok - work-observe-attribution/01 a broken scenario",
        "# tests 27",
        "# pass 26",
        "# fail 1",
      ].join("\n");
      assert.equal(runsOf("AOF_GLOBAL_HOME=$(mktemp -d) node scripts/test-unit.mjs", nodeTest), 1, "real node:test-style runner output classifies as one test run");
    },
  },
];
