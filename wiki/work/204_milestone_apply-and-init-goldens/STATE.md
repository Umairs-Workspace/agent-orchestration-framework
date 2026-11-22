---
doc: state
---
# 204 · What aof apply, init and clean write is held to baselines, including their merges into files the user owns — State

## Progress

- 2026-11-21 — Refined with `--all`, solo (run `20261121T232637388Z-0000`): ADR-001 to ADR-007,
  FF-20401 and FF-20402 declared (pending, with planned red probes in VERIFICATION), four stories,
  their example maps (every example proposed, no business question left open), plans and 13 task
  features. `aof work next` readies 00 and 03 and holds 03 on the shared lane registry, golden
  index and budget row (ADR-007).

## Notes & decisions in flight

- **2026-11-21, operator decision at refine: 204 fixes four defects, and holds the rest.** Refine
  measured the three verbs before writing any ADR (ARCHITECTURE "Measured facts"). The SPEC's
  acceptance, "a merge provably leaves the user's own entries unchanged" and "`clean` provably
  removes exactly what aof wrote", is false today. The operator was asked in prose whether 204
  fixes the defects or holds them as today's behaviour, and agreed with the recommendation:
  - **Fixed in 204, at the source, in the story that baselines the verb:**
    1. `aof assets clean` deletes a merged file whole, the user's content with it: `AGENTS.md`, a
       nested `AGENTS.md`, `.codex/config.toml` and `.codex/hooks.json` (ADR-004, story 02).
    2. `aof assets apply` replaces a user's `CLAUDE.md` and `.mcp.json` whole, and would replace a
       user's `AGENTS.md` for opencode the same way (ADR-002, story 01).
    3. The Codex TOML merge into a fresh `.codex/config.toml` puts a top-level setting after a
       table header, so Codex reads it inside that table and the next `apply` refuses with
       `codex-output-conflict` (ADR-003, story 00).
    4. `aof init` replaces a user's `.aof/.gitignore`, and after `aof work init` it drops the
       entries `work init` wrote (ADR-005, story 03).
  - **Held in the baselines as today's behaviour, and filed (ADR-006):**
    5. `clean` leaves aof's merged entries in `.claude/settings.json` and leaves the apply journal.
    6. A project doc that both Codex and opencode render to `AGENTS.md` refuses with "generated
       output conflict" (and so does an unscoped Codex rule beside an `AGENTS.md` project doc).
    7. A single-runtime apply writes outside its runtime: every apply merges
       `.claude/settings.json`, and a claude- or opencode-only apply writes `.codex/config.toml`
       when the config declares Codex settings. Measured after the decision, while writing story
       00's map. It damages no user content, so it is held under the operator's rule (ADR-006 §3).
  These go to VERIFICATION as findings at verify, as 203's F-01 did.
- **`--global` is `assets add --global` and `assets use --global`.** `assets apply --global`
  refuses by design and points at `assets use --global`. The SPEC's "`--global` writes into the
  temp global home" is held through those two verbs (ADR-001).
- **No ADR is diagrammed.** The one flow with moving parts, a co-authored file's ownership from
  apply to clean, is three rules in ADR-002 and ADR-004, not a sequence a picture would clarify.

## Verification

- [ ] `@executable` suite green
- [ ] Fitness functions green
- [ ] `@manual` signed off — see `UAT.md`
