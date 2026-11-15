import path from "node:path";
import { EXAMPLES_DOC, RESEARCH_DOC } from "./map.mjs";

// THE STORY PROBE — the doctor snapshot's read of a story's example map (milestone 134 / ADR-005
// §2-3, moved here by 135 / ADR-001 §3). `@aof/work`'s engine calls it once per story row, at its
// impure edge, and merges what it answers into the row: `docSizes` beside the row's own sizes, so
// the budget lane measures the map like any other document, and `extensions.examples` for the lane.
//
// Bounded the three ways 134 bounded it: only when the gate resolves on (through the one resolver
// core injects), only when the file is directly in the story's folder, and only for a story — the
// engine asks for nothing else. Gate off is today: no read, no measurement, no answers. The file is
// read through the engine's own `fileState`, so the map's line count is the same count every other
// budgeted document gets. Its answers come through the one collector with the caller's transcript
// directory or none, so the probe never resolves one from the environment.
//
// Since 193/01 (ADR-002 §3) it reads one more document beside the map, under the same three bounds:
// the research document the story cites, as `extensions.examples.research` (its text, or null when
// there is none). The lane resolves every `researched F<n>` against that text and reads no disk.
export function createExamplesStoryProbe({ examplesEnabledFromConfig, collectAnswers }) {
  async function storyProbe(item, { projectsDir = null, config = {}, fileState } = {}) {
    if (!examplesEnabledFromConfig(config ?? {})) return null;
    const map = await fileState(path.join(item.dir, EXAMPLES_DOC));
    if (!map.present) return null;
    const research = await fileState(researchDocOf(item).path);
    return {
      docSizes: { [EXAMPLES_DOC]: { lines: map.lines } },
      extensions: { examples: { text: map.text, answers: await collectAnswers(item, { projectsDir }), research: research.present ? research.text : null } },
    };
  }

  return { storyProbe };
}

// THE DOCUMENT A STORY CITES (193/ADR-001 §7): a story under a milestone cites its milestone's
// research document, the folder that holds its `stories/` folder (the step `answers.mjs` takes to its
// parent); a standalone story cites one in its own folder. The one answer the probe and the build
// door both ask, so they cannot read two documents. `whose` names it for a message, without a path,
// so the doctor and the door word a finding alike wherever they resolved the folder from.
export function researchDocOf(story) {
  const nested = String(story?.ref ?? "").includes("/");
  return {
    path: path.join(nested ? path.dirname(path.dirname(story.dir)) : story.dir, RESEARCH_DOC),
    whose: nested ? "the milestone's" : "the story's",
  };
}

// The map's row in the doctor's budget family (134 / ADR-001 §1): one screen. The budget lane takes
// it beside its built-in rows, so `work.doctor.budgets.examples` still overrides the default, and a
// story the probe did not measure contributes no size and is silent.
export const EXAMPLES_BUDGET_ROWS = Object.freeze([Object.freeze({ doc: EXAMPLES_DOC, kind: "examples", lines: 50 })]);
