// Shared command composition only: no core, filesystem, providers, or application startup.
// Contributions retain the existing { id, input, run, cli } descriptor. Each feature owns
// cli.route, cli.spec (including flags), argument conversion, and presentation.
export function createCommandRegistry(contributions) {
  if (!Array.isArray(contributions)) throw new TypeError('Command contributions must be an array.');
  const commands = new Map();
  const owners = new Map();
  for (const contribution of contributions) {
    if (!contribution || typeof contribution.name !== 'string' || !contribution.name.trim() ||
        !Array.isArray(contribution.commands)) {
      throw new TypeError('A command contribution needs a name and a commands array.');
    }
    // A package may contribute multiple ordered groups during incremental migration.
    for (const command of contribution.commands) {
      if (!command || typeof command.id !== 'string' || !command.id.trim() || typeof command.run !== 'function') {
        throw new TypeError(`Invalid command contributed by "${contribution.name}".`);
      }
      if (commands.has(command.id)) {
        throw new Error(`Command collision: "${command.id}" is claimed by both "${owners.get(command.id)}" and "${contribution.name}".`);
      }
      const route = command.cli?.route;
      if (route !== undefined && (!Array.isArray(route) || route.length === 0 ||
          route.some(word => typeof word !== 'string' || !word || /\s/.test(word) || word.startsWith('-')))) {
        throw new TypeError(`Invalid CLI route for "${command.id}" from "${contribution.name}".`);
      }
      commands.set(command.id, command);
      owners.set(command.id, contribution.name);
    }
  }
  deriveRouteTable([...commands.values()]);
  return Object.freeze({
    getCommand: id => commands.get(id),
    hasCommand: id => commands.has(id),
    listCommands: () => [...commands.values()],
    ownerOf: id => owners.get(id),
    async invoke(id, input, ctx) {
      const command = commands.get(id);
      if (!command) throw new Error(`Unknown command id "${id}".`);
      return await command.run(input, ctx);
    },
  });
}

export function deriveRouteTable(commands) {
  const table = new Map();
  for (const command of commands) {
    const route = command.cli?.route;
    if (!Array.isArray(route) || route.length === 0) continue;
    const key = route.join(' ');
    if (table.has(key)) {
      throw new Error(`Route collision: "${key}" is claimed by both "${table.get(key).id}" and "${command.id}".`);
    }
    table.set(key, command);
  }
  return table;
}

export function resolveRoute(argv, commands) {
  const table = deriveRouteTable(commands);
  if (table.size === 0) return null;
  let maxWords = 0;
  for (const key of table.keys()) maxWords = Math.max(maxWords, key.split(' ').length);
  const words = [];
  for (const token of argv) {
    if (typeof token !== 'string' || token.startsWith('--')) break;
    words.push(token);
    if (words.length >= maxWords) break;
  }
  for (let length = words.length; length > 0; length -= 1) {
    const command = table.get(words.slice(0, length).join(' '));
    if (command) return { command, rest: argv.slice(length) };
  }
  return null;
}
