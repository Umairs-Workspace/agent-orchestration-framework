// THE DISCORD SUITES — this directory's index, and the ONE place its membership is written down
// (119/03, ADR-010). Membership is IMPORTED AND SPREAD, never derived: no `readdir` decides what
// belongs here.
//
// milestone 131 / story 10 — the bot's inbound half (ADR-008): the family founded and the bot run on
// the control (task 00), the gateway connection (task 01) and the answer by reply (task 03). The
// shared fakes live in `./discord-fixture.mjs`.
//
// milestone 131 / story 11 — the slash commands (ADR-009): the table and its registration, the
// deferral and the allowlist, the two views, `/loop stop` and `/loop resume` (tasks 00 to 04).
import { discordBotTests } from "./discord-bot.test.mjs";
import { discordCommandsTests } from "./discord-commands.test.mjs";
import { discordGatewayTests } from "./discord-gateway.test.mjs";
import { discordRepliesTests } from "./discord-replies.test.mjs";

export const tests = [
  ...discordBotTests,
  ...discordCommandsTests,
  ...discordGatewayTests,
  ...discordRepliesTests,
];
