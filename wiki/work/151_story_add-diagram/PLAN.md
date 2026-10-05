# 151 · aof:add-diagram — build plan

## Mechanism

One new bundle command, `packages/core/assets/commands/add-diagram.md`, shaped like
`loop-diagram.md`: `argument-hint: "<ref> [ADR-NNN]"`, `allowed-tools: [Read, Write, Edit, Bash]`
(Edit, because the session pastes into ARCHITECTURE.md). No CLI change, no refine change.

Its process, in order:

1. **Pick.** Read the item's `ARCHITECTURE.md` (none → nothing to draw). With an ADR named: drawn
   already (a `](diagrams/` link in its section) → report and stop (Q2); no `### Diagram` section →
   write the brief under the ADR first, in refine's words (why a picture helps, the view, the
   components, the flows). With none named: every ADR whose brief has no `diagrams/` link under it,
   listed before the first draw (Q3); an empty list → "nothing to draw", name
   `aof:add-diagram <ref> ADR-NNN`, write nothing (Q1). Never judge an unbriefed ADR.
2. **Plan** each: `aof diagram plan <ref> <ADR-NNN> --slug <slug> --json`. Slug = the ADR title in
   kebab case, trimmed to what `assertSlug` accepts (Q4 default). `enabled: false` → report the
   reason, stop the whole run (it answers the same for every ADR). `available: false` → report
   `code` + `fix`, keep the briefs, stop. A non-zero exit (`diagram-adr-unknown`,
   `diagram-item-delivered`, `diagram-brief-missing`, …) → report code + message, skip that ADR.
3. **Draw**: follow the answer's `instructions` exactly; no pause for confirmation.
4. **Export**: `aof diagram export <ref> <ADR-NNN> --json`; paste `block` under the brief (the
   readDiagramBrief boundary: the brief ends at the first `](diagrams/` line). A `png` that is not ok
   still pastes the block; report `png.code` / `png.fix` and that the doctor's diagrams lane stays red
   until a node with a browser exports it.
5. **Report** the paths written per ADR and anything skipped, and why. Never commit (Q6). Leave any
   STATE.md `diagram not drawn:` line as it is (Q5 default: STATE is a log; the doctor reads
   ARCHITECTURE.md, which is the record).

The prose names aof's verbs only, never the generator (FF-13301).

Then regenerate: `aof work update` renders the three copies and refreshes the lock;
`node scripts/generate-bundle-manifest.mjs` refreshes `manifest.json`. Move the four censuses in the
same diff: the bundle suite's `COMMAND_IDS` + count, the autonomous shell-out ids list (in
`bundle.json`'s order), the learning-edge `EXCLUDED` map, and FF-13301's "the sweep reaches" assertion.
Story 147 (repair) grows the same count on its own branch: whichever merges second re-counts.

## Verification step

`node scripts/test.mjs --only` over the story's test files (its `files:` set) with
`AOF_GLOBAL_HOME` isolated: the new diagrams suite reads the prose per
scenario, as `loop-diagram-command.test.mjs` does for 145/03. Then `aof work update --dry-run --json`
must report the three copies as `skip`.

Task 02 `@manual`: a scratch project with diagrams on, one milestone with ADR-001 briefed and undrawn
and ADR-002 unbriefed. Run `/aof:add-diagram <ref>`, then `<ref> ADR-002`, then `<ref>` again; paste
the `diagrams/` listing, the two ADR sections and the doctor's diagram findings into VERIFICATION.md.
Never run it on a live item's ARCHITECTURE.md.

## Out of scope

- Redrawing a drawn diagram (Q2: report it); proposing pictures for unbriefed ADRs (Q1).
- Any change to refine's diagram step, the architect agent, or the `diagram` CLI family.
- The loop subject — `aof:loop-diagram` owns it.
