@cli @work @work-stream
Feature: A span-scoped answer reports only the driver the span names

  A SPAN ALWAYS NAMES EXACTLY ONE DRIVER, AND IT IS ALREADY PARSED. `skippedEntries` treats a span as
  an un-named scope because its `namedDriver` test is an exact top-level ref match, so it falls back
  to reporting every held driver in the stream. That fallback is documented as an accepted nuisance
  for `NN-MM` ranges, where "we cannot tell which driver you meant" is honest. For a span it is not
  honest: the driver is sitting in the parsed scope.

  THE VISIBLE SYMPTOM IS A FINISHED SPAN THAT READS AS BLOCKED. When the skipped list is non-empty the
  face renders `held` instead of `done`, so a completed `44/01-03` reports `Nothing free in 44/01-03 —
  everything actionable is being worked elsewhere: 12 …` naming a driver the operator never asked
  about. Observable only with mesh item-locks active, which is why no test caught it.

  ONE PREDICATE, NOT A SECOND VOCABULARY. The command face parses scope with its own rules today; the
  fix shares the span's driver with the walk's notion of it rather than adding a fifth parser.

  THE SEAM IS AN EXPORT, AND IT IS ADMITTED. `parseStorySpan` is module-private in `src/work.mjs`;
  `src/commands/next.mjs` reaches the stream through `src/work-read.mjs` and imports `work.mjs` not at
  all. Sharing the predicate means EXPORTING `parseStorySpan` and importing it into `next.mjs` —
  an export costs `work.mjs` no new import, so the ADR-015 §5 reach ceiling this story's scope declares
  out of bounds is untouched. `acd-cache-read-surface-boundary` admits the new edge: it forbids a
  control-side module importing the four DISK READER symbols (`listItems`, `findWork`, `nextWork`,
  `listStream`) from `work.mjs`, and a parser is none of them. Do not route the predicate through
  `work-read.mjs` to avoid the import, and do not re-derive the span shape in the command.

  @executable
  Scenario: a finished span with an unrelated driver held elsewhere answers done
    Given a span whose stories are all done
    And an unrelated driver is held by another node
    When the span is asked for what is next
    Then it answers that the span is done
    And it does not name the unrelated driver

  @executable
  Scenario: a span whose own driver is held reports that driver
    Given a span whose own driver is held by another node
    When the span is asked for what is next
    Then it reports that driver as held
    And it names the holder

  @executable
  Scenario: a driver range keeps its documented over-reporting
    Given a driver range scope and a held driver outside it
    When the range is asked for what is next
    Then it still reports the held driver, as it did before this change
