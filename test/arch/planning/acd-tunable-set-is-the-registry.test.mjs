// FF-6110 — WHAT MAY BE TUNED AT ALL IS THE REGISTRY'S DECLARATION, NEVER A LIST THIS
// MACHINERY KEEPS. Milestone 61 / story 03, from 61/ADR-008 §4 and 61/ADR-009 §5.
//
// A machine that can widen its own tunable set has no frozen set. If the acceptor held its
// own list of knobs, then "may this be tuned?" would be answered out of a file the component
// wanting a yes is free to edit, and every control built on top of that answer — the rule,
// the ledger, the e-value, the whole milestone — would be decoration. So the set lives where
// it already lives: on the arbiter record's `parameter-tuning:` edge, decided by 55 and 58 on
// a criterion this machinery gets no vote in, and READ from there each time the question is
// asked.
//
// THE DISTINCTION THIS GATE IS ABOUT is between NAMING a key and HOLDING one. Quoting a key
// inside a refusal so a human can read which key was refused is a diagnostic. Carrying a key
// as something the machinery acts on is a second home for the set, and a second home is the
// whole defect. That is why the sweep reads CODE ONLY — and why it reads it through the same
// stripper 69's ceiling-consumption guard already uses, imported rather than restated: two
// definitions of "what counts as code" would answer differently the first time either moved.
//
// WHAT "IT HOLDS NONE" LOOKS LIKE FROM OUTSIDE, and it is the leg worth having: when the
// declaration is empty, NOTHING may be proposed. There is no built-in list underneath to
// fall back on, so an empty registry does not quietly become an acceptor with three knobs of
// its own.
//
// NOT RESTATED HERE: "no acceptor module is a fifth cap resolver". `capProblems` in
// `test/arch/loop/acd-loop-cap-single-home.test.mjs` already walks all of `src/` and would report
// any acceptor module that resolved the cap; duplicating that classifier to reach it from
// here would be the species this milestone indicts everywhere else.
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { loadLoops } from "../../../src/work/loops.mjs";
import {
  KEY_OUTSIDE_DECLARED_SET,
  TUNING_EDGE,
  assessProposal,
  tunableSet,
} from "../../../src/work-acceptor/admissibility.mjs";
import { codeOnly } from "../run/acd-progress-ledger-consumed.test.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

// The two key FAMILIES this milestone may not spell, as prefixes rather than as the three
// keys shipped today: a sibling key added to either family tomorrow is caught by the same
// leg, with nothing here edited. The declared keys are read from the registry on top of
// this, so the gate covers both "a key that exists" and "a key that could".
const FORBIDDEN_FAMILIES = Object.freeze(["work.loop.", "work.autonomous."]);

// The acceptor's own surface: every module under `src/work-acceptor/`, plus the command that
// renders them when it lands. Read from disk rather than listed, so a module added by a
// later story is swept the day it appears.
async function acceptorModules() {
  const dir = path.join(root, "src", "work-acceptor");
  const modules = [];
  for (const name of (await readdir(dir)).sort()) {
    if (!name.endsWith(".mjs")) continue;
    modules.push({ rel: `src/work-acceptor/${name}`, code: await readFile(path.join(dir, name), "utf8") });
  }
  const face = path.join(root, "src", "commands", "acceptor.mjs");
  if (existsSync(face)) modules.push({ rel: "src/commands/acceptor.mjs", code: await readFile(face, "utf8") });
  return modules;
}

// PURE — modules in, declared keys in, findings out. Pure so the defect can be PLANTED
// without writing a key into a real acceptor module in order to prove the sweep can see one.
export function spelledKnobKeys(modules, declaredKeys) {
  const needles = [...new Set([...FORBIDDEN_FAMILIES, ...declaredKeys])];
  return modules.flatMap(({ rel, code }) => {
    const source = codeOnly(code);
    return needles
      .filter((needle) => source.includes(needle))
      .map((needle) => `${rel} spells ${JSON.stringify(needle)} in CODE — the tunable set is the registry's `
        + "`parameter-tuning:` edge, and a key this machinery acts on is a second home for it "
        + "(61/ADR-008 §4). Quoting a key inside a diagnostic message is fine; holding one is not.");
  });
}

const arbiterDeclarations = (model) => model.nodes
  .filter((node) => (node.edges?.[TUNING_EDGE] ?? []).length > 0);

export const archTests = [
  {
    name: "arch/61 FF-6110 no acceptor module spells a tunable knob key in code, and the sweep can see one that does",
    run: async () => {
      const model = await loadLoops(path.join(root, "src", "bundle"));
      const declared = tunableSet(model).keys;
      const modules = await acceptorModules();
      assert.ok(modules.length >= 3, `the acceptor surface was actually read: ${modules.length} modules`);
      assert.ok(declared.length >= 3, `the registry supplied the declared keys: ${declared.length}`);

      assert.deepEqual(spelledKnobKeys(modules, declared), []);

      // NON-VACUITY, AND THE DISTINCTION ITSELF. A planted module that ACTS on a key is
      // reported; the same key quoted in a message or written in a comment is not — which is
      // exactly the line 69's guard already draws, drawn here by the same stripper.
      const [key] = declared;
      const holds = [{ rel: "src/work-acceptor/planted.mjs", code: `const KNOBS = ["x"];\nconst tuned = config?.${key};\n` }];
      assert.equal(spelledKnobKeys(holds, declared).length > 0, true, "a key carried in code is a second home");
      const quotes = [{
        rel: "src/work-acceptor/planted.mjs",
        code: `// tomorrow this file might mention ${key}\nthrow new Error(\`${key} is not admissible\`);\n`,
      }];
      assert.deepEqual(spelledKnobKeys(quotes, declared), [], "a key quoted in a diagnostic is not a claim of membership");
    },
  },
  {
    name: "arch/61 FF-6110 the admitted set is resolved from the arbiter's parameter-tuning edge through loadLoops, and is identical to it",
    run: async () => {
      const model = await loadLoops(path.join(root, "src", "bundle"));
      const declaring = arbiterDeclarations(model);
      // A FLOOR AND A DECLARED CEILING, never a retyped count (FF-11902): the registry was really
      // read (at least one declarer), and ONE declarer is the decision 61/ADR-008 §4 makes — the
      // tunable set has a single home — not a number measured off the tree.
      assert.ok(declaring.length >= 1, "non-vacuous: at least one record under src/bundle declares what it tunes");
      assert.ok(declaring.length <= 1, `ONE record declares what it tunes — a second is a second home for the tunable set: ${declaring.map((node) => node.id).join(", ")}`);
      const [record] = declaring;
      assert.equal(record.kind, "arbiter", "…and it is the arbiter, the node whose job is resolving the trade-off");

      const resolved = tunableSet(model);
      assert.deepEqual(
        [...resolved.keys],
        record.edges[TUNING_EDGE].filter((entry) => entry.scheme === "config").map((entry) => entry.operand),
        "what may be proposed IS the declaration, in the declaration's own order",
      );
      assert.deepEqual([...resolved.declaredBy], [record.id]);
      assert.equal(resolved.edge, TUNING_EDGE);
      assert.ok(resolved.keys.length >= 3, `non-vacuous: ${resolved.keys.length} declared knobs`);
    },
  },
  {
    name: "arch/61 FF-6110 a key outside the declared edge is a CODED refusal, and an empty declaration admits nothing rather than falling back on a built-in set",
    run: async () => {
      const model = await loadLoops(path.join(root, "src", "bundle"));
      const declared = tunableSet(model).keys;

      // A real bound the registry does not claim, and a key that names no bound at all.
      for (const key of ["work.loop.progressMaxResets", "work.nothing.atAll"]) {
        assert.equal(declared.includes(key), false, `${key} is not declared tunable`);
        const proposal = assessProposal({ key }, { model, units: [], harness: null });
        assert.deepEqual(proposal.codes, [KEY_OUTSIDE_DECLARED_SET], `${key}: a coded refusal, not a silent drop`);
        assert.equal(proposal.considered, false);
      }

      // THE OBSERVABLE FORM OF "IT HOLDS NONE": strip the declaration and the acceptor has
      // nothing left to propose. A built-in list underneath would show up right here.
      const stripped = {
        ...model,
        nodes: model.nodes.map((node) => ({ ...node, edges: { ...node.edges, [TUNING_EDGE]: [] } })),
      };
      assert.deepEqual([...tunableSet(stripped).keys], []);
      for (const key of declared) {
        assert.deepEqual(
          assessProposal({ key }, { model: stripped, units: [], harness: null }).codes,
          [KEY_OUTSIDE_DECLARED_SET],
          `${key}: with the declaration empty, even a key the registry declares today is refused`,
        );
      }
    },
  },
  {
    name: "arch/61 FF-6110 the set moves with the declaration in BOTH directions, with nothing else edited",
    run: async () => {
      const model = await loadLoops(path.join(root, "src", "bundle"));
      const [record] = arbiterDeclarations(model);
      const added = "work.fixture.roundsAllowed";
      const context = { units: [], harness: null };

      const widened = {
        ...model,
        nodes: model.nodes.map((node) => (node.id !== record.id ? node : {
          ...node,
          edges: {
            ...node.edges,
            [TUNING_EDGE]: [...node.edges[TUNING_EDGE], { raw: `config:${added}`, scheme: "config", operand: added, resolved: null }],
          },
        })),
      };
      assert.deepEqual(assessProposal({ key: added }, { ...context, model }).codes, [KEY_OUTSIDE_DECLARED_SET]);
      assert.equal(
        assessProposal({ key: added }, { ...context, model: widened }).codes.includes(KEY_OUTSIDE_DECLARED_SET),
        false,
        "a key added to the declaration becomes proposable",
      );

      const dropped = {
        ...model,
        nodes: model.nodes.map((node) => (node.id !== record.id ? node : {
          ...node,
          edges: { ...node.edges, [TUNING_EDGE]: node.edges[TUNING_EDGE].slice(1) },
        })),
      };
      const removed = tunableSet(model).keys[0];
      assert.equal(tunableSet(dropped).keys.includes(removed), false);
      assert.deepEqual(
        assessProposal({ key: removed }, { ...context, model: dropped }).codes,
        [KEY_OUTSIDE_DECLARED_SET],
        "a key dropped from the declaration stops being proposable",
      );
    },
  },
  {
    name: "arch/61 FF-6110 self-check — the acceptor's admissibility module holds no knob key at all, in code, in a string or in a comment",
    run: async () => {
      // STRICTER THAN THE SWEEP ABOVE, and deliberately so for this one module: it is the
      // module that decides membership, so the cleanest form of "the set is not here" is that
      // no knob is spelled in it under any reading. The sweep above stays code-only, because
      // ADR-008 §4 explicitly allows a later story to quote a key inside a diagnostic.
      const source = await readFile(path.join(root, "src", "work-acceptor", "admissibility.mjs"), "utf8");
      const model = await loadLoops(path.join(root, "src", "bundle"));
      for (const needle of [...FORBIDDEN_FAMILIES, ...tunableSet(model).keys]) {
        assert.equal(source.includes(needle), false, `the module that decides membership never spells ${needle}`);
      }
      // …and it reaches the declaration rather than a list: the edge name is the registry's
      // vocabulary, and it is the only thing about a knob this module knows how to spell.
      assert.equal(source.includes(TUNING_EDGE), true, "it names the EDGE it consults, which is the registry's own vocabulary");
    },
  },
];
