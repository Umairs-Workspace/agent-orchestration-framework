// Core assembly: construct once per application; collaborators are supplied explicitly.
import { createArchiveCommand } from "@aof/work/commands/archive";

export function assembleCommandsArchive({ effectsStreamTransitionsServices }) {
  // Core composition for work-owned archive commands.

  const { transitionStreamArchived } = effectsStreamTransitionsServices;

  const { ARCHIVE_FLAGS, archiveCommand, renderArchive, runArchive } = createArchiveCommand({ transitionStreamArchived });

  return { ARCHIVE_FLAGS, archiveCommand, renderArchive, runArchive };
}
