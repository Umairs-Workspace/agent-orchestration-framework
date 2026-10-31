import { createRenumberCommand } from '@aof/work/commands/renumber';

export function assembleCommandsRenumber({ effectsStreamTransitionsServices, commandCoreServices }) {
  return createRenumberCommand({
    transitionStreamRenumbered: effectsStreamTransitionsServices.transitionStreamRenumbered,
    refreshMemory: async ctx => {
      const result = await commandCoreServices.invoke('work:memory', {verb:'ingest',only:null}, ctx);
      return commandCoreServices.getCommand('work:memory').cli.json(result);
    },
  });
}
