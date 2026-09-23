// Fitness function — NO TRACKED RUN RECORD NAMES A MACHINE (132/03).
//
// WHAT HAPPENED. A run record carries the node that wrote it twice: as the `runs/<node>/`
// folder it sits in and as its own `node` key. Until 132 a derived node id WAS the machine's
// sanitized hostname, so every record the loop wrote named the machine, and the loop's lane
// commit (`git commit --no-verify`, headless by design) carried them into source control:
// 127/VERIFICATION F-12 (twelve records, six folders, scrubbed by hand in 20582a8) and again
// under 130 (fifteen records, 615678a). 132 removed the disclosure at its source — a derived
// id is now the opaque `node-<hash>` — and this guard is what keeps it removed.
//
// THE RULE. A tracked `runs/<node>/` segment, and the `node` key of every tracked run record,
// is OPAQUE (`OPAQUE_NODE_ID_SHAPE`, the forms `deriveNodeId` produces) or carries a BASELINE
// entry with a written reason. An operator-PINNED name (`aof mesh identity --name aof-wsl`) is
// not opaque and is not special-cased: a guard cannot tell a name an operator chose from one a
// machine supplied, and the baseline entry is exactly where that judgement gets recorded.
//
// THE SUBJECT IS `git ls-files`, not the working tree — the rule is about what is PUBLISHED.
// The path rule counts FILES per segment (records and their progress logs alike), so a listed
// segment may not grow; a flat `runs/<runId>.json` has no segment and is out of subject for it,
// but in subject for the record rule, where a `null` node is not a machine name and passes.
//
// THE BASELINE IS SHRINK-ONLY — the ratchet `acd-no-internal-project-names` and the TECH_DEBT
// ledger both use. Adding an entry, or raising a count, is a visible, reviewable act; removing
// one needs no ceremony, and an entry whose segment has left the tree FAILS until it is deleted.
//
// NOT THE PRIVATE-TERMS GUARD. `test/arch/work/acd-no-internal-project-names.test.mjs` keeps
// downstream PROJECT names out of the repo from a gitignored, per-machine term list, and it is
// green with every one of these records tracked, because its list names projects, not
// machines. It must not be widened into this: putting a machine name into its term list would
// defeat the design that keeps names out of the repo. Two controls, kept separate.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { OPAQUE_NODE_ID_SHAPE } from "../../../src/node-identity.mjs";

const repoRoot = fileURLToPath(new URL("../../../", import.meta.url));
const SIBLING = "test/arch/work/acd-no-internal-project-names.test.mjs";

// Segment → the most FILES it may carry, each with a written reason.
const BASELINE = new Map([
  // (The control node's post-scrub placeholder segment, baselined at 184, left the tree on
  // 2026-09-23: its records moved to the node's opaque id, which needs no entry.)
  // The Mac worker's post-scrub placeholder, from the public-repo move (2026-09-13). Measured 2026-09-22.
  ["umamis-mac-mini", 5],
]);

const RUN_PATH = /(?:^|\/)runs\/(.+)$/;

function trackedFiles() {
  return execFileSync("git", ["ls-files", "-z"], { cwd: repoRoot, maxBuffer: 64 * 1024 * 1024 })
    .toString("utf8").split("\0").filter(Boolean);
}

function readTrackedRecord(rel) {
  try {
    return JSON.parse(readFileSync(path.join(repoRoot, rel), "utf8"));
  } catch {
    return null; // a torn record is no machine name — the run store skips it too
  }
}

const isOpaque = (value) => typeof value === "string" && OPAQUE_NODE_ID_SHAPE.test(value);

// The scan, over an injected file list and record reader so the self-check and the planted
// rows drive the SAME code the tree is judged by.
function scanRunRecords(files, readRecord, baseline = BASELINE) {
  const segments = new Map();
  const violations = [];
  let visited = 0;
  for (const rel of files) {
    const match = RUN_PATH.exec(rel);
    if (match == null) continue;
    visited += 1;
    const parts = match[1].split("/");
    if (parts.length >= 2) {
      if (!segments.has(parts[0])) segments.set(parts[0], []);
      segments.get(parts[0]).push(rel);
    }
    if (rel.endsWith(".json")) {
      const node = readRecord(rel)?.node;
      if (node != null && !isOpaque(node) && !baseline.has(node)) {
        violations.push(`record rule: ${rel} carries node "${node}" — neither opaque nor baselined`);
      }
    }
  }
  const slack = new Map();
  for (const [segment, list] of [...segments].sort(([a], [b]) => a.localeCompare(b))) {
    if (isOpaque(segment)) continue;
    const cap = baseline.get(segment);
    if (cap == null) {
      for (const rel of list) violations.push(`path rule: segment "${segment}" is neither opaque nor baselined — ${rel}`);
    } else if (list.length > cap) {
      // The newest files by run id are the likeliest additions, so they are the ones named.
      const byRunId = (a, b) => path.basename(a).localeCompare(path.basename(b)) || a.localeCompare(b);
      const excess = [...list].sort(byRunId).slice(cap);
      violations.push(`path rule: segment "${segment}" carries ${list.length} files, over its baseline of ${cap} — ${excess.join(", ")}`);
    } else if (list.length < cap) {
      slack.set(segment, cap - list.length);
    }
  }
  const stale = [...baseline.keys()].filter((segment) => !(segments.get(segment)?.length > 0)).sort();
  return { violations, slack, stale, visited };
}

// The real tree plus planted entries — a planted path reads its planted record.
function withPlanted(planted) {
  const files = [...trackedFiles(), ...Object.keys(planted)];
  const read = (rel) => (rel in planted ? planted[rel] : readTrackedRecord(rel));
  return { files, read };
}

export const archTests = [
  {
    name: "arch/disclosure (acd-run-records-name-no-machine): the tree is at its baseline — every tracked runs/<node>/ segment and node key is opaque or baselined",
    run: async () => {
      const { violations, slack, visited } = scanRunRecords(trackedFiles(), readTrackedRecord);
      assert.ok(visited > 0, "the scan visited tracked run records");
      assert.deepEqual(
        violations,
        [],
        "a tracked run record names a node that is neither opaque nor baselined. Re-identify the node " +
        "(`aof mesh identity --reidentify`) and move the record, or — for a name an operator chose — add a " +
        `baseline entry with a written reason. Never raise a count to absorb growth.\n  ${violations.join("\n  ")}`,
      );
      // The ratchet's slack, stated so the baseline can be tightened in a later pass.
      for (const [segment, n] of slack) console.log(`# acd-run-records-name-no-machine: "${segment}" is ${n} below its baseline — tighten it`);
    },
  },
  {
    name: "arch/disclosure (acd-run-records-name-no-machine): a planted segment that is not opaque and not baselined fails, naming the segment and the file",
    run: async () => {
      const rows = [
        ["node-7f3a", true],
        ["node-7f3a9c21", true],
        ["desk-machine-01", false],
        ["umamis-mac-mini", false], // listed, but over its count of 5
        ["aof-wsl", false], // an operator-pinned name needs an entry
        ["WORKSTATION-01", false],
      ];
      for (const [segment, passes] of rows) {
        const rel = `wiki/work/99_milestone_x/runs/${segment}/20260922T000000000Z-0000.json`;
        const { files, read } = withPlanted({ [rel]: { runId: "20260922T000000000Z-0000", node: segment } });
        const { violations } = scanRunRecords(files, read);
        if (passes) {
          assert.deepEqual(violations, [], `${segment} passes`);
        } else {
          const pathFailure = violations.find((line) => line.startsWith("path rule:") && line.includes(`"${segment}"`) && line.includes(rel));
          assert.ok(pathFailure, `${segment} fails, naming the segment and the file (got ${JSON.stringify(violations)})`);
        }
      }
    },
  },
  {
    name: "arch/disclosure (acd-run-records-name-no-machine): the record's own node key is in subject, not only its path",
    run: async () => {
      const rel = "wiki/work/99_milestone_x/runs/node-7f3a/20260922T000000000Z-0000.json";
      const { files, read } = withPlanted({ [rel]: { runId: "20260922T000000000Z-0000", node: "desk-machine-01" } });
      const { violations } = scanRunRecords(files, read);
      assert.equal(violations.length, 1, JSON.stringify(violations));
      assert.match(violations[0], /^record rule:/, "the message distinguishes the record rule from the path rule");
      assert.ok(violations[0].includes(rel) && violations[0].includes('"desk-machine-01"'), "it names the record and its node value");
    },
  },
  {
    name: "arch/disclosure (acd-run-records-name-no-machine): a flat record is out of subject for the path rule and in subject for the record rule",
    run: async () => {
      const rel = "wiki/work/99_milestone_x/runs/20260922T000000000Z-0000.json";
      for (const [node, passes] of [[null, true], ["node-7f3a", true], ["desk-machine-01", false]]) {
        const { files, read } = withPlanted({ [rel]: { runId: "20260922T000000000Z-0000", node } });
        const { violations } = scanRunRecords(files, read);
        if (passes) assert.deepEqual(violations, [], `node ${JSON.stringify(node)} passes`);
        else assert.ok(violations.length === 1 && violations[0].startsWith("record rule:") && violations[0].includes(rel), JSON.stringify(violations));
      }
    },
  },
  {
    name: "arch/disclosure (acd-run-records-name-no-machine): the ratchet only shrinks — a segment below its count passes and states its slack",
    run: async () => {
      const all = trackedFiles();
      const under = all.filter((rel) => RUN_PATH.exec(rel)?.[1].startsWith("umamis-mac-mini/"));
      assert.ok(under.length >= 4, "the tree carries files under the baselined segment");
      const dropped = new Set(under.slice(0, 4));
      const { violations, slack } = scanRunRecords(all.filter((rel) => !dropped.has(rel)), readTrackedRecord);
      assert.deepEqual(violations, []);
      assert.equal(slack.get("umamis-mac-mini"), BASELINE.get("umamis-mac-mini") - under.length + 4, "the slack is stated");
    },
  },
  {
    name: "arch/disclosure (acd-run-records-name-no-machine): the baseline never rots — every listed segment still carries a tracked file",
    run: async () => {
      const all = trackedFiles();
      const { stale } = scanRunRecords(all, readTrackedRecord);
      assert.deepEqual(stale, [], `these segments have left the tree and their baseline entries must be REMOVED:\n  ${stale.join("\n  ")}`);
      // …and a segment that disappears is named.
      const gone = all.filter((rel) => !RUN_PATH.exec(rel)?.[1].startsWith("umamis-mac-mini/"));
      assert.deepEqual(scanRunRecords(gone, readTrackedRecord).stale, ["umamis-mac-mini"]);
    },
  },
  {
    name: "arch/disclosure (acd-run-records-name-no-machine): self-check — the scan is non-vacuous and fires on a planted machine name",
    run: async () => {
      const planted = "wiki/work/1_milestone_x/runs/some-machine-name/20260922T000000000Z-0000.json";
      const dirty = scanRunRecords([planted], () => ({ node: "some-machine-name" }), new Map());
      assert.ok(dirty.violations.some((line) => line.includes(planted)), "it reports the planted record");
      assert.ok(dirty.visited > 0);
      const clean = scanRunRecords(["wiki/work/1_milestone_x/runs/node-7f3a/20260922T000000000Z-0000.json"], () => ({ node: "node-7f3a" }), new Map());
      assert.deepEqual(clean.violations, [], "silent on an opaque segment — the guard is not trivially red");
      assert.ok(clean.visited > 0);
    },
  },
  {
    name: "arch/disclosure (acd-run-records-name-no-machine): the private-terms guard gains no exemption and no new term",
    run: async () => {
      const sibling = readFileSync(path.join(repoRoot, SIBLING), "utf8");
      // Its EXEMPT set is exactly the guard itself and the term list, and its BASELINE map is
      // empty — a change there is that guard's own decision, never an absorption of this one.
      const exempt = sibling.match(/const EXEMPT = new Set\(\[([\s\S]*?)\]\);/)?.[1] ?? null;
      assert.ok(exempt != null, "the sibling's EXEMPT set is found");
      assert.deepEqual([...exempt.matchAll(/^\s*([^\s/][^,\n]*?),/gm)].map((m) => m[1].trim()), ["SELF", '".aof/private-terms.json"']);
      const baseline = sibling.match(/const BASELINE = new Map\(\[([\s\S]*?)\]\);/)?.[1] ?? null;
      assert.ok(baseline != null, "the sibling's BASELINE map is found");
      assert.deepEqual(baseline.split("\n").map((line) => line.trim()).filter((line) => line.length > 0 && !line.startsWith("//")), [], "its BASELINE stays empty");
      // Its term list is per-machine and untracked, so no commit — this story's included — can
      // add a term to it. Its CONTENT is the operator's, and is not read here.
      assert.ok(!trackedFiles().includes(".aof/private-terms.json"), "the private term list is not tracked");
      // The two guards name each other, so a later reader does not merge them.
      assert.match(sibling, /acd-run-records-name-no-machine/, "the private-terms guard names this one");
      assert.match(readFileSync(fileURLToPath(import.meta.url), "utf8"), /acd-no-internal-project-names/, "this guard names the private-terms one");
    },
  },
];
