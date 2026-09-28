// Compatibility composition; execution owns terminal/screen.
import { createScreenModel } from "@aof/execution/terminal/screen";
import { reportDegrade } from "../degrade.mjs";

const implementation = createScreenModel({ reportDegrade });
export const createScreen = implementation.createScreen;
