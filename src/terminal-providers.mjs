// Compatibility composition; @aof/execution owns terminal services.
import { createTerminalProviders } from "@aof/execution/providers";
import { reportDegrade } from "./degrade.mjs";

const implementation = createTerminalProviders({ reportDegrade });
export const CliProvider = implementation.CliProvider;
export const PROVIDER_IDS = implementation.PROVIDER_IDS;
export const resolveProvider = implementation.resolveProvider;
