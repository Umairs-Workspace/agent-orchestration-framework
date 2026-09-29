// The DOCUMENTED default cache-staleness window, in SECONDS — the one number `src/`
// resolves when configuration says nothing, and the one that travels on the list envelope
// so `ui/` can carry no default and no literal of its own (ADR-006).
//
// 300s (5 minutes) rather than the presence window's 90s, because the two answer different
// questions over different cadences: presence asks "is this node alive right now" against a
// heartbeat measured in seconds, while cache freshness asks "how old is the COPY I am
// reading" — refreshed by the worker's stream-sync tick and the control's publish tick, and
// perfectly normal to sit minutes old on a settled item. A window tuned to the heartbeat
// would paint healthy settled work degraded, which is precisely the over-alarm this
// milestone exists to avoid.
export const DEFAULT_CACHE_STALENESS_SECONDS = 300;

// resolveCacheStalenessSeconds(config) — the configured window, in SECONDS, read off
// `config.mesh.cache.stalenessSeconds` through the raw optional-chain idiom (NOT
// config-editor.mjs — its whitelist would drop an unknown mesh block on rewrite, the m22
// story-01 lesson). The DISCIPLINE is `resolveStalenessSeconds`' verbatim (mesh-presence.mjs
// :418-424): an absent / non-number / non-finite / negative value falls back to the single
// documented default, and ZERO is a valid — if aggressive — threshold that is HONOURED.
// Only a meaningless value falls back.
export function resolveCacheStalenessSeconds(config) {
  const configured = config?.mesh?.cache?.stalenessSeconds;
  if (typeof configured === "number" && Number.isFinite(configured) && configured >= 0) {
    return configured;
  }
  return DEFAULT_CACHE_STALENESS_SECONDS;
}

