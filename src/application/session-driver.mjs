import { assembleClaudeTrust } from './bindings/claude-trust.mjs';
import { assembleWorkObserve } from './bindings/work/observe.mjs';
import { assembleTerminalProviders } from './bindings/terminal-providers.mjs';
import { assembleTerminalScreen } from './bindings/terminal/screen.mjs';
import { assembleTerminalSessionScreen } from './bindings/terminal/session-screen.mjs';
import { assembleAgentSessionDriver } from './bindings/agent-session-driver.mjs';

export function createSessionDriverServices({ degrade }) {

  const claudeTrust = assembleClaudeTrust({ degradeServices: degrade });
  const workObserve = assembleWorkObserve({ degradeServices: degrade });
  const terminalProviders = assembleTerminalProviders({ degradeServices: degrade });
  const terminalScreen = assembleTerminalScreen({ degradeServices: degrade });
  const terminalSessionScreen = assembleTerminalSessionScreen({ degradeServices: degrade, terminalScreenServices: terminalScreen });
  const agentSessionDriver = assembleAgentSessionDriver({ claudeTrustServices: claudeTrust, workObserveServices: workObserve, terminalProvidersServices: terminalProviders, degradeServices: degrade, terminalSessionScreenServices: terminalSessionScreen });
  return { claudeTrust, workObserve, terminalProviders, terminalScreen, terminalSessionScreen, agentSessionDriver };
}
