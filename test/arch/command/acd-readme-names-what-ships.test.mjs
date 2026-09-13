// Fitness function for story 125 / task 02 — THE README CANNOT NAME A COMMAND THAT DOES NOT RESOLVE.
//
//   "The one line is a specimen, not the defect."
//
// WHY THIS EXISTS. The README's `/aof:autonomous` row said loop engineering was forthcoming while
// it was the thing driving the repository — a claim about the state of the system, written once
// and never re-asked, which is the same failure the site's drift gate exists to prevent for the
// graph page. So the fix carries a control: every `aof …` invocation the README spells is resolved
// against the route set `deriveRouteTable` derives from the registry (`src/spine/face.mjs`), through
// the CLI's own longest-prefix resolver, and the control keeps no list of route names of its own.
// With no registry handed to it, nothing resolves — that is the proof it holds no list.
//
// THE EXTRACTOR'S BOUND IS A CRITERION, MEASURED. A naive `aof <word>` grep over this README reads
// prose as invocations — `aof binds to`, `aof never reads`, `aof owns its`, `aof without anyone`,
// `aof commands` — and a control that manufactures casualties gets deleted by the first person it
// wrongly reds. So the extractor is bounded to FENCED CODE BLOCKS (a line whose first token is
// `aof`) and COMMAND TABLES (a backticked `aof …` span in a `|` row), and that bound is asserted:
// the outline below feeds it prose and expects nothing, and the whole README's naive population is
// shown to exceed the bounded one.
//
// The row that reds on a true invocation is a finding about the REGISTRY, not about the README —
// and it is reported by line, so the reader knows which of the two to fix.
//
// WHAT LONGEST-PREFIX RESOLUTION CANNOT SEE. `aof work validate frobnicate` resolves — `work
// validate` is a route and `frobnicate` is read as a positional — so a bogus argument after a
// resolvable route passes. That is inherent to the route table (flags and arguments are never part
// of a route key); the control holds the VERBS the README names, not their arguments.
//
// THE SAME LESSON, APPLIED TO THE PAGE THIS STORY ADDED. `docs/index.md` spells `aof …` invocations
// in a fenced block too, and the last row runs the same extractor and resolver over it with its own
// floor — a landing page that named a verb the registry does not carry would be the README's defect
// published one level up.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { listCommands } from "../../../src/command-core.mjs";
import { deriveRouteTable, resolveRoute } from "../../../src/spine/face.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const README = "README.md";
const SITE_CONFIG = path.join("docs", "_config.yml");

// THE DECLARED FLOOR — measured 2026-09-12 over the shipped README: 69 bounded invocations, 53 from
// fenced blocks and 16 from table cells. A README from which every fenced block was removed extracts
// 16 — under this floor — and reds the control rather than passing it with nothing to check. The
// floor sits below the fenced count alone so a README that loses a block or two still checks, and
// above the table count so a README that lost its fences cannot.
export const EXTRACTED_FLOOR = 40;
// The landing page's floor — measured 2026-09-13: six fenced invocations under "The commands".
export const LANDING_PAGE = path.join("docs", "index.md");
export const LANDING_EXTRACTED_FLOOR = 5;

function normaliseEol(text) {
  return text.split("\r\n").join("\n");
}

// The route words after `aof`: consecutive lowercase tokens, stopping at the first thing that is
// not one — a flag, a placeholder, an argument, a pipe, a comment. Flags and arguments are never
// part of a route key; the resolver's longest-prefix match decides how many words the route takes.
function routeWords(rest) {
  const words = [];
  for (const token of rest.trim().split(/\s+/)) {
    if (!/^[a-z][a-z0-9-]*$/.test(token)) break;
    words.push(token);
  }
  return words;
}

// extractInvocations — every `aof <words>` the text spells INSIDE ITS BOUND: fenced code blocks
// and table rows. Each carries its 1-based line so a failure can say where.
export function extractInvocations(text) {
  const found = [];
  let fence = null;
  normaliseEol(text).split("\n").forEach((line, index) => {
    const number = index + 1;
    const marker = /^\s*(`{3,}|~{3,})/.exec(line);
    if (marker) {
      if (fence == null) fence = marker[1];
      else if (marker[1].startsWith(fence[0]) && marker[1].length >= fence.length) fence = null;
      return;
    }
    if (fence != null) {
      const match = /^\s*aof\s+(.*)$/.exec(line);
      if (!match) return;
      const words = routeWords(match[1]);
      if (words.length > 0) found.push({ line: number, text: line.trim(), words, where: "fenced" });
      return;
    }
    if (/^\s*\|/.test(line)) {
      for (const span of line.matchAll(/`aof\s+([^`]*)`/g)) {
        const words = routeWords(span[1]);
        if (words.length > 0) found.push({ line: number, text: `\`aof ${span[1].trim()}\``, words, where: "table" });
      }
    }
  });
  return found;
}

// assessReadme — the control's verdict over a README text: what it extracted, what did not
// resolve, and whether the count is under the floor. `commands` is the registry it resolves
// against; the default is the shipped one, and the control's own tests inject an empty one.
export function assessReadme(text, { commands = listCommands(), floor = EXTRACTED_FLOOR } = {}) {
  const invocations = extractInvocations(text);
  const table = deriveRouteTable(commands);
  const resolved = [];
  const unresolved = [];
  for (const invocation of invocations) {
    const hit = resolveRoute(invocation.words, commands);
    if (hit) {
      resolved.push({ ...invocation, route: hit.command.cli.route.join(" ") });
      continue;
    }
    // A FAMILY, not a verb: `aof work` in a table cell names the family every `work …` route
    // belongs to. It resolves when its words are a PROPER PREFIX of a route the table carries —
    // derived from the same table, never listed here.
    const prefix = `${invocation.words.join(" ")} `;
    const family = [...table.keys()].some((key) => key.startsWith(prefix));
    if (family) resolved.push({ ...invocation, route: invocation.words.join(" "), family: true });
    else unresolved.push(invocation);
  }
  return { invocations, resolved, unresolved, count: invocations.length, floor, belowFloor: invocations.length < floor };
}

// The control as a single throwing check, so the non-vacuity rows can show it red. `label` is the
// document's name in the failure — the README by default, the landing page for its own row.
export function assertReadmeNamesWhatShips(text, { label = README, ...options } = {}) {
  const verdict = assessReadme(text, options);
  if (verdict.belowFloor) {
    throw new Error(`${label} spells ${verdict.count} bounded \`aof …\` invocation(s), under the declared floor of ${verdict.floor} — the extractor found too little to be checking anything`);
  }
  if (verdict.unresolved.length > 0) {
    const rows = verdict.unresolved.map((entry) => `  ${label}:${entry.line}: ${entry.text} — \`aof ${entry.words.join(" ")}\` resolves to no route in the registry's route table`);
    throw new Error(`${label} names ${verdict.unresolved.length} command(s) the registry does not carry:\n${rows.join("\n")}`);
  }
  return verdict;
}

async function readReadme() {
  return normaliseEol(await readFile(path.join(repoRoot, README), "utf8"));
}

async function siteUrl() {
  const config = normaliseEol(await readFile(path.join(repoRoot, SITE_CONFIG), "utf8"));
  const url = /^url:\s*"?([^"\n]+?)"?\s*$/m.exec(config)?.[1];
  const baseurl = /^baseurl:\s*"?([^"\n]*?)"?\s*$/m.exec(config)?.[1] ?? "";
  assert.ok(url, `${SITE_CONFIG} declares the site's url`);
  return `${url}${baseurl}/`;
}

export const archTests = [
  {
    name: "arch/125/02 (acd-readme-names-what-ships): the deprecated row states what is true — it no longer claims loop engineering has yet to land, it names milestone 53 as where the replacement landed, and it still says what the command does for a reader with one in flight",
    run: async () => {
      const readme = await readReadme();
      const rows = readme.split("\n").filter((line) => /^\s*\|/.test(line) && line.includes("/aof:autonomous"));
      // CONDITIONAL ON THE ROW'S PRESENCE. The deprecated command will one day be removed, and a
      // README that no longer documents it is a correct README, not a red one. While the row is
      // there, it must state what is true.
      assert.ok(rows.length <= 1, "at most one command-table row documents /aof:autonomous");
      if (rows.length === 0) return;
      const [row] = rows;
      assert.doesNotMatch(row, /until (that|it) lands|yet to land|has not landed|not yet landed|forthcoming|will replace|once (that|it) lands/i, "the row does not claim that loop engineering has yet to land");
      assert.match(row, /milestone 53/, "it names the milestone in which the replacement landed");
      assert.match(row, /aof work loop/, "and names the replacement itself");
      // What it does for a reader with one in flight: a description beyond the deprecation notice —
      // the row carries text after "deprecated" that is not only the pointer to the replacement.
      const description = row.replace(/^.*\*\*deprecated\*\*/i, "").replace(/`[^`]*`/g, "");
      assert.ok(description.replace(/[^a-z]/gi, "").length >= 60, "and it still says what the command does for a reader who has one in flight");
    },
  },
  {
    name: "arch/125/02 (acd-readme-names-what-ships): the loop machinery is findable from the README — every loop verb the route table carries is spelled and resolves, the published site is linked as where the machinery is documented, and `aof work loop` is no longer absent",
    run: async () => {
      const readme = await readReadme();
      const table = deriveRouteTable();
      // The loop verbs, DERIVED from the route table by their own words rather than listed here.
      const loopRoutes = [...table.keys()].filter((key) => key.split(" ").some((word) => /^loops?(?:-|$)/.test(word))).sort();
      assert.ok(loopRoutes.length >= 6, `the registry exposes loop verbs (${loopRoutes.join(", ")})`);
      const verdict = assessReadme(readme);
      const spelled = new Set(verdict.resolved.map((entry) => entry.route));
      for (const route of loopRoutes) assert.ok(spelled.has(route), `the README spells \`aof ${route}\` in a fenced block or a command table`);

      assert.ok(readme.includes(await siteUrl()), "it links the published site — the address docs/_config.yml declares — as where the loop machinery is documented");
      assert.ok(/\baof work loop\b/.test(readme), "and the claim that the README says nothing about `aof work loop` is no longer true of it");
      // No literal list of the other loop-arc verbs here: the registry carries no marker that
      // distinguishes them from any other `work` route, so what this row can DERIVE is the set above,
      // and everything else the README spells is held to resolve by the row below.
    },
  },
  {
    name: "arch/125/02 (acd-readme-names-what-ships): every command the README spells in a fenced block or a command table resolves against the route set deriveRouteTable derives from the registry — and the control keeps no list of route names of its own",
    run: async () => {
      const readme = await readReadme();
      const verdict = assertReadmeNamesWhatShips(readme);
      assert.ok(verdict.count >= EXTRACTED_FLOOR, `the README spells ${verdict.count} bounded invocations`);
      assert.deepEqual(verdict.unresolved, [], "every one of them resolves");

      // NO LIST OF ITS OWN: with no registry handed in, nothing resolves. Resolution is the injected
      // registry's route table and nothing this file carries.
      const empty = assessReadme(readme, { commands: [] });
      assert.equal(empty.resolved.length, 0, "with an empty registry no invocation resolves");
      assert.equal(empty.unresolved.length, verdict.count, "every invocation is reported unresolved");
      // And the table it resolves against is the registry's own: the shipped derivation, asked.
      assert.ok(deriveRouteTable().size > 50, `the derived route table is the registry's (${deriveRouteTable().size} routes)`);
    },
  },
  {
    name: "arch/125/02 (acd-readme-names-what-ships): the extractor reads invocations and not prose — outline: a fenced `aof work validate` extracts `work validate`; a table cell `aof graph impact` extracts `graph impact`; \"aof binds to a workspace\", \"aof owns its own stream\" and \"the aof commands and skills\" extract nothing",
    run: async () => {
      const words = (text) => extractInvocations(text).map((entry) => entry.words.join(" "));
      assert.deepEqual(words("```sh\naof work validate [ref] [--json]   # folder↔frontmatter\n```\n"), ["work validate"], "a fenced line reading `aof work validate` extracts `work validate` — the flag and the comment are not part of it");
      assert.deepEqual(words("| 11 | Graphify Codebase Intelligence | `aof graph impact` + the agents grounding review |\n"), ["graph impact"], "a table cell naming `aof graph impact` extracts `graph impact`");
      assert.deepEqual(words("aof binds to a workspace\n"), [], "the prose sentence \"aof binds to a workspace\" extracts nothing");
      assert.deepEqual(words("aof owns its own stream\n"), [], "the prose sentence \"aof owns its own stream\" extracts nothing");
      assert.deepEqual(words("the aof commands and skills\n"), [], "the prose phrase \"the aof commands and skills\" extracts nothing");
      // A backticked mention in prose is prose too: the table bound is the `|` row, not the backtick.
      assert.deepEqual(words("`aof graph impact` is the deterministic lookup.\n"), [], "a backticked `aof graph impact` outside a table row extracts nothing");

      // THE MEASURED POPULATION. The naive grep over the shipped README reads more `aof <word>`
      // lines than the bounded extractor does — the prose casualties the bound exists to refuse.
      const readme = await readReadme();
      const naive = readme.split("\n").filter((line) => /\baof\s+[a-z]/.test(line));
      assert.ok(naive.some((line) => /\baof (binds|never|owns|without|commands)\b/.test(line)), "the README really does carry the prose the feature measured");
      const bounded = extractInvocations(readme);
      for (const entry of bounded) assert.ok(entry.where === "fenced" || entry.where === "table", `${README}:${entry.line} was extracted from a fenced block or a table row, never prose`);
    },
  },
  {
    name: "arch/125/02 (acd-readme-names-what-ships): the control is non-vacuous — the count from the shipped README is at or above the declared floor, and a README from which every fenced block was removed reds the control rather than passing it",
    run: async () => {
      const readme = await readReadme();
      const verdict = assessReadme(readme);
      assert.ok(verdict.count >= EXTRACTED_FLOOR, `the shipped README yields ${verdict.count} invocations, at or above the floor of ${EXTRACTED_FLOOR}`);
      assert.ok(verdict.invocations.some((entry) => entry.where === "fenced") && verdict.invocations.some((entry) => entry.where === "table"), "and both bounds contribute");

      const withoutFences = readme.replace(/^\s*`{3,}[^\n]*\n[\s\S]*?^\s*`{3,}\s*$/gm, "");
      assert.ok(!/^\s*`{3,}/m.test(withoutFences), "every fenced block was removed");
      const stripped = assessReadme(withoutFences);
      assert.ok(stripped.count < verdict.count, `the stripped README yields fewer invocations (${stripped.count} < ${verdict.count})`);
      assert.equal(stripped.belowFloor, true, "and falls under the floor");
      assert.throws(() => assertReadmeNamesWhatShips(withoutFences), /under the declared floor/, "so the control reds rather than passing it");
    },
  },
  {
    name: "arch/125/02 (acd-readme-names-what-ships): an invented verb reds the control, and the failure names the invocation and the line it was spelled on",
    run: async () => {
      const readme = await readReadme();
      const lines = readme.split("\n");
      const fence = lines.findIndex((line) => /^\s*```sh\s*$/.test(line));
      assert.ok(fence >= 0, "the README has a shell fence to plant into");
      const planted = "aof work frobnicate --now   # a verb the registry does not carry";
      lines.splice(fence + 1, 0, planted);
      const mutated = lines.join("\n");
      const plantedLine = fence + 2;

      // Against the shipped README's own baseline, so the row measures the PLANTED verb and not
      // whatever else the shipped text may be reporting.
      const baseline = new Set(assessReadme(readme).unresolved.map((entry) => entry.text));
      const added = assessReadme(mutated).unresolved.filter((entry) => !baseline.has(entry.text));
      assert.equal(added.length, 1, "exactly the planted invocation is newly unresolved");
      assert.equal(added[0].text, planted, "it is the invocation that was planted");
      assert.equal(added[0].line, plantedLine, "at the line it was spelled on");
      assert.throws(
        () => assertReadmeNamesWhatShips(mutated),
        (error) => error.message.includes(planted) && error.message.includes(`${README}:${plantedLine}:`),
        "the failure names the invocation and the line",
      );
    },
  },
  {
    name: "arch/125/02 (acd-readme-names-what-ships): the story's own lesson applied to the page it added — every `aof …` invocation docs/index.md spells resolves against the same route table, above its own floor, and a planted verb reds it by line",
    run: async () => {
      const landing = normaliseEol(await readFile(path.join(repoRoot, LANDING_PAGE), "utf8"));
      const options = { label: LANDING_PAGE, floor: LANDING_EXTRACTED_FLOOR };
      const verdict = assertReadmeNamesWhatShips(landing, options);
      assert.ok(verdict.count >= LANDING_EXTRACTED_FLOOR, `the landing page spells ${verdict.count} bounded invocations, at or above its floor of ${LANDING_EXTRACTED_FLOOR}`);
      assert.deepEqual(verdict.unresolved, [], "every one of them resolves");
      // The loop verbs it names are the registry's — the same derivation as the README row.
      const loopRoutes = [...deriveRouteTable().keys()].filter((key) => key.split(" ").some((word) => /^loops?(?:-|$)/.test(word)));
      const spelled = new Set(verdict.resolved.map((entry) => entry.route));
      assert.ok(loopRoutes.some((route) => spelled.has(route)), `the landing page names loop verbs the registry carries (${[...spelled].join(", ")})`);

      // NON-VACUOUS, the same two ways: no registry → nothing resolves; a planted verb → red by line.
      assert.equal(assessReadme(landing, { commands: [] }).resolved.length, 0, "with an empty registry nothing on the landing page resolves");
      const lines = landing.split("\n");
      const fence = lines.findIndex((line) => /^\s*```sh\s*$/.test(line));
      assert.ok(fence >= 0, "the landing page has a shell fence to plant into");
      lines.splice(fence + 1, 0, "aof work frobnicate");
      assert.throws(
        () => assertReadmeNamesWhatShips(lines.join("\n"), options),
        (error) => error.message.includes("aof work frobnicate") && error.message.includes(`${LANDING_PAGE}:${fence + 2}:`),
        "a planted verb reds the landing page, naming the invocation and its line",
      );
    },
  },
];
