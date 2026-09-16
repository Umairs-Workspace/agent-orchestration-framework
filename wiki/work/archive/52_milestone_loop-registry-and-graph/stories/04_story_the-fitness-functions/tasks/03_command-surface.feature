@executable @cli @work @validate
Feature: The command surface — three registry entries, three exact routes, no ladder branch

  FF-5207 (`test/arch/acd-loop-command-route-only.test.mjs`) asserts the family is reachable
  the way ADR-008 says it is reachable: registered in `COMMANDS`, carrying the exact three-word
  `cli.route`, resolved by `deriveRouteTable`/`resolveRoute` — and with NO dispatch branch in
  `src/cli.mjs`, which is the clause that keeps `cli.mjs` out of the milestone's edit set
  entirely. The gate's other half is the pre-existing CLI bijection arch-test, and ADR-012
  corrects — finally, with all three legs now read at source — what this feature may claim
  about it. Its subcommand set is DERIVED from `listCommands()`, so the three verbs enter it
  the moment they are registered and no literal list is widened. But ONLY the `cli`-adapter
  leg is free. TWO legs go RED on the registration diff, for ONE root cause worth naming
  because it is a latent assumption inside a SHARED gate rather than a quirk of this family:
  the gate assumes a `work:` command's id-suffix IS its route words. Leg (b),
  route-reachability, derives `loops-show` from the id and asks `routes.has("work loops-show")`
  while `deriveRouteTable` keys on `cli.route.join(" ")` = `"work loops show"` — the lookup
  misses, falls through to the `laddered` fallback, and so demands the `src/cli.mjs` dispatch
  branch ADR-008 forbids. Leg (c), spawn-and-parse, hits the per-subcommand argv map's
  deliberate `default: throw` (19/R1 — an unmapped sub must fail loudly, never be skipped).
  `work:loops-*` is the first `work:`-namespaced command with a three-word route, which is why
  nothing has falsified the assumption until now. Story 52/02 lands BOTH fixes in the same diff
  as the registration — the three `argsFor` cases, AND leg (b) deriving its probe from
  `command.cli.route.join(" ")` instead of the id, which is a GENERAL fix covering every future
  multi-word route rather than a carve-out for this family. That one file is the milestone's
  ONE carve-out from "no pre-existing test is touched", and neither edit is this story's.
  ADR-008, ADR-011, ADR-012; `src/spine/face.mjs:87-120`;
  `test/arch/acd-work-command-cli-bijection.test.mjs`.

  Scenario: the three command ids are present in the registry
    Given the command registry imported from `src/command-core.mjs`
    When the ids are read
    Then `work:loops-show`, `work:loops-graph` and `work:loops-validate` are all registered
    And each resolves through `getCommand(id)` to a command object

  Scenario: each command carries the exact route triple
    Given each of the three registered commands
    When its `cli.route` is read
    Then it is exactly `["work", "loops", <verb>]` for its own verb
    And the array is length 3 — not a two-word route, not a four-word route

  Scenario: each command carries a non-null cli adapter with argv, render and json
    Given each of the three registered commands
    When its `cli` adapter is read
    Then `cli` is non-null
    And `cli.argv`, `cli.render` and `cli.json` are each functions

  Scenario: each verb resolves through resolveRoute to its own command
    Given the registry-derived route table
    When `resolveRoute(["work", "loops", <verb>])` is called for each verb
    Then each resolves, and to the command whose id matches that verb
    And the resolved `rest` carries the remaining argv, not the route words

  Scenario: route derivation succeeds with no collision
    Given the full command registry
    When `deriveRouteTable` runs
    Then it returns without throwing
    And it holds one entry per verb under the `work loops` prefix
    And no other command claims any of the three keys

  Scenario: the bare work loops prefix claims no command
    Given the registry-derived route table
    When `resolveRoute(["work", "loops"])` is called
    Then no command is resolved for the bare two-word prefix
    And each three-word form still resolves — longest-prefix matching, not prefix ownership

  Scenario: src/cli.mjs carries no loops dispatch branch
    Given `src/cli.mjs` with comments stripped
    When the `workCommand` body is isolated and read
    Then it carries no `subcommand === "loops"` branch
    And it carries no `loops-show`, `loops-graph` or `loops-validate` branch
    And the isolation found a non-empty `workCommand` body, so the sweep is non-vacuous

  Scenario: a diff adding a ladder branch fails the gate
    Given `if (subcommand === "loops") { … }` added to `workCommand` in `src/cli.mjs`
    When the gate reads the isolated body
    Then the gate fails, naming the branch
    And it fails even though the command would still work — the route table is the only admitted door

  Scenario: the registry-derived bijection admits the three verbs with no change to its derivation
    Given the CLI bijection gate, whose subcommand set is derived from `listCommands()`
    When that set is derived after the three commands are registered
    Then it contains `loops-show`, `loops-graph` and `loops-validate`
    And the SET derivation is unchanged — no literal list was widened to admit them
    And that derivation is the only part of the gate the registration leaves alone: two of its three legs still break on the diff, and only the `cli`-adapter leg is free

  Scenario: the bijection gate's route leg misses on a three-word route, and the fix is general
    Given that gate's route-reachability leg, which derives its probe from the command ID — `work:loops-show` → `routes.has("work loops-show")`
    And the registry-derived route table, which keys on `cli.route.join(" ")` — `"work loops show"`
    When the three commands are registered and that leg runs
    Then the lookup MISSES, because an id-suffix is not a list of route words
    And the leg falls through to its `laddered` fallback, which demands the `src/cli.mjs` dispatch branch ADR-008 forbids
    And the pre-existing gate therefore goes RED on the registration diff unless leg (b) is fixed in the same diff
    And the fix derives the probe from `command.cli.route.join(" ")`, keeping the `laddered` fallback for commands that legitimately carry no route yet
    And the fix is GENERAL — it covers every multi-word route from now on, instead of buying `work:loops-*` a pass and leaving the assumption armed for the next family
    And the root cause is named rather than patched: the gate assumed a `work:` command's id-suffix IS its route words, and `work:loops-*` is the first `work:` command to falsify it

  Scenario: the bijection gate's spawn leg needs one probe per verb, and it lands with the registration
    Given the bijection gate's per-subcommand argv map, which throws on an unmapped subcommand rather than skipping it
    When the three ids enter that gate's derived subcommand set
    Then the map must carry a case for each of the three verbs, or the pre-existing gate throws on the registration diff
    And those three cases land in the same diff as the registration, so the pre-existing gate is never left red between stories
    And the `argsFor` cases alone do NOT restore the gate — leg (b)'s route-derivation fix lands beside them, or the diff is still red
    And this gate authors no edit to that file — BOTH fixes are 52/02's, and that one file is the milestone's only touch of a pre-existing test

  Scenario: all three legs of the bijection gate are green for the three verbs
    Given the three registered commands and BOTH of 52/02's fixes landed alongside them — the three `argsFor` cases and the route-derivation fix
    When the bijection gate's adapter, reachability and spawn-and-parse legs run over them
    Then each carries a `cli` adapter with `argv` and `render` functions — the one leg that was free, and it stays green with no fix at all
    And each is CLI-reachable via its route-table entry rather than a ladder branch, which the route leg now SEES because it looks up the key the table is actually keyed on
    And with either fix missing the gate is red, so "green" here is a claim about the whole registration diff, not about the registration alone
    And `aof work loops <verb> --json` exits cleanly and emits one parseable JSON document

  Scenario: each probe answers cleanly on the bijection fixture, which holds no registry
    Given the bijection gate's fixture workspace, which has no `<work.dir>/loops/` directory
    When each probe `["work", "loops", <verb>, "--json"]` runs against it
    Then each exits 0 and emits exactly one parseable JSON document
    And each document reports the registry as absent rather than raising an error
    And this is the coded-refusal probe shape the fixture's existing `resync` case already establishes

  Scenario: the family is reachable on a workspace with no registry at all
    Given a fixture workspace with no `<work.dir>/loops/` directory
    When `aof work loops show --json` runs
    Then it exits 0 and emits one parseable document
    And a repository with no registry is not an error condition for any of the three verbs

  Examples:
    | command id           | cli.route                        | resolveRoute(["work","loops",verb]) | cli.mjs ladder branch | bijection leg (b) — id-derived probe vs route-derived probe          | bijection leg (c) probe (lands in 52/02's diff)                  |
    | work:loops-show      | ["work", "loops", "show"]        | resolves to work:loops-show         | absent                | "work loops-show" MISSES · "work loops show" hits — both fixes, one diff | ["work","loops","show","--json"] → exit 0, one envelope, no registry |
    | work:loops-graph     | ["work", "loops", "graph"]       | resolves to work:loops-graph        | absent                | "work loops-graph" MISSES · "work loops graph" hits                   | ["work","loops","graph","--json"] → exit 0, one envelope, no registry |
    | work:loops-validate  | ["work", "loops", "validate"]    | resolves to work:loops-validate     | absent                | "work loops-validate" MISSES · "work loops validate" hits             | ["work","loops","validate","--json"] → exit 0, one envelope, no registry |
    | (none registered)    | ["work", "loops"]                | resolves to no command              | absent                | not a command — the fixed leg iterates commands, never prefixes       | not a subcommand — the argv map is never asked for it             |
    | any pre-existing work:<sub> with a one-word route | ["work", <sub>]  | resolves as before                  | absent                | id-derived and route-derived agree — the fix is a strict generalisation | unchanged — its existing case is untouched                        |
