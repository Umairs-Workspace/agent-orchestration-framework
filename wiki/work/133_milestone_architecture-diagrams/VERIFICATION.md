---
doc: verification
---
# 133 · Architecture diagrams — Verification

## Verification evidence

All suites ran through `node scripts/test.mjs --only <files>` with a fresh `AOF_GLOBAL_HOME`, from
this checkout, on 2026-09-23.

### 01–05 — the `@executable` lane, per story

- **`test/diagrams/{diagram-layout,diagram-generator,diagram-plan-command,diagram-rasterize,diagram-export-command}`,
  `test/work/doctor-diagrams-lane`, `test/ui/{board-diagrams,board-api}`, `test/bundle/{bundle-architect-draws,artifact-sync-manifest}`,
  `test/command/config-inspect`** — 138 ok, 0 not ok, exit 0, before F-133-01/02. By story: 01/00–03 (6, 8, 7, 8),
  02/00–02 (6, 5, 8), 03/00–01 (6, 6, including the sweep of this repo's own stream, which took about 10 minutes),
  04/00–01 (the manifest, doc route and figure cases), 05/00 (7).
  `verifies → stories/0{1,2,3,4,5}/tasks/*.feature` (every `@executable` task)
- **After the F-133-01/02 fix:** the renderer, layout, board-api and diagram suites, plus every control that reads
  `board-ui.mjs`, `setup-ui.mjs` or the command registry, were run again: 33 + 118 + 158 ok, 0 not ok. The five new
  cases are green. `verifies → stories/04_story_the-console-shows-it/tasks/03_the-figure-expands-and-the-block-links-open.feature`
- **`aof work validate 133`** — `PASS — 133 is well-formed.` **`aof work doctor 133 --json`** — 9 findings, all
  `warn`. None is `diagram-*` and none is `control-unresolved`.

### 02 task 03 — a real render on this machine (`@manual`)

- **Procedure and result, measured by the 02 build (STATE, 2026-09-23) and read here at the source.** The PNG
  exported through the real ladder is `diagrams/ADR-002-generator-seam.png`: `PNG image data, 2000 x 1040,
  8-bit/color RGB`. The earlier scratch run gave `rung: "playwright-cache"` at exit 0, and `rung: "config"` with Edge.
  The command waited for the file, where a hand-run of Edge's launcher returned in 630 ms with no file.
- **Side by side, done here.** The source `ADR-002-generator-seam.html` was rendered with the cached
  `chromium-1234/chrome-win64/chrome.exe --headless=new` at 1100×700, and compared with the exported PNG. Both show the
  same nodes, flows, focal adapter and legend. The HTML page's header (the eyebrow and the serif title) is outside
  the exported `<svg>`, which is the export's first-`<svg>` rule working as ADR-005 states.
  `verifies → stories/02_story_export-writes-the-svg-and-the-png/tasks/03_a-real-render-on-this-machine.feature`

### 04 task 02 — the tab in the real board (`@manual`, design conformance)

- **Procedure.** A scratch fixture project had a milestone with ADR-001 (no diagram), ADR-002 (a committed SVG) and
  ADR-003 (a linked SVG that is not in the tree), plus one story. `npm run ui:build`, then `node src/cli.mjs work ui
  --target <fixture> --port <ephemeral>` with a scratch `AOF_GLOBAL_HOME`. The renderer was the cached
  `chromium-1234` (the highest revision the `ms-playwright` glob found), driven headless over CDP to select the item,
  click the tab, measure the DOM and screenshot. The server and the browser were stopped after the capture.
  Screenshots are in `stories/04_story_the-console-shows-it/evidence/`.
- **Result, one verdict per checklist line:**
  - Tab strip `SPEC, ARCHITECTURE, VERIFICATION, RETROSPECTIVE, RUNS, Findings (0)` at 390, 768 and 1280 — conforms.
  - ADR-002's figure sits between its prose and its `Source · PNG` line, in a `rounded-md border border-border bg-card`
    frame (`p-2` at 390, `p-3` above 640), with the caption `mt-1.5 text-xs text-muted-foreground` — conforms.
  - ADR-003 shows the dashed frame with `Diagram not found — ADR-003-missing.svg is not in this item` in muted text,
    and no image — conforms.
  - ADR-001 has no figure and no empty notice — conforms.
  - `document.scrollWidth == clientWidth` at every width (390/390, 768/768, 1280/1280), and no figure is cropped —
    conforms.
  - A story shows `STORY, TASKS, RUNS` — conforms. The SPEC tab's Records list `Architecture` right after
    `Spec / objective` — conforms.
- **Verdict: CONFORMS to the checklist as written. The checklist itself was then overturned by the operator**
  (F-133-01): the panel is about 350 px wide at every viewport, so a conforming figure is too small to read.
  After the fix, the viewer was captured at 1280 (image 1248×825, labels legible) and 390, with its controls
  `Actual size`, `Open in new tab → /api/diagram/file?ref=133&file=ADR-002-generator-seam.svg` and `×`
  (`evidence/viewer-*.png`).
- **No designer or QA agent was spawned.** The operator's standing rule is no agent fan-out without asking. The
  judgement was made inline against DESIGN's binding checklist, from the measured DOM plus the screenshots, and the
  operator then judged the result in person (06 below). No Playwright harness exists here (`npx playwright` is
  policy-blocked), so there is no `toHaveScreenshot` baseline.
  `verifies → stories/04_story_the-console-shows-it/tasks/02_the-tab-conforms-to-the-design-checklist-in-the-real-board.feature`

### 06 task 00 — the repo opts in and ADR-002 is drawn through the seam (`@manual`)

- **The agent half, measured by the 06 build (STATE (a)–(f), 08:56–08:59Z), and re-read here.**
  `.aof/diagrams/style.md` maps `ui/src/index.css`'s tokens. `work.diagrams = { generator, formats: ["svg","png"],
  style }` is set, and `aof project validate` has no `work.diagrams` diagnostic. `diagram plan 133 ADR-002 --slug
  generator-seam` answered `enabled: true, available: true, stem: "ADR-002-generator-seam"`. The drawing agent wrote
  only the `.html`. `diagram export 133 ADR-002` exited 0 with a 2000×1040 PNG. The block is pasted under ADR-002's
  brief. Doctor has no `diagram-*` finding (re-confirmed above).
- **"The board shows it", done here.** `node src/cli.mjs work ui --target <this repo>` ran on an ephemeral port with
  a scratch global home, 133 was selected, and ARCHITECTURE was captured at 1280. It shows exactly one figure,
  ADR-002's, populated inline between its brief and `Source · PNG`. The other nine ADRs have none.
  `evidence/arch133-1280*.png` sits in story 06's folder.
  `verifies → stories/06_story_the-live-draw/tasks/00_the-repo-opts-in-and-adr-002-is-drawn-through-the-seam.feature`
- **Still outstanding (not claimed):** the INSTALLED board shows none of this until `node scripts/install-local.mjs`
  and an operator restart of the desktop app.

## User sign-off

### 06 task 01 — the operator accepts the drawing (`@uat`)

The operator's answers, verbatim, 2026-09-23 (between about 10:10 and 14:20 UTC). The operator viewed the SVG and
PNG, then the drawing live in a board served from this checkout (`http://127.0.0.1:<ephemeral>/board#133`):

- *The drawing shows what the brief asks for* — **"Accepted"**
- *The drawing is in the console's style* — **"Accepted"**
- *The drawing reads outside the console* — **"PNG legible"**. The GitHub inline render is not yet observed, because
  the branch is unpushed. That is the operator's choice, carried as F-133-06.
- *In the board* — **"Looks crap in the browser dude. Too small to be of any use and I can't click it to expand or
  anything. The source links don't work either"** → F-133-01, F-133-02. For the link fix, the operator chose
  **"Serve them, sandboxed (Recommended)"**. After the fix was rebuilt and served: **"Yes this works"**.

`verifies → stories/06_story_the-live-draw/tasks/01_the-operator-accepts-the-drawing.feature`

## Fitness functions

Every probe was run here by `aof:verify` at the source: mutate one file, run the control, read the failure,
restore the file, then run the control green again.

| id | enforced by | result | red probe |
|---|---|---|---|
| FF-13301 | `test/arch/diagrams/acd-diagram-generator-named-once.test.mjs` | GREEN (4 ok) | appended `export const probeGenerator = "diagram-design";` to `src/config-inspect.mjs` → "the generator's name appears in src/** only in its adapter" failed, naming `'src/config-inspect.mjs'` |
| FF-13302 | `test/arch/diagrams/acd-diagram-layout-single-home.test.mjs` | GREEN (4 ok) | appended ``export const probePath = (item) => `${item}/diagrams/x.svg`;`` to `src/commands/diagram/plan.mjs` → `src/commands/diagram/plan.mjs: builds a folder path from "${item}/diagrams/x.svg"` |
| FF-13303 | `test/arch/diagrams/acd-diagram-export-no-playwright.test.mjs` | GREEN (3 ok) | appended `export function otherArgv(a) { return [a]; }` to `src/diagrams/rasterize.mjs` → "otherArgv is a second function returning an argv array" |
| FF-13304 | `test/arch/ui/acd-diagram-rendered-as-image.test.mjs` | GREEN (3 ok) | appended `export function probeLeak(response, marked) { return marked.parse(response.body); }` to `ui/src/board/diagrams.mjs` → `diagrams.mjs: reaches a markup sink` |
| FF-13305 | `test/arch/work/acd-work-artifact-set-single-home.test.mjs` (the extended leg) | GREEN (8 ok) | added `{ name: "DIAGRAM_PNGS", dir: "diagrams", ext: ".png" }` after the DIAGRAMS entry in `src/work/artifacts.mjs` → "exactly one entry has dir: diagrams" |

## Findings

| id | observed | type | severity | triage | routed-to | status |
|---|---|---|---|---|---|---|
| F-133-01 | In the real board the detail panel is about 350 px wide at every viewport, so ADR-002's 1000-wide figure renders at 323 px with unreadable labels, and nothing expands it. The operator: "Too small to be of any use and I can't click it to expand". | design-gap | high | blocker → `@bug` task 04/03 + fix. The operator overturned DESIGN's "no zoom, pan or lightbox" line, and DESIGN was amended first. | story 04 | closed |
| F-133-02 | The pasted block's `Source · PNG` links are relative `diagrams/…` hrefs, so they resolve against the board's URL and 404. | defect | high | blocker → `@bug` task 04/03 + fix. `diagram:file` + `/api/diagram/file` under `CSP: sandbox` (ADR-007 §6). | story 04 | closed |
| F-133-03 | The whole-tree control FF-11904 was red at HEAD: `test/arch/mesh/` holds 50 children against a ceiling of 49, because 132's accept commit added `acd-run-records-name-no-machine.test.mjs` without its row. | defect | medium | Inherited, mechanical: the row was raised 49 → 50 with its reason, repaired at this gate. | m132 | closed |
| F-133-04 | FF-12603 leg 6 went red: 04's own re-pin comment on the board-ui entry pushed 127/04's reason more than 600 characters from the entry it names. | test-gap | low | Fixed in this gate: the leg reads each stacked re-pin within reach of its entry. | story 04 | closed |
| F-133-05 | One of 133's own run records sat at `runs/umamis-msi/…-0002.json` with `"node": "umamis-msi"`. It was written before the rename at f76c153, and 132's guard refuses a machine-named segment once it is tracked. | defect | medium | Moved to `runs/node-7297/` with its `node` key rewritten, before the commit. | story 06 | closed |
| F-133-06 | The `@uat` leg "the SVG renders inline on GitHub" is not observed, because the branch is not pushed. The operator chose to judge the local files now. | test-gap | low | non-blocker → observe on the first push of this branch (the committed ARCHITECTURE.md's ADR-002 figure on GitHub). | operator | open |
