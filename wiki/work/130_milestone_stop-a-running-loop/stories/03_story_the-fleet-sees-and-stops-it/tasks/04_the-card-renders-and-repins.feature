@ui @work @board
Feature: the card renders the loop lines and the button inside its existing paragraph map, the one fetch lives in api.ts, Fleet.tsx stays under its ceiling, and FF-5307 is re-pinned with the measurement

  ADR-005 §5-§6; DESIGN §Surface 1's binding checklist. `Fleet.tsx` swaps `nodeCurrentWork(node)`
  for `nodeWorkRegion(node, status.localNodeId)` at the node card and renders the loop entries
  inside the existing `<p>` map as the DESIGN's flex row — text span (`min-w-0 truncate`, `title`
  = the whole value), ONE `<button>` on this node's card only (`Stop` muted / `Stop now`
  destructive, the classes pinned in the DESIGN), the message span for a refusal — holding one
  `useState` for the rung memory plus the in-flight / post-2xx hold the assign affordance already
  defines (`ASSIGN_SENT_HOLD_MS`, `ASSIGN_TIMEOUT_MS`). `api.ts` gains `fleetApi.loopStop(scope,
  workspaceId)` — the ONE `fetch("/api/mesh/loop-stop"` in `ui/`. No new file under
  `ui/src/fleet/` (20/20) and `Fleet.tsx` stays ≤ 1,560 lines. FF-5307's `ui/` hash is re-pinned
  ONLY with the measurement in its comment: `git diff -- ui/` names exactly the six fleet files,
  nothing under `ui/src/board/` moved, `src/board-ui.mjs`'s digest is unchanged, no run-record key
  is read that was not read before. FF-5202: no `loops-*` token enters `ui/`.

  RULINGS (QA, 2026-09-13). The harness (`fleet-app-harness` over `react-app-harness`) mounts the
  REAL `Fleet.tsx` against a REAL `serveMeshUi` fixture: it records every request, can HOLD one
  response's delivery (`holdNext`), owns the clock (`advance` / `advanceHeld`) and stamps the
  browser's same-origin `Origin` — it does NOT fabricate answers. So every answer below is PRODUCED:
  the card renders from presence records the test publishes into the fixture's mesh root, the route
  answers from run records under the fixture's work dir (the verb reads them, task 02), and
  in-flight / timeout states come from a hold plus the clock. A 403 `cross-origin-refused` cannot
  reach the mounted app (the harness IS the same-origin envelope), so it is task 02's row and is not
  asserted here. The serving node is `control-a` (the fixture's committed id, task 01), the remote
  node is a second published node `umamis-mac-mini`. Refusal words: `loop-stop-not-local` → `not
  local`, `loop-stop-no-declaration` → `no loop`, the timeout → `timed out`; any other code renders
  the server sentence itself (assign's rule for an unmapped code); `title` carries the sentence in
  every case. The resume case (PO ruling, task 03): the memory is keyed to the DRIVE — after a
  cancel 2xx the card remembers rung 3 for `L1` AGAINST the drive's `runId`; a later wire
  `stop: null` under the same id and the SAME `runId` (the propagation gap) keeps `cancelling`
  with no button, and a later wire entry with a NEW `runId` (a `--resume` minted a new drive) reads
  as a fresh loop line with `Stop` — no reload, no timer. Lanes are tagged per scenario: the harness lanes are `@executable`; the 1280 render the
  designer judges is `@uat` (DESIGN §Conformance: 1280 only).

  Background:
    Given the fleet app harness mounted over the published assign fixture (own id `control-a`), which also published node `umamis-mac-mini`
    And the fixture's workspace `w1` holds stream `129` with item `129/04` and a `running` run under `loopRunId` `"L1"`, `scope` `"129"`, fresh heartbeat
    And `E1` = `{ loopRunId: "L1", workspaceId: "w1", scope: "129", level: "L2", cap: 3, phase: "continue", cycle: 1, ref: "129/04", runId: <that run>, supervised: false, stop: null }`
    And the test publishes each node's presence record into the fixture's mesh root before the mount, and re-publishes it to stand in for a node's tick

  @executable
  Scenario: with no loops the region is byte-identical to today
    Given every node's presence carries `activeRuns: ["r1"]` and no `loops`
    When the fleet renders
    Then each node card's current-work region is exactly one `<p>` per line of `fleetCurrentWorkLines(node.presence)`, each with today's class string and `title`, and no flex-row `<p>` inside it
    And no `<button>` reading `Stop` or `Stop now` exists anywhere on the page

  @executable
  Scenario Outline: the loop line renders with a button only on this node's card
    Given `status.localNodeId` is <localNodeId> and node <node>'s presence carries `activeRuns: [E1.runId]`, `loops: [E1]`
    When the fleet renders
    Then that card's current-work region holds `running 1 run` then a `<p class="flex items-center gap-2 text-[13px] font-semibold text-primary">` whose `min-w-0 truncate` text span reads `loop 129 · continue 129/04 · cycle 1 of 3`
    And the row holds <button>
    And the text span's `title` <title>

    Examples:
      | localNodeId    | node               | button                                                                                                                  | title                                                              |
      | `"control-a"`  | `control-a`        | one `<button type="button">` reading `Stop`, `aria-label` and `title` `Stop loop 129 — the current drive finishes first`, the DESIGN's muted classes, and no message span | is `loop 129 · continue 129/04 · cycle 1 of 3 · L2` |
      | `"control-a"`  | `umamis-mac-mini`  | no `<button>` and no message span                                                                                       | ends `· L2 · remote — stop from umamis-mac-mini's own console`     |
      | `null`         | `control-a`        | no `<button>` and no message span                                                                                       | is `loop 129 · continue 129/04 · cycle 1 of 3 · L2` — no tail      |

  @executable
  Scenario: two loops on one card are two rows, each with its own button, in scope order
    Given `control-a`'s presence carries `loops: [E1, E1 with scope "131" loopRunId "L2" ref "131/00"]`
    When the fleet renders
    Then the card holds two flex-row `<p>`s, `loop 129 …` before `loop 131 …`, each with one `Stop` whose `aria-label` names its own scope
    And the region holds no `idle` line

  @executable
  Scenario: pressing Stop POSTs the route and climbs to rung two under the hold
    Given this node's card shows `E1` with `stop: null`
    When `Stop` is clicked with the route's answer held
    Then exactly one request was sent: `POST /api/mesh/loop-stop`, `content-type: application/json`, body exactly `{ scope: "129", workspaceId: "w1" }`
    And while it is held the button is `disabled` with `aria-busy="true"`, still reads `Stop`, and the line is unchanged
    And a second click while it is held sends no second request
    When the held answer (200, `request: "drain"`, `state: "requested"`) is released
    Then the line reads `loop 129 · stopping · continue 129/04 · cycle 1 of 3`, the button reads `Stop now` with `aria-label` `Stop loop 129 now — cancels the in-flight session` and the DESIGN's destructive classes
    And the button is `disabled` at `ASSIGN_SENT_HOLD_MS - 1` on the harness clock and enabled at `ASSIGN_SENT_HOLD_MS`
    And a re-render from a later poll whose presence still carries `stop: null` keeps `stopping` and `Stop now` — the memory never decays
    And a later poll whose presence carries `stop: "drain"` reads the same — the wire caught up and nothing moved

  @executable
  Scenario: pressing Stop now cancels and the button is gone
    Given this node's card shows `E1` at rung 2 (`stop: "drain"` on the wire, the fixture's request file at level 1)
    When `Stop now` is clicked and the route answers 200 with `request: "cancel"`
    Then the line reads `loop 129 · cancelling · continue 129/04 · cycle 1 of 3` and the row holds no `<button>` and no message span
    And a later poll whose presence no longer lists `L1` and carries `activeRuns: []` removes the line and the region reads `idle` in the same render

  @executable
  Scenario Outline: after a cancel the card follows the drive, not the clock
    Given this node's card has passed rung 2's 2xx for `L1` while its entry carried `runId` `"r1"`
    When a later poll's presence lists `L1` with `stop: null` and `runId` <runId>
    Then the line reads <line> and the row holds <button>

    Examples:
      | runId  | line                                                        | button                                          |
      | `"r1"` | `loop 129 · cancelling · continue 129/04 · cycle 1 of 3`   | no `<button>` — the same drive, the wire not yet caught up |
      | `"r2"` | `loop 129 · continue 129/04 · cycle 1 of 3`                | one `Stop` button — a new drive, a fresh memory |

  @executable
  Scenario Outline: a refusal renders in the message slot and the button keeps its rung
    Given this node's card shows `E1` at rung <rung> and the fixture is arranged so that <arrangement>
    When the button is clicked
    Then the route answered <answer> and the message span reads <word> with `title` <title>, in `mono min-w-0 shrink truncate text-[10.5px] text-destructive`
    And the button reads its prior label and is enabled at once — no hold is placed — and the line is unchanged
    And a second click after the refusal sends a second request and the message reads the new outcome

    Examples:
      | rung | arrangement                                                                 | answer                            | word                                    | title                                              |
      | 1    | the latest run under `"L1"` carries `node: "umamis-mac-mini"`               | 409 `loop-stop-not-local`         | `not local`                             | the server sentence, naming both nodes             |
      | 1    | no run in stream `129` carries a usable `brief.loop`                        | 404 `loop-stop-no-declaration`    | `no loop`                               | the server sentence                                |
      | 2    | no run in stream `129` carries a usable `brief.loop`                        | 404 `loop-stop-no-declaration`    | `no loop` — and the button still reads `Stop now` | the server sentence                      |
      | 1    | `w1` was removed from the projection after the mount                        | 404 `workspace-not-found`         | the server sentence itself — an unmapped code is not re-worded | the same sentence                    |
      | 1    | the route's answer is held and the harness clock advances `ASSIGN_TIMEOUT_MS` | none within the wait             | `timed out`                             | a sentence naming the wait and saying the request may still have landed, never that it failed |

  @executable
  Scenario: the one fetch and the budgets
    When `ui/src/**` is read
    Then exactly one file, `ui/src/fleet/api.ts`, contains `fetch("/api/mesh/loop-stop"`, inside `fleetApi.loopStop(scope, workspaceId)`, and it throws the route's coded envelope on a non-2xx as `assign` does
    And no file under `ui/src/fleet/` is new — the directory holds exactly the 20 files it held before
    And `ui/src/fleet/Fleet.tsx` is at most 1560 lines
    And no file under `ui/` contains a token matching `work[-/]loops|loops-show|loops-graph|loops-groundedness|loops-validate|work:loops-`

  @executable
  Scenario: FF-5307 is re-pinned with the measurement, or not at all
    When `test/arch/loop/acd-loop-state-rides-the-run-record.test.mjs` is read
    Then the `ui/` hash assertion carries a new comment naming this milestone, the six fleet files `git diff -- ui/` reports, "nothing under `ui/src/board/`", and that `src/board-ui.mjs`'s digest is unchanged
    And the `src/board-ui.mjs` and `src/run-store.mjs` pins are the same digests as before this story
    And the control is green over the delivered tree

  @uat
  Scenario: the rendered card at 1280 is judged against the binding checklist
    Given the published assign fixture stood up on a real port serving the real built `ui/dist` (the `uatRenderFace` shape), with presence records carrying `loops: [E1]` published for both `control-a` and `umamis-mac-mini`
    When QA renders `/?mode=fleet` at 1280 wide through the browser harness and hands the designer the screenshot of both node cards
    Then the designer judges the local card (line + `Stop`) and the remote card (line, no button) CONFORMS against DESIGN §Surface 1's binding checklist, and the verdict is recorded in `VERIFICATION.md`
