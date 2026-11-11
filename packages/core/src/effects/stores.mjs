// Application aggregation; each domain declares its own stores, and each registered integration its
// own through its contribution's `storeMetadata` (chore 176).
import { createStoreClassification } from "@aof/effects/stores";
import { TABLE_CLASSIFICATION as mesh } from "@aof/mesh/store-metadata";
import { TABLE_CLASSIFICATION as effects } from "@aof/effects/store-metadata";
import { FILE_STORE_CLASSIFICATION as execution } from "@aof/execution/store-metadata";
import { FILE_STORE_CLASSIFICATION as work } from "@aof/work/store-metadata";
import { INTEGRATIONS } from "../integrations.mjs";

const integrations = INTEGRATIONS.map((integration) => integration.storeMetadata ?? {});

export const { TABLE_CLASSIFICATION, FILE_STORE_CLASSIFICATION, tableClass, refRemapTables } =
  createStoreClassification({
    tables: Object.assign({ ...mesh, ...effects }, ...integrations.map((metadata) => metadata.tables ?? {})),
    fileStores: Object.assign({ ...execution, ...work }, ...integrations.map((metadata) => metadata.fileStores ?? {})),
  });
