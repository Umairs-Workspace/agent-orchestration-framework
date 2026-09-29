// Transitional core composition for mesh-owned relay services.
import { createTerminalInput } from "@aof/mesh/terminal-input";
import { TERMINAL_INPUT_KIND, TERMINAL_RESUME_KIND } from "./terminal-relay-bridge.mjs";
import { reportDegrade } from "../degrade.mjs";

export const { createTerminalInputRouter } = createTerminalInput({ TERMINAL_INPUT_KIND, TERMINAL_RESUME_KIND, reportDegrade });
