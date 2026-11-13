---
doc: state
---
# 192 · Commands are built at render from a core body and the fragments of the practices a project has turned on — State

## Progress

- 2026-11-12 — Captured in the backlog.
- 2026-11-12 — Promoted as 193, then renumbered to 192 so it sits before operator-aware discovery
  (now 193), which waits on it.

- 2026-11-13 — Refined (`aof:refine 192 --autonomous`; solo, run `20261112T235111891Z-0000`, no
  session id: the live store did not answer). ARCHITECTURE ADR-001–008, FF-19205–19208 declared
  `pending`, four stories with their example maps, build plans and 16 task features.
  `aof work validate` passes; `aof work doctor 192` reports no error. Nothing is built.
- Waves: 00; then 01 and 02 together; then 03. `aof work next 192` answers 192/00.

## Notes & decisions in flight

- 2026-11-13 — **Default decisions taken at refine**, each the operator's to overturn at review:
  - **A stale render is an error in one direction only** (ADR-006 §3, §5). A practice that is on
    while the commands were rendered without it fails `aof work doctor`; the reverse is a
    warning, because the prose tells itself to stand down. The SPEC says only that the doctor
    "says so".
  - **Two seam edits to the moved prose** (ADR-005 §4). The refine Contract's opening loses
    "opening with the discovery beat below when the project has turned it on", and the Codex
    skill entry's "…before writing tasks; retain…" becomes two sentences. Everything else is
    held to "the same once whitespace is collapsed". The SPEC says "no change in what it says";
    these two are the places where that and "no sentence about the example map" cannot both hold.
  - **A fragment names its practice, and the practice names the keys** (ADR-002 §1). The SPEC has
    the fragment name the keys itself.
  - **A slot may exist in the Codex text alone** (ADR-002 §7), for the one gated sentence in the
    Codex skill entry. The SPEC says the two bodies carry the same slots; every slot of the
    Claude source is still in the Codex text.
  - **The build brief is a practice declared by core's own bundle**, not a new package
    (ADR-005 §1).
  - **Not moved** (ADR-005 §6): the developer brief's `PLAN.md` paragraph, `manual.md`'s line,
    the review briefs' sentence about a build plan, the Codex execution contract's sentence about
    a map token (45 copies), and the default `EXAMPLES.md` and `PLAN.md` templates, which are
    still installed in every project.
  - **The stale-render check is in `aof work doctor`**, as the SPEC says, against the placement
    190/ADR-008 §1 chose for a config-fit check (ADR-006 §4).
  - **`aof work init` does not print the list of practices** (ADR-007 §3).
  - **Fitness ids start at FF-19205**, because FF-19201–19204 are 193's.
- 2026-11-13 — **Discovery.** Each story has an example map. No business question was left on
  any of them: every rule is stated in the SPEC's Scope, and what remained were engineering
  choices, labelled `technical` and defaulted to an ADR. Nobody was asked anything.
- 2026-11-13 — No diagram was drawn. The composition is one pass in the loader, and a picture
  would add nothing to ADR-001 §3.
- 2026-11-13 — **193/04's guessed fragment layout holds** (ADR-005 §3): its `files:` need no
  change for where a fragment or a template variant lives.
- 2026-11-13 — The story read and write sets were derived by hand from `aof graph impact` (graph
  built 2026-11-13, 21,587 nodes) and a search of the test tree. The derivation service has no
  CLI door. 192/02's list of suites that pin the moved prose comes from a search, not a proof.

- 2026-11-12 — Framed from the operator's question at the review of 193's refine: the commands are
  getting long, and in some projects a practice such as operator-aware discovery is not needed.
  The operator's steer: make commands "buildable", so an extension can add to a Claude or Codex
  command. Agreed in that conversation: the mechanism is its own milestone, ahead of 193's prose;
  its first job is a move of the prose that is gated today, with no change in what it says.
- 2026-11-12 — Weighed and left out of scope: one source for the Claude and Codex bodies (they
  differ in wording), and fragments supplied from outside the aof packages (a packaging and trust
  question of its own).

## Verification

- [ ] `@executable` suite green
- [ ] Fitness functions green
- [ ] `@manual` signed off — see `UAT.md`
