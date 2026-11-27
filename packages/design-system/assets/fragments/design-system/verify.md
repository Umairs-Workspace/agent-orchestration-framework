<!-- fragment:conformance.baseline -->
   - **An approved canvas first (198/ADR-006).** Before the precondition below, read `DESIGN.md`
     for a canvas page link (`<canvas link>#page-m<NN>`) it names as **awaiting approval**. Put each one to the operator before the
     fidelity judge runs, as one question that carries the link, "Approve these mocks?", answered
     **Approve** or **Later** (one question per ask in a driven session).
     - **On Approve,** resolve the system `work.ui.designSystem` names (an `artifact` link is the
       system; a `name` is the one Design System you can open with exactly that title, and no
       match or more than one is a stop naming every candidate's title and link). Read back the
       canvas's `project/canvas.json`, every board on the milestone's page, `project/ds/*/tokens.json`
       and the type's `artifact-type/dc-runtime.js` into one scratchpad directory, keeping their
       published paths. Then run `aof design-system mocks import <pulled-dir> --item <NN> --canvas
       <link> --canvas-version <version> --page m<NN> --system <link> --system-version <version> --approval
       "<reference>" --json`, then `aof design-system mocks capture --item <NN> --json`, and name
       the frames in `DESIGN.md`. **Those frames are the baseline handed to the judge.** A refusal
       from either verb is a stop: report it.
     - **On Later,** nothing is imported, and the binding checklist stays the baseline the judge
       is handed.

<!-- fragment:checks.design-system -->
   **The design system's re-sync (198/ADR-007) — a milestone's accept only, and only when
   `work.ui.designSystem.mode` is `owned`.** The code is the system's source of truth: at a
   milestone's accept the session re-syncs the system from the code, then checks that nothing
   drifted. It does not run when a story is accepted: the milestone's accept follows. With `"mode":
   "reference"` nothing is re-synced and nothing is published to the system, whatever the code
   holds: the system is its owner's. Nothing is ever written from the system back to the code. The
   steps, in this order:
   1. **Resolve the system (ADR-005 §4).** An `artifact` link is the system. A `name` is the one
      Design System you can open whose title equals it exactly. No match, or more than one, stops
      verify before anything is published: name `name`, and every candidate's title and link.
   2. **Read the system's `tokens.json` back** into the scratchpad, with its version, and run
      `aof design-system check --tokens <it> --json` against the configured `source`.
   3. **When it drifts**, run `aof design-system tokens --merge <it> --out <file> --ref <the
      accepted commit> --json`. Drift before the re-sync is the expected input, and is not a
      finding: the code moved, and the system follows it.
   4. **Record it before publishing,** under `## Design-system re-sync` in `VERIFICATION.md`: the
      system's link and its version, and what the merge changed, added and removed, as its `--json`
      answer lists them.
   5. **Publish the merged tokens** to the system, with the type's own procedure, keeping
      `"editing": "code"`. Each component `DESIGN.md`'s `## Design-system changes` names has its
      README and preview updated from the milestone's committed mocks, and is published with the
      tokens.
   6. **Read the tokens back and run `aof design-system check` again,** recording the new version
      under `## Design-system re-sync`. Drift this second check still reports is logged under
      `## Findings` with the check's report, and triaged in the findings step like any other finding.

   When the first check exits 0 and `## Design-system changes` names no component, nothing is
   published: `VERIFICATION.md` records the system as in sync at its version. When it exits 0 but
   `## Design-system changes` names a component, there is no merge: each named component is
   updated from the milestone's committed mocks and published, its tokens untouched, and the
   record and the second check follow as above.
