# 119/01 — build brief

Advisory, and the builder's. Not a contract: the task `.feature` scenarios are. Deviating from this
is not a finding.

## The mechanism

Two family moves and one rename, each a `git mv` plus a specifier rewrite across every dependent. The
mechanical half is genuinely mechanical and was checked before the story was written: no basename
collides inside either family once the prefix is stripped, and the payload deploy copies the source
tree recursively, so no packaging step has to be taught a new directory.

What is *not* mechanical is **depth**. One constant in the moving set derives its own location and
then walks upward a fixed number of hops to reach the repository root. Move the module one directory
deeper and the same arithmetic lands inside the source tree instead — silently, with no import error
and no failing type. Its consumer resolves framework loop-record ceiling pointers, so the symptom is
every one of those pointers ceasing to resolve, far from the diff. It is the only such constant in
seventy-one modules. Fix it in the same commit as the move that arms it.

The second failure class is controls that go quiet. Some gate their real assertion on the existence of
the subject and return early when it is missing — so after the move they run, pass, and assert
nothing. One of them is the whole direction guard for a delivered boundary. These do not fail; they
succeed emptily, which is why they must be found by listing the guarded subjects rather than by
running the suite and reading green. A stored path handed to a child process has the same shape one
level worse: it fails at runtime in a subprocess rather than at import resolution.

Expect the diff to have **three** kinds, not two. Beyond the moved file and the rewritten import
specifier there is a third: a control that holds a moved path as a string literal it reads. There are
several hundred of these. They are legitimate edits, not scope creep.

## The verification step

The full suite green before and after is necessary and not sufficient — it would stay green through
both failure classes above. The check that actually proves this story is: **the framework loop-record
ceiling pointers still resolve after the move**, exercised end to end rather than reasoned about, plus
a control whose subject moved demonstrably reds when its subject is absent instead of skipping. Run
the directory-budget table against the tree it now describes and confirm each layer's ceiling equals
its measured count, counting suites by the same rule the sweep uses — the direct-children count and
the suite count differ, and taking the wrong one pins the ceiling one off.

## Deliberately out of scope

The five source directories that already exist are not nested into the new families — priced at
several hundred citations for no reduction in the root count. The most-depended-on module in the tree
does not move. The frontend tree is in the write set for stale citations only; nothing there changes
behaviourally. And the sibling-count ratchet lands here as one table over every flat layer, not as a
per-directory cap — a count-only cap with no admitted decomposition is the failure this milestone was
convened to rule out.
