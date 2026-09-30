// Core assembly: construct once per application; collaborators are supplied explicitly.
import { createValidateCommand } from "@aof/work/commands/validate";
import { declaredAdrsInStory, extractAdrBlocks } from "@aof/work/phase-brief";

export function assembleCommandsValidate({ commandsDoctorServices, workServices }) {
  // Core composition for work-owned validate commands.

  const { readRenameMap } = commandsDoctorServices;
  const { validateWork: validateCoreWork } = workServices;

  const { validateCommand, validateWork } = createValidateCommand({ declaredAdrsInStory, extractAdrBlocks, readRenameMap, validateCoreWork });

  return { validateCommand, validateWork };
}
