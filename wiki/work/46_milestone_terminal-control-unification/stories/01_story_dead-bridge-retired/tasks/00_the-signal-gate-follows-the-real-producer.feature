<!-- aof-generated: refine (Three Amigos — PO headline Scenarios, QA Examples + litmus) -->

# Task feature — STORY 46/01, ADR-007: `wireTerminalBridge` is DELETED and SECURITY
# T14's surviving half is re-aimed at the producer that actually runs. The invariant
# does not move: THE STREAMED TERMINAL OUTPUT SIGNAL IS SOURCED EXCLUSIVELY FROM
# `term.onData`, AND NO CREDENTIAL, ENV, ASKPASS OR MINT MATERIAL EVER ENTERS IT. Only
# its SUBJECT moves — off a function with no production caller
# (`mesh-terminal-relay-bridge.mjs:187`) and onto the arrow that carries every real
# byte off a worker: `onOutputChunk: (chunk, sessionId) => client.sendTerminalFrame(
# sessionId, String(chunk))` (`mesh-launcher.mjs:1152` for an assignment, `:1291` for
# a resume) into `worker-stream-client.mjs:601-612`.
#
# THE SPLIT THIS FILE EXISTS TO HONOUR, AND IT IS THE HARD PART. "The gate is
# re-aimed" is a claim about a FITNESS FUNCTION, not about product behaviour. The
# structural half — that `acd-fleet-terminal-input-constrained`'s detector #4 now reads
# `src/mesh-launcher.mjs`'s `onOutputChunk` for its POSITIVE (`String(chunk)`) clause
# while its NEGATIVE (credential-needle) clause stays on the bridge file — is asserted
# BY THAT AMENDED ARCH TEST, over source, and NOWHERE BELOW. ARCHITECTURE §Fitness
# functions makes the rule explicit ("invariants that belong HERE and must NOT appear
# in a task `.feature`"), and a Gherkin Then that named a detector, a file path or a
# regex would be a fitness function filed in the wrong home. What belongs here is the
# OBSERVABLE CONSEQUENCE: a streamed frame carries exactly the chunk, and a credential
# sitting in the worker's environment does not reach the wire.
#
# LITMUS: every Then is a value read off a FRAME — the envelope a recording transport
# received, or the bytes a real subscriber was handed. Producer-fed, over the REAL
# `driveInteractiveClaudeSession` against `createScriptedPty` and the REAL
# `createWorkerStreamClient` over a fake transport, wired with the SAME
# `(chunk, sessionId) => sendTerminalFrame(sessionId, String(chunk))` arrow production
# wires (the shape `test/mesh-worker-driver-output-chunk.test.mjs` and
# `test/worker-stream-client.test.mjs` already drive separately — this task joins the
# two links so the property is asserted across the seam rather than on either side of
# it). No real `claude`, no real PTY, no second machine, no relay socket, no
# `~/.aof` write.
#
# THIS IS NOT THE FORBIDDEN SECOND COPY. ADR-007 refuses a second copy of the live-path
# credential NEEDLE — a source-reading regex, which already exists green in
# `acd-fleet-terminal-frame-connection-identity`. Scenario 2 below is a BEHAVIOURAL
# assertion at a different altitude: real secrets in a real process environment, real
# bytes on a real frame. A regex says "the file does not mention `process.env`"; this
# says "the value is not on the wire". Two assertions, two altitudes, one invariant.
#
# NOT ASSERTED HERE, deliberately, and named so a reviewer does not log an absence:
#  - THAT DETECTOR #4 READS `mesh-launcher.mjs` — the amended arch test's own subject
#    (above). Likewise its non-vacuity plants.
#  - THAT NO FILE UNDER `src/` CONTAINS THE IDENTIFIER `wireTerminalBridge` — a
#    source-read sweep. Scenario 4 asserts the strictly stronger RUNTIME fact instead:
#    the export is gone, its absence fails to LINK rather than reading `undefined`, and
#    every enumerated reader still loads. A ninth reader nobody listed cannot hide
#    behind a passing grep; it fails at import.
#  - INVARIANTS 1, 2, 3 AND 5 of `acd-fleet-terminal-input-constrained`, its whole
#    behavioural lane, the mirror, the input lane and the envelope SHAPE — all out of
#    scope (STORY.md "Not in scope"). Scenario 3 proves the shape did not move; it does
#    not re-verify what the shape means.
#  - ANY REDACTION OF TERMINAL CONTENT. See the note under Scenario 2's last row: it is
#    a knowingly-accepted boundary of T14, recorded, not widened here.
#
# ISOLATION: `AOF_GLOBAL_HOME=$(mktemp -d) node --test test/<file>` — FOCUSED, never the
# full suite (`test/global-work-propagation.test.mjs` binds :4182, which the live control
# daemon holds). The two homes: `test/mesh-terminal-signal-source.test.mjs` (new — the
# producer-fed lanes, scenarios 1-2) and `test/mesh-terminal-relay-bridge.test.mjs` (the
# surviving envelope-builder + export-surface lanes, scenarios 3-5, after its
# bridge-driving lanes go). Both stay registered in `scripts/test.mjs` — an unregistered
# suite is no gate at all (m43/ADR-014 E7).

@executable @cli @work @distribution
Feature: the bytes a worker streams to the control node are sourced exclusively from the PTY output callback's own chunk, on the path production actually runs
  In order that a green CI run means SECURITY T14 holds where real bytes travel — not that it holds inside a function nothing calls
  the worker's live terminal frame must carry byte-for-byte what `term.onData` emitted and nothing else, no credential the worker's environment holds may reach a frame, the surviving envelope builders must still produce the exact frames the mirror already consumes, and the retired wrapper must be gone loudly enough that no stale caller and no stale test can read green off its absence

  Background:
    Given the REAL interactive worker driver running over a scripted PTY double and a stubbed `which` — never a real `claude`, which would hang a headless run forever
    And the REAL worker stream client over a fake transport that records every envelope it is handed
    And the two joined by the SAME arrow both production call sites use: the driver's output callback receives `(chunk, sessionId)` and hands `String(chunk)` straight to `sendTerminalFrame(sessionId, ...)`
    And a live connection, so a frame is genuinely sent rather than dropped by the disconnected-is-a-no-op posture

  # HEADLINE 1 — the positive half of T14, re-aimed. The chunk is the ONLY input to the
  # streamed bytes. Every row is a shape that has historically tempted a producer to
  # "help": an escape sequence to sanitise, a line ending to normalise, a code point to
  # re-encode, a JSON-looking payload to parse. The lane is content-blind by contract, so
  # every one of them rides untouched.
  Scenario Outline: a streamed frame carries exactly the chunk the output callback was handed — nothing appended, nothing normalised, nothing re-encoded
    Given the worker's session is streaming on the <producer lane> lane
    When the PTY emits <the chunk `term.onData` delivers>
    Then exactly one frame is streamed for that chunk — never two, never none
    And the frame's top-level keys are exactly `kind`, `nodeId`, `signal` — no fourth key
    And its `signal.bytes` is <the frame's `signal.bytes`>
    And its `signal.sessionId` is <`signal.sessionId`>, riding INSIDE the signal and never as a top-level key
    And emitting the identical chunk a second time produces an identical frame — the streamed bytes are a function of the chunk alone, of no clock, no file and no ambient state

    Examples:
      | case                                          | producer lane | the chunk `term.onData` delivers  | the frame's `signal.bytes`                                    | `signal.sessionId` |
      | a plain line of output                        | assignment    | `hello from the worker\n`         | `hello from the worker\n`                                     | the captured id    |
      | the claude TUI's absolute-cursor repaint      | assignment    | `\u001b[2J\u001b[H claude ›`      | the same escape bytes, unstripped and unescaped               | the captured id    |
      | CRLF, which this tree actually checks out     | assignment    | `line one\r\nline two\r\n`        | the same bytes — `\r\n` is NEVER normalised to `\n`           | the captured id    |
      | multi-byte UTF-8 box drawing and a check mark | assignment    | `┌── ✓ done ──┐`                  | the same code points, never re-encoded and never split        | the captured id    |
      | output that READS like an env assignment      | assignment    | `GIT_ASKPASS=/tmp/aof-askpass\n`  | the same bytes — it is screen content, not a credential read  | the captured id    |
      | output that READS like a control message      | assignment    | `{"type":"resize","cols":80}`     | the same bytes — never parsed, never branched on              | the captured id    |
      | a chunk emitted BEFORE the session is known   | assignment    | `early output\n`                  | the same bytes — the pre-capture frame still rides            | `null`             |
      | the resumed session's first repaint           | resume        | `resumed session output\n`        | the same bytes                                                | the resumed id     |
    # ROW 5 IS THE ONE A REVIEWER WILL QUERY, so it is stated in terms: a PTY that PRINTS
    # the string `GIT_ASKPASS=` has printed it to a screen, and the mirror is a live view
    # of that screen. The invariant is about what the PRODUCER reads, never about what the
    # session displays. Scenario 2's last row carries the same boundary at full strength.
    # ROW 7 is ADR-013's measured mid-stream-capture case (`test/mesh-worker-driver-
    # output-chunk.test.mjs` pins the driver half): a session id is often unresolved on
    # the first chunks. The bytes still ride; the frame carries `null`; ADR-014 invariant
    # 4 drops it downstream rather than delivering it to the wrong card. A producer that
    # WITHHELD the chunk until a session id existed would silently lose a worker's first
    # screen, which is the screen an operator most wants.
    # ROW 8 is the SECOND call site. `mesh-launcher.mjs:1291` wires the identical arrow
    # for `createMeshWorkerTerminalResumeHandler`, and two call sites are two chances to
    # disagree — the defect class this whole milestone exists to end.

  # HEADLINE 2 — the negative half of T14, and the half that would actually hurt. The
  # worker's process environment genuinely holds clone tokens, askpass paths and minted
  # write credentials while its PTY streams; the streamed signal must be provably free of
  # them. The load-bearing Then is the CONCATENATION IDENTITY: if the streamed bytes equal
  # the emitted chunks exactly, there is no room in the stream for a byte the PTY did not
  # print, whatever the secret happened to be.
  Scenario Outline: credential material the worker holds while streaming never appears in a streamed frame
    Given the worker process holds <the secret material the worker holds> for the duration of the session
    And the PTY prints <what the PTY prints>
    When every streamed frame is collected
    Then the concatenation of every frame's `signal.bytes` equals the concatenation of every chunk the PTY emitted, exactly — byte count included
    And <the verdict on the secret's value>
    And no frame carries a key beyond `kind`, `nodeId`, `signal`, and no signal carries a key beyond `sessionId`, `bytes` and the end marker
    And the same session run with NO secret material present produces a byte-identical sequence of frames — the secrets are not merely absent from the output, they are absent from the computation

    Examples:
      | case                                     | the secret material the worker holds                            | what the PTY prints                    | the verdict on the secret's value                                          |
      | a clone token in the environment         | `AOF_MESH_CLONE_TOKEN` set to a live-shaped token                | ordinary session output                | no frame's bytes contain the token, or any prefix of it longer than 8 chars |
      | the askpass helper and its one-shot file | `GIT_ASKPASS` set to a path, and that file holding a secret      | ordinary session output                | neither the path nor the file's contents appear in any frame                |
      | a minted write credential held in memory | an installation token resolved for the push seam                 | ordinary session output                | the minted token appears in no frame                                        |
      | a provider API key in the environment    | `ANTHROPIC_API_KEY` set to a key-shaped value                    | ordinary session output                | the key appears in no frame                                                 |
      | the environment carries no secret at all  | none                                                            | ordinary session output                | the baseline — this run's frames are the ones the row above is compared to  |
      | THE BOUNDARY: the session PRINTS a secret | `AOF_MESH_CLONE_TOKEN` set to a live-shaped token                | the token's value, echoed to the screen | the value DOES ride — verbatim, as printed; see the note                    |
    # THE LAST ROW DEFINES THE INVARIANT'S EDGE, and it is recorded rather than quietly
    # widened. T14's surviving half is "the producer adds nothing", NEVER "the stream is
    # scrubbed". A redaction pass would mean parsing terminal content on a lane that is
    # content-blind by contract (`mesh-ui-serve.mjs:168-169` bounds the input lane by
    # BYTES precisely so nothing on either direction has to understand what it carries),
    # and a redactor that half-worked would be worse than none — an operator would trust a
    # scrub that missed a shape. So the litmus for this row is the SAME concatenation
    # identity as every other: the producer added nothing. QA raises the residue (a worker
    # session that prints a secret mirrors it to whoever can open that fleet card) as an
    # observation for the security lane, NOT as a requirement smuggled into this task.
    # ROW 5's differential is the strongest Then in this scenario: an absent string can be
    # absent by luck of the test data. Two runs producing byte-identical frames with and
    # without the secrets present is absence by construction.

  # HEADLINE 3 — deleting the dead wrapper must not change one byte on the wire. The
  # module keeps every LIVE export: `buildTerminalFrameEnvelope` feeds
  # `worker-stream-client.mjs`, `buildTerminalInputEnvelope` feeds `mesh-ui-serve.mjs`,
  # and the mirror reads what they build. Deliberately NOT tagged `@bug`: this scenario
  # closes no defect, it guards against one the deletion could introduce — the coverage
  # those builders hold today reaches them only THROUGH the dying wrapper.
  Scenario Outline: every surviving envelope builder still produces exactly the frame its consumer already reads
    Given the REAL in-memory terminal mirror with one subscriber open on the tuple (`node-a`, `sess-1`)
    When an envelope built by <the surviving builder> is applied to it
    Then the envelope's top-level keys are exactly `kind`, `nodeId`, `signal` — the frozen shape, unchanged by the deletion
    And its `kind` is <`kind`>
    And its `signal` carries <what rides inside `signal`>
    And <what the subscriber observes>
    And the JSON the builder produces for a fixed set of inputs is byte-identical to the frame pinned before the deletion — the wire is unchanged, not merely equivalent

    Examples:
      | case                                  | the surviving builder                        | `kind`          | what rides inside `signal`                                | what the subscriber observes                                                   |
      | a live output frame                   | `buildTerminalFrameEnvelope`                 | terminal-frame  | the sessionId and the bytes verbatim                      | exactly those bytes, with `{ end: false }`                                      |
      | the end-of-stream marker              | `buildTerminalEndEnvelope`                   | terminal-frame  | the sessionId and `end: true`, and NO bytes key            | `{ end: true }`, carrying no terminal content a worker's own output could forge |
      | a browser keystroke on the input lane | `buildTerminalInputEnvelope`                 | terminal-input  | the TARGET nodeId's sessionId and the keystroke verbatim  | nothing — a non-terminal-frame kind is never delivered to a terminal subscriber |
      | a control-driven resume request       | `buildTerminalResumeEnvelope`                | terminal-resume | the sessionId, assignmentId, workspaceId and itemRef      | nothing, for the same reason                                                    |
      | a frame for an UNSUBSCRIBED tuple     | `buildTerminalFrameEnvelope` on (node-z, sess-9) | terminal-frame | the sessionId and the bytes verbatim                   | nothing on (`node-a`, `sess-1`) — dropped, never mis-routed, never an error     |
    # ROW 3 IS THE COVERAGE STORY.md DEMANDED SURVIVES. `test/mesh-terminal-relay-
    # bridge.test.mjs` today exercises the envelope builders only THROUGH the dying
    # wrapper; deleting the wrapper without re-homing these lanes would delete their
    # coverage silently — the mirror-image of the mistake this story is fixing.
    # ROW 5 is ADR-014 invariant 4, re-asserted only as far as "the deletion did not
    # disturb it". The mirror's own routing, its bounded tail and its replay are m38's
    # contract and are NOT re-verified here.

  @bug
  # HEADLINE 4 — the retired export is gone, and its absence is LOUD. This is the
  # deletion checklist STORY.md demanded, expressed as a runtime fact rather than a grep:
  # `wireTerminalBridge` is documented as dead in three places and is still on disk, and
  # the mirror-image risk is a fourth reader nobody enumerated. In ESM a missing named
  # export fails at LINK time, so no stale caller and no stale test can read `undefined`
  # and stay green — the property that makes this deletion checkable at all.
  Scenario: the retired export is gone from the shipped module, and asking for it fails loudly rather than silently
    Given `src/mesh-terminal-relay-bridge.mjs` loaded by plain `node`
    When its export surface is read
    Then its exported names are exactly: `TERMINAL_FRAME_KIND`, `TERMINAL_INPUT_KIND`, `TERMINAL_RESUME_KIND`, `loopbackRelayUrl`, `buildTerminalFrameEnvelope`, `buildTerminalEndEnvelope`, `buildTerminalInputEnvelope`, `buildTerminalResumeEnvelope`, `createTerminalRelayPushTransport`
    And `wireTerminalBridge` is not among them
    And a module importing `{ wireTerminalBridge }` from it fails to LINK, with an error naming the missing export — never a silently-undefined binding
    And that failure is what makes a leftover caller or a leftover test lane impossible to leave behind: a suite still asserting the deleted function's internals cannot run at all, let alone run green

  # The enumeration itself — every reader named BEFORE the export is removed, per
  # STORY.md's deletion checklist. Eight importers of this module exist across `src/`;
  # not one takes the dying export. A ninth nobody listed fails this table at import
  # rather than at daemon start, which is the far-from-its-cause failure this story is
  # deliberately avoiding.
  @bug
  Scenario Outline: every shipped module that depends on the bridge still links, and still receives the binding it takes
    Given <the dependent module> imported by plain `node`
    When it is loaded
    Then it loads without error — no unresolved import, no link failure
    And the binding it takes from the bridge, <the binding it takes>, is defined
    And it takes no binding named `wireTerminalBridge`

    Examples:
      | the dependent module                | the binding it takes                                                                          |
      | `src/worker-stream-client.mjs`      | `buildTerminalFrameEnvelope`, `buildTerminalEndEnvelope`, `TERMINAL_INPUT_KIND`, `TERMINAL_RESUME_KIND` |
      | `src/mesh-ui-serve.mjs`             | `buildTerminalInputEnvelope`                                                                   |
      | `src/mesh-terminal-mirror.mjs`      | `TERMINAL_FRAME_KIND`, `loopbackRelayUrl`                                                      |
      | `src/mesh-terminal-input.mjs`       | `TERMINAL_INPUT_KIND`, `TERMINAL_RESUME_KIND`                                                  |
      | `src/control-stream-server.mjs`     | `TERMINAL_FRAME_KIND`                                                                          |
      | `src/mesh-launcher.mjs`             | `createTerminalRelayPushTransport`                                                             |
      | `src/commands/mesh-terminal-resume.mjs` | `buildTerminalResumeEnvelope`, `createTerminalRelayPushTransport`                          |
      | `src/commands/mesh-ui.mjs`          | `createTerminalRelayPushTransport`                                                             |
    # The list is CLOSED at eight by measurement, not by belief: these are the modules
    # under `src/` that import `./mesh-terminal-relay-bridge.mjs` today. STORY.md's 16
    # dependents count includes transitive readers and tests; what matters for a deletion
    # is the direct-import set, and none of it names the dying export.
