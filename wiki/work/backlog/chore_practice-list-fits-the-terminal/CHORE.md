---
type: chore
number:
slug: practice-list-fits-the-terminal
title: "The optional-practices list that `aof work update` prints fits a 120-column terminal"
status: not-started
owner: architect
created: 2026-11-14
updated: 2026-11-14
depends: []
schema: 1
aofVersion: 0.1.0
---
# The optional-practices list that `aof work update` prints fits a 120-column terminal

## Intent

Milestone 192 added a list of optional practices to `aof work update`'s output (192/ADR-007 §2).
With the two shipped practices its rows are 133 and 137 columns wide. The summary comes before
the key, so in a 120-column terminal it is the key that wraps, and the key is the part the
operator copies into the config (m192/F-04, deferred at `aof:verify 192/03`).

## Definition of Done

- [ ] Every row of the list, for the two shipped practices, is at most 120 columns wide in
      `aof work update` and `aof work update --dry-run`, in this checkout and in a scratch project
      with both practices off.
- [ ] Each practice's config key is printed whole, on the row that names the practice.
- [ ] The fix is one of the two that F-04 names: shorter summaries in the practices'
      `bundle.json`, or an amendment of 192/ADR-007 §2 that prints the key before the summary
      (or cuts the summary to fit). An ADR change is written as a superseding ADR, not as an edit
      to 192's delivered text.
- [ ] `packages/core/test/practice-render-lane.suite.mjs` and
      `packages/core/test/work-update.suite.mjs` are green, with a case that holds the width.
- [ ] `aof work validate` is green (no regression)

## Notes

- Source: `wiki/work/192_milestone_buildable-commands/VERIFICATION.md`, finding F-04.
- `--json` is unaffected. It carries the same fields whatever the terminal width.
