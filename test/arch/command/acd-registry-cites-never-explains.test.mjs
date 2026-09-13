// Fitness function: FF-11908 (119/ADR-006 §3, §4; TECH_DEBT items 26, 84) —
//
//   "The registry cites; it does not explain."
//
// ── WHAT IS ASSERTED, AND WHAT IS DELIBERATELY NOT ────────────────────────────────────────
// A SHAPE over the file that exists: no entry in `src/command-core.mjs` carries a rationale
// paragraph. Each command's registry comment is a SINGLE line whose content is a citation, and the
// prose lives in the command module's own header. NO comment count, NO comment ratio and NO line
// budget other than one-per-entry is asserted anywhere here — item 61's measured failure is a cap
// with no admitted decomposition, item 78 declined the same trap one directory over, and ADR-006 §4
// rules it out for this file. Leg 5 below reads THIS FILE's own source and refuses a density number
// added later, so the ruling cannot be quietly reversed by the next hand that finds a number
// convenient.
//
// ── THE SUBJECT IS AN ENTRY'S COMMENT, WHICH IS NOT EVERY COMMENT IN THE FILE ─────────────
// Scanning contiguous `^\s*//` runs finds 68 blocks at HEAD, and three classes are NOT this
// sweep's subject:
//   · THE MODULE HEADER (lines 1-26) — the `Command` shape, `ctx`, and ADR-002's basis-neutral
//     path rule. It sits directly above `import { loadWorkspace } from "./work.mjs";`, so a sweep
//     reading "the block above an import" DELETES IT. It is classified by position (the block that
//     opens the file), never by what it sits above.
//   · THE REGISTRY'S OWN API — the comments over `export { loadWorkspace }`, the array's opening,
//     `REGISTRY`, `getCommand`, `listCommands` and `invoke`. They document the registry, not an
//     entry in it.
//   · A BLOCK ABOVE AN IMPORT THAT IS NOT A COMMAND — anything whose specifier is not
//     `./commands/…`.
// Leg 4 asserts those three classes are still present AND still multi-line, so a classifier that
// swallowed them would be caught by this control rather than by a reader a year later.
//
// ── THE EXEMPT CLASS IS NOT IN THE REGISTRY, AND THAT IS THE POINT ────────────────────────
// TECH_DEBT item 84 names "this file's deferred-import comments" as the one exempt class.
// Measured: `grep -c "await import(" src/command-core.mjs` is **0**. Those comments live one
// directory over, in `src/commands/` — `trigger.mjs`, `tune.mjs`, `work-ui.mjs`, `loop.mjs`,
// `loop-document.mjs`, `doctor.mjs` and the two `assets/` modules. Scoped as the register row
// words it, the exempt-class leg would pass over the EMPTY SET permanently (ADR-003 §4's silent
// carrier, in the row that exists to prevent a deletion) and the deletion it forbids would go
// unguarded in the only directory where it can happen. Leg 3 therefore scopes the class to
// `src/commands/**`, DERIVES the site set by reading it, and asserts the set non-empty and no
// smaller than the floor measured at HEAD.
//
// ── THE WALK IS RECURSIVE, BECAUSE THIS STORY IS WHAT GIVES THE DIRECTORY AN INTERIOR ─────
// 119/02 moves `src/commands/{mesh,assets,graph}-*.mjs` into `src/commands/{mesh,assets,graph}/`.
// A non-recursive `readdir` here would lose 32 modules WITHOUT ERRORING — three of them
// (`assets/add.mjs`, `assets/clean.mjs`, `assets/ui.mjs`) carrying deferred imports — which is the
// species ADR-003 §4 names and the one this control must not be an instance of.
//
// ── PLANTS NEVER TOUCH THE REAL TREE ─────────────────────────────────────────────────────
// Every red probe drives THE SHIPPED DETECTOR over a SYNTHESIZED source or file set — never a
// locally re-implemented copy of it, and never a write to disk.
//
// WHAT WOULD QUIETLY UNDO THIS: a comment-density number added to this control later, which turns a
// shape claim back into item 61's cap (leg 5 refuses it); the exempt class re-scoped to
// `src/command-core.mjs`, where it is vacuous (leg 3's floor refuses it); a non-recursive walk of
// `src/commands/`, which loses a third of the directory in silence (leg 3's floor refuses that too);
// and the module header classified as an entry's comment, which deletes the file's own
// documentation (leg 4 refuses it).
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { importSpecifiers } from "../../support/module-family.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const REGISTRY_FILE = "src/command-core.mjs";
const COMMANDS_DIR = "src/commands";

// The three modules TECH_DEBT item 26 names, measured 2026-09-06. They are a claim about WHICH
// modules explain their ring — asserted against the derived set, never used as the set.
const NAMED_RING_MODULES = Object.freeze(["trigger.mjs", "tune.mjs", "work-ui.mjs"]);

// NON-VACUITY, and the one stored number in this file. It is a FLOOR on the derived exempt set — a
// bound nobody can compute from the tree (ADR-003 §3) — and it is NOT a comment count, a ratio or a
// line budget.
//
// IT IS FOUR AND NOT NINE, DELIBERATELY. The derivation finds NINE sites in the delivered tree
// (`assets/add`, `assets/clean`, `doctor`, `loop-document`, `loop`, `trigger`, `tune`, and
// `work-ui` twice); the contract measured FOUR and names four. Pinning the floor at the measured
// nine would make it an equality wearing a floor's clothes — every future module that documents a
// deferral would have to be counted here, and a legitimate removal would red this control for a
// reason that is not the one it exists for. The real protection is not the number: it is
// `NAMED_RING_MODULES` below, which fails BY NAME when `trigger.mjs`, `tune.mjs` or `work-ui.mjs`
// stops explaining its ring — which is the deletion TECH_DEBT item 26 names, and the one the
// contract's own red probe plants. The floor's whole job is to refuse the empty set and the walk
// that quietly stops seeing two thirds of this directory.
export const EXEMPT_SITE_FLOOR = 4;

// ── THE SHIPPED PARSER ───────────────────────────────────────────────────────────────────
// `src/command-core.mjs` as a list of contiguous `//` blocks, each classified by WHAT IT SITS
// ABOVE and by WHERE IT IS — the two facts that separate an entry's comment from the file's own.
//
//   header      — the block that opens the file. Position, never content.
//   entry       — above an `import … from "./commands/…"`, or above a `<name>Command,` line inside
//                 the `COMMANDS` array. THE SUBJECT.
//   api         — everything else: the registry's own exports, the array's opening, its functions.
//
// The import statement is read to its own `from "…";` terminator rather than to the end of the
// line, because this file's house style wraps a multi-binding import across lines and a
// line-bounded read would classify the block above one as `api` and pass over it.
export function registryBlocks(source) {
  const lines = source.split(/\r?\n/);
  const blocks = [];
  let current = null;
  lines.forEach((line, index) => {
    if (/^\s*\/\//.test(line)) {
      if (current == null) current = { start: index, lines: [] };
      current.end = index;
      current.lines.push(line.replace(/^\s*\/\/ ?/, ""));
    } else if (current != null) {
      current.nextIndex = index;
      blocks.push(current);
      current = null;
    }
  });
  if (current != null) {
    current.nextIndex = lines.length;
    blocks.push(current);
  }

  const arrayStart = lines.findIndex((line) => /^const COMMANDS\s*=/.test(line));
  const importAt = (index) => {
    if (!/^import\b/.test(lines[index] ?? "")) return null;
    let text = lines[index];
    let cursor = index;
    while (!/from\s*["'][^"']+["'];?\s*$/.test(text) && cursor < lines.length - 1) {
      cursor += 1;
      text += `\n${lines[cursor]}`;
    }
    return { specifier: importSpecifiers(text)[0]?.specifier ?? null, text };
  };

  for (const block of blocks) {
    const next = lines[block.nextIndex] ?? "";
    const statement = importAt(block.nextIndex);
    const arrayEntry = arrayStart >= 0 && block.start > arrayStart && /^\s*[A-Za-z]\w*Command,?\s*$/.test(next);
    if (block.start === 0) block.kind = "header";
    else if (statement?.specifier?.startsWith("./commands/")) block.kind = "entry";
    else if (arrayEntry) block.kind = "entry";
    else block.kind = "api";
    block.subject = statement?.specifier ?? next.trim().replace(/,$/, "");
    block.lineCount = block.lines.length;
    block.line = block.start + 1;
  }
  return blocks;
}

// A CITATION, as ADR-006 §3 words it: `m?<itemRef>/<ID>`. The bare `m<NN>` milestone reference and
// the ledger's own `TECH_DEBT item <n>` / `chore <n>` forms are carried too — they are the shapes
// this file's blocks actually use, and a rule that recognised only one of them would call a real
// citation an explanation.
const CITATION = /(?:\bm?\d{1,3}\/(?:ADR|FF|F)-\d[\w-]*|\bFF-\d[\w-]*|\bTECH_DEBT item \d+|\bchore \d+|\bm\d{2,3}\b)/u;
// The other admitted content for a one-line comment: a pointer to where the prose now lives.
const NAMES_ITS_HOME = /\bsee\b[^\n]*\b(?:header|module)\b|\bheader\b[^\n]*\bsee\b|\.\/commands\//u;

/**
 * THE SHIPPED DETECTOR for the shape claim. `{ violations, report }` — the violations are the
 * refusals, the report is what a green run leaves behind instead of silence.
 */
export function registryShape(source) {
  const blocks = registryBlocks(source);
  const entries = blocks.filter((block) => block.kind === "entry");
  const violations = [];

  for (const block of entries) {
    if (block.lineCount > 1) {
      violations.push(
        `${REGISTRY_FILE}:${block.line} — the registry entry for ${block.subject} carries a ${block.lineCount}-line rationale. `
          + "A registry entry's comment is ONE line and its content is a citation; the paragraph belongs in that command module's own header (ADR-006 §3).",
      );
      continue;
    }
    const text = block.lines[0] ?? "";
    if (!CITATION.test(text) && !NAMES_ITS_HOME.test(text)) {
      violations.push(
        `${REGISTRY_FILE}:${block.line} — the one-line comment on ${block.subject} carries neither a citation (m?<itemRef>/<ID>) nor the name of the decision's home. `
          + "The registry cites; a line that explains in miniature is still an explanation.",
      );
    }
  }

  // TWO HOMES — the defect proper. A command whose binding carries a comment at its import AND at
  // its array entry states the same decision twice, in the one file whose whole problem is that.
  const bySubject = new Map();
  for (const block of entries) {
    const key = block.subject.replace(/^\.\/commands\//u, "").replace(/\.mjs$/u, "").replace(/Command$/u, "").toLowerCase().replace(/[^a-z]/gu, "");
    if (!bySubject.has(key)) bySubject.set(key, []);
    bySubject.get(key).push(block);
  }
  for (const [key, held] of bySubject) {
    if (held.length > 1) {
      violations.push(
        `${REGISTRY_FILE} — ${key} carries a registry comment in ${held.length} places (lines ${held.map((block) => block.line).join(", ")}). `
          + "A command states its decision in at most ONE place in this file; the second home is the duplication ADR-006 §3 removes.",
      );
    }
  }

  return {
    violations,
    report: {
      blocks: blocks.length,
      entries: entries.length,
      header: blocks.filter((block) => block.kind === "header").length,
      api: blocks.filter((block) => block.kind === "api").length,
      longest: entries.reduce((max, block) => Math.max(max, block.lineCount), 0),
    },
  };
}

/** The violations function by the name the register uses. Same detector, no second copy. */
export function registryShapeViolations(source) {
  return registryShape(source).violations;
}

// ── THE EXEMPT CLASS, DERIVED ────────────────────────────────────────────────────────────
// A site is a comment block in a `src/commands/**` module that EXPLAINS a deferred import or the
// ring hazard that forces one. Two facts make it one, and both are read from the source:
//   · its text names the deferral or the hazard (`defer…`, `TDZ`, `ring`, `lazy-load…`,
//     `before initialization`), and
//   · it SITS WITH what it explains — the module carries a dynamic `import(`, or the block itself
//     names the TDZ read it is warning about.
// A block that merely says "ring" in a module with neither is not a site, which is what stops the
// floor from being satisfiable by prose.
const RING_VOCABULARY = /\b(?:defer(?:red|s|ring)?|TDZ|lazy[- ]load(?:ed|s)?|before initialization)\b/iu;
const NAMES_THE_TDZ = /\bTDZ\b|before initialization/iu;
const DYNAMIC_IMPORT = /\bimport\s*\(/u;
// How far below a block the deferred import may sit and still be the thing it explains. A comment
// documenting a deferral sits directly above the function that performs it; the window is the
// function's own signature line plus a short body, not a licence to reach across the module.
const PROXIMITY_LINES = 8;

async function walkCommandModules(dir, prefix = "") {
  // RECURSIVE — 119/02 gives this directory an interior, and a flat `readdir` would lose 32
  // modules without erroring (ADR-003 §4).
  const found = [];
  for (const entry of await readdir(path.join(repoRoot, dir), { withFileTypes: true })) {
    const rel = prefix === "" ? entry.name : `${prefix}/${entry.name}`;
    if (entry.isDirectory()) found.push(...(await walkCommandModules(path.join(dir, entry.name), rel)));
    else if (entry.name.endsWith(".mjs")) found.push(rel);
  }
  return found;
}

/**
 * THE SHIPPED DETECTOR for the exempt class. `files` is `[{ rel, source }]` so a probe can hand it
 * a synthesized set — the real one is read by `readCommandModules()` below.
 */
export function deferredImportSites(files) {
  const sites = [];
  for (const { rel, source } of files) {
    const lines = source.split(/\r?\n/);
    let current = null;
    const close = () => {
      if (current == null) return;
      const block = current;
      current = null;
      const text = block.lines.join("\n");
      if (!RING_VOCABULARY.test(text)) return;
      // IT MUST SIT WITH WHAT IT EXPLAINS, and "somewhere in the same module" is not that: a module
      // that carries one deferred import would otherwise turn every paragraph mentioning "deferred"
      // into a site and inflate the floor past the thing it is counting. Two ways a block qualifies,
      // and both are read from the source: the deferred import is within reach BELOW it, or the
      // block names the TDZ read it is warning about (`work-ui.mjs`'s case — the hazard there is a
      // constant read at module scope, and the remedy is a function, not an `import(`).
      const window = lines.slice(block.end + 1, block.end + 1 + PROXIMITY_LINES).join("\n");
      if (DYNAMIC_IMPORT.test(window)) {
        sites.push({ rel, line: block.start + 1, sitsWith: `a deferred import within ${PROXIMITY_LINES} lines below it` });
      } else if (NAMES_THE_TDZ.test(text)) {
        sites.push({ rel, line: block.start + 1, sitsWith: "the TDZ read it names" });
      }
    };
    lines.forEach((line, index) => {
      if (/^\s*\/\//.test(line)) {
        if (current == null) current = { start: index, lines: [] };
        current.end = index;
        current.lines.push(line);
      } else close();
    });
    close();
  }
  return sites;
}

export async function readCommandModules() {
  const names = (await walkCommandModules(COMMANDS_DIR)).sort();
  return await Promise.all(
    names.map(async (rel) => ({ rel, source: await readFile(path.join(repoRoot, COMMANDS_DIR, rel), "utf8") })),
  );
}

export function exemptClassViolations(sites, { floor = EXEMPT_SITE_FLOOR, named = NAMED_RING_MODULES } = {}) {
  const violations = [];
  if (sites.length === 0) {
    violations.push(
      `no deferred-import/ring comment was found anywhere under ${COMMANDS_DIR}/. The exempt class TECH_DEBT item 26 names is asserted over the EMPTY SET — `
        + "the silent-carrier species ADR-003 §4 forbids, in the leg that exists to prevent a deletion.",
    );
    return violations;
  }
  if (sites.length < floor) {
    violations.push(
      `${sites.length} deferred-import/ring comment(s) survive under ${COMMANDS_DIR}/, below the floor of ${floor} measured at HEAD. `
        + `Surviving sites: ${sites.map((site) => `${site.rel}:${site.line}`).join(", ")}. A sweep that removes one of these is the failure FF-11908 must not cause.`,
    );
  }
  for (const module of named) {
    if (!sites.some((site) => site.rel === module || site.rel.endsWith(`/${module}`))) {
      violations.push(
        `${COMMANDS_DIR}/${module} no longer explains why its import is deferred — TECH_DEBT item 26 names it, and the prose sweep must leave it standing.`,
      );
    }
  }
  return violations;
}

export const archTests = [
  {
    name: "arch/119 FF-11908: every registry entry in src/command-core.mjs is ONE line and that line is a citation",
    run: async () => {
      const source = await readFile(path.join(repoRoot, REGISTRY_FILE), "utf8");
      const { violations, report } = registryShape(source);
      assert.deepEqual(violations, [], "a registry entry explains rather than cites (see the message for the entry and its line count)");

      // NON-VACUITY: the parser really read the registry, and it really found entries — a claim
      // over zero entries is the empty-set pass this control exists to refuse.
      assert.ok(report.entries >= 50, `the registry's entries were parsed, not passed over: ${report.entries} entry comment(s) classified`);
      assert.equal(report.longest, 1, "no entry comment is longer than one line");
    },
  },

  {
    name: "arch/119 FF-11908: the module header and the registry's own API comments are NOT entries — they are still present, and still paragraphs",
    run: async () => {
      const source = await readFile(path.join(repoRoot, REGISTRY_FILE), "utf8");
      const blocks = registryBlocks(source);
      const header = blocks.find((block) => block.kind === "header");
      assert.ok(header, "the file's own header block is present");
      assert.ok(
        header.lineCount > 5,
        `the module header is a paragraph and survives the sweep (${header.lineCount} line(s)) — it documents the Command shape, ctx and ADR-002's basis-neutral path rule, and it is NOT an entry's comment`,
      );
      assert.equal(header.line, 1, "the header is classified by POSITION — the block that opens the file — never by what it sits above");

      const api = blocks.filter((block) => block.kind === "api");
      assert.ok(api.length >= 4, `the registry's own API comments are classified apart from its entries (${api.length} of them)`);
      assert.ok(
        api.some((block) => block.lineCount > 1),
        "at least one API comment is still a paragraph — the sweep's subject is an ENTRY's comment, not every comment in the file",
      );
    },
  },

  {
    name: "arch/119 FF-11908: the deferred-import comments that document the TDZ ring survive, and the set is DERIVED from src/commands/** rather than typed",
    run: async () => {
      const files = await readCommandModules();
      assert.ok(files.length >= 60, `the command directory was really walked, recursively: ${files.length} module(s) read`);
      assert.ok(
        files.some((file) => file.rel.includes("/")),
        "the walk descended into the interior 119/02 gives this directory — a flat readdir would lose 32 modules without erroring (ADR-003 §4)",
      );

      const sites = deferredImportSites(files);
      assert.deepEqual(exemptClassViolations(sites), [], "a comment documenting a deferred import or its ring hazard was removed");
      for (const site of sites) assert.ok(site.sitsWith, `${site.rel}:${site.line} sits with ${site.sitsWith}`);
    },
  },

  {
    name: "arch/119 FF-11908 red probe: a restored multi-line rationale above one entry FAILS, naming the entry and the block's line count",
    run: async () => {
      const clean = [
        "// the module header, which is not an entry's comment",
        "// and spans more than one line",
        'import { loadWorkspace } from "./work.mjs";',
        "// work:doctor — 15/ADR-001",
        'import { doctorCommand } from "./commands/doctor.mjs";',
        "const COMMANDS = [",
        "  doctorCommand,",
        "];",
      ].join("\n");
      assert.deepEqual(registryShapeViolations(clean), [], "self-check: the clean registry is quiet in this same lane");

      const planted = clean.replace(
        "// work:doctor — 15/ADR-001",
        [
          "// milestone 15 — work doctor core (work:doctor registers into the SAME core;",
          "// 15/ADR-001). The 7th work command: the deterministic, cross-item HEALTH lane —",
          "// validate's sibling with a richer envelope.",
        ].join("\n"),
      );
      assert.notEqual(planted, clean, "self-check: the plant LANDED");
      const violations = registryShapeViolations(planted);
      assert.equal(violations.length, 1, `the planted paragraph is detected: ${violations.join(" | ")}`);
      assert.match(violations[0], /\.\/commands\/doctor\.mjs/u, "…naming the entry it sits above");
      assert.match(violations[0], /3-line rationale/u, "…and the block's line count");
    },
  },

  {
    name: "arch/119 FF-11908 red probe: a decision stated in BOTH homes for one command FAILS",
    run: async () => {
      const planted = [
        "// the header",
        "// over two lines",
        'import { loadWorkspace } from "./work.mjs";',
        "// work:audit — 59/ADR-008",
        'import { auditCommand } from "./commands/audit.mjs";',
        "const COMMANDS = [",
        "  // work:audit — 59/ADR-008 again, in the second home",
        "  auditCommand,",
        "];",
      ].join("\n");
      const violations = registryShapeViolations(planted);
      assert.ok(
        violations.some((violation) => /carries a registry comment in 2 places/u.test(violation)),
        `the two-homed entry is detected: ${violations.join(" | ")}`,
      );
    },
  },

  {
    name: "arch/119 FF-11908 red probe: deleting src/commands/trigger.mjs's deferred-import comment FAILS, naming that file",
    run: async () => {
      const real = await readCommandModules();
      const trigger = real.find((file) => file.rel === "trigger.mjs");
      assert.ok(trigger, "self-check: src/commands/trigger.mjs is in the walked set");

      const stripped = real.map((file) => (file.rel === "trigger.mjs"
        ? { rel: file.rel, source: file.source.split(/\r?\n/).filter((line) => !/^\s*\/\//.test(line)).join("\n") }
        : file));
      assert.notEqual(stripped.find((file) => file.rel === "trigger.mjs").source, trigger.source, "self-check: the plant LANDED");

      const violations = exemptClassViolations(deferredImportSites(stripped));
      assert.ok(
        violations.some((violation) => /trigger\.mjs/u.test(violation)),
        `removing trigger.mjs's ring comment is detected and named: ${violations.join(" | ")}`,
      );
    },
  },

  {
    name: "arch/119 FF-11908 red probe: a walk that stops at the flat layer LOSES sites, and the loss is named rather than inferred",
    run: async () => {
      const files = await readCommandModules();
      const all = deferredImportSites(files);
      const flat = deferredImportSites(files.filter((file) => !file.rel.includes("/")));

      // The claim is not "the flat set is empty" — it is not, and a probe asserting something
      // trivially true is the weakening this milestone keeps finding. The claim is that the sites
      // inside the interior are REAL and that a flat walk stops seeing them, named one by one.
      const inside = all.filter((site) => site.rel.includes("/"));
      assert.ok(
        inside.length > 0,
        "the interior 119/02 gives src/commands/ holds deferred-import comments of its own — a flat walk would lose them silently",
      );
      assert.deepEqual(
        flat.map((site) => site.rel).sort(),
        all.filter((site) => !site.rel.includes("/")).map((site) => site.rel).sort(),
        "the flat walk finds exactly the flat sites…",
      );
      assert.equal(
        all.length - flat.length,
        inside.length,
        `…and loses exactly the ${inside.length} inside a family: ${inside.map((site) => `${site.rel}:${site.line}`).join(", ")}`,
      );
      assert.ok(
        all.length >= EXEMPT_SITE_FLOOR,
        `the derived set clears its floor: ${all.length} site(s) — ${all.map((site) => `${site.rel}:${site.line}`).join(", ")}`,
      );
    },
  },

  {
    name: "arch/119 FF-11908: this control asserts a SHAPE — no comment count, no comment ratio, no line budget other than one per entry (ADR-006 §4)",
    run: async () => {
      const own = await readFile(fileURLToPath(import.meta.url), "utf8");
      const code = own
        .split(/\r?\n/)
        .filter((line) => !/^\s*\/\//.test(line))
        .join("\n");

      // A density number is a comparison of a COMMENT count against a number. The forms item 61's
      // failure actually took, refused by name rather than by a blanket ban on integers — the floor
      // on the derived exempt set is a bound nobody can compute (ADR-003 §3), and it is not one of
      // these.
      const DENSITY_FORMS = [
        [/\bcommentRatio\b|\bcommentDensity\b|\bCOMMENT_RATIO\b|\bCOMMENT_DENSITY\b/u, "a comment ratio"],
        [/\bcomment(?:Lines|Count)\b\s*[<>]=?|\b[<>]=?\s*\bcomment(?:Lines|Count)\b/u, "a comment count compared against a number"],
        [/\bMAX_COMMENT\w*\b|\bCOMMENT_(?:CEILING|BUDGET|CAP)\b/u, "a comment budget"],
      ];
      const found = DENSITY_FORMS.filter(([pattern]) => pattern.test(code)).map(([, what]) => what);
      assert.deepEqual(
        found,
        [],
        `this control has grown ${found.join(", ")} — a cap with no admitted decomposition is item 61's measured failure and ADR-006 §4 rules it out for this file. The claim is a shape.`,
      );

      // …and the one line budget it DOES assert is the one ADR-006 §3 states: one line per entry.
      assert.match(code, /lineCount > 1/u, "the only line budget asserted is one-per-entry");
    },
  },
];
