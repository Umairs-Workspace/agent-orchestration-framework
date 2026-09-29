// Transitional core composition for mesh-owned coordination.
import { createMeshParkResumeServices } from "@aof/mesh/park-resume";
import { answerRunAsk, heartbeat, openRunAsk } from "../run-store.mjs";
import { readAskQuestion } from "../work/observe.mjs";
import {
  claimAssignmentParkResume,
  completeAssignmentParkResume,
  reportAssignmentSettled,
  reportTerminalResumeRefused,
} from "../effects/assignment-transitions.mjs";
import { transitionRunComplete } from "../effects/run-transitions.mjs";
import { reportDegrade } from "../degrade.mjs";

export const { createMeshParkResume, directivePhase, readWorkerAsk, announceWorkerAsk } = createMeshParkResumeServices({ answerRunAsk, heartbeat, openRunAsk, readAskQuestion, claimAssignmentParkResume, completeAssignmentParkResume, reportAssignmentSettled, reportTerminalResumeRefused, transitionRunComplete, reportDegrade, loadPresence: () => import("./presence.mjs"), loadWork: () => import("../work.mjs"), loadNotifications: () => import("../notify/notify.mjs") });
