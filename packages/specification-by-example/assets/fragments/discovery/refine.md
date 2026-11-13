<!-- fragment:contract.discovery -->
  Discovery comes first, and ONLY when the project has turned it on: read `work.examples.enabled`
  from `.aof/aof.config.json`. It defaults to **off**, and only the boolean `true` turns it on —
  absent, `false` or any other value (the string `"true"` included) is off. When it is off, write
  no `EXAMPLES.md`, ask no question, and author the Contract exactly as the rest of this section
  says; nothing else in the Contract changes. When it is on, before any `.feature` exists:

  - **The PO drafts the example map** — one `EXAMPLES.md` in the story's own folder, from the
    story's user story and the milestone SPEC. It holds the rules, two or three key examples per
    rule with real values including the awkward edge, and every question the PO cannot answer from
    the record. Its form is the template at `.aof/templates/work/story/EXAMPLES.md`; copy that,
    never a grammar from memory. Every example the PO writes is `proposed`, and only a person's
    recorded answer makes one `confirmed` or `stated`. A story with no rule a person owns
    declares the map not applicable in one line, as the template shows.
  - **Which answer licenses which label.** An example's `confirmed` is written only after the
    person's recorded answer to the example's own token, `<story ref> E<n>`. An example's
    `stated Q<n>` and a question's `answered` are written only after the person's recorded answer
    to the question's token, `<story ref> Q<n>`.
  - **The architect reviews every question the PO labelled `technical`**, and relabels one that is
    really policy as `business`. A technical question may take a documented default, recorded as
    `defaulted <pointer>`; a business question never does.
  - **Strike before asking.** Before any question reaches a person, strike every one the record
    already answers (the story's user story, title and Notes, the SPEC, the ADRs), and relabel
    every engineering choice `technical`. A map with no business question left is a good outcome.
    Each question that remains carries the context the person needs to answer it (what was
    measured, and what each option costs), in the person's terms, never an internal name or number
    they were not given.
  - **The main session asks** each business question through `AskUserQuestion`, in solo and in
    orchestrated mode alike: a spawned agent drafts and returns its questions, it never asks them.
    Each question opens with its token — `<story ref> Q<n>`, or `<story ref> E<n>` when a
    proposed example is put to the person to confirm. Worked, for story 7/2:
    `7/2 Q1 · Does a reserved book count toward the five?` and
    `7/2 E2 · Is a sixth loan refused while five are out?`. The token goes at the head of the
    question text, never in its header, and one call carries at most four questions. The agent
    writes the answer into the map, but it is the harness's record of the answer, not the map,
    that makes the label hold.
  - **In a driven session, one question per ask.** A driven session is one whose environment
    carries `AOF_RUN_ID`: a loop drives it, and its `AskUserQuestion` call becomes the loop's ask.
    The session stops, the question is posted, and the answer comes back when it resumes. One ask
    carries one answer text, so in a driven session each `AskUserQuestion` call carries exactly one
    question; the at-most-four rule above is the interactive session's. The question opens with its
    token, then names itself a discovery question, the rule it bears on as `R<n> · <rule>`, and the
    example it would settle, or that it would add a new one. All of that goes on its first line,
    which is what the loop's one-line account and its Discord preview show. Worked:
    `7/2 Q1 · Discovery question — rule R1 · A member may hold at most five loans; settles E2.`
    Then come the loop's four lines, `Decision needed:`, `Options:`, `I would pick:` and
    `What the answer changes:`, under 1,500 characters, with the options also given as the tool's
    options. Mark the question `asked` before the call. A business question is never given a
    default in a driven session, and is never sent as the NEEDS_INPUT sentinel, whose free text has
    no option list; a technical question still takes its documented default. The answer arrives as
    the next input of the resumed session: write it into the map (the question `answered`, and its
    example `stated Q<n>` or `confirmed`), then run `aof work doctor <story> --json` as the next
    bullet says. A question parked unanswered leaves the story at the Contract gate, with no
    `tasks/` written.
  - **Then ask the doctor.** Once the questions are asked, run `aof work doctor <story> --json`.
    Any error-severity `example-*` finding stops the Contract stage before the first headline
    Scenario, and no `tasks/` is written; settle the map and run it again. A warn does not stop
    the stage.

<!-- fragment:contract.formulation -->
  **With an applicable example map, formulate from it.** This holds only when the discovery beat
  above ran and the map is not declared not applicable. Otherwise formulation is exactly as this
  paragraph says without it: no `Rule:` block and no example id is asked for. The PO reads the map
  first. It writes one `Rule:` per map rule, titled with the rule's id and text
  (`Rule: R1 · A member may hold at most five loans`), and under it one headline Scenario per key
  example, titled with the example's id and its outcome
  (`Scenario: E2 · a sixth loan is refused while five are out`). QA writes its outlines inside the
  rule they test, and a row that restates a map example carries the example's id in a column
  headed `example` (a row `| E3 | 5 |` under `| example | loans |`). Where a map example and a
  table row say the same thing, the key example stays the headline Scenario and the table keeps
  only the edges. Every `confirmed` or `stated` example must be carried this way, under its own
  rule: `aof work doctor` reports one that is not as `example-untraced`, and continue refuses the
  build until it is restored. A project whose runner does not bind `Rule:` writes one feature per
  rule instead, titled with the rule's id (`Feature: R1 · …`) and holding no `Rule:` line.

<!-- fragment:autonomous.milestone -->
  When `work.examples.enabled` is on, a business-rule
  question from a story's example map never takes a default. The cascade runs the discovery beat for
  every story, and authors a story's Contract only when its map has no open business question. Every
  open business question from every story is asked at the single end review, through
  `AskUserQuestion`, as a question and never as a default, each carrying its map token (an
  interactive cascade asks in batches of four; in a session whose environment carries
  `AOF_RUN_ID`, each call carries one question, and each such question is its own ask and its own
  wait, one after another). An answered question is written into its story's map, and the contracts the answers
  unblock are authored inside that same stop, each once its story passes the beat's doctor stop. A
  question the person does not answer — deferred by the person, or refused by the harness — leaves
  its story at the Contract gate with no `tasks/` written; the other stories go on.

<!-- fragment:output.autonomous -->
When `work.examples.enabled` is on, it lists the business questions asked and their answers apart from
the default decisions taken, and names each story a deferred question left at the Contract gate.
