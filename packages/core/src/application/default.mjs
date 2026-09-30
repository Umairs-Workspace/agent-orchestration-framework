import { assembleApplication } from './assemble.mjs';
import { defaultBase } from './default-base.mjs';
export const defaultApplication = assembleApplication({ base: defaultBase }).application;
