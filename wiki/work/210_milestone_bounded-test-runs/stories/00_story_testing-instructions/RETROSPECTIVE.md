---
doc: retrospective
promotionFrom: 1
---
# 210/00 · A project tells its agents how to test, in its own words — retrospective

## R1 · Removing the graph probe left two controls' allow-lists naming its old home

**Kind:** mistake · **Area:** process · **Stage:** build · **Owner:** developer · **Raised by:** product-owner · **Promoted to:** none

**What happened:** 210/00 removed the graph-freshness probe from `config-inspect.mjs`. The two codebase-grounding controls still listed that file as a graph reader, and each checks that its own allow-list is honest, so both went red. The story's named runs did not include them, and the verify sweep over `test/arch` found them.

**Why:** The importer scan does not reach controls that read source text through globs. Removing a capability makes an allow-list entry stale just as adding one makes it missing, and the story only looked for controls that its additions could break.

**Lesson:** When a change removes a capability from a file, search `test/arch` for the file's path and run every control that names it, since an allow-list that checks its own honesty goes red when an entry stops being true.

**Refs:** 210 VERIFICATION `@finding-F-09`; run `20261127T220729015Z-0003`.
