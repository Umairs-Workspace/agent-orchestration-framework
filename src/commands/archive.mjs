// Transitional core composition for work-owned archive commands.
import { createArchiveCommand } from "@aof/work/commands/archive";
import { transitionStreamArchived } from "../effects/stream-transitions.mjs";

export const { ARCHIVE_FLAGS, archiveCommand, renderArchive, runArchive } = createArchiveCommand({ transitionStreamArchived });
