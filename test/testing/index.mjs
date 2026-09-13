// THE TESTING SUITES — this directory's index, and the ONE place its membership is
// written down (119/03, ADR-010). The registry names directories; a directory names its own
// suites. A new suite here is one import and one spread IN THIS FILE, and `scripts/test.mjs`
// is unchanged by its arrival.
//
// Membership is IMPORTED AND SPREAD, never derived: no `readdir` decides what belongs here.
// `registrationDecision` (`src/work-audit/census.mjs`) stays the single decider of which file
// contributed which entries, and this file is one of its inputs rather than a second answer.
// Every binding the registry spread for a suite is spread here — including both of the two
// that four suites in this tree export, which a one-binding-per-file index would halve.

// milestone 72 / story 02 - THE TEST COMMAND'S FACE: one registered command (`aof test`, the ONE
// this milestone adds to `src/commands/`) that composes 72/00's declaration and bounded launch
// with 72/01's selection and adds only the face - three closed scope forms with no fourth and no
// default, a failures-only report derived from BOTH streams and the exit code, and one result
// object both the human face and `--json` project. It REPORTS and never decides: `gate: false` on
// every narrowed or widened result, no transition door invoking it, no test module entering the
// aof process (probed per-module in a FRESH process, because every in-suite probe reaches these
// modules through a warmed cache), and no declared session launch. This repo's own runner learns
// the selection argv additively above - `--only` imports the named suite files and runs them
// through THE SAME execution loop, leaving the assembled array untouched. Both @executable task
// features plus FF-7204.
import { testCommandContractTests } from "./test-command-contract.test.mjs";
import { repoTestIsolationGuardTests } from "./repo-test-isolation-guard.test.mjs";
// milestone 28 — console-app (story 02: one-line-installer — install.sh (curl|sh)
// + install.ps1 (irm|iex), ADR-006). Three @executable task features:
// 00_os-arch-detect-and-download (the uname/PROCESSOR_ARCHITECTURE→asset-name
// mapping matrix incl. arch aliases + the WOW64 boundary + the 6-class
// unsupported-combo loud-fail matrix), 01_verify-before-path (the 8-outcome
// checksum/GPG verify+refuse matrix against a fixture SHA256SUMS, incl. the F2
// pinned-fingerprint hard requirement), and the developer-owned @executable
// logic underneath 02_place-on-path-and-run (which is itself @uat) — re-install
// idempotence, PATH-persistence idempotence for both scripts, and the loud-fail
// sha256sum/gpg availability probe. Driven via real child-process spawns of
// bash/sh and powershell/pwsh against the real install.sh/install.ps1 sourced
// under a test guard (AOF_INSTALL_TEST) — no fakes; the Linux GPG rows use a
// REAL generated keypair + real gpg --verify.
import { installerDetectTests } from "./installer-detect.test.mjs";
import { installerVerifyTests } from "./installer-verify.test.mjs";
import { installerPlaceTests } from "./installer-place.test.mjs";
// m42 wave (a) / m38-F26 — atomic-write temp hygiene (failed rename reclaims its
// temp; the startup sweep reclaims aged orphans only).
import { fsTempHygieneTests } from "./fs-temp-hygiene.test.mjs";
// milestone 28 — console-app (story 00: craft-review hardening on the SEA build
// recipe — F14 (scripts/build-sea.mjs's assertSafeOutDir refuses an --out that
// resolves to the repo root/cwd/a workspace-marked dir, so `--out .` can never
// rmSync the working tree) and F8 (planMacCodesignSteps: the darwin-only
// codesign --remove-signature/--sign - dance around postject, a pure command
// planner asserted here without invoking the real codesign binary; its mac
// EXECUTION is an @manual CI/verify row). Also see the F12 polarity hardening
// folded into acd-native-addon-degrades.test.mjs and native-addon-sidecar.test.mjs
// (already registered above), which harden the isPackaged() ternary's branch
// wiring, not just its presence.
import { buildSeaRecipeGuardsTests } from "./build-sea-recipe-guards.test.mjs";

export const tests = [
  // milestone 72 / story 02 - the test command's face (tasks 00-02) plus FF-7204.
  ...testCommandContractTests,
  ...repoTestIsolationGuardTests,
  // milestone 28 — console-app (story 02: one-line-installer)
  ...installerDetectTests,
  ...installerVerifyTests,
  ...installerPlaceTests,
  ...fsTempHygieneTests,
  ...buildSeaRecipeGuardsTests,
];
