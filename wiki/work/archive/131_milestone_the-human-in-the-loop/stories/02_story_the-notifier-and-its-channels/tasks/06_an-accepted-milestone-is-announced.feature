@executable @cli @work @work-stream
Feature: a milestone's move to done is announced once, from the status door, and a failed post never fails the accept

  ADR-005 §4. `milestone-accepted` has one firing site: `src/commands/item-status.mjs`, after a
  milestone's move to `done` has been written. It is a direct awaited call, not an effects reactor:
  a notification mutates no store, and an at-least-once redelivered post is the volume problem.
  The envelope comes from `buildNotifyEnvelope("milestone-accepted", { ref, outcome: { title } }, …)`.
  This is the only `notify(` call site this story lands; stories 03 and 04 land the other five.

  RULINGS (PO, 2026-09-23). (1) The call is made only when `transitionItemStatus` returned, the item
  is a milestone and the target is `done`. A story's `done`, any other edge, a refused accept (budget,
  regression gate, lifecycle) and an `--if-applicable` non-move call nothing. (2) `title` is the
  moved record's `title`, else `null`. (3) The command's result is unchanged by the notification,
  key for key, whether it delivered, failed or was not configured. (4) `ctx.notifyOptions`, when
  present, is passed through as `notify`'s `{ env, fetch }`; this is the test seam, and without it
  `notify`'s own defaults apply. (5) `notify` is awaited BEFORE the command returns, because an
  un-awaited promise in an exiting CLI is dropped (the death class 129 measured).

  RULINGS (QA, 2026-09-23). (1) Both legal edges into `done`, from `in-review` and from
  `in-progress`, announce. `done` is terminal (`ITEM_STATUS_EDGES`), so a second `done` is refused
  and posts nothing. No re-accept can announce twice. (2) A refused accept is thrown before the
  transition. Its code, status and message are the same with and without `work.notify`, and nothing
  is posted. (3) On PO ruling (4): `ctx.notifyOptions` is spread into `notify`'s options as given,
  so a case may add `timeoutMs`. A hanging webhook then delays the accept by that bound and no more.
  (4) The result carries no key about the notification. The degrade sink and the `fetch` spy are
  the only places a case observes it.

  RULINGS (developer, 2026-09-23). (1) The first two scenarios' inputs gain `gateOverride: "fixture"`.
  As written they carried none, and the fixture holds no regression gate row (the refused-accept
  Outline's `regression-gate-missing` row is that fixture as given), so the gate refused them before
  the move. The Background's "accepted through the regression gate's override with a reason" is the
  input every accepting case now spells. (2) `transitionItemStatus` answers `{ ref, status, from }`
  and carries no title. So PO ruling (2)'s title is read from the resolved item row (`item.title`,
  the record doc's frontmatter `title:`), and the command's result gains no key. (3) The accept path
  degrades on its own. A fixture with no work cache reports `work-read-cache-unavailable` from the
  cache-first resolver (measured 2026-09-23). The degrade sink is read here for the `notify-*` codes
  only: "nothing" means no `notify-*` event, and "one X" means exactly one event coded X and no other
  `notify-*` event. (4) The result carries the override row's `commit`, the fixture repository's
  HEAD. The comparison fixture with no `work.notify` pins its commit dates, so the two HEADs are one
  hash, and the results can differ only by what the notification changed.

  Background:
    Given a fixture workspace with a milestone `"90"` titled `"Fixture milestone"` whose status admits `done`, accepted through the regression gate's override with a reason
    And its `work.notify` is `{ channels: { ops: { type: "discord", urlEnv: "HOOK_A" } } }`
    And `ctx.notifyOptions` = `{ env: { HOOK_A: "https://discord.com/api/webhooks/111/secret-token" }, fetch: <spy answering 204> }`

  Scenario: accepting a milestone posts one accept message
    When `work:status` is run with `{ ref: "90", status: "done", gateOverride: "fixture" }`
    Then the milestone's record reads `status: done`
    And the `fetch` spy was called exactly once, and its body's `content` is `**90 — accepted**` + `\n` + `Fixture milestone`

  Scenario: a failing webhook does not fail the accept
    Given the `fetch` spy throws
    When `work:status` is run with `{ ref: "90", status: "done", gateOverride: "fixture" }`
    Then it answers `moved: true` and the record reads `status: done`
    And the degrade sink received one event coded `notify-delivery-failed`

  Scenario: a story's done announces nothing
    When `work:status` moves a story of that milestone to `done`
    Then the `fetch` spy was never called

  Scenario Outline: only a milestone's move into done posts, once
    Given `<ref>` is at `<from>`
    When `work:status` is run with <input>
    Then <outcome>, and the `fetch` spy was called <calls>

    Examples:
      | ref   | from        | input                                                                        | outcome                                                  | calls |
      | 90    | in-review   | `{ ref: "90", status: "done", gateOverride: "fixture" }`                     | it answers `moved: true`                                 | once  |
      | 90    | in-progress | `{ ref: "90", status: "done", gateOverride: "fixture" }`                     | it answers `moved: true`                                 | once  |
      | 90    | in-review   | `{ ref: "90", status: "done", gateOverride: "fixture", ifApplicable: true }` | it answers `moved: true`                                 | once  |
      | 90    | done        | `{ ref: "90", status: "done", gateOverride: "fixture", ifApplicable: true }` | it answers `moved: false`, `code: "status-edge-not-applicable"` | never |
      | 90    | done        | `{ ref: "90", status: "done", gateOverride: "fixture" }`                     | it throws `status-edge-not-applicable`                   | never |
      | 90    | not-started | `{ ref: "90", status: "done", gateOverride: "fixture" }`                     | it throws `status-edge-not-applicable`                   | never |
      | 90    | not-started | `{ ref: "90", status: "in-progress" }`                                       | it answers `moved: true`                                 | never |
      | 90    | in-progress | `{ ref: "90", status: "in-review" }`                                         | it answers `moved: true`                                 | never |
      | 90    | in-review   | `{ ref: "90", status: "blocked" }`                                           | it answers `moved: true`                                 | never |
      | 90    | in-review   | `{ ref: "90" }`                                                              | it answers `status: "in-review"`, the read face          | never |
      | 90/00 | in-review   | `{ ref: "90/00", status: "done" }`                                           | it answers `moved: true`                                 | never |
      | 90/00 | in-progress | `{ ref: "90/00", status: "done" }`                                           | it answers `moved: true`                                 | never |

  Scenario Outline: a refused accept posts nothing and is refused exactly as before
    Given milestone `"90"` is at `in-review`, and <setup>
    When `work:status` is run with <input>
    Then it throws `<code>`, the record still reads `status: in-review`, and the `fetch` spy was never called
    And the same run in a fixture with no `work.notify` throws the same code, status and message

    Examples:
      | setup                                                   | input                                                    | code                          |
      | its record doc is over its artifact budget              | `{ ref: "90", status: "done", gateOverride: "fixture" }` | artifact-budget-exceeded      |
      | no regression gate row exists                           | `{ ref: "90", status: "done" }`                          | regression-gate-missing       |
      | its newest regression gate row is red                   | `{ ref: "90", status: "done" }`                          | regression-gate-red           |
      | nothing else                                            | `{ ref: "90", status: "done", gateOverride: "" }`        | gate-override-reason-required |

  Scenario Outline: whatever the notification does, the accept's result is the same
    Given <setup>
    When `work:status` is run with `{ ref: "90", status: "done", gateOverride: "fixture", now: "2026-09-23T17:00:00.000Z" }`
    Then the record reads `status: done`, and the result deep-equals the same run's in a fixture with no `work.notify`
    And the `fetch` spy was called <calls>, and the degrade sink received <degrade>

    Examples:
      | setup                                                                        | calls | degrade                             |
      | the `fetch` spy answers `204`                                                | once  | nothing                             |
      | the `fetch` spy answers `500`                                                | once  | one `notify-delivery-failed`        |
      | the `fetch` spy answers `429`                                                | once  | one `notify-rate-limited`           |
      | the `fetch` spy never settles, and `ctx.notifyOptions` adds `timeoutMs: 50`  | once  | one `notify-delivery-failed`        |
      | `ctx.notifyOptions.env` holds no `HOOK_A`                                    | never | one `notify-channel-unconfigured`   |
      | the fixture has no `work.notify`                                             | never | nothing                             |
      | `work.notify` is `{ channels: {} }`                                          | never | nothing                             |
      | the channel's `events` is `["loop-died"]`                                    | never | nothing                             |

  Scenario Outline: the accept message carries the record's title, the node and the link
    Given milestone `"90"`'s record <title>, and the config <extra>
    When `work:status` is run with `{ ref: "90", status: "done", gateOverride: "fixture" }`
    Then the `fetch` spy's one body has `content` <content> and `allowed_mentions` `{ parse: [] }`

    Examples:
      | title                                  | extra                                                                          | content                                                                  |
      | has no `title`                         | adds nothing                                                                   | `"**90 — accepted**"`                                                    |
      | has the title `"Ship it @everyone"`    | adds nothing                                                                   | `"**90 — accepted**\nShip it @everyone"`                                 |
      | has the title `"Fixture milestone"`    | adds `mesh.nodeId: "node-7297"` and `work.notify.link: "https://x.test/{ref}"` | `"**90 — accepted** · node-7297\nFixture milestone\nhttps://x.test/90"`  |
