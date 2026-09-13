@docs @assets @distribution
Feature: The published graph page is projected from the committed artefact, and a stale one never deploys

  `aof work loops document --write` renders `wiki/work/loops.md` — the Mermaid diagram of every
  declared node and edge, plus the health census. That artefact is the honest one because it is
  projected from the registry rather than described from memory, and story 79 already built the
  drift check that holds it current: `test/arch/loop/acd-loop-document-current.test.mjs` regenerates
  through the registered command's bare face and compares the bytes.

  So the site must not copy it. A copy is true on the day it merges and quietly wrong within a
  milestone, which is this story's own defect committed one level up.

  **THE MEASURED CONSTRAINT THAT DECIDES WHERE THE BUILDER LIVES.** The delivered drift check's last
  entry walks `src/` for `loopDocumentPath`, `LOOP_DOCUMENT_BASENAME` or a literal `loops.md`, and
  asserts the reader set is exactly `["src/commands/loop-document.mjs", "src/loop-document.mjs"]` —
  *"read by its own two modules and by no lifecycle, doctor or acceptor door"*. A site builder placed
  in `src/` reddens a delivered control on arrival. The walk is over `src/` only, so a builder under
  `scripts/` may import `loopDocumentPath` freely, which is also where this repository already keeps
  its build and release scripts. That is the whole placement argument, and it is a criterion below
  rather than a note, because the alternative reads as an arbitrary preference until somebody moves
  the file and the suite reds for a reason nothing states.

  **THE ONE HOME IS REACHED, NEVER RESPELLED.** The builder takes the path from `loopDocumentPath`
  and spells no basename of its own. A second spelling is what makes a rename break a build far from
  its cause, and `src/loop-document.mjs` exists precisely so there is one.

  **THE GATE IS THE DELIVERED CHECK, RUN — NOT A SECOND ONE, WRITTEN.** CI reruns story 79's control
  through the project's own selection path. A `git diff` re-implementation in YAML would be a second
  decider answering the same question, free to disagree with the first, and this repository refuses
  that shape everywhere else.

  **NARRATIVE AND PROJECTION ARE STAGED THE SAME WAY AND GOVERNED DIFFERENTLY.** The PRDs are prose
  nobody regenerates; the graph document is a build artefact with a command that produces it. Mixing
  their update rules is how the drift gate ends up disabled six weeks later, so each published page
  states which kind it is and where it came from.

  **MERMAID DOES NOT RENDER ITSELF ON PAGES.** GitHub renders Mermaid in repository Markdown; Jekyll
  does not. Kramdown emits a fenced ```mermaid block as `<pre><code class="language-mermaid">`, so
  the layout must promote those nodes before running Mermaid over them. Deciding this at refine is
  cheaper than publishing a page of unrendered fenced code and discovering it on the live site.

  @executable
  Scenario: the builder is reachable from no path the delivered reader-set control walks
    Given the repository tree after this change
    When `src/` is walked for `loopDocumentPath`, `LOOP_DOCUMENT_BASENAME` or a literal `loops.md`
    Then the reader set is exactly `src/commands/loop-document.mjs` and `src/loop-document.mjs`
    And the site builder is not a member of it
    And story 79's control passes unedited

  @executable
  Scenario: the builder takes the document's path from its one home
    Given the site builder's source
    When its imports and its literals are read
    Then it obtains the document's path from `loopDocumentPath`
    And it spells no basename of the document
    And it composes no part of the document itself

  @executable
  Scenario: no copy of the graph document is committed
    Given the repository tree after this change
    When every tracked file under `docs/` is read
    Then none of them carries the graph document's committed bytes
    And none of them is produced by the site builder

  @executable
  Scenario Outline: every published page states where it came from and how it is kept true
    Given the staged site after a build
    When the page projected from `<source>` is read
    Then it names `<source>` as its source
    And it declares itself `<kind>`
    And it <remedy>

    Examples:
      | source                                     | kind      | remedy                                                |
      | wiki/work/loops.md                         | generated | names `aof work loops document --write`               |
      | wiki/planning/PRD-acd-loop-engineering.md  | authored  | names no regeneration command                         |
      | wiki/planning/PRD-graph-engineering.md     | authored  | names no regeneration command                         |

  @executable
  Scenario: an authored page is published as authored
    Given a staged page projected from a planning PRD
    When its body is compared with the source file's body
    Then they are identical
    And the only bytes the build added are the page's front matter, its provenance, and the Liquid guard that keeps the body as authored
    And that guard is `{% raw %}` opening the body and `{% endraw %}` closing it, and nothing else

  @executable
  Scenario: a staged source that is not there fails the build
    Given a build whose staging manifest names a file that does not exist
    When the build runs
    Then it exits non-zero
    And the failure names the missing path
    And no page is staged for it
    And no partially staged site is left for the deploy step to publish

  @executable
  Scenario: the build writes only into the directory it stages
    Given a build run over this repository
    When the files it created or modified are compared against the tree before it ran
    Then every one of them is inside the staged site directory
    And `wiki/work/loops.md` is left byte-identical
    And no file under `docs/` is modified

  @executable
  Scenario: the build is a projection, so running it twice changes nothing
    Given a build that has already run
    When it runs a second time over an unchanged tree
    Then the staged site is byte-identical to the first run's

  @executable
  Scenario: the deploy is gated on story 79's control, run rather than re-implemented
    Given `.github/workflows/pages.yml`
    When its gate job is read
    Then it runs `test/arch/loop/acd-loop-document-current.test.mjs` through the project's own test command
    And it holds no comparison of the document's bytes of its own
    And it holds no regeneration of the document
    And the run is isolated by `AOF_GLOBAL_HOME`, so it writes no fixture into a real `~/.aof`

  @executable
  Scenario: a registry edit without regeneration stops the deploy
    Given a commit in which a loop record changed and `wiki/work/loops.md` was not regenerated
    When the workflow runs
    Then the gate job fails
    And the failure names the document and `aof work loops document --write`
    And the deploy job does not run

  @executable
  Scenario: the Mermaid include is pinned and targets what kramdown actually emits
    Given `docs/_layouts/default.html`
    When its Mermaid include is read
    Then it names an exact version, never a floating tag
    And it selects the fenced-block shape kramdown emits for a ```mermaid fence
    And it promotes those nodes before Mermaid is run over them

  @uat
  Scenario: the graph renders as a diagram on the published page
    Given the published graph page
    When it is opened in a browser
    Then the loop graph is drawn as a diagram
    And no block of Mermaid source is shown as text
    And the health census above it reads as a table
