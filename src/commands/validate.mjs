// Transitional core composition for work-owned validate commands.
import { createValidateCommand } from "@aof/work/commands/validate";
import { declaredAdrsInStory, extractAdrBlocks } from "../phase-brief.mjs";
import { readRenameMap } from "./doctor.mjs";
import { validateWork as validateCoreWork } from "../work.mjs";

export const { validateCommand, validateWork } = createValidateCommand({ declaredAdrsInStory, extractAdrBlocks, readRenameMap, validateCoreWork });
