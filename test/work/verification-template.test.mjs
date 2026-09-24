// Traceability wiring for milestone 66 / story 03 —
// tasks/00_verification-gains-a-shipped-template.feature ("VERIFICATION.md gains the schema it has
// never had", @executable).
//
// THE ROOT ITEM OF THE FINDING. ACD shipped NO `VERIFICATION.md` template at all — measured at HEAD
// before this story, `src/bundle/templates/milestone/` held nine files (ARCHITECTURE, COMPLIANCE,
// DESIGN, OUTCOME, RESEARCH, SECURITY, SPEC, STATE, UAT) — while `work:doctor` checked only that the
// file existed and was non-empty. You cannot add a "this control was observed failing" field to an
// evidence model that has no fields.
//
// Every @executable scenario and every Scenario-Outline Examples row is wired here against the REAL
// shipped bytes and the REAL install engine (`planApplyActions` / `executeApplyActions`, the same
// path `aof work init` and `aof work update` run — no drift logic is authored in this file). The
// single @manual scenario (a reviewer reading the template for what it PROMISES) is agent-run at
// `aof:verify`; it is the honest residue of ADR-005 §4 and is deliberately not asserted here.
import assert from "node:assert/strict";
import { mkdtemp, rm, readFile, writeFile, mkdir } from "node:fs/promises";
import { readdirSync, readFileSync, existsSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { loadBundle, readDescriptor, renderBundleOutputs, TEMPLATE_STAMP } from "../../src/work/bundle.mjs";
import { generateBundleManifest, readShippedManifest } from "../../src/work/bundle-manifest.mjs";
import { createLockManifest, executeApplyActions, planApplyActions } from "../../src/render-plan.mjs";
import { synthesizeBundleConfig } from "../../src/work/bundle-synthesis.mjs";
import { updateWork } from "../../src/work/update.mjs";
import { writeLock } from "../../src/lock.mjs";
import { registerDeclarations, registerEntries } from "../../src/declared-id.mjs";
import { RED_PROBE_PLACEHOLDER, recordsARedProbe } from "../../src/work/doctor-controls.mjs";
import { severityFor } from "../../src/acceptance-horizon.mjs";
// The frozen literals have ONE home (FF-6608). Re-transcribing them here would be the second copy
// this milestone exists to refuse — and the wording moved once already, in fix round 1.
import { ADR_LITERALS } from "../arch/work/acd-verification-template-shape.test.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const TEMPLATE_DIR = path.join(repoRoot, "src", "bundle", "templates", "milestone");
const SOURCE = path.join(TEMPLATE_DIR, "VERIFICATION.md");
const INSTALLED_PATH = ".aof/templates/work/milestone/VERIFICATION.md";

const source = () => readFileSync(SOURCE, "utf8");
const lines = () => source().split("\n");

// The templates that shipped BEFORE this task, named rather than counted (m47/R9) so one
// arriving by accident is visible instead of absorbed into a number.
//
// OUTCOME.md LEFT THIS MEMBER at story 80 and is deliberately absent: the document was
// never milestone-shaped — what scoped it to milestones was the DIRECTORY it sat in,
// since `templateOutputPath` renders to `.aof/templates/work/<member-id>/`. It now ships
// once under the type-agnostic `shared` member, because a milestone, a story AND a chore
// each author one. Its own membership + move is pinned by
// test/run/outcome-template-shared-home.test.mjs.
//
// AOF.md JOINED at story 137: the imported milestone's digest record doc, milestone-shaped
// (validate reads it AOF.md-first for a milestone only). Named here at 130's door, where the
// whole tree first read it (130/VERIFICATION F-20); its own shape is pinned by
// test/bundle/digest-template-ships.test.mjs.
const MILESTONE_TEMPLATES_SHIPPED_BEFORE = [
  "AOF.md", "ARCHITECTURE.md", "COMPLIANCE.md", "DESIGN.md", "RESEARCH.md",
  "SECURITY.md", "SPEC.md", "STATE.md", "UAT.md",
];

function tempRepo(prefix = "aof-verification-template-") {
  return mkdtemp(path.join(os.tmpdir(), prefix));
}

// A base install built through the ENGINE init uses — synthesize → plan against an empty
// previousLock → execute → write the `work` section of the unified lock. Lifted from
// `test/work/work-update.test.mjs`'s `installBase`, deliberately: a second install engine in a test is
// exactly the second home this milestone exists to refuse.
async function installBase(repo, bundle, runtimes = ["claude"], version = "1.0.0") {
  const { desiredOutputs } = await synthesizeBundleConfig(bundle, { runtimes, targetDir: repo });
  const actions = await planApplyActions(desiredOutputs, null, { force: false, targetDir: repo });
  await executeApplyActions(actions);
  const base = createLockManifest({ actions, desiredOutputs, previousLock: null, config: { packages: [] }, runtimes });
  const work = {
    generatedAt: base.generatedAt,
    bundle: { version },
    runtimes,
    files: base.files.map((entry) => ({ ...entry, path: String(entry.path).replaceAll("\\", "/") })),
  };
  await writeLock(path.join(repo, ".aof", "aof.lock.json"), { work });
  return { actions, work };
}

// The bundle as it shipped BEFORE this task: the same descriptor and the same template member, with
// `VERIFICATION.md` dropped from the milestone template's file list. A structural edit to the loaded
// object, never a mutation of `src/bundle/` — `updateWork`'s `bundleOverride` seam only chooses
// WHICH bundle is loaded; every create/update/skip/drift decision still flows through the engine.
function bundleWithoutVerificationTemplate() {
  const bundle = loadBundle();
  return {
    ...bundle,
    templates: bundle.templates.map((member) =>
      member.id === "milestone" ? { ...member, files: member.files.filter((file) => file !== "VERIFICATION.md") } : member,
    ),
  };
}

// Plan-action paths are OS-native for resources (`.claude\agents\…` on Windows) and forward-slashed
// for templates (`templateOutputPath` joins with "/"), so both sides are normalised before matching
// — a `path.sep` conversion silently matches nothing on the template half.
function actionFor(actions, relative) {
  const wanted = relative.replaceAll("\\", "/");
  return actions.find((item) => String(item.path).replaceAll("\\", "/").endsWith(wanted)) ?? null;
}

function sha256(text) {
  return createHash("sha256").update(text).digest("hex");
}

// Every `VERIFICATION.md` under the repo's own work tree, keyed by path → content hash.
function verificationDocs(root = path.join(repoRoot, "wiki", "work")) {
  const out = new Map();
  const walk = (dir) => {
    for (const name of readdirSync(dir, { withFileTypes: true })) {
      const abs = path.join(dir, name.name);
      if (name.isDirectory()) walk(abs);
      else if (name.name === "VERIFICATION.md") out.set(abs, sha256(readFileSync(abs, "utf8")));
    }
  };
  walk(root);
  return out;
}

// The body of a `## ` section, up to the next `## ` (a `### ` sub-heading stays inside it).
function section(text, heading) {
  const all = text.split("\n");
  const start = all.findIndex((line) => line.trim() === heading);
  if (start === -1) return null;
  const body = [];
  for (let index = start + 1; index < all.length; index += 1) {
    if (/^##\s+/.test(all[index])) break;
    body.push(all[index]);
  }
  return body.join("\n");
}

export const verificationTemplateTests = [
  // ── Scenario Outline: the template takes its place in the bundle's own machinery ──
  {
    name: "verification-template: `src/bundle/templates/milestone/` holds exactly the templates shipped before, plus VERIFICATION.md (OUTCOME.md left for the type-agnostic `shared` member at story 80)",
    run: async () => {
      const files = readdirSync(TEMPLATE_DIR).sort();
      assert.deepEqual(files, [...MILESTONE_TEMPLATES_SHIPPED_BEFORE, "VERIFICATION.md"].sort());
      assert.equal(files.length, MILESTONE_TEMPLATES_SHIPPED_BEFORE.length + 1);
    },
  },
  {
    name: "verification-template: `src/bundle/bundle.json` is UNCHANGED — the `milestone` member declares a DIR, so every file inside it is a declared member already",
    run: async () => {
      const member = readDescriptor().members.find((entry) => entry.id === "milestone");
      assert.deepEqual(member, { id: "milestone", kind: "template", dir: "templates/milestone" });
      assert.ok(!("files" in member), "a template member enumerates no files — the directory IS the declaration");
      assert.ok(
        loadBundle().templates.find((entry) => entry.id === "milestone").files.includes("VERIFICATION.md"),
        "…and the loader picks the new file up from the directory with no descriptor edit",
      );
    },
  },
  {
    name: "verification-template: `src/bundle/manifest.json` gains exactly one entry, at `.aof/templates/work/milestone/VERIFICATION.md`, whose hash is a sha256 digest",
    run: async () => {
      const shipped = readShippedManifest();
      const mine = shipped.entries.filter((entry) => entry.path === INSTALLED_PATH);
      assert.equal(mine.length, 1, "exactly one entry, not one per runtime — a template is runtime-independent");
      assert.match(mine[0].hash, /^sha256:[0-9a-f]{64}$/);
      assert.deepEqual(mine[0].resource, { id: "milestone", kind: "template" });

      // …and it is exactly ONE more than the bundle without it — the derived artifact is
      // regenerated, never hand-edited, so this is a property of the generator's output.
      const before = generateBundleManifest(bundleWithoutVerificationTemplate(), { runtimes: shipped.runtimes });
      assert.equal(shipped.entries.length - before.entries.length, 1);
      const added = shipped.entries.map((entry) => entry.path).filter((entry) => !before.entries.some((prior) => prior.path === entry));
      assert.deepEqual(added, [INSTALLED_PATH]);
    },
  },
  {
    name: "verification-template: the template's first line is the `---` opening a `doc: verification` frontmatter",
    run: async () => {
      const [first, second, third] = lines();
      assert.equal(first, "---");
      assert.equal(second, "doc: verification");
      assert.equal(third, "---");
    },
  },
  {
    name: "verification-template: the template's own bytes carry no `aof-generated` marker — the render prepends it and the scaffold strips it",
    run: async () => {
      assert.ok(!source().includes("aof-generated"), "a shipped template body carries no marker of its own");
      const rendered = renderBundleOutputs(loadBundle(), { runtimes: ["claude"] }).find((output) => output.path === INSTALLED_PATH);
      assert.ok(rendered, "the template renders to its conventional install path");
      assert.equal(rendered.content.split("\n")[0], TEMPLATE_STAMP, "the RENDER is what declares the file bundle-generated");
      assert.equal(rendered.content, `${TEMPLATE_STAMP}\n\n${source()}`);
    },
  },

  // ── Scenario Outline: a frozen section heading is the exact wording, never a paraphrase ──
  ...[
    ["## Verification evidence", "## Evidence"],
    ["## Fitness functions", "## Fitness register"],
    ["## Findings", "## Findings and triage"],
    ["## Accept decision", "## Acceptance"],
  ].map(([heading, nearMiss]) => ({
    name: `verification-template: the template carries "${heading}" spelled exactly at h2, and "${nearMiss}" does not satisfy that section`,
    run: async () => {
      const all = lines().map((line) => line.trimEnd());
      assert.ok(all.includes(heading), `${heading} is present, at h2`);
      assert.ok(!all.includes(nearMiss), `${nearMiss} is a paraphrase, and a paraphrase is a different section`);
      assert.ok(section(source(), heading) != null, `${heading} opens a section with a body`);
    },
  })),

  // ── Scenario: the fitness register's header row is a frozen literal ──
  {
    name: "verification-template: the fitness register's header row is `| id | enforced by | result | red probe |`, in that order, and its probe column asks for what was changed and the message observed",
    run: async () => {
      const body = section(source(), "## Fitness functions");
      assert.ok(body.split("\n").map((line) => line.trim()).includes("| id | enforced by | result | red probe |"));
      const columns = "| id | enforced by | result | red probe |".split("|").map((cell) => cell.trim()).filter(Boolean);
      assert.deepEqual(columns, ["id", "enforced by", "result", "red probe"]);
      assert.ok(
        body.includes(ADR_LITERALS["red-probe-ask"]),
        "the probe column's guidance asks for what was changed to make the control fail and the message observed",
      );
      // The id cell holds the id ALONE — the positional form ADR-001 §2 freezes. (The row is in a
      // CITING block, so under ADR-008 ruling 4 it resolves to the sibling ARCHITECTURE.md
      // declaration and never makes a second one; the form is shared, the kind is not.)
      assert.ok(body.includes("id ALONE in the first cell"));
    },
  },

  // ── Scenario: the findings register's header row is the seven columns already prescribed in prose ──
  {
    name: "verification-template: the findings register's header row is the seven columns `src/bundle/commands/verify.md` already prescribes, in the same order, with the id alone in the first cell",
    run: async () => {
      const body = section(source(), "## Findings");
      const header = "| id | observed | type | severity | triage | routed-to | status |";
      assert.ok(body.split("\n").map((line) => line.trim()).includes(header));
      const columns = header.split("|").map((cell) => cell.trim()).filter(Boolean);
      assert.deepEqual(columns, ["id", "observed", "type", "severity", "triage", "routed-to", "status"]);
      const verify = readFileSync(path.join(repoRoot, "src", "bundle", "commands", "verify.md"), "utf8").replace(/\s+/g, " ");
      assert.ok(verify.includes(`(${columns.join(", ")})`), "the same seven, in the same order, as the shipped prompt's prose list");
      assert.ok(body.includes("id ALONE in the first cell"), "which is what makes the duplicate-id check buildable against it");
    },
  },

  // ── Scenario Outline: the template's own placeholder rows declare nothing ──
  {
    name: "verification-template: the fitness register's placeholder row (`<FF-NN>`) yields no declaration",
    run: async () => {
      const text = source();
      assert.ok(text.includes("| <FF-NN> |"), "sanity: the placeholder row ships as written");
      assert.deepEqual(registerEntries(text, "VERIFICATION.md"), [], "a freshly-rendered document declares — and cites — no control it was never given");
    },
  },
  {
    name: "verification-template: the findings register's placeholder row (`<F-NN>`) yields no declaration",
    run: async () => {
      const text = source();
      assert.ok(text.includes("| <F-NN> |"), "sanity: the placeholder row ships as written");
      assert.deepEqual(registerDeclarations(text, "VERIFICATION.md"), []);
      // POSITIVE CONTROL: the same row with a real id DOES declare, so "found nothing" above is a
      // fact about the placeholder and not about a recogniser that cannot read this document.
      const planted = text.replace("| <F-NN> |", "| **F-01** |");
      assert.notEqual(planted, text, "sanity: the substitution changed the text");
      assert.deepEqual(registerDeclarations(planted, "VERIFICATION.md").map((entry) => entry.id), ["F-01"]);
    },
  },
  {
    name: "verification-template: a sample register quoted inside a fenced block yields no declaration (ADR-001 §3, prospective)",
    run: async () => {
      const text = source();
      const fenced = `${text}\n## Findings\n\n\`\`\`\n| id | observed |\n|---|---|\n| **F-99** | a sample, quoted |\n\`\`\`\n`;
      assert.ok(fenced.includes("**F-99**"), "sanity: the sample is present in the text under test");
      assert.deepEqual(registerDeclarations(fenced, "VERIFICATION.md"), [], "a fenced sample declares nothing");
      // …and the SAME sample unfenced does declare — the fence is what makes it inert.
      const unfenced = fenced.split("```\n").join("");
      assert.deepEqual(registerDeclarations(unfenced, "VERIFICATION.md").map((entry) => entry.id), ["F-99"]);
    },
  },

  // ── Scenario: an untouched placeholder is a missing red probe, not a recorded one ──
  {
    name: "verification-template: an untouched probe cell reads as a MISSING red probe, and the placeholder is ONE literal shared by the template and the check",
    run: async () => {
      const text = source();
      assert.equal(text.split(RED_PROBE_PLACEHOLDER).length - 1, 1, "the template holds the placeholder exactly once, byte-for-byte as the check exports it");
      assert.equal(recordsARedProbe(RED_PROBE_PLACEHOLDER), false, "the shape check reads an untouched placeholder as a MISSING red probe");
      assert.equal(recordsARedProbe(`\`${RED_PROBE_PLACEHOLDER}\``), false, "…and the same token in backticks is the same token");
      assert.equal(recordsARedProbe("Deleted the guard's only assertion → `expected 3, got 0`"), true, "…while a recorded observation is one");
    },
  },

  // ── Scenario Outline: what install does to each file, given what is already on disk ──
  {
    name: "verification-template (install): `aof work init` on a repo with no ACD install creates the template alongside the other milestone templates",
    run: async () => {
      const repo = await tempRepo();
      try {
        const { actions } = await installBase(repo, loadBundle());
        const mine = actionFor(actions, INSTALLED_PATH);
        assert.ok(mine, "the install plan names the new template");
        assert.equal(mine.action, "create");
        const dir = path.join(repo, ".aof", "templates", "work", "milestone");
        assert.deepEqual(readdirSync(dir).sort(), [...MILESTONE_TEMPLATES_SHIPPED_BEFORE, "VERIFICATION.md"].sort(), "alongside the other milestone templates");
        assert.ok((await readFile(path.join(dir, "VERIFICATION.md"), "utf8")).startsWith(TEMPLATE_STAMP));
      } finally {
        await rm(repo, { recursive: true, force: true });
      }
    },
  },
  {
    name: "verification-template (install): `aof work update` on a repo installed BEFORE this task (so the file is absent) creates it",
    run: async () => {
      const repo = await tempRepo();
      try {
        await installBase(repo, bundleWithoutVerificationTemplate());
        assert.ok(!existsSync(path.join(repo, ...INSTALLED_PATH.split("/"))), "sanity: the prior install has no VERIFICATION.md template");
        const result = await updateWork({ targetDir: repo });
        assert.equal(actionFor(result.actions, INSTALLED_PATH)?.action, "create");
        assert.ok(existsSync(path.join(repo, ...INSTALLED_PATH.split("/"))));
      } finally {
        await rm(repo, { recursive: true, force: true });
      }
    },
  },
  {
    name: "verification-template (install): `aof work update` leaves a present, byte-identical copy unchanged",
    run: async () => {
      const repo = await tempRepo();
      try {
        await installBase(repo, loadBundle());
        const before = await readFile(path.join(repo, ...INSTALLED_PATH.split("/")), "utf8");
        const result = await updateWork({ targetDir: repo });
        assert.equal(actionFor(result.actions, INSTALLED_PATH)?.action, "skip");
        assert.equal(await readFile(path.join(repo, ...INSTALLED_PATH.split("/")), "utf8"), before);
      } finally {
        await rm(repo, { recursive: true, force: true });
      }
    },
  },
  {
    name: "verification-template (install): a locally-edited copy is preserved and reported as drift, never clobbered without `--force`",
    run: async () => {
      const repo = await tempRepo();
      try {
        await installBase(repo, loadBundle());
        const installed = path.join(repo, ...INSTALLED_PATH.split("/"));
        const edited = `${await readFile(installed, "utf8")}\n<!-- a local house rule -->\n`;
        await writeFile(installed, edited, "utf8");

        const result = await updateWork({ targetDir: repo });
        assert.equal(actionFor(result.actions, INSTALLED_PATH)?.action, "drift-warning");
        assert.equal(await readFile(installed, "utf8"), edited, "the local edit is preserved");

        const forced = await updateWork({ targetDir: repo, force: true });
        assert.equal(actionFor(forced.actions, INSTALLED_PATH)?.action, "update");
        assert.notEqual(await readFile(installed, "utf8"), edited, "…and only `--force` overwrites it");
      } finally {
        await rm(repo, { recursive: true, force: true });
      }
    },
  },
  {
    name: "verification-template (install): a milestone's OWN `VERIFICATION.md` under `work.dir` is never written — a record document is not a managed install path",
    run: async () => {
      const repo = await tempRepo();
      try {
        const record = path.join(repo, "wiki", "work", "01_milestone_sample", "VERIFICATION.md");
        await mkdir(path.dirname(record), { recursive: true });
        await writeFile(record, "---\ndoc: verification\n---\n# 01 — Verification\n\nhand-written\n", "utf8");
        const before = await readFile(record, "utf8");

        await installBase(repo, loadBundle());
        const result = await updateWork({ targetDir: repo });

        assert.equal(await readFile(record, "utf8"), before, "the record document is byte-identical after both install verbs");
        const underWork = result.actions.filter((item) => String(item.path).replaceAll("\\", "/").includes("/wiki/work/"));
        assert.deepEqual(underWork, [], "no install action names a path under the work tree");
        // The structural reason, asserted rather than narrated: every desired output lands under a
        // tool-owned directory, none under a project's work tree.
        const roots = new Set(
          renderBundleOutputs(loadBundle(), { runtimes: ["claude", "codex"] }).map((output) => String(output.path).replaceAll("\\", "/").split("/")[0]),
        );
        assert.deepEqual([...roots].sort(), [".aof", ".claude", ".codex"]);
      } finally {
        await rm(repo, { recursive: true, force: true });
      }
    },
  },

  // ── Scenario: the documents already in this repo are untouched by the template's arrival ──
  {
    name: "verification-template: every `VERIFICATION.md` already under `work.dir` is byte-identical after the template ships, and an accepted item's document cannot become a gating finding",
    run: async () => {
      const before = verificationDocs();
      assert.ok(before.size >= 50, `sanity: the repo carries the measured population; found ${before.size}`);

      // Rendering the bundle and regenerating the derived manifest are pure with respect to the
      // work tree — the property behind "the template ships, and nothing under work.dir moves".
      renderBundleOutputs(loadBundle(), { runtimes: ["claude", "codex"] });
      generateBundleManifest();

      const after = verificationDocs();
      assert.deepEqual([...after.entries()].sort(), [...before.entries()].sort(), "every one of them is byte-identical to what it was before");

      // …and a document under an ACCEPTED item is ruled immutable by the horizon, so it can never
      // become a gating finding however this template evolves (ADR-002 §1, the shipped predicate).
      assert.equal(severityFor("done"), "warn", "outside the horizon a fact is advisory, never an error");
      assert.equal(severityFor("in-progress"), "error", "…and inside it, it gates");
    },
  },

  // ── Scenario Outline: the template states plainly what the red-probe field cannot catch ──
  //
  // The three the contract enumerates, each now a WHOLE SENTENCE carrying its own "does NOT" (the
  // fragment that shipped first was satisfied by a text asserting the opposite — FF-6608 measures
  // that). The fourth is a hole this milestone's doctrine says to NAME rather than let be found.
  ...[
    ["a fabricated probe, which no declarative model catches", "scope-limit-fabricated"],
    ["any assertion that is not a declared control, so the obligation reaches `FF-NN` ids alone", "scope-limit-not-a-control"],
    ["whether the probe was performed on the bytes that actually shipped", "scope-limit-shipped-bytes"],
    ["a reflow of its own placeholder, which reads as a RECORDED probe (the fourth hole, named)", "scope-limit-reflowed-placeholder"],
  ].map(([limit, ask]) => ({
    name: `verification-template: the scope note names "${limit}" as outside what the red-probe field catches`,
    run: async () => {
      const body = section(source(), "## Fitness functions");
      assert.ok(body.includes(ADR_LITERALS[ask]), `the scope note names it, as a whole sentence: ${limit}`);
      assert.ok(
        body.includes("does NOT prove the assertion was ever really run"),
        "…and says plainly that a recorded probe proves no more than it does",
      );
      assert.ok(body.includes("a smaller\n     surface, not a closed one"), "a smaller surface, not a closed one");
      // The SAME sentence ships in `commands/verify.md`: one home for the honesty boundary, so the
      // prompt's copy cannot drift into an over-claim with nothing red.
      assert.ok(
        readFileSync(path.join(repoRoot, "src", "bundle", "commands", "verify.md"), "utf8").includes(ADR_LITERALS[ask]),
        "verify.md carries the identical sentence, not a second spelling",
      );
    },
  })),
];
