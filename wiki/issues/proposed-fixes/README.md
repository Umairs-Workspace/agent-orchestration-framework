# Proposed fixes — the agent layer

**2026-08-24.** Four changes to the ACD agent and command prompts, each aimed at a measured cost in
the `aof:refine` / `aof:continue` / `aof:verify` path. Companion to the three documents in the parent
folder, which measure the problem; these propose the remedy.

| | Fix | Surface | Size |
|---|---|---|---|
| 1 | [Reviewer finding discipline](FIX-1-reviewer-finding-discipline.md) | `aof-architect`, `aof-qa`, `aof-designer` | ~30 lines of prompt |
| 2 | [The read contract](FIX-2-the-read-contract.md) | story contract + build/review agents | schema + runtime validation + prompt |
| 3 | [Round cap and stall detection](FIX-3-round-cap-and-stall-detection.md) | `work.loop.reviewRounds` + review gate | runtime policy + prompt |
| 4 | [Same-wave file overlap](FIX-4-same-wave-file-overlap.md) | story contract + `aof work next` | schema + runtime partition |

Fix 1 is prompt-owned. Fixes 2 and 4 share the story frontmatter prerequisite; their declarations are
validated and consumed in code. Fix 3 is enforced by the existing code-owned loop bound and review
decision, with prompt text documenting the same policy.

## Implementation status

**Implemented 2026-08-24.** The shipped bundle now carries all four mechanisms:

- reviewer reporting bars on the architect, QA, designer, security, and compliance lenses, including
  the low-confidence suspected-Blocker question carve-out;
- `reads:` / `files:` on the story template and refine/assimilation authoring paths, with declared
  read-path and anchor validation and the same bounded read context on `aof-developer`;
- deterministic same-wave write-set partitioning in `aof work next --json`, which returns `wave` and
  `heldSet`; `aof:continue` consumes those fields without recomputing them;
- the existing configurable one-round default, structured Blocker verification/deduplication,
  non-decreasing Blocker-count stall detection, and an absolute three-round runtime ceiling.

The production autonomous loop already had milestone 69's configurable one-round default when this
implementation landed. That existing bound home now also owns the absolute maximum; the runtime
counter enforces it, rather than relying on the reviewing model to obey prose.

[MEASURED.md](MEASURED.md) is the before/after, taken 2026-09-03 after the fixes landed as story 83:
cache-creation per agent spawn fell from 3,082,276 to 936,394 (−69.6%), review rounds are bounded and
holding, and the remaining bill is one agent — `aof-developer`, 53% of it — paying for read and write
sets that are short on two thirds of stories. Follow-up scheduled as milestone 96 and chore 97.

[ANALYSIS.md](ANALYSIS.md) is the argument: what the agent layer costs, why, and what comparable
systems do instead. [SOURCES.md](SOURCES.md) carries the citations.

---

## Redaction policy for this folder

This repository is public. The policy applied here, stated so it can be checked and reversed:

- **Downstream and client project names are stripped entirely.** Where evidence comes from a
  consuming repository it is attributed to "a downstream work stream". Milestone and story numbers
  are retained — they are meaningless outside the stream that owns them and they preserve internal
  traceability.
- **Published research is cited with URLs.** Vendor documentation and peer-reviewed papers are the
  evidence base; removing them would make every quantitative claim in this folder unfalsifiable.
- **Comparison frameworks are described by mechanism, not by name, in the fix documents.** Their
  names and URLs are confined to `SOURCES.md`, so the attribution survives and the folder can be
  narrowed further by deleting one file.

The companion issue's evidence line is redacted to "a downstream work stream"; no downstream/client
project name remains in that location.
