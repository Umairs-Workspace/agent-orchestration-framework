// Core binds the sidecar writer to the package-owned apply algorithm.
import { createNotionApply } from '@aof/integration-notion/sync';
import { recordPageId } from './mapping.mjs';
export const { applyPlan } = createNotionApply({ recordPageId });
