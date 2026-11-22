// The `assets-clean` golden lane (204/ADR-004, ADR-006 §1). Each scenario runs the real apply and
// the real clean. `plain` cleans twice over `EVERY_KIND`, held whole. `customised` cleans over the
// user's own file at every merge point. `drifted` edits two files between apply and clean, as a
// user would, through a step that runs `user-edit.mjs` (ADR-001 §5).
import { EVERY_KIND } from "./assets-apply.lane.mjs";
import { USER_FILES } from "./assets-merge.lane.mjs";

export const USER_EDIT = "test/golden/fixtures/user-edit.mjs";

const apply = { argv: ["assets", "apply", "--json"], exit: 0 };
const clean = { argv: ["assets", "clean", "--json"], exit: 0 };
const edit = (rel, mode, text) => ({ command: USER_EDIT, argv: [rel, mode, text], exit: 0 });

export const AGENT_NOTE = "Mine: a note.\n";
export const CLAUDE_HEADING = "# Mine\n";

export default Object.freeze({
  id: "assets-clean",
  scenarios: Object.freeze([
    { id: "plain", files: EVERY_KIND, steps: [apply, clean, clean] },
    { id: "customised", base: "plain", files: { ...EVERY_KIND, ...USER_FILES }, steps: [apply, clean] },
    {
      id: "drifted",
      base: "plain",
      files: EVERY_KIND,
      steps: [apply, edit(".claude/agents/my-agent.md", "--append", AGENT_NOTE), edit("CLAUDE.md", "--prepend", CLAUDE_HEADING), clean],
    },
  ]),
});
