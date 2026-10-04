import { terminalCollapseIsNotHideTests } from "./terminal-collapse-is-not-hide.suite.mjs";
import { terminalControlBothSourcesTests } from "./terminal-control-both-sources.suite.mjs";
import { terminalCoreGeometryTests } from "./terminal-core-geometry.suite.mjs";
import { terminalCoreInputPolicyTests } from "./terminal-core-input-policy.suite.mjs";
import { terminalCorePaneIdentityAndClampTests } from "./terminal-core-pane-identity-and-clamp.suite.mjs";
import { terminalCoreSocketUrlTests } from "./terminal-core-socket-url.suite.mjs";
import { terminalCoreSourceTableTests } from "./terminal-core-source-table.suite.mjs";
import { terminalCoreStateRampTests } from "./terminal-core-state-ramp.suite.mjs";
import { terminalDockTests } from "./terminal-dock.suite.mjs";
import { terminalFullscreenAdoptsLiveNodeTests } from "./terminal-fullscreen-adopts-live-node.suite.mjs";
import { terminalGridPaneHostTests } from "./terminal-grid-pane-host.suite.mjs";
import { terminalOneImplementationTests } from "./terminal-one-implementation.suite.mjs";
import { terminalUnavailablePaneTests } from "./terminal-unavailable-pane.suite.mjs";
import { appRoutesTests } from "./app-routes.suite.mjs";
import { boardDiagramsTests } from "./board-diagrams.suite.mjs";
import { boardRuleGroupsTests } from "./board-rule-groups.suite.mjs";
import { boardRunsPureTests } from "./board-runs-pure.suite.mjs";
import { fleetAssignmentChipTests } from "./fleet-assignment-chip.suite.mjs";
import { homeFeedAxisTests } from "./home-feed-axis.suite.mjs";
import { homeLayoutFilterTests } from "./home-layout-filter.suite.mjs";
import { homeSessionLauncherPickerTests } from "./home-session-launcher.suite.mjs";
import { homeSessionMountTests } from "./home-session-mount.suite.mjs";
import { terminalControlHeaderYieldTests } from "./terminal-control-header-yield.suite.mjs";
import { terminalControlOpensItsSocketTests } from "./terminal-control-opens-its-socket.suite.mjs";
import { terminalHarnessDrivesAGridTests } from "./terminal-harness-drives-a-grid.suite.mjs";
import { terminalHarnessShellFocusKeyboardTests } from "./terminal-harness-shell-focus-keyboard.suite.mjs";
import { homeSessionLauncherStateTests } from "./home-session-launcher-states.suite.mjs";
import { shellDockInsetAndClampTests } from "./shell-dock-inset-and-clamp.suite.mjs";
import { shellEntryPlanTests } from "./shell-entry-plan.suite.mjs";
import { shellNotFoundAndFullscreenTests } from "./shell-not-found-and-fullscreen.suite.mjs";
import { shellSurfaceContainmentTests } from "./shell-surface-containment.suite.mjs";
import { terminalsHomeGridTests } from "./terminals-home-grid.suite.mjs";
import { terminalsHomePageStatesTests } from "./terminals-home-page-states.suite.mjs";
import { terminalsHomeRouteTests } from "./terminals-home-route.suite.mjs";

export const tests = [
  ...terminalCollapseIsNotHideTests,
  ...terminalControlBothSourcesTests,
  ...terminalCoreGeometryTests,
  ...terminalCoreInputPolicyTests,
  ...terminalCorePaneIdentityAndClampTests,
  ...terminalCoreSocketUrlTests,
  ...terminalCoreSourceTableTests,
  ...terminalCoreStateRampTests,
  ...terminalDockTests,
  ...terminalFullscreenAdoptsLiveNodeTests,
  ...terminalGridPaneHostTests,
  ...terminalOneImplementationTests,
  ...terminalUnavailablePaneTests,
  ...appRoutesTests,
  ...boardDiagramsTests,
  ...boardRuleGroupsTests,
  ...boardRunsPureTests,
  ...fleetAssignmentChipTests,
  ...homeFeedAxisTests,
  ...homeLayoutFilterTests,
  ...homeSessionLauncherPickerTests,
  ...homeSessionMountTests,
  ...terminalControlHeaderYieldTests,
  ...terminalControlOpensItsSocketTests,
  ...terminalHarnessDrivesAGridTests,
  ...terminalHarnessShellFocusKeyboardTests,
  ...homeSessionLauncherStateTests,
  ...shellDockInsetAndClampTests,
  ...shellEntryPlanTests,
  ...shellNotFoundAndFullscreenTests,
  ...shellSurfaceContainmentTests,
  ...terminalsHomeGridTests,
  ...terminalsHomePageStatesTests,
  ...terminalsHomeRouteTests,
];
