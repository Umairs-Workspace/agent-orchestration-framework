@docs @work @work-stream
Feature: The continue prompt's span branch is pinned by a test

  A MANIFEST HASH DETECTS A CHANGE, NOT THE ABSENCE OF A CLAIM. `src/bundle/manifest.json` carries a
  sha256 of `continue.md`, so deleting the span branch and regenerating the manifest leaves every test
  green. Half of story 84's deliverable is that prompt, and nothing asserts it exists.

  THE PATTERN ALREADY EXISTS ON THIS EXACT FILE. `test/work-dispatch-lanes.test.mjs` lane
  `dispatch/02` reads `continue.md` and asserts both presence and absence of specific prose. This task
  reaches for it rather than inventing a mechanism.

  THE SHAPE IS BORROWED; THE HOME IS THE SPAN'S OWN. The discharge condition names dispatch/02's
  SHAPE, not its file. The lane lands in `test/work-story-span-scope.test.mjs` — the span's declared
  home, already registered in `scripts/test.mjs`, and the file `parseStorySpan`'s own comment points
  at for the span argument. `work-dispatch-lanes.test.mjs` is a READ here, not a write: it is the
  worked example, and this story does not declare it writable.

  THE ASSERTIONS MUST BE CALLABLE OVER TEXT, because the third scenario applies them to a mutated
  copy. Factor them into one function taking the prompt's text, then call it twice — once on the
  shipped file, once on a copy with the span branch cut out, expecting the second to throw.

  ASSERT THE OBLIGATIONS, NOT THE WORDING. The three differences the span branch states are
  behavioural obligations an agent must obey; pinning exact sentences would make every copy-edit a
  test failure. Pin that each obligation is stated, in the shape the existing lane uses.

  @executable
  Scenario: the shipped prompt carries a span dispatch branch
    When the shipped continue prompt is read
    Then it dispatches on a story span as well as on an item type
    And it scopes the walk to the span rather than to the bare milestone

  @executable
  Scenario Outline: each of the span branch's obligations is stated
    When the shipped continue prompt is read
    Then it states <obligation>

    Examples:
      | obligation                                                |
      | that the ref is never widened to the milestone mid-walk   |
      | that an out-of-span dependency stops the walk             |
      | that the milestone status is neither moved nor accepted   |

  @executable
  Scenario: the pin is non-vacuous
    When the span branch is removed from a copy of the prompt
    Then the assertions fail
