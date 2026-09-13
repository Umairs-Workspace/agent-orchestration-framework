@executable @cli @work @validate
Feature: The import-graph and export-set gates — `acd-session-driver-mesh-blind` and `acd-session-driver-single-home` catch a planted violation

  Two gates over one module boundary, and both are decision procedures rather than
  impressions. FF-5301 carries THREE legs, and the first is the strongest: the driver's DIRECT
  source-import set is frozen at exactly five (ADR-001 §3's own list); its TRANSITIVE walk — the
  `acd-loop-checks-pure` idiom (`:39-54`), which is why a laundering module one hop away cannot
  satisfy it — asserts the mesh-LIFECYCLE denylist is unreached, with exactly two admitted
  reasons; and a reached-module CEILING of 21 with a floor holds the load-cost guarantee as a
  number. FF-5302 asserts the move was a SUBTRACTION: exact set equality over the frozen
  SEVENTEEN-name export set in BOTH directions, zero definitions of any of them left in the sink,
  all of them re-exported by REFERENCE IDENTITY so the 48 fresh-linkable members still resolve the
  same bindings, while `scripts/pin-checkout-id.mjs` receives a separate static/link-only proof. Of
  the 43 importer suites, 42 stay byte-unchanged and one named gate is deliberately re-aimed by
  reopened 53/00. A line-count ratchet remains on the sink.

  The scenarios below are about what the two gates DO on a violating tree, never about whether
  the driver is mesh-blind — that claim is FF-5301 itself and lives in ARCHITECTURE.md. So the
  denylist is exercised by planting a fixture module chain the gate must catch, and the admitted
  edge by planting a SECOND route to the same module that it must not excuse.

  PROXY HONESTY, contracted as behaviour rather than hidden. FF-5301's mesh-identity token grep
  is a named PROXY: a driver that took an assignment id under another name passes it. The
  scenarios below therefore contract what it catches (the four tokens, comment-stripped) AND
  assert that it passes on the stated false negative, so the proxy's surface is a green
  assertion in the suite rather than a caveat in a document. The real guarantee is the frozen
  five-member DIRECT set plus the transitive lifecycle leg plus the 21-module reach ceiling plus
  FF-5302's frozen export set, and the scenarios say which leg carries which claim.

  ONE ROW CORRECTED, AND IT WAS SELF-CONTRADICTORY. **ADR-015 §5 carries the measurement and the
  reasoning; this is the one-paragraph reason the scenarios below changed shape.** FF-5301's original
  row asserted ONE transitive denylist including `workspace.mjs` and "any `mesh-*.mjs`" — while its own
  admitted `terminal-ws.mjs → work.mjs` edge reaches `workspace.mjs` unconditionally at
  `src/work.mjs:17`. A denylist that denies what its own allowlist grants is RED ON ANY TREE, not red
  because unbuilt, and the same contradiction repeats one hop down at `degrade.mjs`'s only import. A
  filename glob was standing in for ADR-001 §3's own words, "zero mesh-**LIFECYCLE** imports". So the
  denylist is the lifecycle set named module by module, `mesh-log.mjs` and `workspace.mjs` are admitted
  each by a named reason carrying a self-check, and the load-cost guarantee becomes a number.

  Two measured facts about the frozen seventeen that the gate has to encode rather than assume.
  `defaultPtySpawn` was module-PRIVATE in the sink BEFORE 53/00 — a bare `const`, not an export — so
  the driver's export of it and the sink's re-export of it were both NEW export sites, which is why
  the gate names it in the frozen set rather than assuming it. RE-MEASURED AT HEAD 2026-08-17: 53/00
  landed exactly that, and the sink now IMPORTS it from the driver
  (`src/mesh-worker-execution.mjs:155`) and re-exports it (`:872`) — the old `:1373` cite is
  unrelated code, and this feature's first draft carried it in the present tense. The leg the gate
  owes is unchanged (the sink's binding must resolve to the driver's own) and it is green today. The
  second fact: `ensureWorktreeTrusted` is already a re-export from `claude-trust.mjs` at the sink's
  `:1442`; ADR-001 §1 carries it with the move as a parenthetical, so it is named as the one ADMITTED
  addition to the sixteen — the frozen set is SEVENTEEN (ADR-010 §18) and an eighteenth unnamed export
  fails.

  ADR-001 §1–§4; ADR-010 §17/§18; ADR-015 §5; the `## Fitness functions` rows FF-5301 and FF-5302.

  Scenario: the driver's DIRECT source-import set is exactly the frozen five
    Given `src/agent-session-driver.mjs`'s own static specifiers, read from BOTH its `import` and its `export … from` forms, node builtins set aside
    When they are compared with ADR-001 §3's frozen list
    Then the set is exactly `claude-trust.mjs`, `degrade.mjs`, `terminal-providers.mjs`, `terminal-ws.mjs` and `work-observe.mjs`
    And an `import`-only parse measures FOUR and is red for the wrong reason — `claude-trust.mjs` arrives as `export { ensureWorktreeTrusted } from "./claude-trust.mjs"` (`:664`), so a leg that cannot see an `export … from` fails on its own parser
    And the comparison is exact set equality in both directions — a sixth direct import and a missing one both fail
    And a DIRECT `workspace.mjs`, `mesh-log.mjs` or `run-store.mjs` import fails HERE even though the first two are admitted TRANSITIVELY — the direct set is the strictest of the three legs and admits no reason
    And with a specifier the walk cannot resolve planted in the driver, this leg still returns its own verdict — the direct set is read from the module's own text, and the two legs report independently

  Scenario: a fixture module reaching a denylisted module two hops away fails the mesh-blind gate
    Given a fixture entry module importing `./launder.mjs`, which imports `./run-store.mjs`
    When the gate walks the entry's static import graph transitively
    Then the gate fails, naming the denylisted module and the path that reached it
    And the path it reports is the full chain, not just the direct importer
    And a one-hop laundering module does not satisfy the gate — that is what the transitive walk is for

  Scenario: the walk visits its root and reaches more than one module — the sweep is non-vacuous
    Given `src/agent-session-driver.mjs` as the walk root
    When the transitive walk completes
    Then the visited set contains the root itself
    And the visited set is larger than the root alone
    And a walk that resolved nothing fails before any denylist assertion is made

  Scenario: the single admitted edge terminal-ws.mjs → work.mjs is not flagged
    Given the real driver module, whose import of `terminal-ws.mjs` reaches `work.mjs`
    When the gate walks the graph
    Then the gate passes
    And `work.mjs` is reported as reached through the admitted edge, named as such

  Scenario: a second route to work.mjs is flagged even though one route is admitted
    Given a direct `import { loadWorkspace } from "./work.mjs"` added to the driver module
    When the gate walks the graph
    Then the gate fails, naming the direct edge
    And the admitted `terminal-ws.mjs → work.mjs` edge does not excuse it — the permission is for one edge, not for the module
    And it fails identically for a second admitted-module route reaching `work.mjs` through a new intermediate
    And the leg is decided on `work.mjs`'s IN-EDGE SET within the walk, which must be exactly `{terminal-ws.mjs}` — never on the first chain a depth-first walk happened to record, because a second route added after the admitted one leaves that chain unchanged and the gate green while the edge list plainly holds both

  Scenario: `mesh-log.mjs` and `workspace.mjs` are reached and NOT flagged — each admitted by its named reason
    Given the real driver, whose admitted `degrade.mjs` import reaches `mesh-log.mjs`, and whose admitted `terminal-ws.mjs → work.mjs` edge reaches `workspace.mjs` at `src/work.mjs:17`
    When the gate walks the graph
    Then the gate passes, reporting each of the two against the reason that admits it
    And `workspace.mjs` is admitted under EITHER admitted reason, because its in-edge set inside the walk is exactly `{mesh-log.mjs, work.mjs}` — the log sink resolves `globalMeshPaths` at `src/mesh-log.mjs:16` and the admitted edge reaches it at `src/work.mjs:17`, and a gate naming only one of the two would report a route this contract does not list
    And neither is a member of the transitive LIFECYCLE denylist — a JSONL log sink and a path resolver carry no assignment, lease, worktree registry or workspace identity
    And a module is never denied for its basename beginning `mesh-` — the denylist is the lifecycle set, named module by module, because ADR-001 §3's own words are "zero mesh-LIFECYCLE imports"
    And a THIRD in-edge to `workspace.mjs` — one from neither admitted subtree — fails the gate, naming the importer, so admitting the module never becomes admitting every route to it

  Scenario: an admitted edge that no longer exists fails the gate as a stale permission
    Given `terminal-ws.mjs` no longer importing `work.mjs`
    When the gate checks its admitted-edge list against the real graph
    Then the gate fails, naming the admitted edge that has no subject
    And the message says the permission may now be deleted — a permission with no subject is how a severed edge quietly returns

  Scenario: the `degrade.mjs → mesh-log.mjs` admission carries the same self-check
    Given `degrade.mjs` no longer importing `mesh-log.mjs`
    When the gate checks its two admitted reasons against the real graph
    Then the gate fails, naming the admission whose subject is gone
    And the message says the permission may now be deleted — the sink was admitted because it is `degrade.mjs`'s only import, and that reason is what the check re-measures
    And the gate carries exactly TWO admitted-reason self-checks, one per reason, each failing independently — a reason is re-measured against the graph, never trusted once written

  Scenario: each denylist member is caught when a fixture reaches it
    Given a fixture module importing one denylisted module
    When the gate walks it
    Then the gate fails, naming that module
    And it fails identically for every member of the frozen denylist
    And a module NOT on the denylist — `terminal-providers.mjs`, `work-observe.mjs`, `claude-trust.mjs`, `degrade.mjs`, a node builtin — is not flagged

  Scenario: BOTH lists are asserted as frozen sets, not as a hand-typed regex per run
    Given the gate's DIRECT import set and its TRANSITIVE lifecycle denylist, read as two separate lists
    When each is read
    Then the direct set equals ADR-001 §3's frozen five exactly, both directions
    And the transitive denylist equals the LIFECYCLE set exactly, both directions — `run-store.mjs`, `effects/*`, `global-work-store.mjs`, `workspace-identity.mjs`, `item-lock.mjs`, `board-*.mjs`, `src/commands/*`, and the eight mesh lifecycle modules by name
    And `mesh-log.mjs` and `workspace.mjs` are ABSENT from the transitive list, each admitted by its named reason instead
    And a list that has silently lost a member fails the gate's own self-check
    And a denylist member that an admitted reason or the direct set already grants fails that same self-check — a list denying what its own permissions grant is red on any tree, which is what ADR-015 §5 measured and ruled

  Scenario: the reached-module count carries a ceiling of 21 and a floor
    Given the transitive walk from `src/agent-session-driver.mjs`
    When the number of modules it reaches is measured, COUNTING THE ROOT ITSELF
    Then it is at most 21 — the count measured 2026-08-17, against the sink's 55 on the same root-inclusive definition
    And the gate pins that definition in its own message, because the same walk reads 20 and 54 root-exclusive and a ceiling whose counting rule is unstated is unreproducible
    And a walk reaching more fails, reporting the measured count and the ceiling, and stating that raising the ceiling is an ADR decision, not a diff
    And a walk reaching fewer than the floor fails as "the graph was not actually walked", before any ceiling comparison is made
    And a genuine later subtraction passes — this is a ceiling, not an equality
    And the same walk over `src/mesh-worker-execution.mjs` reaches 55, so the gate reports both numbers and the guarantee is a measured ratio rather than an argument

  Scenario: the mesh-identity token grep catches each of the four tokens in the driver's body
    Given `assignmentId` present in `src/agent-session-driver.mjs`'s comment-stripped body
    When the gate greps the four mesh-identity tokens
    Then the gate fails, naming the token and its line
    And it fails identically for `workspaceId`, `leaseId` and `assignment`

  Scenario: the token grep reads code, not prose — a comment naming an assignment does not fail it
    Given a comment in the driver reading "the mesh worker's assignment handler owns the worktree"
    When the gate greps with comments stripped
    Then the gate passes
    And the same token in an identifier or a string literal fails
    And a bare `driver` or `loop` sweep is not what the gate does — `mesh-*` modules narrate "driver" throughout and would be red on day one

  Scenario: the token leg PASSES on its own stated false negative — the proxy's surface is asserted, not hidden
    Given a fixture driver that takes the same value under the name `jobId`
    When the token grep runs
    Then the gate passes — this is the proxy's declared false negative, asserted so it is visible in the suite rather than only in prose
    And the transitive import leg is what refuses that fixture if it reaches a mesh-lifecycle module
    And FF-5302's frozen export set is what refuses it if it grows a signature the move did not carry

  Scenario: an extra export on the driver module fails the single-home gate
    Given `export function resolveAssignmentWorktree()` added to `src/agent-session-driver.mjs`
    When the gate compares the module's export set with the frozen set
    Then the gate fails, naming the extra export
    And the message states that an extra export is as much a defect as a missing one

  Scenario: a missing export on the driver module fails the same gate
    Given `buildDriverCommand` absent from `src/agent-session-driver.mjs`
    When the gate compares the two sets
    Then the gate fails, naming the missing export
    And the comparison is exact set equality in BOTH directions, never containment

  Scenario: `ensureWorktreeTrusted` is the one admitted addition to the sixteen, named as such
    Given the driver module carrying the frozen 16 plus the `ensureWorktreeTrusted` re-export from `claude-trust.mjs`
    When the gate reads the export set
    Then the gate passes, and the admitted name is listed explicitly in the gate rather than tolerated by a pattern
    And an eighteenth export not on that list fails, naming it

  Scenario: the sink defining any of the frozen seventeen fails the gate
    Given `export function buildDriverCommand(driver, brief) { … }` re-added to `src/mesh-worker-execution.mjs`
    When the gate greps the sink for a definition form of each of the SEVENTEEN, comments stripped
    Then the gate fails, naming the symbol and the definition site
    And it fails identically for `export const`, `export let`, `export class` and `export async function`
    And a definition inside a stripped comment does not fail it
    And the sweep is over the seventeen, not the sixteen — `ensureWorktreeTrusted` is a member of the frozen set (ADR-010 §18), so a sink that DEFINES it fails here too

  Scenario: the sink re-exports every one of the frozen seventeen by reference identity, not by copy
    Given both modules imported
    When each of the SEVENTEEN is compared
    Then the sink's binding and the driver's binding are the SAME reference
    And a second, equal-but-distinct definition in the sink fails the gate even though its behaviour matches
    And this is the property that keeps the 48 fresh-linkable members resolving the same bindings
    And the pin script is proved separately as static/link-only, while 42 importer suites stay byte-unchanged and the one named gate is re-aimed
    And `ensureWorktreeTrusted` passes this leg whichever module the sink re-exports it FROM — its own `:1442` route and the driver's both resolve to `claude-trust.mjs`'s single binding — so the leg pins the reference, never the route

  Scenario: `defaultPtySpawn`, private in the sink before the move, is carried as a real export on both sides
    Given `defaultPtySpawn` was a module-private `const` in the sink before 53/00, and at HEAD is imported from the driver at `src/mesh-worker-execution.mjs:155` and re-exported at `:872`
    When the gate reads the driver's export set and the sink's re-export set
    Then `defaultPtySpawn` is exported by the driver
    And the sink's `defaultPtySpawn` resolves to the driver's binding
    And a sink that keeps a private copy alongside the re-export fails the reference-identity leg

  Scenario: a named importer of the sink still resolves through the re-export
    Given `src/mesh-launcher.mjs`'s named import of `INTERACTIVE_COMMAND_READY_DELAY_MS` from the sink
    And `test/arch/acd-worker-driver-no-headless-print.test.mjs`'s import of `driveInteractiveClaudeSession` and `NEEDS_INPUT_SENTINEL` from the sink
    When each binding is resolved
    Then each resolves, and each is the driver module's own value
    And a re-export that omits one of them fails the gate naming the broken importer

  Scenario: the sink's line-count ratchet fires on growth and names both numbers
    Given the sink measurably above its recorded ceiling
    When the ratchet runs
    Then the gate fails, reporting the measured count and the ceiling
    And the message states that raising the ceiling is an ADR decision, not a diff
    And it states that the ceiling may not be met by deleting existing explanation

  Scenario: the ratchet carries a floor, so a rename or a truncated read cannot pass it silently
    Given the sink moved, renamed or read as an empty string
    When the ratchet runs
    Then the gate fails at the floor before any ceiling comparison is made
    And a count below the floor is reported as "the file was not actually read", not as headroom

  Scenario: the ratchet passes on a genuine shrink and does not demand an edit for it
    Given the sink measurably below its ceiling and above its floor after a later subtraction
    When the ratchet runs
    Then the gate passes
    And the ceiling is a ceiling, not an equality — a legitimate shrink is never a build failure

  Scenario: the ratchet's ceiling is the POST-MOVE measurement, not the pre-move size
    Given the sink measured at 3,286 lines before 53/00's subtraction
    When the ceiling recorded by the gate is read
    Then it is the count measured after the move, not the count before it
    And a ceiling set at or above the pre-move size fails the gate's own self-check — a ratchet armed at the size it was raised against is decoration

  Examples:
    | planted violation                                              | gate                              | what it reports                                    |
    | an `import`-only parse of the driver's specifiers              | acd-session-driver-mesh-blind     | FOUR — its own parser, not the tree, at `:664`     |
    | a sixth direct source import on the driver                     | acd-session-driver-mesh-blind     | the extra direct import, against the frozen five   |
    | `degrade.mjs` missing from the driver's direct imports         | acd-session-driver-mesh-blind     | the missing member of the frozen five              |
    | a DIRECT `workspace.mjs` import on the driver                  | acd-session-driver-mesh-blind     | the direct edge — no transitive reason applies     |
    | a DIRECT `mesh-log.mjs` import on the driver                   | acd-session-driver-mesh-blind     | the direct edge — admitted only one hop down       |
    | a DIRECT `run-store.mjs` import on the driver                  | acd-session-driver-mesh-blind     | the direct edge; denied on both legs               |
    | an unresolvable specifier planted in the driver                | acd-session-driver-mesh-blind     | the direct-set verdict, independent of the walk    |
    | driver → launder.mjs → run-store.mjs                           | acd-session-driver-mesh-blind     | the denylisted module and the full chain           |
    | driver → effects/run-transitions.mjs                           | acd-session-driver-mesh-blind     | the denylisted module and the direct edge          |
    | driver → mesh-worktree.mjs                                     | acd-session-driver-mesh-blind     | the denylisted module                              |
    | driver → mesh-presence.mjs                                     | acd-session-driver-mesh-blind     | the denylisted module — a mesh LIFECYCLE module    |
    | driver → global-work-store.mjs                                 | acd-session-driver-mesh-blind     | the denylisted module                              |
    | driver → workspace-identity.mjs                                | acd-session-driver-mesh-blind     | the denylisted module                              |
    | driver → item-lock.mjs                                         | acd-session-driver-mesh-blind     | the denylisted module                              |
    | driver → board-ui.mjs                                          | acd-session-driver-mesh-blind     | the denylisted module                              |
    | driver → commands/loop.mjs                                     | acd-session-driver-mesh-blind     | the denylisted module                              |
    | driver → work.mjs directly                                     | acd-session-driver-mesh-blind     | the second route; the admitted edge does not cover it |
    | driver → terminal-providers.mjs → hop.mjs → work.mjs           | acd-session-driver-mesh-blind     | the second route — the permission is for one edge  |
    | a second `work.mjs` route added later via `claude-trust.mjs`   | acd-session-driver-mesh-blind     | both in-edges of `work.mjs`, not the first chain   |
    | terminal-ws.mjs stops importing work.mjs                       | acd-session-driver-mesh-blind     | the stale admitted-edge permission                 |
    | degrade.mjs stops importing mesh-log.mjs                       | acd-session-driver-mesh-blind     | the stale admitted-reason permission               |
    | driver → terminal-providers.mjs                                | acd-session-driver-mesh-blind     | nothing — an admitted import                       |
    | driver → degrade.mjs → mesh-log.mjs                            | acd-session-driver-mesh-blind     | nothing — admitted: `degrade.mjs`'s only import    |
    | driver → terminal-ws.mjs → work.mjs → workspace.mjs            | acd-session-driver-mesh-blind     | nothing — admitted: the edge at `work.mjs:17`      |
    | driver → degrade.mjs → mesh-log.mjs → workspace.mjs            | acd-session-driver-mesh-blind     | nothing — the other of its two admitted in-edges   |
    | a THIRD in-edge to `workspace.mjs` from neither subtree        | acd-session-driver-mesh-blind     | the importer — admitting a module admits no route  |
    | `terminal-providers.mjs` dropped from the gate's DIRECT list   | acd-session-driver-mesh-blind     | the frozen-set self-check and the lost member      |
    | `workspace.mjs` put back on the TRANSITIVE denylist            | acd-session-driver-mesh-blind     | the member an admitted reason already grants       |
    | the driver's walk reaching 22 modules                          | acd-session-driver-mesh-blind     | measured count, the ceiling of 21, ADR-not-a-diff  |
    | the walk resolving no specifier at all                         | acd-session-driver-mesh-blind     | the floor — "the graph was not actually walked"    |
    | the driver's walk reaching 19 after a subtraction              | acd-session-driver-mesh-blind     | nothing — a ceiling is not an equality             |
    | the reach counted root-EXCLUSIVE against the 21 ceiling        | acd-session-driver-mesh-blind     | 20 of 21 — a module of headroom that is not there  |
    | the ceiling message stating no counting rule                   | acd-session-driver-mesh-blind     | a ceiling of 21 nobody can reproduce               |
    | the gate reporting the driver's 21 without the sink's 55       | acd-session-driver-mesh-blind     | one number — the guarantee is the measured ratio   |
    | `assignmentId` in the driver's body                            | acd-session-driver-mesh-blind     | the token and its line                             |
    | `workspaceId` in the driver's body                             | acd-session-driver-mesh-blind     | the token and its line                             |
    | `leaseId` in the driver's body                                 | acd-session-driver-mesh-blind     | the token and its line                             |
    | `assignment` in the driver's body                              | acd-session-driver-mesh-blind     | the token and its line                             |
    | "assignment" in a stripped comment                             | acd-session-driver-mesh-blind     | nothing — code, not prose                          |
    | the same value taken as `jobId`                                | acd-session-driver-mesh-blind     | nothing — the proxy's declared false negative      |
    | an eighteenth export not on the admitted list                  | acd-session-driver-single-home    | the extra export                                   |
    | `buildDriverCommand` missing from the driver                   | acd-session-driver-single-home    | the missing export                                 |
    | `buildDriverCommand` re-defined in the sink                    | acd-session-driver-single-home    | the symbol and its definition site                 |
    | the sink re-defines a symbol equal-but-not-identical           | acd-session-driver-single-home    | the reference-identity break                       |
    | the sink omits one of the seventeen from its re-export         | acd-session-driver-single-home    | the symbol and the importer it breaks              |
    | `defaultPtySpawn` kept private in the sink beside a re-export  | acd-session-driver-single-home    | the reference-identity break                       |
    | the sink grows past its ceiling                                | acd-session-driver-single-home    | measured count, ceiling, and the ADR-not-a-diff rule |
    | the sink renamed / read empty                                  | acd-session-driver-single-home    | the floor — "the file was not actually read"       |
    | the sink shrinks below its ceiling                             | acd-session-driver-single-home    | nothing — a ceiling is not an equality             |
    | the ratchet's ceiling set at or above the pre-move 3,286       | acd-session-driver-single-home    | the ceiling's self-check — a decorative ratchet    |

  Examples: stable evidence ownership for the closed denylist and its permissions
    | row id          | planted mutation / positive control                                      | expected observation                                                   | executable owner                                      |
    | IMP-DENY-01     | driver reaches `run-store.mjs`                                            | denied path and full chain                                             | test/arch/acd-session-driver-mesh-blind.test.mjs      |
    | IMP-DENY-02     | driver reaches a member of `effects/*`                                   | denied path and full chain                                             | test/arch/acd-session-driver-mesh-blind.test.mjs      |
    | IMP-DENY-03     | driver reaches `global-work-store.mjs`                                   | denied path and full chain                                             | test/arch/acd-session-driver-mesh-blind.test.mjs      |
    | IMP-DENY-04     | driver reaches `workspace-identity.mjs`                                  | denied path and full chain                                             | test/arch/acd-session-driver-mesh-blind.test.mjs      |
    | IMP-DENY-05     | driver reaches `item-lock.mjs`                                           | denied path and full chain                                             | test/arch/acd-session-driver-mesh-blind.test.mjs      |
    | IMP-DENY-06     | driver reaches a member of `board-*.mjs`                                 | denied path and full chain                                             | test/arch/acd-session-driver-mesh-blind.test.mjs      |
    | IMP-DENY-07     | driver reaches a member of `src/commands/*`                              | denied path and full chain                                             | test/arch/acd-session-driver-mesh-blind.test.mjs      |
    | IMP-DENY-08     | driver reaches `mesh-worker-execution.mjs`                               | denied lifecycle module and full chain                                 | test/arch/acd-session-driver-mesh-blind.test.mjs      |
    | IMP-DENY-09     | driver reaches `mesh-worktree.mjs`                                       | denied lifecycle module and full chain                                 | test/arch/acd-session-driver-mesh-blind.test.mjs      |
    | IMP-DENY-10     | driver reaches `mesh-presence.mjs`                                       | denied lifecycle module and full chain                                 | test/arch/acd-session-driver-mesh-blind.test.mjs      |
    | IMP-DENY-11     | driver reaches `mesh-repo-marker.mjs`                                    | denied lifecycle module and full chain                                 | test/arch/acd-session-driver-mesh-blind.test.mjs      |
    | IMP-DENY-12     | driver reaches `mesh-launcher.mjs`                                       | denied lifecycle module and full chain                                 | test/arch/acd-session-driver-mesh-blind.test.mjs      |
    | IMP-DENY-13     | driver reaches `mesh-session-spawn-handler.mjs`                          | denied lifecycle module and full chain                                 | test/arch/acd-session-driver-mesh-blind.test.mjs      |
    | IMP-DENY-14     | driver reaches `mesh-clone-credential-provider.mjs`                      | denied lifecycle module and full chain                                 | test/arch/acd-session-driver-mesh-blind.test.mjs      |
    | IMP-DENY-15     | driver reaches `mesh-assignment-reclaim.mjs`                             | denied lifecycle module and full chain                                 | test/arch/acd-session-driver-mesh-blind.test.mjs      |
    | IMP-SELF-01     | `terminal-ws.mjs` stops importing `work.mjs`                             | stale permission whose named subject disappeared                       | test/arch/acd-session-driver-mesh-blind.test.mjs      |
    | IMP-SELF-02     | `degrade.mjs` stops importing `mesh-log.mjs`                             | stale permission whose named subject disappeared                       | test/arch/acd-session-driver-mesh-blind.test.mjs      |
    | IMP-SELF-03     | any permission target is also placed on the denylist                     | self-contradictory lists, naming the overlap                            | test/arch/acd-session-driver-mesh-blind.test.mjs      |
    | IMP-PC-01       | only `terminal-ws.mjs` reaches `work.mjs`                                | no violation; the exact admitted in-edge remains live                  | test/arch/acd-session-driver-mesh-blind.test.mjs      |
    | IMP-PC-02       | only `degrade.mjs` reaches `mesh-log.mjs`                                | no violation; the exact admitted in-edge remains live                  | test/arch/acd-session-driver-mesh-blind.test.mjs      |
    | IMP-PC-03       | the direct set includes `claude-trust`, `degrade`, `terminal-providers`, `terminal-ws`, `work-observe` | no violation; exact equality proves every permission has a subject | test/arch/acd-session-driver-mesh-blind.test.mjs      |

  The ledger above is exhaustive for the frozen denylist: a table-driven owner may mechanise the
  fifteen `IMP-DENY-*` rows in one test, but sampling two members does not discharge the scenario.
  All other mutation rows in the preceding Examples table are owned by the gate named in its
  `gate` column; that literal planted-violation cell is its stable evidence handle.
