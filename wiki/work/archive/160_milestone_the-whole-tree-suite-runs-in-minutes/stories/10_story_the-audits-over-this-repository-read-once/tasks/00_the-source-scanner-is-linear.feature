Feature: The source scanner is linear
  The comment stripper and the string blanker decide whether a slash opens a regex by looking back
  from where they are, never by copying and scanning everything before it. Their output does not
  change by a byte.

  @executable @cli @work @work-stream
  Scenario: The output is unchanged over the whole test tree
    Given every ".mjs" file under "test/" with its line endings normalised
    When each is stripped and blanked by the scanner
    Then every output equals, file by file, what the previous scanner gives, kept in the control as its oracle

  @executable @cli @work @work-stream
  Scenario Outline: A slash is read as a regex or a division by what comes before it
    Given the source "<source>"
    When it is stripped of comments
    Then the text "<kept>" is kept

    Examples:
      | source                                         | kept                     |
      | const a = b / c; // note                       | const a = b / c;         |
      | const r = x.replace(/\s+$/u, ""); // trim      | /\s+$/u                  |
      | if (ok) return /a\/\/b/u.test(s); // check     | /a\/\/b/u                |
      | value   /   2 // half                          | value   /   2            |
      | yield /x/; // after a keyword                  | yield /x/;               |
      | const half = thisIsAVeryLongIdentifierThatRunsPastSixtyFourCharactersAndEndsWithin / 2; // note | EndsWithin / 2; |

  @executable @cli @work @work-stream
  Scenario: The regex test never reads the prefix it was handed
    Given the scanner's module source
    When the regex test's body is read
    Then it looks back from an index over whitespace and one identifier
    And it neither copies the text before that index nor runs a pattern anchored at its end

  @manual @cli @work @work-stream
  Scenario: The scanner's readers on the control node
    Given AOF_GLOBAL_HOME isolated
    When the whole test tree is stripped and blanked, and "acd-control-derives-its-census" and "acd-source-directory-budget" are each run alone through the shard entry, before and after this story
    Then VERIFICATION records each time, and every case passes in each run
