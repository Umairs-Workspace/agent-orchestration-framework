// Traceability wiring for story 65, task 00 —
// `wiki/work/65_story_concurrent-story-dispatch/tasks/00_story-depends-becomes-data.feature`
// (@executable). One exported entry per Scenario, and one per Scenario-Outline ROW, with
// the Examples table carried as a literal table so the file reads as the contract it proves.
//
// THE SPLIT IS THE WHOLE DESIGN, so every lane below asserts against the reader it names:
// `validateWork` REPORTS a sibling edge that resolves to nothing; `nextWork` IGNORES the
// same edge. Two renderings of one rule (the `next`/`item-lock` idiom,
// src/commands/next.mjs:8-14) — and a suite that proved only one of them would be proving
// the wrong half of an amendment that deleted a locked scenario's blindness.
//
// Run focused and isolated (hook-enforced):
//   AOF_GLOBAL_HOME=$(mktemp -d) node scripts/test-unit.mjs   (or the focused runner)
import assert from "node:assert/strict";
import { nextWork, validateWork, siblingDependencyNumber } from "../../../src/work.mjs";
import { withStream, VALIDATE_CONFIG, hasFinding } from "../../support/story-depends-fixture.mjs";

const NOT_STARTED = "not-started";

export const workStoryDependsTests = [
  // ══════════════════════════════════════════════════════════════════════════
  // Scenario: a story's depends on a sibling is read as data
  // ══════════════════════════════════════════════════════════════════════════
  {
    name: "story-depends/00 a story's depends on a sibling is read as data — 01 carries an edge to 00, and the edge gates the walk",
    run: () =>
      withStream(
        [{
          number: "00",
          status: "in-progress",
          stories: [
            { number: "00", status: NOT_STARTED },
            { number: "01", status: NOT_STARTED, depends: ["00"] },
          ],
        }],
        async (work) => {
          // The edge is DATA: it changes what the walk answers, which is the only way a
          // reader can observe a graph the module keeps private.
          const first = await nextWork(work);
          assert.equal(first.ref, "00/00", "the ungated sibling is offered");
          assert.deepEqual(
            first.readySet.map((member) => member.ref),
            ["00/00"],
            "01 carries an edge to 00, so it is NOT in the ready set while 00 is unfinished",
          );
          // …and the edge resolves cleanly: nothing is reported against it.
          const findings = await validateWork(work, VALIDATE_CONFIG);
          assert.deepEqual(findings, [], `a resolving sibling edge is clean: ${JSON.stringify(findings)}`);
        },
      ),
  },
  {
    name: "story-depends/00 the edge is keyed WITHIN the parent milestone — a sibling number never collides with a driver number",
    run: () =>
      withStream(
        [
          // Milestone 00 is DONE. If a story's `depends: [00]` were keyed globally it
          // would resolve to that milestone and read as met; keyed within the parent it
          // resolves to sibling 43/00, which is not done, so 43/01 waits.
          { number: "00", status: "done" },
          {
            number: "43",
            status: "in-progress",
            stories: [
              { number: "00", status: NOT_STARTED },
              { number: "01", status: NOT_STARTED, depends: ["00"] },
            ],
          },
        ],
        async (work) => {
          const next = await nextWork(work);
          assert.equal(next.ref, "43/00", "the sibling gate resolved within milestone 43, not against milestone 00");
          assert.deepEqual(next.readySet.map((member) => member.ref), ["43/00"]);
        },
      ),
  },
  {
    name: "story-depends/00 the sibling resolver keys within the parent — a bare number, the parent's own full ref, and ANOTHER milestone's full ref",
    run: async () => {
      // The rule itself, exercised directly, because the three spellings are the whole
      // reason "keyed within the parent" is a property rather than a coincidence.
      assert.equal(siblingDependencyNumber("00", "43"), "00", "a bare two-digit sibling number");
      assert.equal(siblingDependencyNumber("0", "43"), "0", "an unpadded sibling number (compared numerically)");
      assert.equal(siblingDependencyNumber("43/01", "43"), "01", "the full ref whose milestone IS the parent");
      assert.equal(siblingDependencyNumber("40/01", "43"), null, "the full ref of ANOTHER milestone is not a sibling");
      assert.equal(siblingDependencyNumber("", "43"), null, "empty text names nothing");
      assert.equal(siblingDependencyNumber("alpha", "43"), null, "a slug is not a sibling number");
    },
  },

  // ══════════════════════════════════════════════════════════════════════════
  // Scenario: a driver's depends behaviour is byte-unchanged
  // ══════════════════════════════════════════════════════════════════════════
  {
    name: "story-depends/00 a driver's depends behaviour is byte-unchanged — every driver-level resolve, cycle and gating answer is what it was",
    run: async () => {
      // (a) GATING: a milestone waits on an unfinished driver, and becomes ready the
      //     moment it is done — with the SAME waitingOn vocabulary (driver numbers).
      await withStream(
        [
          { number: "00", status: NOT_STARTED },
          { number: "01", type: "uat", status: NOT_STARTED, depends: ["00"] },
        ],
        async (work) => {
          const blocked = await nextWork(work, "01");
          assert.equal(blocked.state, "blocked");
          assert.equal(blocked.ref, "01");
          assert.equal(blocked.type, "uat", "the blocked answer is still the DRIVER, not a story");
          assert.deepEqual(blocked.waitingOn, ["00"], "waitingOn names driver numbers, unchanged");
        },
      );
      // (b) RESOLVE: a driver edge that names no driver keeps its own wording — the
      //     story wording ("does not resolve to a sibling") never leaks onto a driver.
      await withStream(
        [{ number: "00", status: NOT_STARTED, depends: ["99"] }],
        async (work) => {
          const findings = await validateWork(work, VALIDATE_CONFIG);
          // The wording moved once, deliberately: it said "a milestone/uat item" while
          // spikes and chores were already admitted and a parentless story has since
          // joined them, so it named a narrower rule than the one applied and implied a
          // wrong remedy. What this row actually protects is unchanged — the DRIVER
          // wording is its own, and the story wording never leaks onto it.
          assert.ok(
            hasFinding(findings, 'depends "99" does not resolve to a top-level item'),
            `the driver wording is its own: ${JSON.stringify(findings)}`,
          );
          assert.ok(!hasFinding(findings, "sibling"), "a driver edge is never reported as a sibling edge");
        },
      );
      // (c) CYCLE: a driver cycle is still reported at the work dir, with driver NUMBERS
      //     in the path — not re-keyed, re-scoped or re-ordered.
      await withStream(
        [
          { number: "00", status: NOT_STARTED, depends: ["01"] },
          { number: "01", status: NOT_STARTED, depends: ["00"] },
        ],
        async (work) => {
          const findings = await validateWork(work, VALIDATE_CONFIG);
          const cycle = findings.find((finding) => finding.problem.startsWith("depends cycle:"));
          assert.ok(cycle, `a driver cycle is reported: ${JSON.stringify(findings)}`);
          assert.equal(cycle.path, work, "the driver cycle is still filed at the work dir");
          assert.match(cycle.problem, /depends cycle: 0 → 1 → 0|depends cycle: 1 → 0 → 1/, "driver numbers, unchanged");
        },
      );
    },
  },

  // ══════════════════════════════════════════════════════════════════════════
  // Scenario Outline: validate reports the story edges that cannot be honoured
  //   | edges                                       | verdict                                             |
  //   | 01 → 00                                     | accepted: a resolving sibling edge                  |
  //   | 01 → 00, 02 → 00                            | accepted: a diamond over one sibling, no loop       |
  //   | 01 → 99 (no sibling numbered 99)            | flagged: depends "99" does not resolve to a sibling |
  //   | 01 → 01 (a story depending on itself)       | flagged: depends cycle                              |
  //   | 01 → 02, 02 → 01                            | flagged: depends cycle                              |
  //   | 01 → 00 where 00 is under ANOTHER milestone | flagged: depends "00" does not resolve to a sibling |
  // ══════════════════════════════════════════════════════════════════════════
  ...[
    {
      edges: "01 → 00",
      verdict: "accepted: a resolving sibling edge",
      stream: [{
        number: "00", status: "in-progress",
        stories: [
          { number: "00", status: NOT_STARTED },
          { number: "01", status: NOT_STARTED, depends: ["00"] },
          { number: "02", status: NOT_STARTED },
        ],
      }],
      expect: (findings) => {
        assert.deepEqual(findings, [], `accepted, no findings: ${JSON.stringify(findings)}`);
      },
    },
    {
      edges: "01 → 00, 02 → 00",
      verdict: "accepted: a diamond over one sibling, no loop",
      stream: [{
        number: "00", status: "in-progress",
        stories: [
          { number: "00", status: NOT_STARTED },
          { number: "01", status: NOT_STARTED, depends: ["00"] },
          { number: "02", status: NOT_STARTED, depends: ["00"] },
        ],
      }],
      expect: (findings) => {
        assert.deepEqual(findings, [], `a diamond is acyclic: ${JSON.stringify(findings)}`);
      },
    },
    {
      edges: "01 → 99 (no sibling numbered 99)",
      verdict: 'flagged: depends "99" does not resolve to a sibling',
      stream: [{
        number: "00", status: "in-progress",
        stories: [
          { number: "00", status: NOT_STARTED },
          { number: "01", status: NOT_STARTED, depends: ["99"] },
          { number: "02", status: NOT_STARTED },
        ],
      }],
      expect: (findings) => {
        assert.ok(hasFinding(findings, 'depends "99" does not resolve to a sibling'), `flagged: ${JSON.stringify(findings)}`);
        assert.ok(!hasFinding(findings, "depends cycle"), "a dangling edge is not a cycle");
      },
    },
    {
      edges: "01 → 01 (a story depending on itself)",
      verdict: "flagged: depends cycle",
      stream: [{
        number: "00", status: "in-progress",
        stories: [
          { number: "00", status: NOT_STARTED },
          { number: "01", status: NOT_STARTED, depends: ["01"] },
          { number: "02", status: NOT_STARTED },
        ],
      }],
      expect: (findings) => {
        assert.ok(hasFinding(findings, "depends cycle"), `the degenerate self-edge is a cycle: ${JSON.stringify(findings)}`);
        assert.ok(hasFinding(findings, "00/01"), "the cycle names the story ref, not a bare digit");
        assert.ok(!hasFinding(findings, "does not resolve"), "a self-edge RESOLVES — it is a loop, not a dangle");
      },
    },
    {
      edges: "01 → 02, 02 → 01",
      verdict: "flagged: depends cycle",
      stream: [{
        number: "00", status: "in-progress",
        stories: [
          { number: "00", status: NOT_STARTED },
          { number: "01", status: NOT_STARTED, depends: ["02"] },
          { number: "02", status: NOT_STARTED, depends: ["01"] },
        ],
      }],
      expect: (findings) => {
        assert.ok(hasFinding(findings, "depends cycle"), `a mutual wait is a cycle: ${JSON.stringify(findings)}`);
        assert.ok(!hasFinding(findings, "does not resolve"), "both edges resolve — the fault is the loop");
      },
    },
    {
      edges: "01 → 00 where 00 is under ANOTHER milestone",
      verdict: 'flagged: depends "00" does not resolve to a sibling',
      stream: [
        // Milestone 07 owns a story 00; milestone 08's story 01 names "07/00", which is
        // not ITS sibling. The bare "00" spelling would have resolved to 08/00 — this row
        // is the one that proves the key is the PARENT, not the number.
        { number: "07", status: "in-progress", stories: [{ number: "00", status: NOT_STARTED }] },
        {
          number: "08", status: "in-progress",
          stories: [
            { number: "01", status: NOT_STARTED, depends: ["07/00"] },
            { number: "02", status: NOT_STARTED },
          ],
        },
      ],
      expect: (findings) => {
        assert.ok(hasFinding(findings, 'depends "07/00" does not resolve to a sibling'), `flagged: ${JSON.stringify(findings)}`);
        assert.ok(!hasFinding(findings, "depends cycle"), "a cross-milestone edge is not a cycle");
      },
    },
  ].map(({ edges, verdict, stream, expect }) => ({
    name: `story-depends/00 validate outline row [${edges}] -> ${verdict}`,
    run: () => withStream(stream, async (work) => { expect(await validateWork(work, VALIDATE_CONFIG)); }),
  })),

  // ══════════════════════════════════════════════════════════════════════════
  // Scenario: milestone 00's delivered acceptance criteria are left untouched
  //
  // THE ASYMMETRY IS THE POINT, and it is a rule about what each artifact IS. A delivered
  // feature file RECORDS WHAT SHIPPED — milestone 00 accepted "a story-level depends edge is
  // not part of the graph" months ago, and that is a true statement about what milestone 00
  // delivered whatever a later story does to the behaviour. A test is CODE, and code tracks
  // CURRENT behaviour, so the assertion that pinned `findings` to `[]` is updated. The new
  // rule is recorded once, in the contract of the story that accepted it — this file's own
  // subject — and nowhere else.
  // ══════════════════════════════════════════════════════════════════════════
  {
    name: "story-depends/00 milestone 00's delivered acceptance criteria are left untouched — its feature file is byte-identical, the new rule is recorded only in story 65's contract, and only the executable assertion is updated",
    run: async () => {
      const { readFile } = await import("node:fs/promises");
      const path = (await import("node:path")).default;
      const { fileURLToPath } = await import("node:url");
      const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

      // (a) MILESTONE 00'S FEATURE FILE IS BYTE-IDENTICAL TO WHAT IT DELIVERED. Asserted
      //     against git's own record of the committed bytes rather than against a phrase,
      //     because "byte-identical" is the claim and a substring check would pass a file
      //     that had been rewritten around the phrase it looked for.
      const { execFile } = await import("node:child_process");
      const rel = "wiki/work/archive/00_milestone_work-cli/stories/01_story_validate-stream/tasks/02_depends-graph.feature";
      const committed = await new Promise((resolve, reject) => {
        execFile("git", ["show", `HEAD:${rel}`], { cwd: repoRoot, windowsHide: true, maxBuffer: 8 * 1024 * 1024 },
          (error, stdout) => (error ? reject(error) : resolve(String(stdout))));
      });
      const onDisk = await readFile(path.join(repoRoot, rel), "utf8");
      assert.equal(
        onDisk.replace(/\r\n/g, "\n"),
        committed.replace(/\r\n/g, "\n"),
        "milestone 00's delivered feature file is byte-identical to what it shipped — an accepted milestone's acceptance criteria record WHAT SHIPPED, and are not rewritten by a later item that changes the behaviour",
      );
      assert.ok(
        onDisk.includes("Scenario: a story-level depends edge is not part of the graph"),
        "…including the scenario this story's behaviour supersedes (non-vacuous: the file really is the one under discussion)",
      );

      // (b) THE NEW RULE IS RECORDED ONLY HERE — in the contract of the story that accepted
      //     it. Non-vacuous in both directions: present in 65's own feature, absent from 00's.
      const own = await readFile(path.join(
        repoRoot, "wiki", "work", "archive", "65_story_concurrent-story-dispatch", "tasks",
        "00_story-depends-becomes-data.feature",
      ), "utf8");
      assert.match(own, /THE SPLIT IS THE WHOLE DESIGN/, "story 65's contract records the split");
      assert.match(own, /does not resolve to a sibling/, "…including validate's exact wording");
      assert.ok(!onDisk.includes("does not resolve to a sibling"), "…and milestone 00's contract records none of it");

      // (c) THE EXECUTABLE ASSERTION IS UPDATED, because a test tracks CURRENT behaviour
      //     where a delivered feature records what shipped. It now reports the unresolvable
      //     sibling edge instead of pinning `findings` to an empty list.
      const testSource = await readFile(path.join(repoRoot, "test", "work", "gate", "work-validate.test.mjs"), "utf8");
      assert.match(testSource, /does not resolve to a sibling/, "the test asserts the behaviour that now holds");
      assert.ok(
        !testSource.includes("story-level depends is invisible to the graph"),
        "…and the superseded `deepEqual(findings, [])` claim is gone — it asserted the opposite of the delivered behaviour",
      );
    },
  },

  // ══════════════════════════════════════════════════════════════════════════
  // Scenario: next does not offer a story whose sibling dependency is unfinished
  // ══════════════════════════════════════════════════════════════════════════
  {
    name: "story-depends/00 next does not offer a story whose sibling dependency is unfinished — it offers 00 and never 01",
    run: () =>
      withStream(
        [{
          number: "00", status: "in-progress",
          stories: [
            { number: "00", status: NOT_STARTED },
            { number: "01", status: NOT_STARTED, depends: ["00"] },
          ],
        }],
        async (work) => {
          const next = await nextWork(work);
          assert.equal(next.state, "ready");
          assert.equal(next.ref, "00/00", "it offers 00");
          assert.ok(
            !next.readySet.some((member) => member.ref === "00/01"),
            "…and it does not offer 01, at the head or anywhere in the set",
          );
        },
      ),
  },

  // ══════════════════════════════════════════════════════════════════════════
  // Scenario: a story becomes actionable the moment its sibling is done
  // ══════════════════════════════════════════════════════════════════════════
  {
    name: "story-depends/00 a story becomes actionable the moment its sibling is done — next offers 01",
    run: () =>
      withStream(
        [{
          number: "00", status: "in-progress",
          stories: [
            { number: "00", status: "done" },
            { number: "01", status: NOT_STARTED, depends: ["00"] },
          ],
        }],
        async (work) => {
          const next = await nextWork(work);
          assert.equal(next.state, "ready");
          assert.equal(next.ref, "00/01", "the gate opened with no intervening command");
        },
      ),
  },

  // ══════════════════════════════════════════════════════════════════════════
  // Scenario: a mutual wait is reported, never silently accepted
  // ══════════════════════════════════════════════════════════════════════════
  {
    name: "story-depends/00 a mutual wait is reported, never silently accepted — the milestone is NOT offered for acceptance and the answer says waiting, not done",
    run: () =>
      withStream(
        [{
          number: "00", status: "in-progress",
          stories: [
            { number: "00", status: "done" },
            { number: "01", status: NOT_STARTED, depends: ["02"] },
            { number: "02", status: NOT_STARTED, depends: ["01"] },
          ],
        }],
        async (work) => {
          const next = await nextWork(work);
          assert.notEqual(next.state, "done", "a cycle must never read as a finished milestone");
          assert.notEqual(next.ref, "00", "the milestone is NOT offered for acceptance");
          assert.equal(next.state, "blocked", "waiting is its own answer");
          assert.equal(next.type, "story", "…reported at the grain that is actually waiting");
          assert.equal(next.ref, "00/01");
          assert.deepEqual(next.waitingOn, ["00/02"], "naming the sibling it waits on");
          assert.deepEqual(next.readySet, [], "nothing is ready to act on");
          // And validate says WHY, on its own channel.
          assert.ok(
            hasFinding(await validateWork(work, VALIDATE_CONFIG), "depends cycle"),
            "validate reports the cycle that next reports as a wait",
          );
        },
      ),
  },

  // ══════════════════════════════════════════════════════════════════════════
  // Scenario: next tolerates a dep that names no sibling, so a typo cannot
  //           strand a milestone
  // ══════════════════════════════════════════════════════════════════════════
  {
    name: "story-depends/00 next tolerates a dep naming no sibling — the walk is unaffected, 01 is offered in its normal position once 00 is done, and validate separately reports the edge",
    run: async () => {
      await withStream(
        [{
          number: "00", status: "in-progress",
          stories: [
            { number: "00", status: NOT_STARTED },
            { number: "01", status: NOT_STARTED, depends: ["99"] },
          ],
        }],
        async (work) => {
          const next = await nextWork(work);
          assert.equal(next.ref, "00/00", "the walk is unaffected: 00 is offered");
          assert.deepEqual(
            next.readySet.map((member) => member.ref),
            ["00/00", "00/01"],
            "…and 01 is ready too — a dangling edge gates nothing",
          );
          assert.ok(
            hasFinding(await validateWork(work, VALIDATE_CONFIG), 'depends "99" does not resolve to a sibling'),
            "validate SEPARATELY reports the unresolvable edge",
          );
        },
      );
      // …and in its normal POSITION once 00 is done (the second half of the Then).
      await withStream(
        [{
          number: "00", status: "in-progress",
          stories: [
            { number: "00", status: "done" },
            { number: "01", status: NOT_STARTED, depends: ["99"] },
          ],
        }],
        async (work) => {
          assert.equal((await nextWork(work)).ref, "00/01", "01 is offered in its normal positional order");
        },
      );
    },
  },

  // ══════════════════════════════════════════════════════════════════════════
  // Scenario: a stream where no story declares depends is answered exactly as
  //           before
  // ══════════════════════════════════════════════════════════════════════════
  {
    name: "story-depends/00 a stream whose stories carry no depends is answered byte-identically — the first not-done story in positional order",
    run: () =>
      withStream(
        [
          { number: "00", status: "done", stories: [{ number: "00", status: "done" }] },
          {
            number: "01", status: "in-progress",
            stories: [
              { number: "00", status: "done" },
              { number: "01", status: "in-progress" },
              { number: "02", status: NOT_STARTED },
            ],
          },
        ],
        async (work) => {
          const next = await nextWork(work);
          // The single-item keys, byte-for-byte the pre-change answer: no `depends`
          // anywhere in the stream means the gate is a no-op, exactly as `mergePresence
          // (disk, null) === disk`.
          assert.deepEqual(
            { state: next.state, ref: next.ref, type: next.type, slug: next.slug, status: next.status },
            { state: "ready", ref: "01/01", type: "story", slug: "story-01", status: "in-progress" },
            "the offered item is the first not-done story in positional order",
          );
          assert.equal(typeof next.path, "string", "…carrying its raw path exactly as before");
        },
      ),
  },
];
