// Fitness function: FF-6307 — A TRIGGERED WAKE NEVER CLASSIFIES, AND NEVER INVENTS A SCOPE
// (63/ADR-007, ADR-010 §9, §10).
//
// Eight legs. Each fails for a different reason, and each is one a cheap conforming edit would
// otherwise satisfy while holding nothing:
//
//   1 · NO FEEDBACK RECORD'S BODY IS READ — RAW CAPTURE AND LATER TRIAGE CLASSIFICATION ALIKE.
//       Both vocabularies are READ FROM `src/feedback-records.mjs` rather than retyped here, so a
//       vocabulary that grows is covered with no edit to this file, and every key of both is
//       planted on a capture and required to reach nothing. Branching on triage's verdict is the
//       same classification wearing someone else's answer, which is why the classification record
//       is planted beside the raw one rather than assumed out of scope. The static half bans
//       READING A PROPERTY OFF A CAPTURE AT ALL — `.length` excepted, which is the one question
//       existence needs — because that is the shape the defect takes, and the runtime half proves
//       it with captures that THROW on any access.
//   2 · THE FAMILY HOLDS NO CLASSIFICATION VOCABULARY OF ITS OWN, and does not re-declare or
//       branch on the refusal capture already raises (`feedback-classification-deferred`, read out
//       of `src/commands/feedback.mjs` rather than spelled here).
//   3 · THE BODY-BLINDNESS IS DRIVEN POSITIVELY AND COMPARATIVELY. Two captures with identical
//       attribution and wildly different bodies must produce BYTE-IDENTICAL resolutions — the only
//       assertion that proves content did not reach a decision, because a body-reading source and
//       a body-blind source agree on every single-capture fixture ever written.
//   4 · THE SCOPE GRAMMAR IS IMPORTED, NOT AUTHORED. `decideLoopScope` is reached by import from
//       the module that is the sole home of `LOOP_SCOPE_FORMS`; the family holds no `\d` pattern,
//       no range grammar and no item-ref regex; and the LEAF holds no pattern machinery at all.
//   5 · A STORY-SHAPED SIGNAL IS A CODED REFUSAL NAMING THE DRIVER, NEVER A WIDENING. The refusal
//       names the driver and the resolved set is EMPTY for it — naming and resolving are asserted
//       apart, because the implicit walk up to the milestone is the largest blast radius this
//       milestone can produce by accident.
//   6 · NO SOURCE READS A BUILD STATUS, A PIPELINE NAME OR A FAILURE CLASS, asserted over a
//       planted CI signal carrying all three through a RECORDING PROXY — the read set, not the
//       answer, because a source that reads a status and discards it is one edit from the defect.
//   7 · A SOURCE THAT CANNOT RESOLVE EMITS A CODED REFUSAL, and the refused and resolved sets are
//       DISJOINT BY IDENTITY and account for every signal, so nothing is dropped between them.
//   8 · A WELL-FORMED DRIVER REF BEARING NO ITEM RESOLVES (ADR-010 §10), and the leaf performs no
//       filesystem read at all — the same leg that proves its answer is identical beside any tree.
//       `work:loop` refuses an empty scope where the tree is already read, so the answer is given
//       by the right component rather than lost.
//
// TWO THINGS THIS CONTROL DELIBERATELY DOES NOT BAN, AND WHY, BECAUSE AN UNEXPLAINED OMISSION
// READS AS AN OVERSIGHT:
//
//   · `verdict` FAMILY-WIDE. `src/work-trigger/level.mjs` legitimately renders the groundedness
//     component verdict the GATE handed it (a different noun from a finding's classification), and
//     banning the token would either red a delivered file or need a per-file exclusion — the
//     species TECH_DEBT item 81 names. The finding-side reading is banned where it is real: at
//     runtime, over every key of both feedback vocabularies.
//   · PATTERN MACHINERY IN A MODULE THAT READS FILES. `src/work-trigger/declaration.mjs`
//     legitimately holds one regex — the JSONC banner stripper. So the pattern bans run over a
//     DERIVED PARTITION: every family module whose whole import closure touches no `node:fs` is a
//     pure decider over values it was handed, and holds no pattern at all. That covers the next
//     family module on the day it lands, with nothing here edited, and it is measured rather than
//     listed — the earlier cut of this leg banned patterns in the LEAF only, and a scope form
//     planted in `level.mjs` kept all eight legs green. The digit-pattern species (`\d`, `[0-9]`,
//     a `-` split, a `BigInt` coercion) stays banned family-wide, including in the module that
//     does read files.
//
// LEGS 1, 2 AND 4's bans are each driven against a PLANTED violation, so a regex that stopped
// matching anything is not mistaken for a file that stopped containing anything. Legs 3, 5, 6, 7
// and 8 are non-vacuous by POSITIVE ASSERTION instead: each drives the real sources over real
// signals and requires a specific answer, so there is no shape in which they assert nothing.
import assert from "node:assert/strict";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  SIGNAL_SOURCES,
  isResolvedSignal,
  resolveCiSignal,
  resolveCronSignal,
  resolveFindingSignal,
  resolveTriggerSignals,
} from "../../../src/work-trigger/sources.mjs";
import { RAW_FEEDBACK_KEYS, FEEDBACK_CLASSIFICATION_KEYS } from "../../../src/feedback-records.mjs";
import { LOOP_SCOPE_FORMS, decideLoopScope } from "../../../src/work/loop.mjs";
// LINE COMMENTS FIRST, THEN BLOCKS — TECH_DEBT items 24 and 57. A `//` comment containing `/*`
// opens a block-comment run for a block-first stripper, and everything to the next `*/` is
// deleted; the bans below would then sweep a truncated string and report green over a region they
// never read. The one home is `test/support/source-slice.mjs`, and this control reads it there.
import { stripComments } from "../../support/source-slice.mjs";
import { importSpecifiers } from "../../support/module-family.mjs";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const FAMILY_DIR = path.join(REPO_ROOT, "src", "work-trigger");
const LEAF_PATH = path.join(FAMILY_DIR, "sources.mjs");
const FEEDBACK_COMMAND_PATH = path.join(REPO_ROOT, "src", "commands", "feedback.mjs");
const LOOP_PATH = path.join(REPO_ROOT, "src", "work", "loop.mjs");

const read = (file) => readFileSync(file, "utf8");

// THE FAMILY IS DISCOVERED, NEVER LISTED. A module added to `src/work-trigger/` is covered by
// every ban below on the day it lands, which is the only version of "no module under
// src/work-trigger/" that stays true.
function family() {
  return readdirSync(FAMILY_DIR)
    .filter((entry) => entry.endsWith(".mjs"))
    .map((entry) => [entry, stripComments(read(path.join(FAMILY_DIR, entry)))]);
}

// Every module a file reaches, in every form the language offers — the list leg 8's "reads no
// file" argument rests on, so a form this is blind to is a hole in the argument.
function moduleSpecifiers(code) {
  return [...new Set(importSpecifiers(code).map((entry) => entry.specifier))].sort();
}

// A MODULE'S CLOSURE WITHIN `src/`, and the builtins it reaches. Relative specifiers are followed
// transitively; everything else is recorded as a leaf of the walk. The partition leg 4 uses is
// DERIVED from this — never a list of file names, which in the one control that deliberately
// DISCOVERS its family would be the exact species (TECH_DEBT item 81 form 1) it exists to refuse.
function closureOf(file) {
  const files = new Set();
  const builtins = new Set();
  const unresolved = [];
  const queue = [file];
  while (queue.length > 0) {
    const current = queue.pop();
    if (files.has(current)) continue;
    files.add(current);
    for (const specifier of moduleSpecifiers(stripComments(read(current)))) {
      if (!specifier.startsWith(".")) { builtins.add(specifier); continue; }
      const resolved = path.resolve(path.dirname(current), specifier);
      if (existsSync(resolved)) queue.push(resolved);
      else unresolved.push(specifier);
    }
  }
  return { files: [...files], builtins: [...builtins].sort(), unresolved };
}

// A capture that cannot be read at all: every property access throws.
const sealedCapture = () => new Proxy({}, {
  get(_target, key) {
    if (key === Symbol.toPrimitive || key === "then" || key === Symbol.toStringTag) return undefined;
    throw new Error(`the capture was read (${String(key)})`);
  },
  has(_target, key) { throw new Error(`the capture was probed (${String(key)})`); },
  ownKeys() { throw new Error("the capture's keys were listed"); },
});

function recording(fields) {
  const read_ = [];
  const proxy = new Proxy({ ...fields }, {
    get(target, key) { read_.push(String(key)); return Reflect.get(target, key); },
  });
  return { proxy, read: read_ };
}

function stringsIn(value, found = []) {
  if (typeof value === "string") found.push(value);
  else if (Array.isArray(value)) value.forEach((row) => stringsIn(row, found));
  else if (value !== null && typeof value === "object") {
    for (const key of Object.keys(value)) { found.push(key); stringsIn(value[key], found); }
  }
  return found;
}

export const archTests = [
  {
    name: "FF-6307/1 no module under src/work-trigger/ reads a feedback record's body — raw capture and later triage classification alike",
    run: () => {
      // ── the static half: no property of a capture is read anywhere in the family ──
      const bans = [
        [/\bcaptures?\s*\[/, "a capture list indexed", ["captures[0].text", "capture[key]"]],
        [
          // Any property of a capture EXCEPT `length`, which is the one question existence asks.
          /\bcaptures?\s*\.\s*(?!length\b)\w+/,
          "a property read off a capture",
          ["captures.map((row) => row.text)", "capture.classification", "captures.find((row) => row.at)"],
        ],
        [/\bJSON\s*\.\s*stringify\s*\(\s*captures?\b/, "a capture serialised", ["JSON.stringify(captures)"]],
        [/\bfor\s*\(\s*const\s+\w+\s+of\s+captures\b/, "a capture list iterated", ["for (const row of captures) { }"]],
      ];
      for (const [name, code] of family()) {
        for (const [pattern, what, planted] of bans) {
          assert.equal(pattern.test(code), false, `${name} contains ${what}`);
          for (const sample of planted) {
            assert.equal(pattern.test(sample), true, `the ban on ${what} would catch a planted \`${sample}\``);
          }
        }
      }
      // …and the one read that IS allowed is present, so the ban above is not passing because the
      // finding source stopped asking the question altogether.
      assert.match(read(LEAF_PATH), /captures\.length/, "existence is still read, as a length");

      // ── the runtime half: every key of BOTH vocabularies, planted and required to reach
      //    nothing. The lists are the declaring module's, so a vocabulary that grows is covered
      //    with no edit here.
      const vocabulary = [...new Set([...RAW_FEEDBACK_KEYS, ...FEEDBACK_CLASSIFICATION_KEYS])];
      assert.ok(vocabulary.length >= 6, "both feedback vocabularies were read from their declaring module");
      assert.ok(vocabulary.includes("text"), "…including the raw capture's text field");
      assert.ok(vocabulary.includes("classification"), "…and the classification record's verdict field");

      const sentinel = (key) => `SENTINEL-${key}-63-04`;
      const loaded = Object.fromEntries(vocabulary.map((key) => [key, sentinel(key)]));
      const bare = resolveFindingSignal({ source: "feedback-finding", attribution: "63", captures: [{}] });
      const carrying = resolveFindingSignal({ source: "feedback-finding", attribution: "63", captures: [loaded] });

      assert.equal(JSON.stringify(carrying), JSON.stringify(bare),
        "a capture carrying every key of both vocabularies answers exactly as an empty one");
      const strings = stringsIn(carrying);
      for (const key of vocabulary) {
        assert.equal(strings.includes(sentinel(key)), false, `no value under ${key} reaches the answer`);
        assert.equal(strings.includes(key), false, `${key} is not named in the answer either`);
      }

      // …and the keys are not merely discarded, they are never read: a capture that throws on any
      // access still resolves.
      const sealed = resolveFindingSignal({ source: "feedback-finding", attribution: "63", captures: [sealedCapture()] });
      assert.equal(isResolvedSignal(sealed), true, "a capture nobody can read still resolves");
      assert.deepEqual(sealed, bare, "…to the same answer");

      // Only existence and attribution are read, asserted as the read set of the signal itself.
      const { proxy, read: readKeys } = recording({ source: "feedback-finding", attribution: "63", captures: [{}] });
      resolveFindingSignal(proxy);
      assert.deepEqual([...new Set(readKeys)].sort(), ["attribution", "captures"],
        "the finding source reads that a capture exists and which item it is attributed to, and nothing else");
    },
  },

  {
    name: "FF-6307/2 the family holds no classification vocabulary of its own, and does not re-declare the refusal capture already raises",
    run: () => {
      // Capture's own refusal, read out of the command that raises it rather than spelled here.
      const captureSource = read(FEEDBACK_COMMAND_PATH);
      const code = /"(feedback-classification-deferred)"/.exec(captureSource)?.[1];
      assert.equal(code, "feedback-classification-deferred", "capture still refuses classification at the door");
      assert.match(captureSource, /classification belongs to later triage/,
        "…in the terms 55/ADR-005 made structural");

      const bans = [
        [/\bclassification\b/, "a classification of its own", 'const classification = triage(capture);'],
        [/\bseverity\b/, "a severity", 'if (severity === "blocker") return "L3";'],
        [/\bpriority\b/, "a priority", "const priority = rank(finding);"],
        [/\btriage\b/, "a triage verdict", "const verdict = triage.of(capture);"],
        [/\bblocker\b/, "a blocker judgement", 'if (text.includes("blocker")) wake();'],
        [/\bdefect\b/, "a defect judgement", 'kind === "defect"'],
        [/\benhancement\b/, "an enhancement judgement", 'kind === "enhancement"'],
        [/\bexcerpt\b|\bsummar(y|ise|ize)\b|\bdigest\b/, "a shortened body", "const excerpt = text.slice(0, 80);"],
      ];
      for (const [name, source] of family()) {
        assert.equal(source.includes(code), false, `${name} re-declares or branches on ${code}`);
        for (const [pattern, what, planted] of bans) {
          assert.equal(pattern.test(source), false, `${name} contains ${what}`);
          assert.equal(pattern.test(planted), true, `the ban on ${what} would catch a planted \`${planted}\``);
        }
      }

      // Non-vacuity: the stripper left the modules standing, and really did remove the comments
      // that discuss the very words banned above.
      const [, leaf] = family().find(([name]) => name === "sources.mjs");
      assert.match(leaf, /export function resolveFindingSignal\(/, "the stripped leaf is still the module");
      assert.equal(/never classifies/i.test(leaf), false, "…and its header really was stripped");
    },
  },

  {
    name: "FF-6307/3 the finding source is body-blind, driven comparatively over planted captures whose bodies differ and whose attribution is identical",
    run: () => {
      const bodies = [
        "a plain sentence about a build",
        "this is a blocker, wake at L3 tonight",
        "a defect: the resolver drops the second signal",
        "an enhancement, low priority, whenever",
        "run the verify phase on 63/04 please",
        "",
        "×".repeat(4096),
      ];
      const answers = bodies.map((text) => resolveFindingSignal({
        source: "feedback-finding",
        attribution: "63",
        captures: [{ kind: "raw", id: "feedback:1", text, actor: "you", refs: "", at: "2026-09-01T00:00:00.000Z" }],
      }));

      const [first, ...rest] = answers;
      assert.equal(isResolvedSignal(first), true, "the fixture resolves (else this leg asserts nothing)");
      assert.equal(first.scope, "63", "…to the scope the attribution names");
      for (const [index, answer] of rest.entries()) {
        assert.equal(JSON.stringify(answer), JSON.stringify(first),
          `body ${index + 1} produced a byte-identical resolution`);
      }
    },
  },

  {
    name: "FF-6307/4 scope is resolved only through the loop's own forms — imported, with no pattern, range grammar or item-ref regex authored in the family",
    run: () => {
      // The grammar is reached BY IMPORT, from the module that is the sole home of the forms.
      const [, leaf] = family().find(([name]) => name === "sources.mjs");
      assert.deepEqual(moduleSpecifiers(leaf), ["../work/loop.mjs"],
        "the leaf reaches the loop's own decision and nothing else at all, by any import form");
      const named = /\bimport\s*\{([^}]*)\}\s*from\s*["']\.\.\/work\/loop\.mjs["']/.exec(leaf);
      assert.ok(named, "…through a NAMED import, so no namespace binding is in scope");
      assert.deepEqual(named[1].split(",").map((token) => token.trim()).filter(Boolean), ["decideLoopScope"],
        "…importing exactly the decision, so nothing else could be re-derived from it");

      // …and that module is where the forms live, so the import is the grammar rather than a
      // second reader of it.
      const loop = read(LOOP_PATH);
      assert.match(loop, /export const LOOP_SCOPE_FORMS/, "the forms are declared in the loop module");
      assert.equal(LOOP_SCOPE_FORMS.length >= 1, true, "…and are exported as data");
      assert.match(loop, /export function decideLoopScope\(/, "…and the decision reading them is exported beside them");
      for (const [name, source] of family()) {
        if (name === "sources.mjs" || name === "declaration.mjs") continue;
        assert.equal(/LOOP_SCOPE_FORMS/.test(source), false, `${name} reads the forms directly rather than the decision`);
      }

      // No scope grammar is AUTHORED anywhere in the family.
      const familyBans = [
        [/\\d/, "a digit pattern", ["/^\\d+$/", "/^(\\d+)\\//", "const ref = /\\d+-\\d+/;"]],
        [/\[0-9\]/, "a digit class", ["/^[0-9]+$/"]],
        [/\.split\(\s*["'`]-["'`]\s*\)/, "a range grammar", ['const [lo, hi] = scope.split("-");']],
        [/\bBigInt\s*\(/, "a driver coercion", ["const driver = BigInt(head);"]],
        [/\bparseInt\s*\(|\bNumber\s*\(\s*scope/, "a scope coerced to a number", ["parseInt(scope, 10)", "Number(scope)"]],
      ];
      for (const [name, source] of family()) {
        for (const [pattern, what, planted] of familyBans) {
          assert.equal(pattern.test(source), false, `${name} authors ${what}`);
          for (const sample of planted) {
            assert.equal(pattern.test(sample), true, `the ban on ${what} would catch a planted \`${sample}\``);
          }
        }
      }

      // NO PATTERN MACHINERY AT ALL — over a DERIVED PARTITION of the family rather than over the
      // leaf alone. `src/work-trigger/declaration.mjs` legitimately holds one regex (the JSONC
      // banner stripper) and reaches `node:fs` to read the declaration; a module whose whole
      // closure touches no filesystem is a pure decider over values it was handed, and such a
      // module has no business owning a pattern. The partition is computed from the closures, so
      // the next family module (63/05's) is covered on the day it lands and nothing here is
      // edited — and a module that starts reading files leaves the banned side by MEASUREMENT
      // rather than by anybody's exemption.
      const partition = readdirSync(FAMILY_DIR)
        .filter((entry) => entry.endsWith(".mjs"))
        .map((entry) => {
          const closure = closureOf(path.join(FAMILY_DIR, entry));
          assert.deepEqual(closure.unresolved, [], `${entry}: every relative import in its closure resolves`);
          return { entry, closure, pure: !closure.builtins.some((one) => one.startsWith("node:fs")) };
        });
      const pure = partition.filter((row) => row.pure);
      const impure = partition.filter((row) => !row.pure);

      // Non-vacuity, both sides: the ban applies to something, and it is not applying to
      // everything by accident.
      assert.ok(pure.length >= 1, "at least one family module is a pure decider, so the bans below apply to something");
      assert.ok(impure.length >= 1, "…and at least one is not, so the partition is a partition rather than a tautology");
      assert.ok(pure.some((row) => row.entry === "sources.mjs"), "the leaf is on the banned side of it");

      // ADR-014's measurement, pinned so nobody "fixes" the leaf later by importing the source
      // vocabulary from the compiler: its closure is TWO FILES and NO BUILTINS, which is what
      // makes leg 8's "reads no file" a structural equality rather than a runtime spy.
      const leafClosure = closureOf(LEAF_PATH);
      assert.equal(leafClosure.files.length, 2, "the leaf's closure is two source files (ADR-014)");
      assert.deepEqual(leafClosure.builtins, [], "…and no builtin at all, node:fs least of all");

      const patternBans = [
        [/\/\^/, "an anchored pattern", ["/^\\d+$/", "/^[a-z-]+$/"]],
        [/\$\//, "an end-anchored pattern", ["/[a-z]+$/"]],
        [/\.test\s*\(|\.exec\s*\(|\.match\s*\(/, "a pattern applied", ["pattern.test(scope)", "re.exec(ref)", "scope.match(form)"]],
        [/\bRegExp\b/, "a constructed pattern", ["new RegExp(`^${driver}$`)"]],
        [/\.replace\s*\(|\.trim\s*\(/, "a scope repaired before comparison", ["scope.trim()", 'scope.replace(" ", "")']],
        [/=\s*\/[^/\n]+\/[gimsuy]*\s*;/, "a pattern declared and kept", ["const SCOPE_FORM = /^[a-z][a-z0-9-]*$/;"]],
      ];
      for (const { entry } of pure) {
        const source = stripComments(read(path.join(FAMILY_DIR, entry)));
        for (const [pattern, what, planted] of patternBans) {
          assert.equal(pattern.test(source), false, `${entry} holds ${what}`);
          for (const sample of planted) {
            assert.equal(pattern.test(sample), true, `the ban on ${what} would catch a planted \`${sample}\``);
          }
        }
      }

      // The refusal is the loop's OWN answer, carried through rather than re-phrased.
      const loops = decideLoopScope("63/04");
      const answer = resolveCronSignal({ source: "cron", scope: "63/04" });
      assert.equal(answer.code, loops.code, "the loop's own code");
      assert.deepEqual(answer.admits, loops.admits, "the loop's own admitted forms, in order");
      assert.equal(answer.reason, loops.reason, "the loop's own reason");
    },
  },

  {
    name: "FF-6307/5 a story-shaped signal is a coded refusal naming the driver — never a whole-stream walk and never an implicit widening",
    run: () => {
      const signals = [
        { source: "cron", scope: "63/04" },
        { source: "ci-signal", ref: "63/04" },
        { source: "feedback-finding", attribution: "63/04", captures: [{}] },
        { source: "cron", scope: "63/04/02" },
      ];
      const batch = resolveTriggerSignals(signals);

      assert.equal(batch.resolved.length, 0, "no story-shaped signal resolves to anything, at any scope");
      assert.equal(batch.refused.length, signals.length, "each is a refusal");
      for (const refusal of batch.refused) {
        assert.equal(typeof refusal.code, "string", "with a code");
        assert.equal(refusal.driver, "63", "naming the driver that item belongs to");
        assert.equal("scope" in refusal, false, "and carrying no scope at all");
        assert.equal(refusal.alternative, "aof work drive <phase> <ref>",
          "pointing the caller at the command that drives a single item");
      }
      // The driver is NAMED, and naming it resolves nothing: the same driver put to the same
      // source as a scope of its own is what a resolution looks like, and it takes a second call.
      const widened = resolveCronSignal({ source: "cron", scope: "63" });
      assert.equal(isResolvedSignal(widened), true, "63 declared as a scope resolves");
      assert.equal(batch.answers.every((answer) => !isResolvedSignal(answer)), true,
        "…and no story-shaped signal produced that answer by itself");
    },
  },

  {
    name: "FF-6307/6 no source reads a build status, a pipeline name or a failure class — asserted over a planted signal carrying all three",
    run: () => {
      const { proxy, read: readKeys } = recording({
        source: "ci-signal",
        ref: "63",
        status: "failure",
        conclusion: "failure",
        pipeline: "nightly-integration",
        failureClass: "flaky-network",
        labels: ["urgent"],
      });
      const answer = resolveCiSignal(proxy);
      assert.equal(isResolvedSignal(answer), true, "the signal resolves (else this leg asserts nothing)");
      assert.deepEqual([...new Set(readKeys)].sort(), ["ref"],
        "the CI source read the ref alone — not the status, not the pipeline, not the failure class");

      // …and the answer is identical to one carrying none of it, so nothing was read and echoed.
      assert.deepEqual(answer, resolveCiSignal({ source: "ci-signal", ref: "63" }),
        "a signal carrying a verdict answers exactly as one carrying none");

      // THE REFUSAL PATH IS PROXIED TOO. A signal that HAS a ref returns before anything placed
      // after the `ref === undefined` branch, so the probe above cannot see a leak living there.
      const refused = recording({
        source: "ci-signal",
        status: "failure",
        conclusion: "failure",
        pipeline: "nightly-integration",
        failureClass: "flaky-network",
      });
      const refusal = resolveCiSignal(refused.proxy);
      assert.equal(isResolvedSignal(refusal), false, "a signal with no ref is refused (else this half asserts nothing)");
      assert.deepEqual([...new Set(refused.read)].sort(), ["ref"],
        "…and on the way to that refusal it still read the ref alone");
      assert.equal(stringsIn(refusal).includes("failure"), false, "no outcome reaches the refusal either");

      // No field read of any of them exists in the family's source either.
      for (const [name, source] of family()) {
        for (const [pattern, what, planted] of [
          [/\.\s*(status|conclusion|outcome)\b/, "a build status read", ["signal.status", "signal.conclusion"]],
          [/\.\s*(pipeline|workflow|failureClass)\b/, "a pipeline or failure-class read", ["signal.pipeline", "signal.failureClass"]],
          // A DESTRUCTURE IS A READ, and the two dotted bans above cannot see one. This is the
          // shape a leak would actually take on the refusal path — `const { status, conclusion } =
          // signal;` on the way to refusing — which the recording proxies could not reach either
          // until they were pointed at a signal with no ref.
          [
            /\bconst\s*\{[^}]*\b(status|conclusion|outcome|pipeline|workflow|failureClass|labels)\b[^}]*\}\s*=/,
            "a build verdict destructured",
            ["const { status, conclusion } = signal;", "const { ref, pipeline } = signal;"],
          ],
        ]) {
          assert.equal(pattern.test(source), false, `${name} contains ${what}`);
          for (const sample of planted) {
            assert.equal(pattern.test(sample), true, `the ban on ${what} would catch a planted \`${sample}\``);
          }
        }
      }
    },
  },

  {
    name: "FF-6307/7 a source that cannot resolve emits a coded refusal, and the two sets are disjoint by identity and account for every signal",
    run: () => {
      const signals = [
        { source: "cron", scope: "63" },
        { source: "cron", cadence: "1h" },
        { source: "ci-signal", ref: "60-63" },
        { source: "ci-signal" },
        { source: "feedback-finding", attribution: "7", captures: [{}] },
        { source: "feedback-finding", attribution: "7", captures: [] },
        { source: "feedback-finding", attribution: "7" },
        { source: "a-source-nobody-declared" },
        42,
      ];
      const batch = resolveTriggerSignals(signals);

      assert.equal(batch.answers.length, signals.length, "every signal handed in has exactly one answer");
      assert.equal(batch.resolved.length + batch.refused.length, batch.answers.length,
        "the two sets together account for every signal");
      for (const answer of batch.answers) {
        const inResolved = batch.resolved.includes(answer);
        const inRefused = batch.refused.includes(answer);
        assert.equal(inResolved && inRefused, false, "the sets are disjoint by identity");
        assert.equal(inResolved || inRefused, true, "…and nothing is dropped between them");
      }
      for (const refusal of batch.refused) {
        assert.equal(typeof refusal.code, "string", "every refusal carries a code");
        assert.ok(refusal.code.length > 0, "…a non-empty one");
        assert.equal("scope" in refusal, false, "…and never an empty or partial resolution");
      }
      assert.equal(batch.resolved.length, 3, "the three answerable signals resolved");
      // NOBODY LOOKED and NOTHING IS THERE are different coded answers, which is the seam this
      // milestone has produced four defects at.
      const [, , , , , carriesNone, neverLooked] = batch.answers;
      assert.notEqual(carriesNone.code, neverLooked.code,
        "an item that carries no capture and a caller that handed none are different codes");

      // THE ANSWER SHAPE IS ENUMERATED, so a fourth key fails here rather than at review.
      for (const resolution of batch.resolved) {
        assert.deepEqual(Object.keys(resolution).sort(), ["resolvedFrom", "scope", "source"],
          "a resolution is the scope, the source that answered, and what it resolved the scope from");
      }
    },
  },

  {
    name: "FF-6307/8 a well-formed driver ref bearing no item RESOLVES, and the leaf performs no filesystem read at all",
    run: () => {
      // ADR-010 §10 — existence is a question about the tree, and `work:loop` reads the tree.
      for (const source of SIGNAL_SOURCES) {
        const answer = {
          cron: () => resolveCronSignal({ source, scope: "999999" }),
          "ci-signal": () => resolveCiSignal({ source, ref: "999999" }),
          "feedback-finding": () => resolveFindingSignal({ source, attribution: "999999", captures: [{}] }),
        }[source]();
        assert.equal(isResolvedSignal(answer), true, `${source}: a driver no item bears still resolves`);
        assert.equal(answer.scope, "999999", `${source}: …to that driver`);
      }

      // The leaf's whole import closure is one module, and that module imports nothing at all
      // (53's determinism contract), so there is no route from here to a file.
      const leaf = stripComments(read(LEAF_PATH));
      assert.deepEqual(moduleSpecifiers(leaf), ["../work/loop.mjs"], "the leaf's closure is one module");
      assert.deepEqual(moduleSpecifiers(stripComments(read(LOOP_PATH))), [], "…and that module imports nothing");

      for (const [pattern, what, planted] of [
        [/node:fs|readFile|writeFile|existsSync|readdir/, "a filesystem read", ['import { readFile } from "node:fs/promises";']],
        [/process\s*\.\s*(cwd|env)/, "an ambient reading", ["process.cwd()", "process.env.AOF_HOME"]],
        [/Date\s*\.\s*now\s*\(|new\s+Date\s*\(|performance\s*\.\s*now/, "a clock", ["const now = Date.now();", "new Date()"]],
        [/\brequire\s*\(|\bimport\s*\(|createRequire|\beval\s*\(|new\s+Function\s*\(/, "a route around the import list", ['require("node:fs")', 'await import("node:fs")']],
      ]) {
        assert.equal(pattern.test(leaf), false, `the leaf holds ${what}`);
        for (const sample of planted) {
          assert.equal(pattern.test(sample), true, `the ban on ${what} would catch a planted \`${sample}\``);
        }
      }

      // …and the same answer beside a tree that holds nothing, proven by running there.
      const scratch = mkdtempSync(path.join(os.tmpdir(), "aof-ff6307-"));
      const previous = process.cwd();
      try {
        const here = resolveCronSignal({ source: "cron", scope: "999999" });
        process.chdir(scratch);
        const there = resolveCronSignal({ source: "cron", scope: "999999" });
        assert.deepEqual(there, here, "the answer does not move with the tree it was resolved beside");
      } finally {
        process.chdir(previous);
        rmSync(scratch, { recursive: true, force: true });
      }
    },
  },
];
