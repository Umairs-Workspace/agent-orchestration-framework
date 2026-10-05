// Fitness function for milestone 11 / ADR-004 + ADR-006 inv. 3 (advisory-only / no
// auto-act):
// "No `graph:*` output from any 11 seam feeds a gate / merge / status-write /
//  work-mutation; the grounding is read-and-inject into agent CONTEXT only. The agent
//  decides; the graph informs. Concretely: the architect/refine/review grounding
//  steps inject graph output into the agent's context as a consider/cite instruction;
//  no seam wires graph output into a CI gate, a review verdict, or a
//  STORY.md/SPEC.md/STATE.md status/work write. The blast-radius ranking is ranking context
//  for the reviewer, never an auto-block input." (149: the review seam is `review.md`; the
//  removed `code-review.md` and its merge decision went with it.)
//
// This is the milestone's load-bearing invariant (SPEC §Out of scope). The house
// idiom is source-grep over the BUNDLED seams (markdown read as text). The assertion
// is ROBUST — not one magic word: each seam must carry BOTH the advisory-and-inform
// property (informs/consider/cite + an explicit advisory-only framing) AND the
// no-auto-act property (never auto-fail/auto-block/auto-rewrite; merge gate unchanged;
// no graph output piped into a gate/merge/status-write).
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const bundleDir = path.join(repoRoot, "packages", "core", "assets");

const SEAMS = {
  architect: path.join(bundleDir, "agents", "aof-architect.md"),
  refine: path.join(bundleDir, "commands", "refine.md"),
  // 149 — the review seam moved from the removed `code-review.md` to `review.md` (aof:review).
  review: path.join(bundleDir, "commands", "review.md"),
};

export const archTests = [
  {
    name: "arch/codebase-grounding-advisory: each 11 seam frames the grounding as ADVISORY — the graph informs the agent's judgment, it does not dictate it",
    run: async () => {
      // The advisory-and-inform property: each seam must explicitly carry the
      // advisory-only framing AND the informs-not-dictates / consider-cite shape (the
      // grounding is read-and-inject into the agent's context — the agent decides).
      for (const [label, file] of Object.entries(SEAMS)) {
        const text = await readFile(file, "utf8");
        // (1) an explicit advisory framing — "Advisory only" / "(advisory)".
        assert.match(
          text,
          /advisory only|advisory\)/i,
          `${label} carries an explicit ADVISORY framing on the grounding step`
        );
        // (2) the graph INFORMS / is CONTEXT the agent CONSIDERs and CITEs — it does not
        //     decide. Assert the inform-not-dictate property is present (robust: any of
        //     the consider/cite/informs/context forms, not one magic word).
        assert.match(
          text,
          /\binforms?\b[\s\S]{0,60}?(judgment|it|the partition|never)|\bcite\b|as (ranking )?context|consider the/i,
          `${label} injects the graph as context the agent CONSIDERs / CITEs / is INFORMED by (read-and-inject, not dictate)`
        );
      }
    },
  },
  {
    name: "arch/codebase-grounding-advisory: no 11 seam pipes graph output into a gate / merge / auto-act — the graph never auto-fails, auto-blocks, or auto-rewrites",
    run: async () => {
      // The no-auto-act property, per consumer. architect + refine (graph:query
      // coupling): tight coupling does not auto-fail the review / auto-rewrite the
      // boundary, and no graph output feeds a gate or work-mutation.
      const architect = await readFile(SEAMS.architect, "utf8");
      const refine = await readFile(SEAMS.refine, "utf8");

      assert.match(
        architect,
        /does not auto-fail|never auto-fails?|auto-rewrites? a boundary/i,
        "aof-architect: tight coupling does not auto-fail the review / the graph never auto-rewrites a boundary"
      );
      assert.match(
        architect,
        /no graph\s+output feeds a gate,\s+merge,\s+status-write,\s+or work-mutation/i,
        "aof-architect: no graph output feeds a gate / merge / status-write / work-mutation"
      );
      assert.match(
        refine,
        /never auto-rewrites? it|auto-rewrites? it,? never/i,
        "refine: the graph informs the partition, it never auto-rewrites it"
      );
      assert.match(
        refine,
        /no graph\s+output feeds a gate or\s+work-mutation/i,
        "refine: no graph output feeds a gate or work-mutation"
      );
    },
  },
  {
    name: "arch/codebase-grounding-advisory: the review blast-radius ranking is RANKING CONTEXT for the reviewer, NEVER an auto-block input — never a gate",
    run: async () => {
      // The review seam (graph:impact's dependents) is the highest-temptation surface (a
      // ranked change set invites an auto-block). Assert it is explicitly ranking-context,
      // never an auto-block and never a gate. (149: it was code-review's PR triage, whose
      // merge gate and `work.codeReview.autoComplete` were removed with the command.)
      const review = await readFile(SEAMS.review, "utf8");

      assert.match(review, /ranking context/i, "review: the ranking is RANKING CONTEXT for the reviewer");
      assert.match(
        review,
        /never[\s\S]{0,40}?auto-block|not[\s\S]{0,20}?an auto-block/i,
        "review: the ranking is NEVER an auto-block input to the verdict"
      );
      assert.match(review, /advisory and never a gate/i, "review: the ranking is never a gate");
      assert.ok(!/codeReview|code-review/u.test(review), "review: names no removed code-review wiring");
    },
  },
  {
    name: "arch/codebase-grounding-advisory: no 11 seam wires graph output into a status/work write (no auto-mutation of STATE.md/STORY.md/SPEC.md from graph findings)",
    run: async () => {
      // ADR-004 forbids a graph finding auto-mutating a work record. The seams may have
      // the agent CITE a graph finding in its prose verdict (human/agent-authored
      // narrative), but no seam pipes `graph:*` output into an automated status/work
      // write. Assert no seam contains a directive that writes a graph finding into a
      // work doc automatically (e.g. "write the graph finding to STATE.md").
      for (const [label, file] of Object.entries(SEAMS)) {
        const text = await readFile(file, "utf8");
        assert.ok(
          !/(auto-?write|automatically write|write the (graph|triage|coupling)[^\n]{0,40}(finding|output|result)[^\n]{0,40}(to|into)[^\n]{0,20}(STATE|STORY|SPEC)\.md)/i.test(text),
          `${label} does not auto-write a graph finding into a STATE.md/STORY.md/SPEC.md work record`
        );
        // And no seam pipes graph output into a CI pass/fail gate token.
        assert.ok(
          !/graph[^\n]{0,40}(output|finding|rank|triage)[^\n]{0,40}(fails? CI|blocks? the merge|sets? (the )?(status|verdict) (to )?(fail|block))/i.test(text),
          `${label} does not pipe graph output into a CI pass/fail gate or an automated block`
        );
      }
    },
  },
];
