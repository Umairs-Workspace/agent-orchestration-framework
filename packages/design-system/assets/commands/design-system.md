---
description: Extract this project's design system — read its code tokens and its exported mocks, show the operator the inventory, build a Design System artifact from it once they agree, check it against the code, and name it in work.ui.designSystem. Claude Code only.
argument-hint: "extract [<exported-mocks-dir>…]"
allowed-tools: [Read, Grep, Glob, Bash, Write, Edit, Artifact, AskUserQuestion]
---
<objective>
Capture the project's look once, as a **Design System artifact** every later mock is drawn on, and
name it in `.aof/aof.config.json` → `work.ui.designSystem`. The system is built from the **code's
tokens** and the **exported mocks**, never live from Claude Design (198/ADR-004): code beats mocks,
and a value only a mock paints is the operator's to accept or drop, never written silently.

**The verbs own everything deterministic; this command owns only the Artifact calls and the two
conversations with the operator** (198/ADR-003). Every parse, comparison and config write is an
`aof design-system` verb, and this command reads each verb's `--json` answer. It never parses a
stylesheet, never compares two token sets by eye, and never edits the config by hand.

**Only Claude can do this**, because only a Claude session holds the Artifact tool. Codex and
OpenCode render no `aof:design-system`; say so if asked.

**A project's design lives in two artifacts, and never more** (198/ADR-005, ADR-006, amended
2026-11-27). An artifact has one type, so one artifact cannot be both:
- **the Design System**, which this command builds: the tokens, the README and the component cards;
- **the project's one Design canvas**, where every milestone's mocks are drawn, each milestone on a
  page of its own. This command never draws on it. It only records its link, when one exists, so
  refine knows which canvas to add a page to.
</objective>

<conversation>
**The operator's questions are answered, never acted on.** A reply that asks something, or that does
not plainly answer the question that was asked, gets an answer and the same question again; nothing
is published, deleted or written on it. A link on its own is information, not an instruction. Never
delete an artifact unless the operator says, in words, to delete that artifact. When you are unsure
what the operator wants, ask what they want to end up with, then say what is possible before doing
anything.
</conversation>

<config>
Parse `$ARGUMENTS`: the first word is the subcommand, and `extract` is the only one. Anything else
is a stop: name it and say that `extract` is the subcommand. The words after `extract` are
directories of freshly exported mocks (`.dc.html` or `.html`) the operator wants read as well.

Read `.aof/aof.config.json` → `work.dir` and `work.ui.designSystem`. This command needs no practice
switched on: it is what writes the block.
</config>

<process>
**0. Ask first: what exists, and what the operator wants.** Before any token is read, list the Design
System and the Design artifacts the operator can open (the Artifact tool's `list`, once with each
type), and say what the block names now. Then show the two-artifact layout above in two lines, and
ask once, with `AskUserQuestion`, what to do:
- **build a new system from the code** (the rest of this process), or
- **name a system that already exists**, the operator's pick from the list: run step 9 with
  `--artifact <its link> --mode reference` and stop, or
- **stop**, with nothing changed.

In the same question, ask which listed canvas, if any, holds this project's mocks. A named canvas
is recorded in step 9 with `--canvas <link>`; none is fine, and the first refine that draws creates
one. Never offer to merge the system into a canvas: it is not possible.

**1. Gather the inputs (ADR-004 §1).**
- **The code:** the CSS files that declare the project's design tokens, usually the app's root
  stylesheet. Find them with Grep, and confirm the list with the operator in step 3. For AOF this is
  `apps/ui/src/index.css`.
- **The mocks:** every `mocks/` directory under `work.dir`, plus each directory the arguments name.

**2. Read the tokens and the mock-only values — through the verb, never by reading CSS yourself.**

```
aof design-system tokens <css-file>… --mocks <dir> [--mocks <dir>]… --json
```

Keep the answer: it is the token lists, in the Design System's shape, that the system is built
from. It also holds `unplaced`, every value the system cannot hold (with its file, line and reason),
and `mockOnly`, every colour a mock paints that no code token holds (with the files it appears in).
A refusal (a file it cannot read) is a stop: report it.

**3. Inventory the components the mocks repeat (ADR-004 §3).** Read the mocks and list the
components they repeat — for AOF, the bar, the nav, the scope segment, the pills, the cards and the
terminal pane — each with the mocks it appears in. A component is a repeated idiom, not every
element.

**4. The inventory review — the operator agrees before anything is published.** Show, in one message:
- the token counts per family (for AOF, 20 colours and 1 radius) and the CSS files they came from;
- every `unplaced` entry, saying the system will not hold it;
- every `mockOnly` value, each for the operator to **accept or drop**;
- the component inventory;
- the title you propose: the project's name, unless the operator gives another.

Ask once, with `AskUserQuestion`: agree, change, or decline. In a session the loop drives
(`AOF_RUN_ID` is set) that question is posted through the loop, so ask it the same way: one
question, carrying the whole inventory. Never publish on a permission prompt nobody can answer.
- **Declined:** stop. Nothing is published and the config is not written.
- **A mock-only value accepted:** it goes into the **code first** — add it to the CSS file the
  tokens came from — and run step 2 again. It is never written into the system alone, so `check`
  stays clean from the first publish.
- **Changed:** apply the change and show the inventory again.

**5. Resolve the title before publishing (ADR-005 §4).** List the Design System artifacts the
operator can open (the Artifact tool's `list`, with the Design System type). When any other system's
title equals the agreed title exactly, **stop before publishing**: name the title and every
candidate's title and link, and say the operator can pick another title or name an existing system
with `aof design-system use --artifact <link> --mode reference`. Never guess between them. Nothing
is published and the config is not written.

**6. Build and publish the system with the Design System type's own procedure (ADR-004 §4).**
- Read the type's instructions, and read its `from-code.md` **from the type, now, at run time**.
  This bundle ships no copy of it: a copy would go stale the day the type changes.
- Follow `from-code.md` with the inventory as its input. The token lists are the `tokens` answer of
  step 2, with a short usage note written for each token. Each listed component gets its README and
  a static preview. A live component bundle is out of scope.
- Record the provenance in the system's `tokens.json` `meta.source`: this repository, the ref you
  built from (`git rev-parse HEAD`) and the CSS paths.
- Mark the system's index `"editing": "code"`: it is synced from the code, and changes go through
  the code.
- Create it under the agreed title.

**7. Check the published system against the code (ADR-004 §5).** Save the published `tokens.json`
to a scratch file and run:

```
aof design-system check --tokens <scratch tokens.json> --source <css-file>… --json
```

It must report no drift (exit 0). Drift means the system does not hold exactly the code's tokens:
fix the system, publish it again and check again. Never move on with drift.

**8. The operator approves the published system.** Give them its link and ask once, with
`AskUserQuestion` (through the loop when it drives the session), whether to name it in the config.
A no ends the run: the system stays published and the config is not written.

**9. Name it in the config — through the verb, never by hand.**

```
aof design-system use --name "<title>" --mode owned --source <css-file> [--source <css-file>]… [--canvas <link>] --json
```

The mode is always `owned`, with the CSS files step 2 read as the source: a system someone else
owns is named with `--mode reference` (step 0). `--canvas` is the canvas the operator named in step
0; without it, a canvas the block already names is kept. Then run `aof project validate` and confirm it
reports no `design-system-*` finding.
</process>

<output>
Report the system's title and link, its token counts, its components, the `check` verdict, the
canvas the block names (or that refine will create one), and the block `use` wrote. On a stop, name the step that stopped and what the operator can do next, and say
plainly what was and was not published or written.
</output>
