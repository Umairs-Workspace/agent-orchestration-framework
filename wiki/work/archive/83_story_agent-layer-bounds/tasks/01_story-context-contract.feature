@cli @work @validate
Feature: A story declares what it reads and what it writes, and validate holds the declaration to account

  THE WHITELIST BELONGS ON THE STORY BECAUSE THAT IS THE ONLY PLACE WITH BOTH THE KNOWLEDGE AND THE
  SCOPE. In the phase prompt it is generic; in the milestone it is the document we are trying to stop
  reading; in the agent file it cannot vary per story. `reads:` is authored at refine, when the
  architect has just done the work of deciding which prior art the story rests on — a decision that
  was previously made and then thrown away.

  `reads:` IS THE READ SET, `files:` IS THE WRITE SET, AND THEY MAY OVERLAP. A file being edited is a
  file being read. Both are project-root-relative with forward slashes, so sibling write sets compare
  exactly (which is what task 02 consumes). A document section is named `path#anchor`, never as the
  whole document.

  VALIDATE CHECKS THE DECLARATION, NOT THE PROSE. The two sets differ in what can be asserted about
  them: a `reads:` entry names something that must already exist to be read, so a missing path or a
  drifting anchor is a finding. A `files:` entry names something the story MAY write, which by
  definition need not exist yet — so its only check is that it stays inside the project.

  AN UNTOUCHED SCAFFOLD IS NOT AN AUTHORED CONTRACT. The template ships both sets empty for refine to
  replace, so a story created and never refined declares "I read nothing and write nothing" — which
  passes `aof:continue`'s missing-reads stop and tells task 02's partition that the story is safe to
  run beside every sibling. Both-present-and-empty is therefore the one shape validate names, and it
  names it as the scaffold it is. A doc-only story still READS something, so an authored `reads:` is
  what separates a real empty write set from an untouched one.

  ABSENT IS VALID HERE AND A STOP THERE, AND THE ASYMMETRY IS DELIBERATE. `aof work validate` is a
  structural gate over a stream of 221 stories authored before this field existed; making absence a
  finding would red the whole stream for a field none of them could have carried. `aof:continue`
  stops on an absent `reads:` because a reviewer with no read set works blind, and a soft fallback to
  "read the milestone" means no story ever migrates.

  Background:
    Given a story record whose frontmatter may declare reads and files

  @executable
  Scenario: the story template ships both declarations, empty
    When I read the story template in the bundle
    Then it declares an empty inline reads list
    And it declares an empty inline files list

  @executable
  Scenario: a well-formed declaration naming existing paths and a resolving anchor validates clean
    Given reads naming an existing project file and an existing ARCHITECTURE.md ADR anchor
    And files naming both an existing file and one the story has not created yet
    When I run validate over the story
    Then it reports no reads or files finding

  @executable
  Scenario Outline: a declaration that cannot be honoured is reported
    Given a story whose <field> declares <entry>
    When I run validate over the story
    Then it reports <finding>

    Examples:
      | field | entry                            | finding                                        |
      | reads | a path that does not exist       | the reads path does not exist                  |
      | reads | a document anchor that has drifted | the reads anchor does not resolve            |
      | reads | a scalar instead of a list       | the declaration must be an inline or block list |
      | files | a path that escapes the project root | the entry must resolve inside the project  |
      | reads | a path written with backslashes  | the entry must use forward slashes             |
      | files | an entry naming a section anchor | the entry must not name a section anchor       |

  @executable
  Scenario: an entry carrying a YAML comment is read as the path, not the comment
    Given a declaration whose entry ends in a trailing YAML comment
    When I read the declaration
    Then the comment is discarded and the path stands
    And a `path#anchor` entry is untouched, because an anchor opens no comment

  @executable
  Scenario: a scaffold refine never replaced is named as such
    Given a story declaring an empty reads list and an empty files list
    When I run validate over the story
    Then it reports that the story declares neither, and sends the author to refine
    And a story declaring reads but an empty files list reports nothing, because writing nothing is a real claim

  @executable
  Scenario: a story that declares neither field stays valid
    Given a story record authored before the field existed
    When I run validate over the story
    Then it reports no reads or files finding

  @executable
  Scenario: the authoring paths populate what the template leaves empty
    Given the refine, add-story and assimilate-code command prompts
    When I read each one
    Then refine instructs the author to declare reads and files at breakdown and at story refine
    And add-story states that the empty sets are intentional until refine replaces them
    And assimilate-code derives files from the captured diff

  @executable
  Scenario: the build lane is scoped to the declaration
    When I read the continue command's story lane and the aof-developer agent
    Then both instruct the agent to read exactly the story's reads set and its task features
    And it stops the lane when reads is absent
    And it forbids reading the milestone ARCHITECTURE, DESIGN or STATE in full

  @manual
  Scenario: an agent that must read outside the declared set reports the gap rather than working blind
    Given a story under build whose reads set omits a file the work genuinely needs
    When the agent reads that file
    Then it completes the work
    And its report names the read set as incomplete, so refine can repair it
