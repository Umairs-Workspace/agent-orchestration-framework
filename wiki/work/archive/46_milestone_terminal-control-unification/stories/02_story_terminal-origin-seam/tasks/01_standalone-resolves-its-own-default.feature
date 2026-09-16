<!-- aof-generated: refine (Three Amigos — PO headline Scenarios, QA Examples + litmus) -->

# Task feature — STORY 46/02, the COMMAND-LAYER half: a board with no fleet in the
# picture still resolves a fleet origin, so no terminal surface is ever left with
# nothing to build a URL from — and it resolves it in the ONE layer allowed to know
# both faces.
#
# THE SEAM, read at source: `aof work ui` resolves its port vocabulary in
# `src/commands/work-ui.mjs:23-28` and launches at `:35` with
# `serveBoard({ projectDir, port })`. ADR-004 rules that the standalone fleet origin
# is built there, from `DEFAULT_MESH_UI_PORT` (`src/mesh-ui-serve.mjs:116`), and
# passed into `serveBoard` as the SAME additive option the fleet passes at
# `src/mesh-ui-serve.mjs:781-786`. One option, two suppliers — that symmetry is why
# the served fact's shape (`{ fleetOrigin, source }`) is task 00's and is only
# CONSUMED here, never restated.
#
# THE CYCLE PROHIBITION IS STRUCTURAL AND IS DELIBERATELY NOT GHERKIN.
# ADR-004: "`src/board-serve.mjs` and `src/setup-ui.mjs` MUST NOT import
# `src/mesh-ui-serve.mjs`" — the graph reports `mesh-ui-serve.mjs → board-serve.mjs`
# as a real edge, so the reverse import closes a cycle and would drag the fleet server
# (and `ws`) into `aof work ui --json`'s probe path. That is a claim about an import
# statement, and no gate covers it today. Checked at source, twice:
#  - `test/arch/acd-command-layer-imports-downward.test.mjs` inverts and forbids
#    `src/*.mjs` → `src/commands/*` edges and cycles THROUGH the command boundary. A
#    `board-serve.mjs` → `mesh-ui-serve.mjs` edge is src-root to src-root; that gate
#    never looks at it.
#  - `test/arch/acd-work-ui-no-core-import.test.mjs:129-146` forbids `setup-ui.mjs`
#    importing `./work.mjs`, `./feature-parse.mjs`, `./command-core.mjs` or
#    `./commands/*`. Green, useful, and silent about `./mesh-ui-serve.mjs`.
#  - `test/arch/acd-terminal-origin-not-port.test.mjs` (new, written by story 46/03)
#    is scoped to socket-URL construction under `ui/src` — deliberately, so it can
#    never fight the other origin gate over an exemption list. It does not reach `src/`.
# QA has routed a new-or-extended gate as a FINDING rather than smuggling a source-read
# claim in as a behavioural Then. What IS below is the observable consequence: a
# standalone board resolves and serves a fleet origin with no fleet running in this
# lane, binds exactly one port, and never waits on the origin it names.
#
# ALSO NOT ASSERTED HERE, for the same reason: "no port literal on a terminal surface"
# and "the URL builder reads no `window`" — both `acd-terminal-origin-not-port`'s
# (ARCHITECTURE §Fitness functions; §"Invariants that belong HERE and must NOT appear
# in a task `.feature`" names them in terms). And the frozen `/api/work*` surface's
# non-regression is `test/work-ui-board-serves-unchanged.test.mjs`'s (`:86`).
#
# OUT OF SCOPE, AND BOTH BELONG TO MILESTONE 49 (spike 44 §Outcome, STORY.md §Not in
# scope): the additive board-origin field on `GET /api/mesh/board-url`'s JSON body,
# and copying `assign`'s `workspace-not-local` guard (`mesh-ui-serve.mjs:439-440`)
# onto that route. Neither is touched by a standalone board, and no scenario below
# goes near the fleet face.
#
# LITMUS: every Then is a value read off a real HTTP response from a REAL `serveBoard`
# on an ephemeral port, or off a real `aof work ui` process's stdout and exit code —
# the launch-and-read shape `test/work-ui-verb-rename.test.mjs:88-95` already uses. The
# one production module any scenario imports is `src/mesh-ui-serve.mjs`, and only to
# read `DEFAULT_MESH_UI_PORT` for comparison: the TEST may import both faces, which is
# precisely what the production modules may not do, and comparing against the constant's
# ONE home is what stops the number being re-typed into a fifth (TECH_DEBT 25,
# ARCHITECTURE §Codebase health finding 4).
#
# THE PORT TRAP: the standalone default IS 4181, and this machine's live fleet daemon
# holds it (`:4182` likewise, for control serve). Reading the number is not binding it —
# no scenario below listens on the resolved origin or asserts that nothing answers
# there, because on the operator's own machine something does. Every board started
# below binds `port: 0` or a port the lane reserved by binding `:0` and releasing it,
# and every "nothing is listening there" premise uses such a reserved-and-released
# port, never 4181.
#
# ISOLATION: `AOF_GLOBAL_HOME=$(mktemp -d) node --test test/<file>` — FOCUSED, never
# the full suite (`test/global-work-propagation.test.mjs` binds `:4182`, which the live
# daemon holds). These suites export a test ARRAY consumed by `scripts/test.mjs`, so a
# focused run is a small driver importing that array.

@executable @cli @work @board
Feature: a board started standalone resolves its own fleet origin in the command layer, and serves a well-formed origin whether it was configured, defaulted or handed down
  In order that an operator running only `aof work ui` still gets a terminal that knows where a fleet would be — and that an operator whose fleet is on a different port or a different machine can say so once
  the command layer must build the fleet origin from the fleet's own documented default or from the operator's explicit configuration, hand it to the board as the same option a fleet launcher hands down, refuse a malformed one by name, and never make the board server ask the fleet server for a number

  Background:
    Given a repo fixture with a built `ui/dist`, so the launcher does not refuse with `ui-build-missing`
    And no fleet server is started anywhere in this lane
    And every board started below binds an ephemeral port, or a port the lane reserved by binding `:0` and released
    And "the board's fleet-origin fact" is the same served fact task 00 pins — `{ fleetOrigin, source }` on a GET from the board's own origin — consumed here, not respecified

  # HEADLINE. The number is compared against its ONE home, so the standalone default
  # and the fleet's own default cannot drift apart without this scenario going red.
  Scenario: a board started by `aof work ui` with no fleet anywhere still serves a fleet origin, and names it a resolution rather than a fact it was told
    Given no explicit fleet-origin configuration
    When I launch `aof work ui --port <free>` and read its fleet-origin fact
    Then `fleetOrigin` is `http://127.0.0.1:` followed by `DEFAULT_MESH_UI_PORT` exactly as `src/mesh-ui-serve.mjs` exports it — the number is compared to its one home, never re-typed into the assertion
    And `source` is "default" — the board resolved this rather than being told it, and the payload says which
    And the value is NOT `null`: a standalone board is the case that must never leave a terminal surface with nothing to build a URL from (that is task 00's negative boundary, and this is the case that closes it)
    And the board's `/board` page answers 200 with the app shell and `/api/work/list` answers its usual envelope — resolving an origin changed nothing about what the board serves
    # `source` is "default" and not a third value: ADR-004 freezes the pair, and the
    # distinction it draws is "was I TOLD, or did I RESOLVE" — provenance, not
    # provenance-of-the-provenance. The configured rows below therefore also read
    # "default"; see the ruling note under the configuration Outline.

  # "An explicit configuration overrides the default." The rows are the contract; the
  # NAME of the carrier is the build's, and there must be exactly ONE of it — ADR-004
  # rejects "a fifth home" for the port map in terms, so a flag AND a config key AND an
  # env var would be three answers to one question.
  Scenario Outline: an explicit fleet-origin configuration overrides the default, verbatim
    Given the operator's explicit fleet-origin configuration is <configured>
    When I launch `aof work ui --port <free>` and read its fleet-origin fact
    Then `fleetOrigin` is exactly <fleetOrigin>
    And `source` is "default"
    And the launch announced its board URL and answered `/api/work/list` without ever waiting on the configured origin — nothing is listening there, and the board came up anyway
    And the board bound exactly ONE port, its own: no second listener appeared, and nothing was dialled

    Examples:
      | case                                     | configured                                | fleetOrigin                     |
      | nothing configured                       | (absent)                                  | `http://127.0.0.1:4181`         |
      | an empty configuration                   | "" (the empty string)                     | `http://127.0.0.1:4181`         |
      | a whitespace-only configuration          | "   "                                     | `http://127.0.0.1:4181`         |
      | a fleet on another loopback port         | `http://127.0.0.1:<reserved>`             | `http://127.0.0.1:<reserved>`   |
      | a fleet on another MACHINE               | `http://192.0.2.10:4181`                  | `http://192.0.2.10:4181`        |
      | a fleet behind TLS                       | `https://fleet.example:8443`              | `https://fleet.example:8443`    |
      | a fleet behind TLS on the implicit port  | `https://fleet.example`                   | `https://fleet.example`         |
      | a trailing slash the operator typed      | `http://127.0.0.1:<reserved>/`            | `http://127.0.0.1:<reserved>`   |
    # Rows 2 and 3 are the SILENCE rows and they are a boundary, not a malformed input:
    # an empty or blank configuration is an operator who configured nothing, and it
    # falls back rather than refusing. `4181` is written literally in the expected
    # column for readability; the assertion compares against the exported constant.
    # Row 5 is the one that proves the value is never rewritten to loopback — a fleet on
    # another machine is a legitimate configuration and `192.0.2.x` is the reserved
    # documentation range, so no row can accidentally reach a real host.
    # Row 7 is the implicit-port edge: `new URL("https://fleet.example").origin` carries
    # no port and that is still a well-formed origin — the headline "scheme + host +
    # port" means the origin RESOLVES to a port, not that it spells one, and the socket
    # builder gets 443 for free from `new URL`. A build that rejected this row would be
    # refusing a valid origin.
    # Row 8 is normalisation, not tolerance: `new URL(x).origin` drops the trailing
    # slash, so the SERVED value is an origin even when the typed one was not. That is
    # the narrowest possible normalisation and it is the reason the refusals below are
    # about MEANING (a path, a query, a bare port) rather than about punctuation.
    # A QA RULING FLAGGED FOR THE ARCHITECT: `source` reads "default" on the configured
    # rows because ADR-004 freezes the pair `"launcher" | "default"` and the honest
    # distinction it draws is "told vs. resolved". If the operator's configuration
    # deserves its own provenance value, that is a superseding word for ADR-004 and not
    # a value the build should type first and discover later.

  # Every refusal names its own cause — this codebase's rule, and `work:ui`'s own
  # posture already: a stray positional gets a loud `commandError(..., "invalid-input",
  # 400)` (`commands/work-ui.mjs:97-101`), and the launcher's other refusals print a
  # message and set a non-zero exit rather than a stack trace (`:36-47`).
  Scenario Outline: a malformed fleet-origin configuration is refused by name, and no board is left running on a guess
    Given the operator's explicit fleet-origin configuration is <configured>
    When I launch `aof work ui --port <free>`
    Then the process exits non-zero and prints a message naming the offending value and what a valid one looks like
    And the message is a sentence, not a stack trace — no `at Object.<anonymous>` and no `Error:` prefix
    And NO board server is left listening on that port: a following bind of the same port succeeds
    And no board anywhere serves `fleetOrigin` <would-have-been> — a malformed configuration is never quietly replaced by the default, because an operator who configured a fleet and silently got 4181 has no way to see it

    Examples:
      | case                              | configured                          | would-have-been         |
      | a bare port                       | `4181`                              | `http://127.0.0.1:4181` |
      | a bare port on a host             | `127.0.0.1:4181`                    | `http://127.0.0.1:4181` |
      | an origin carrying a path         | `http://127.0.0.1:4181/fleet`       | `http://127.0.0.1:4181` |
      | an origin carrying a query        | `http://127.0.0.1:4181/?scope=global` | `http://127.0.0.1:4181` |
      | a websocket scheme                | `ws://127.0.0.1:4181`               | `http://127.0.0.1:4181` |
      | not a URL at all                  | `not-an-origin`                     | `http://127.0.0.1:4181` |
    # A QA RULING, ARGUED AND FLAGGED. Rows 1–2 refuse rather than coerce because "an
    # origin, never a port" is the whole ADR — accepting a bare port at the CLI
    # re-creates `FLEET_PORT` one layer down, where nobody is looking for it. Rows 3–4
    # refuse rather than normalise because an operator who typed a path believes it is
    # used; `new URL(x).origin` would discard it silently, and the failure would surface
    # as a pane that never streams. Row 5 refuses because `ws:`/`wss:` is the SOCKET
    # scheme, derived by the URL builder from the page's own scheme (ADR-004: "`wss:`
    # iff the page is `https:`"); accepting it here would give the builder two inputs
    # for one decision. Row 6 is the ordinary garbage case. If the architect prefers
    # normalise-and-continue for any row, that is a one-word change to this table and a
    # note in the ADR — but it must be a decision, not a default.

  # ADR-004's cycle prohibition, as the only thing about it an outsider can observe.
  Scenario: a standalone board neither starts nor waits for a fleet — the number came from the command layer, not from a running server
    Given the operator's explicit fleet-origin configuration names a port the lane reserved by binding `:0` and released, so nothing is listening there
    When I launch `aof work ui --port <free>`
    Then the `Open this URL in your browser:` line appears and `/api/work/list` answers within the lane's ordinary readiness timeout — the launch never blocks on the configured origin
    And the fleet-origin fact answers 200 with that configured origin although nothing is listening on it — the command layer resolved a number, it did not discover one
    And exactly one listener exists for this launch: the board's own port
    And `aof work ui --json` — the non-blocking probe — still returns its envelope and exits 0 without binding any port
    And every key that probe carried at HEAD is present with an unchanged value: `mode` "board", `port`, `projectDir`, `uiDist`, `uiBuildPresent`, `boardUrl` (`board-serve.mjs:33-46`)
    # The `--json` Thens are the probe path ADR-004 names by hand: a board server that
    # imported the fleet server would drag `ws` and a whole serve-face into a call whose
    # entire contract is "never launches". `acd-work-command-cli-bijection`'s spawn
    # probe depends on that promptness, which is why it is asserted as an exit code and
    # a timing, not as an import.

  # The shape rule is ONE rule over BOTH suppliers, and the last row is what makes that
  # non-trivial: a fleet-handed origin and a command-resolved origin pass through the
  # same served field and must satisfy the same predicate.
  Scenario Outline: whatever produced it, the value the board serves is an ORIGIN — never a bare port, never a URL carrying a path or a query
    Given a board serving a fleet-origin fact produced by <produced by>
    When I read `fleetOrigin`
    Then it parses with `new URL(...)` without throwing
    And it is byte-identical to `new URL(fleetOrigin).origin` — the single strongest form of this claim, since a path, a query, a fragment, a trailing slash, a credential or a bare port all make those two differ
    And its scheme is `http` or `https` and its host is non-empty
    And it is a string, and not a number and not a numeric string — a bare port never reaches a reader
    And `new URL("/ws/terminal-view", fleetOrigin).pathname` is exactly `/ws/terminal-view` — the value composes into a socket URL with no string surgery, which is the only thing a reader will ever do with it

    Examples:
      | case                                | produced by                                            |
      | the standalone default              | the command layer, with nothing configured              |
      | an explicit non-default port        | the command layer, from an explicit configuration       |
      | an implicit-port TLS origin         | the command layer, from `https://fleet.example`         |
      | handed down by a fleet launcher     | a real `serveMeshUi` on an ephemeral port (task 00's seam) |
    # The last row is deliberately re-read here and it does NOT restate task 00's
    # outcome: task 00 asserts the value EQUALS the running fleet's bound origin; this
    # asserts that one SHAPE rule covers both suppliers. Two facts, two homes.

  # TECH_DEBT 25 / ARCHITECTURE §Codebase health finding 4: the port map has four homes
  # and one live inconsistency. ADR-004 refuses to add a fifth; this is the behavioural
  # half of that refusal, and each number named below is one the default could plausibly
  # have been confused with.
  Scenario: the standalone default is the FLEET's documented default, and is none of the four other numbers in the port map
    Given no explicit fleet-origin configuration
    When a board started by `aof work ui` serves its fleet-origin fact
    Then `new URL(fleetOrigin).port` equals `DEFAULT_MESH_UI_PORT` imported from `src/mesh-ui-serve.mjs`
    And it is not the board's own listening port
    And it is not 4180 — `boardUiProbe`'s default and `work:ui`'s own (`board-serve.mjs:33`, `commands/work-ui.mjs:25`)
    And it is not 4178 — `serveBoard`'s own masked default, which is the assets API port (`board-serve.mjs:48`)
    And it is not 4177 — `serveSetupUi`'s default and the assets front end's (`setup-ui.mjs:26`)
    # Read and compared as a string; nothing in this feature listens on 4181. The live
    # fleet daemon holds it on this machine, which is exactly why the assertion is an
    # equality against an exported constant and never a bind.
