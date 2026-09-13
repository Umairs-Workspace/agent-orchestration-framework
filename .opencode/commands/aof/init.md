---
description: Install ACD into this repo and give it a config — runs `aof work init` (the CLI render) first, then analyses the project to author `.aof/aof.config.json`: the graphify memory backend active by default, and a `work.tags` vocabulary inferred from what this repo actually contains.
---

<objective>
Leave the repo with a WORKING ACD install: the bundle rendered, the lock written, AND a config that
selects a memory backend and states this project's closed tag vocabulary. The division of labour is
load-bearing: `aof work init` (the CLI) is the MECHANICAL FLOOR — the render plan, the lock, the
capability matrix; this command is the INFERENCE CEILING — it reads the repo and turns what is
actually there into `work.tags`. Inference never re-does the render, and the config is written by
`aof work init-config`, the one config writer — never by hand-editing the JSON.
</objective>

<config>
Parse "$ARGUMENTS": an optional target directory plus any flags (`--force`, `--runtime claude,codex`,
`--dry-run`) — every flag passes through to the CLI unchanged. `--force` passes straight through to
`aof work init --force`.

**Bootstrap ordering.** This command ships *inside* the bundle `aof work init` installs, so in a
never-initialised repo it does not exist yet: the first install is the bare CLI verb
(`aof work init`), and `/aof:init` covers re-init, config repair, and any repo that already carries
the bundle. That sequencing is expected, not a failure.
</config>

<process>
1. **Mechanical floor — the CLI runs FIRST.** As the first act, before reading a single project file,
   run `aof work init $ARGUMENTS --json`. It renders the bundle, writes the `work` section of
   `.aof/aof.lock.json`, and reports what it wrote. Do not analyse the repo or write anything before
   the CLI has run.
   - **The guarded refusal ends the command.** An install already present without `--force` returns
     `{ guarded: true, message }` and exit 1. Report the message verbatim and STOP — no analysis, no
     config write. (`aof work update` delivers bundle changes; `/aof:init --force` re-renders.)
   - **`--dry-run` ends the flow after the preview.** Report what would be written and stop; the
     config step writes nothing either.
2. **Analyse the project — infer the vocabulary from what is really there.** Read the repo, don't
   recite a boilerplate list. Ground every tag in something you can point at:
   - **`layers`** — the delivery surfaces this repo actually ships. A `bin/`/CLI entry in
     `package.json` → `@cli`; a `ui/`/`app/`/`web/` front end → `@ui`; an HTTP/route layer → `@api`;
     a docs tree → `@docs`. A surface the repo does not have does not get a tag.
   - **`refinements`** — the cross-cutting qualifiers this codebase's work divides along
     (e.g. `@adapter`, `@planning`, `@assets`) — usually visible as shared/plumbing modules rather
     than features.
   - **`domains`** — the feature areas, read off the real structure: top-level source directories,
     workspace packages, the test layout, the top-level nouns of the domain.
   Shape rules: every tag is `@`-prefixed, lowercase-kebab, and singular in intent
   (`@work-stream`, not `@work-streams`). Aim for a vocabulary a reviewer could have written from the
   directory listing — a handful per group, not an exhaustive taxonomy. If the repo is too bare to
   read (an empty scaffold), say so and write no tags rather than inventing a plausible set. Do not
   add the bare `a11y` domain token here: it is the deliberate unprefixed opt-in switch for the
   accessibility review lane, a decision the project makes later — not something to infer.
3. **Write the config — through the CLI, never by hand.** Run:

   ```
   aof work init-config --layers <a,b> --refinements <c> --domains <d,e> --json
   ```

   (append the same target directory the CLI ran against, if one was given). This is the ONE config
   writer: it read-merge-writes `.aof/aof.config.json`, setting `memory.backend: "graphify"` active
   by default and filling the `work.tags` block, and it leaves every other key untouched —
   `work.dir`, `work.agents`, `headroom`, `mesh` and any foreign section survive. **Never** edit the
   config JSON yourself; a hand-edit is a second, divergent writer and is exactly what this verb
   exists to prevent.
   - It **fills holes, it never re-authors.** A project that already selected a memory backend keeps
     it (`backendWritten: false`); a project that already has a tag vocabulary keeps that
     (`tagsKept: true`). Report which happened rather than overwriting.
   - A repo with no config at all gets one born valid (`$schema`, `name`, `resources`).
4. **Validate.** Run `aof work validate` — the written vocabulary is the closed set the validator
   enforces, so this is where an inferred tag that no feature uses (harmless) is distinguished from a
   feature tag the vocabulary is missing (a real gap: fix by re-running step 3 with the missing tag,
   never by loosening the check).
</process>

<output>
Report the CLI's render result (created/updated/kept counts, the manifest path), the inferred
vocabulary with the evidence behind each group (what in the repo you read it off), what
`aof work init-config` wrote versus kept (`memory.backend`, `work.tags`), and the `aof work validate`
result.
Next: `aof:add-milestone` to frame the first piece of work, or `aof:validate` for the full lint.
</output>
