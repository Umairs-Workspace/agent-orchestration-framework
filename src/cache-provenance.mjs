// Compatibility facade: neutral wire facts and mesh freshness policy. Plan 06 removes it.
export { toWireProvenance, cacheFreshness } from "@aof/contracts/cache-provenance";
export { DEFAULT_CACHE_STALENESS_SECONDS, resolveCacheStalenessSeconds } from "@aof/mesh/cache-policy";
