// THE STORY-SPAN REF — `NN/MM-PP`, the stories MM..PP (inclusive) of driver NN.
//
// The form exists so an operator can drive a NAMED SLICE of a milestone (`aof:continue
// 44/01-03`) without either of the two wrong answers that were available before it: typing
// the milestone (which continues every story, by design) or typing one story at a time
// (which loses the dependency walk between them).
//
// TWO SURFACES ADMIT IT, and this suite pins both plus the seam between them:
//   `findWork`  — resolving the ref an operator typed, into the story rows it names.
//   `nextWork`  — scoping the walk, so the dependency answer stays the milestone's own.
//
// THE ONE PROPERTY WORTH STATING UP FRONT: A SPAN NEVER ACCEPTS. Every other scope form can
// end with "this milestone is ready to accept"; a span cannot, because the stories outside
// it were never looked at. Lanes 06 and 07 are that rule, and they are the reason the form
// is safe to hand to `aof:continue` at all — a slice that reported its milestone acceptable
// would send an operator to `aof:verify` on unbuilt work.
//
// WHY THE RULE IS NOT IN `work-ref-scope.mjs`, the declared home of the subtree-scope rule
// (`src/work.mjs`'s parser points here for this argument). Two reasons:
//
//   1. `work.mjs` CANNOT import that leaf. `validateWork`'s own comment records it: the
//      import raises the session driver's root-inclusive import reach past the ADR-015 §5
//      ceiling of 24, which — measured at the time this landed — the driver already sits
//      exactly at. FF-5301 (`test/arch/session/acd-session-driver-mesh-blind.test.mjs`) goes red on
//      the import alone, and raising the ceiling requires an ADR this work does not pay for.
//   2. It would be the wrong home even without (1). That leaf serves `validate`, `doctor` and
//      memory recall — REPORTING scopes, which answer "what does this ref cover?". A span is
//      an EXECUTION scope: "drive exactly these stories". The surfaces that execute are the
//      two this suite pins. `aof work loop`'s own frozen guard (`LOOP_SCOPE_FORMS`,
//      `src/work/loop.mjs`) refuses story refs OUTRIGHT for the matching reason — it drives
//      whole milestones through acceptance, and a slice cannot be accepted. Three lanes with
//      three deliberate vocabularies, not three copies of one that have drifted.
//
// WHAT IS DELIBERATELY NOT NARROWED (lane 08): the SIBLING GATE still sees every story. An
// in-span story that depends on an out-of-span sibling still waits on it and is still
// reported blocked naming it. Narrowing the gate's inputs to the span would invent a
// dependency answer the milestone never gave — the span chooses what to BUILD, never what
// the milestone's `depends` edges mean.
//
// STORY 86 WIDENS THIS SUITE ALONG THREE AXES, one per gap story 84 recorded open:
//   lanes 13-16  the refusal — a shape that CLAIMS to be story-grained and is not a valid
//                span is refused rather than silently widened to the whole stream, and the
//                two surfaces (`findWork`, `nextWork`) are pinned to agree.
//   lanes 17-19  the command face — a span resolves its `skipped` list to the ONE driver it
//                names, so a finished span never reports a driver the operator never asked
//                about. These run over the ITEM-LOCK fixture, because held-ness is a
//                store fact the pure work-layer fixture has no way to state.
//   lanes 20-22  the PROMPT half of story 84's deliverable, which nothing asserted: the span
//                branch of `src/bundle/commands/continue.md` could be deleted and every test
//                stayed green, because the bundle manifest hashes the file's CONTENT and so
//                detects a change, never the absence of a claim within it.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { findWork, nextWork } from "../../../src/work.mjs";
import { invoke } from "../../../src/command-core.mjs";
import { nextCommand } from "../../../src/commands/next.mjs";
import { withStream } from "../../support/story-depends-fixture.mjs";
import { withItemLockFixture, seedActive } from "../../support/item-lock-fixture.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

const NOT_STARTED = "not-started";
const refsOf = (result) => (result.readySet ?? []).map((member) => member.ref);

// U+2013 EN DASH — what a copy-paste out of a document whose auto-correct "fixed" the hyphen
// produces. Written as an escape rather than a literal so the ONE codepoint that separates it
// from the legal `44/01-02` is visible to a reader of this file, not merely present in it.
const EN_DASHED = "44/01\u201302";

// ---------------------------------------------------------------------------
// The shipped continue prompt, and the span branch it must carry (task 02).
// ---------------------------------------------------------------------------
const CONTINUE_PROMPT = path.join(repoRoot, "src", "bundle", "commands", "continue.md");

// The span branch's own region: its bullet, through to the next top-level branch bullet.
// Used ONLY by the non-vacuity lane, to cut the claim out of a COPY.
const SPAN_BRANCH_RE = /^- \*\*story span[\s\S]*?(?=^- \*\*milestone\*\*)/m;

// THE OBLIGATIONS, NOT THE WORDING. Each is a behavioural rule an agent driving a span must
// obey; pinning whole sentences would make every copy-edit a test failure, so each claim is
// matched at the phrase that carries the rule.
const SPAN_BRANCH_OBLIGATIONS = [
  {
    obligation: "that the ref is never widened to the milestone mid-walk",
    check: (prompt) => assert.match(
      prompt,
      /Never widen the ref to `<NN>` mid-walk/,
      "the span branch must forbid widening the ref to the bare milestone mid-walk — the failure it names is a session that builds stories the operator excluded and reads as having done what they asked",
    ),
  },
  {
    obligation: "that an out-of-span dependency stops the walk",
    check: (prompt) => assert.match(
      prompt,
      /depends on a story OUTSIDE the span still waits for it/,
      "the span branch must state that an in-span story waits on an out-of-span sibling, and that the walk STOPS rather than building the named sibling",
    ),
  },
  {
    obligation: "that the milestone status is neither moved nor accepted",
    check: (prompt) => assert.match(
      prompt,
      /Do not move the MILESTONE's status, and never accept it/,
      "the span branch must forbid moving the milestone's status and forbid accepting it — a span does not own the record it would be writing",
    ),
  },
];

// The branch's DISPATCH half: that a span is a shape the prompt branches on at all, and that
// the walk it then runs is scoped to the span rather than to the bare milestone.
function assertSpanDispatch(prompt) {
  assert.match(
    prompt,
    /Dispatch on the item's `type`[\s\S]{0,120}?`NN\/MM-PP` span/,
    "the prompt must dispatch on a story span as well as on an item type",
  );
  assert.match(
    prompt,
    /^- \*\*story span \(`NN\/MM-PP`\)\*\*/m,
    "…and the span must be one of the branches it dispatches into",
  );
  assert.match(
    prompt,
    /aof work next <NN\/MM-PP>/,
    "the branch must scope the walk to the SPAN, never to the bare milestone",
  );
}

// The whole pin, callable over TEXT — which is what lets the non-vacuity lane run it against a
// mutated copy rather than only against the shipped file.
function assertSpanBranch(prompt) {
  assertSpanDispatch(prompt);
  for (const { check } of SPAN_BRANCH_OBLIGATIONS) check(prompt);
}

// A milestone 44 with six stories, and a milestone 45 beside it — the neighbour exists so
// every scoping lane can prove it was EXCLUDED rather than merely absent.
const TWO_MILESTONES = [
  {
    number: "44",
    status: "in-progress",
    stories: [
      { number: "00", status: "done" },
      { number: "01", status: NOT_STARTED },
      { number: "02", status: NOT_STARTED },
      { number: "03", status: NOT_STARTED },
      { number: "04", status: NOT_STARTED },
      { number: "05", status: NOT_STARTED },
    ],
  },
  {
    number: "45",
    status: NOT_STARTED,
    stories: [{ number: "00", status: NOT_STARTED }],
  },
];

export const workStorySpanScopeTests = [
  // ══════════════════════════════════════════════════════════════════════════
  // findWork — the ref an operator types resolves to the rows it names
  // ══════════════════════════════════════════════════════════════════════════
  {
    name: "span/01 find: `44/01-03` resolves to exactly the three stories it names, in walk order",
    run: () =>
      withStream(TWO_MILESTONES, async (work) => {
        const rows = await findWork(work, "44/01-03");
        assert.deepEqual(rows.map((row) => row.ref), ["44/01", "44/02", "44/03"]);
        assert.deepEqual([...new Set(rows.map((row) => row.type))], ["story"]);
      }),
  },
  {
    name: "span/02 find: the span is ORDERED by story number, never by directory listing order",
    run: () =>
      withStream(
        [{
          number: "44",
          status: "in-progress",
          // Authored out of order on purpose: `listItems` reflects creation order, and a
          // caller that drives a span depends on the order the milestone walk would use.
          stories: [
            { number: "03", status: NOT_STARTED },
            { number: "01", status: NOT_STARTED },
            { number: "02", status: NOT_STARTED },
          ],
        }],
        async (work) => {
          assert.deepEqual((await findWork(work, "44/01-03")).map((row) => row.ref), ["44/01", "44/02", "44/03"]);
        },
      ),
  },
  {
    name: "span/03 find: a span that names nothing answers with the empty set — a read miss, never a throw",
    run: () =>
      withStream(TWO_MILESTONES, async (work) => {
        assert.deepEqual(await findWork(work, "44/40-42"), [], "no story in that range");
        assert.deepEqual(await findWork(work, "99/00-02"), [], "no such driver");
        // Descending: parses, admits nothing. The same answer `decideLoopScope` gives `53-52`.
        assert.deepEqual(await findWork(work, "44/03-01"), [], "lo greater than hi");
      }),
  },
  {
    name: "span/04 find: a span is bounded by BOTH ends and by its driver — never a neighbour's stories",
    run: () =>
      withStream(TWO_MILESTONES, async (work) => {
        assert.deepEqual((await findWork(work, "44/00-01")).map((row) => row.ref), ["44/00", "44/01"]);
        assert.deepEqual((await findWork(work, "44/04-09")).map((row) => row.ref), ["44/04", "44/05"]);
        assert.deepEqual((await findWork(work, "45/00-05")).map((row) => row.ref), ["45/00"], "the neighbour's own span stays its own");
      }),
  },
  {
    name: "span/05 find: the two existing ref forms and the free-text branch are untouched",
    run: () =>
      withStream(TWO_MILESTONES, async (work) => {
        assert.deepEqual((await findWork(work, "44")).map((row) => row.ref), ["44"], "a bare number is still the top-level item");
        assert.deepEqual((await findWork(work, "44/02")).map((row) => row.ref), ["44/02"], "a pair is still that one story");
        // Free text still matches slugs — the span regex must not have swallowed it.
        assert.deepEqual((await findWork(work, "story-02")).map((row) => row.ref), ["44/02"]);
      }),
  },

  // ══════════════════════════════════════════════════════════════════════════
  // nextWork — the walk, scoped to the span
  // ══════════════════════════════════════════════════════════════════════════
  {
    name: "span/06 next: the ready set is exactly the in-span stories — the milestone's other stories and its neighbour are excluded",
    run: () =>
      withStream(TWO_MILESTONES, async (work) => {
        const scoped = await nextWork(work, "44/01-03");
        assert.equal(scoped.state, "ready");
        assert.equal(scoped.ref, "44/01", "the head is the first in-span story");
        assert.deepEqual(refsOf(scoped), ["44/01", "44/02", "44/03"]);

        // The contrast that makes the narrowing visible rather than incidental.
        assert.deepEqual(refsOf(await nextWork(work, "44")), ["44/01", "44/02", "44/03", "44/04", "44/05"]);
      }),
  },
  {
    name: "span/07 next: A SPAN NEVER ACCEPTS — every in-span story done answers `done`, not `44 needs accepting`",
    run: () =>
      withStream(
        [{
          number: "44",
          status: "in-progress",
          stories: [
            { number: "00", status: "done" },
            { number: "01", status: "done" },
            { number: "02", status: "done" },
            { number: "03", status: "done" },
            // Unbuilt, and OUTSIDE the span — the whole point of the lane.
            { number: "04", status: NOT_STARTED },
          ],
        }],
        async (work) => {
          const scoped = await nextWork(work, "44/01-03");
          assert.deepEqual(scoped, { state: "done" }, "the slice is finished; the milestone is not the answer");
          assert.equal("ref" in scoped, false, "no driver ref is offered from a span");

          // The same stream, scoped to the MILESTONE, still offers story 04 — proving the
          // span suppressed an answer that was genuinely available, not an absent one.
          assert.deepEqual(refsOf(await nextWork(work, "44")), ["44/04"]);
        },
      ),
  },
  {
    name: "span/08 next: an in-span story waiting on an OUT-of-span sibling is reported blocked, naming that sibling",
    run: () =>
      withStream(
        [{
          number: "44",
          status: "in-progress",
          stories: [
            { number: "00", status: NOT_STARTED },
            // 01 waits on 00, which the span does not include. The gate still sees it.
            { number: "01", status: NOT_STARTED, depends: ["00"] },
            { number: "02", status: NOT_STARTED, depends: ["00"] },
          ],
        }],
        async (work) => {
          const scoped = await nextWork(work, "44/01-02");
          assert.equal(scoped.state, "blocked", "a span does not invent readiness by looking away from the edge");
          assert.equal(scoped.ref, "44/01");
          // Named as a full ref by the sibling gate (m65/00), not a bare sibling number —
          // so the answer is unambiguous about WHICH 00 the in-span story is waiting on.
          assert.deepEqual(scoped.waitingOn, ["44/00"], "the out-of-span sibling is named");
          assert.deepEqual(refsOf(scoped), [], "a blocked answer carries an empty ready set");
        },
      ),
  },
  {
    name: "span/09 next: a span against a driver that groups no stories offers nothing — never the driver itself",
    run: () =>
      withStream(
        [
          { number: "44", type: "uat", status: NOT_STARTED, slug: "acceptance" },
          { number: "45", type: "spike", status: NOT_STARTED, slug: "feasibility" },
          { number: "46", type: "chore", status: NOT_STARTED, slug: "housekeeping" },
          // A milestone that has not been broken down yet.
          { number: "47", status: NOT_STARTED },
        ],
        async (work) => {
          for (const scope of ["44/00-02", "45/00-02", "46/00-02", "47/00-02"]) {
            assert.deepEqual(await nextWork(work, scope), { state: "done" }, `${scope} names stories that do not exist`);
          }
          // Each of those drivers IS offered when named without a span — so the lane above
          // proves suppression, not an empty stream.
          assert.equal((await nextWork(work, "44")).ref, "44");
          assert.equal((await nextWork(work, "47")).ref, "47", "un-broken-down milestone still reports needs-break-down unscoped");
        },
      ),
  },
  {
    name: "span/10 next: a driver-level dependency still blocks a span — the span narrows stories, never the driver graph",
    run: () =>
      withStream(
        [
          { number: "43", status: NOT_STARTED },
          {
            number: "44",
            status: NOT_STARTED,
            depends: ["43"],
            stories: [{ number: "01", status: NOT_STARTED }, { number: "02", status: NOT_STARTED }],
          },
        ],
        async (work) => {
          const scoped = await nextWork(work, "44/01-02");
          assert.equal(scoped.state, "blocked");
          assert.equal(scoped.ref, "44");
          assert.deepEqual(scoped.waitingOn, ["43"]);
        },
      ),
  },
  {
    name: "span/11 next: every pre-existing scope form answers exactly as before — unscoped, driver, and driver-range",
    run: () =>
      withStream(TWO_MILESTONES, async (work) => {
        assert.deepEqual(refsOf(await nextWork(work)), ["44/01", "44/02", "44/03", "44/04", "44/05", "45/00"], "unscoped walks the stream");
        assert.deepEqual(refsOf(await nextWork(work, "45")), ["45/00"], "a driver scope is one driver");
        assert.deepEqual(refsOf(await nextWork(work, "44-45")), ["44/01", "44/02", "44/03", "44/04", "44/05", "45/00"], "a driver RANGE is still driver-grained");
        assert.deepEqual(refsOf(await nextWork(work, "45-45")), ["45/00"], "a single-driver range still means that driver");
      }),
  },
  {
    name: "span/12 next: a one-story span is legal, and a descending span admits nothing",
    run: () =>
      withStream(TWO_MILESTONES, async (work) => {
        assert.deepEqual(refsOf(await nextWork(work, "44/02-02")), ["44/02"], "MM-MM is the single story");
        assert.deepEqual(await nextWork(work, "44/03-01"), { state: "done" }, "lo greater than hi admits nothing");
      }),
  },

  // ══════════════════════════════════════════════════════════════════════════
  // STORY 86 · task 00 — a story-grained shape that is not a valid span is
  //                      REFUSED, and the two surfaces agree about what a
  //                      story-grained ref means
  // ══════════════════════════════════════════════════════════════════════════
  ...[
    { scope: "44/01-03x", why: "a trailing character no admitted form has" },
    { scope: "44/", why: "a story grain that then names no story" },
    { scope: "44/01-", why: "a span missing its upper bound" },
    { scope: "44/01-02-03", why: "a third bound no span carries" },
    { scope: EN_DASHED, why: "U+2013 EN DASH — one invisible codepoint from a legal span" },
  ].map(({ scope, why }) => ({
    name: `span/13 next: the story-grained shape "${scope}" is REFUSED rather than silently widened to the whole stream (${why})`,
    run: () =>
      withStream(TWO_MILESTONES, async (work) => {
        // The counterfactual FIRST, so the refusal below is a suppressed answer rather than
        // an empty stream: unscoped, this fixture answers with six items across TWO
        // milestones, and that is exactly what the pre-change fall-through returned for
        // every scope on this list.
        assert.deepEqual(
          refsOf(await nextWork(work)),
          ["44/01", "44/02", "44/03", "44/04", "44/05", "45/00"],
          "unscoped, the walk answers across both milestones — the answer the fall-through used to give this scope",
        );

        await assert.rejects(
          () => nextWork(work, scope),
          (error) => {
            assert.equal(error.code, "invalid-scope", "a coded refusal, not an incidental throw");
            assert.ok(error.message.includes(scope), "the refusal names the shape that was refused");
            // …and the admitted forms, so the operator can see what they typed instead of.
            assert.match(error.message, /NN-MM/, "the refusal names the driver-range form");
            assert.match(error.message, /NN\/SS/, "…the one-story form");
            assert.match(error.message, /NN\/MM-PP/, "…the span form");
            assert.match(error.message, /slug/, "…and the free-text form");
            return true;
          },
          `${scope} must be refused — an ignored scope is worse than a refused one, because the lane that consumes this answer dispatches worktrees and spawns developers`,
        );

        // `findWork` already answered `[]` for these shapes. The refusal is what ENDS the
        // disagreement; it does not change find's answer.
        assert.deepEqual(await findWork(work, scope), [], "find still answers with the empty set");
      }),
  })),
  {
    name: "span/14 next: a bare story ref `44/01` scopes the walk to THAT STORY — never to the stream, never to another milestone's stories, and never to its own milestone's acceptance",
    run: async () => {
      await withStream(TWO_MILESTONES, async (work) => {
        const scoped = await nextWork(work, "44/01");
        assert.equal(scoped.state, "ready");
        assert.equal(scoped.ref, "44/01");
        assert.deepEqual(refsOf(scoped), ["44/01"], "that story alone");

        // The neighbour is genuinely IN the stream — so its absence above is exclusion, not
        // an empty fixture. This is the row the measured table recorded as returned.
        assert.ok(refsOf(await nextWork(work)).includes("45/00"), "45/00 is in the stream");
        assert.equal(refsOf(scoped).includes("45/00"), false, "…and another milestone's story is excluded");
      });

      // …and the acceptance half, which needs a milestone with nothing left to build: the
      // MILESTONE scope offers it for acceptance and the STORY scope does not, because the
      // stories outside `44/01` were never looked at.
      await withStream(
        [{ number: "44", status: "in-progress", stories: [{ number: "00", status: "done" }, { number: "01", status: "done" }] }],
        async (work) => {
          assert.equal((await nextWork(work, "44")).ref, "44", "the milestone scope DOES offer 44 for acceptance");
          assert.deepEqual(await nextWork(work, "44/01"), { state: "done" }, "…and a story-grained scope never does");
        },
      );
    },
  },
  {
    name: "span/15 seam: find and next agree about every story-grained ref — neither answers with an item the other excludes",
    run: () =>
      withStream(TWO_MILESTONES, async (work) => {
        for (const shape of ["44/01", "44/01-03", "44/01-03x", EN_DASHED, "44/40-42"]) {
          const found = (await findWork(work, shape)).map((row) => row.ref);
          let walked;
          try {
            walked = refsOf(await nextWork(work, shape));
          } catch (error) {
            // The ONE answer next may give that find cannot: a refusal. It names no item, so
            // find must name none either — which is the disagreement this story closes.
            assert.equal(error.code, "invalid-scope", `${shape}: the only non-answer permitted is a coded refusal (got ${error.code ?? error.message})`);
            assert.deepEqual(found, [], `${shape}: find names nothing where next refuses`);
            continue;
          }
          assert.deepEqual(walked, found, `${shape}: the two surfaces name exactly the same items`);
        }
      }),
  },
  {
    name: "span/16 next: every scope form that already worked answers exactly as it did before the refusal landed",
    run: () =>
      withStream(TWO_MILESTONES, async (work) => {
        const wholeStream = ["44/01", "44/02", "44/03", "44/04", "44/05", "45/00"];
        assert.deepEqual(refsOf(await nextWork(work, "44")), ["44/01", "44/02", "44/03", "44/04", "44/05"], "a driver scope");
        assert.deepEqual(refsOf(await nextWork(work, "44-46")), wholeStream, "a driver range");
        assert.deepEqual(refsOf(await nextWork(work, "44/01-03")), ["44/01", "44/02", "44/03"], "a span");
        // The nearest neighbour to every refused shape: it PARSES, so the refusal may not
        // claim it. A refusal drawn one character wider would have swallowed it.
        assert.deepEqual(await nextWork(work, "44/03-01"), { state: "done" }, "a descending span still parses and admits nothing");
        // The fall-through is LOAD-BEARING for free text, which is why the refusal reaches
        // only shapes claiming to be story-grained.
        assert.deepEqual(refsOf(await nextWork(work, "milestone-44")), wholeStream, "a free-text slug still falls through to the unscoped walk");
        assert.deepEqual(refsOf(await nextWork(work)), wholeStream, "no scope at all");
      }),
  },

  // ══════════════════════════════════════════════════════════════════════════
  // STORY 86 · task 01 — the command face resolves a span to the ONE driver it
  //                      names, rather than reporting every held driver in the
  //                      stream
  //
  // Over the ITEM-LOCK fixture: held-ness is an assignment-store fact, and the
  // symptom (a finished span rendering as `held`) is only observable with a
  // lock active — which is precisely why no existing test caught it.
  // ══════════════════════════════════════════════════════════════════════════
  {
    name: "span/17 face: a FINISHED span with an unrelated driver held elsewhere answers done — it does not name the driver the operator never asked about",
    run: () =>
      withItemLockFixture(async (fx) => {
        await seedActive(fx, { assignmentId: "asg-12", itemRef: "12", node: "aof-wsl", state: "running" });

        const envelope = await invoke("work:next", { scope: "44/01-03" }, fx.ctx);
        assert.equal(envelope.state, "done", "the span's stories are all done, so the span is done — not `held`");
        assert.deepEqual(envelope.skipped, [], "and it reports no skipped driver at all");

        // The rendered line is the symptom's own face: it must not carry "12".
        const human = nextCommand.cli.render(envelope, { positionals: ["44/01-03"] });
        assert.match(human, /Nothing actionable in 44\/01-03 — everything is done\./);
        assert.equal(human.includes("12"), false, `the unrelated driver is not named (got: ${human})`);
      }, {
        stream: [
          { number: "12", stories: [] },
          {
            number: "44",
            stories: [
              { number: "01", status: "done" },
              { number: "02", status: "done" },
              { number: "03", status: "done" },
              { number: "04", status: NOT_STARTED },
            ],
          },
        ],
      }),
  },
  {
    name: "span/18 face: a span whose OWN driver is held reports that driver and names the holder — the fix narrows the report, it does not silence it",
    run: () =>
      withItemLockFixture(async (fx) => {
        await seedActive(fx, { assignmentId: "asg-44", itemRef: "44", node: "aof-wsl", state: "running" });

        const envelope = await invoke("work:next", { scope: "44/01-03" }, fx.ctx);
        assert.equal(envelope.state, "held", "everything actionable in the span is being worked elsewhere — which is NOT done");
        const refs = envelope.skipped.map((entry) => entry.ref);
        assert.ok(refs.includes("44"), `the span's own driver is reported (got ${refs.join(", ") || "nothing"})`);
        assert.ok(
          envelope.skipped.every((entry) => entry.holderNode === "aof-wsl"),
          "…and every entry names its holder, because the next move is to ask them",
        );
        assert.ok(
          envelope.skipped.every((entry) => entry.scopeRef === "44"),
          "…and every entry sits in the scope the span names",
        );
      }, {
        stream: [
          { number: "12", stories: [] },
          { number: "44", stories: ["01", "02", "03"] },
        ],
      }),
  },
  {
    name: "span/19 face: a DRIVER RANGE keeps its documented over-reporting — \"we cannot tell which driver you meant\" is honest for a range, and untouched",
    run: () =>
      withItemLockFixture(async (fx) => {
        await seedActive(fx, { assignmentId: "asg-12", itemRef: "12", node: "aof-wsl", state: "running" });

        const envelope = await invoke("work:next", { scope: "44-46" }, fx.ctx);
        const refs = envelope.skipped.map((entry) => entry.ref);
        assert.ok(
          refs.includes("12"),
          `a range still reports a held driver outside it (got ${refs.join(", ") || "nothing"}) — over-reporting is a nuisance, silently omitting a held item is the failure the criterion exists to prevent`,
        );
      }, {
        stream: [
          { number: "12", stories: [] },
          { number: "44", stories: ["01", "02", "03"] },
        ],
      }),
  },

  // ══════════════════════════════════════════════════════════════════════════
  // STORY 86 · task 02 — the continue prompt's span branch is pinned
  //
  // Half of story 84's deliverable is that prompt. The bundle manifest's sha256
  // detects a CHANGE to the file and not the ABSENCE of a claim within it, so
  // the branch could be deleted, the manifest regenerated, and every test stay
  // green. These three lanes are the assertion that makes the branch a rule.
  // ══════════════════════════════════════════════════════════════════════════
  {
    name: "span/20 prompt: the shipped continue prompt carries a span dispatch branch, and that branch scopes the walk to the span rather than to the bare milestone",
    run: async () => assertSpanDispatch(await readFile(CONTINUE_PROMPT, "utf8")),
  },
  ...SPAN_BRANCH_OBLIGATIONS.map(({ obligation, check }) => ({
    name: `span/21 prompt: the span branch states ${obligation}`,
    run: async () => check(await readFile(CONTINUE_PROMPT, "utf8")),
  })),
  {
    name: "span/22 prompt: the pin is NON-VACUOUS — cut the span branch out of a COPY and the assertions fail",
    run: async () => {
      const prompt = await readFile(CONTINUE_PROMPT, "utf8");
      assertSpanBranch(prompt);

      const withoutBranch = prompt.replace(SPAN_BRANCH_RE, "");
      assert.notEqual(
        withoutBranch,
        prompt,
        "the branch was actually found and cut — a replace that matched nothing would make the throw below prove nothing",
      );
      assert.throws(
        () => assertSpanBranch(withoutBranch),
        assert.AssertionError,
        "with the branch gone the pin must fail — this is the difference between hashing a file and asserting a claim within it",
      );
    },
  },
];
