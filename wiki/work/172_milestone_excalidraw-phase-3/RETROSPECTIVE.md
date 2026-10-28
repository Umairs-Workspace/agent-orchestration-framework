---
doc: retrospective
promotionFrom: 1
---
# 172 · Excalidraw phase 3 — retrospective

What running phase 3 taught: the stories built clean in their own lanes, and the gate and the verify
found everything the lanes did not select, again, along with one ceiling the stream itself outgrew.

## R1 · Twelve reds lived in controls no story lane selected, one milestone after the lesson that names them

**Kind:** mistake · **Area:** process · **Stage:** build · **Owner:** developer · **Raised by:** verifier · **Promoted to:** none

**What happened:** Every story closed green on its declared suites. The verify's control sweep found
seven reds (F-172-02 to F-172-08) and the first whole-tree gate two more (F-172-12): a census of
board writes, a kernel's platform-API table, a runtime audit, a module-count ceiling, two descriptor
goldens, a source-slice rule, a restated path and two measured comment windows. Only 172/03 ran the
importer sweep at its close, and it found two pins that way.

**Why:** The sweep is a step a developer remembers, not one the review runs, so it ran in one story
of five. `aof test --scope impacted` could not stand in for it: it widened to most of the tree and was
stopped at 89 minutes on the Mac.

**Lesson:** At each story's review close, grep `test/` (and `test/arch` first) for every changed or
removed path and export, and run every suite that names one, before the story moves to in-review.
A new module that spawns a process owes the execution kernel's table and the runtime audit on day one.

**Refs:** VERIFICATION `@finding-F-172-02` to `@finding-F-172-08`, `@finding-F-172-12`; REGRESSION row at 8a810a8; m171/R2.

## R2 · The near-miss recall ran after the build in three stories of five

**Kind:** mistake · **Area:** process · **Stage:** build · **Owner:** developer · **Raised by:** developer · **Recurs:** 167/02/R2 · **Promoted to:** none

**What happened:** 172/01, 03 and 04 ran their near-miss recall at the review close instead of at
the lane's start. Each recorded it with its real time. The lessons it returned had already been
honoured, so it changed nothing this time.

**Why:** In a solo walk the recall reads as part of the review and is reached there, after the
code is written.

**Lesson:** Run the near-miss recall as the lane's first step, before the first file is opened; a
recall after the build can confirm a lesson but can no longer prevent the mistake it names.

**Refs:** STATE `## Feedback (for retro)` (172/01, 172/03, 172/04 closes).

## R3 · A suite that runs the CLI over the whole stream outgrew its 1 MB spawn buffer

**Kind:** near-miss · **Area:** code · **Stage:** verify · **Owner:** verifier · **Raised by:** verifier · **Promoted to:** none

**What happened:** The Windows gate at 0a4fb09 was red on one unit alone:
`work/this-tree-holds-what-is-live` ran `aof work doctor --json` over a copy of the stream, the output
reached 1,052,110 bytes against `spawnSync`'s 1,048,576 default, and the child was killed with
`ENOBUFS`. The assert reported "the CLI ran" with empty stderr, which named no cause.

**Why:** The suite set no `maxBuffer`, and doctor's output grows with every item and every aged
lesson in the stream. It was green at 8a810a8; the verify's own records pushed it over.

**Lesson:** A suite that spawns a CLI over the real stream sets `maxBuffer` the way the repo's git
readers do (64 MB), and a `status: null` with empty stderr is read as a kill (signal or `error.code`)
before anything else.

**Refs:** VERIFICATION `@finding-F-172-15`; REGRESSION rows at 0a4fb09 (red) and 4e7d2fe (green).

## R4 · The Mac could not host a green gate, and a full run was spent learning that

**Kind:** blocker · **Area:** process · **Stage:** verify · **Owner:** verifier · **Raised by:** verifier · **Promoted to:** none

**What happened:** The first whole-tree gate ran on the Mac (43 minutes, red). Beside 172's two reds
it carried environmental reds that cannot pass there: seven `/var` against `/private/var` tmpdir cases,
the gpg keyring lock, Node 24's spec reporter and three timing-bound fixtures. The gate moved to the
Windows control node, which meant quitting the desktop app so `:4182` was free.

**Why:** The verify started on the machine it happened to be on, and the gate's host was not chosen
until the first red showed which reds the host itself caused.

**Lesson:** Choose the gate's host before the first run: the Windows control node, with the desktop
app quit, is where the whole tree has run green; a Mac gate is red on F-172-11 and F-172-14 whatever
the code is.

**Refs:** VERIFICATION `@finding-F-172-11`, `@finding-F-172-14`; REGRESSION row at 8a810a8.

## R5 · The `@uat` fix changed what the notice said and kept the bar the operator objected to

**Kind:** mistake · **Area:** code · **Stage:** verify · **Owner:** verifier · **Raised by:** operator · **Promoted to:** none

**What happened:** At 02's `@uat` the operator asked why Publish showed a block to paste rather than
something simpler. The fix (F-172-16) removed the block and kept the full-width notice bar under the
header. The operator's answer was that a confirmation belongs in a toast, not in a bar that takes
vertical room (F-172-17), and the milestone was approved with that left open.

**Why:** The fix answered the words of the question (what is shown) and not the complaint behind it
(the surface spends layout on a passing confirmation); the notice's form was taken as given.

**Lesson:** When an operator objects to a surface at `@uat`, name the form as well as the content
(bar, toast, modal, inline) and propose the change to both before building; a passing confirmation
should take no layout room.

**Refs:** VERIFICATION `@finding-F-172-16`, `@finding-F-172-17`.
