---
doc: examples
---
# 150 · aof:explain says what a work item is for, without writing anything — example map
<!--
Drafted at refine's discovery beat, 2026-10-04. Struck before asking, because the record answers
them: that nothing is written (STORY Notes, "Read-only is the contract"); that several refs go in
one call and an unresolvable one does not stop the others (STORY Notes, "Inputs"); what --verbose
adds (STORY Notes, "Default vs --verbose"). Measured: `aof work find 150`, `aof work find 129`
(archived) and `aof work find <backlog slug>` all answer a row, and `aof work doc <ref> <DOC>`
reads a live, archived or backlog record doc; but `aof work find wiki/work/backlog/<folder>`
answers `[]`, because the resolver matches a slug or a folder NAME, never a path
(packages/work/src/discovery.mjs findWork).
-->

## R1 · Asking leaves nothing behind in the work tree
- E1 · `aof:explain 147` on a clean checkout: the answer is printed, `git status` is unchanged, and 147's `runs/` gains no run record [proposed]
- E2 · `aof:explain 149 --verbose`: 149 keeps its status, and its `updated:` keeps its date [proposed]

## R2 · Every ref in the call is answered, in the order given, archived work included
- E3 · `aof:explain 147 150`: two explanations, 147's first [proposed]
- E4 · `aof:explain 147 999`: 147 is explained, and 999 is reported as matching no work item; the call does not stop at it [proposed]
- E5 · `aof:explain wiki/work/backlog/story_a-halted-lane-is-reaped`: the backlog story is explained and marked as not yet scheduled [proposed]
- E6 · `aof:explain loop`, a fragment that matches several items: the matches are listed by ref and title, and none is explained [confirmed]
- E10 · `aof:explain 129`, archived and done: explained like any other, marked archived and done [stated Q1]

## R3 · The default answer is short; --verbose goes in depth
- E7 · `aof:explain 147`: three to five sentences on what it delivers, who it is for and why it exists [confirmed]
- E8 · `aof:explain 148 --verbose`: adds its scope, its five stories with their status, its depends edges, and what is still open [proposed]
- E11 · `aof:explain 148`: its purpose and a count of its stories ("groups five stories, none done"), with no story named [stated Q2]

## R4 · The answer says only what the record says
- E9 · A backlog milestone whose SPEC objective is still the template placeholder: the answer says its purpose is not written down yet, and invents none [proposed]

## Questions
- Q1 · business · answered · Is done, archived work explained like live work (marked as archived), or refused? (explained, marked archived, 2026-10-04)
- Q2 · business · answered · Does a milestone's default answer name its stories, or only the milestone's own purpose? (its purpose plus a count of its stories; --verbose lists each, 2026-10-04)
- Q3 · technical · defaulted Notes · Is there a matching `aof work explain` CLI verb? (no: the answer is plain-language synthesis only a session can write, composed from the existing read verbs)
- Q4 · technical · defaulted Notes · How does a backlog folder path resolve? (`aof work find` learns a work-tree folder path, matched on the row's folder; the prompt never strips a path by hand)
- Q5 · technical · defaulted Notes · Does `aof work find` refreshing the machine-wide work cache break "nothing is written"? (no: that cache is outside the work tree and holds no answer)
