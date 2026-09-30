// Application aggregation; each domain declares its own stores.
import { createStoreClassification } from "@aof/effects/stores";
import { TABLE_CLASSIFICATION as mesh } from "@aof/mesh/store-metadata";
import { TABLE_CLASSIFICATION as effects } from "@aof/effects/store-metadata";
import { FILE_STORE_CLASSIFICATION as execution } from "@aof/execution/store-metadata";
import { FILE_STORE_CLASSIFICATION as work } from "@aof/work/store-metadata";
import { FILE_STORE_CLASSIFICATION as notion } from "@aof/integration-notion/store-metadata";

export const { TABLE_CLASSIFICATION, FILE_STORE_CLASSIFICATION, tableClass, refRemapTables } =
  createStoreClassification({ tables: { ...mesh, ...effects }, fileStores: { ...execution, ...work, ...notion } });
