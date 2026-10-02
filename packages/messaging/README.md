# @aof/messaging

Owns notification formatting, Discord REST delivery, messaging credentials and reply indexes,
the Discord gateway/bot/reply handlers, and the five `aof messaging` commands. The package has no
imports of core, mesh, work-loop or another workspace's private source.

| Public API | Responsibility and application services |
| --- | --- |
| `form`, `discord` | Pure shared formatting, credential shape checks, invite URLs and injectable HTTP delivery. |
| `secret` | `createMessagingSecrets({ defaultGlobalWorkspaceDir })` owns credential persistence under the supplied home. |
| `ask-messages` | `createAskMessages({ messagingStoreDir })` owns persisted reply routing and expiry. |
| `notify` | `createNotifier` receives degradation reporting, workspace identity, credential reads and reply indexing. |
| `gateway` | `createDiscordGateway({ reportDegrade })` supplies the gateway state machine; socket/clock/transport options remain injectable. |
| `discord-commands` | `createDiscordCommands` receives identity, reply lookup, loop states, loop lookup and degradation reporting. |
| `replies` | `createDiscordReplies` receives ask readers and identity; replies invoke the supplied command service. |
| `bot` | `createDiscordBot` receives gateway/handler services, command invocation, workspace loading and mesh-member/worktree lookup. |
| `commands` | `createMessagingCommands` receives notifier, credential and configuration services and returns the five descriptors and `messagingContribution`. |

Constructing factories does no I/O. Starting a gateway/bot, invoking a command or sending a notification
performs the requested work. The bot accepts an asynchronous worktree-folding service so core can keep
its configured mesh/work services deferred. Only the interactive credential prompt loads
`@inquirer/prompts`; `ws` belongs to the gateway implementation.

Core currently supplies configured instances through compatibility modules in root `src/`. These
adapters will be removed when application composition and the physical core layout are finalized.
UI consumers retain the shared formatter and its declaration file through the compatibility export.

Run `yarn workspace @aof/messaging test` for isolated contracts. Root notification, Discord, CLI and
architecture suites cover behavior through the compatibility API, including secret handling, request
authorization, reply allowlists, gateway reconnects and command routing. Tests use synthetic credentials
and fake transports; they do not send Discord messages.
