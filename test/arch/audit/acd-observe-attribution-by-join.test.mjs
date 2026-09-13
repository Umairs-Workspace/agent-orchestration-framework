// Fitness functions: acd-observe-attribution-by-join (milestone 68 / story 03 /
// 68/ADR-005 + 68/ADR-006 / FF-6805 + FF-6806) — "Attribution is a join, not a match"
// and "One agent run, one item".
//
//   FF-6805: No attribution path in src/work/observe.mjs tests item identity against
//            free text; the item is resolved from the run record's sessionId. The
//            retired text-matcher has no surviving caller.
//   FF-6806: Across a whole work stream, no agent-run identity appears in two items'
//            attributed sets; a run with no resolvable session is reported as
//            unattributed rather than assigned or dropped.
//
// The pre-68 miner attributed an agent run to a milestone by regexing its prompt text
// (`agentMatchesMilestone`), which billed 18 of 143 agent rows to two milestones.
// This story replaces that with a join: one session maps to exactly one run record on
// exactly one item, so an agent run belongs to exactly one item (ADR-005), and a
// session that matches no run record is reported unattributed, never guessed into an
// item (ADR-006). Each arch-test below either reads the source (structural) or drives
// the real observe seam over a temp fixture work stream (behavioural proof).
import assert from "node:assert/strict";
import { mkdtemp, rm, mkdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const WORK_OBSERVE = path.join(root, "src", "work", "observe.mjs");

export const archTests = [
  {
    name: "arch/68 FF-6805 (acd-observe-attribution-by-join): the retired text-matcher has no surviving caller or definition, and attribution resolves from the run record's sessionId",
    run: async () => {
      const code = await readFile(WORK_OBSERVE, "utf8");
      // The text matcher is gone as CODE: no definition and no call survives (a
      // comment may still NAME it — the comment documents what was retired; only a
      // definition or a call is the violation FF-6805 guards).
      assert.doesNotMatch(code, /(?:function|export\s+function)\s+agentMatchesMilestone/, "the text matcher is not defined");
      assert.doesNotMatch(code, /agentMatchesMilestone\s*\(/, "the text matcher has no caller");
      assert.doesNotMatch(code, /firstUserText/, "the prompt-text extraction helper is gone");
      // No attribution path builds an id match over free text (the old regex built a
      // `new RegExp` over the milestone id and tested it against the prompt/description).
      assert.doesNotMatch(code, /m\?0\*/, "no leading-zero id regex survives (the text-match shape)");
      // The item is resolved from the run record's sessionId: the miner must consult
      // the stream-wide session→item index, and each collected agent's attribution
      // must come from that resolved itemRef, not from its prompt.
      assert.match(code, /buildSessionItemIndex/, "the stream-wide session→item index is built");
      assert.match(code, /sessionToItem\.get\(sessionId\)/, "attribution resolves via the session→item join");
      assert.match(code, /attributedTo:\s*itemRef/, "each agent carries the item resolved from its session's run record");
    },
  },
  {
    name: "arch/68 FF-6805 (acd-observe-attribution-by-join): behaviour over the real seam — an agent whose prompt names another item is still attributed to the item its session's run belongs to",
    run: async () => {
      const { observeMilestone, projectSlug } = await import("../../../src/work/observe.mjs");
      const cwd = await mkdtemp(path.join(os.tmpdir(), "aof-attr-arch-"));
      const home = await mkdtemp(path.join(os.tmpdir(), "aof-attr-arch-home-"));
      try {
        await mkdir(path.join(cwd, "wiki", "work", "68_milestone_loop-telemetry", "runs"), { recursive: true });
        await writeFile(
          path.join(cwd, "wiki", "work", "68_milestone_loop-telemetry", "runs", "r1.json"),
          JSON.stringify({ runId: "r1", itemRef: "68", state: "done", sessionId: "sess-a", brief: {}, createdAt: "2026-08-20T10:00:00.000Z", updatedAt: "2026-08-20T10:00:01.000Z", spend: null }),
        );
        const sub = path.join(home, ".claude", "projects", projectSlug(cwd), "sess-a", "subagents");
        await mkdir(sub, { recursive: true });
        await writeFile(path.join(sub, "agent-1.meta.json"), JSON.stringify({ agentType: "aof-developer", description: "task for 47 fleet-repo-filter" }));
        await writeFile(
          path.join(sub, "agent-1.jsonl"),
          JSON.stringify({ type: "user", timestamp: "2026-08-20T10:00:00.000Z", message: { role: "user", content: "do 47 and fleet-repo-filter" } }) + "\n",
        );
        const res = await observeMilestone({ cwd, ref: "68", home, env: {}, generatedAt: Date.parse("2026-08-20T10:00:00.000Z") });
        assert.equal(res.agents.length, 1, "the agent is attributed to 68 despite naming 47 in its prompt");
        assert.equal(res.agents[0].attributedTo, "68", "the item came from the run record's sessionId, not the prompt text");
      } finally {
        await rm(cwd, { recursive: true, force: true });
        await rm(home, { recursive: true, force: true });
      }
    },
  },
  {
    name: "arch/68 FF-6806 (acd-observe-attribution-by-join): across a whole work stream no agent-run identity appears in two items' attributed sets, and a no-session run is reported unattributed",
    run: async () => {
      const { observeMilestone, projectSlug } = await import("../../../src/work/observe.mjs");
      const cwd = await mkdtemp(path.join(os.tmpdir(), "aof-attr-arch-"));
      const home = await mkdtemp(path.join(os.tmpdir(), "aof-attr-arch-home-"));
      try {
        const items = [
          ["68_milestone_loop-telemetry", "68", "sess-68"],
          ["47_milestone_fleet-repo-filter", "47", "sess-47"],
        ];
        const identities = [];
        for (const [folder, ref, sess] of items) {
          await mkdir(path.join(cwd, "wiki", "work", folder, "runs"), { recursive: true });
          await writeFile(
            path.join(cwd, "wiki", "work", folder, "runs", `r-${ref}.json`),
            JSON.stringify({ runId: `r-${ref}`, itemRef: ref, state: "done", sessionId: sess, brief: {}, createdAt: "2026-08-20T10:00:00.000Z", updatedAt: "2026-08-20T10:00:01.000Z", spend: null }),
          );
          const sub = path.join(home, ".claude", "projects", projectSlug(cwd), sess, "subagents");
          await mkdir(sub, { recursive: true });
          await writeFile(path.join(sub, `agent-${ref}.meta.json`), JSON.stringify({ agentType: "aof-developer", description: ref }));
          await writeFile(path.join(sub, `agent-${ref}.jsonl`), JSON.stringify({ type: "user", timestamp: "2026-08-20T10:00:00.000Z", message: { role: "user", content: ref } }) + "\n");
        }
        // A session that matches no run record — its agent must be unattributed.
        const stray = path.join(home, ".claude", "projects", projectSlug(cwd), "sess-stray", "subagents");
        await mkdir(stray, { recursive: true });
        await writeFile(path.join(stray, "agent-stray.meta.json"), JSON.stringify({ agentType: "aof-qa", description: "stray" }));
        await writeFile(path.join(stray, "agent-stray.jsonl"), JSON.stringify({ type: "user", timestamp: "2026-08-20T10:00:00.000Z", message: { role: "user", content: "stray" } }) + "\n");

        const seen = new Set();
        for (const [folder, ref] of items) {
          const res = await observeMilestone({ cwd, ref, home, env: {}, generatedAt: Date.parse("2026-08-20T10:00:00.000Z") });
          assert.equal(res.agents.length, 1, `item ${ref} attributes exactly its own agent`);
          for (const a of res.agents) {
            assert.equal(seen.has(a.id), false, `agent identity ${a.id} is not already in another item's attributed set`);
            seen.add(a.id);
          }
        }
        assert.equal(seen.size, 2, "the two agent-run identities are distinct across the stream");
        const strayRes = await observeMilestone({ cwd, ref: "68", home, env: {}, generatedAt: Date.parse("2026-08-20T10:00:00.000Z") });
        assert.equal(strayRes.unattributedAgentRuns, 1, "the no-session run is reported unattributed, not assigned and not dropped");
      } finally {
        await rm(cwd, { recursive: true, force: true });
        await rm(home, { recursive: true, force: true });
      }
    },
  },
  {
    name: "arch/68 FF-6806 (acd-observe-attribution-by-join): no module in src/** attributes an agent run to an item by free text (no surviving text-match caller anywhere)",
    run: async () => {
      const modules = [];
      const walk = async (dir) => {
        for (const e of await (await import("node:fs/promises")).readdir(dir, { withFileTypes: true })) {
          const p = path.join(dir, e.name);
          if (e.isDirectory()) await walk(p);
          else if (e.name.endsWith(".mjs")) modules.push(p);
        }
      };
      await walk(path.join(root, "src"));
      assert.ok(modules.length > 150, `src was actually walked: ${modules.length} modules`);
      const offenders = [];
      for (const file of modules) {
        const code = (await readFile(file, "utf8")).replace(/\r\n/gu, "\n");
        // Any module that still CALLS the retired text matcher — the join replaced it.
        if (/\bagentMatchesMilestone\s*\(/.test(code)) offenders.push(path.relative(root, file));
      }
      assert.deepEqual(offenders, [], `no module calls the retired text matcher (offenders: ${offenders.join("; ")})`);
    },
  },
];
