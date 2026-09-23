---
doc: state
---
<!--
  Milestone STATE.md — answers ONE question: where are we, and what happened?
  Owner: product-owner (single writer). Identity is inherited from the folder; the canonical
  status lives on SPEC.md frontmatter and on each STORY.md. This is the running NARRATIVE.
  Compacted at Accept: durable decisions graduate to ADRs / the next SPEC; the blow-by-blow archives.
-->
# 133 · Architecture diagrams — State

## Progress

- [x] Refined 2026-09-23 (solo): ARCHITECTURE (ADR-001–010, FF-13301–13305 declared pending), DESIGN (ARCHITECTURE tab, binding checklist), six stories
- [x] Story contracts authored 2026-09-23 (`--autonomous --solo`): 16 task features across the six stories (12 `@executable`, 3 `@manual`, 1 `@uat`), each STORY `## Tasks` listed, a PLAN.md per story
- [x] Stories built and reviewed. Waves: 01 ∥ 04 → 02 ∥ 03 → 05 → 06
- [x] Verified and accepted 2026-09-23 (`aof:verify 133`): see VERIFICATION.md. Blockers F-133-01/02 (the figure was unreadable and its links were dead) were fixed in story 04 task 03, and the operator signed off in the browser. Lessons are in RETROSPECTIVE.md, the delivered state in OUTCOME.md.

## Notes & decisions in flight

- **Framed 2026-09-22** from the operator's ask: the architect produces a diagram for stories that
  need system design, using `diagram-design@diagram-design` for now, with the generator in config
  and generation decoupled. Diagrams sit with ADRs, are checked in, have SVG/PNG exports, and show
  in the web console. Interactive diagram-driven redesign is the stated future direction, and it is
  deliberately out of scope.
- **Refine answered the four open questions** (ARCHITECTURE): an absent `work.diagrams` is OFF and
  this repo opts in at 06 (ADR-001). PNG comes from a headless browser aof finds, measured on the
  cached headless shell at 0.85 s, with no Playwright (ADR-005). The style gate is pre-empted by
  handing the drawing agent a committed style file, with no marker and no home-directory profile
  (ADR-002 §4). The SVG is canonical for the console, shown only as an image (ADR-007).
- **Measured at refine, correcting the SPEC:** `diagram-design` is NOT enabled in this repo. It is
  installed project-scoped for another repo only, so aof reads the skill by absolute path (ADR-002
  §3). This also works for the architect subagent, which has no `Skill` tool (frozen set).
- **Operator decisions at refine (2026-09-22):** no mock for the ARCHITECTURE tab, so DESIGN's
  binding checklist is the source of truth. The diagram style is a new aof profile built from the
  frontend's design tokens, at `.aof/diagrams/style.md` (ADR-009).
- **Measured at refine:** the board had no architecture surface, so 04 adds the tab. `DetailPanel.tsx`
  is at 993/1000 and `ui/src/board/` at 22/22, so a helper pair goes in and the row rises 22 → 24.
- **Ratified in the contract beat (2026-09-23), not re-opening an ADR:** (1) 03's lane is PURE like
  every doctor lane. `ARCHITECTURE.md` text already rides `docTexts`, and the engine's enrichment
  adds one `diagrams/` listing fact. (2) 03's three link codes take `severityFor(status)`: error
  while open, warn once done. ADR-006's table said "error", and a done item cannot legally clear a
  red. (3) 02 adds `diagram-png-render-failed` (the browser exits non-zero without writing) beside
  ADR-005's two codes. (4) 04's tab set is judged in the real board (task 02), because
  `DetailPanel.tsx` cannot be imported headlessly. The figure logic lives in `diagrams.mjs`.
  (5) Config codes are `diagrams-*` (01/00), kept apart from the command's `diagram-*` codes.
- **Hand-commit rule:** 05 (`.aof/aof.lock.json`) and 06 (`.aof/aof.config.json`,
  `.aof/diagrams/style.md`) write under `.aof/`, which a lane reconcile drops. Commit those by hand.

## Archive — build feedback (graduated at verify, 2026-09-23)

These notes graduated into RETROSPECTIVE.md (the milestone's and stories 01, 03, 04) and
VERIFICATION.md, which cites the measurements below. They are kept verbatim as the build record.


- **133/01 build (2026-09-23, solo) — ADR-003 §1 collided with FF-6604.** ADR-003 put the
  `ADR-NNN` stem grammar in `layout.mjs` as its own regex, but FF-6604 (66/ADR-001 §7) allows no
  `ADR-\d` spelling in `src/` outside `src/declared-id.mjs`. The layout now builds its ADR id and
  heading patterns from `idForm("ADR")` and narrows the id to three digits by length. So FF-13302
  checks the STEM (`ADR-${n}-…`) and the folder segment, not the id shape FF-6604 already owns.
  Refine did not list FF-6604 among the standing controls the milestone must keep green.
- **133/01 — `parseDiagramLinks` skips fenced code.** This milestone's own ADR-003 §3 shows the link
  block inside a ```` ```markdown ```` fence. Without the skip, story 03's doctor lane would report
  that example as a missing diagram. This is additive to task 01's rulings.
- **133/01 — FF-13301 exempts the registry's import of the adapter file.** ADR-002 §1 names the file
  `generator-diagram-design.mjs`, so `generators.mjs`'s import specifier spells the tool. The sweep
  drops an import specifier that resolves to the adapter, and nothing else.
- **133/01 red probes (evidence for VERIFICATION):** FF-13301 went red naming `src/config-inspect.mjs`
  when `"diagram-design"` was appended to it. FF-13302 went red naming `src/commands/diagram/plan.mjs`
  when a `` `${item}/diagrams/x.svg` `` path was appended to it. Both went green again when the
  files were restored.
- **133/02 build — `findBrowser` takes a `list` lookup beside `exists` and `which`.** Task 00 ruling
  (1) named only `exists` and `which`. Neither can find `chromium_headless_shell-<n>` without a
  directory listing. The listing is still a lookup: the "looking is all it does" row asserts that
  only `exists`, `list` and `which` are called. The real cache also holds the OLDER layout
  (`chrome-win/headless_shell.exe`, revisions 1169–1187 here), so both layouts are probed.
- **133/02 — a browser that cannot be spawned at all** (a pinned path to a non-executable; Windows
  throws from `spawn` itself) answers `diagram-png-render-failed`. It does not crash the command,
  and the SVG stays written.
- **133/02 — "done" also waits for the PNG's size to settle** across two polls, so a launcher that
  returned early is not read mid-write. It costs one extra 100 ms poll on the headless shell.
- **133/02 red probe (evidence for VERIFICATION):** FF-13303 went red with "otherArgv is a second
  function returning an argv array" when `export function otherArgv(a) { return [a]; }` was
  appended to `rasterize.mjs`. It went green (3 ok) when the file was restored.
- **133/02 task 03 `@manual`, measured 2026-09-23 (evidence for VERIFICATION):** the scratch project
  was in the session scratchpad with a fresh `AOF_GLOBAL_HOME`. The source was the plugin's
  `assets/example-architecture.html`, saved as `ADR-001-example.html`. The command was
  `node <checkout>/src/cli.mjs diagram export 01 ADR-001 --json`.
  (a) With no `browser` set, the export answered `png.rung: "playwright-cache"`
  (`chromium_headless_shell-1234/chrome-headless-shell-win64/chrome-headless-shell.exe`), exit 0,
  11.0 s wall including CLI start. The PNG was 71,444 bytes, IHDR 2000×960, colour type 2 (RGB).
  No `aof-diagram-profile-*` dir was left in `%TEMP%`.
  (b) With `browser` set to Edge's absolute path, it answered `rung: "config"`, exit 0, 9.0 s wall,
  and wrote the same 2000×960 PNG. The same argv run by hand through Edge's launcher returned in
  630 ms with NO file on disk, so the file poll is what made the export wait for it.
  (c) Only the browser was spawned: the rasterizer's one spawn takes `browserArgv` (FF-13303). No
  Playwright, Python or npx was involved.
  Open for verify: the SVG vs the source HTML side by side, which is a visual judgement.
- **133/03 build — the layout also skips inline code spans.** The lane's sweep of this repo's
  own stream reported `diagram-link-missing` on 133's ARCHITECTURE.md line 62, where the
  measured-facts table quotes `` `![](diagrams/x.svg)` ``. `parseDiagramLinks` now blanks backtick
  spans before it matches. The fix is in 01's `layout.mjs`, with a new case in 01's layout suite.
- **133/03 — the `test/work` row rises 58 → 59, with its reason.** ADR-010 counted "one free slot"
  there, but every ceiling equals its count (allowance 0), so no layer has headroom.
- **133/03 — the lane exports `DIAGRAM_LANE_CODES`, not `*_FINDING_CODES`.** That suffix is the
  advisory class's marker. FF-12402 would then demand `warn`-only, and this lane gates by
  `severityFor`. Review moved the lane's `ADR-NNN`-prefix read into the layout as `stemAdr`
  (FF-13302), recorded as a `fixed` finding at the close.
- **133/04 build — the declared write set was incomplete.** `test/ui` (57/57) and `test/arch/ui`
  (34/34) had no free slot either, so their rows rise 57 → 58 and 34 → 35, with reasons. That meant
  editing `test/arch/testing/acd-source-directory-budget.test.mjs`, which 04's `files:` does not
  name. The fetch state sits in a `DiagramMarkdown` wrapper in `Markdown.tsx`, so `DetailPanel.tsx`
  gains the tab, the Records row and one call (993 → 995 of 1,000).
- **133/04 red probes (evidence for VERIFICATION):** FF-13304 went red with "reaches a markup sink"
  and "reads a doc body outside svgDataUri" when `marked.parse(response.body)` was appended to
  `diagrams.mjs`. FF-13305 went red with "exactly one entry has dir: diagrams" when a
  `{ name: "DIAGRAM_PNGS", dir: "diagrams", ext: ".png" }` entry was added. Both went green (11 ok)
  when the files were restored. FF-5307 was re-pinned (the board-ui route, and the `ui/` digest over
  five board files), measured: the run-key filter over the added lines hits only two comments.
- **133/04 design conformance at build: INCONCLUSIVE.** `work.ui.baseUrl` is unset and no `--url`
  was given, so no render was attempted and no designer was spawned. Task 02 (`@manual`) carries the
  full procedure (a scratch fixture under `aof work ui` from this checkout, 390/768/1280) for verify.
- **133/06 task 00 — the agent half, measured at the source 2026-09-23 (evidence for VERIFICATION):**
  (a) `.aof/diagrams/style.md` was written in the skill style guide's structure (semantic roles,
  inversion rule, typography, stroke/radius/spacing, node treatments). Every value traces to
  `ui/src/index.css` `@theme`: crimson `#ba2646` is the focal accent, teal `#13766d` is the structural
  `link`, paper/ink/muted/rule-solid come from background/foreground/muted-foreground/border, radius is 8
  (`0.5rem`), and the fonts are the console's Inter and mono stacks. Instrument Serif is kept for the
  title and callouts only, because the skill requires three families.
  (b) `work.diagrams = { generator, formats: ["svg","png"], style }` was added. `aof project validate
  --json` reports no `work.diagrams` diagnostic. There is no `.diagram-design` marker in the repo, and
  `~/.diagram-design/profiles/*` are unchanged (newest mtime 2026-09-18).
  (c) `node src/cli.mjs diagram plan 133 ADR-002 --slug generator-seam --json` (08:56:04Z) answered
  `enabled: true, available: true, stem: "ADR-002-generator-seam"`. The brief is ADR-002's `### Diagram`
  prose. The instructions name the absolute SKILL.md (the project-scoped 2.6.27 install), style.md and
  source paths.
  (d) This session, solo, acted as the drawing agent. It followed the instructions literally, wrote
  only the `.html`, and did not onboard. Its assumptions are noted in the source's head comment: the
  brief lists 11 components against the skill's 9-node budget, so the registry is folded into the
  focal adapter box, and `ARCHITECTURE.md` + `diagrams/` are one "item folder" node.
  (e) `node src/cli.mjs diagram export 133 ADR-002 --json` (08:59:01Z): exit 0, 2.3 s wall,
  `png.rung: "playwright-cache"`. The PNG is 89,638 bytes, IHDR 2000×1040 (viewBox 1000×520 × 2).
  The block is pasted under ADR-002's brief; ADR-002's other text is unchanged, and `plan`'s brief
  still ends at the brief.
  (f) `aof work doctor 133 --json` from the repo root (08:59:18Z): 0 `diagram-*` findings, 0 errors.
- **133/06 — OPEN, operator-gated (paste slots for `aof:verify 133`):**
  - Task 00, last scenario ("the board shows it"): run `aof work ui` from this checkout, select 133,
    and capture the ARCHITECTURE tab at 1280 with the cached headless Chromium. Not run: it starts a
    server process, which this session does not do unasked. Result: ___
  - Task 01 (`@uat`): the operator judges the drawing against ADR-002's brief, the console's style,
    and its legibility as a PNG and on GitHub. Operator's words, verbatim, with the instant: ___
  - Story 04 task 02 (`@manual`) shares the same board launch: 390/768/1280 against DESIGN's
    checklist. Result: ___
  - The installed board shows none of this until `node scripts/install-local.mjs` plus an operator
    restart of the desktop app.
- **Inherited reds seen at 01's gate, not caused by 01:** `test/arch/mesh` is 50/49, from the
  uncommitted 132 file `acd-run-records-name-no-machine.test.mjs`. FF-11903 is 56/54, and two of
  the dangling citations are this milestone's own `src/commands/diagram/export.mjs` and
  `src/diagrams/rasterize.mjs`, which story 02 lands.

## Verification

- [x] `@executable` suite green
- [x] Fitness functions green (red probes observed at verify)
- [x] `@manual` and `@uat` signed off — see VERIFICATION.md
