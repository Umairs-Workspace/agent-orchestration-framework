# 71/03 · The render lane is gated on renderability — and this milestone supersedes 07's `npx playwright` clause — Outcome

<!--
  OUTCOME.md — what this item now delivers, the assumptions that delivery rests on, and the gaps it
  declared but did not fill. Authored EXCLUSIVELY by aof:verify at Accept (ADR-004). States product
  STATE ("the system now IS X"), never motive. An ADDITIONAL artifact: it carries no identity
  frontmatter and is never this item's record doc — `STORY.md` is.
-->

## Delivered

### The design lane resolves renderability before it spawns anything
`src/bundle/commands/continue.md` and `src/bundle/commands/verify.md` both state a renderability
precondition ahead of the render, evaluated before any render is attempted and before anything is
spawned. It resolves two halves in a declared order: a base URL (`--url` when given, else
`work.ui.baseUrl`) and a renderer (`work.ui.renderer` when declared, else the highest-revision
Chromium found by globbing the platform's `ms-playwright` cache). Resolvable means **exists and is
executable**, not that the key is set — a declared path that is not on disk is the precondition's own
finding, named with the path that failed, rather than a render-time crash.

### A failed precondition is a recorded skip, per surface
When either half is unresolved, or the surface declares no `Route`, the lane attempts no render at
any breakpoint, records the reason naming the missing key / missing binary / missing `Route`, returns
`INCONCLUSIVE`, spawns no designer session and no QA session, and continues. The precondition is
evaluated **per surface**, so a surface that resolves is still rendered and judged when a sibling
surface does not. A missing baseline is a different recorded reason from a missing precondition half.

### The render drives an already-cached Chromium, and carries its breakpoint's width
The invocation both commands name is
`<renderer> --headless=new --disable-gpu --hide-scrollbars --window-size=<W>,<H> --screenshot="<absolute forward-slash path>" "<baseUrl><Route>"`,
one invocation per breakpoint at that breakpoint's own width, each writing its own screenshot to a
path made absolute and forward-slashed on every platform. The `390` / `768` / `1280` default survives
the mechanism swap and stays DESIGN-overridable per milestone. A render that exits non-zero, exits
zero but writes no file at the named path, writes a zero-byte file, or does not return within the
step's own wait is `INCONCLUSIVE` with that failure recorded as the reason — an "exited zero, wrote
nothing" render is never judged as a screenshot.

### `work.ui.renderer` is a declared config key
`schemas/aof.schema.json` declares `work.ui.renderer` as an optional string inside the closed
(`additionalProperties: false`) `work.ui` block: absent ≡ discover the highest revision in the
platform's `ms-playwright` cache, declared ≡ use this path.

### 07's `npx playwright` render clause is superseded, in 71's own contract
No file under `src/bundle/` names `npx playwright`. The three milestone-07 arch tests that pinned it —
`acd-conformance-verdict-contract`, `acd-design-conformance-bundled` and `acd-design-role-split` —
are amended **in place**: no surviving assertion requires the superseded render, while the legs 07
cared about are asserted still enforced (Playwright absent from `package.json`
`dependencies`/`devDependencies`; the designer never told to run the browser; the designer body free
of the render command; the render → hand-off marker carrying its hand-off half). No file under
`wiki/work/07_*` is written by any story of this milestone — 07's delivered `.feature` files are
immutable and are neither edited, annotated nor tagged.

### FF-7102 holds all three claims
`test/arch/acd-render-lane-is-gated.test.mjs` walks every file under `src/bundle/` rather than a
listed set, asserts the render invocation itself (not the file) carries `--screenshot=` and
`--window-size=`, asserts the precondition precedes the render **by order rather than by presence**,
asserts QA's own Playwright harness and `toHaveScreenshot` regression survive so the control cannot
be satisfied by deleting design conformance, and asserts the three superseded 07 controls were
amended rather than gutted. It is registered in `scripts/test.mjs`.

### The six rendered runtime copies carry all of it
`.claude/commands/aof/{continue,verify}.md`, `.codex/skills/aof-{continue,verify}/SKILL.md` and
`.opencode/commands/aof/{continue,verify}.md` are byte-identical to the live bundle render.

## Assumptions

- **The precondition and the skip are instructions, not enforcement** — FF-7102 proves the rule is
  stated, in order, in the shipped assets; nothing in the runtime evaluates it. An agent reading the
  prompt performs the resolution.
- **The renderer discovery is a glob over the platform's `ms-playwright` cache** — it assumes such a
  cache exists on the machine. This machine's holds ten Chromium revisions; the highest, `1234`,
  resolves under `chrome-win64`, which is the layout instability the glob-never-template rule exists
  for.
- **Breakpoint width is carried by `--window-size=`** — the flag is asserted present in the
  invocation, and the widths beside it; what the flag *establishes about the layout viewport* is not
  asserted (see Gaps).

## Gaps

### The render's soundness does not travel with the frame
- **Status:** open
- **Discharge condition:** the render step establishes and records, per capture, that the layout
  viewport equals the stated width (CDP `Emulation.setDeviceMetricsOverride` rather than
  `--window-size`), that `document.documentElement.scrollWidth == innerWidth`, and that the page has
  settled — and hands that record to the designer with the screenshot.

Measured live at this accept, against the fleet surface on this machine
(`VERIFICATION.md` **F-71-F**): the 390 frame taken by the shipped invocation clipped three unrelated
subtrees at the same x — the signature of a layout viewport wider than the stated width, which
milestone 47's delivered design contract already ruled on (**F-47-V-21**, 2026-08-13: *"Chromium's
`--window-size` does not guarantee this; CDP `Emulation.setDeviceMetricsOverride` does"*, added after
three HIGH design findings were raised and withdrawn for want of it). The 768 frame was captured
mid-settle and its empty surface bar was escalated by the read-only designer as a suspected Blocker
against a locked invariant; a re-render with a settle budget showed the bar fully populated. The
shipped step names four render-failure modes and no settle step.

### An unconfigurable repository has not been observed paying one line for the lane
- **Status:** open
- **Discharge condition:** a UI story driven by `aof:continue` in a workspace with no `work.ui` key,
  whose run records one `INCONCLUSIVE` naming `work.ui.baseUrl` with no designer session, no QA
  session and no render attempted at any breakpoint.

This repository is that workspace — `.aof/aof.config.json` carries no `work.ui` key at all — but it
has no UI story to drive, so the precondition's cheap exit is stated and untested end to end
(`VERIFICATION.md` **F-71-B**'s shape).
