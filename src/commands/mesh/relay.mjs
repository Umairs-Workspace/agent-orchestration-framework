// mesh:relay — the relay-mode FACE / probe command (milestone 23 / story 01, ADR-001).
// Thin over src/mesh/relay.mjs. `aof mesh relay` is a long-lived serve verb (it stands up
// the stateless ws@8 broker in `relay` mode), but its registered command run is the
// NON-BLOCKING status PROBE: it reports the configured control-node, the peer-push url,
// and whether THIS node is nominated — WITHOUT calling listen()/blocking. This keeps the
// acd-mesh-command-cli-bijection gate honest (`aof mesh relay --json` runs clean +
// parseable + RETURNS, never hanging on a listen). The actual long-lived serve is
// serveRelay/relayMode, invoked by the serve launcher, not by this one-shot probe.
//
// The relay imports the record side NOTHING (file-disjoint from story 00): this command
// is thin over src/mesh/relay.mjs's relayStatus probe, which reads config via the raw
// optional-chain and stands up no listener.
//
// WHY IT IS REGISTERED — the comment that stood above this module's entry in `src/command-core.mjs`,
// moved here unedited (119/02, FF-11908: the registry cites, it does not explain).
//
//   milestone 23 — control-node-relay (story 01: thin relay — mesh:relay registers into
//   the SAME core; ADR-001). Thin over story 01's src/mesh/relay.mjs: `aof mesh relay` is
//   the relay-mode serve verb, but the registered run is the NON-BLOCKING status probe
//   (the configured control-node + url + nominated-or-not) so the bijection gate runs clean
//   + returns (the actual long-lived serve is serveRelay/relayMode, the launcher's job).
//   The relay carries OPAQUE envelopes and imports the record side NOTHING (file-disjoint
//   from story 00). Additive — one import + one COMMANDS entry. It takes the `mesh:` prefix,
//   so it is EXCLUDED from the `work:`-filtered bijection but RIDES the existing
//   acd-mesh-command-cli-bijection gate (now covering identity+status+sync+heartbeat+relay).
import { relayStatus } from "../../mesh/relay.mjs";
import { MESH_WORKSPACE_FLAG, guardMeshPositionals } from "./face-shared.mjs";

export const meshRelayCommand = {
  id: "mesh:relay",
  input: {
    type: "object",
    // No input today — the probe reads config.mesh.relay.* off the workspace. Additive-
    // friendly: a future `--port` for the serve launcher appends here.
    properties: {},
    additionalProperties: false,
  },

  async run(_input, ctx) {
    const ws = ctx.workspace;
    const config = ws.config ?? {};
    // The NON-BLOCKING probe (no listen, no port taken): the configured control-node +
    // url + whether this node is nominated. The serve launcher (the long-lived face) is
    // what calls relayMode/serveRelay; this registered run never blocks.
    return relayStatus(config);
  },

  cli: {
    // m42 wave (d) leg d1 (wave 3) — routed through the registry-derived table +
    // the ONE generic face; meshVerbCli's cli.mjs ladder branch is deleted.
    route: ["mesh", "relay"],
    spec: {
      usage: "aof mesh relay [--workspace <path|id>] [--json]",
      flags: { ...MESH_WORKSPACE_FLAG },
    },

    // `aof mesh relay` — no positional (the role is config-driven, not a named ref).
    argv: (positionals) => {
      guardMeshPositionals("relay", positionals);
      return {};
    },

    // The status line: who hosts the relay + whether this node is it.
    render(result) {
      if (result == null) return "No relay status.";
      const who = result.controlNode ?? "(unnominated)";
      const here = result.nominated ? " — this node is the control node" : "";
      const at = result.url ? ` at ${result.url}` : "";
      return `Relay control node: ${who}${at}${here}`;
    },

    // The --json face is the bare status probe (the non-blocking bijection-probe shape).
    json: (result) => result,
  },
};
