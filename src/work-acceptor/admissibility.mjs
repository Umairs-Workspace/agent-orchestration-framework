// src/work-acceptor/admissibility.mjs — MAY THIS KNOB BE PROPOSED AT ALL?
// Milestone 61 / story 03. ADR-008 §1–§4, ADR-009 §5. FF-6109, FF-6110.
//
// This is the cheapest control in the acceptor and the only one that answers before any
// evidence is gathered. For a knob nothing acts on the null hypothesis is EXACTLY true —
// moving the number cannot change any outcome — so every commit a trial on it could ever
// produce is false. Refusing such a proposal is not a saving on cost: it removes a whole
// class of proposals from the multiple-testing stream, and it needs no trial to reach.
//
// ── THE WORD IS CONSUMER, AND THE WORD IS THE ENTIRE CONTROL ─────────────────────────────
//
// A bound has a READER when some line fetches it. It has a CONSUMER when a resolved value
// reaches a DECISION. Those are two different questions, and the difference is the whole
// point: worded on readers this check finds a live reader for every knob the registry
// declares tunable and refuses NONE of them — which is how the same defect (F-6900,
// F-69-V7, F-69-V8) survived being closed twice. Worded on consumers it refuses all of
// them at HEAD, which is the correct answer and an uncomfortable one. A change that turns
// this check green by relaxing what counts as consumption has broken it, not fixed it.
//
// ── HOW FAR A VALUE IS FOLLOWED, AND WHY IT STOPS THERE (the honest limit) ───────────────
//
// A resolved value is followed exactly as far as the language lets it be followed without a
// call graph: within the SCOPE that resolved it. Composed into an object, passed as an
// argument or returned, the value has been HANDED OFF — whether it then reaches a decision
// is a fact about the callee, and this module does not pretend to know it. What leaves this
// module's sight is refused rather than assumed consumed, which is the same fail-closed
// posture the harness ground below takes, for the same reason.
//
// That under-approximates, deliberately and in ONE direction: it can refuse a knob a human
// could trace through three hand-offs to a comparison, and it can never admit one whose
// value provably reaches nothing. An over-approximating check would admit proposals on
// knobs nothing acts on, which is the exact failure this control exists to remove. The
// refusal names every resolution site and what became of the value there, so the fix is
// legible: read the bound WHERE the decision is taken, and the knob drops out of the
// reported set with nothing here edited.
//
// ── THE MODULE HOLDS NO KNOB KEY, IN ANY FORM ────────────────────────────────────────────
//
// Not in code, not in a string, not in a comment. A machine that can widen its own tunable
// set has no frozen set: if "may this be tuned?" were answered out of a list this file kept,
// every control built on that answer would be decoration. Membership was decided elsewhere
// — the arbiter record's `parameter-tuning:` edge, ADR-008 §4 — and here the declaration is
// only CONSULTED, through the model `loadLoops` already produces. There is no built-in list
// underneath: an empty declaration admits nothing.
//
// ── PURE, AND INJECTED AT THE COMMAND BOUNDARY (ADR-009 §5) ──────────────────────────────
//
// This module imports nothing. It reads no file, no clock and no config: the loops model,
// the source units and the harness document's text are all handed in. That is what keeps
// the acceptor from becoming a fifth resolution site for any bound, and what lets every
// scenario below be planted rather than staged on disk.

// ── THE REFUSALS ─────────────────────────────────────────────────────────────────────────
//
// `not-admissible` is ADR-010 §2's vocabulary word for "the knob has no executed consumer";
// it is spelled the same here so the ruling that renders it needs no translation table.
// The other two are ADR-008's own: §2b names `harness-not-introspectable`, and §4 requires
// a key outside the declared edge to be a CODED refusal rather than a silent drop.
export const NOT_ADMISSIBLE = "not-admissible";
export const HARNESS_NOT_INTROSPECTABLE = "harness-not-introspectable";
export const KEY_OUTSIDE_DECLARED_SET = "key-outside-declared-set";

// A sweep that read nothing and a sweep that found nothing are indistinguishable unless the
// sweep says what it read (59/ADR-004 §1). This is that report for THIS sweep — the set of
// declared knobs — and it is deliberately not the census's `acceptor-ran-on-nothing`: that
// code belongs to a different sweep over a different population, and one code for two
// subjects is a finding nobody can act on.
export const ADMISSIBILITY_RAN_ON_NOTHING = "admissibility-ran-on-nothing";

// EVERY applicable ground is reported, in a frozen order — never only the first (ADR-010
// §2). Collapsing them would hide half the work needed to make the acceptor live: at HEAD a
// knob is inadmissible AND its harness cannot be read, and those are two independent pieces
// of engineering.
export const REFUSAL_ORDER = Object.freeze([
  KEY_OUTSIDE_DECLARED_SET,
  NOT_ADMISSIBLE,
  HARNESS_NOT_INTROSPECTABLE,
]);

// The registry's own edge name. Consulting the declaration asks nothing new of a record:
// this is the vocabulary `loadLoops` already parses, and no record gains a field or a new
// kind of pointer by being read here.
export const TUNING_EDGE = "parameter-tuning";
const CONFIG_SCHEME = "config";

// ── THE HARNESS OF RECORD (ADR-008 §2b) ──────────────────────────────────────────────────
//
// The path that built every item this system has ever delivered is a PROMPT, and a prompt
// names no configuration key: it states its policy in prose — three rounds is the hard cap —
// and nothing can read a number out of a sentence and show that a decision turned on it. For
// that harness the consumer question is not decidable in either direction.
//
// Two honest answers exist and they are not symmetric. Admissible lets a whole class of
// proposals through on a question nobody answered — the exact failure this control removes.
// Refused costs nothing while no knob is live. So the answer is refusal, and the check is
// fail-closed.
//
// WHICH document is the harness is DECLARED here; WHETHER it can be introspected is
// EVALUATED over that document's text, never asserted as a constant. The day the prompt
// names the key the ground stops refusing, with nothing in this file edited to bring it
// about. That is the difference between a switch the world can turn off and one only an
// author can.
export const HARNESS_KINDS = Object.freeze({ prompt: "prompt", code: "code" });
export const HARNESS_OF_RECORD = Object.freeze({
  kind: HARNESS_KINDS.prompt,
  document: "src/bundle/commands/continue.md",
});

// The three conditions the fall-back can rest on. All three are the SAME ground — the
// question could not be decided — and the report says which one it fell back on so a reader
// can tell "the prompt names no key" from "the declaration points at nothing".
export const HARNESS_CONDITIONS = Object.freeze({
  undeclared: "harness-not-declared",
  unreadable: "harness-declared-but-unreadable",
  namesNoKey: "prompt-names-no-config-key",
});

const frozenList = (values) => Object.freeze(values.map((value) => Object.freeze(value)));

// ── READING THE DECLARATION ──────────────────────────────────────────────────────────────

const configOperands = (endpoints) => (Array.isArray(endpoints) ? endpoints : [])
  .filter((endpoint) => endpoint?.scheme === CONFIG_SCHEME && typeof endpoint.operand === "string")
  .map((endpoint) => endpoint.operand);

/**
 * The tunable set, resolved from the registry's own `parameter-tuning:` declaration.
 *
 * EVERY declaring node is collected rather than one record named here, so the set is the
 * REGISTRY's rather than a pointer this file keeps at a name it could edit. An empty or
 * absent declaration yields an empty set — there is no built-in list underneath.
 */
export function tunableSet(model) {
  const declarations = (Array.isArray(model?.nodes) ? model.nodes : [])
    .map((node) => ({
      nodeId: typeof node?.id === "string" ? node.id : null,
      record: typeof node?.path === "string" ? node.path : null,
      keys: Object.freeze(configOperands(node?.edges?.[TUNING_EDGE])),
    }))
    .filter((declaration) => declaration.keys.length > 0);
  const keys = [];
  for (const declaration of declarations) {
    for (const key of declaration.keys) if (!keys.includes(key)) keys.push(key);
  }
  return Object.freeze({
    edge: TUNING_EDGE,
    keys: Object.freeze(keys),
    declarations: frozenList(declarations),
    declaredBy: Object.freeze(declarations.map((declaration) => declaration.nodeId)),
  });
}

/** The loop records that declare `key` a `ceiling:` — the record a refusal must name. */
export function ceilingRecordsFor(model, key) {
  return Object.freeze((Array.isArray(model?.nodes) ? model.nodes : [])
    .filter((node) => (Array.isArray(node?.fields?.ceiling) ? node.fields.ceiling : [])
      .some((entry) => entry?.kind === "pointer"
        && entry.pointer?.scheme === CONFIG_SCHEME
        && entry.pointer.operand === key))
    .map((node) => node.id));
}

// ── READING THE PROGRAM ──────────────────────────────────────────────────────────────────
//
// `src/bundle/**` is shipped ASSETS — the loop records themselves, the prompts and the hook
// bodies installed into a project. An asset naming a bound is not the running program acting
// on it, and a check that counted one would be satisfied by the very declaration it exists
// to test.
export const isShippedAsset = (rel) => String(rel).replaceAll("\\", "/").includes("bundle/");

// COMMENTS AND STRING LITERALS ARE NOT CODE, and the mask preserves OFFSETS so a line number
// and a brace depth still mean what they say. A dotted key inside a quoted string is a
// diagnostic naming the key it could not resolve; counting that as a read would let the real
// consumer be deleted while this check stayed green — the exact failure it exists to catch,
// one level up. Template literals are masked whole, interpolations included: what a message
// interpolates is a message.
function maskNonCode(source) {
  const out = Array.from(source);
  const blank = (from, to) => {
    for (let i = from; i < to && i < out.length; i += 1) if (out[i] !== "\n") out[i] = " ";
  };
  let i = 0;
  while (i < source.length) {
    const two = source.slice(i, i + 2);
    if (two === "//") {
      const end = source.indexOf("\n", i);
      blank(i, end < 0 ? source.length : end);
      i = end < 0 ? source.length : end;
      continue;
    }
    if (two === "/*") {
      const end = source.indexOf("*/", i + 2);
      const stop = end < 0 ? source.length : end + 2;
      blank(i, stop);
      i = stop;
      continue;
    }
    const quote = source[i];
    if (quote === '"' || quote === "'" || quote === "`") {
      let j = i + 1;
      while (j < source.length) {
        if (source[j] === "\\") { j += 2; continue; }
        if (source[j] === quote) { j += 1; break; }
        if (quote !== "`" && source[j] === "\n") break;
        j += 1;
      }
      blank(i, j);
      i = j;
      continue;
    }
    i += 1;
  }
  return out.join("");
}

const lineOf = (code, at) => code.slice(0, at).split("\n").length;
const escapeRe = (value) => value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");

// The `( … )` group opening at or after `from`, by MATCHING PARENS — never a fixed window
// and never an `indexOf` sentinel. Returns the closing index, or null when it never closes.
function closingParen(code, from) {
  const open = code.indexOf("(", from);
  if (open < 0) return null;
  let depth = 0;
  for (let i = open; i < code.length; i += 1) {
    if (code[i] === "(") depth += 1;
    else if (code[i] === ")") {
      depth -= 1;
      if (depth === 0) return i;
    }
  }
  return null;
}

// The innermost `{ … }` block containing `at`, as `{ start, end }`. The whole unit when the
// site is at module scope — which is the truth rather than a fallback: a module-scope
// binding really is visible to everything in the module.
function enclosingBlock(code, at) {
  const stack = [];
  for (let i = 0; i < at; i += 1) {
    if (code[i] === "{") stack.push(i);
    else if (code[i] === "}") stack.pop();
  }
  const open = stack.at(-1);
  if (open == null) return { start: 0, end: code.length };
  let depth = 0;
  for (let i = open; i < code.length; i += 1) {
    if (code[i] === "{") depth += 1;
    else if (code[i] === "}") {
      depth -= 1;
      if (depth === 0) return { start: open + 1, end: i };
    }
  }
  return { start: open + 1, end: code.length };
}

// THE STATEMENT A SITE BELONGS TO — the outward cut, on delimiters the LANGUAGE draws
// (`;` `{` `}` `,` `(` `)`), never a character count. The head is what decides whether the
// value was bound to a name, composed into a property, returned, or used inline.
const STATEMENT_DELIMITERS = ";{},()";
function statementHead(code, at) {
  let start = at;
  while (start > 0 && !STATEMENT_DELIMITERS.includes(code[start - 1])) start -= 1;
  return { start, head: code.slice(start, at), delimiter: start > 0 ? code[start - 1] : null };
}

// A DECISION, and nothing weaker: the value is an operand of a relational or equality
// comparison, or it is itself the test of a branch. A value PASSED to a function is not a
// decision here — the decision, if there is one, belongs to the callee's scope and is
// invisible from this one. That refusal to guess is the fail-closed half of this module.
const COMPARATORS = "(?:<=|>=|===|!==|==|!=|<|>)";
const ENDS_WITH_COMPARATOR = new RegExp(`(?<![=!<>])${COMPARATORS}\\s*$`, "u");
const STARTS_WITH_COMPARATOR = new RegExp(`^\\s*${COMPARATORS}(?![=>])`, "u");
const BRANCH_TEST_HEAD = /\b(?:if|while)\s*\(\s*!?\s*$/u;
const TERNARY_TEST = /^\s*\?(?![?.])/u;

function decidesAt(code, start, end) {
  const { start: headStart, head, delimiter } = statementHead(code, start);
  const tail = code.slice(end);
  if (ENDS_WITH_COMPARATOR.test(head) || STARTS_WITH_COMPARATOR.test(tail)) return true;
  if (TERNARY_TEST.test(tail)) return true;
  if (delimiter === "(" && /^\s*\)/u.test(tail) && BRANCH_TEST_HEAD.test(code.slice(0, headStart))) {
    return true;
  }
  return false;
}

// Where a resolved value went, in four words. `decision` is the only one that is
// consumption; the other three are the three ways a value stops being followable.
export const DISPOSITIONS = Object.freeze({
  decision: "decision",
  composed: "composed-into-an-object",
  handedOff: "handed-off",
  discarded: "resolved-then-discarded",
});

function dispositionOfBinding(code, name, at) {
  const block = enclosingBlock(code, at);
  const body = code.slice(block.start, block.end);
  for (const use of body.matchAll(new RegExp(`\\b${escapeRe(name)}\\b`, "gu"))) {
    const start = block.start + use.index;
    if (start === at) continue;
    if (decidesAt(code, start, start + name.length)) {
      return { disposition: DISPOSITIONS.decision, decidedAt: lineOf(code, start) };
    }
  }
  return { disposition: DISPOSITIONS.discarded, decidedAt: null };
}

// The end of the expression the site opens: a call's own argument list is part of it, so
// a config-shaped resolver is followed to its closing paren rather than to its identifier.
function expressionEnd(code, at, length) {
  const end = at + length;
  if (!/^\s*\(/u.test(code.slice(end))) return end;
  const close = closingParen(code, end);
  return close == null ? end : close + 1;
}

// THE BINDER A SITE BELONGS TO is read from the head UNANCHORED, because a resolved value
// commonly arrives behind a fallback chain — `const n = input.n ?? <site> ?? 3;` binds the
// site to `n` just as surely as a bare assignment does, and a cut that only recognised the
// bare form would stop following the value exactly where a real consumer would appear.
function classifySite(code, at, length) {
  const end = expressionEnd(code, at, length);
  if (decidesAt(code, at, end)) {
    return { disposition: DISPOSITIONS.decision, binder: null, decidedAt: lineOf(code, at) };
  }
  const { head } = statementHead(code, at);
  const bound = [...head.matchAll(/(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=/gu)].at(-1);
  if (bound != null) return { binder: bound[1], ...dispositionOfBinding(code, bound[1], at) };
  const property = /^\s*([A-Za-z_$][\w$]*)\s*:/u.exec(head);
  if (property != null) {
    return { disposition: DISPOSITIONS.composed, binder: property[1], decidedAt: null };
  }
  return { disposition: DISPOSITIONS.handedOff, binder: null, decidedAt: null };
}

// ── WHERE A CONFIGURED VALUE ENTERS A UNIT ───────────────────────────────────────────────
//
// Three spellings, and no fourth. Each is a place the CONFIGURED value crosses into running
// code — which is the acceptor's question exactly: if this key is written, does any decision
// change? A value-shaped resolver applied to something already handed off is NOT one of
// them: what it resolves is a parameter, and how a configured value reached that parameter
// is the question this module refuses to guess at.
//
//   1. the key's own config-shaped resolver, called by name;
//   2. the config path itself, read as a member chain off the workspace;
//   3. the field read back OUT of the policy the declaring home composes — admitted only
//      for a value this unit bound from a call into that home, because a bare field name
//      matches any identifier that happens to share it, and a matcher that broad turns this
//      check into a formality.
const configResolverName = (leaf) => `${leaf}FromConfig`;

// THE DECLARING HOME IS DERIVED FROM THE TREE, never listed here: it is the unit that
// EXPORTS the bound's own config-shaped resolver, under the spelling the registry's
// resolver map already uses. A key with no such export has no declaring home to exclude,
// which is the right answer for a bound that was never given one.
//
// Deliberately NOT widened to a `resolve<Leaf>` spelling as well: measured, that matched an
// unrelated module exporting a same-named resolver for a different bound, and excluded the
// wrong home. A home this check is unsure of is worse than none, because the exclusion is
// what stops a module being counted as its own consumer.
function declaringHomeOf(units, key) {
  const leaf = key.split(".").at(-1);
  const declaration = new RegExp(
    `export\\s+(?:async\\s+)?(?:function|const|let|var)\\s+${escapeRe(configResolverName(leaf))}\\b`,
    "u",
  );
  const home = units.find((unit) => declaration.test(maskNonCode(unit.code)));
  return home?.rel ?? null;
}

// AN IMPORT SPECIFIER IS NOT A RESOLUTION SITE. `import { xFromConfig } from …` names the
// resolver; it does not call it, and counting the name in an import list would report a
// module as resolving a bound it merely has access to.
function importSpans(rawCode) {
  return [...rawCode.matchAll(/^[\t ]*import\b[\s\S]*?from\s*["'][^"']*["']/gmu)]
    .map((match) => ({ start: match.index, end: match.index + match[0].length }));
}

function importedFromHome(rawCode, home) {
  if (home == null) return [];
  const module = String(home).replaceAll("\\", "/").split("/").at(-1);
  const names = new Set();
  const imports = new RegExp(`import\\s*\\{([^}]*)\\}\\s*from\\s*["'][^"']*${escapeRe(module)}["']`, "gu");
  for (const match of rawCode.matchAll(imports)) {
    for (const entry of match[1].split(",")) {
      const name = entry.trim().split(/\s+as\s+/u).at(-1)?.trim();
      if (name) names.add(name);
    }
  }
  return [...names];
}

function entrySites(unit, key, home) {
  const raw = unit.code;
  const code = maskNonCode(raw);
  const segments = key.split(".");
  const leaf = segments.at(-1);
  const sites = [];
  const inspections = [];
  const imports = importSpans(raw);
  const inImport = (at) => imports.some((span) => at >= span.start && at < span.end);
  const push = (at, length, spelling) => {
    if (inImport(at)) return;
    sites.push({ rel: unit.rel, line: lineOf(code, at), spelling, ...classifySite(code, at, length) });
  };

  const resolver = new RegExp(`\\b${escapeRe(configResolverName(leaf))}\\b`, "gu");
  for (const match of code.matchAll(resolver)) push(match.index, match[0].length, "config-resolver");

  // A RAW PATH READ WITH NO DEFAULT IS AN INSPECTION OF THE DECLARATION, NOT A RESOLUTION
  // OF THE BOUND — 61/00 draws the same line at the same sites, and for the same reason:
  // the bound in effect is `declared ?? default`, so a site that supplies no default has
  // obtained the record's contents rather than the value the program runs within. Measured:
  // the doctor asks `Number.isInteger(declared) && declared >= 0` — a comparison, and a
  // decision about whether the CONFIG is ready, not one the bound governs. A step of one
  // notch cannot change its outcome, which is exactly what makes it not a consumer.
  const chain = new RegExp(`\\b${segments.map(escapeRe).join("\\s*\\??\\.\\s*")}\\b`, "gu");
  for (const match of code.matchAll(chain)) {
    if (inImport(match.index)) continue;
    if (/^\s*(?:\?\?|\|\|)/u.test(code.slice(match.index + match[0].length))) {
      push(match.index, match[0].length, "config-path");
      continue;
    }
    inspections.push({ rel: unit.rel, line: lineOf(code, match.index), spelling: "declaration-inspection" });
  }

  const imported = importedFromHome(raw, home);
  if (imported.length > 0) {
    const alternation = imported.map(escapeRe).join("|");
    const composed = new RegExp(
      `(?:const|let|var)\\s+([A-Za-z_$][\\w$]*)\\s*=\\s*(?:await\\s+)?(?:${alternation})\\s*\\(`,
      "gu",
    );
    for (const holder of [...code.matchAll(composed)].map((match) => match[1])) {
      const field = new RegExp(`\\b${escapeRe(holder)}\\s*\\??\\.\\s*${escapeRe(leaf)}\\b`, "gu");
      for (const match of code.matchAll(field)) push(match.index, match[0].length, "policy-field");
    }
    const destructured = new RegExp(
      `(?:const|let|var)\\s*\\{([^}]*)\\}\\s*=\\s*(?:await\\s+)?(?:${alternation})\\s*\\(`,
      "gu",
    );
    for (const match of code.matchAll(destructured)) {
      const named = match[1].split(",").map((entry) => entry.trim().split(":").at(-1)?.trim());
      if (!named.includes(leaf)) continue;
      sites.push({
        rel: unit.rel,
        line: lineOf(code, match.index),
        spelling: "policy-field",
        binder: leaf,
        ...dispositionOfBinding(code, leaf, match.index + match[0].length),
      });
    }
  }
  return {
    sites: sites.sort((a, b) => a.line - b.line || a.spelling.localeCompare(b.spelling)),
    inspections,
  };
}

/**
 * What the program does with one bound: every production site where the configured value
 * enters, what became of it there, and therefore whether anything CONSUMES it.
 *
 * The declaring home is derived from the tree — the unit that exports the key's own
 * config-shaped resolver — never from a list this module keeps, so a bound that moves house
 * moves this exclusion with it. A module is not accepted as its own consumer: the question
 * is whether anything OUTSIDE the declaration acts on the value.
 */
export function consumptionReport(key, units) {
  const all = (Array.isArray(units) ? units : [])
    .map((unit) => ({ rel: String(unit.rel), code: String(unit.code ?? "") }));
  const home = declaringHomeOf(all, key);
  const production = all.filter((unit) => !isShippedAsset(unit.rel) && unit.rel !== home);
  const found = production.map((unit) => entrySites(unit, key, home));
  const sites = found.flatMap((entry) => entry.sites);
  const inspections = found.flatMap((entry) => entry.inspections);
  const consumers = sites.filter((site) => site.disposition === DISPOSITIONS.decision);
  return Object.freeze({
    key,
    declaringHome: home,
    unitsConsidered: production.length,
    sites: frozenList(sites),
    // Reported rather than dropped silently: a reader who knows the key is read somewhere
    // needs to see that this check SAW that read and classified it, not that it missed it.
    inspections: frozenList(inspections),
    resolvedIn: Object.freeze([...new Set(sites.map((site) => site.rel))]),
    consumers: frozenList(consumers),
    consumed: consumers.length > 0,
  });
}

const siteList = (sites) => sites
  .map((site) => `${site.rel}:${site.line} (${site.spelling} → ${site.disposition})`)
  .join(", ");

/**
 * The refusal for a bound whose value reaches no decision, or null when one does.
 *
 * It names the bound, the record that declares that bound a ceiling, and every site that
 * resolves it — because "read the bound where you decide with it" is only actionable if the
 * refusal says where the value is being thrown away.
 */
export function executedConsumerRefusal(key, units, { model = null } = {}) {
  const report = consumptionReport(key, units);
  if (report.consumed) return null;
  const records = ceilingRecordsFor(model, key);
  const declaredBy = records.length > 0
    ? records.join(", ")
    : `(no record declares config:${key} a ceiling)`;
  const resolution = report.sites.length > 0
    ? `still RESOLVES at ${report.sites.length} production site(s) — ${siteList(report.sites)} — and its value reaches no decision at any of them`
    : "RESOLVES as a pointer but is resolved nowhere in production code outside the module that declares it";
  const inspected = report.inspections.length > 0
    ? ` The declaration is also INSPECTED at ${report.inspections.map((site) => `${site.rel}:${site.line}`).join(", ")}, which supplies no default and so resolves no bound — reading the record is not running within it.`
    : "";
  return Object.freeze({
    code: NOT_ADMISSIBLE,
    key,
    records,
    declaringHome: report.declaringHome,
    sites: report.sites,
    inspections: report.inspections,
    consumers: report.consumers,
    fallback: false,
    message: `${declaredBy}: ceiling config:${key} ${resolution}.${inspected} Resolution is not consumption — a pointer that resolves is a declaration, not a caller — so the null on this knob is exactly true and every commit a trial on it could produce is false (F-6900, F-69-V7, F-69-V8; 61/ADR-008 §2).`,
  });
}

/**
 * The fall-back ground, EVALUATED over the declared harness rather than asserted.
 * Null means the question is decidable and this ground has nothing to say about it.
 */
export function harnessRefusal(key, harness) {
  const refuse = (condition, detail) => Object.freeze({
    code: HARNESS_NOT_INTROSPECTABLE,
    key,
    condition,
    harness: harness?.document ?? null,
    kind: harness?.kind ?? null,
    fallback: true,
    discriminating: false,
    message: `${detail} Consumption cannot be decided for ANY knob against this harness, so the answer is refusal rather than a guess: this ground is a switch that applies to every proposal alike, not a finding about this knob (61/ADR-008 §2b). It stops applying the moment the harness names the key and decides by it, with nothing in the acceptor edited.`,
  });
  if (harness == null || typeof harness !== "object") {
    return refuse(
      HARNESS_CONDITIONS.undeclared,
      "No harness of record is declared, so there is no document to read a configuration key out of.",
    );
  }
  if (harness.kind === HARNESS_KINDS.code) return null;
  if (harness.kind !== HARNESS_KINDS.prompt) {
    return refuse(
      HARNESS_CONDITIONS.undeclared,
      `The harness of record declares no kind this check can read (${String(harness.kind)}).`,
    );
  }
  if (typeof harness.text !== "string") {
    return refuse(
      HARNESS_CONDITIONS.unreadable,
      `The harness of record (${String(harness.document)}) is declared but could not be read.`,
    );
  }
  if (new RegExp(`(?<![\\w.$-])${escapeRe(String(key))}(?![\\w.])`, "u").test(harness.text)) return null;
  return refuse(
    HARNESS_CONDITIONS.namesNoKey,
    `The harness of record (${String(harness.document)}) is a prompt that states its policy in prose and names no configuration key, so nothing can show that a decision turned on this one.`,
  );
}

const orderRefusals = (refusals) => Object.freeze(refusals
  .filter(Boolean)
  .sort((a, b) => REFUSAL_ORDER.indexOf(a.code) - REFUSAL_ORDER.indexOf(b.code)));

/**
 * Is this proposal admissible for consideration at all?
 *
 * Nothing is read but the declaration, the program text and the harness document: no
 * observation, no trial price, no ledger. A refusal here costs no evidence, which is the
 * whole point — for a knob nothing acts on there is nothing an observation could tell you.
 */
export function assessProposal(proposal, context = {}) {
  const key = typeof proposal?.key === "string" ? proposal.key : null;
  const declared = tunableSet(context.model);
  const outside = key === null || !declared.keys.includes(key);
  const refusals = outside
    ? [Object.freeze({
      code: KEY_OUTSIDE_DECLARED_SET,
      key,
      declaredSet: declared.keys,
      declaredBy: declared.declaredBy,
      edge: declared.edge,
      fallback: false,
      message: `${JSON.stringify(key)} is not in the tunable set declared by ${declared.declaredBy.length > 0 ? declared.declaredBy.join(", ") : "(no record)"} on its \`${declared.edge}:\` edge${declared.keys.length > 0 ? "" : ", which declares nothing at all"} — membership is the registry's to decide and the acceptor keeps no list of its own, so a key absent from that declaration may not be proposed (61/ADR-008 §4).`,
    })]
    // The other two grounds are asked only of a key this acceptor may propose. A key outside
    // the declared set is not a knob whose consumption is any of this machinery's business,
    // and answering a question nobody asked is how a second home starts.
    : [
      executedConsumerRefusal(key, context.units, { model: context.model }),
      harnessRefusal(key, context.harness),
    ];
  const ordered = orderRefusals(refusals);
  const switched = ordered.some((refusal) => refusal.fallback === true);
  return Object.freeze({
    key,
    admitted: ordered.length === 0,
    considered: !outside,
    refusals: ordered,
    codes: Object.freeze(ordered.map((refusal) => refusal.code)),
    // A switch is not a judgement. While the fall-back applies, the outcome did not turn on
    // this knob's own facts, and the surface may not present it as though it had.
    judgedOnItsOwnMerits: !switched,
    // What a refusal here did NOT do: read an observation, price a trial, or accrue anything
    // towards a commit. Stated on the result rather than left to the reader, because
    // "refused before any evidence" is the claim this control is worth.
    evidenceRead: false,
    trialPriced: false,
    accruesTowardsCommit: false,
  });
}

/**
 * The same question asked of every knob the registry declares tunable, with the counts a
 * report needs to be read as a result rather than as an absence of findings.
 */
export function assessTunableSet(context = {}) {
  const declared = tunableSet(context.model);
  const proposals = declared.keys.map((key) => assessProposal({ key }, context));
  const refused = proposals.filter((proposal) => !proposal.admitted);
  const switched = proposals.filter((proposal) => !proposal.judgedOnItsOwnMerits);
  const everyOne = proposals.length > 0 && switched.length === proposals.length;
  const ranOnNothing = declared.keys.length === 0;
  return Object.freeze({
    edge: declared.edge,
    declaredBy: declared.declaredBy,
    considered: declared.keys.length,
    refusedCount: refused.length,
    admittedCount: proposals.length - refused.length,
    proposals: Object.freeze(proposals),
    refusals: Object.freeze(refused.flatMap((proposal) => proposal.refusals)),
    keysRefused: Object.freeze(refused.map((proposal) => proposal.key)),
    // THE SWITCH SAYS IT IS A SWITCH. A fall-back that refused everything alike and was
    // rendered as a per-knob verdict would be a false claim about how much of this machinery
    // is working — the surface would read as a discriminating control that had weighed each
    // knob, when it had weighed none.
    fallback: Object.freeze({
      applied: switched.length > 0,
      appliedToEveryProposal: everyOne,
      discriminating: false,
      keys: Object.freeze(switched.map((proposal) => proposal.key)),
      statement: everyOne
        ? `The undecidable ground applied to every one of the ${proposals.length} proposal(s) alike and discriminated between none of them: no knob here was judged on its own merits.`
        : null,
    }),
    ranOnNothing,
    notice: ranOnNothing
      ? Object.freeze({
        code: ADMISSIBILITY_RAN_ON_NOTHING,
        edge: declared.edge,
        message: `The tunable set resolved to NO key: the registry's \`${declared.edge}:\` declaration is empty or absent, so this assessment ran on nothing and admitted nothing. That is a report about the sweep, not a finding that every knob is admissible — the acceptor keeps no built-in set to fall back on (61/ADR-008 §4).`,
      })
      : null,
  });
}
