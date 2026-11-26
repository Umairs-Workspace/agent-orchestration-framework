import { resolveWorkItemStore } from "../store/work-item-store.mjs";

// The credential shapes a provider's message may carry: an authorization header, a bearer
// credential, a JSON token field and a bare JWT. None may leave this verb.
const CREDENTIALS = [
  [/authorization\s*[:=]\s*\S+(?:\s+\S+)?/giu, "authorization [redacted]"],
  [/bearer\s+[A-Za-z0-9._~+/=-]+/giu, "Bearer [redacted]"],
  [/("?(?:access_?token|accessToken|token)"?\s*[:=]\s*"?)[^"\s,}]+/giu, "$1[redacted]"],
  [/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/gu, "[redacted]"],
];

export function redactCredentials(text) {
  return CREDENTIALS.reduce((value, [pattern, replacement]) => value.replace(pattern, replacement), String(text ?? ""));
}

// Sign-in versus board access is read off the adapter's own answer, generically: an
// authentication code or a 401 is the account's sign-in; any other refusal is the board.
function stageOf(error) {
  return error?.status === 401 || /(?:^|-)auth(?:$|-)/u.test(String(error?.code ?? "")) ? "sign-in" : "board";
}

function failed(stage, error, manifest) {
  return {
    ok: false, stage, manifest,
    code: error?.code ?? null,
    ...(Number.isInteger(error?.status) ? { status: error.status } : {}),
    message: redactCredentials(error?.message ?? "unknown fault"),
  };
}

// Read-only: loads the selected definition and calls its optional access probe, in the
// environment this process runs in. A daemon preflight runs it in the daemon's.
export async function probeBoardAccess(input, { workspace }) {
  const store = resolveWorkItemStore(workspace);
  if (typeof store.boardCapabilities !== "function") return { ok: true, skipped: "local-file-mode" };
  const manifest = workspace.config?.work?.store?.manifest ?? null;
  let capabilities;
  try {
    capabilities = await store.boardCapabilities();
  } catch (error) {
    return failed("definition", error, manifest);
  }
  if (typeof capabilities.accessProbe !== "function") return { ok: true, skipped: "no-access-probe", manifest };
  try {
    await capabilities.accessProbe({});
  } catch (error) {
    return failed(stageOf(error), error, manifest);
  }
  return { ok: true, stage: "board", manifest };
}
