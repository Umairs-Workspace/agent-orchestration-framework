// FF-7106 — milestone 71 / ADR-008 (as amended by ADR-009 §3).
//
// "A story's declared write set includes EVERY generated sibling its own change lands."
//
// Over every `STORY.md` under `wiki/work` whose item is OPEN (66/ADR-002's horizon — a `done` item
// is immutable and therefore un-actionable): if `files:` names any path that is a MEMBER OF THE
// RENDERED BUNDLE, then it must also name `src/bundle/manifest.json` AND every GIT-TRACKED rendered
// output of that member.
//
// WHY MEMBERSHIP IS DERIVED, NEVER PREFIXED. Membership comes from `loadBundle()`'s own descriptor
// and the render set from `renderBundleOutputs()` — never from a `src/bundle/` string prefix. A
// prefix knows a file sits in the bundle tree and knows NOTHING about what it renders to:
// `src/bundle/frozen-set.jsonc` renders to `.aof/frozen-set.jsonc`, and `src/bundle/manifest.json`
// and `src/bundle/bundle.json` are machinery that render to nothing at all. Both facts are asserted
// below, so a future prefix shortcut fails here rather than passing quietly.
//
// WHY THE RUNTIME SET IS DERIVED TOO (ADR-009 §3). The tracked render set is
// `renderBundleOutputs() ∩ git ls-files`, and the runtimes handed to the render are the UNION of
// what the members themselves declare — never a hand-listed `["claude","codex","opencode"]`. A
// fourth runtime is therefore covered with no edit to this file. (`renderBundleOutputs` defaults to
// `["claude"]` alone when handed nothing, so passing the derived set is load-bearing, not tidiness.)
//
// THE MEASURED DEFECT THIS CLOSES. Commit `231ee134` moved `src/bundle/commands/continue.md`,
// `src/bundle/manifest.json` and the three tracked runtime renders as ONE change. A control
// stopping at the manifest would pass a story that left three tracked files stale — TECH_DEBT
// item 54's drift one layer earlier. Milestone 71 verified those renders BY HAND at three separate
// accepts because this control did not exist (71's VERIFICATION.md, F-71-A).
//
// THE CLAIM BINDS WHAT A STORY LANDS, NOT WHAT IT NAMES. Editing an already-rendered or
// already-registered file is not a new sibling, so a story is never forced to declare the test
// runner it does not change. THE REGISTRATION LEG IS DELIBERATELY ABSENT —
// `test/arch/testing/acd-test-suite-registration.test.mjs` already walks the whole test tree recursively and
// in service, and restating it here would be the duplication 71's register refuses. That absence is
// asserted below rather than narrated, so nobody "completes" this control by adding it back.
//
// THE HORIZON IS READ THROUGH THE ONE PREDICATE. `isOpen` is imported from
// `src/acceptance-horizon.mjs` rather than re-derived from the literal `"done"` — FF-6602 exists
// because two copies of "is this item still open" is how `ITEM_RE` came to live in four places.
//
// THE STATUS READ IS PINNED BECAUSE MIS-READING IT SILENTLY WIDENS THE HORIZON. Every `STORY.md` in
// this repository is checked out CRLF, and a status read that keeps the `\r` — or the leading space
// — hands `isOpen` a word it does not recognise, which fails OPEN and puts every accepted story back
// in scope. Measured while writing this control: a first draft's read did exactly that and reported
// **33 violations across four `done` stories** (59/04, 61/01, 83, 84) that the horizon exists to
// exclude. The regex below is not the interesting part — `.` and `$` in multiline mode already
// exclude `\r`, so the CRLF form reads correctly with no stripping. What matters is that the
// CONTRACT is pinned rather than the implementation: a rewrite to the obvious
// `line.slice("status: ".length)` shape would capture `"done\r"` and re-open four accepted stories,
// and the horizon leg below is what stands between this control and that.
//
// NON-VACUITY IS BY PLANT, BY NECESSITY. Measured at this landing: 9 open stories, of which **0**
// declare a bundle member — so the live leg has no subject today and would be vacuously green
// forever if that were the only leg. The decision is therefore extracted as a pure function over
// story records, the live leg feeds it the real tree, and the plant legs feed it synthetic records
// whose expected report is asserted verbatim. The live leg additionally asserts the SCAN reached
// something (stories walked, members mapped, renders mapped), which is a different claim from "a
// subject exists".
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { loadBundle, renderBundleOutputs } from "../../../src/work/bundle.mjs";
import { storyContractList } from "../../../src/story-contract.mjs";
import { isOpen } from "../../../src/acceptance-horizon.mjs";

const root = fileURLToPath(new URL("../../../", import.meta.url));
const workDir = path.join(root, "wiki", "work");

// The one sibling every bundle-member change lands, and the one this control names by hand —
// it is bundle MACHINERY (`readDescriptor` declares it a non-member), so it can never be derived
// from the member set the way the renders are.
const MANIFEST = "src/bundle/manifest.json";

const slash = (value) => String(value).split("\\").join("/");

// ── the tree, derived ────────────────────────────────────────────────────────────────────────────

// Every path a member's change lands on disk under `src/bundle/`, mapped to that member's key.
// Templates declare a `dir` rather than a `file`, so their member files are the directory's own
// contents — read the same way `acd-bundle-membership` reads them, so the two controls agree.
function memberSources(bundle) {
  const sources = new Map();
  const bundleDir = path.join(root, "src", "bundle");
  for (const member of bundle.descriptor.members) {
    const key = `${member.kind}:${member.id}`;
    if (typeof member.file === "string") {
      sources.set(`src/bundle/${slash(member.file)}`, key);
    } else if (typeof member.dir === "string") {
      const dirAbs = path.join(bundleDir, member.dir);
      for (const name of readdirSync(dirAbs)) {
        sources.set(`src/bundle/${slash(member.dir)}/${name}`, key);
      }
    }
  }
  return sources;
}

// The runtimes the BUNDLE declares, unioned off its own members. Never hand-listed: a fourth
// runtime joins the render here with no edit to this file (ADR-009 §3).
function declaredRuntimes(bundle) {
  const runtimes = new Set();
  for (const member of bundle.descriptor.members) {
    for (const runtime of member.runtimes ?? []) runtimes.add(runtime);
  }
  return [...runtimes].sort();
}

function trackedFiles() {
  return new Set(
    execFileSync("git", ["ls-files"], { cwd: root, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 })
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean),
  );
}

// What ONE member renders, asked of the render engine rather than pattern-matched off an output's
// resource id. That distinction is load-bearing and was measured: the codex render of
// `src/bundle/commands/continue.md` presents as `skill:aof-continue`, NOT `command:continue`, so a
// control keyed on the output's own resource id silently loses `.codex/skills/aof-continue/SKILL.md`
// — one of the three tracked files commit `231ee134` moved — and would pass the very story this
// control exists to catch. Rendering the member alone asks "what does THIS member produce?" and
// needs no knowledge of any runtime's id-mapping convention, so a fourth runtime with a fourth
// convention is covered with no edit here.
function memberOutputs(bundle, member, runtimes) {
  const alone = {
    ...bundle,
    resources: (bundle.resources ?? []).filter((r) => r.kind === member.kind && r.id === member.id),
    templates: (bundle.templates ?? []).filter((t) => t.kind === member.kind && t.id === member.id),
    assets: (bundle.assets ?? []).filter((a) => a.kind === member.kind && a.id === member.id),
    hooks: (bundle.hooks ?? []).filter(() => member.kind === "hook").filter((h) => h.id === member.id),
  };
  return renderBundleOutputs(alone, { runtimes }).map((output) => slash(output.path));
}

// memberKey -> the set of its rendered outputs that git actually tracks. An untracked render is not
// a sibling a story can be asked to declare, so the intersection is part of the claim, not a filter
// bolted onto it.
function trackedRenders(bundle, runtimes, tracked) {
  const renders = new Map();
  for (const member of bundle.descriptor.members) {
    const key = `${member.kind}:${member.id}`;
    const kept = memberOutputs(bundle, member, runtimes).filter((rel) => tracked.has(rel));
    if (kept.length > 0) renders.set(key, new Set(kept));
  }
  return renders;
}

// ── the decision, pure ───────────────────────────────────────────────────────────────────────────

// The horizon's input. `.` and `$` under `m` both stop at `\r`, so the CRLF checkout reads clean
// with no normalisation — the leg below pins that as a CONTRACT, not this expression as a shape.
function statusOf(text) {
  const match = /^status:[ \t]*(.+?)[ \t]*$/m.exec(String(text));
  return match == null ? null : match[1];
}

function declaredPaths(text) {
  const declared = storyContractList(text, "files");
  if (!declared.present || declared.malformed) return null;
  return new Set(declared.values.map((value) => slash(String(value).trim())));
}

// The whole rule, over story records rather than over the disk, so the plants below exercise the
// same code path the live tree does.
function siblingViolations(stories, sources, renders) {
  const found = [];
  for (const story of stories) {
    if (!isOpen(statusOf(story.text))) continue;
    const names = declaredPaths(story.text);
    if (names == null || names.size === 0) continue;
    const members = [...names].filter((name) => sources.has(name)).sort();
    if (members.length === 0) continue;
    if (!names.has(MANIFEST)) {
      found.push(`${story.rel}: declares bundle member(s) ${members.join(", ")} and must also declare ${MANIFEST}`);
    }
    for (const member of members) {
      for (const render of [...(renders.get(sources.get(member)) ?? [])].sort()) {
        if (names.has(render)) continue;
        found.push(`${story.rel}: declares bundle member ${member} and must also declare its tracked render ${render}`);
      }
    }
  }
  return found.sort();
}

function realStories() {
  const stories = [];
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name === "STORY.md") {
        stories.push({ rel: slash(path.relative(root, full)), text: readFileSync(full, "utf8") });
      }
    }
  };
  if (statSync(workDir).isDirectory()) walk(workDir);
  return stories;
}

// A synthetic OPEN story declaring exactly `files`. The frontmatter is the shipped shape so the
// plants exercise `storyContractList`'s real parse, not a stub of it.
function plant(files, { status = "in-progress", eol = "\n", rel = "wiki/work/00_milestone_plant/stories/00_story_plant/STORY.md" } = {}) {
  const text = [
    "---",
    "type: story",
    "number: 00",
    "slug: plant",
    "parent: 00",
    `status: ${status}`,
    "schema: 1",
    `files: [${files.join(", ")}]`,
    "---",
    "# plant",
  ].join(eol);
  return { rel, text };
}

async function world() {
  const bundle = await loadBundle();
  const tracked = trackedFiles();
  const runtimes = declaredRuntimes(bundle);
  return { bundle, tracked, runtimes, sources: memberSources(bundle), renders: trackedRenders(bundle, runtimes, tracked) };
}

export const archTests = [
  {
    name: "arch/71 FF-7106: every OPEN story declaring a bundle member also declares the manifest and every git-tracked render of that member",
    run: async () => {
      const { sources, renders, tracked, runtimes } = await world();
      const stories = realStories();

      // NON-VACUITY OF THE SCAN — a different claim from "a subject exists". Measured at landing:
      // 276 STORY.md, 84 member source paths, 143 tracked renders, 3 declared runtimes.
      assert.ok(stories.length > 100, `the scan walked wiki/work (${stories.length} STORY.md found)`);
      assert.ok(sources.size > 50, `the member source map was built (${sources.size} paths)`);
      assert.ok([...renders.values()].reduce((n, set) => n + set.size, 0) > 50, "tracked renders were mapped");
      assert.ok(runtimes.length >= 3, `the runtime set was derived off the members (${runtimes.join(", ")})`);
      assert.ok(tracked.size > 100, "git ls-files answered");

      assert.deepEqual(
        siblingViolations(stories, sources, renders),
        [],
        "a story that lands a bundle member lands its manifest and its tracked renders with it",
      );
    },
  },
  {
    name: "arch/71 FF-7106: non-vacuity — an open story declaring a bundle member WITHOUT the manifest is reported, naming the story and the missing sibling",
    run: async () => {
      const { sources, renders } = await world();
      const member = "src/bundle/commands/continue.md";
      assert.ok(sources.has(member), "the plant's subject really is a bundle member");

      const declared = [member, ...[...(renders.get(sources.get(member)) ?? [])]];
      const reported = siblingViolations([plant(declared)], sources, renders);

      assert.deepEqual(
        reported,
        [`wiki/work/00_milestone_plant/stories/00_story_plant/STORY.md: declares bundle member(s) ${member} and must also declare ${MANIFEST}`],
        "the manifest leg fires, names the story, and names exactly the sibling that is missing",
      );

      // …and adding the one missing sibling clears it. Without this the leg would pass a control
      // that reports every story unconditionally.
      assert.deepEqual(siblingViolations([plant([...declared, MANIFEST])], sources, renders), []);
    },
  },
  {
    name: "arch/71 FF-7106: non-vacuity — an open story declaring a bundle member without its TRACKED RENDERED copies is reported, one finding per missing render",
    run: async () => {
      const { sources, renders } = await world();
      const member = "src/bundle/commands/continue.md";
      const key = sources.get(member);
      const expectedRenders = [...(renders.get(key) ?? [])].sort();

      // The measured defect: `231ee134` moved five files as one, and three of them are these.
      assert.ok(expectedRenders.length >= 3, `continue.md has tracked renders (${expectedRenders.join(", ")})`);

      const reported = siblingViolations([plant([member, MANIFEST])], sources, renders);
      assert.deepEqual(
        reported,
        expectedRenders.map(
          (render) =>
            `wiki/work/00_milestone_plant/stories/00_story_plant/STORY.md: declares bundle member ${member} and must also declare its tracked render ${render}`,
        ),
        "a story stopping at the manifest is reported once per stale render — the exact case a manifest-only control would pass",
      );

      // Declaring all of them clears it, and the set is the DERIVED one — not a hand-listed trio.
      assert.deepEqual(siblingViolations([plant([member, MANIFEST, ...expectedRenders])], sources, renders), []);
    },
  },
  {
    name: "arch/71 FF-7106: the horizon really excludes a done item — including the CRLF checkout, the read whose first draft reported 33 false violations",
    run: async () => {
      const { sources, renders } = await world();
      const member = "src/bundle/commands/continue.md";
      const violating = [member]; // no manifest, no renders — a violation if it were open

      assert.ok(siblingViolations([plant(violating)], sources, renders).length > 0, "the plant IS a violation while open");

      for (const status of ["done"]) {
        assert.deepEqual(
          siblingViolations([plant(violating, { status })], sources, renders),
          [],
          "a done item is immutable and therefore un-actionable (66/ADR-002)",
        );
        assert.deepEqual(
          siblingViolations([plant(violating, { status, eol: "\r\n" })], sources, renders),
          [],
          "and the CRLF checkout of the same record reads done too — every STORY.md here is CRLF, so a read that captured `done\\r` would re-open every accepted story at once",
        );
        // The contract, stated directly rather than through the scan: whatever shape the read
        // takes, it answers the bare word for both checkouts.
        assert.equal(statusOf(plant(violating, { status, eol: "\r\n" }).text), status);
      }

      // The other direction: a CRLF-checked-out OPEN story is still judged.
      assert.ok(
        siblingViolations([plant(violating, { eol: "\r\n" })], sources, renders).length > 0,
        "CR-stripping narrows nothing — an open CRLF record is still a subject",
      );
    },
  },
  {
    name: "arch/71 FF-7106: membership is DERIVED from the bundle, never a `src/bundle/` prefix — and the render set is tracked-only",
    run: async () => {
      const { bundle, sources, renders, tracked, runtimes } = await world();

      // (a) The case the register names: a member whose render leaves the bundle tree entirely. A
      // prefix test would know the source and could never know this.
      const frozen = "src/bundle/frozen-set.jsonc";
      assert.ok(sources.has(frozen), "frozen-set.jsonc is a MEMBER, derived from the descriptor");
      const frozenRenders = [...(renders.get(sources.get(frozen)) ?? [])];
      assert.ok(
        frozenRenders.includes(".aof/frozen-set.jsonc"),
        `and it renders OUTSIDE src/bundle/, to .aof/frozen-set.jsonc (${frozenRenders.join(", ")})`,
      );

      // (b) The other half of the same point: bundle MACHINERY sits under the prefix and is not a
      // member, so declaring the manifest never demands siblings of its own.
      for (const machinery of [MANIFEST, "src/bundle/bundle.json"]) {
        assert.equal(sources.has(machinery), false, `${machinery} is machinery, not a declared member`);
      }
      assert.deepEqual(siblingViolations([plant([MANIFEST])], sources, renders), [], "declaring the manifest alone is not a subject");

      // (c) The runtime set is the members' own union — assert it is not this file's opinion.
      assert.deepEqual(runtimes, [...new Set(bundle.descriptor.members.flatMap((m) => m.runtimes ?? []))].sort());

      // (d) Every render this control can demand is git-tracked, so it never asks for a file the
      // repository does not keep.
      for (const set of renders.values()) {
        for (const render of set) assert.ok(tracked.has(render), `${render} is tracked`);
      }

      // (e) The per-member derivation is EXACT, not approximate: the union of what the members
      // render alone equals what the whole bundle renders. A member whose outputs this control
      // could not attribute would be a silent hole exactly where the codex mapping was.
      const whole = renderBundleOutputs(bundle, { runtimes }).map((o) => slash(o.path));
      const perMember = new Set(bundle.descriptor.members.flatMap((m) => memberOutputs(bundle, m, runtimes)));
      assert.deepEqual(whole.filter((rel) => !perMember.has(rel)), [], "every rendered output is attributable to a member");

      // (f) The intersection is APPLIED, and it is asserted on a fabricated tracked set rather than
      // on the live one — measured today, all 143 rendered outputs are tracked, so the live tree
      // cannot show the filter working and an assertion that it does would be false.
      const narrowed = trackedRenders(bundle, runtimes, new Set([".aof/frozen-set.jsonc"]));
      assert.deepEqual([...(narrowed.get("asset:frozen-set-declaration") ?? [])], [".aof/frozen-set.jsonc"]);
      assert.equal(narrowed.has("command:continue"), false, "a render git does not track is never demanded of a story");
    },
  },
  {
    name: "arch/71 FF-7106: the registration leg is DELIBERATELY ABSENT — a complete write set is not asked for the test runner it does not change",
    run: async () => {
      const { sources, renders } = await world();
      const member = "src/bundle/commands/continue.md";
      const complete = [member, MANIFEST, ...[...(renders.get(sources.get(member)) ?? [])]];

      assert.deepEqual(
        siblingViolations([plant(complete)], sources, renders),
        [],
        "a story naming the member, the manifest and every tracked render is complete — scripts/test.mjs is acd-test-suite-registration's claim, and restating it here is the duplication 71's register refuses",
      );

      // The absence is structural: this file names no runner at all.
      const self = readFileSync(fileURLToPath(import.meta.url), "utf8");
      assert.equal(
        /assert[^\n]*scripts\/test\.mjs/.test(self),
        false,
        "and nothing here asserts against the runner — the deliberate absence is asserted, not narrated",
      );
    },
  },
];
