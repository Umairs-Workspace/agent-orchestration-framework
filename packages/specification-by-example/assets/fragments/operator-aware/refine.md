<!-- fragment:config.roles -->
When `work.examples.enabled` and `work.examples.operatorAware` are both `true` and the operator's
profile is declared, read its role from `aof project show --json` (`operator.role`): every PO and
researcher prompt the session writes opens with the operator's role, the Decide stage's researcher
included, and a solo session holds the role while it plays those roles.

<!-- fragment:contract.discovery -->
  Discovery comes first, and ONLY when the project has turned it on: read `work.examples.enabled`
  and `work.examples.operatorAware` from `.aof/aof.config.json`. Each defaults to **off**, and only
  the boolean `true` turns one on — absent, `false` or any other value (the string `"true"`
  included) is off. When `work.examples.enabled` is off, write no `EXAMPLES.md`, ask no question,
  and author the Contract exactly as the rest of this section says; nothing else in the Contract
  changes. When it is on and `work.examples.operatorAware` is not, this command was rendered before
  the switch was turned off: skip the research step, the batch and every `Background:` line below,
  ask every `domain` question as a `policy` one is asked, and tell the operator to run
  `aof work update`. When both are on, before any `.feature` exists:

  - **The PO drafts the example map** — one `EXAMPLES.md` in the story's own folder, from the
    story's user story and the milestone SPEC. It holds the rules, two or three key examples per
    rule with real values including the awkward edge, and every question the PO cannot answer from
    the record. Its form is the template at `.aof/templates/work/story/EXAMPLES.md`; copy that,
    never a grammar from memory. Every example the PO writes is `proposed`; only a person's
    recorded answer makes one `confirmed` or `stated`, and only a finding that names its source
    makes one `researched`. A story with no rule a person owns declares the map not applicable in
    one line, as the template shows.
  - **The PO labels every question `domain`, `policy` or `technical`.** A `domain` question is a
    fact about the world, which a source can settle: a law, a standard, what is normal in the
    industry. A `policy` question is a choice only the operator or their client can make. A
    `technical` question is an engineering choice. A question the PO cannot place is `domain`, so
    it is looked up before anyone is asked. A map written with `business` still reads, as `policy`.
  - **Which answer licenses which label.** An example's `confirmed` is written only after the
    person's recorded answer to the example's own token, `<story ref> E<n>`. An example's
    `stated Q<n>` and a question's `answered` are written only after the person's recorded answer
    to the question's token, `<story ref> Q<n>`. A question's `researched F<n>`, and an example's
    `researched F<n>`, are written only when finding `F<n>` in the research document names its
    source.
  - **The architect reviews every question the PO labelled `technical`**, and relabels one that is
    really a fact about the world as `domain` and one that is really a choice as `policy`. A
    `technical` question may still take a documented default, recorded as `defaulted <pointer>`; a
    `policy` question is asked of a person and never takes a default.
  - **Strike before asking.** Before any question reaches a person, strike every one the record
    already answers (the story's user story, title and Notes, the SPEC, the ADRs), and relabel
    every engineering choice `technical`. A map with no `policy` question left is a good outcome.
    Each question that remains carries the context the person needs to answer it (what was
    measured, and what each option costs), in the person's terms, never an internal name or number
    they were not given.
  - **Read who is being asked.** Read the operator's profile once per refine, from
    `aof project show --json` (`operator`: whether it is declared, the role, and each domain's
    level); never read the config files for it yourself. Read the item's domains from `domains:` in
    the record doc's frontmatter (the milestone's `SPEC.md`, or a standalone story's `STORY.md`).
    When the record doc names none, the PO adds `domains:` to its frontmatter, reusing the
    profile's own domain names where one fits. These are subject areas the operator may or may not
    know, not the feature-area tags of `work.tags.domains`. An undeclared profile makes every
    domain `new`, and so does a domain the profile does not list. The PO attributes each `domain`
    question to one of the item's domains; one it cannot attribute takes the lowest level among
    them, and `new` when the item names none.
  - **Research a fact before anyone is asked.** The level of its domain decides what happens to a
    `domain` question: at `expert` it is asked directly, with no research — asked of the operator
    by its token, it closes `answered`, and its examples are `stated Q<n>`; at `working` it is
    researched, then confirmed in the batch, briefly; at `new`, or in a domain not listed, it is
    researched, then put in the batch with background first. So a `domain` question whose domain
    the operator knows at `working` or `new` goes to the researcher before any person is asked. The
    domain questions of every story being refined go to the researcher together, in one pass: in
    orchestrated mode that is one `aof-researcher`, never one per story, and in solo mode the
    session plays the researcher itself. Only that pass writes findings into the research document
    (the milestone's `RESEARCH.md`, or a standalone story's own), each in the form the template at
    `.aof/templates/work/milestone/RESEARCH.md` shows. A finding that settles its question makes
    it `researched F<n>`, and the examples it supports are labelled with the same finding,
    `researched F<n>`; such a question is not put to the operator as a question of its own. A
    question no source settles, or whose sources disagree, or that the finding shows to be a
    choice, is relabelled `policy`, and asked with the finding as its background and a
    recommendation. A finding with no source settles nothing, and a finding is never a default.
  - **The main session asks** each `policy` question, and each `domain` question at `expert`,
    through `AskUserQuestion`, in solo and in orchestrated mode alike: a spawned agent drafts and
    returns its questions, it never asks them. Each question opens with its token —
    `<story ref> Q<n>`, or `<story ref> E<n>` when a proposed example is put to the person to confirm. Worked,
    for story 7/2: `7/2 Q1 · Does a reserved book count toward the five?` and
    `7/2 E2 · Is a sixth loan refused while five are out?`. The token goes at the head of the
    question text, never in its header, and one call carries at most four questions. Every
    question carries a line that begins `I would pick:`, naming one of the question's own options
    and why, in a clause, and the tool's first option is that pick, so the operator can confirm
    the pick or override it rather than answer cold; each option still says what it costs. Below
    `expert`, a line that begins `Background:` comes before it, under the question: what the term
    means, why it matters to this build, and what is normal in the industry, naming its source,
    and the finding when research ran. A question in a domain the operator knows at `expert`
    carries no `Background:` line, and still carries `I would pick:`. A `policy` question takes
    the level of the domain it bears on, and a question in a domain the profile does not list is
    treated as `new`. The pick is on every kind of question discovery asks: a question asked by
    its `Q<n>` token, a proposed example put to a person by its `E<n>` token, and the batch of
    researched examples. The agent writes the answer into the map, but it is the harness's record
    of the answer, not the map, that makes the label hold.
  - **What research settled comes back as one batch.** A story's researched examples are put to the
    operator as one question, never one question each, with the story's other questions. The
    question opens with the story ref and names itself the researched examples, as in
    `7/2 · Researched examples: what research settled for this story`, and carries no `Q<n>` or
    `E<n>` token: the anchor of a researched example is its finding, so the batch anchors nothing.
    It lists each example with its finding and that finding's source: at `working` each example
    comes as one line with its source, and at `new` each comes after a background line for its
    rule. Its `I would pick:` is no objection, and why. The operator answers that they have no
    objection, or names what is wrong. An example the operator objects to goes back to
    `proposed`, its question is relabelled `policy` and asked by its own token, and the other
    examples in the batch stand. A story whose map holds no researched example is asked no batch.
    In a session whose environment carries `AOF_RUN_ID`, the batch is one ask per story, asked
    after that story's `policy` questions, and a batch left unanswered leaves the story at the
    Contract gate, with no `tasks/` written, as an unanswered question does.
  - **In a driven session, one question per ask.** A driven session is one whose environment
    carries `AOF_RUN_ID`: a loop drives it, and its `AskUserQuestion` call becomes the loop's ask.
    The session stops, the question is posted, and the answer comes back when it resumes. One ask
    carries one answer text, so in a driven session each `AskUserQuestion` call carries exactly one
    question; the at-most-four rule above is the interactive session's. The question opens with its
    token, then names itself a discovery question, the rule it bears on as `R<n> · <rule>`, and the
    example it would settle, or that it would add a new one. All of that goes on its first line,
    which is what the loop's one-line account and its Discord preview show. Worked:
    `7/2 Q1 · Discovery question — rule R1 · A member may hold at most five loans; settles E2.`
    Below `expert`, a line that begins `Background:` comes after that first line and before
    `Decision needed:`. Then come the loop's four lines, `Decision needed:`, `Options:`,
    `I would pick:` and `What the answer changes:`, and the whole, background included, stays
    under 1,500 characters, with the options also given as the tool's options. Mark the question
    `asked` before the call. A `policy` question is never given a default in a driven session,
    and is never sent as the NEEDS_INPUT sentinel, whose free text has no option list; a
    `technical` question still takes its documented default. The answer arrives as the next input
    of the resumed session: write it into the map (the question `answered`, and its example
    `stated Q<n>` or `confirmed`), then run `aof work doctor <story> --json` as the next bullet
    says. A question parked unanswered leaves the story at the Contract gate, with no `tasks/`
    written.
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
  only the edges. Every `confirmed`, `stated` or `researched` example must be carried this way,
  under its own rule: a researched example is carried as an agreed one is. `aof work doctor`
  reports one that is not as `example-untraced`, and continue refuses the build until it is
  restored. A project whose runner does not bind `Rule:` writes one feature per rule instead,
  titled with the rule's id (`Feature: R1 · …`) and holding no `Rule:` line.

<!-- fragment:autonomous.milestone -->
  When `work.examples.enabled` and `work.examples.operatorAware` are both on, a `policy`
  question from a story's example map never takes a default. The cascade runs the discovery beat for
  every story, its research step included, as one researcher pass over every story's `domain`
  questions, and authors a story's Contract only when its map has no open `policy` question. Every
  open `policy` question from every story is asked at the single end review, through
  `AskUserQuestion`, as a question and never as a default, each carrying its map token and its
  `I would pick:` line, and each story's batch of researched examples is asked at that same end
  review, with that story's other questions (an interactive cascade asks in batches of four; in a
  session whose environment carries `AOF_RUN_ID`, each call carries one question, and each such
  question is its own ask and its own wait, one after another). The review surface lists what
  research settled, apart from the questions asked and the defaults taken. An answered question is
  written into its story's map, and the contracts the answers unblock are authored inside that same
  stop, each once its story passes the beat's doctor stop. A question or a batch the person does
  not answer — deferred by the person, or refused by the harness — leaves its story at the Contract
  gate with no `tasks/` written; the other stories go on.

<!-- fragment:output.autonomous -->
When `work.examples.enabled` and `work.examples.operatorAware` are both on, it lists the `policy`
questions asked and their answers, and what research settled (each researched example with its
finding), apart from the default decisions taken; names each story a deferred question or batch
left at the Contract gate; and, when the operator's profile is undeclared, names that gap and the
`aof work init-config --operator-role` command that closes it, in one line.
