// Generic classification queries. The application composes domain-owned declarations.
export function createStoreClassification({ tables, fileStores }) {
  const TABLE_CLASSIFICATION = Object.freeze({ ...tables });
  const FILE_STORE_CLASSIFICATION = Object.freeze({ ...fileStores });
  function tableClass(table) { return TABLE_CLASSIFICATION[table]?.class ?? null; }
  function refRemapTables(locus) {
    return Object.entries(TABLE_CLASSIFICATION)
      .filter(([, entry]) => entry.refRemap?.locus === locus)
      .map(([table, entry]) => ({ table, column: entry.refRemap.column }));
  }
  return { TABLE_CLASSIFICATION, FILE_STORE_CLASSIFICATION, tableClass, refRemapTables };
}
