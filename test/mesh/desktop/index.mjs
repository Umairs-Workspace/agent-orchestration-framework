// THE MESH/DESKTOP SUITES — this directory's index, and the ONE place its membership is
// written down (119/03, ADR-010). The registry names directories; a directory names its own
// suites. A new suite here is one import and one spread IN THIS FILE, and `scripts/test.mjs`
// is unchanged by its arrival.
//
// Membership is IMPORTED AND SPREAD, never derived: no `readdir` decides what belongs here.
// `registrationDecision` (`src/work-audit/census.mjs`) stays the single decider of which file
// contributed which entries, and this file is one of its inputs rather than a second answer.
// Every binding the registry spread for a suite is spread here — including both of the two
// that four suites in this tree export, which a one-binding-per-file index would halve.

// milestone 36 / story 03 — the `aof mesh desktop install|run` CLI-only nested verbs (ADR-003):
// verb dispatch + --json single-envelope + no mesh:* id (task 00); the staged-then-swap idempotent
// install into $HOME/.aof/bin + WebView2 bootstrapper placed file + friendly-refusal matrix (task 01);
// co-located discovery + detached launch + not-installed refusal (task 02). Node-side @executable;
// the @uat end-to-end (task 03) is deferred to aof:verify.
import { meshDesktopDispatchTests } from "./mesh-desktop-dispatch.test.mjs";
import { meshDesktopInstallTests } from "./mesh-desktop-install.test.mjs";
import { meshDesktopRunTests } from "./mesh-desktop-run.test.mjs";
// TECH_DEBT 20(b) — `aof mesh desktop stop`, the programmatic exit the supervisor
// never had. Both process seams are injected, so this suite never enumerates or
// terminates a real process (it runs beside a live supervisor on the control node).
import { meshDesktopStopTests } from "./mesh-desktop-stop.test.mjs";
// milestone 126 / story 04 — login autostart on the EXISTING install verb (ADR-007):
// `--autostart`/`--no-autostart` through ONE injected registry runner, a coded refusal
// off Windows, and `--dry-run` over the whole verb. The registry runner is a fake that
// MODELS the key, so nothing here touches the real hive.
import { meshDesktopAutostartTests } from "./mesh-desktop-autostart.test.mjs";
// milestone 126 / story 06 — the FOURTH preflight check: a workspace with no
// `claude-run-heartbeat` hook is named, and the count of three is superseded.
import { meshDesktopPreflightHeartbeatTests } from "./mesh-desktop-preflight-heartbeat.test.mjs";

export const tests = [
  // milestone 36 / story 03 — mesh desktop CLI verbs (dispatch / install / run)
  ...meshDesktopDispatchTests,
  ...meshDesktopInstallTests,
  ...meshDesktopRunTests,
  ...meshDesktopStopTests,
  // milestone 126 / story 04 — autostart + the preflight
  ...meshDesktopAutostartTests,
  ...meshDesktopPreflightHeartbeatTests,
];
