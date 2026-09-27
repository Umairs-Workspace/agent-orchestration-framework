// THE NOTIFY SUITES — this directory's index, and the ONE place its membership is written down
// (119/03, ADR-010). Membership is IMPORTED AND SPREAD, never derived: no `readdir` decides what
// belongs here.
//
// milestone 131 / story 02 — the notifier (ADR-005, ADR-006 §1). The cases are placed by subject:
// the one formatter (task 01), the Discord renderer (task 04), and the family's registration, the
// `work.notify` block, the envelope, the delivery and the accept site (tasks 00, 02, 03, 05, 06).
//
// milestone 131 / story 08 — `aof messaging` (ADR-005 §1, as amended at 131/08): the verbs, the
// machine-wide webhook store and the notifier reading it at the point of send.
import { notifyFormTests } from "./notify-form.test.mjs";
import { notifyDiscordTests } from "./notify-discord.test.mjs";
import { notifyChannelsTests } from "./notify-channels.test.mjs";
import { notifyMessagingTests } from "./notify-messaging.test.mjs";

export const tests = [
  ...notifyFormTests,
  ...notifyDiscordTests,
  ...notifyChannelsTests,
  ...notifyMessagingTests,
];
