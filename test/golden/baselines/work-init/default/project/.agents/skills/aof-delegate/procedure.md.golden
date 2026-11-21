# Codex runtime and optional delegation

Keep the primary runtime distinct from optional cross-assistant delegation. This session remains Codex when delegation is off or on; native build/review roles stay Codex. Work mode selects solo versus supported native orchestration, not another assistant. Cross-assistant work requires a separate explicit request, enabled delegation and a supported provider. Never launch another Codex CLI just to delegate from Codex. Runtime-scoped session/role model and effort settings are separate from the existing Claude orchestrator-model door.

Read the current .aof configuration and report primary runtime, work.agents.mode,
work.loop.runtime and work.agents.delegation separately. If asked to toggle delegation, use
aof work delegation on/off, or aof work delegation --show for inspection. It changes optional
cross-assistant intent, not this active session or the primary runtime. The existing
aof work orchestrator door selects a Claude model only; do not use it to configure Codex.
Use runtime-scoped model/effort configuration for future driven Codex sessions and native roles;
validate advertised capabilities before launch. Refresh generated assets through aof work update
and inspect conflicts; never force-adopt drift or grant trust. Report what changed and that an
already-running session did not change runtime or reasoning effort. No native role is launched
merely because the toggle changed.