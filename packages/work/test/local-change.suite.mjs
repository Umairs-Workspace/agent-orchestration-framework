// Story 164/00 — the "changed since observed" predicate's own rules (164/ADR-002, FF-16401): what a
// fingerprint covers, that a prose-only edit is no change, and that a missing baseline never is.
// The end-to-end cases over a real store and a real work tree are test/store/sync-local-change-owed.
import assert from "node:assert/strict";
import path from "node:path";
import { FINGERPRINT_FIELDS, cacheAnswers, locallyChanged, normalizeSourcePath, projectedRow, reportedElsewhere, rowFingerprint } from "@aof/work/local-change";

const ROW = Object.freeze({ ref: "164/00", type: "story", slug: "a-local-change", status: "not-started", title: "A local change", parent: "164", sourcePath: "/w/164/STORY.md" });

export const localChangeTests = [
  {
    name: "164/00 local-change: a fingerprint is stable, and changes with every field the store carries",
    run() {
      assert.equal(rowFingerprint(ROW), rowFingerprint({ ...ROW }), "the same row hashes alike");
      assert.equal(rowFingerprint(ROW), rowFingerprint({ ...ROW, backlog: null, archived: undefined }), "absent and null are one state");
      for (const field of FINGERPRINT_FIELDS) {
        const changed = { ...ROW, [field]: field === "archived" ? true : `${ROW[field] ?? ""}-moved` };
        assert.notEqual(rowFingerprint(changed), rowFingerprint(ROW), `a change to ${field} is a change`);
      }
    },
  },
  {
    name: "164/00 local-change: the ref is the key, not a hashed field — and nothing outside the row is hashed",
    run() {
      assert.equal(rowFingerprint(ROW), rowFingerprint({ ...ROW, ref: "164/09" }));
      assert.equal(rowFingerprint(ROW), rowFingerprint({ ...ROW, body: "a reworded user story" }), "prose is not a row field");
    },
  },
  {
    name: "164/00 local-change: a missing baseline is never a change; a different fingerprint is",
    run() {
      const fp = rowFingerprint(ROW);
      assert.equal(locallyChanged(fp, undefined), false);
      assert.equal(locallyChanged(fp, null), false);
      assert.equal(locallyChanged(fp, ""), false);
      assert.equal(locallyChanged(fp, fp), false);
      assert.equal(locallyChanged(fp, rowFingerprint({ ...ROW, status: "in-progress" })), true);
    },
  },
  {
    name: "164/02 local-change: the projected row is the store's row shape — frontmatter status/title, the normalised doc path, and the location keys only when present",
    run() {
      const dir = path.join("w", "164_milestone_m", "stories", "00_story_s");
      const item = { ref: "164/00", type: "story", slug: "s", parent: "164", dir, number: "00" };
      const row = projectedRow(item, { status: "in-progress", title: "Noticed", owner: "ignored" }, "STORY.md");
      assert.deepEqual(row, { ref: "164/00", type: "story", slug: "s", status: "in-progress", title: "Noticed", parent: "164", sourcePath: normalizeSourcePath(path.join(dir, "STORY.md")) });
      assert.ok(!row.sourcePath.includes("\\") && path.isAbsolute(row.sourcePath));
      assert.deepEqual(projectedRow(item, {}, "STORY.md").status, null, "a missing status is null, as the store binds it");
      assert.equal(projectedRow({ ...item, number: null, backlog: "ideas" }, {}, "STORY.md").backlog, "ideas");
      assert.equal(projectedRow({ ...item, archived: true }, {}, "STORY.md").archived, true);
    },
  },
  {
    name: "164/02 local-change: the cache answers only for another node's report on an unchanged record",
    run() {
      const self = "node-7297";
      assert.equal(cacheAnswers({ reportedBy: "node-9549" }, { selfNodeId: self }), true, "another node's report, record unchanged");
      assert.equal(cacheAnswers({ reportedBy: "node-9549" }, { selfNodeId: self, locallyChanged: true }), false, "a local edit outranks it");
      assert.equal(cacheAnswers({ reportedBy: self }, { selfNodeId: self }), false, "this node's own report is an older copy of its files");
      assert.equal(cacheAnswers({ reportedBy: null }, { selfNodeId: self }), false, "an unknown author is not 'another node'");
      assert.equal(reportedElsewhere({ answeredFrom: "disk", reportedBy: "node-9549" }, self), false, "a disk answer is this node's own");
      assert.equal(reportedElsewhere({ answeredFrom: "cache", reportedBy: "node-9549" }, self), true);
    },
  },
];
