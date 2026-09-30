// Core assembly: construct once per application; collaborators are supplied explicitly.
import { createTerminalProviders } from "@aof/execution/providers";

export function assembleTerminalProviders({ degradeServices }) {
  // Core composition; @aof/execution owns terminal services.

  const { reportDegrade } = degradeServices;

  const implementation = createTerminalProviders({ reportDegrade });
  const CliProvider = implementation.CliProvider;
  const PROVIDER_IDS = implementation.PROVIDER_IDS;
  const resolveProvider = implementation.resolveProvider;

  return { CliProvider, PROVIDER_IDS, resolveProvider };
}
