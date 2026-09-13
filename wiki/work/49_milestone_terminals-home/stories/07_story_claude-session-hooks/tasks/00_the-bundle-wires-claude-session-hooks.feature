<!-- aof-generated: refine (Three Amigos — PO headline Scenarios, QA Examples + litmus) -->

# Task feature — STORY 49/07: the distributed bundle wires the Claude session
# lifecycle to `aof session start|ping|end`, so a workspace aof provisioned records
# Claude sessions the way it already records Codex ones. A WIRING gap, not a
# producer gap — no new CLI verb, no new record shape, no new stream.
#
# THE SEAM, read at source in this working tree (2026-08-13).
#   - THE PRODUCER LADDER, one door only. `startSession` (src/mesh-session.mjs:314)
#     and `pingSession` (:332) have exactly ONE production caller: the
#     `aof session start|ping|end` verb — src/commands/mesh-session.mjs:318, :323,
#     with `endSession` at :329 unlinking the record leaf
#     (src/mesh-session.mjs:361-367). The worker never writes a presence session
#     record directly; a board PTY writes to an unrelated pid registry
#     (`.aof/terminal-sessions.json`) that no index reads.
#   - THAT VERB FIRES ONLY FROM A HOOK IN THE CWD'S OWN CONFIG. So hook wiring —
#     not process origin — decides whether a session is ever recorded.
#   - THE BUNDLE WIRES IT FOR CODEX ONLY. src/bundle/bundle.json:12-14 declares
#     `codex-session-start`, `codex-session-prompt-ping`, `codex-session-stop-ping`,
#     all `runtimes: ["codex"]`. The ONLY `runtimes: ["claude"]` hook member is
#     `claude-artifact-sync` (:16, `PostToolUse`) with its asset sibling (:15) —
#     unrelated to session presence.
#   - THE TWO INSTALL DOORS ARE DIFFERENT AND BOTH ARE REAL. A codex hook member is
#     RENDERED whole-file into `.codex/hooks.json` (src/adapters.mjs:93, :121-130).
#     A claude hook member is SURGICALLY MERGED into the co-authored
#     `.claude/settings.json` — `loadBundleHooks` (src/work-bundle.mjs:54-56) →
#     `claudeHookDeclarations` (src/claude-settings.mjs:68-80) →
#     `claudeSettingsPatch` (:87-101) → `markedEntry` (:107-118), which stamps the
#     ownership marker `aofManaged` (:54) with the MEMBER ID, applied through
#     `applyClaudeSettingsMerge` (:299-301). adapters.mjs:99-108 states in terms
#     why `.claude/settings.json` is never whole-file rendered.
#   - THIS REPO IS A DOGFOODING ARTEFACT, NOT EVIDENCE. Its hand-authored
#     `.claude/settings.json` wires SessionStart/UserPromptSubmit/SessionEnd →
#     `aof session start|ping|end` with NO `aofManaged` marker on any entry. That
#     is why this repo has Claude session records and no other workspace does.
#
# WHAT THIS STORY DOES **NOT** CLAIM — hold this line; it is the story's own text.
#  - IT DOES NOT MAKE A CLAUDE SESSION **STREAM**. Being in the index is not being
#    fed. The relay's only feeder has exactly two call sites, both worker-execution
#    (src/mesh-launcher.mjs:1151, :1290), and this story adds none. An operator's
#    hand-run `claude` in a hook-wired workspace becomes a row that honestly says
#    nothing is streaming — it does NOT become a live terminal. No scenario below
#    may be read as promising bytes, and scenario 6 is the one that says so out
#    loud, in the only currency this story can pay in: the index entry's own
#    `workItem: null`.
#  - IT DOES NOT WIDEN THE RELAY'S PRODUCER COUNT. That property is pinned by the
#    fitness function `acd-terminal-output-signal-source` (ARCHITECTURE §Fitness
#    functions — the existing FLOOR of two gains a shrink-only CEILING naming
#    ADR-003). ARCHITECTURE names "the mirror has exactly two frame producers" as
#    an invariant that must NOT be written as Gherkin, so it is NOT restated as a
#    scenario here — it is named, owned and left where it belongs. If a builder
#    finds themselves adding a producer to make a pane light up, they have left
#    this story.
#  - IT DOES NOT DELETE OR RECONCILE THIS REPO'S HAND-AUTHORED
#    `.claude/settings.json` (ADR-005: "reconciling the two is a chore, not this
#    ADR's business") — deleting it mid-milestone would remove the one machine
#    that can demonstrate the feature.
#  - IT DOES NOT BUILD A DISTRIBUTION MECHANISM. A bundle member reaches an
#    existing workspace only via `aof work update`; a workspace that never updates
#    stays invisible to the terminals home. Expected, the bundle's normal path,
#    SAID IN THE HANDBACK — deliberately not a scenario.
#  - IT DOES NOT CHANGE THE WORKER'S SPAWN. mesh-worker-execution.mjs runs `claude`
#    with no `--settings` override; whatever hooks fire are the checked-out
#    worktree's own (ADR-005).
#
# ORDERING — NOT A SCENARIO, BUT BINDING. This story LANDS LAST, strictly after
# story 05 (SPEC's one hard sequencing rule; ARCHITECTURE bad cut 1). Every session
# these hooks newly record is a FREE session with no producer, so landing them
# before the honest feed rendering turns an empty grid into a grid of panes that
# will never receive a byte. Green tests here do not license landing.
#
# TRAPS A BUILDER WILL OTHERWISE HIT — all measured in this working tree today:
#  1. THE CODEX THIRD MEMBER IS **NOT** `SessionEnd → aof session end`. Measured:
#     `src/bundle/hooks/codex-session-stop-ping.json` is `{"event":"Stop", ...
#     "command":"aof session ping --assistant codex"}`. So "mirror the Codex three
#     exactly" and the PO's own `start|ping|end` headline CANNOT both be satisfied
#     for the third member. This contract follows the PO's explicit event/verb list
#     (SessionStart|UserPromptSubmit|SessionEnd → start|ping|end) — the triple this
#     repo's proven configuration uses, and the only one whose third member REMOVES
#     the record when a session closes rather than merely re-pinging it. The
#     divergence is a COLUMN in scenario 2's Examples so it is decided, not
#     accidental, and it is routed as a QA finding. The codex three are NOT edited
#     to "harmonise" — see scenario 3.
#  2. `test/bundle.test.mjs` IS ALREADY RED AT HEAD, BEFORE THIS STORY TOUCHES
#     ANYTHING. Measured by running the suite in isolation: 12 pass, 6 fail. Its
#     `HOOK_IDS` (:75) lists three and it asserts `byKind("hook") === 3` (:103),
#     while the descriptor carries FOUR hooks (the codex three plus
#     `claude-artifact-sync`) and a member kind `asset` its valid-kind list (:178)
#     does not admit. m43 added those members and did not move this list. So "add
#     three members and the membership gate goes green" is FALSE: it goes from
#     3-vs-4 to 3-vs-7. The list moves with the code (m46/ADR-006), and the
#     PRE-EXISTING drift is fixed in the same diff or explicitly routed.
#  3. THE SEA ASSET COUNT IS A HARD LITERAL.
#     test/bundle-asset-manifest-complete.test.mjs:47 asserts the real
#     `src/bundle/**` tree carries exactly 57 files (measured: it does). Three new
#     `src/bundle/hooks/claude-session-*.json` files make it 60. That literal moves
#     in the same diff or the suite goes red for the wrong reason.
#  4. `test/claude-settings-merge.test.mjs` IS DELIBERATELY BLIND TO THIS CHANGE:
#     it passes `ISOLATED = { bundleHooks: [] }` (:64). It is NOT the gate for the
#     new members and will not catch their absence. The real-bundle door is the
#     shape `test/artifact-sync-enqueue-hook.test.mjs:119` uses —
#     `applyClaudeSettingsMerge(dir, { name: "fresh" })` with NO project config, so
#     the declaration can only have come from the bundle.
#  5. THE ASSISTANT LABEL HAS A SILENT DEFAULT. src/commands/mesh-session.mjs:227
#     resolves `options.assistant ?? payload?.assistant ?? "claude-code"` when
#     identity came from a hook channel. The codex hooks pass `--assistant codex`
#     precisely to escape that default. A new claude hook that passes
#     `--assistant claude` would start writing a SECOND spelling of one runtime
#     beside this repo's existing `claude-code` records — two labels for one
#     assistant, on a wire the fleet groups by. Scenario 7 pins agreement rather
#     than a literal, so the builder must make them agree.
#  6. THE MARKER IS THE MEMBER ID (claude-settings.mjs:116). Renaming a member id
#     after release orphans the previously-installed entry: the next merge no
#     longer recognises it, leaves it, and adds a second. Ids are pinned in
#     scenario 2's Examples for that reason.
#
# ISOLATION IS MANDATORY: every scenario that writes a settings file or a session
# record runs against a fresh temp workspace under a fresh `AOF_GLOBAL_HOME`
# (hook-enforced — an unisolated run writes fixture session records into the
# operator's live `~/.aof` mesh store and pollutes the running soak). Focused runs
# only, NEVER the full suite (test/global-work-propagation.test.mjs binds `:4182`,
# held by the live control daemon; `:4181` is held by the fleet daemon). No
# scenario here starts a server or binds any port.
#
# WHERE IT LANDS: `test/mesh-assistant-hook-wiring.test.mjs` is the existing home
# ADR-005 names, and `test/bundle.test.mjs` owns the membership pins. If a NEW
# suite is created it MUST be registered in scripts/test.mjs
# (`acd-test-suite-registration`) — an unregistered suite is no gate at all.

@executable @cli @work @distribution
Feature: the bundle wires the Claude session lifecycle — a workspace aof provisioned records Claude sessions, so the terminals home is populated somewhere other than this one repo
  In order that an operator who installs aof into a repo sees their Claude sessions on the terminals home the same way Codex sessions already appear
  the distributed bundle declares three `runtimes: ["claude"]` session hook members that invoke `aof session start|ping|end`, installed through the co-authored settings merge every provisioning door already calls

  Background:
    Given a fresh temp workspace directory and a fresh `AOF_GLOBAL_HOME`
    And the REAL bundle descriptor — no project-config hook is declared anywhere, so any hook that appears came from the bundle alone
    And no server is started and no port is bound anywhere in this feature

  # SCENARIO 1 — THE HEADLINE. A workspace aof provisions, not a fixture: the
  # declaration must come from the bundle, which is the entire difference between
  # this story and the dogfooding artefact it replaces.
  Scenario: a freshly provisioned workspace comes out with the Claude session lifecycle wired
    Given a workspace directory with no `.claude/settings.json` of its own
    When the real co-authored settings merge is applied with a project config that declares NO hooks
    Then `.claude/settings.json` exists and parses as JSON
    And it carries an aof-marked hook entry under EACH of `SessionStart`, `UserPromptSubmit` and `SessionEnd`
    And each of those entries invokes the `aof session` verb — `start`, `ping` and `end` respectively
    And the pre-existing `PostToolUse` artifact-sync entry is still present and unchanged — this story ADDS members, it replaces none

  # SCENARIO 2 — THE THREE MEMBERS, ENUMERATED, WITH THE CODEX SIBLING NAMED IN THE
  # SAME ROW. The last two columns are the whole point: two members mirror their
  # codex sibling exactly, and the third diverges DELIBERATELY.
  Scenario Outline: each lifecycle event maps to exactly one `aof session` verb, declared for the claude runtime alone
    Given the bundle's hook declarations
    When I read the member <member id>
    Then its `event` is <event> and its declared runtimes are exactly `["claude"]`
    And its invocation is a single `aof session <verb>` call and nothing else — no second command, no `&&`, `|`, `;`, redirection or any other shell metacharacter
    And the entry the merge installs carries the ownership marker `aofManaged` set to <member id>
    And its codex sibling for the same lifecycle position is <codex sibling>, which this story does not touch

    Examples:
      | case                          | member id                    | event            | verb  | codex sibling                                        | mirrors exactly |
      | a session opens               | claude-session-start         | SessionStart     | start | codex-session-start (SessionStart → start)           | yes             |
      | the operator sends a prompt   | claude-session-prompt-ping   | UserPromptSubmit | ping  | codex-session-prompt-ping (UserPromptSubmit → ping)  | yes             |
      | the session closes            | claude-session-end           | SessionEnd       | end   | codex-session-stop-ping (**Stop → ping**)            | NO — see below  |
    # ROW 3 IS THE MEASURED DISAGREEMENT BETWEEN THE STORY'S TWO SENTENCES, decided
    # here rather than left to the build. The STORY asks for
    # `SessionStart/UserPromptSubmit/SessionEnd → start|ping|end` AND for "mirror
    # the Codex three exactly"; the codex third member is `Stop → aof session ping`
    # (src/bundle/hooks/codex-session-stop-ping.json), so the two cannot both hold.
    # This contract takes the explicit event/verb list, for a behavioural reason a
    # terminals home cares about: `end` REMOVES the record
    # (src/mesh-session.mjs:361-367), so a closed Claude session leaves the index
    # promptly instead of lingering until its TTL. A `Stop → ping` third member
    # would keep re-pinging a session that has finished a turn and never remove
    # one. ROUTED to the PO/architect as a QA finding; if they rule for a literal
    # codex mirror, this row and only this row changes.
    # NO FOURTH EVENT AND NO CLEVERER TRIGGER (STORY.md): three members, and
    # divergence between the two runtimes' session lifecycles is a bug generator.
    # OPEN AND DELIBERATELY UNSETTLED — the `SessionStart` MATCHER. The codex
    # sibling declares `"startup|resume|clear"`; this repo's hand-authored entry
    # declares `""` (every source). Which sources Claude Code emits is not
    # documented anywhere in this tree, so this contract does NOT invent a token
    # list. The property that matters and is pinned in scenario 8: whatever the
    # matcher is, a session that starts is recorded. The exact string is a
    # question for the architect, not a build-time guess.

  # SCENARIO 3 — THE RUNTIME SPLIT, IN BOTH DIRECTIONS. The two install doors are
  # different files, and a member that leaks into the wrong one is a hook firing
  # `aof session start --assistant codex` inside a Claude session.
  Scenario: the new members are claude-only, and the codex three are left exactly as they were
    Given the three claude session hook members exist in the bundle
    When the codex runtime config is rendered for a workspace
    Then `.codex/hooks.json` contains NONE of the three claude session members
    And `.codex/hooks.json` still contains all three codex session members with their events and commands byte-unchanged — including the third one's `Stop` event and its `aof session ping --assistant codex` command
    When the claude settings merge is applied to the same workspace
    Then `.claude/settings.json` contains NONE of the three codex session members
    And the codex members' own files under `src/bundle/hooks/` are byte-identical to before this story

  # SCENARIO 4 — CO-AUTHORSHIP AND IDEMPOTENCE. `.claude/settings.json` has several
  # authors; a hook installer that duplicates on every run, or that overwrites an
  # operator's own entry, is the exact defect the surgical merge exists to prevent.
  Scenario: applying twice adds nothing, and an operator's own entry on the same event survives untouched
    Given a workspace whose `.claude/settings.json` already carries the operator's OWN unmarked `SessionStart` entry
    When the settings merge is applied, and then applied a second time
    Then exactly ONE aof-marked entry exists on each of the three session events — the second apply added nothing
    And the operator's unmarked `SessionStart` entry is byte-identical to before and still in its original position
    And every other top-level key of the file (permissions, sandbox, plugins, and any other hook event) is byte-identical to before
    And a third apply reports no change and rewrites no bytes

  # SCENARIO 5 — WHAT THE HOOK ACTUALLY INVOKES, driven through the REAL CLI rather
  # than asserted as a string. A wiring story whose invocation was never executed
  # is a wiring story that ships a typo.
  Scenario: the declared invocation really records a session when it is run
    Given a real aof workspace under a fresh `AOF_GLOBAL_HOME`
    When I run exactly the invocation the `claude-session-start` member declares, with a hook-shaped payload carrying a session id on stdin
    Then the command exits zero
    And exactly one session record exists for this node, carrying that session id verbatim
    When I run exactly the invocation the `claude-session-end` member declares, with the same payload
    Then the command exits zero
    And no session record for that session remains — a closed session leaves, it does not linger
    And no record was written anywhere outside the fresh `AOF_GLOBAL_HOME`

  # SCENARIO 6 — THE HONEST LIMIT, AND THE STORY'S HARDEST NEGATIVE. This is what
  # the story delivers: VISIBLE and ADDRESSABLE. Not fed.
  Scenario: a session these hooks record is FREE — listed and addressable, and nothing in this story will ever feed it
    Given a live node whose presence carries exactly the session the `claude-session-start` invocation just recorded
    And NO assignment anywhere owns that `(nodeId, sessionId)` tuple
    When the session index is built
    Then the index contains that session, addressable by its `(nodeId, sessionId)` tuple
    And its `workItem` is `null` — the row a browser reads as having no producer
    And nothing in this story's diff changes what feeds the relay: the two worker-execution call sites are the same two before and after
    # This is the whole reason the story LANDS LAST. Story 05's feed axis is what
    # renders this row honestly; without it, this scenario's own success is a grid
    # of panes waiting forever for bytes that cannot arrive.

  # SCENARIO 7 — ONE ASSISTANT, ONE SPELLING. Pinned as AGREEMENT, not as a
  # literal, because the correct string is whatever the existing claude path
  # already writes and the builder must go and find it.
  Scenario: a session recorded through the bundled hook carries the SAME assistant label as one recorded through the hand-wired hook
    Given a real aof workspace under a fresh `AOF_GLOBAL_HOME`
    When I record a session using exactly the invocation the bundled `claude-session-start` member declares
    And I record a second session using the bare `aof session start` invocation this repo's hand-authored settings file declares, with the same payload shape
    Then both records carry the identical `assistant` value
    And that value is a single non-empty string — never null, never empty, never two spellings of one runtime
    # Two labels for one assistant would split the fleet's own grouping and make
    # this repo's existing records and every provisioned workspace's new ones look
    # like different assistants.

  # SCENARIO 8 — THE MATCHER, PINNED BY BEHAVIOUR RATHER THAN BY STRING, because
  # the token set is not documented in this tree and a guessed literal is worse
  # than a behavioural floor.
  Scenario Outline: a session that starts is recorded, whatever start source it arrived on
    Given the installed `SessionStart` entry from a freshly provisioned workspace
    When a session start arrives with source <source>
    Then the entry's matcher admits it, so `aof session start` is invoked
    And a session record exists for that session afterwards

    Examples:
      | case                     | source  |
      | a fresh launch           | startup |
      | a resumed conversation   | resume  |
      | a cleared conversation   | clear   |
    # These three are the sources the codex sibling's own matcher
    # (`startup|resume|clear`) already names, so they are the defensible floor. If
    # Claude Code emits a source outside that set, the matcher must admit it too —
    # that is the architect's call and is flagged in scenario 2's note, NOT guessed
    # at here. A narrower matcher than this table is a session the terminals home
    # never sees.
