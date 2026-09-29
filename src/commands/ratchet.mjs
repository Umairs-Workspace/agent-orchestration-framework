// Transitional core composition for work-owned commands/ratchet.
import { createRatchetCommand } from "@aof/work/commands/ratchet";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { requireLocalCheckout, resolveItemExact } from "./resolve.mjs";
const execFileAsync = promisify(execFile);

export const { observeRatchet, ratchetCommand, resolveRatchetBase } = createRatchetCommand({ requireLocalCheckout, resolveItemExact, execFileAsync });
