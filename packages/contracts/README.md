# @aof/contracts

Dependency-free command composition shared by core and feature packages. This package
does not load the assembled CLI, start services, read configuration, or access the filesystem.

The public entry point is `@aof/contracts/commands`:

- `createCommandRegistry(contributions)` composes ordered `{ name, commands }` groups.
  It rejects duplicate IDs, duplicate routes, and malformed descriptors before invocation.
- The registry exposes `getCommand`, `hasCommand`, `listCommands`, `ownerOf`, and `invoke`.
  Descriptors and invocation results retain their identity; listing returns a fresh array.
- `deriveRouteTable(commands)` and `resolveRoute(argv, commands)` expose the existing
  CLI routing rules, including longest-prefix matching and untouched remaining arguments.

Each feature owns its descriptors: `{ id, input, run, cli }`. The optional CLI adapter contains
`route`, `spec` (usage and flags), `argv`, and presentation functions. Core owns argument parsing,
context construction, invocation, and rendering. Required work commands remain in the base AOF
composition alongside its skills and assets.

```js
import { createCommandRegistry } from '@aof/contracts/commands';

const registry = createCommandRegistry([
  { name: '@aof/mesh', commands: [meshStatusCommand, meshAssignCommand] },
  { name: '@aof/messaging', commands: [messagingStatusCommand] },
]);
```

Contributions are explicit imports. There is no package scanning, automatic plugin loading, or
implicit command override. A feature can add a route beneath a shared namespace and own that
route's arguments/options. Extending another feature's existing command or merging its flags
requires a separate explicit contract; this initial API does not silently merge descriptors.

Run `yarn workspace @aof/contracts test`. The root command contract suite also runs these tests.
