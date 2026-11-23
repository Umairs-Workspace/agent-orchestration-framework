// THE GOLDEN SUITES — this directory's index, and the ONE place its membership is written down
// (119/03, ADR-010). A new suite here is one import and one spread IN THIS FILE.
//
// milestone 203 / story 00 — the harness every golden lane runs on, proven on a fixture verb:
// a verb run isolated in a temp project and home, the closed normaliser, a baseline stored as a
// delta from a named base, drift reported as a diff per file, and only `scripts/golden.mjs
// --update` writing (203/ADR-001 to ADR-004).
import { goldenHarnessTests } from "./golden-harness.test.mjs";
// milestone 203 / story 01 — the `work-init` lane: eight init scenarios held to committed baselines
// (`default` whole, the rest as deltas over it), and the render run twice to the same bytes
// (203/ADR-005, ADR-002 §5).
import { workInitTests } from "./work-init.test.mjs";
// milestone 203 / story 02 — the `work-update` lane: update on every init scenario's own output
// changes nothing, a customised update keeps the user's edit, and an older tree rebuilt from the
// committed baseline upgrades to exactly the expected changes (203/ADR-006).
import { workUpdateTests } from "./work-update.test.mjs";
// milestone 204 / story 00 — the `assets-apply` lane: a project's own `.aof/` holding every asset
// kind, applied on three runtimes and held whole, each runtime alone held as a delta, and a second
// apply that skips every file (204/ADR-001, ADR-003).
import { assetsApplyTests } from "./assets-apply.test.mjs";
// milestone 204 / story 01 — the `assets-merge` lane: apply over the user's own file at every merge
// point moves only aof's entries, a second apply changes nothing, and two writers claiming one
// file or entry refuse before any write (204/ADR-002, ADR-006 §2).
import { assetsMergeTests } from "./assets-merge.test.mjs";
// milestone 204 / story 02 — the `assets-clean` lane: clean removes every file aof wholly owns,
// hands every merged file back holding only the user's content, and keeps a file the user edited
// (204/ADR-004), with a step that edits a file as a user would (ADR-001 §5).
import { assetsCleanTests } from "./assets-clean.test.mjs";
// milestone 204 / story 03 — the `project-init` lane: `aof init` on an empty folder held whole, over
// the user's ignore files and after `work init` keeping every line it did not write, and the
// `--global` path writing only into the temp home (204/ADR-001 §4, ADR-005).
import { projectInitTests } from "./project-init.test.mjs";

import { workStreamTests } from "./work-stream.test.mjs";
export const tests = [
  ...goldenHarnessTests,
  ...workInitTests,
  ...workUpdateTests,
  ...assetsApplyTests,
  ...assetsMergeTests,
  ...assetsCleanTests,
  ...projectInitTests,
  ...workStreamTests,
];
