# 192/02 · The gated prose leaves core — build plan

## Mechanism

This story is a cut and a paste, done nine times, and a registration. For each slot in the table
of ADR-005 §2: cut the passage out of the Claude source, put the slot's marker on its own line in
its place, and paste the passage as that slot's section of the practice's fragment file for the
target. Then do the same to the Codex text of the same member, into the Codex fragment file.
Never retype a passage and never copy the Claude one into the Codex file: the two differ on the
question tool and the command names, and those differences are the Codex body.

Mind the two shapes. A block slot keeps a blank line above and below its marker; an inline slot
sits directly under the line it continues. Where a passage began or ended mid-line, break the
line at the sentence: the render may differ from today's in line breaks and nowhere else, apart
from the two seam edits the ADR lists.

The registration follows the teaching package's pattern exactly: a contribution leaf that
imports nothing, the package's bundle fragment, an export and the assets folder in its package
file, and one more entry in the practices registry. The build brief has no package: declare its
practice and its fragment in core's own bundle descriptor.

Then render. Regenerate the shipped manifest, which is the render with nothing on. Run the
update in this checkout, which has both keys on, and commit what it writes.

## Verification step

Before touching a source, save this checkout's rendered refine command, its Codex skill's two
files and the three briefs for each runtime. After the move and the update, compare each pair
with whitespace collapsed. The only differences allowed are the Contract's opening clause and
the Codex entry's split sentence. Record the comparison in the milestone's verification
document; it is this story's manual check. Then render a scratch project with nothing on and
search its refine command for the example map and the build brief: nothing.

A wrong build shows as a sentence missing or doubled in that comparison, as Claude's wording in
a Codex file, or as a discovery word in the scratch project's command.

## Out of scope

- The developer brief, the manual command, continue and verify — conditional on a file, or left
  for later by the SPEC.
- The sentence about a map token in the Codex execution contract — ungated, in 45 copies.
- The templates — still installed everywhere.
- Rewording anything. A sentence that reads badly today reads badly tomorrow.

## Known traps

- A suite that reads a source by path now finds a marker where it expected a passage, and a
  control that sweeps the sources no longer sees the passage at all. The second kind passes
  silently. Find both by the phrases, not by waiting for red.
- The discovery beat sits inside a list item, indented two spaces. Paste it with its indentation
  or it falls out of the story Contract's bullet.
- The Codex refine body is the procedure section of the Codex workflow file, and the entry is a
  different section of the same file. The entry's slot has no Claude twin.
- The control that holds every number in a prompt to a home in code must be pointed at the
  fragment files, or the driven-session paragraph's numbers go unheld.
- Run the update with this tree's own CLI entry, not the `aof` on PATH. That one is linked to
  another checkout and would render from its sources, which still hold the passages.
- This checkout's lock is rewritten by the update. 192/03 writes it again, which is why that
  story waits for this one.
