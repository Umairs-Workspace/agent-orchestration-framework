// Traceability wiring for story 65, task 01 —
// `wiki/work/65_story_concurrent-story-dispatch/tasks/01_next-answers-with-the-ready-set.feature`
// (@executable). One exported entry per Scenario, one per Scenario-Outline ROW.
//
// THE ONE PROPERTY EVERY LANE HERE PROTECTS IS ADDITIVITY. `aof work next`'s answer is
// consumed — `src/commands/next.mjs` (the command, its human render and its `--json`
// path-relativiser), `src/board-ui.mjs:157` (the board's `/api/work/next` route), and
// `src/work/read.mjs:325` (whose cache attribution stamped only `if (typeof result?.ref ===
// "string")`) — plus two FROZEN contract tests and eleven bundle prompts. So the existing
// single-item keys stay where they are and keep meaning what they mean, and the set arrives
// beside them. Several lanes below assert the OLD shape rather than the new one; that is the
// point of them.
//
// WHERE EACH OUTLINE ROW IS PROVEN, and why they are not all in one place. `candidacyView`
// is built by the command from HELD EXECUTION SCOPES and from nothing else, so
// "routed elsewhere" and "leased by a peer" are not producible through the command in
// production — they arrive through `nextWork`'s INJECTED candidacy seam (m26/ADR-005,
// widened m27/ADR-004), which is where the guard actually lives. Those rows are therefore
// proven at that seam, the held-scope row is proven end-to-end through the real item lock,
// and the merge that carries a seam-level skip out to the command's `skipped` key is proven
// directly on `mergeSkipped`. Three lanes, one key, no gap.
import assert from "node:assert/strict";
import path from "node:path";
import { nextWork } from "../../../src/work.mjs";
import { nextCommand, mergeSkipped } from "../../../src/commands/next.mjs";
import { invoke } from "../../../src/command-core.mjs";
import { withItemLockFixture, seedActive } from "../../support/item-lock-fixture.mjs";
import { withStream } from "../../support/story-depends-fixture.mjs";
import { withCacheReadFixture, plantCacheRow, runCommand, WORKER_NODE, SYNCED_AT } from "../../support/cache-read-fixture.mjs";
import { commandCoreContractTests } from "../../command/command-core-contract.test.mjs";
import { boardFaceContractTests } from "../../ui/board-face-contract.test.mjs";

const NOT_STARTED = "not-started";
const refsOf = (result) => (result.readySet ?? []).map((member) => member.ref);
const next = (fx, scope) => invoke("work:next", scope ? { scope } : {}, fx.ctx);

export const workNextReadySetTests = [
  {
    name: "next-ready-set/continue: through-review skips reviewed stories and advances the build wave",
    run: () =>
      withStream(
        [{
          number: "62", status: "in-progress",
          stories: [
            { number: "00", status: "in-review" },
            { number: "01", status: NOT_STARTED },
          ],
        }],
        async (work) => {
          const result = await nextWork(work, "62", { throughReview: true });
          assert.deepEqual(refsOf(result), ["62/01"], "the reviewed story is not rebuilt");
          assert.equal(result.ref, "62/01", "the walk advances to the next unbuilt story");
        },
      ),
  },
  {
    name: "next-ready-set/continue: through-review satisfies sibling dependencies at the Review gate",
    run: () =>
      withStream(
        [{
          number: "62", status: "in-progress",
          stories: [
            { number: "00", status: "in-review" },
            { number: "01", status: NOT_STARTED, depends: ["00"] },
          ],
        }],
        async (work) => {
          const result = await nextWork(work, "62", { throughReview: true });
          assert.deepEqual(refsOf(result), ["62/01"], "reviewed prerequisite unblocks the next build");
        },
      ),
  },
  {
    name: "next-ready-set/continue: through-review stops before milestone acceptance when every story is reviewed",
    run: () =>
      withStream(
        [{
          number: "62", status: "in-progress",
          stories: [
            { number: "00", status: "in-review" },
            { number: "01", status: "done" },
          ],
        }],
        async (work) => {
          assert.deepEqual(await nextWork(work, "62", { throughReview: true }), { state: "done" });
          assert.equal((await nextWork(work, "62")).ref, "62/00", "the generic next view remains acceptance-aware");
        },
      ),
  },
  // ══════════════════════════════════════════════════════════════════════════
  // Scenario: the first member of the ready set is the item next returns today
  // ══════════════════════════════════════════════════════════════════════════
  {
    name: "next-ready-set/01 the head is the item next returns today — ref/type/slug/status/path/state describe the same item, and the set's first member IS that item",
    run: () =>
      withItemLockFixture(async (fx) => {
        const envelope = await next(fx);
        // The single-item keys, in their own places, meaning what they meant.
        assert.equal(envelope.state, "ready");
        assert.equal(envelope.ref, "42/01", "the same item the pre-change walk returned");
        assert.equal(envelope.type, "story");
        assert.equal(envelope.slug, "s42-01");
        assert.equal(envelope.status, NOT_STARTED);
        assert.ok(path.isAbsolute(envelope.path), "path is still the raw absolute item directory");
        // …and the set arrives BESIDE them, headed by that same item.
        assert.ok(Array.isArray(envelope.readySet), "the answer carries a ready set");
        assert.equal(envelope.readySet[0].ref, envelope.ref, "the set's first member is the head");
        assert.deepEqual(
          { ref: envelope.readySet[0].ref, type: envelope.readySet[0].type, slug: envelope.readySet[0].slug, status: envelope.readySet[0].status, path: envelope.readySet[0].path },
          { ref: envelope.ref, type: envelope.type, slug: envelope.slug, status: envelope.status, path: envelope.path },
          "…carrying the same facts, not a reduced projection of them",
        );
        assert.deepEqual(envelope.wave.map((member) => member.ref), [envelope.ref], "a missing files declaration runs alone");
        assert.deepEqual(
          envelope.heldSet.map((member) => member.ref),
          envelope.readySet.slice(1).map((member) => member.ref),
          "the remainder is explicitly held rather than left to prompt arithmetic",
        );
      }),
  },

  // ══════════════════════════════════════════════════════════════════════════
  // Scenario: two independent stories are both offered
  // ══════════════════════════════════════════════════════════════════════════
  {
    name: "next-ready-set/01 two independent stories are both offered, in positional order",
    run: () =>
      withStream(
        [{
          number: "53", status: "in-progress",
          stories: [
            { number: "00", status: NOT_STARTED },
            { number: "01", status: NOT_STARTED },
          ],
        }],
        async (work) => {
          const result = await nextWork(work);
          assert.deepEqual(refsOf(result), ["53/00", "53/01"], "the set holds both, in positional order");
          assert.equal(result.ref, "53/00", "…and the head is still the first of them");
        },
      ),
  },

  // ══════════════════════════════════════════════════════════════════════════
  // Scenario: a story waiting on a sibling is not in the set
  // ══════════════════════════════════════════════════════════════════════════
  {
    name: "next-ready-set/01 a story waiting on a sibling is not in the set — 00 and 01 are held, 02 (depends 00) is not",
    run: () =>
      withStream(
        [{
          number: "53", status: "in-progress",
          stories: [
            { number: "00", status: NOT_STARTED },
            { number: "01", status: NOT_STARTED },
            { number: "02", status: NOT_STARTED, depends: ["00"] },
          ],
        }],
        async (work) => {
          const result = await nextWork(work);
          assert.deepEqual(refsOf(result), ["53/00", "53/01"], "the set is the SAFE set, not every not-done item");
          assert.ok(!refsOf(result).includes("53/02"), "02 waits on 00 and is therefore not offered");
        },
      ),
  },

  // ══════════════════════════════════════════════════════════════════════════
  // Scenario: the set spans milestones when the range allows it
  // ══════════════════════════════════════════════════════════════════════════
  {
    name: "next-ready-set/01 the set spans milestones when the range allows it — `next 53-54` holds ready items from both, and the range still bounds it",
    run: () =>
      withStream(
        [
          { number: "53", status: "in-progress", stories: [{ number: "00", status: NOT_STARTED }] },
          { number: "54", status: "in-progress", stories: [{ number: "00", status: NOT_STARTED }] },
          { number: "55", status: "in-progress", stories: [{ number: "00", status: NOT_STARTED }] },
        ],
        async (work) => {
          const result = await nextWork(work, "53-54");
          assert.deepEqual(refsOf(result), ["53/00", "54/00"], "ready items from BOTH milestones in the range");
          assert.ok(!refsOf(result).includes("55/00"), "…and nothing from outside it — the range still bounds the walk");
        },
      ),
  },

  // ══════════════════════════════════════════════════════════════════════════
  // Scenario: a blocked or done answer carries no set to act on
  // ══════════════════════════════════════════════════════════════════════════
  {
    name: "next-ready-set/01 a blocked answer carries an EMPTY set — `state` is blocked with waitingOn exactly as today, so blocked can never be mistaken for one-thing-is-ready",
    run: () =>
      withItemLockFixture(async (fx) => {
        const envelope = await next(fx, "44");
        assert.equal(envelope.state, "blocked");
        assert.deepEqual(envelope.waitingOn, ["43"], "waitingOn is exactly as today");
        assert.deepEqual(envelope.readySet, [], "…and there is nothing to act on");
      }, {
        stream: [
          { number: "43", stories: [] },
          { number: "44", stories: [], depends: ["43"] },
        ],
      }),
  },
  {
    name: "next-ready-set/01 a done answer carries an EMPTY set at the command face, while the core's bare `{ state: \"done\" }` shape is untouched",
    run: async () => {
      await withItemLockFixture(async (fx) => {
        const envelope = await next(fx);
        assert.equal(envelope.state, "done");
        assert.deepEqual(envelope.readySet, [], "nothing to act on");
      }, { stream: [{ number: "42", stories: [], status: "done" }] });
      // The CORE keeps its bare shape — m27's candidacy contract deep-equals it, and a set
      // key on an answer with no set would have broken that for no gain.
      await withStream([{ number: "42", status: "done" }], async (work) => {
        assert.deepEqual(await nextWork(work), { state: "done" }, "the core's done shape is byte-unchanged");
      });
    },
  },

  // ══════════════════════════════════════════════════════════════════════════
  // Scenario Outline: candidacy and the item lock apply to every member, not
  //                   just the head
  //   | condition                                 | treatment                                        |
  //   | routed elsewhere                          | absent from the set, and reported in `skipped`   |
  //   | leased live by a peer                     | absent from the set, and reported in `skipped`   |
  //   | leased stale by a peer                    | present, annotated `reclaimable` with its holder |
  //   | its execution scope held by an assignment | absent from the set, and reported in `skipped`   |
  // ══════════════════════════════════════════════════════════════════════════
  {
    name: "next-ready-set/01 candidacy outline row [routed elsewhere] -> 01 is absent from the set and reported in `skipped`",
    run: () =>
      withStream(
        [{ number: "53", status: "in-progress", stories: [{ number: "00", status: NOT_STARTED }, { number: "01", status: NOT_STARTED }] }],
        async (work) => {
          const candidacyView = new Map([["53/01", { routed: "elsewhere" }]]);
          const result = await nextWork(work, undefined, { candidacyView });
          assert.deepEqual(refsOf(result), ["53/00"], "01 is absent from the set — it is another node's work");
          assert.deepEqual(result.skipped, [{ ref: "53/01", state: "routed-elsewhere" }], "…and reported, never silently dropped");
        },
      ),
  },
  {
    name: "next-ready-set/01 candidacy outline row [leased live by a peer] -> 01 is absent from the set and reported in `skipped`, naming its holder",
    run: () =>
      withStream(
        [{ number: "53", status: "in-progress", stories: [{ number: "00", status: NOT_STARTED }, { number: "01", status: NOT_STARTED }] }],
        async (work) => {
          const candidacyView = new Map([["53/01", { state: "leased-live", holder: "node-b" }]]);
          const result = await nextWork(work, undefined, { candidacyView });
          assert.deepEqual(refsOf(result), ["53/00"], "01 is absent from the set — being worked, just not here");
          assert.deepEqual(result.skipped, [{ ref: "53/01", state: "leased-live", holderNode: "node-b" }], "…named, with its holder");
        },
      ),
  },
  {
    name: "next-ready-set/01 candidacy outline row [leased stale by a peer] -> 01 is PRESENT in the set, annotated reclaimable with its holder",
    run: () =>
      withStream(
        [{ number: "53", status: "in-progress", stories: [{ number: "00", status: NOT_STARTED }, { number: "01", status: NOT_STARTED }] }],
        async (work) => {
          const candidacyView = new Map([["53/01", { state: "leased-stale", holder: "node-b" }]]);
          const result = await nextWork(work, undefined, { candidacyView });
          assert.deepEqual(refsOf(result), ["53/00", "53/01"], "a stale lease never demotes a member out of the set");
          const member = result.readySet.find((entry) => entry.ref === "53/01");
          assert.equal(member.reclaimable, true, "annotated reclaimable — next is a READ, the claim path reclaims");
          assert.equal(member.leasedBy, "node-b", "…naming the stale holder");
          assert.deepEqual(result.skipped, [], "nothing was stepped over");
        },
      ),
  },
  {
    name: "next-ready-set/01 candidacy outline row [its execution scope held by an assignment] -> the held member is absent from the set and reported in `skipped` — end to end through the real item lock",
    run: () =>
      withItemLockFixture(async (fx) => {
        // 42's scope is held, so every 42/* member collapses into that scope and is passed
        // over; 43's stories stay ready. The head is 43/01 exactly as the pre-change
        // command would have answered.
        await seedActive(fx, { assignmentId: "asg-1", itemRef: "42", node: "aof-wsl", state: "running" });
        const envelope = await next(fx);
        assert.equal(envelope.ref, "43/01", "the held scope is stepped over and the walk continues");
        const refs = refsOf(envelope);
        assert.ok(refs.length > 0, "the set is non-empty");
        assert.ok(!refs.some((ref) => ref === "42" || ref.startsWith("42/")), `no held member is in the set: ${refs.join(", ")}`);
        assert.deepEqual(
          envelope.skipped.map((entry) => entry.ref),
          ["42"],
          "…and the held scope is reported ONCE at the driver grain, in the five-key vocabulary (unchanged by the set)",
        );
        assert.equal(envelope.skipped[0].holderNode, "aof-wsl");
      }),
  },
  {
    name: "next-ready-set/01 the two skip reports merge into ONE `skipped` key — a held-covered walk entry defers to the command's richer entry, an uncovered one is appended",
    run: async () => {
      const held = new Map([["42", { holderNode: "aof-wsl", assignmentId: "asg-1", state: "running" }]]);
      const heldEntries = [{ ref: "42", scopeRef: "42", holderNode: "aof-wsl", assignmentId: "asg-1", state: "running" }];
      // The walk stepped over 42's stories for the SAME reason the command already reported
      // 42 — dropping them keeps the frozen five-key report byte-identical.
      assert.deepEqual(
        mergeSkipped(heldEntries, [{ ref: "42/01", state: "leased-live", holderNode: "aof-wsl" }], held),
        heldEntries,
        "a held-covered walk entry never duplicates the command's richer entry",
      );
      // An entry NOT covered by a held scope is appended — silently omitting a stepped-over
      // item is the invisible-item failure this whole report exists to prevent.
      assert.deepEqual(
        mergeSkipped(heldEntries, [{ ref: "77/00", state: "routed-elsewhere" }], held),
        [...heldEntries, { ref: "77/00", state: "routed-elsewhere" }],
        "an uncovered walk entry is appended, never dropped",
      );
      assert.deepEqual(mergeSkipped([], [], new Map()), [], "no reports, no list");
    },
  },

  // ══════════════════════════════════════════════════════════════════════════
  // Scenario: a cache-answered member keeps its attribution
  // ══════════════════════════════════════════════════════════════════════════
  {
    name: "next-ready-set/01 a cache-answered MEMBER keeps `answeredFrom`/`reportedBy` — the stamp is applied per member, so a set-shaped answer cannot drop it",
    run: () =>
      withCacheReadFixture(async (fx) => {
        // "01" is on this node's disk AND in the cache, last reported by the remote worker.
        // Before m65/01 the stamp was applied only to the head; a member would have carried
        // neither key and a dispatcher could not have told a cache answer from a disk one.
        await plantCacheRow(fx, "01", { status: NOT_STARTED, title: "Milestone 01", node: WORKER_NODE, at: SYNCED_AT });
        const envelope = await runCommand(fx, "work:next", {});
        const member = envelope.readySet.find((entry) => entry.ref === "01");
        assert.ok(member != null, `the ready set holds 01: ${refsOf(envelope).join(", ")}`);
        assert.equal(member.answeredFrom, "cache", "the member says which side answered it");
        assert.equal(member.reportedBy, WORKER_NODE, "…and who reported it");
        assert.equal(member.syncedAt, SYNCED_AT, "…and when, unmodified");
        // And a disk-answered member carries the disk stamp and NOTHING else — no
        // fabricated author, no invented instant (rule 3's other half).
        const diskMember = envelope.readySet.find((entry) => entry.ref !== "01");
        if (diskMember) {
          assert.equal(diskMember.answeredFrom, "disk");
          assert.ok(!("reportedBy" in diskMember), "a disk-answered member fabricates no author");
        }
      }, { stream: [{ ref: "00", status: "done" }, { ref: "01", status: NOT_STARTED }] }),
  },

  // ══════════════════════════════════════════════════════════════════════════
  // Scenario: the two frozen contract tests still pass unchanged
  // ══════════════════════════════════════════════════════════════════════════
  {
    name: "next-ready-set/01 the two FROZEN contract tests still pass without amendment — the NextResult's raw-absolute path, and the board's projectRoot-relative forward-slashed envelope",
    run: async () => {
      // Not a re-implementation of either: the actual entries are looked up by their own
      // names in their own suites and RUN. If the ready set had cost either contract a key,
      // this lane goes red naming the contract rather than the symptom.
      const frozen = [
        [commandCoreContractTests, "command-core/02 work:next returns a NextResult whose path is a raw absolute"],
        [boardFaceContractTests, "face/00 the next route returns the milestone-03 NextResult envelope"],
        [boardFaceContractTests, "face/00 next projects the next item's path to projectRoot-relative + forward-slashed"],
      ];
      for (const [suite, name] of frozen) {
        const entry = suite.find((test) => test.name === name);
        assert.ok(entry != null, `the frozen contract test still exists under its own name: ${name}`);
        await entry.run();
      }
    },
  },

  // ══════════════════════════════════════════════════════════════════════════
  // Scenario: the human render still answers the operator's question first
  // ══════════════════════════════════════════════════════════════════════════
  {
    name: "next-ready-set/01 the human render answers the operator's question FIRST — the same two-line ready form, with the additional ready items beneath it, never replacing it",
    run: async () => {
      const item = (ref, slug) => ({ state: "ready", ref, type: "story", slug, status: NOT_STARTED, path: process.cwd() });
      const three = { ...item("53/00", "alpha"), readySet: [item("53/00", "alpha"), item("53/01", "beta"), item("53/02", "gamma")], skipped: [] };
      const rendered = nextCommand.cli.render(three, { positionals: [] });
      const lines = rendered.split("\n");
      // The two-line ready form, first and unchanged.
      assert.match(lines[0], /^53\/00\s+story\s+not-started\s+alpha$/, "line 1 is the same head the operator reads today");
      assert.ok(lines[1].startsWith("        "), "line 2 is still the indented location line");
      // The rest reported BENEATH it.
      assert.match(rendered, /also ready \(2\): 53\/01, 53\/02/, "the additional ready items are reported beneath");
      assert.ok(rendered.indexOf("also ready") > rendered.indexOf("alpha"), "…beneath, never in place of");

      // …and a single-lane answer reads EXACTLY as it did before: no extra line at all.
      const one = { ...item("53/00", "alpha"), readySet: [item("53/00", "alpha")], skipped: [] };
      assert.equal(nextCommand.cli.render(one, { positionals: [] }).split("\n").length, 2, "one ready item renders two lines, as before");
      assert.ok(!nextCommand.cli.render(one, { positionals: [] }).includes("also ready"), "…and says nothing about a set");
    },
  },
  {
    name: "next-ready-set/01 the `--json` face relativises every member's path, not just the head — one basis, not a mix of two",
    run: () =>
      withItemLockFixture(async (fx) => {
        const envelope = await next(fx);
        const json = nextCommand.cli.json(envelope);
        assert.equal(path.isAbsolute(json.path), false, "the head's path is cwd-relative, as today");
        for (const member of json.readySet) {
          assert.equal(path.isAbsolute(member.path), false, `member ${member.ref} is projected in the same basis`);
        }
        // The RESULT itself is untouched — projection is a FACE adapter, never command logic.
        assert.ok(path.isAbsolute(envelope.readySet[0].path), "the command result keeps raw absolutes");
      }),
  },
];
