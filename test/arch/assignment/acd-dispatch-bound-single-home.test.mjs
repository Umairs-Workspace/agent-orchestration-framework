// Fitness function: acd-dispatch-bound-single-home (story 65 / task 02) —
//
//   "the concurrency bound is READ, never invented: ONE configured key, ONE default, ONE
//    resolution site."
//
// WHY IT IS A GATE AND NOT JUST A TEST. A sanctioned count generalised in two places
// reliably ends up living in a third — this repo has been burned by that shape before, and
// the cure it settled on is a per-concept home (`DEFAULT_*` + `resolve*(value)` +
// `*FromConfig(workspace)`) with every consumer importing the resolver. `mesh-sync-cadence
// .mjs` states the reason in full and states it about a NUMBER: "Derived means one resolver,
// not a second copy of the default: a copied `15` would be right today and silently wrong
// the first time an operator slows the tick down." E5 measured what a second copy costs —
// a 10s literal against a 15s tick reported "no answer" for roughly one healthy request in
// three, "measuring the clock, not the world".
//
// The dispatch bound is worse than a cadence if it drifts, because the two readers would be
// the DOOR that opens lanes and the FAN-OUT that limits them: a bound enforced at 3 and
// reported as 6 is an operator making decisions from a number nothing obeys.
//
// SEARCHED BEFORE ADDING (2026-08-15). Every existing concurrency/parallelism limit in this
// repo was looked for before `work.dispatch.concurrency` was introduced. There is none —
// `work-observe.mjs` MEASURES concurrency, `global-work-store.mjs` applies SQLite pragmas,
// and everything else matching /concurren|parallel/ is prose. So this is not a second home
// beside an existing one; it is the first, and this gate is what keeps it the only one.
//
// The scan is source-shape over `src/`, comments stripped, so a comment naming the key (this
// file's own subject matter, and the module header's) is never counted as a reader.
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { stripComments } from "../../support/source-slice.mjs";
import {
  DEFAULT_DISPATCH_CONCURRENCY,
  resolveDispatchConcurrency,
  dispatchConcurrencyFromConfig,
} from "../../../src/work/dispatch.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

// THE ONE HOME. Named, so the gate reports WHICH file may hold the bound rather than only
// that some file holds it twice.
const BOUND_HOME = "src/work/dispatch.mjs";

// The three shapes a second site takes, each keyed on what it would actually look like:
//   · reading the configured key directly (`config.work.dispatch.concurrency`);
//   · declaring a second default constant;
//   · re-implementing the resolver.
const CONFIG_KEY = /\bdispatch\s*(?:\?\.|\.)\s*concurrency\b/;
// 129/07 — the LOOP's own `work.loop.dispatch.concurrency` is a different key with a different
// home (`src/loop-bounds.mjs`, where it is read as `loopConfig(workspace)?.dispatch?.concurrency`
// and spelled as a map entry `"work.loop.dispatch.concurrency"`). Those two forms are erased
// before the pool key's pattern is asked, so the bounds home is not a second site of THIS key,
// while a `work?.dispatch?.concurrency` read anywhere but the home still is.
const LOOP_OWN_KEY_FORMS = /\bloopConfig\([^)]*\)\s*\?\.\s*dispatch\s*\?\.\s*concurrency\b|\bloop\.dispatch\.concurrency\b/g;
const SECOND_DEFAULT = /\bDEFAULT_DISPATCH_CONCURRENCY\s*=/;
const SECOND_RESOLVER = /\bfunction\s+resolveDispatchConcurrency\b|\bfunction\s+dispatchConcurrencyFromConfig\b/;

export function boundSiteOffenders(listing, home = BOUND_HOME) {
  const offenders = [];
  let homeSeen = false;
  for (const file of Array.isArray(listing) ? listing : []) {
    const code = stripComments(String(file?.source ?? "")).replace(/\r\n/g, "\n");
    const poolCode = code.replace(LOOP_OWN_KEY_FORMS, "");
    const hits = [];
    if (CONFIG_KEY.test(poolCode)) hits.push("reads the configured key `work.dispatch.concurrency` directly");
    if (SECOND_DEFAULT.test(code)) hits.push("declares DEFAULT_DISPATCH_CONCURRENCY");
    if (SECOND_RESOLVER.test(code)) hits.push("defines resolveDispatchConcurrency / dispatchConcurrencyFromConfig");
    if (hits.length === 0) continue;
    if (file.path === home) { homeSeen = true; continue; }
    offenders.push(
      `${file.path} ${hits.join(" and ")} — the concurrency bound has ONE home (${home}: one configured key, one default, one resolver). A second site is right today and silently wrong the first time an operator changes the value; import the resolver instead.`,
    );
  }
  if (!homeSeen) {
    offenders.push(`${home} no longer declares the bound at all — re-aim this gate; a single-home rule with no home is the strongest-looking green there is`);
  }
  return offenders;
}

async function readSrcListing() {
  const dir = path.join(repoRoot, "src");
  const listing = [];
  const walk = async (current) => {
    for (const entry of await readdir(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) await walk(full);
      else if (entry.name.endsWith(".mjs")) {
        listing.push({ path: path.relative(repoRoot, full).split(path.sep).join("/"), source: await readFile(full, "utf8") });
      }
    }
  };
  await walk(dir);
  return listing;
}

export const archTests = [
  {
    name: "arch/65 (acd-dispatch-bound-single-home): the concurrency bound has exactly ONE resolution site in src/ — one configured key, one default constant, one resolver",
    run: async () => {
      const listing = await readSrcListing();
      assert.ok(listing.length > 100, `src/ was actually swept (non-vacuous): ${listing.length} modules`);
      const offenders = boundSiteOffenders(listing);
      assert.deepEqual(offenders, [], `dispatch-bound offenders:\n  ${offenders.join("\n  ")}`);
    },
  },

  {
    name: "arch/65 (acd-dispatch-bound-single-home): self-check — each planted second site trips its own clause, a consumer that IMPORTS the resolver does not, and a missing home is itself a failure (non-vacuous)",
    run: async () => {
      const home = { path: BOUND_HOME, source: "export const DEFAULT_DISPATCH_CONCURRENCY = 3;\nexport function dispatchConcurrencyFromConfig(ws) { return resolveDispatchConcurrency(ws?.config?.work?.dispatch?.concurrency); }" };
      // A CONSUMER, done correctly: it imports the resolver and never names the key.
      const consumer = { path: "src/commands/dispatch.mjs", source: 'import { dispatchConcurrencyFromConfig } from "../work/dispatch.mjs";\nconst bound = dispatchConcurrencyFromConfig(ws);' };
      assert.deepEqual(boundSiteOffenders([home, consumer]), [], "a consumer that imports the resolver is not a second site");

      for (const [label, planted] of [
        ["a second reader of the configured key", { path: "src/mesh/launcher.mjs", source: "const bound = config?.work?.dispatch?.concurrency ?? 3;" }],
        ["a second default constant", { path: "src/work/loops.mjs", source: "const DEFAULT_DISPATCH_CONCURRENCY = 6;" }],
        ["a second resolver", { path: "src/board-ui.mjs", source: "function resolveDispatchConcurrency(value) { return value ?? 3; }" }],
      ]) {
        const offenders = boundSiteOffenders([home, consumer, planted]);
        assert.equal(offenders.length, 1, `self-check: ${label} is reported exactly once (got ${JSON.stringify(offenders)})`);
        assert.ok(offenders[0].includes(planted.path), `self-check: …and the offending file is NAMED (${label})`);
      }

      // 129/07 — the bounds home reading ITS OWN `work.loop.dispatch.concurrency` (and spelling it as
      // a map entry) is not a second site of the pool key; the same file reading the pool key is.
      const loopHome = { path: "src/loop-bounds.mjs", source: 'const loopConfig = (w) => w?.config?.work?.loop;\nexport function loopDispatchConcurrencyFromConfig(workspace) { return positiveInteger(loopConfig(workspace)?.dispatch?.concurrency, null); }\nexport const M = { "work.loop.dispatch.concurrency": loopDispatchConcurrencyFromConfig };' };
      assert.deepEqual(boundSiteOffenders([home, consumer, loopHome]), [], "self-check: the loop key's own home is not a second site of the pool key");
      const annexing = { path: "src/loop-bounds.mjs", source: `${loopHome.source}\nconst pool = workspace?.config?.work?.dispatch?.concurrency;` };
      const annexed = boundSiteOffenders([home, consumer, annexing]);
      assert.equal(annexed.length, 1, `self-check: the same file reading the pool key is reported (got ${JSON.stringify(annexed)})`);

      // …and a COMMENT naming the key is history, not an instance of it — otherwise the
      // module that documents the rule would be the first to break it.
      assert.deepEqual(
        boundSiteOffenders([home, { path: "src/prose.mjs", source: "// the bound comes from config.work.dispatch.concurrency, resolved in work-dispatch.mjs\n" }]),
        [],
        "self-check: a comment naming the key is not a reader of it",
      );

      // …and the home going missing is a failure, not a pass.
      const homeless = boundSiteOffenders([consumer]);
      assert.ok(homeless.some((problem) => problem.includes("re-aim this gate")), `self-check: a missing home is reported (got ${JSON.stringify(homeless)})`);
    },
  },

  {
    name: "arch/65 (acd-dispatch-bound-single-home): the resolver's malformed matrix matches every other configured limit in this repo — no silent string→number coercion, no zero, no negative, no float",
    run: () => {
      // Behavioural half. A single home is only worth having if what lives in it behaves
      // like every other configured limit here (`resolveSyncCadenceSeconds`,
      // `resolvePresenceCadenceSeconds`): two limits that disagree about what "3" or "2.5"
      // means is the same class of defect as two staleness predicates disagreeing about an
      // instant.
      assert.equal(typeof DEFAULT_DISPATCH_CONCURRENCY, "number");
      assert.ok(Number.isInteger(DEFAULT_DISPATCH_CONCURRENCY) && DEFAULT_DISPATCH_CONCURRENCY > 0, "the default is a positive integer");
      for (const bad of [undefined, null, "3", "", true, false, 0, -1, -0.5, 2.5, Number.NaN, Number.POSITIVE_INFINITY, {}, [], () => 3]) {
        assert.equal(resolveDispatchConcurrency(bad), DEFAULT_DISPATCH_CONCURRENCY, `malformed value falls back: ${String(bad)}`);
      }
      for (const good of [1, 2, 3, 8, 64]) {
        assert.equal(resolveDispatchConcurrency(good), good, `a valid positive integer is used verbatim: ${good}`);
      }
      // …and the config path is the documented one, read tolerantly at every level.
      assert.equal(dispatchConcurrencyFromConfig({ config: { work: { dispatch: { concurrency: 7 } } } }), 7);
      assert.equal(dispatchConcurrencyFromConfig({ config: { work: { dispatch: { concurrency: "7" } } } }), DEFAULT_DISPATCH_CONCURRENCY, "no silent string→number coercion");
      assert.equal(dispatchConcurrencyFromConfig(undefined), DEFAULT_DISPATCH_CONCURRENCY);
    },
  },
];
