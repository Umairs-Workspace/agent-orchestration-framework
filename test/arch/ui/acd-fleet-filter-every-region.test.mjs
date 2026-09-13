// Fitness function: acd-fleet-filter-every-region (m47 / ADR-004) —
//
//   "EVERY REGION, OR NONE. Every array-typed collection on the fleet's wire payload is either
//    narrowed by the ONE narrowing or DECLARED machine-wide; and the narrowing is applied ONCE,
//    above the region fan-out, before emptiness is judged."
//
// EXPECTED, at refine time (2026-08-10): **2 GREEN, 1 RED**. The completeness ratchet and the
// behavioural narrowing lane both pass on the CURRENT tree — `filterToWorkspace` (`scope.mjs:162`)
// already narrows all three of `GlobalMeshStatus`'s array collections — so they arm BEFORE the
// build rather than reporting on it. The seam assertion is RED until m47's stories land, because
// `Fleet.tsx` does not call the narrowing at all yet.
//
// WHY THIS IS STRUCTURAL AND NOT A SCENARIO. SPEC states the rule — "a filter that narrows one
// region and not another is worse than none" — and states no mechanism. Left as a per-region
// habit it fails the way every such rule fails: not in this milestone, where someone is thinking
// about it, but in the NEXT one, when 49 or 50 adds a region and its author has no reason to know
// the rule exists. `filterToWorkspace` spreads its input (`scope.mjs:164`, `{ ...status }`), so a
// collection added to the payload is SILENTLY EXEMPT, and the failure is invisible: a region
// rendering the whole mesh underneath a chip saying the view is filtered.
//
// THE COMPLETENESS RATCHET IS THE POINT. It reads the collections off the WIRE TYPE
// (`ui/src/fleet/api.ts`'s `GlobalMeshStatus`) rather than off a list kept here, so it cannot go
// stale: adding `boards: FleetBoard[]` to the payload — which m47/ADR-006 sets the terms for —
// fails CI on the day the type changes, before any region is written to render it.
//
// THE NODE RULE IS PINNED HERE ON PURPOSE, because it DIVERGES from the server's `?scope=local`
// and the divergence must not be "fixed". `src/global-node-registry.mjs:170-172` says in terms
// that the roster "is never workspace-filtered (a workspaceId scopes WORK ITEMS, not the node
// roster)", and `acd-mesh-ui-local-filter-preserves-status`'s behavioural half pins exactly that.
// m47/ADR-004 rule 2 rules the opposite for the REPO filter, and states why: under `scope=local`
// the roster is machine-wide because "local" asks about the DAEMON's workspace and a roster is a
// machine fact; under a repo filter the operator asked "which machines are working on this repo",
// and answering with every machine is not a filter. Two tests, two behaviours, one paragraph in
// each saying the other exists.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { emptyStateCopy, filterToWorkspace } from "../../../ui/src/fleet/scope.mjs";
import { stripComments, matchedBraceBody, functionBody } from "../../support/source-slice.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const FLEET_API_TS = path.join(repoRoot, "ui", "src", "fleet", "api.ts");
const SCOPE_MJS = path.join(repoRoot, "ui", "src", "fleet", "scope.mjs");
const FLEET_TSX = path.join(repoRoot, "ui", "src", "fleet", "Fleet.tsx");

// THE DECLARATIONS THIS FILE CUTS, by header text — the anchor `functionBody` resolves. Named
// once, because three assertions cut two of them and a renamed declaration must fail as NOT FOUND
// in all three rather than in whichever one happens to run first.
//
// [F-47-04-ARCH-2, 2026-08-12] All three cuts used to be POSITIONAL: the narrowing's body ran from
// its declaration to the next `\nexport ` (twice), and GlobalScopeView's to the next `\nfunction `.
// Both sentinels are assumptions about DECLARATION ORDER, and both fail in the direction that
// reads green: move the narrowing to the end of its file and the "body" swallows every helper
// after it, so a `nodes:` mentioned by any of them satisfies "the narrowing narrows nodes". The
// language's own brace balance has no opinion about what is declared next.
const NARROWING_HEADER = "export function filterToWorkspace";
const FLEET_HEADER = "export function Fleet()";
const FAN_OUT_HEADER = "function GlobalScopeView(";

// THE DECLARED MACHINE-WIDE EXEMPTIONS (m47/ADR-004 rule 3a). Meant to stay hard to add to: an
// entry here is a region that renders un-narrowed rows under a filter chip, which is SPEC's own
// defect seen from the other side. An entry must name its reason and must be paired with a visible
// "not filtered" marker in the region that renders it.
const MACHINE_WIDE = new Map([
  // [Feasibility-3] The ONE exemption, and it is ADR-004's own Diagnostics ruling rather than a
  // convenience: `diagnostics` is a COMPOUND. Its rows that carry `workspaceId` —
  // `skippedWorkspaces` and `projectionErrors` — are case-1 collections and MUST be narrowed (they
  // are deliberately NOT on this list, which is why this suite is RED for them until 47 builds
  // them). `descriptorErrors` rows carry a descriptor `path`, not a workspace: they describe the
  // PROJECTION's own health, which has no per-repo meaning, and the region says which of its
  // numbers are filtered (ADR-004's Diagnostics paragraph; DESIGN was amended to agree).
  ["diagnostics.descriptorErrors", "rows carry a descriptor `path`, not a workspaceId — projection health, not repo data. The Diagnostics region states which of its numbers are filtered."],
]);

// THE COMMENT STRIPPER AND THE BRACE BALANCER MOVED TO ONE HOME — `test/support/source-slice.mjs`
// (m47/04, closing F-47-03-ARCH-4). They were written here, and the note written with them said
// a second brace-balancer beside this one would be the duplicated home these ADRs refuse. A
// second gate now needs it: `acd-mesh-ui-scope-visible` had the `+ 4000`-character window whose
// second marker sat 158 characters from the cutoff. So rather than import one arch test from
// another, both read the shared module. Nothing about the behaviour changed — the two functions
// moved byte-for-byte, and this suite's seven lanes are the regression proof.

// The body of a named `export type X = { … }`, found by MATCHING BRACES rather than by scanning
// for the first `};`. The fleet's wire types nest inline object types (`{ workspaceId: string;
// … }[]`), so a naive delimiter search closes the type in the wrong place.
function typeBody(code, typeName) {
  const start = code.indexOf(`export type ${typeName}`);
  if (start < 0) return null;
  return matchedBraceBody(code, start);
}

// The VALUE assigned to an object-literal property, as source text: `{ prefix, value }`, where
// `prefix` is the matched `key:` (whitespace included, so a caller can reconstruct the exact
// substring) and `value` runs to the DEPTH-ZERO comma or closing brace.
//
// Depth-tracked for the same reason `fieldsOfType` is: the values here are calls carrying generic
// arguments and indexed access types (`rows<GlobalDiagnostics["skippedWorkspaces"][number]>(…)`), so
// a `[^,]*` cut lands inside the argument on the day one of them grows a comma.
function propertyValue(body, key) {
  const match = new RegExp(`\\b${key}\\s*:`).exec(body);
  if (!match) return null;
  let depth = 0;
  let value = "";
  for (let i = match.index + match[0].length; i < body.length; i += 1) {
    const ch = body[i];
    if (ch === "{" || ch === "(" || ch === "[") depth += 1;
    else if (ch === "}" || ch === ")" || ch === "]") {
      if (depth === 0) break;
      depth -= 1;
    } else if (ch === "," && depth === 0) break;
    value += ch;
  }
  return { prefix: match[0], value };
}

// The declared FIELDS of a named type: `{ name, type }` each, split on the `;` at DEPTH ZERO.
//
// The depth tracking is load-bearing and was measured, not anticipated: a line-anchored
// `([^;]+);` regex truncates `skippedWorkspaces: { workspaceId: string; reason: string; message:
// string }[]` at the FIRST inner `;`, yielding the type `{ workspaceId: string` — which does not
// end in `[]`, so the field silently stops being a collection. That is the nested blind spot
// [Feasibility-3] exists to close, reappearing one level down inside the fix for it.
function fieldsOfType(code, typeName) {
  const body = typeBody(code, typeName);
  if (body == null) return null;
  const declarations = [];
  let depth = 0;
  let buffer = "";
  for (const ch of body) {
    if (ch === "{" || ch === "(" || ch === "[") depth += 1;
    else if (ch === "}" || ch === ")" || ch === "]") depth -= 1;
    if (ch === ";" && depth === 0) {
      declarations.push(buffer);
      buffer = "";
      continue;
    }
    buffer += ch;
  }
  if (buffer.trim()) declarations.push(buffer);
  return declarations
    .map((declaration) => declaration.trim().match(/^([A-Za-z_$][\w$]*)\??\s*:\s*([\s\S]+)$/))
    .filter(Boolean)
    .map(([, name, type]) => ({ name, type: type.trim() }));
}

// Every collection on the fleet's global wire payload that a narrowing has to answer for — read
// off the TYPE rather than listed here, so the ratchet tracks the wire instead of a copy of it.
//
// [Feasibility-3] IT RECURSES ONE LEVEL INTO OBJECT-TYPED FIELDS, and that is not a refinement —
// the first cut enumerated only top-level ARRAY fields, so `diagnostics` (an object) hid
// `skippedWorkspaces[]` and `projectionErrors[]` from the ratchet **in both directions, forever**:
// it could neither require them to be narrowed nor record them as exempt. ADR-004's Diagnostics
// ruling makes those two case-1 collections that MUST narrow, so a blind spot there is a blind
// spot on a live obligation. One level is deliberate and sufficient for this wire (the inner types
// are flat rows); a THIRD level would need a real type resolver, and if the payload ever nests that
// deep the honest move is to say so here rather than to grow a parser inside a fitness function.
//
// Returns dotted names for nested collections (`diagnostics.skippedWorkspaces`) so an exemption
// and a failure message both say exactly which collection they mean.
function wireCollections(source) {
  const code = stripComments(source);
  const top = fieldsOfType(code, "GlobalMeshStatus");
  assert.ok(top != null, "ui/src/fleet/api.ts declares `export type GlobalMeshStatus` — the fleet's global wire payload");

  const collections = [];
  for (const field of top) {
    if (/\[\]$/.test(field.type)) {
      collections.push({ qualified: field.name, leaf: field.name });
      continue;
    }
    // An object-typed field naming another type declared in this same file — recurse one level.
    const named = field.type.match(/^([A-Za-z_$][\w$]*)$/)?.[1];
    if (!named) continue;
    for (const inner of fieldsOfType(code, named) ?? []) {
      if (/\[\]$/.test(inner.type)) collections.push({ qualified: `${field.name}.${inner.name}`, leaf: inner.name });
    }
  }
  return collections;
}

export const archTests = [
  {
    name: "arch/47 ADR-004 (acd-fleet-filter-every-region): every ARRAY collection on the GlobalMeshStatus wire — INCLUDING the ones nested inside `diagnostics` — is narrowed by filterToWorkspace, or is on the DECLARED machine-wide list [EXPECTED RED for diagnostics.skippedWorkspaces / diagnostics.projectionErrors until m47 builds them]",
    run: async () => {
      const apiSource = await readFile(FLEET_API_TS, "utf8");
      const collections = wireCollections(apiSource);
      const qualified = collections.map((c) => c.qualified);
      assert.ok(
        collections.length >= 3,
        `the wire type was actually parsed (non-vacuous): found collections ${JSON.stringify(qualified)} — expected at least workspaces/items/nodes`,
      );
      // [Feasibility-3] the recursion really reaches the nested ones, or the exemption list and the
      // obligation below are both talking about collections the parser cannot see.
      assert.ok(
        qualified.includes("diagnostics.skippedWorkspaces") && qualified.includes("diagnostics.descriptorErrors"),
        `the one-level recursion reached the collections nested in \`diagnostics\` (non-vacuous): ${JSON.stringify(qualified)}. Without it, skippedWorkspaces[] and projectionErrors[] are invisible to this ratchet in BOTH directions, forever — and ADR-004 rules them case-1 collections that MUST be narrowed.`,
      );

      const narrowing = stripComments(await readFile(SCOPE_MJS, "utf8"));
      const body = functionBody(narrowing, NARROWING_HEADER);
      assert.ok(
        body != null,
        `ui/src/fleet/scope.mjs defines \`${NARROWING_HEADER}\` — the ONE narrowing (m47/ADR-002). NOT FOUND is what this says, never a claim about which collections are narrowed: [F-47-04-ARCH-2] this cut used to run from the declaration to the next \`\\nexport \`, which is a claim about the ORDER of declarations in a file that nothing pins.`,
      );

      const unnarrowed = collections
        .filter((c) => !MACHINE_WIDE.has(c.qualified) && !new RegExp(`\\b${c.leaf}\\s*:`).test(body))
        .map((c) => c.qualified);
      assert.deepEqual(
        unnarrowed,
        [],
        `these collections are on the fleet's wire payload and are NEITHER narrowed by filterToWorkspace NOR declared machine-wide: ${unnarrowed.join(", ")}.\n`
          + "m47/ADR-004: filterToWorkspace SPREADS its input (scope.mjs:164), so a new collection is silently exempt and the defect is invisible — a region rendering the whole mesh underneath a chip that says the view is filtered. Narrow it (rule 1 if its rows carry `workspaceId`, rule 2 if they carry a `workspaceIds` membership list), or add it to MACHINE_WIDE above with its reason AND a visible \"not filtered\" marker in the region that renders it.\n"
          + "If its rows carry NO workspace identity at all, the answer is not an exemption — it is that the identity belongs on the row, at the PRODUCER. That is exactly the term m47/ADR-006 sets for any restored `boards` region: a board is registered BY a workspace, so the identity exists; it just is not carried.",
      );

      // Non-vacuity, both halves: the parser really reads THIS file's type, and the detector
      // really fires on a planted collection the narrowing does not mention.
      assert.ok(qualified.includes("nodes"), `the parser found the real \`nodes\` collection (non-vacuous): ${JSON.stringify(qualified)}`);
      const plantedSource =
        'export type GlobalDiagnostics = {\n  projectedAt: string | null;\n  databasePath: string;\n  skippedWorkspaces: { workspaceId: string }[];\n};\n'
        + 'export type GlobalMeshStatus = {\n  scope: "global" | "local";\n  workspaces: GlobalWorkspace[];\n  items: GlobalWorkItem[];\n  nodes: GlobalNode[];\n  boards: FleetBoard[];\n  diagnostics: GlobalDiagnostics;\n};\n';
      const planted = wireCollections(plantedSource).map((c) => c.qualified);
      assert.deepEqual(
        planted,
        ["workspaces", "items", "nodes", "boards", "diagnostics.skippedWorkspaces"],
        "self-check: the parser picks up a planted `boards: FleetBoard[]`, ignores the scalars, and RECURSES into `diagnostics` to find its nested array — [Feasibility-3]'s whole point",
      );
      assert.ok(
        planted.some((name) => name === "boards" && !MACHINE_WIDE.has(name)),
        "self-check: the detector FIRES on the planted `boards` collection — the broken half",
      );
      assert.ok(
        MACHINE_WIDE.has("diagnostics.descriptorErrors") && !MACHINE_WIDE.has("diagnostics.skippedWorkspaces") && !MACHINE_WIDE.has("diagnostics.projectionErrors"),
        "self-check: the exemption list encodes ADR-004's Diagnostics ruling exactly — descriptorErrors is machine-wide (its rows carry a path, not a workspace); skippedWorkspaces and projectionErrors are NOT exempt and must narrow",
      );
    },
  },

  {
    // [Amendment 2026-08-11 — F-47-01-ARCH-F2, the architect's own suggested route] The SECOND
    // hand-maintained list of the same collections. `filterToWorkspace` is ratcheted by the
    // assertion above; `asGlobalStatus` — the shape coercion the seam's consumers depend on — was
    // not, and `tsc` cannot see an omission because the function ends in an `as GlobalMeshStatus`
    // cast. Two lists of one thing, one of them ratcheted, is the shape that produced the finding.
    //
    // WHY IT IS AN ASSERTION IN THIS FILE AND NOT A FIFTH FILE: it reads the same collections off
    // the same wire type as the assertion above and fails for the same cause (a collection the
    // client forgot). A second file would be the duplicated-home shape every m47 ADR refuses.
    //
    // WHY IT IS A SEPARATE ENTRY RATHER THAN MORE LINES INSIDE THE ASSERTION ABOVE, and this is the
    // load-bearing part: that assertion is RED while `sessions` is unnarrowed, and anything placed
    // after its `deepEqual` DOES NOT EXECUTE until it passes. m47 measured that exact defect —
    // neutralising the single failing `deepEqual` revealed self-checks that had not run since
    // refine. A check reachable only through the assertion it sits behind is proved only when the
    // gate passes, i.e. exactly when the proof is least needed.
    //
    // EXPECTED, at the time of writing: **GREEN on arrival.** The instance that motivated the
    // finding — m48's `sessions`, on the wire and absent from this list — was closed at
    // `Fleet.tsx:357` by 47/03's build (its comment cites F-47-01-ARCH-F2 by name) while this was
    // being written. So the red this gate was designed to produce no longer exists in the tree, and
    // its firing is proved against a MUTANT instead (below), which is the stronger proof anyway: it
    // shows the detector catching a passthrough over the real body rather than over a hand-built one.
    name: "arch/47 ADR-004 + F-47-01-ARCH-F2 (acd-fleet-filter-every-region): every ARRAY collection on the GlobalMeshStatus wire is EXPLICITLY ARRAY-COERCED in Fleet.tsx's `asGlobalStatus` — the second hand-maintained list, which the `as GlobalMeshStatus` cast hides from tsc [GREEN on arrival]",
    run: async () => {
      const collections = wireCollections(await readFile(FLEET_API_TS, "utf8"));
      const code = stripComments(await readFile(FLEET_TSX, "utf8"));

      // The slice is GUARDED BEFORE IT IS TAKEN — the discipline that made TECH_DEBT item 24 fail
      // loudly in this milestone instead of silently reading green over a stripped file.
      const start = code.indexOf("function asGlobalStatus");
      assert.ok(start >= 0, "ui/src/fleet/Fleet.tsx defines `asGlobalStatus` — the ONE shape coercion the narrowing seam's consumers read (F-47-01-ARCH-F1's header note)");
      const body = matchedBraceBody(code, start);
      assert.ok(body != null && body.length > 200, `asGlobalStatus's body was sliced by MATCHING BRACES (got ${body == null ? "null" : `${body.length} chars`}) — never a fixed character window, which is the defect species F-47-03-ARCH-4 records for three of this milestone's five bad gates`);

      // The body's OWN array coercer, found by what it DOES (`Array.isArray`) rather than by what it
      // is called — so renaming `rows` cannot silently turn every check below into a name match on a
      // helper that no longer guarantees an array.
      const coercer = body.match(/const\s+([A-Za-z_$][\w$]*)\s*=\s*[^;]*Array\.isArray\(/)?.[1] ?? null;
      assert.ok(coercer != null, "asGlobalStatus declares a local array coercer guarded by `Array.isArray(` — the fact that makes every property below array-GUARANTEED rather than merely present");

      // ARRAY-GUARANTEEING, three accepted forms: the body's own coercer, an inline `Array.isArray`
      // guard, or an `?? []` default. Idiom-tolerant on purpose (F-47-01-ARCH-F5's lesson: a sweep
      // that sees exactly one spelling over-claims), while still refusing a bare passthrough.
      const guaranteed = new RegExp(`\\b${coercer}\\s*[<(]|Array\\.isArray\\(|\\?\\?\\s*\\[\\]`);
      const uncoercedIn = (source) =>
        collections
          .filter((c) => {
            const property = propertyValue(source, c.leaf);
            return property == null || !guaranteed.test(property.value);
          })
          .map((c) => c.qualified);

      // ── NON-VACUITY, RUN BEFORE THE ASSERTION IT PROVES ────────────────────────────────────────
      // A passthrough of the FIRST wire collection is planted into the real body, and the detector
      // must name exactly it. This is the shape the finding was about: `sessions: wire.sessions` type-
      // checks, reads as intentional, and hands the seam whatever the wire held.
      assert.ok(collections.length >= 4 && collections.map((c) => c.qualified).includes("sessions"), `the sweep is talking about the REAL wire (non-vacuous), including the collection that produced this finding: ${JSON.stringify(collections.map((c) => c.qualified))}`);
      const victim = collections[0];
      const planted = propertyValue(body, victim.leaf);
      assert.ok(planted != null, `self-check: \`${victim.leaf}\` is a property of asGlobalStatus's returned object — the mutation below has something to replace`);
      const mutant = body.replace(`${planted.prefix}${planted.value}`, `${planted.prefix} wire.${victim.leaf}`);
      assert.notEqual(mutant, body, "self-check: the passthrough mutation actually applied to the sliced body");
      assert.deepEqual(
        uncoercedIn(mutant),
        [victim.qualified],
        `self-check: the detector FIRES on a passthrough — and on that collection ALONE, so it is reading each property's own value rather than the file's general shape`,
      );
      assert.ok(!guaranteed.test(" wire.workspaces"), "self-check: a bare passthrough is not accepted as array-guaranteeing by the pattern itself");

      // ── THE ASSERTION ─────────────────────────────────────────────────────────────────────────
      const uncoerced = uncoercedIn(body);
      assert.deepEqual(
        uncoerced,
        [],
        `these collections are on the fleet's wire payload and are NOT array-coerced in Fleet.tsx's \`asGlobalStatus\`: ${uncoerced.join(", ")}.\n`
          + "F-47-01-ARCH-F2 / m47/ADR-004: this list is HAND-MAINTAINED and the `as GlobalMeshStatus` cast at the end of the function is what hides an omission from `tsc`. The region consumers downstream of the narrowing seam are not all `?? []`-total, so an un-coerced collection reaches them as whatever the wire held.\n"
          + "Coerce it through the same local helper the others use. This is SHAPE, not rows — its NARROWING is the one home's job (`scope.mjs`, the assertion above), and the two are separate obligations on the same collection.",
      );
    },
  },

  {
    name: "arch/47 ADR-004 (acd-fleet-filter-every-region, behavioural): after narrowing, NO row of ANY collection carries a foreign workspace identity — and a node is kept by MEMBERSHIP, which deliberately diverges from ?scope=local",
    run: () => {
      const status = {
        scope: "global",
        workspaceId: null,
        stalenessSeconds: 900,
        workspaces: [
          { workspaceId: "alpha", name: "alpha", projectRoot: "/a" },
          { workspaceId: "beta", name: "beta", projectRoot: "/b" },
        ],
        items: [
          { workspaceId: "alpha", ref: "47", type: "milestone" },
          { workspaceId: "alpha", ref: "47/01", type: "story", parent: "47" },
          { workspaceId: "beta", ref: "12", type: "milestone" },
        ],
        nodes: [
          { nodeId: "only-alpha", workspaceIds: ["alpha"] },
          { nodeId: "both", workspaceIds: ["alpha", "beta"] },
          { nodeId: "only-beta", workspaceIds: ["beta"] },
          { nodeId: "never-published", workspaceIds: [] },
        ],
        // [2026-08-11 — the `sessions` classification, ruled CASE 1 by the product-owner] m48's
        // session index, put into this fixture on the day the collection was classified, for the
        // identical reason [Feasibility-4] above exists: the structural half checks `sessions` BY
        // NAME, and a narrowing keyed on the WRONG field satisfies it. That is a live hazard here
        // rather than a theoretical one — a session row carries its own `repo` string, which is a
        // DIFFERENT fact from m47's `repo` (the URL key naming a workspace), so the plausible
        // wrong build filters on `repo` and passes the name check. Only a foreign ROW can fail it.
        sessions: [
          { nodeId: "only-alpha", sessionId: "s-alpha", workspaceId: "alpha", repo: "git@example.com:alpha.git", assistant: "claude", lastPingAt: "2026-08-11T09:00:00.000Z", workspaceHasRun: true, workItem: null },
          { nodeId: "only-beta", sessionId: "s-beta", workspaceId: "beta", repo: "git@example.com:beta.git", assistant: "claude", lastPingAt: "2026-08-11T09:00:00.000Z", workspaceHasRun: false, workItem: null },
        ],
        // [Feasibility-4, 2026-08-11 — architect F3] NON-EMPTY NESTED ROWS. This block used to
        // be all-empty, which — together with the sweep below skipping non-arrays — made
        // `diagnostics.skippedWorkspaces` and `.projectionErrors` unreachable IN BOTH
        // DIRECTIONS: the structural half above checks them BY NAME (a passthrough satisfies
        // `\bskippedWorkspaces\s*:`) and the behavioural half could not see them at all. A gate
        // blind in both halves, on the one COMPOUND collection in the milestone and the one
        // whose completeness took a ruling of its own, is not a gate.
        diagnostics: {
          projectedAt: null,
          skippedWorkspaces: [
            { workspaceId: "alpha", reason: "mesh-global-disabled", message: "alpha" },
            { workspaceId: "beta", reason: "mesh-global-disabled", message: "beta" },
          ],
          descriptorErrors: [{ id: "node-x", path: "/nodes/node-x.json", code: "descriptor-unparseable", message: "bad json" }],
          projectionErrors: [
            { workspaceId: "alpha", sourcePath: "/a/SPEC.md", code: null, message: "alpha" },
            { workspaceId: "beta", sourcePath: "/b/SPEC.md", code: null, message: "beta" },
          ],
        },
      };
      const before = JSON.parse(JSON.stringify(status));

      const filtered = filterToWorkspace(status, "alpha");

      // Rule 1 — a collection whose rows carry a workspace identity is narrowed by it. Asserted
      // GENERICALLY (over every array whose rows carry `workspaceId`), never per named region, so
      // a collection added later is covered by the same sentence.
      //
      // [Feasibility-4] IT RECURSES ONE LEVEL, for the identical reason `wireCollections` above
      // does — the fleet's one compound collection nests its rows inside an object, and a sweep
      // that `continue`d on non-arrays could not reach them. One level, so structure and
      // behaviour see exactly the same set.
      const sweep = (subject, path) => {
        for (const [name, value] of Object.entries(subject)) {
          const qualified = path === "" ? name : `${path}.${name}`;
          if (Array.isArray(value)) {
            const foreign = value.filter((row) => typeof row?.workspaceId === "string" && row.workspaceId !== "alpha");
            assert.deepEqual(
              foreign,
              [],
              `after narrowing to "alpha", collection \`${qualified}\` still carries ${foreign.length} row(s) belonging to another workspace — m47/ADR-004 rule 1. SPEC: "a filter that narrows one region and not another is worse than none."`,
            );
            continue;
          }
          if (path === "" && value != null && typeof value === "object") sweep(value, qualified);
        }
      };
      sweep(filtered, "");

      // …and the sweep must be shown to have REACHED the nested rows, or it is a rehearsal: the
      // compound's two case-1 members narrow, and its case-3(a) member does not.
      assert.deepEqual(filtered.diagnostics.skippedWorkspaces.map((row) => row.workspaceId), ["alpha"], "[F3] the NESTED `skippedWorkspaces` really was narrowed — non-vacuous, because this fixture now carries a beta row that a passthrough would leave standing");
      assert.deepEqual(filtered.diagnostics.projectionErrors.map((row) => row.workspaceId), ["alpha"], "[F3] …and so was the nested `projectionErrors`");
      assert.deepEqual(filtered.diagnostics.descriptorErrors, status.diagnostics.descriptorErrors, "[F3] …while `descriptorErrors` rides through machine-wide, per the ONE declared exemption — so a build satisfying the two above cannot over-reach");

      assert.deepEqual(
        filtered.sessions.map((row) => row.sessionId),
        ["s-alpha"],
        "the session index narrows by the `workspaceId` ON THE ROW (m48/ADR-006 rules the entry self-sufficient, so the identity is there) — and NOT by the row's own `repo` field, which names a different fact from the URL key this filter is",
      );
      assert.equal(filtered.workspaces.length, 1, "the workspaces summary narrows to the filtered repo");
      assert.equal(filtered.items.length, 2, "the milestone/story stream narrows to the filtered repo (both levels — milestoneCardModels reads stories off the same array)");

      // Rule 2 — a node is kept by MEMBERSHIP. This is the divergence from the server's
      // `?scope=local`, and it is pinned so a later author cannot "unify" the two by accident.
      const keptNodes = filtered.nodes.map((node) => node.nodeId);
      assert.deepEqual(
        keptNodes,
        ["only-alpha", "both"],
        "a node is IN the filtered repo iff it is a member of it (m47/ADR-004 rule 2). This DIVERGES from ?scope=local, where the roster deliberately stays machine-wide (src/global-node-registry.mjs:170-172, pinned by acd-mesh-ui-local-filter-preserves-status) — because \"local\" asks about the DAEMON's workspace and a roster is a machine fact, while a repo filter asks \"which machines are working on this repo\". Both behaviours are correct and neither should be changed to match the other.",
      );

      // NON-MUTATING, and an absent filter is a total no-op — the two properties every caller of
      // a narrowing assumes and nobody checks until a poll overwrites a rendered payload.
      assert.deepEqual(status, before, "filterToWorkspace never mutates the payload it was handed — the poll loop re-narrows the SAME object shape on every tick");
      assert.equal(filterToWorkspace(status, null), status, "an absent filter is a no-op — the un-narrowed payload is returned as-is, so 'no filter' costs nothing and cannot half-apply");
      assert.equal(filterToWorkspace(null, "alpha"), null, "a null payload (before the first load) narrows to null rather than throwing — a throw here is a blank page");

      // An UNKNOWN filter narrows to EMPTY rather than falling back to everything (m47/ADR-003).
      // Silently ignoring it would render the whole mesh under a filter chip — a lie the operator
      // cannot see — which is the exact failure SPEC names.
      const unknown = filterToWorkspace(status, "no-such-workspace");
      assert.deepEqual(
        [unknown.workspaces.length, unknown.items.length, unknown.nodes.length],
        [0, 0, 0],
        "a filter naming a workspace the payload does not carry narrows to EMPTY — never a silent fallback to the unfiltered view (m47/ADR-003). The honest empty state that names the value is ADR-007's half of this.",
      );
    },
  },

  {
    name: "arch/47 ADR-004 (acd-fleet-filter-every-region): the narrowing is applied ONCE in Fleet.tsx, BEFORE pageState judges emptiness and BEFORE the region fan-out [EXPECTED RED until m47's stories land]",
    run: async () => {
      const source = stripComments(await readFile(FLEET_TSX, "utf8"));

      // THE THREE MARKERS ARE ORDERED INSIDE `Fleet()`'s OWN BODY, cut by brace balance.
      // [F-47-04-ARCH-2] They used to be `source.indexOf(marker, fleetStart)` — an UNBOUNDED search
      // from where Fleet() begins, which cannot tell "inside Fleet()" from "anywhere after it".
      // Measured: with `filterToWorkspace(` deleted from Fleet() and left in a helper below it, the
      // old form stays GREEN on the exact defect this lane exists for.
      const fleetBody = functionBody(source, FLEET_HEADER);
      assert.ok(fleetBody != null, `Fleet.tsx declares \`${FLEET_HEADER}\` and its body is sliceable — NOT FOUND, never a claim about the order of things inside it`);

      const narrowAt = fleetBody.indexOf("filterToWorkspace(");
      assert.ok(
        narrowAt >= 0,
        "`filterToWorkspace(` is not called inside Fleet() at all. m47/ADR-004: <Fleet> narrows the payload ONCE, before rendering, and hands GlobalScopeView an ALREADY-NARROWED status — so no region receives the raw payload, no region applies a filter of its own, and a region added by a LATER milestone is narrowed on the day it is added without its author knowing this rule exists. That last property is the whole point.\nRED at refine time for a measured reason: scope.mjs:162 exports the narrowing, scope.d.mts:44 types it, test/ui/fleet-scope.test.mjs pins it — and Fleet.tsx's import list (:28-40) does not name it.",
      );

      const pageStateAt = fleetBody.indexOf("pageState({");
      assert.ok(pageStateAt >= 0, "Fleet() computes its page state through pageState({...}) (scope.mjs:65)");
      assert.ok(
        narrowAt < pageStateAt,
        "the narrowing must run BEFORE pageState, so isEmptyStatus (scope.mjs:91) judges the FILTERED payload. Otherwise m47/ADR-007's honest empty state is not merely hard, it is unreachable: a filtered-to-zero view would render GlobalScopeView with four empty regions and no explanation — SPEC's \"a filtered view that looks like an idle fleet is a bug\", exactly.",
      );

      const fanOutAt = fleetBody.indexOf("<GlobalScopeView");
      assert.ok(fanOutAt >= 0, "Fleet() renders <GlobalScopeView> — the ONE region fan-out (Fleet.tsx:428-454)");
      assert.ok(
        narrowAt < fanOutAt,
        "the narrowing must run BEFORE the region fan-out — GlobalScopeView and every region it feeds (WorkspacesSummary, MilestonesList, GlobalNodePanel, DiagnosticsRegion) receive an already-narrowed status, never a raw payload plus a predicate to remember to apply.",
      );

      // And it is applied at the SEAM, not inside a region: GlobalScopeView must not narrow again.
      const viewBody = functionBody(source, FAN_OUT_HEADER);
      assert.ok(viewBody != null, `Fleet.tsx defines \`${FAN_OUT_HEADER}\` and its body is sliceable — NOT FOUND, never a silent pass. [F-47-04-ARCH-2] this ran to the next \`\\nfunction \`, so the LAST function in a file was read as running to end of file, and any narrowing call below it was attributed to the fan-out.`);
      assert.ok(
        !/filterToWorkspace\s*\(/.test(viewBody),
        "GlobalScopeView must NOT narrow — narrowing inside the fan-out (or inside each region) is four copies of one rule with no shared home, which is the shape m47/ADR-004 exists to prevent.",
      );
    },
  },

  // ── m47 / ADR-010, added 2026-08-11 — AN EXTENSION OF THIS FILE, NEVER A FIFTH ONE ──────
  // ADR-010 says so in terms: "a second file asserting the same completeness concept is the
  // duplicated-home shape every ADR above refuses". The three assertions it asks for are
  // (i) the client narrowing takes exactly ONE narrowing value, (ii) the behavioural fixture
  // exercises the composed survivor rather than fixturing it away — "the non-vacuity half and
  // the one that matters" — and (iii) the composed body is not the unknown body for the same
  // raw value. (ii) is folded into the local-payload lane below; (i) and (iii) are here.
  {
    name: "arch/47 ADR-010 clause 3 (acd-fleet-filter-every-region): the client narrowing takes EXACTLY ONE narrowing value — neither `status.scope` nor `status.workspaceId` is a filter predicate",
    run: async () => {
      // STRUCTURAL. The narrowing's body may not read either scalar off the payload. (Its
      // second PARAMETER is called `workspaceId`, which is why this looks for the property
      // read `status.workspaceId` and not for the bare word — a gate wrong about the tree
      // rather than about the rule is this milestone's own recurring finding.)
      const source = stripComments(await readFile(SCOPE_MJS, "utf8"));
      const body = functionBody(source, NARROWING_HEADER);
      assert.ok(body != null, `ui/src/fleet/scope.mjs declares \`${NARROWING_HEADER}\` and its body is sliceable — the second of the two cuts [F-47-04-ARCH-2] converted off the \`\\nexport \` sentinel`);
      for (const read of ["status.scope", "status.workspaceId"]) {
        assert.ok(
          !body.includes(read),
          `filterToWorkspace reads \`${read}\` — m47/ADR-010 clause 3: the client NEVER gates a collection by \`scope\` or by the served \`workspaceId\`. (a) it re-implements on the client a narrowing the server deliberately declined (global-node-registry.mjs:170-172); (b) applied unconditionally it drops non-member nodes under a bare ?scope=local with NO repo filter, contradicting a green behavioural pin; (c) applied only when a filter is present it is a PRECEDENCE RULE between the two keys, which ADR-005 rejects by name. The scope's value is an input to the COPY (clause 5) and never to the NARROWING.`,
        );
      }

      // BEHAVIOURAL, and this is the half that cannot be satisfied by renaming: the narrowing
      // is INVARIANT to both scalars. Same rows in, same rows out, whatever the payload says
      // about how it was produced.
      const rows = {
        workspaces: [{ workspaceId: "alpha" }, { workspaceId: "beta" }],
        items: [{ workspaceId: "alpha", ref: "47" }, { workspaceId: "beta", ref: "12" }],
        nodes: [{ nodeId: "a", workspaceIds: ["alpha"] }, { nodeId: "b", workspaceIds: ["beta"] }, { nodeId: "both", workspaceIds: ["alpha", "beta"] }],
      };
      const shapes = [
        { scope: "global", workspaceId: null, ...structuredClone(rows) },
        { scope: "local", workspaceId: "alpha", ...structuredClone(rows) },
        { scope: "local", workspaceId: "beta", ...structuredClone(rows) },
        { scope: "global", workspaceId: "beta", ...structuredClone(rows) },
      ];
      for (const repo of ["alpha", "beta", "zzz"]) {
        const answers = shapes.map((status) => {
          const narrowed = filterToWorkspace(status, repo);
          return JSON.stringify([narrowed.workspaces, narrowed.items, narrowed.nodes]);
        });
        assert.equal(
          new Set(answers).size,
          1,
          `narrowing by "${repo}" gave DIFFERENT rows for payloads that differ only in their \`scope\`/\`workspaceId\` scalars — so one of them is being read as a filter predicate. ADR-010 clause 3; ADR-004 clause 4 (they are scalars describing the RESPONSE, not its rows).`,
        );
      }
      // Non-vacuity: the invariance above is not vacuous — these inputs really do produce
      // different answers for different REPO values, so the assertion can fail.
      assert.notEqual(
        JSON.stringify(filterToWorkspace(shapes[1], "alpha").nodes),
        JSON.stringify(filterToWorkspace(shapes[1], "beta").nodes),
        "self-check: the fixture is sensitive to the ONE narrowing value, so the invariance assertion above is about the scalars and not about a fixture that cannot move",
      );
    },
  },

  {
    name: "arch/47 ADR-010 clauses 1-2 (acd-fleet-filter-every-region, behavioural): over a payload the SERVER already narrowed, the machine-wide roster is the composed survivor — a collection whose two narrowings differ in REACH can survive alone",
    run: () => {
      // (ii) THE NON-VACUITY HALF, and the one ADR-010 says matters. The server NEVER narrows
      // the roster (global-node-registry.mjs:170-172, mesh-ui-serve.mjs:552-554, and the green
      // pin in acd-mesh-ui-local-filter-preserves-status:94), so this fixture carries a
      // MULTI-WORKSPACE node and a FOREIGN-WORKSPACE node beside the local payload's
      // already-narrowed workspaces and items. 47/02's own suite had an `alphaOnly` fixture
      // predicate that deleted precisely these two rows, which is how three Examples rows
      // stayed green while asserting outcomes that were false of a real payload.
      const local = {
        scope: "local",
        workspaceId: "alpha",
        stalenessSeconds: 900,
        workspaces: [{ workspaceId: "alpha", name: "alpha" }],
        items: [{ workspaceId: "alpha", ref: "47", type: "milestone" }],
        nodes: [
          { nodeId: "only-alpha", workspaceIds: ["alpha"] },
          { nodeId: "both", workspaceIds: ["alpha", "beta"] },
          { nodeId: "only-beta", workspaceIds: ["beta"] },
        ],
        diagnostics: { projectedAt: null, skippedWorkspaces: [], descriptorErrors: [], projectionErrors: [] },
      };
      assert.ok(
        local.nodes.some((node) => (node.workspaceIds ?? []).length > 1) && local.nodes.some((node) => !(node.workspaceIds ?? []).includes(local.workspaceId)),
        "self-check: the local fixture carries BOTH a multi-workspace node and a foreign-workspace node — without them this lane cannot reach the composed survivor and the gate is a rehearsal",
      );

      // Clause 1 — `?scope=local&repo=<a DIFFERENT workspace>` is NOT empty. The roster's own
      // membership rule leaves beta's machines standing, and those rows ARE the answer to
      // "which machines are working on beta".
      const other = filterToWorkspace(local, "beta");
      assert.deepEqual([other.workspaces.length, other.items.length], [0, 0], "the collections the SERVER narrowed are emptied by the repo filter");
      assert.deepEqual(other.nodes.map((node) => node.nodeId), ["both", "only-beta"], "…and the roster survives ALONE: intersection is PER COLLECTION, and a collection whose two narrowings differ in reach can be the only survivor (ADR-010 clause 2). ADR-005's \"renders EMPTY, and that is CORRECT\" was false of the payload the producer actually emits.");

      // Clause 1 again — and `?scope=local&repo=<the daemon's own>` is NOT a no-op either: the
      // repo filter is the FIRST and ONLY narrowing that roster ever receives.
      const own = filterToWorkspace(local, "alpha");
      assert.deepEqual(own.workspaces, local.workspaces, "the server-narrowed collections are untouched");
      assert.deepEqual(own.items, local.items, "…items too");
      assert.deepEqual(own.nodes.map((node) => node.nodeId), ["only-alpha", "both"], "…while the machine-wide roster narrows to alpha's members — the \"no-op intersection\" ADR-005 named drops rows, measured");
      assert.ok(own.nodes.length < local.nodes.length, "self-check: rows really were dropped, so the no-op claim is refuted rather than merely doubted");
    },
  },

  {
    name: "arch/47 ADR-010 clauses 5-6 (acd-fleet-filter-every-region): a SCOPE-NARROWED payload never asserts the unknown-value accusation, and the composed body differs from the unknown body FOR THE SAME RAW VALUE",
    run: () => {
      // Clause 5 — "Nothing on this mesh publishes as X" is a claim about the MESH, and a
      // client served ONE WORKSPACE was not served the mesh. The discriminator is the served
      // narrowing (`status.workspaceId`), not the surviving workspaces row alone.
      const ACCUSATION = /Nothing on this mesh publishes as/;
      for (const value of ["beta", "zzz", "9db1fd84f5895e38"]) {
        const unknown = emptyStateCopy({ scope: "global", workspaceId: null, repo: value, resolved: null });
        const outOfScope = emptyStateCopy({ scope: "local", workspaceId: "alpha", repo: value, resolved: null });

        assert.match(unknown.body, ACCUSATION, `the UNNARROWED payload may make the accusation about "${value}" — it saw the whole mesh`);
        assert.doesNotMatch(
          outOfScope.body,
          ACCUSATION,
          `a scope-narrowed payload asserted "Nothing on this mesh publishes as ${value}" — m47/ADR-010 clause 5. It is a claim about the MESH made by a view served ONE WORKSPACE, and it was measured against a workspace that demonstrably publishes on this mesh: SPEC's own defect, arriving through the door ADR-009 opened. The fourth composed state is OUT-OF-SCOPE, not UNKNOWN.`,
        );

        // Clause 6 — and the two must differ FOR THE SAME RAW VALUE. Four "distinct" copies
        // each carrying a different value are satisfied by one rule wearing four coats:
        // change `beta` to `zzz` and two distinct strings become one.
        assert.notEqual(
          outOfScope.body,
          unknown.body,
          `the composed body is byte-identical to the unknown-value body for the raw value "${value}" — m47/ADR-010 clause 6. Pairwise-distinctness read off copies that each happen to carry a different value cannot see this, which is why it is asserted here at a fixed value.`,
        );
        assert.notEqual(outOfScope.heading, unknown.heading, `…and so are their headings, for "${value}"`);
        assert.ok(outOfScope.body.includes(value) && unknown.body.includes(value), `both still carry the raw value "${value}" verbatim`);
      }
      // Non-vacuity, both halves: the detector fires on a copy function that ignored the
      // served narrowing (the pre-ADR-010 behaviour, reproduced inline), and the accusation
      // regex really does match the string it is about.
      const preAdr010 = (repo) => `Nothing on this mesh publishes as ${repo}. It may not have published yet, or the id may belong to another mesh.`;
      assert.match(preAdr010("beta"), ACCUSATION, "self-check: the detector fires on the pre-ADR-010 composed body, which was this string verbatim");
      assert.equal(preAdr010("beta"), emptyStateCopy({ scope: "global", workspaceId: null, repo: "beta", resolved: null }).body, "self-check: …and that string is exactly what the UNKNOWN case still answers, so the two cases were genuinely one before this ruling");
    },
  },
];
