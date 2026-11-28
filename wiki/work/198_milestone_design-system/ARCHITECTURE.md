---
doc: architecture
---
# 198 · The designer draws mocks on the project's design system — Architecture Decisions

The SPEC asks for five things:
1. a design system named in config;
2. a way to extract one;
3. mocks drawn on it at refine;
4. an offline baseline committed from them;
5. a system that stays true to its code when the project owns it.

All of it is for Claude only, delivered as a 192-style practice. The decisions:
- ADR-001: how prose reaches Claude alone;
- ADR-002: who publishes;
- ADR-003: what the CLI owns and what the session owns;
- ADR-004: what extraction reads;
- ADR-005: the config;
- ADR-006: the offline baseline;
- ADR-007: the two modes;
- ADR-008: the break-down.

Prior decisions this milestone meets:
- **m07/ADR-001, the designer is a read-only fidelity judge (no Bash). Honoured.** ADR-002 keeps the
  designer's tools as they are.
- **m07/ADR-003, a committed mock under `mocks/` is the source of truth. Honoured.** ADR-006
  produces exactly that, and the judge still reads only local files.
- **m07/ADR-005, contract edits land in the bundled sources and never in rendered output.
  Honoured.**
- **m192/ADR-002 §6–§7 (a body for every runtime carrying a slot) and its control FF-19206.
  Amended** by ADR-001 for fragments that declare `runtimes`. The rule stands unchanged for every
  fragment that does not.
- **m192/ADR-003, rendering reads only the project's own config. Honoured.** ADR-005 makes
  `work.ui.designSystem.enabled` the key, read from the project's own config.
- **m193/04 R2, the near-miss "a control that says off is today, comparing two renders, needs a
  second leg". Honoured** by FF-19802 (recall `def45e71-425a-4351-8a91-e11cac8a7228`). The control
  proves both that the Claude render holds the prose and that the other runtimes' renders do not, so
  it cannot pass vacuously.

## ADR-001 — A fragment may name its runtimes, and a common text is then filled once per runtime

**Status:** Accepted
**Date:** 2026-11-17

**Context.** The practice's prose must reach Claude alone (SPEC, out of scope: Codex and opencode).
Neither of 192's rules allows that (R5):
- The load refuses a fragment that lacks a body for every runtime whose text carries its slot.
- A common source is composed once, and that one text goes to every runtime rendered from it.

A Claude-only sentence in `refine` would therefore reach opencode, and in `aof-designer` it would
reach Codex as well.

**Decision.**
1. **The field.** A `fragment` member may carry `runtimes`, a non-empty list of runtime names from
   the capability matrix. When it is absent, the fragment is for every runtime, exactly as today.
2. **Load.** For a fragment with `runtimes`, the body rule of 192/ADR-002 §6 applies only to the
   runtimes it names. A runtime it does not name needs no body, and a body for one is refused as a
   contradiction. A name outside the matrix is refused. 192/ADR-002 §7 (a common slot appears in
   every authored variant) is unchanged.
3. **Selection.** `selectFragments` takes the runtime being filled. It drops a fragment whose
   `runtimes` does not include it before the `replaces` rule runs. A runtime-scoped replacer
   therefore replaces only in its own runtimes.
4. **Composition.** A common text is composed once per runtime that renders it, with that runtime's
   selection. The common body each runtime renders is its own. When no runtime-scoped fragment is on
   for a member, every runtime's composition is identical and the output is byte-for-byte today's.
   This module stays pure (FF-19207).
5. **The list and the doctor.** The practice list (192/ADR-007) names a practice's runtimes when its
   fragments are scoped. Turning such a practice on in a project that renders none of its runtimes
   is reported once by `aof work doctor` as having no effect.

**Alternatives considered.**
- *An empty body for every other runtime.* It would satisfy the load rule, but it puts a hollow
  entry in every Codex and opencode text and lies about where the prose lands. Rejected.
- *A Claude authored variant of `refine`, `verify` and `aof-designer`.* That is three hand-kept
  forks of core's largest sources, for three paragraphs. Rejected.
- *Gating on the runtime inside the prose ("if you are Claude…").* The prose would still reach
  every runtime, which is the very thing 192 exists to stop. Rejected.

**Consequences.** Any later practice can be runtime-scoped at no cost. The composer's output is
keyed by runtime for common texts, so `bundle.mjs` passes a runtime where it passed `COMMON`.
FF-19206 is amended in place (story 00): its rule now reads "each runtime the fragment names, whose
texts carry the slot, has a body".

**Invariant.** A runtime-scoped fragment's body never appears in a render for a runtime it does not
name, and it does appear in the render for a runtime it names when its practice is on (FF-19802).
An unscoped fragment still lands on every runtime (FF-19206 amended).

## ADR-002 — The session that runs refine publishes the mocks; the designer's tools do not change

**Status:** Accepted (amended 2026-11-27: with the practice on, the mocks are always drawn)
**Date:** 2026-11-17

**Context.** A subagent can hold the Artifact tool, but only through its `tools:` list (R1). Giving
it to `aof-designer` would make the read-only fidelity judge a publisher, against m07/ADR-001 and
its control. Refine runs solo by default, and in solo mode the main session plays the designer and
already holds the tool (R1).

**Decision.**
1. **Publishing belongs to the session that runs the phase.** That session creates and revises the
   Design canvas, puts it to the operator and pulls it back. In solo mode it is also the designer.
2. **The orchestrated designer briefs.** In orchestrated mode, `aof-designer` writes the brief, as
   `PROMPT.md` does today: the surfaces, states and breakpoints, and the binding checklist. The main
   session draws from that brief. The designer's tools, and FF from m07 that holds them, are
   unchanged.
3. **The operator approves.** Approval is a question to the operator carrying the canvas link: an
   `AskUserQuestion` interactively, the loop's ask when the session is driven (R7). A mock is never
   committed as a baseline without a recorded approval.
4. **The config is the decision** (amended 2026-11-27, the operator, 198 VERIFICATION F-05). With
   `work.ui.designSystem` on, refine draws the milestone's mocks on the system. It offers nothing,
   so it never asks how the mocks are made and never offers the binding checklist alone or the
   operator's own mocks instead, and its one question is the approval. What a page already holds is
   the starting point (ADR-006 §0): existing boards are brought onto the system and extended,
   never redrawn from scratch beside, and hand-made mocks are a reference, never the baseline.
   - *Rejected: offer the canvas* (02's first reading). It made the configured system optional
     at the moment it mattered, so the operator was asked again what the config already said.

**Alternatives considered.**
- *Add `Artifact` to the designer's tools.* It breaks m07/ADR-001's structural guarantee, and the
  judge could rewrite the baseline it judges against. Rejected.
- *A new design-author agent.* That is a cold start to do what the solo session already does, with
  the same context. Rejected.

**Consequences.** The designer stays one role that briefs and judges. The practice's prose for
publishing lives in `refine` and `verify`, not in the designer brief. The designer brief's fragment
says only how a mock relates to the configured system.

## ADR-003 — The CLI owns everything deterministic; only the Artifact calls are prose

**Status:** Accepted
**Date:** 2026-11-17

**Context.** Only a Claude session can reach claude.ai: the Artifact tool has no API that the CLI
could call. Everything else in this milestone is deterministic:
- parsing the code's tokens;
- comparing two token sets;
- writing config;
- assembling a pulled canvas into `mocks/`;
- capturing frames.

Deterministic steps that live only in prose are the steps that drift (m07's whole objective).

**Decision.**
1. **One verb family, `aof design-system`, in the `@aof/design-system` package (ADR-008):**
   - `tokens <css-file>…` prints the Design System token lists (R3's shape) that the files' `@theme`,
     `:root` and theme selectors declare. It also lists every value it could not place.
   - `check --tokens <tokens.json>` compares a system's tokens with the configured `source`. It
     reports what changed, what was added and what is missing, and exits non-zero on drift.
   - `use --name <title> | --artifact <url> --mode owned|reference [--source <file>…]` writes
     `work.ui.designSystem` with `enabled: true`, through the config writer's surgical merge. It
     takes exactly one of `--name` and `--artifact`, and writing one removes the other (ADR-005).
   - `mocks import <pulled-dir> --item <ref>` and `mocks capture --item <ref>` (ADR-006).
2. **The prose only calls the tool and then the verb.** It holds no parsing, comparison or file
   assembly. A verb's `--json` answer is what the prose reads.

**Alternatives considered.** *Do it all in prose, as the type's own procedures do.* That fits a
one-off import, but this repeats on every UI milestone and gates acceptance. Rejected.

**Consequences.** Every verb is testable under `AOF_GLOBAL_HOME` isolation with no network. The
Artifact steps are verified @manual.

## ADR-004 — Extraction builds from the code's tokens and the exported mocks, never live from Claude Design

**Status:** Accepted
**Date:** 2026-11-17

**Context.** The design-tool route needs a connector that does not exist for claude.ai/design, and
standalone Claude Design closes on 2026-12-14 (R4). The code holds the exact token values (R3). The
committed and exported `.dc.html` mocks hold the components and idioms (R4).

**Decision.**
1. **The inputs** are the configured `source` files and a directory of exported `.dc.html`/`.html`
   mocks. By default these are every `mocks/` directory in the work tree, plus a path the operator
   gives for a fresh export.
2. **Tokens come from the code** through `aof design-system tokens`, in the shape the type reads.
   Code beats mocks: a value found only in a mock is listed for the operator to accept or drop,
   never written silently.
3. **Components come from the mocks.** The session inventories the components the mocks repeat (for
   AOF, the bar, nav, scope segment, pills, cards and the terminal pane) and writes each one's
   README and a static preview. A live React bundle is out of scope (the type's "read-only" route).
4. **The system is built and saved by the Design System type's own `from-code.md` procedure**, read
   from the type, with the inventory above as its input. It records `meta.source`, the repo, the
   ref and the paths. A system the project owns is marked `"editing": "code"`.
5. **The operator reviews the inventory and the published system before `use` writes the config.**
   `use` writes `--name` with the title the system was published under (ADR-005 §1). Before the
   write, the session resolves that title as ADR-005 §4 says. A title that already matches another
   system is a stop, so the config never names an ambiguous system from its first write.

**Alternatives considered.** *Wait for a Claude Design connector, or a migration of standalone
projects into artifacts.* Neither exists, and the deadline is fixed. Rejected.

**Consequences.** Pages of the `AOF` project that are not yet exported must be exported by the
operator before 2026-12-14. That is an operator action, recorded in `STATE.md`, and it does not
depend on this milestone being built.

**Amended 2026-11-28 (F-06).** §1 and §2 are widened, not replaced. The inputs also include the
boards of **any number of canvases the operator names**, each read back once into a folder of its
own and passed as one more mocks directory: a project whose designs are scattered across canvases
is consolidated by extract, before the system is built, not by a separate step. A value only a mock
paints is now the operator's to **map onto a code token, accept, or drop**: `tokens --mocks` names
each one's `nearest` code token and its RGBA distance, so standardising near-duplicates is the
verb's comparison (ADR-003), never the session's eye. Accept still writes the code first (Q6); map
writes nothing to the code, and the token's usage note names what it replaces. A consumed canvas is
read, never changed, moved or deleted; which canvas is the project's from now on is the operator's
answer in the same first question, asked in plain words rather than as a fixed menu.

## ADR-005 — `work.ui.designSystem`: one boolean key turns the practice on, beside its data

**Status:** Accepted (amended 2026-11-26: a system is named by `name` or by `artifact`; amended
2026-11-27: the block also holds the project's one canvas)
**Date:** 2026-11-17

**Amendment 2026-11-27 — the block holds the canvas (198 VERIFICATION F-04).** An artifact has one
type, so a Design System cannot also be a Design canvas. A project's design is therefore exactly two
artifacts: the system, and ONE canvas on which every milestone's mocks are drawn (ADR-006 §0). The
operator decided that the block names both, so every session knows which artifact to draw on and
which to keep in step:
- `canvas` is the canvas's claude.ai link. It is never a title: canvases are not unique by name.
  It is optional, because the first refine that draws creates the canvas and records it.
- `use --canvas <link>` names it. Given alone, it changes only the canvas and needs a block that
  already names a system. Naming the system again keeps the canvas, unless `--canvas` gives a new
  one: the canvas is not the system.
- The validator adds `design-system-bad-canvas` (not an artifact link) and
  `design-system-canvas-is-system` (the system's own link given as the canvas, the confusion
  F-04 records).

**Context (amendment).** A Design System is an artifact of the Design System type, and the
operator knows it by the title it shows under Settings → Capabilities → Design systems, not by its
link. A title is neither unique (a system shared in the organization can carry the same title as
one of the operator's own) nor fixed (the operator can rename it). The CLI cannot reach claude.ai,
so only the session can turn a title into a link (ADR-003).

**Decision.**
1. **The block:** `work.ui.designSystem = { enabled, name | artifact, mode, source, canvas }`.
   - `enabled` is the practice's one key (192/ADR-003: only the boolean `true` is on).
   - **Exactly one of `name` and `artifact` names the system.**
     - `name` is the system's title, as the operator sees it. It is the form the operator writes
       and the form `extract` writes.
     - `artifact` is a `claude.ai/artifact/…` or `claude.ai/code/artifact/…` URL, for an operator
       who wants the link pinned. It survives a rename; `name` does not.
   - `mode` is `owned` or `reference`.
   - `source` is a list of paths relative to the project root. It is required when `owned` and
     refused when `reference`.
2. **It is a project key,** read from the project's own config file. It names one shared system
   for everyone working in the repository, so it is never per-person (cf. 199).
3. **The validator** reports, each as its own diagnostic code: both `name` and `artifact` set;
   `enabled: true` with neither; an empty `name`; a bad URL; a bad mode; a missing or stray
   `source`.
4. **The session resolves a `name`, and only the session.** Before any step that touches the
   system (drawing a canvas, the extraction's review, the re-sync at verify), the session lists the
   Design System artifacts the operator can open and takes the one whose title equals `name`
   exactly. **No match, or more than one, is a stop** that names `name` and every candidate's title
   and link; it never guesses. The CLI's verbs never resolve a name: `tokens`, `check` and `mocks`
   work on local files and need no link.
5. **Provenance records the link, never only the name.** A mock's README (ADR-006 §2) records the
   resolved system's link and version beside the canvas's, so a baseline stays traceable after the
   system is renamed.

**Alternatives considered (amendment).**
- *`artifact` only.* Exact and rename-proof, but the operator does not know a system by its link.
  Kept as the second form, not the only one.
- *`name` only.* Leaves no way to pin a system whose title collides with another. Rejected.
- *Resolve `name` once and cache the link in config.* Two fields describing one system drift when
  either changes. Rejected: the session resolves per run, which costs one list call.

**Consequences.** Turning the practice on without naming a system is caught by the validator
before any refine reads it. A renamed or duplicated title is caught at the first session step that
resolves it, with the fix named, never silently drawn on the wrong system.

## ADR-006 — An approved canvas becomes the committed offline baseline, with its runtime and provenance

**Status:** Accepted (amended 2026-11-27: one canvas per project, a page per milestone)
**Date:** 2026-11-17

**Context.** The judge reads local files only (m07/ADR-003). A canvas's artboards need their
runtime and any installed tokens in order to render (R2). Playwright is blocked; the rasterizer is
not (R6).

**Decision.**
0. **One canvas, a page per milestone** (amended 2026-11-27, 198 VERIFICATION F-04, the operator's
   decision; it replaces 02's defaulted Q10, one canvas per milestone). The project draws every
   milestone's mocks on the one canvas `work.ui.designSystem.canvas` names (ADR-005), each on its
   own page: id `m<NN>`, named for the milestone, every board of it carrying `"page": "m<NN>"`.
   A board with no `page` is on the canvas's first page, as the Design type reads it, which is why
   a canvas with no pages is sorted before its first milestone page is added (below). Refine never
   moves, changes or removes a board on another milestone's page. The type allows 40 pages; a full
   canvas is a stop, and the operator names a new one.
   **The pages are decided by a verb, never by eye** (amended again 2026-11-27, F-05):
   `aof design-system canvas pages <canvas.json> --out <file> [--item <NN>]`. A canvas with no
   pages is sorted ONCE, when it is named or at the first refine that draws on it: a board whose
   title starts with a milestone number ("37 · …") goes to `m<NN>`, any other to `earlier`, first,
   and only each board's `page` changes. A canvas that has pages is never re-sorted; `--item` only
   adds the milestone's page when it is missing.
   - *Rejected: a canvas per milestone.* It is what the operator does not want: a growing list of
     design files beside the one system.
   - *Cost:* two milestones refined at once publish to one artifact, and the second publish is
     refused until it builds on the first's version. That is a re-read and a retry, never lost work.
1. **Pull.** After approval, the session reads the canvas's files back into the scratchpad:
   - `project/canvas.json`;
   - every approved `.dc.html` on the milestone's page;
   - `project/ds/*/tokens.json`;
   - the type's `artifact-type/dc-runtime.js`.
2. **`mocks import`** copies them into the item's `mocks/`:
   - the runtime is saved as `support.js`;
   - the tokens keep their relative path;
   - a `README.md` records the canvas URL, its version id, the date, the approving answer's
     reference, and the design system's resolved link and version (ADR-005 §5).

   It refuses a path holding `..`, `\` or a leading `/`, and any file type outside the list above.
   With `--page <id>` it takes that page's boards alone, refuses a board from another page, and
   writes a `canvas.json` cut to the page, so capture frames exactly what was imported; the README
   records the page.
3. **`mocks capture`** screenshots each artboard into `<stem>.png` through the rasterizer, at its
   `boards` `w×h`, and adds the frame table to the README.
4. **`DESIGN.md` names the frames** as the conformance source of truth. A re-approved canvas is
   re-imported whole.

**Consequences.** A mock is reproducible offline and traceable to the exact canvas version that
was approved. The judge, and QA's regression, are untouched.

**Amended 2026-11-28 (F-07).** §2 is widened: a baseline is the page's boards **and every
component they mount** with `<dc-import name="X">` (the sibling `X.dc.html`, followed transitively,
on whatever page it sits). `mocks import` copies each one beside the boards, lists it in the
README, never frames it, and refuses a board whose component the pulled canvas lacks, so a blank
baseline cannot be committed. `mocks capture` serves the mocks folder, and nothing above it, on a
loopback port for each render and lets the page settle before the shot: a browser refuses a
`file://` page's fetch of its sibling, and allowing file access would let any board read any local
file. FF-19805 now also holds that every mounted component is in the import.

### Diagram

Why: the flow crosses five actors and one approval gate, and the boundary that matters is
claude.ai versus the local tree. That boundary is where the judge's read-only, offline guarantee
comes from.
View: a left-to-right flow.
Components: the operator, the refine session, the Design canvas (claude.ai), `aof design-system
mocks import`/`capture`, the item's `mocks/` dir, and the fidelity judge.
Flows:
1. The session publishes the canvas.
2. The operator reviews it and approves (the gate).
3. The session pulls the files back.
4. Import and capture write into `mocks/`.
5. The judge reads `mocks/` and the build's screenshot.

Only steps 1–3 cross to claude.ai.

## ADR-007 — `owned` syncs from code to the system only; `reference` is read and never written

**Status:** Accepted
**Date:** 2026-11-17

**Decision.**
1. **`owned`.** The code is the source of truth.
   - A milestone that changes tokens or components records them in `DESIGN.md` under
     `## Design-system changes`.
   - At accept, `aof:verify` resolves the configured system (ADR-005 §4) and re-syncs it with the
     type's merge procedure, then runs
     `aof design-system check` against the re-synced `tokens.json`. Drift after the re-sync is a
     finding; drift before it is the expected input.
   - Nothing writes from the system back to the code.
2. **`reference`.** The system belongs to someone else. The session reads it, installs it into
   canvases and never publishes to it. A milestone that needs what the system lacks records a
   finding naming the gap for the system's owner, and draws the gap with the system's existing
   tokens.

**Alternatives considered.** *Two-way sync.* An edit on the system's page would then silently
change the shipped product. Rejected.

**Consequences.** The system never runs ahead of the code it describes. A team's own system is safe
from a project's agents.

## ADR-008 — Four stories, in three waves

**Status:** Accepted
**Date:** 2026-11-17

**Context.** The graph (R5) puts the composer change entirely inside `packages/core/src/work/`
(`bundle-compose.mjs` and `bundle.mjs`) and its three practice arch-tests. Nothing else in this
milestone touches those files. The new package has no dependents yet. Stories 02 and 03 both append
fragments to the package's `assets/bundle.json` and both add prose to `verify`.

**Decision.**
- **Wave 1:**
  - `00` Claude-only fragments, in core.
  - `01` The package, the key, the token verbs and extraction.
- **Wave 2:** `02` Mocks drawn on the system and committed as the baseline. It needs 00 for the
  scoping and 01 for the package.
- **Wave 3:** `03` An owned system stays true to its code. It co-writes `bundle.json` and the
  `verify` fragment with 02, so it follows it.

Extraction sits in 01 because it is the urgent part (ADR-004) and needs no fragment: it is a whole
command member scoped to Claude. The slot markers that 02 and 03 fill (designer, `verify`) are added
by the story that first fills each.

**Consequences.** Extraction can ship in the first wave, ahead of the deadline. 02 and 03 are
serialised on purpose.

## Fitness functions

| id | invariant | enforced by (arch-test) | from |
|---|---|---|---|
| FF-19801 | **A scoped fragment names real runtimes and has a body for exactly those that carry its slot.** For each shipped fragment that declares `runtimes`: each name is in the capability matrix, each named runtime whose texts carry the slot has a body, and no unnamed runtime has one. | `test/arch/practices/acd-fragment-lands-on-every-runtime.test.mjs` (FF-19206's file, amended) — pending | ADR-001 §1–§2 |
| FF-19802 | **Claude-only prose lands on Claude and nowhere else (two legs).** Over the shipped bundle with `work.ui.designSystem.enabled` on: the Claude renders of `refine`, `verify` and `aof-designer` hold each of the practice's fragment bodies, and the Codex and opencode renders of the same members hold none. With it off, all three runtimes' renders equal today's. | `test/arch/practices/acd-runtime-scoped-prose.test.mjs` — pending | ADR-001 §3–§4 |
| FF-19803 | **The designer stays read-only.** No shipped fragment or practice grants `aof-designer` a tool; its rendered `tools:` for each runtime is the same set with the practice on and off. | `test/arch/ui/acd-design-role-split.test.mjs` (m07's, extended) — pending | ADR-002 §2 |
| FF-19804 | **The Artifact calls are the prose's; the verbs reach no network.** `packages/design-system/src/**` imports no HTTP client and no `fetch` call site, and the practice's fragment files hold no token parsing (no `@theme` or `--` property grammar). | `test/arch/practices/acd-design-system-verbs-offline.test.mjs` — pending | ADR-003 §2 |
| FF-19805 | **An imported mock is self-contained.** Every `.dc.html` under a `mocks/` dir that names a canvas URL in its README references only `./support.js`, its sibling files and `ds/*/tokens.json`. It holds no `http(s)://` source other than a Google Fonts `css2` link. | `test/arch/ui/acd-imported-mock-self-contained.test.mjs` — pending | ADR-006 §2 |
