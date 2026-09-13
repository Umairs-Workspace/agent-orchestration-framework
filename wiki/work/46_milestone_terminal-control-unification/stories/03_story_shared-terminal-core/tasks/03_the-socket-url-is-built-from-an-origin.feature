<!-- aof-generated: refine (Three Amigos — PO headline Scenarios, QA Examples + litmus) -->

# Task feature — STORY 46/03, the URL: ADR-004's ONE pure builder. It takes the source,
# the params that address it and an `origins` argument, and returns a URL. It reads no
# `window` and no `location` — it is HANDED them, the same shape
# `ui/src/app/shell-nav.mjs:15-21` uses, where resolvability is an INPUT precisely so the
# module stays headless. Three builders collapse into it: `terminalWsUrl`
# (`TerminalDock.tsx:431-436`), `mirrorWsUrl` (`:440-445`) and `terminalViewSocketUrl`
# (`stream.mjs:75-80`).
#
# THE INVARIANT THIS SERVES: no terminal surface holds a port literal. `FLEET_PORT = 4181`
# (`TerminalDock.tsx:78`) is deleted, not relocated. The STRUCTURAL half of that is a gate
# (below); the BEHAVIOURAL half is here — a URL contains the authority the caller supplied
# and no other, and an origin with no port produces a URL with no port rather than a
# defaulted `:4181`.
#
# LITMUS: every Then is a returned VALUE from the shared framework-free `.mjs` set ADR-001
# homes at `ui/src/terminal/`, loaded by `node:test` under plain `node` — no bundler, no
# DOM, no socket, and (the point of the second scenario) no `window` and no `location` in
# scope at all. No source read, no `className` archaeology, no browser fact.
#
# WHAT A MODEL CANNOT SETTLE, AND WHERE IT GOES INSTEAD. That the board is genuinely HANDED
# the fleet origin as a served fact — the `{ fleetOrigin, source: "launcher" | "default" }`
# payload threaded `mesh-ui-serve → board-serve → setup-ui → board-ui`, with the standalone
# default resolved in the command layer — is story 46/02's, end to end. This task asserts
# only what the builder does with an origin once it has one; where the origin comes from is
# not its business, and that is exactly why the argument exists. That a pane whose origin
# cannot be reached RENDERS a labelled unavailable state naming its cause is task 01's
# state ramp plus 46/04's `@uat` render verdict (DG-46-3: the state ships in m46 with no
# production producer and is judged from a fixture).
#
# NOT ASSERTED HERE — deliberately left to a fitness function, per ARCHITECTURE §Fitness
# functions: *no port literal on a terminal surface* is `acd-terminal-origin-not-port`'s
# source-analysis sweep (no module in `ui/src/terminal/` names a port at all, and no
# `ws://`/`wss://` URL anywhere in `ui/src` contains a port literal), and *the builder
# reads no global* is that same gate's structural half. The gate is expected RED at refine
# because `TerminalDock.tsx:78` trips it today — which is its non-vacuity proof, not a
# failure. The behavioural halves of both — "the URL carries only what I handed it" and
# "the same URL comes back with a decoy `window` in scope" — are below, because a gate that
# greps and a test that runs a builder fail for different reasons and the pair is worth
# having.
#
# ISOLATION: `AOF_GLOBAL_HOME=$(mktemp -d) node --test test/<file>` — FOCUSED.

@executable @ui @work @distribution
Feature: one pure builder turns a source, its params and an origins argument into a socket URL, and reads no global to do it
  In order that the same `ui/dist` bundle served from three origins dials the right socket from each of them — and that a board on an ephemeral port can reach a fleet whose address it was told rather than one it guessed from a constant
  the socket URL must be built by one pure function that takes origins as an argument, must dial each source's own route at the origin that source declares, must never produce a URL for a half-tuple or an origin it was not given, and must carry no port the caller did not supply

  Background:
    Given the shared terminal core loaded under plain `node` — no bundler, no DOM, no socket
    And the socket-URL builder read as a pure function of the source, its params and the origins it is handed

  # HEADLINE. One builder, both sources, origins as an argument. Row 3 is the case this
  # milestone exists to fix: the board page dialling the FLEET's origin — the only one of
  # ADR-004's four cases that needs discovery at all, and the one `FLEET_PORT` was invented
  # for.
  Scenario Outline: the builder turns a source, its params and the origins it is handed into exactly one URL
    Given the origins <origins>
    When a URL is built for <source> addressed by <params>
    Then the URL is exactly <url>
    And it dials the <origin role> origin — the one that source declares, never the one the page happens to have been served from
    And it carries every declared param and no others

    Examples:
      | case                                                          | source    | params                            | origins                                                     | origin role | url                                                                              |
      | the board's own PTY on an ephemeral board origin              | local-pty | ref=46/03, provider=claude        | self=http://127.0.0.1:53219                                 | self        | ws://127.0.0.1:53219/ws/terminal?ref=46%2F03&provider=claude                     |
      | the fleet page peeking at a worker, same-origin               | mirror    | nodeId=aof-wsl, sessionId=7f3a    | self=http://127.0.0.1:4181, fleet=http://127.0.0.1:4181     | fleet       | ws://127.0.0.1:4181/ws/terminal-view?nodeId=aof-wsl&sessionId=7f3a               |
      | the BOARD page opening the same worker's mirror               | mirror    | nodeId=aof-wsl, sessionId=7f3a    | self=http://127.0.0.1:53219, fleet=http://127.0.0.1:4181    | fleet       | ws://127.0.0.1:4181/ws/terminal-view?nodeId=aof-wsl&sessionId=7f3a               |
      | a fleet reached by name rather than by address                | mirror    | nodeId=aof-wsl, sessionId=7f3a    | self=http://127.0.0.1:53219, fleet=http://fleet.internal    | fleet       | ws://fleet.internal/ws/terminal-view?nodeId=aof-wsl&sessionId=7f3a               |
      | a session id that needs escaping                              | mirror    | nodeId=aof-wsl, sessionId=a b/c   | fleet=http://127.0.0.1:4181                                 | fleet       | ws://127.0.0.1:4181/ws/terminal-view?nodeId=aof-wsl&sessionId=a+b%2Fc            |
      | a provider other than the default                             | local-pty | ref=46, provider=codex            | self=http://127.0.0.1:53219                                 | self        | ws://127.0.0.1:53219/ws/terminal?ref=46&provider=codex                           |
    # ROW 1 AND ROW 5 CARRY THE ENCODING EDGE, and it is not decorative: every real work ref
    # has a slash in it (`46/03`), and a session id is a value from another machine. Both are
    # percent-encoded into the query, so a ref or a session id can never break out of its
    # param and become a second path segment. Row 4 is the no-port origin — an origin is a
    # SCHEME, HOST and OPTIONAL PORT handed in whole, not a hostname the builder decorates.

  # ADR-004: the builder "takes the origins as an ARGUMENT and reads no global". Under plain
  # `node` neither `window` nor `location` exists, so the first half is proved by the
  # builder simply working; the DECOY is what proves the second half.
  Scenario: the builder reads no `window` and no `location`, and ignores one that is put in its way
    Given no `window` and no `location` exist at all, as is the case under plain `node`
    When a URL is built for each of the two sources from the origins it is handed
    Then both URLs are produced in full, with no fallback host and no `127.0.0.1:4177` stand-in
    Given a decoy `window` and a decoy `location` are then placed in scope, both naming a different host and a different protocol
    When the same two URLs are built from the same origins
    Then both are byte-identical to the ones built with no globals present
    And nothing about the decoys appears in either URL — not their host, not their port, not their protocol
    # This is the pair `ui/src/app/shell-nav.mjs:15-21` established and m45's route module
    # kept: resolvability is an INPUT so the whole task stays headless. A builder that read a
    # global would pass every other scenario in this file and fail only in a browser, which
    # is the class of defect this repo has no harness to catch.

  # ADR-014 INVARIANT 4, WHICH THIS MILESTONE PRESERVES EXACTLY. `stream.mjs:13-17`: routing
  # is by the FULL tuple; a half-tuple resolves to NO stream — "never a guessed, defaulted,
  # or sibling session, and never a node-only subscription that would bleed another session's
  # bytes into this card."
  Scenario Outline: a half-tuple yields no URL at all — never a guessed, defaulted or sibling session
    Given a `mirror` source whose node id is <node id> and whose session id is <session id>
    And a fleet origin of http://127.0.0.1:4181
    When a URL is built
    Then <outcome>
    And the refusal names which half was missing, so the caller can say why nothing opened
    And nothing partial is produced: no URL with an empty param, no URL with the param omitted, no URL carrying only the node

    Examples:
      | case                                                | node id  | session id | outcome                                                        |
      | both halves present                                 | aof-wsl  | 7f3a       | a URL carrying exactly that tuple                              |
      | the worker has not captured its session yet         | aof-wsl  | (absent)   | no URL at all                                                  |
      | the session id arrived as an empty string           | aof-wsl  | ""         | no URL at all                                                  |
      | the session id is explicitly null                   | aof-wsl  | null       | no URL at all                                                  |
      | a malformed dispatch with no target node            | (absent) | 7f3a       | no URL at all                                                  |
      | the node id arrived as an empty string              | ""       | 7f3a       | no URL at all                                                  |
      | neither half                                        | (absent) | (absent)   | no URL at all                                                  |
      | a value that is not a string                        | aof-wsl  | 7          | no URL at all                                                  |

  Scenario: a sibling session on the same node is never borrowed to complete a half-tuple
    Given one card whose assignment resolved to node `aof-wsl` and session `7f3a`
    And a second card on the SAME node whose session has not been captured
    When a URL is built for each
    Then the first card's URL carries `7f3a` and the second card has no URL at all
    And the second card's answer mentions no session id whatsoever — it borrowed nothing from the live sibling beside it
    And the two cards' URLs could never be equal, because one of them does not exist
    # Preserves `test/fleet-terminal-view-surface.test.mjs`'s sibling lane, which seeds a
    # REAL sibling assignment with a REAL captured session precisely because that value is
    # the one a "helpful" defaulting bug would reach for.

  # The same rule, generalised to the frozen table: a source's declared params are ALL
  # required. There is no defaulted provider and no defaulted ref, for the same reason there
  # is no defaulted session.
  Scenario Outline: every param a source declares is required, and a missing one yields no URL for either source
    Given the source <source> addressed by <params>
    And the origins it needs
    When a URL is built
    Then <outcome>

    Examples:
      | case                                              | source    | params                          | outcome                       |
      | a local session with no item ref                  | local-pty | provider=claude                 | no URL at all                 |
      | a local session with no provider chosen           | local-pty | ref=46/03                       | no URL at all                 |
      | a local session with an empty ref                 | local-pty | ref="", provider=claude         | no URL at all                 |
      | a complete local session                          | local-pty | ref=46/03, provider=claude      | a URL carrying both           |
      | a mirror with a complete tuple                    | mirror    | nodeId=aof-wsl, sessionId=7f3a  | a URL carrying both           |
    # A defaulted provider would silently spawn `claude` for an operator who chose `codex`;
    # the picker guarantees exactly one selection (task 04), so an absent provider here means
    # something upstream is broken and a URL would hide it.

  # ADR-004's own consequence: the ORIGIN can be missing too, and the answer is the same
  # shape — no URL, which is the structural half of "no socket is opened" that
  # `stream.mjs:75-80` already keeps.
  Scenario Outline: an origin the caller could not resolve yields no URL, which is the structural half of "no socket is opened"
    Given the source <source> with complete params
    And <origins>
    When a URL is built
    Then <outcome>
    And nothing is guessed: no `localhost`, no page origin substituted for a missing fleet origin, no default port

    Examples:
      | case                                                  | source    | origins                          | outcome                    |
      | the fleet origin was never served to this page        | mirror    | self=http://127.0.0.1:53219      | no URL at all              |
      | the fleet origin arrived empty                        | mirror    | fleet=""                          | no URL at all              |
      | no origins argument at all                            | mirror    | (absent)                          | no URL at all              |
      | no origins argument at all, for the local source too  | local-pty | (absent)                          | no URL at all              |
      | the origins the source needs are present              | mirror    | fleet=http://127.0.0.1:4181       | a URL at that origin       |

  # THE INVARIANT, BEHAVIOURALLY. The gate greps; this runs the builder. Both are wanted.
  Scenario Outline: no port appears in the URL that the caller did not supply in the origin
    Given the origins <origins>
    When a URL is built for <source>
    Then its authority is exactly <authority>
    And no other port appears anywhere in the URL
    And none of 4177, 4178, 4180 or 4181 appears unless the caller supplied it — the fleet's own default included

    Examples:
      | case                                                | source    | origins                              | authority          |
      | an unusual ephemeral board port                     | local-pty | self=http://127.0.0.1:59999          | 127.0.0.1:59999    |
      | a fleet on a port that is not the default           | mirror    | fleet=http://fleet.internal:8443     | fleet.internal:8443 |
      | an origin carrying no port at all                   | mirror    | fleet=http://fleet.internal          | fleet.internal      |
      | the fleet's actual default, supplied by the caller   | mirror    | fleet=http://127.0.0.1:4181          | 127.0.0.1:4181     |
    # Row 3 is the one that matters: an origin with no port must produce a URL with no port.
    # A builder that "helpfully" appended `:4181` when the origin omitted one would pass the
    # grep gate (no literal in the URL template) and still be the defect, which is why this
    # scenario exists beside `acd-terminal-origin-not-port` rather than instead of it.
    # Row 4 is the non-vacuity control: 4181 is not forbidden, it is forbidden as an INVENTION.

  Scenario Outline: the scheme follows the origin being dialled, and `https` yields `wss`
    Given the origins <origins>
    When a URL is built for <source>
    Then its scheme is <scheme>

    Examples:
      | case                                                    | source    | origins                                                  | scheme |
      | an ordinary local board                                 | local-pty | self=http://127.0.0.1:53219                              | ws     |
      | a board served over TLS                                 | local-pty | self=https://board.example.test                          | wss    |
      | a fleet served over TLS, dialled from an http board     | mirror    | self=http://127.0.0.1:53219, fleet=https://fleet.example.test | wss |
      | a plain fleet dialled from a TLS board                  | mirror    | self=https://board.example.test, fleet=http://127.0.0.1:4181 | ws  |
    # ADR-004 words this clause as "`wss:` iff the page is `https:`, as both current builders
    # already do", which is EXACTLY this rule for `local-pty` — the page is the origin it
    # dials. Rows 3 and 4 are the only cases where the two readings differ, and QA rules them
    # on the DIALLED origin: today's `mirrorWsUrl` (`TerminalDock.tsx:440-445`) takes the
    # PAGE's protocol and the FLEET's hostname, which is how an `http` fleet gets dialled at
    # `wss://` and fails with nothing but a closed socket to show for it. Row 4 is a genuine
    # mixed-content refusal at the browser, and the builder must not hide it behind a scheme
    # it invented. If the architect reads ADR-004 the other way, these two rows are the
    # evidence for that conversation — not a silent choice inside a story.

  # `stream.mjs:28-31` names the mirror route once "so the component cannot drift onto the
  # board-side bidirectional `/ws/terminal` by accident". Under ONE control that drift would
  # be a read-only pane holding a typeable socket, so the rule earns a scenario.
  Scenario Outline: each source dials its own route, compared as a whole path rather than as a substring
    Given the source <source>
    When a URL is built for it
    Then its path is exactly <path> — matched whole, because `/ws/terminal` is a prefix of `/ws/terminal-view` and a substring check would pass vacuously
    And it is not <the other route>
    And the route is the source's own declaration, not something the call site chose

    Examples:
      | case                                        | source    | path              | the other route   |
      | the board-side bidirectional PTY route      | local-pty | /ws/terminal      | /ws/terminal-view |
      | the fleet-side read-only mirror route       | mirror    | /ws/terminal-view | /ws/terminal      |
