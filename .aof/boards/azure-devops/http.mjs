import { execFile } from "node:child_process";
import { promisify } from "node:util";

const AZURE_DEVOPS_RESOURCE = "499b84ac-1321-427f-aa17-267ca6975798";
const apiVersion = "7.1";

export class AzureBoardError extends Error {
  constructor(message, { code, status, uncertain = false } = {}) {
    super(message);
    this.code = code;
    this.status = status;
    this.uncertain = uncertain;
  }
}

export function createAzureHttp({ organization, project }, {
  request = globalThis.fetch, runAz = promisify(execFile), now = Date.now,
} = {}) {
  const orgUrl = new URL(`https://dev.azure.com/${encodeURIComponent(organization)}/`);
  const projectUrl = new URL(encodeURIComponent(project) + "/", orgUrl);
  let token;
  let pending;
  async function acquire() {
    try {
      const { stdout } = await runAz("az", ["account", "get-access-token", "--resource", AZURE_DEVOPS_RESOURCE, "--output", "json"], { timeout: 15_000, windowsHide: true });
      const reply = JSON.parse(stdout);
      const expires = Number.isFinite(Number(reply.expires_on)) && reply.expires_on != null
        ? Number(reply.expires_on) * 1000 : Date.parse(reply.expiresOn);
      if (typeof reply.accessToken !== "string" || !reply.accessToken || !(expires > now())) throw new Error();
      return { value: reply.accessToken, expires };
    } catch {
      throw new AzureBoardError("Azure DevOps sign-in is unavailable. Run az login as the account executing AOF.", { code: "azure-board-auth", status: 401 });
    }
  }

  async function credentials() {
    if (token?.expires > now()) return token.value;
    pending ??= acquire().then(result => { token = result; }).finally(() => { pending = null; });
    await pending;
    return token.value;
  }

  async function send(endpoint, { method = "GET", body, contentType = "application/json", scope = "project", query } = {}) {
    const url = new URL(endpoint, scope === "organization" ? orgUrl : projectUrl);
    if (url.origin !== orgUrl.origin || !url.pathname.startsWith(orgUrl.pathname)) {
      throw new AzureBoardError("Azure DevOps returned a URL outside the selected organization.", { code: "azure-board-url" });
    }
    for (const [key, value] of Object.entries(query ?? {})) if (value != null) url.searchParams.set(key, value);
    if (!url.searchParams.has("api-version")) url.searchParams.set("api-version", apiVersion);
    const credential = await credentials();
    let response;
    try {
      response = await request(url, {
        method,
        redirect: "error",
        signal: AbortSignal.timeout(30_000),
        headers: {
          Authorization: `Bearer ${credential}`,
          "X-VSS-ForceMsaPassThrough": "true",
          ...(body != null && { "Content-Type": contentType }),
        },
        ...(body != null && { body: contentType === "application/octet-stream" ? body : JSON.stringify(body) }),
      });
    } catch {
      throw new AzureBoardError(`Azure DevOps ${method} request failed before a response was received.`, { code: "azure-board-transport", uncertain: true });
    }
    if (!response.ok) {
      if (response.status === 401 && token?.value === credential) token = undefined;
      throw new AzureBoardError(`Azure DevOps ${method} returned HTTP ${response.status}.`, {
        code: response.status === 412 ? "azure-board-stale" : "azure-board-http",
        status: response.status,
        uncertain: response.status >= 500,
      });
    }
    try {
      return await response.json();
    } catch {
      throw new AzureBoardError("Azure DevOps returned an unreadable response.", { code: "azure-board-response", uncertain: true });
    }
  }

  return { send, itemUrl: id => new URL(`_apis/wit/workitems/${id}`, orgUrl).href };
}
