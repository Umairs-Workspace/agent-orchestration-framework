// Fitness function: acd-status-rollback-bounded (milestone 20, ADR-005).
//
// rollbackItemStatus is the FAILURE face of the item-status lifecycle, and it is bounded
// HARD: it sets status only FROM in-progress TO not-started|blocked (never done/in-review),
// touches only the status line (body + every other frontmatter key byte-identical), and
// writes through the atomic fs.mjs:writeText.
//
// GENERALISED 2026-08-16 (the item-status lifecycle). This guard used to hold that
// rollbackItemStatus was the ONLY item-status writer — a claim that was true and was ALSO
// the bug: with no forward writer, nothing could ever set `in-progress`, so an item read
// `not-started` while it was being built and this rollback (which fires only FROM
// in-progress) was a permanent no-op. work.mjs now carries a second face, `setItemStatus`,
// permitted by the declared ITEM_STATUS_EDGES lifecycle table. What this fitness function
// protects is therefore the part that still matters, stated precisely:
//   · the two faces are the ONLY status writers, and they share ONE surgical write;
//   · the FAILURE face cannot write forward — its target set is exactly
//     not-started|blocked, whatever the lifecycle table permits elsewhere (a bug on the
//     failure path would otherwise falsely accept un-done work);
//   · no run-* command reaches frontmatter itself.
//
// (a) BEHAVIOURAL: a fixture item in-progress → not-started and → blocked succeed
//     (only the status line changes); → done and a from-state ≠ in-progress are
//     rejected (forbidden-rollback / rollback-not-applicable) writing nothing.
// (b) SOURCE-GREP (per 15/R3 + 10/R2, following the function): over the module family
//     that could write item frontmatter (src/work.mjs + src/commands/run-*.mjs) —
//     rollbackItemStatus's allowed targets are exactly not-started|blocked, the forward
//     face takes its permission from the lifecycle table (never from an argument), both
//     write through writeText, and the run-* command modules contain NO writeText/
//     writeFile/appendFile of their own (they reach frontmatter only through the ledger).
//
// Mirrors the stripComments/source-grep style of acd-run-write-scope.test.mjs.
import assert from "node:assert/strict";
import { mkdtemp, rm, mkdir, writeFile, readFile, readdir } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { rollbackItemStatus } from "../../../src/work.mjs";
import { ITEM_STATUS_EDGES } from "../../../src/acceptance-horizon.mjs";

const WORK = new URL("../../../src/work.mjs", import.meta.url);
const HORIZON = new URL("../../../src/acceptance-horizon.mjs", import.meta.url);
const RUN_COMMANDS = ["run-start.mjs", "run-complete.mjs", "run-status.mjs", "run-retry.mjs"].map(
  (name) => new URL(`../../../src/commands/${name}`, import.meta.url),
);
const WRITE_VERBS = ["writeText", "writeFile", "appendFile"];

function specDoc(status) {
  return [
    "---",
    "type: milestone",
    "number: 20",
    "slug: autonomous-run-resilience",
    'title: "Autonomous Run Resilience"',
    `status: ${status}`,
    "created: 2026-06-30",
    "updated: 2026-06-30",
    "---",
    "# 20 · Autonomous Run Resilience",
    "",
    "Body — must stay byte-identical.",
    "",
  ].join("\n");
}

async function makeItem(status) {
  const repo = await mkdtemp(path.join(os.tmpdir(), "aof-rollback-bounded-"));
  const dir = path.join(repo, "wiki", "work", "20_milestone_autonomous-run-resilience");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, "SPEC.md"), specDoc(status), "utf8");
  return { repo, item: { ref: "20", dir, type: "milestone" }, specPath: path.join(dir, "SPEC.md") };
}

async function assertRejectsWithCode(fn, code) {
  let caught = null;
  try {
    await fn();
  } catch (error) {
    caught = error;
  }
  assert.ok(caught, `expected a thrown error with code "${code}"`);
  assert.equal(caught.code, code, `the error carries code "${code}" (got "${caught?.code}")`);
}

export const archTests = [
  // (a) BEHAVIOURAL: the bounded write succeeds to the two legal targets, fails the rest.
  {
    name: "arch/status-rollback-bounded: in-progress → not-started|blocked succeeds (only status changes); → done and a non-in-progress from-state are rejected, writing nothing",
    async run() {
      // → not-started and → blocked each succeed, changing ONLY the status line.
      for (const target of ["not-started", "blocked"]) {
        const { repo, item, specPath } = await makeItem("in-progress");
        try {
          const before = await readFile(specPath, "utf8");
          await rollbackItemStatus(item, target);
          const after = await readFile(specPath, "utf8");
          assert.notEqual(after, before, `→ ${target} wrote the doc`);
          // exactly one line differs, and it is the status line set to the target
          assert.equal(
            after.replace(`status: ${target}`, "status: in-progress"),
            before,
            `→ ${target} changed ONLY the status line`,
          );
        } finally {
          await rm(repo, { recursive: true, force: true });
        }
      }

      // → done is a forbidden TARGET (rolling forward would accept un-done work).
      {
        const { repo, item, specPath } = await makeItem("in-progress");
        try {
          const before = await readFile(specPath, "utf8");
          await assertRejectsWithCode(() => rollbackItemStatus(item, "done"), "forbidden-rollback");
          assert.equal(await readFile(specPath, "utf8"), before, "→ done wrote nothing");
        } finally {
          await rm(repo, { recursive: true, force: true });
        }
      }

      // a from-state ≠ in-progress is rollback-not-applicable (the narrow seam).
      {
        const { repo, item, specPath } = await makeItem("done");
        try {
          const before = await readFile(specPath, "utf8");
          await assertRejectsWithCode(() => rollbackItemStatus(item, "not-started"), "rollback-not-applicable");
          assert.equal(await readFile(specPath, "utf8"), before, "a non-in-progress from-state wrote nothing");
        } finally {
          await rm(repo, { recursive: true, force: true });
        }
      }
    },
  },

  // (b) SOURCE-GREP: the two status faces are the only status-frontmatter writers, the
  // FAILURE face is bounded to not-started|blocked, both write through writeText; and no
  // run-* command writes frontmatter itself.
  {
    name: "arch/status-rollback-bounded: the failure face's allowed targets are exactly not-started|blocked, and every status write goes through writeText",
    async run() {
      const source = await readFile(WORK, "utf8");
      const code = stripComments(source);

      // rollbackItemStatus is defined in work.mjs (the item-frontmatter authority).
      assert.ok(
        /(?:export\s+)?async\s+function\s+rollbackItemStatus\s*\(/.test(code),
        "rollbackItemStatus is defined in src/work.mjs",
      );

      // …and so is its forward twin, whose permission comes from the DECLARED lifecycle
      // table rather than from a caller's argument (a bound in an argument list is a bound
      // a caller can pass wrong).
      assert.ok(
        /(?:export\s+)?async\s+function\s+setItemStatus\s*\(/.test(code),
        "setItemStatus — the lifecycle face — is defined in src/work.mjs",
      );
      // The table is DECLARED (frozen) and lives in the VOCABULARY leaf, not here: work.mjs
      // imports its permission rather than spelling the five words a second time — the
      // ADR-009/F single-home rule acd-acceptance-horizon-single-predicate enforces.
      assert.ok(
        !/ITEM_STATUS_EDGES\s*=\s*Object\.freeze\(/.test(code),
        "work.mjs does not re-declare the lifecycle table (that would be a second spelling of the five words)",
      );
      assert.ok(
        /import\s*\{[^}]*\bitemStatusEdges\b[^}]*\}\s*from\s*"\.\/acceptance-horizon\.mjs"/.test(code),
        "work.mjs takes its permission from the imported lifecycle table",
      );
      assert.ok(
        /ITEM_STATUS_EDGES\s*=\s*Object\.freeze\(/.test(stripComments(await readFile(HORIZON, "utf8"))),
        "the lifecycle edges are a frozen declared table in the vocabulary leaf",
      );
      // The forward face can never write a status the lifecycle does not declare, and the
      // table itself never leads FORWARD out of `done` (a terminal state).
      assert.deepEqual(ITEM_STATUS_EDGES.done, [], "done is terminal in the declared lifecycle");
      for (const [from, targets] of Object.entries(ITEM_STATUS_EDGES)) {
        assert.ok(!targets.includes(from), `${from} has no self-edge (a redelivery is refused, never re-written)`);
        for (const target of targets) {
          assert.ok(target in ITEM_STATUS_EDGES, `${from} → ${target} names a declared status`);
        }
      }
      // `done` is reachable ONLY from a state where work has actually happened — never from
      // not-started (an item nobody started cannot be accepted) and never from blocked (it
      // must be unblocked first). Both working states reach it, because only a STORY passes
      // through in-review: a milestone/uat/spike/chore is accepted straight from in-progress.
      const toDone = Object.entries(ITEM_STATUS_EDGES).filter(([, targets]) => targets.includes("done")).map(([from]) => from).sort();
      assert.deepEqual(toDone, ["in-progress", "in-review"], "done is reachable only from the two working states");

      // ONE surgical write serves both faces: exactly one `status:` line-rewrite in the
      // module, so a second writer cannot appear beside the guarded ones.
      const statusRewrites = code.match(/replace\(\/\^\(status:/g) ?? [];
      assert.equal(statusRewrites.length, 1, "there is exactly ONE status-line rewrite in work.mjs (both faces share it)");

      // Its allowed-target SET is exactly { not-started, blocked } — never done/in-review.
      const targetSet = code.match(/ROLLBACK_TARGETS\s*=\s*new Set\(\s*\[([^\]]*)\]\s*\)/);
      assert.ok(targetSet, "the allowed-target set ROLLBACK_TARGETS is a literal Set");
      const targets = targetSet[1]
        .split(",")
        .map((part) => part.trim().replace(/^["']|["']$/g, ""))
        .filter(Boolean)
        .sort();
      assert.deepEqual(targets, ["blocked", "not-started"], "the allowed targets are exactly not-started|blocked");
      for (const forbidden of ["done", "in-review"]) {
        assert.ok(!targets.includes(forbidden), `${forbidden} is NOT an allowed rollback target`);
      }

      // The rollback's bounding guard rejects a bad target with forbidden-rollback and a
      // non-in-progress from-state with rollback-not-applicable (the two coded bounds).
      assert.ok(/forbidden-rollback/.test(code), "a bad target is rejected forbidden-rollback");
      assert.ok(/rollback-not-applicable/.test(code), "a non-in-progress from-state is rejected rollback-not-applicable");

      // The write goes through the atomic writeText seam — work.mjs's ONLY write
      // verb is writeText (no raw writeFile/appendFile to a record doc).
      const workWrites = collectCalls(code, WRITE_VERBS);
      assert.ok(workWrites.length >= 1, "work.mjs performs at least one fs write (the status write)");
      for (const call of workWrites) {
        assert.equal(call.verb, "writeText", `work.mjs writes only via writeText (saw ${call.verb})`);
      }
    },
  },

  {
    name: "arch/status-rollback-bounded: no run-* command writes item frontmatter itself — it reaches it only by calling rollbackItemStatus",
    async run() {
      for (const url of RUN_COMMANDS) {
        const source = await readFile(url, "utf8");
        const code = stripComments(source);
        const name = url.pathname.split("/").pop();

        // The command module contains NO write verb of its own (no writeText/writeFile/
        // appendFile call) — the run store owns runs/ writes; frontmatter is reached
        // ONLY by delegating to work.mjs's rollbackItemStatus.
        const writes = collectCalls(code, WRITE_VERBS);
        assert.deepEqual(
          writes.map((call) => call.verb),
          [],
          `${name} performs no write verb of its own (frontmatter is reached only via rollbackItemStatus)`,
        );

        // NO run-* command reaches the frontmatter writer directly any more. Both
        // paths that roll a status back — a completion (m42 wave (d) leg d2) and a
        // RECLAIM (leg d4, port 2) — raise `run.completed` through a transition
        // seam, and the ledger's checkout-locus reactor (src/effects/table.mjs)
        // performs the one bounded rollback: declared, not remembered. run-start's
        // inline reclaim loop was the last direct caller and the reason the two
        // reclaim halves disagreed (the control tick never had that loop at all).
        assert.ok(
          !/rollbackItemStatus\s*\(/.test(code),
          `${name} does not call rollbackItemStatus directly — the run.completed reactor owns it`,
        );
        const seamFor = { "run-start.mjs": "transitionStaleRunsReclaimed", "run-complete.mjs": "transitionRunComplete" }[name];
        if (seamFor) {
          assert.ok(
            new RegExp(`${seamFor}\\s*\\(`).test(code),
            `${name} reaches the run fact through the transition seam (${seamFor})`,
          );
          const effectsCode = stripComments(await readFile(new URL("../../../src/effects/table.mjs", import.meta.url), "utf8"));
          assert.ok(
            /rollbackItemStatus\s*\(/.test(effectsCode),
            "src/effects/table.mjs's run.completed cascade calls rollbackItemStatus (the declared rollback reactor)",
          );
        }
      }
    },
  },
];

// --- source-analysis helpers (mirroring acd-run-write-scope) ----------------

function stripComments(source) {
  return source.replace(/\/\/[^\n]*/g, "").replace(/\/\*[\s\S]*?\*\//g, "");
}

function collectCalls(code, verbs) {
  const calls = [];
  for (const verb of verbs) {
    const re = new RegExp(`\\b${verb}\\s*\\(`, "g");
    let match;
    while ((match = re.exec(code))) {
      const start = match.index + match[0].length;
      calls.push({ verb, firstArg: firstArgument(code, start) });
    }
  }
  return calls;
}

function firstArgument(code, start) {
  let depth = 0;
  let out = "";
  for (let i = start; i < code.length; i += 1) {
    const ch = code[i];
    if (ch === "(" || ch === "[" || ch === "{") depth += 1;
    else if (ch === ")" || ch === "]" || ch === "}") {
      if (depth === 0) break;
      depth -= 1;
    } else if (ch === "," && depth === 0) break;
    out += ch;
  }
  return out.trim();
}
