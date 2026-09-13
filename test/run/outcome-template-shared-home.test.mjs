// Traceability wiring for story 80 / tasks/00_the-template-has-one-home.feature —
// "The OUTCOME.md template ships once, filed under no type, and the milestone copy
// is deleted on update" (@executable).
//
// THE BOUNDARY WAS THE FILING, AND NOTHING ELSE. `templateOutputPath`
// (src/work/bundle.mjs) renders every template file to
// `.aof/templates/work/<member-id>/<file>`, so the member id IS the scope. The
// member's id therefore names the PROPERTY — `shared`, type-agnostic — not a type,
// and the grammar the single `parseOutcome` reads is asserted byte-identical across
// the move. Every assertion below reads the REAL descriptor, the REAL bundle root
// and the REAL shipped manifest; the update-path scenario drives the REAL
// `planApplyActions` classifier against a lock recording the OLD path.
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { mkdtemp, mkdir, writeFile, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  loadBundle,
  readDescriptor,
  renderBundleOutputs,
  renderBundleTemplateOutputs,
  bundleRoot,
  TEMPLATE_STAMP,
} from "../../src/work/bundle.mjs";
import { readShippedManifest, generateBundleManifest, serializeBundleManifest, manifestPath } from "../../src/work/bundle-manifest.mjs";
import { planApplyActions, executeApplyActions, createLockManifest } from "../../src/render-plan.mjs";
import { synthesizeBundleConfig } from "../../src/work/bundle-synthesis.mjs";
import { updateWork, workLockPath } from "../../src/work/update.mjs";
import { writeLock } from "../../src/lock.mjs";
import { loadWorkspace } from "../../src/work.mjs";
import { doctorWork } from "../../src/work/doctor.mjs";
import { budgetGroup, budgetKeyFor } from "../../src/work/doctor-budget.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

// The frozen work-item type vocabulary. A template member whose id is one of these
// scopes its files to that type — which is exactly what OUTCOME.md must NOT be.
const WORK_ITEM_TYPES = ["milestone", "story", "task", "uat", "spike", "chore"];

const SHARED_SOURCE = path.join(repoRoot, "src", "bundle", "templates", "shared", "OUTCOME.md");
const NEW_RENDER_PATH = ".aof/templates/work/shared/OUTCOME.md";
const OLD_RENDER_PATH = ".aof/templates/work/milestone/OUTCOME.md";

function normalize(p) {
  return String(p).replaceAll("\\", "/");
}

function templateMembers() {
  return readDescriptor().members.filter((member) => member.kind === "template");
}

function outcomeOutputs() {
  return renderBundleTemplateOutputs(loadBundle(), { runtimes: ["claude"] }).filter(
    (output) => output.resource?.file === "OUTCOME.md",
  );
}

// Everything between a `## Heading` and the next `##`-level heading. `### ` does not
// match `/^##\s+/` (its third char is `#`), so a sub-heading stays inside its parent.
function sectionBody(text, heading) {
  const lines = text.split(/\r?\n/);
  const at = lines.findIndex((line) => line.trim() === heading);
  if (at === -1) return null;
  const body = [];
  for (let i = at + 1; i < lines.length; i++) {
    if (/^##\s+/.test(lines[i])) break;
    body.push(lines[i]);
  }
  return body.join("\n");
}

export const outcomeTemplateSharedHomeTests = [
  // ==================================================================
  // Scenario: the OUTCOME template is declared exactly once, under a
  // member that is not a work-item type
  // ==================================================================
  {
    name: "80/00 outcome-home: exactly one declared template member ships an OUTCOME.md, and its id is not a work-item type",
    run: async () => {
      const root = bundleRoot();
      const carrying = templateMembers().filter((member) =>
        existsSync(path.join(root, member.dir, "OUTCOME.md")),
      );
      assert.equal(
        carrying.length,
        1,
        `exactly one declared template member's directory contains an OUTCOME.md; got ${JSON.stringify(carrying.map((m) => m.id))}`,
      );

      const [member] = carrying;
      assert.ok(
        !WORK_ITEM_TYPES.includes(member.id),
        `the OUTCOME-carrying member's id ("${member.id}") is not the id of any work-item type (${WORK_ITEM_TYPES.join(", ")})`,
      );
      assert.equal(member.id, "shared", 'the type-agnostic member is "shared"');

      // ...and no PER-TYPE template directory on disk carries one either — the
      // move is not a fork.
      for (const type of WORK_ITEM_TYPES) {
        const stray = path.join(root, "templates", type, "OUTCOME.md");
        assert.ok(!existsSync(stray), `no per-type template directory ships an OUTCOME.md; found ${normalize(stray)}`);
      }
    },
  },

  // ==================================================================
  // Scenario: the rendered template lands at the type-agnostic path,
  // marker-stamped
  // ==================================================================
  {
    name: `80/00 outcome-home: the canonical render puts OUTCOME.md at "${NEW_RENDER_PATH}", source bytes with the leading marker prepended`,
    run: async () => {
      const outputs = outcomeOutputs();
      assert.equal(outputs.length, 1, `exactly one rendered output is an OUTCOME.md; got ${outputs.length}`);
      const [output] = outputs;
      assert.equal(normalize(output.path), NEW_RENDER_PATH, "the rendered path is the type-agnostic one");

      const sourceBytes = await readFile(SHARED_SOURCE, "utf8");
      assert.equal(
        output.content,
        `${TEMPLATE_STAMP}\n\n${sourceBytes.replace(/^﻿/, "")}`,
        "the rendered content is the source bytes with the leading bundle marker prepended",
      );
      // ...and stripping that marker yields the source bytes unchanged.
      assert.equal(
        output.content.slice(`${TEMPLATE_STAMP}\n\n`.length),
        sourceBytes.replace(/^﻿/, ""),
        "stripping the marker yields the source bytes unchanged",
      );

      const everyPath = renderBundleOutputs(loadBundle(), { runtimes: ["claude"] }).map((o) => normalize(o.path));
      assert.ok(
        !everyPath.includes(OLD_RENDER_PATH),
        `no rendered output path is the milestone-filed one (${OLD_RENDER_PATH})`,
      );
    },
  },

  // ==================================================================
  // Scenario Outline: the shipped grammar is byte-identical across the move.
  // parseOutcome and every fixture in the 39 suite read this grammar — the
  // move must not touch a byte of it.
  // ==================================================================
  {
    name: '80/00 outcome-home: grammar — its first content line is "# NN · <Item Title> — Outcome"',
    run: async () => {
      const source = await readFile(SHARED_SOURCE, "utf8");
      assert.equal(source.split(/\r?\n/)[0], "# NN · <Item Title> — Outcome");
    },
  },
  {
    name: "80/00 outcome-home: grammar — its frontmatter is absent; the file opens on no `---` fence",
    run: async () => {
      const source = await readFile(SHARED_SOURCE, "utf8");
      assert.ok(!source.startsWith("---"), "the template carries no identity frontmatter (ADR-004)");
    },
  },
  {
    name: '80/00 outcome-home: grammar — its top-level headings in document order are "## Delivered", "## Assumptions", "## Gaps"',
    run: async () => {
      const source = await readFile(SHARED_SOURCE, "utf8");
      const headings = source
        .split(/\r?\n/)
        .filter((line) => /^##\s+\S/.test(line))
        .map((line) => line.trim());
      assert.deepEqual(headings, ["## Delivered", "## Assumptions", "## Gaps"]);
    },
  },
  {
    name: '80/00 outcome-home: grammar — its Delivered placeholder heading is "### <Capability name>"',
    run: async () => {
      const source = await readFile(SHARED_SOURCE, "utf8");
      const body = sectionBody(source, "## Delivered") ?? "";
      assert.match(body, /^### <Capability name>$/m);
    },
  },
  {
    name: '80/00 outcome-home: grammar — its Gaps entry carries "- **Status:**" and "- **Discharge condition:**"',
    run: async () => {
      const source = await readFile(SHARED_SOURCE, "utf8");
      const body = sectionBody(source, "## Gaps") ?? "";
      assert.match(body, /^- \*\*Status:\*\*/m);
      assert.match(body, /^- \*\*Discharge condition:\*\*/m);
    },
  },

  // ==================================================================
  // Scenario: the template's prose names no work-item type — the
  // type-agnostic claim, made checkable.
  // ==================================================================
  {
    name: "80/00 outcome-home: the template's text names no work-item type and calls its subject \"this item\"",
    run: async () => {
      const source = await readFile(SHARED_SOURCE, "utf8");
      for (const type of ["milestone", "story", "chore", "spike", "uat"]) {
        assert.ok(
          !new RegExp(`\\b${type}\\b`, "i").test(source),
          `the template's prose does not name the work-item type "${type}"`,
        );
      }
      assert.match(source, /this item/, 'the template refers to its subject as "this item"');
    },
  },

  // ==================================================================
  // Scenario: an existing install's milestone-filed copy is DELETED rather
  // than left beside the new one. A surviving copy would be a second,
  // un-updated source of the grammar in every repo that ever ran `init`.
  // ==================================================================
  {
    name: "80/00 outcome-home: `aof work update` on an install lock recording the milestone-filed path deletes it, creates the shared one, rewrites the lock, and re-runs clean",
    run: async () => {
      const targetDir = await mkdtemp(path.join(os.tmpdir(), "aof-80-outcome-move-"));
      try {
        // TWO BUNDLES OVER THE SAME REAL BYTES — the move, modelled exactly. A template
        // member renders to `.aof/templates/work/<member-id>/<file>`, so the SAME source
        // file under member id "milestone" IS the old install and under "shared" IS the
        // new one. Nothing here hand-rolls a lock or a drift decision: the base install
        // and the update both run the engine (`test/work/work-update.test.mjs`'s own rule — a
        // second install engine in a test is the second home the bundle exists to refuse).
        const outcomeMember = (id) => ({
          resources: [],
          hooks: [],
          assets: [],
          templates: [{ id, kind: "template", dir: "templates/shared", files: ["OUTCOME.md"] }],
        });
        const runtimes = ["claude"];

        const oldBundle = outcomeMember("milestone");
        const { desiredOutputs: baseOutputs } = await synthesizeBundleConfig(oldBundle, { runtimes, targetDir });
        const baseActions = await planApplyActions(baseOutputs, null, { force: false, targetDir });
        await executeApplyActions(baseActions);
        const base = createLockManifest({ actions: baseActions, desiredOutputs: baseOutputs, previousLock: null, config: { packages: [] }, runtimes });
        await writeLock(workLockPath(targetDir), {
          work: {
            generatedAt: base.generatedAt,
            bundle: { version: "1.0.0" },
            runtimes,
            files: base.files.map((entry) => ({ ...entry, path: normalize(entry.path) })),
            packages: base.packages,
            frameworks: base.frameworks,
            frameworkInstallAttempts: base.frameworkInstallAttempts,
          },
        });

        const legacyAbs = path.join(targetDir, OLD_RENDER_PATH);
        assert.ok(existsSync(legacyAbs), "sanity: the base install put the OUTCOME.md at the milestone-filed path");
        const lockedBefore = JSON.parse(await readFile(workLockPath(targetDir), "utf8")).work.files.map((f) => normalize(f.path));
        assert.deepEqual(lockedBefore, [OLD_RENDER_PATH], "sanity: the install lock records the milestone-filed path");

        // …then `aof work update` against the bundle where the member is `shared`.
        const result = await updateWork({ targetDir, bundleOverride: outcomeMember("shared"), bundleVersionOverride: "2.0.0" });
        const byPath = new Map(result.actions.map((a) => [normalize(a.path), a.action]));
        assert.equal(byPath.get(OLD_RENDER_PATH), "delete", `the plan carries a delete for ${OLD_RENDER_PATH}; got ${JSON.stringify([...byPath])}`);
        assert.equal(byPath.get(NEW_RENDER_PATH), "create", `the plan carries a create for ${NEW_RENDER_PATH}`);

        assert.ok(!existsSync(legacyAbs), "after apply the milestone-filed copy is absent from disk");
        assert.ok(existsSync(path.join(targetDir, NEW_RENDER_PATH)), "after apply the shared-filed copy is present on disk");

        const lockedAfter = JSON.parse(await readFile(workLockPath(targetDir), "utf8")).work.files.map((f) => normalize(f.path));
        assert.ok(lockedAfter.includes(NEW_RENDER_PATH), `the rewritten lock records the new path; got ${JSON.stringify(lockedAfter)}`);
        assert.ok(!lockedAfter.includes(OLD_RENDER_PATH), `the rewritten lock does not record the old path; got ${JSON.stringify(lockedAfter)}`);

        // Re-running reports skip for the new path and plans no further delete.
        const second = await updateWork({ targetDir, bundleOverride: outcomeMember("shared"), bundleVersionOverride: "2.0.0" });
        assert.deepEqual(
          second.actions.map((a) => a.action),
          ["skip"],
          `the second run reports skip and plans no further delete; got ${JSON.stringify(second.actions.map((a) => [normalize(a.path), a.action]))}`,
        );
      } finally {
        await rm(targetDir, { recursive: true, force: true });
      }
    },
  },

  // ==================================================================
  // Scenario: membership and the shipped manifest stay complete across the move
  // ==================================================================
  {
    name: "80/00 outcome-home: every declared template member file exists on disk and every on-disk template file is declared",
    run: async () => {
      const root = bundleRoot();
      const bundle = loadBundle();
      const declared = new Set();
      for (const member of bundle.templates) {
        for (const file of member.files) declared.add(normalize(path.join(member.dir, file)));
      }
      // On-disk: every file under templates/<dir>/ for each declared member dir,
      // plus a sweep of the template root so an UNDECLARED directory is caught.
      const { readdir } = await import("node:fs/promises");
      const onDisk = new Set();
      const templateRoot = path.join(root, "templates");
      for (const entry of await readdir(templateRoot, { withFileTypes: true })) {
        if (!entry.isDirectory()) continue;
        for (const file of await readdir(path.join(templateRoot, entry.name))) {
          onDisk.add(normalize(path.join("templates", entry.name, file)));
        }
      }
      assert.deepEqual(
        [...declared].sort(),
        [...onDisk].sort(),
        "the declared-member file set and the on-disk template file set are equal — no undeclared file, no declared member missing",
      );
    },
  },
  {
    name: '80/00 outcome-home: the shipped manifest carries exactly one entry whose path ends in "/OUTCOME.md", and regenerating it reproduces the shipped file byte-for-byte',
    run: async () => {
      const shipped = readShippedManifest();
      const outcomeEntries = shipped.entries.filter((entry) => normalize(entry.path).endsWith("/OUTCOME.md"));
      assert.equal(
        outcomeEntries.length,
        1,
        `exactly one manifest entry is an OUTCOME.md; got ${JSON.stringify(outcomeEntries.map((e) => e.path))}`,
      );
      assert.equal(normalize(outcomeEntries[0].path), NEW_RENDER_PATH, "and it is the type-agnostic path");

      const onDisk = await readFile(manifestPath(), "utf8");
      assert.equal(
        serializeBundleManifest(generateBundleManifest()),
        onDisk,
        "regenerating the manifest reproduces the shipped file byte-for-byte — the manifest is derived, never hand-maintained",
      );
    },
  },

  // ==================================================================
  // Scenario Outline: an OUTCOME.md is UNBUDGETED, whatever type carries it.
  // A decision, stated as a check so a later reader cannot mistake it for an
  // oversight — the second Accept-time artifact adds no doc-over-budget finding.
  // ==================================================================
  ...[
    { type: "milestone", dir: "39_milestone_delivery", record: "SPEC.md", budgeted: "SPEC.md" },
    { type: "story", dir: "80_story_outcome-everywhere", record: "STORY.md", budgeted: "STORY.md" },
    { type: "chore", dir: "81_chore_pin-eol", record: "CHORE.md", budgeted: null },
  ].map(({ type, dir, record, budgeted }) => ({
    name: `80/00 outcome-home: a ${type} whose OUTCOME.md is 400 lines draws no "doc-over-budget" finding anchored at it`,
    run: async () => {
      const projectRoot = await mkdtemp(path.join(os.tmpdir(), `aof-80-budget-${type}-`));
      try {
        const workDir = path.join(projectRoot, "wiki", "work");
        const itemDir = path.join(workDir, dir);
        await mkdir(itemDir, { recursive: true });
        await mkdir(path.join(projectRoot, ".aof"), { recursive: true });
        await writeFile(
          path.join(projectRoot, ".aof", "aof.config.json"),
          JSON.stringify({ name: "fixture", work: { dir: "./wiki/work" } }, null, 2),
          "utf8",
        );

        const number = dir.slice(0, 2);
        await writeFile(path.join(itemDir, record), `# ${number} · Budget probe\n`, "utf8");
        // 400 lines — far past every configured budget, so a budgeted artifact of
        // this size WOULD fire. OUTCOME.md must not.
        await writeFile(
          path.join(itemDir, "OUTCOME.md"),
          Array.from({ length: 400 }, (_, i) => `line ${i + 1}`).join("\n") + "\n",
          "utf8",
        );

        const { config } = await loadWorkspace(projectRoot);
        const findings = await doctorWork(workDir, config, null, { groups: [budgetGroup] });
        const anchored = findings.filter(
          (finding) => finding.code === "doc-over-budget" && normalize(finding.path ?? "").endsWith("/OUTCOME.md"),
        );
        assert.deepEqual(
          anchored,
          [],
          `no doc-over-budget finding is anchored at a ${type}'s OUTCOME.md; got ${JSON.stringify(anchored)}`,
        );

        // Non-vacuity: the same 400 lines in a BUDGETED artifact of the same item DOES
        // fire — so the silence above is the budget decision, not an inert fixture.
        if (budgeted) {
          await writeFile(
            path.join(itemDir, budgeted),
            Array.from({ length: 400 }, (_, i) => `line ${i + 1}`).join("\n") + "\n",
            "utf8",
          );
          const { config: reloaded } = await loadWorkspace(projectRoot);
          const again = await doctorWork(workDir, reloaded, null, { groups: [budgetGroup] });
          assert.ok(
            again.some((f) => f.code === "doc-over-budget" && normalize(f.path ?? "").endsWith(`/${budgeted}`)),
            `sanity: 400 lines of ${budgeted} DOES fire doc-over-budget — the OUTCOME.md silence is the decision, not an inert fixture`,
          );
        }
      } finally {
        await rm(projectRoot, { recursive: true, force: true });
      }
    },
  })),

  // ==================================================================
  // Scenario: the budgeted artifact kinds are unchanged by this story
  // ==================================================================
  {
    name: '80/00 outcome-home: the budgeted artifact filenames are exactly SPEC.md, ARCHITECTURE.md, STORY.md and any *.feature — OUTCOME.md maps to no budget kind',
    run: () => {
      assert.equal(budgetKeyFor("SPEC.md"), "spec");
      assert.equal(budgetKeyFor("ARCHITECTURE.md"), "architecture");
      assert.equal(budgetKeyFor("STORY.md"), "story");
      assert.equal(budgetKeyFor("tasks/00_anything.feature"), "feature");

      assert.equal(budgetKeyFor("OUTCOME.md"), undefined, "OUTCOME.md maps to no budget kind");
      // ...and no other artifact quietly gained one.
      for (const name of ["CHORE.md", "SPIKE.md", "SESSION.md", "STATE.md", "VERIFICATION.md", "RETROSPECTIVE.md", "DESIGN.md"]) {
        assert.equal(budgetKeyFor(name), undefined, `${name} maps to no budget kind`);
      }
    },
  },
];
