// Fitness function: FF-6302 — THE DECLARATION IS DATA WITH ONE COMPILER AND ONE HOME, AND NO
// GRAMMAR IS WRITTEN TWICE (63/ADR-002, ADR-010 §4, §4a, §8).
//
// Seven legs, each of which fails for a different reason and each of which a cheap conforming
// edit would otherwise satisfy while holding nothing:
//
//   1 · ONE PARSER IN THE FAMILY. Exactly one module under `src/work-trigger/` turns declaration
//       text into an object. A second reader is how two copies of one file come to disagree.
//   2 · A BAD MEMBER REFUSES THE WHOLE SET, asserted by PLANTING one bad member among good ones
//       and requiring the compile to refuse with a code and hand back nothing — 55/ADR-004 §4's
//       rule, and the difference between a frozen set and a folder of scripts.
//   3 · NO SECOND CADENCE GRAMMAR, asserted BOTH ways: `parseCadence` is reached by import, AND
//       no `periodic:`/`event:` literal, duration-unit table or cadence regex is authored in the
//       family. A re-home reaching only one half is caught, which one leg alone cannot do.
//   4 · THE LOADER'S NAMESPACE IS A CENSUS, NOT A COUNT. The exported names are compared as a
//       sorted list, and the frozen-SET subset is separately asserted to be ELEVEN — so 52's
//       delivered "no twelfth set is exported" is PROVEN while the additive FUNCTION is admitted.
//       This is the shape `loopPointersIn` established one milestone ago, followed line-for-line.
//   5 · NO TRIGGER SOURCE VOCABULARY IN THAT LOADER AT ALL. `EVENT_TRIGGERS` are scope ordinals
//       in a containment relation; a source is where a signal came from; merging the two axes
//       would give the loop registry a vocabulary about the outside world.
//   6 · THE SHIPPED DECLARATION IS REGISTERED AND INSTALLED. It is a bundle member with a target
//       under `.aof/`, and the installed copy is byte-identical to it — so a declaration that
//       ships without installing, or installs without shipping, fails here.
//   7 · THE EOL RATCHET (ADR-010 §4a) — asserted over the ATTRIBUTE as well as the bytes, and
//       driven from the bundle's OWN asset list rather than from a list of paths kept here, so
//       the N+1th declaration cannot arrive unpinned. This is the THIRD instance of one measured
//       species (TECH_DEBT item 8; the `.aof/loops/*.md` pin; and `.aof/frozen-set.jsonc`, which
//       reported `w/crlf attr/` at HEAD before this story), and THE BYTES ALONE WOULD NOT CATCH
//       IT: git holds one blob for both copies, so the working-tree mismatch is invisible in a
//       diff and shows up only as a hash the manifest disagrees with, on Windows, never in CI.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import * as loaderModule from "../../../src/work/loops.mjs";
import {
  TRIGGER_SOURCES,
  TriggerDeclarationError,
  bundledTriggerDeclaration,
  compileTriggerDeclaration,
} from "../../../src/work-trigger/declaration.mjs";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const FAMILY_DIR = path.join(REPO_ROOT, "src", "work-trigger");
const LOADER_PATH = path.join(REPO_ROOT, "src", "work", "loops.mjs");
const BUNDLE_DESCRIPTOR = path.join(REPO_ROOT, "src", "bundle", "bundle.json");

const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const read = (file) => readFileSync(file, "utf8");

function familyFiles() {
  if (!existsSync(FAMILY_DIR)) return [];
  const out = [];
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.isFile() && entry.name.endsWith(".mjs")) out.push(full);
    }
  };
  walk(FAMILY_DIR);
  return out;
}

// A cadence literal in a COMMENT cannot parse a cadence; one in CODE can, and that is the whole
// distinction this leg is about. The stripper is conservative (line comments and block comments,
// no string-aware parsing) and is asserted NON-VACUOUS below over a planted fixture — a sweep
// that silently stripped everything would report clean while holding nothing.
function codeOnly(source) {
  return source
    .split(/\r?\n/)
    .map((line) => line.replace(/(^|[^:])\/\/.*$/, "$1"))
    .join("\n")
    .replace(/\/\*[\s\S]*?\*\//g, " ");
}

const CADENCE_GRAMMAR_PROBES = [
  [/periodic:/, "a `periodic:` literal"],
  [/event:/, "an `event:` literal"],
  [/\bUNIT_MS\b/, "a duration-unit table"],
  [/["'`](?:ms|[smhd])["'`]\s*:/, "a duration-unit map entry"],
  [/per-(?:item|phase|milestone|run-start)/, "an event-trigger literal"],
];

const bundleAssets = () => JSON.parse(read(BUNDLE_DESCRIPTOR)).members.filter((member) => member.kind === "asset");
const aofAssets = () => bundleAssets().filter((member) => String(member.target ?? "").startsWith(".aof/"));

function git(args) {
  const result = spawnSync("git", args, { cwd: REPO_ROOT, encoding: "utf8" });
  assert.equal(result.error, undefined, `git ${args.join(" ")} ran`);
  return result;
}

export const archTests = [
  {
    name: "FF-6302/1 exactly one module under src/work-trigger/ parses the declaration",
    run: () => {
      const files = familyFiles();
      assert.ok(files.length > 0, "the family exists");
      const parsers = files.filter((file) => /JSON\s*\.\s*parse/.test(codeOnly(read(file))));
      assert.deepEqual(
        parsers.map((file) => path.relative(REPO_ROOT, file).split(path.sep).join("/")),
        ["src/work-trigger/declaration.mjs"],
        "exactly one module in the family turns declaration text into an object",
      );
      // Non-vacuity: the sweep sees a parser where one exists.
      assert.ok(/JSON\s*\.\s*parse/.test(codeOnly("const x = JSON.parse(text);")), "the sweep can see a second parser");
    },
  },

  {
    name: "FF-6302/2 a planted bad member among good ones refuses the whole compile, and no partial set is returned",
    run: () => {
      const good = (id) => ({ id, protects: `what ${id} is for`, source: TRIGGER_SOURCES[0], scope: "63", level: "L1" });
      const planted = [good("a"), good("b"), { ...good("c"), level: "L4" }, good("d")];

      let handedBack = "NOTHING-WAS-RETURNED";
      let error = null;
      try {
        handedBack = compileTriggerDeclaration({ version: 1, members: planted });
      } catch (caught) {
        error = caught;
      }
      assert.ok(error instanceof TriggerDeclarationError, "the compile is refused");
      assert.equal(typeof error.code, "string", "…with a code");
      assert.equal(error.memberId, "c", "…naming the member that did not compile");
      assert.equal(handedBack, "NOTHING-WAS-RETURNED", "no partially-compiled set is ever returned");

      // Non-vacuity: the same four members without the plant DO compile, so the refusal above is
      // the plant's and not the fixture's.
      const clean = compileTriggerDeclaration({ version: 1, members: planted.map((entry) => ({ ...entry, level: "L1" })) });
      assert.deepEqual(clean.triggers.map((trigger) => trigger.id), ["a", "b", "c", "d"]);
    },
  },

  {
    name: "FF-6302/3 the cadence grammar is reached by IMPORT and no equivalent literal is authored in the family",
    run: () => {
      const files = familyFiles();
      const importers = files.filter((file) => /from\s+["'][^"']*work\/loops\.mjs["']/.test(read(file)) && /\bparseCadence\b/.test(read(file)));
      assert.ok(importers.length > 0, "the family reaches the grammar through the imported `parseCadence`");
      assert.equal(typeof loaderModule.parseCadence, "function", "…and it is a real export of the loader");

      for (const file of files) {
        const code = codeOnly(read(file));
        for (const [probe, what] of CADENCE_GRAMMAR_PROBES) {
          assert.equal(
            probe.test(code),
            false,
            `${path.relative(REPO_ROOT, file)} authors ${what} — the grammar is imported, never copied`,
          );
        }
      }

      // NON-VACUITY, both directions: the sweep sees a real second grammar in CODE, and does not
      // fire on the same token inside a COMMENT (which is why the comment stripper exists at all).
      const plantedCode = codeOnly('const re = /^periodic:(\\d+)(ms|s|m|h|d)$/;');
      assert.ok(CADENCE_GRAMMAR_PROBES.some(([probe]) => probe.test(plantedCode)), "a planted second grammar is caught");
      const plantedComment = codeOnly('// a member declaring `periodic:1h` or `event:per-item`\nconst x = 1;');
      assert.equal(CADENCE_GRAMMAR_PROBES.some(([probe]) => probe.test(plantedComment)), false, "prose about the grammar is not the grammar");
      assert.ok(plantedComment.includes("const x = 1;"), "…and the stripper does not simply delete everything");
    },
  },

  {
    name: "FF-6302/4 the loader's namespace is a CENSUS, and its frozen SETS are still eleven",
    run: () => {
      assert.deepEqual(Object.keys(loaderModule).sort(), [
        "ADMITTED_KEYS", "CADENCE_KINDS", "EDGE_KEYS", "ENDPOINT_SCHEMES", "EVENT_TRIGGERS",
        "FIELD_KINDS", "GROUND_VALUES", "LOADER_FINDING_CODES", "NODE_KINDS", "PERIODIC_UNITS",
        "POINTER_SCHEMES", "SENTINEL_TOKENS", "loadLoops", "loopPointersIn", "parseCadence",
      ], "fifteen exports: eleven vocabularies, one finding-code array, three functions");

      // The delivered claim, PROVEN rather than assumed: every non-function export but the
      // finding-code array is a set, and there are eleven of them. A twelfth SET fails here; the
      // additive FUNCTION does not, which is exactly 62/04's `loopPointersIn` shape.
      const sets = Object.entries(loaderModule)
        .filter(([, value]) => typeof value !== "function" && !Array.isArray(value));
      assert.equal(sets.length, 11, "eleven frozen vocabulary sets — no twelfth");
      assert.equal(
        Object.values(loaderModule).filter((value) => typeof value === "function").length,
        3,
        "…and the widening is a function: loadLoops, loopPointersIn, parseCadence",
      );
    },
  },

  {
    name: "FF-6302/5 no trigger source vocabulary appears in the loop loader at all",
    run: () => {
      const loader = read(LOADER_PATH);
      for (const source of TRIGGER_SOURCES) {
        assert.equal(loader.includes(source), false, `the loader does not name the trigger source "${source}"`);
      }
      assert.equal(Object.keys(loaderModule).some((name) => /SOURCE/i.test(name)), false, "…and exports no source vocabulary");
      // The two axes stay separated: an ordinal is not a source, and a source is not an ordinal.
      for (const ordinal of loaderModule.EVENT_TRIGGERS) {
        assert.equal(TRIGGER_SOURCES.includes(ordinal), false, `"${ordinal}" is a scope ordinal, never a source`);
      }
      // Non-vacuity: the sweep would see a leaked token, and the loader really is the file read.
      assert.ok(loader.includes("EVENT_TRIGGERS"), "the loader source was actually read");
    },
  },

  {
    name: "FF-6302/6 the declaration is a registered bundle asset targeted under .aof/, and the installed copy is byte-identical",
    run: () => {
      const declared = bundleAssets().find((member) => member.target === ".aof/triggers.jsonc");
      assert.ok(declared != null, "the trigger declaration is registered as a bundle member");
      assert.equal(declared.kind, "asset", "…of the asset kind, which installs its bytes verbatim");
      assert.equal(declared.file, "triggers.jsonc", "…from the bundled source");

      const source = readFileSync(path.join(REPO_ROOT, "src", "bundle", declared.file));
      const installed = readFileSync(path.join(REPO_ROOT, ...declared.target.split("/")));
      assert.ok(installed.equals(source), "the installed copy is byte-identical to the bundled source");
      assert.equal(sha256(installed), sha256(source), "…and so is its content address");

      // It ships something: a declaration that installed an empty file would satisfy every byte
      // comparison above.
      const compiled = compileTriggerDeclaration(bundledTriggerDeclaration());
      assert.ok(compiled.triggers.length > 0, "the shipped declaration compiles to at least one trigger");
      const declaredSources = new Set(compiled.triggers.map((trigger) => trigger.source));
      for (const source_ of TRIGGER_SOURCES) {
        assert.ok(declaredSources.has(source_), `the shipped declaration declares at least one "${source_}" trigger`);
      }

      // AND THIS COMPILE ASKED NO REGISTRY, so it must claim nothing about one. Compiled without
      // `loops`, every pointer here is `registry-not-supplied` — never `loop-not-declared`, which
      // would be a positive claim that the four loops the shipped declaration names resolve to
      // nothing. They are all declared in `.aof/loops/`, so that claim would be FALSE, and this
      // control is one of the readers that would have carried it.
      for (const entry of compiled.pairings.filter((item) => item.loop != null)) {
        assert.equal(
          entry.reason,
          "registry-not-supplied",
          `${entry.triggerId}: a compile handed no registry reports that it asked none`,
        );
      }
    },
  },

  {
    name: "FF-6302/7 the eol RATCHET: every .aof/** asset the bundle declares is pinned eol=lf, and its two copies agree byte for byte",
    run: () => {
      const targets = aofAssets().map((member) => member.target);
      assert.ok(targets.length > 0, "the bundle declares .aof/** assets to be pinned");
      assert.ok(targets.includes(".aof/triggers.jsonc"), "…including this story's own declaration");
      assert.ok(targets.includes(".aof/frozen-set.jsonc"), "…and the one measured unpinned at HEAD");

      const probe = git(["check-attr", "eol", "--", ".gitattributes"]);
      assert.equal(probe.status, 0, "git check-attr is available — the attribute leg cannot be skipped into a false green");

      for (const target of targets) {
        // THE ATTRIBUTE, driven from the bundle's own asset list. `.gitattributes:12` pins
        // `.aof/**/*.json`, which does NOT match `.jsonc`; the N+1th declaration arriving
        // unpinned fails here rather than at some future gate on a Windows checkout.
        const result = git(["check-attr", "eol", "--", target]);
        assert.equal(result.status, 0, `git check-attr answered for ${target}`);
        assert.match(
          result.stdout.trim(),
          /: eol: lf$/,
          `${target} is covered by an eol=lf attribute (got: ${result.stdout.trim()})`,
        );
      }

      // AND THE BYTES, because the attribute is what makes them true and neither leg implies the
      // other: git holds ONE blob for a bundle source and its installed copy, so a working-tree
      // mismatch is invisible in a diff.
      //
      // WHEN THIS LEG FAILS IT NAMES THE REMEDY, because the failure a reader will actually meet
      // is one NO CODE CHANGE CAUSED. Git does not re-check-out an unmodified working-tree file
      // when a `.gitattributes` pin lands, so a checkout that already held a CRLF copy still
      // holds it after the pin arrives — measured: fresh checkout CR:true, after the pin commit
      // CR:true, and only an explicit re-checkout gives CR:false. A fresh clone (CI) is always
      // LF, so this lands on the operator of an existing tree and on nobody else. A control that
      // fails for a reason no diff caused must say what to do about it, or the next person
      // rediscovers this paragraph from first principles.
      const remedy = (relpath) => [
        `${relpath} carries CR bytes in this working tree.`,
        "This is a CHECKOUT state, not a code defect: git does not re-check-out an unmodified file",
        "when a .gitattributes pin lands, so a tree that predates the pin keeps its CRLF copy.",
        "Fix this checkout with:",
        `    git add --renormalize ${relpath} && rm ${relpath} && git checkout -- ${relpath}`,
      ].join("\n");

      for (const member of aofAssets()) {
        const target = path.join(REPO_ROOT, ...member.target.split("/"));
        if (!existsSync(target)) continue;
        assert.ok(statSync(target).isFile(), `${member.target} is a file`);
        const installed = readFileSync(target);
        assert.equal(installed.includes(0x0d), false, remedy(member.target));
        assert.ok(
          installed.equals(readFileSync(path.join(REPO_ROOT, "src", "bundle", member.file))),
          `${member.target} is byte-identical to src/bundle/${member.file}\n${remedy(member.target)}`,
        );
      }

      // Non-vacuity: a path the pins do not cover answers `unspecified`, so the assertion above
      // is deciding something rather than matching whatever git happens to print.
      const unpinned = git(["check-attr", "eol", "--", "src/work-trigger/declaration.mjs"]);
      assert.match(unpinned.stdout.trim(), /: eol: unspecified$/, "an unpinned path is distinguishable from a pinned one");
    },
  },
];
