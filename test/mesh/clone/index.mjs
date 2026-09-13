// THE MESH/CLONE SUITES — this directory's index, and the ONE place its membership is
// written down (119/03, ADR-010). The registry names directories; a directory names its own
// suites. A new suite here is one import and one spread IN THIS FILE, and `scripts/test.mjs`
// is unchanged by its arrival.
//
// Membership is IMPORTED AND SPREAD, never derived: no `readdir` decides what belongs here.
// `registrationDecision` (`src/work-audit/census.mjs`) stays the single decider of which file
// contributed which entries, and this file is one of its inputs rather than a second answer.
// Every binding the registry spread for a suite is spread here — including both of the two
// that four suites in this tree export, which a one-binding-per-file index would halve.

// milestone 38 / story 01 — worker-repo-checkout (tasks 00-03 traceability modules)
import { meshWorkerCloneLocationConfigTests } from "./mesh-worker-clone-location-config.test.mjs";
import { meshWorkerCloneScopedCheckoutTests } from "./mesh-worker-clone-scoped-checkout.test.mjs";
import { meshWorkerCloneRegisterFallthroughTests } from "./mesh-worker-clone-register-fallthrough.test.mjs";
import { meshWorkerCloneCredentialNotPersistedTests } from "./mesh-worker-clone-credential-not-persisted.test.mjs";
// milestone 38 / story 01 task 05 (ADR-009, finding F12) — the clone credential is
// PULLED by the worker at the moment it hits a clone miss, over the already-open
// stream, so a private repo can actually be cloned in production.
import { meshWorkerCloneCredentialPullTests } from "./mesh-worker-clone-credential-pull.test.mjs";
// ADR-010 Gap A extended (review fix, live soak 2026-07-18) — the SAME PULL
// mechanism, mirrored for a workspace's cloneUrl: a worker's own local registry
// copy can never carry a row for a workspace it has never itself published
// (confirmed live against the real two-machine soak), so the worker asks the
// control node directly on a clone miss, exactly like the credential above.
import { meshWorkerCloneUrlPullTests } from "./mesh-worker-clone-url-pull.test.mjs";
// milestone 38 / story 02 — clone-credential-mint (ADR-010): the config-selected
// mint PROVIDER (env-token | github-app) at the ADR-009 mintCloneCredential seam.
import { meshCloneCredentialProviderConfigTests } from "./mesh-clone-credential-provider-config.test.mjs";
import { meshCloneCredentialGithubAppMintTests } from "./mesh-clone-credential-github-app-mint.test.mjs";
import { meshCloneCredentialAppKeyNotRelayedTests } from "./mesh-clone-credential-app-key-not-relayed.test.mjs";
import { meshCloneCredentialAskpassPromptAwareTests } from "./mesh-clone-credential-askpass-prompt-aware.test.mjs";
import { meshCloneCredentialMintFailureLoudTests } from "./mesh-clone-credential-mint-failure-loud.test.mjs";
// milestone 38 / story 03 — per-org credential-provider scoping (ADR-011): the App
// identity resolves PER-ASSIGNED-workspace (task 00), cross-org key isolation (task
// 01), and the code-enforced default private-key directory (task 02).
import { meshCloneCredentialAppIdentityPerWorkspaceTests } from "./mesh-clone-credential-app-identity-per-workspace.test.mjs";
import { meshCloneCredentialCrossOrgIsolationTests } from "./mesh-clone-credential-cross-org-isolation.test.mjs";
import { meshCloneCredentialAppKeyDefaultDirTests } from "./mesh-clone-credential-app-key-default-dir.test.mjs";
import { meshCloneCredentialPushMintScopedTests } from "./mesh-clone-credential-push-mint-scoped.test.mjs";
// m42 wave (b) / item 4 — the clone-time identity pin: a fresh checkout answers the
// fleet's canonical id on every machine.
import { meshCloneIdentityPinTests } from "./mesh-clone-identity-pin.test.mjs";

export const tests = [
  ...meshWorkerCloneLocationConfigTests,
  ...meshWorkerCloneScopedCheckoutTests,
  ...meshWorkerCloneRegisterFallthroughTests,
  ...meshWorkerCloneCredentialNotPersistedTests,
  ...meshWorkerCloneCredentialPullTests,
  ...meshWorkerCloneUrlPullTests,
  // milestone 38 / story 02 — clone-credential-mint (ADR-010, tasks 00-04 traceability
  // modules + the F5/F6/F7 fitness functions armed at build)
  ...meshCloneCredentialProviderConfigTests,
  ...meshCloneCredentialGithubAppMintTests,
  ...meshCloneCredentialAppKeyNotRelayedTests,
  ...meshCloneCredentialAskpassPromptAwareTests,
  ...meshCloneCredentialMintFailureLoudTests,
  // milestone 38 / story 03 — per-org credential-provider scoping (ADR-011, tasks
  // 00-02 traceability modules + the acd-cross-org-key-isolation fitness function)
  ...meshCloneCredentialAppIdentityPerWorkspaceTests,
  ...meshCloneCredentialCrossOrgIsolationTests,
  ...meshCloneCredentialAppKeyDefaultDirTests,
  ...meshCloneCredentialPushMintScopedTests,
  ...meshCloneIdentityPinTests,
];
