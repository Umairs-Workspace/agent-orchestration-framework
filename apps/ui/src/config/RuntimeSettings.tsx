import { useEffect, useState } from "react";
import { isConfigPayload, loadScope } from "./config-load.mjs";

type Runtime = "claude" | "codex";
type Diagnostic = { path: string; message: string };
type Entry = { model: string | null; effort: string | null; modelSource: string | null; effortSource: string | null };
type Execution = { runtime: Runtime; runtimeSource: string; phases: Record<string, Entry>; roles: Record<string, Entry>; diagnostics?: Diagnostic[] };
type Scoped = { session?: { models?: Record<string, string>; effort?: Record<string, string> }; models?: Record<string, string>; effort?: Record<string, string> };
type Settings = { runtime: Runtime | null; runtimes: Partial<Record<Runtime, Scoped>> };
type Payload = { executionSettings: Settings; execution: Execution | null; executionByRuntime: Partial<Record<Runtime, { execution: Execution | null; diagnostics: Diagnostic[] }>>; assetRuntimes: string[]; diagnostics: Diagnostic[] };
const phases = ["refine", "continue", "verify"];
const names = { claude: "Claude Code", codex: "Codex" };
const control = "min-w-0 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50";
const action = "rounded-md border border-border bg-primary px-4 py-2 text-sm text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50";

function checkedExecutionPayload(value: unknown): Payload {
  const payload = value as Payload | null;
  if (!isConfigPayload(value) || !payload?.executionSettings || typeof payload.executionSettings !== "object" || Array.isArray(payload.executionSettings) || !payload.executionByRuntime || !Array.isArray(payload.assetRuntimes) || !Array.isArray(payload.diagnostics)) {
    throw new Error("This configuration server does not provide execution settings. Update AOF or retry.");
  }
  return payload;
}

// Owns only project execution configuration. The server supplies all effective values
// and provenance; this component never derives a second runtime/model precedence rule.
export function RuntimeSettings({ scope = "project" }: { scope?: "project" | "global" }) {
  const [data, setData] = useState<Payload | null>(null);
  const [draft, setDraft] = useState<Settings>({ runtime: null, runtimes: {} });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [errors, setErrors] = useState<Diagnostic[]>([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let active = true;
    if (scope === "global") return () => { active = false; };
    setLoading(true);
    setLoadError("");
    loadScope(fetch, "project").then(value => {
      if (!active) return;
      const payload = checkedExecutionPayload(value);
      setData(payload);
      setDraft(structuredClone(payload.executionSettings));
      setErrors(payload.diagnostics.filter(value => value.path.startsWith("work.")));
    }).catch(error => {
      if (active) setLoadError(error instanceof Error ? error.message : "Could not load execution settings.");
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [scope, retry]);

  if (scope === "global") return <section className="p-5"><h2 className="text-xl font-semibold">Project execution</h2><p>Execution settings are project-only. Select Project to edit them.</p></section>;
  if (loading) return <p role="status" className="p-5">Loading project execution settings…</p>;
  if (loadError || !data) return <section className="space-y-3 p-5"><p role="alert">{loadError || "Execution settings are unavailable."}</p><button className={action} onClick={() => setRetry(value => value + 1)}>Retry loading execution settings</button></section>;

  const runtime = draft.runtime ?? "claude";
  const scoped = draft.runtimes?.[runtime] ?? {};
  const preview = data.executionByRuntime?.[runtime]?.execution;
  const roleNames = [...new Set([...Object.keys(preview?.roles ?? {}), ...Object.keys(scoped.models ?? {}), ...Object.keys(scoped.effort ?? {})])];

  function change(key: string, part: "models" | "effort", value: string, phase: boolean) {
    setDraft(previous => {
      const current = previous.runtimes?.[runtime] ?? {};
      const map = { ...(phase ? current.session?.[part] : current[part]) };
      if (value.trim()) map[key] = value;
      else delete map[key];
      const next = phase ? { ...current, session: { ...current.session, [part]: map } } : { ...current, [part]: map };
      return { ...previous, runtimes: { ...previous.runtimes, [runtime]: next } };
    });
    setMessage("");
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setMessage("");
    setErrors([]);
    try {
      const response = await fetch("/api/config/sections", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ executionSettings: draft }) });
      const result = await response.json();
      if (!response.ok || result.ok === false) {
        setErrors(result.diagnostics ?? []);
        setMessage(result.error ?? "Could not save execution settings. Correct the fields or retry; your edits are retained.");
        return;
      }
      const payload = checkedExecutionPayload(result.config);
      setData(payload);
      setDraft(structuredClone(payload.executionSettings));
      setMessage("Saved execution settings. They apply to the next run.");
    } catch (error) {
      setMessage(`Could not save execution settings. Retry; your edits are retained. ${error instanceof Error ? error.message : ""}`);
    } finally { setSaving(false); }
  }

  function field(key: string, part: "models" | "effort", phase: boolean) {
    const path = `work.agents.runtimes.${runtime}.${phase ? "session." : ""}${part}.${key}`;
    const id = `execution-${runtime}-${phase ? "phase" : "role"}-${part}-${key}`;
    const error = errors.filter(value => value.path === path || path.startsWith(`${value.path}.`));
    const value = (phase ? scoped.session?.[part]?.[key] : scoped[part]?.[key]) ?? "";
    return <div key={part} className="min-w-0 space-y-1">
      <label htmlFor={id} className="text-sm font-medium">{key} {part === "models" ? "model" : "effort"}</label>
      <input id={id} className={control} value={value} placeholder="Inherited" disabled={saving} onChange={event => change(key, part, event.target.value, phase)} aria-invalid={error.length ? true : undefined} aria-describedby={error.length ? `${id}-error` : undefined} />
      {error.length ? <p id={`${id}-error`} role="alert" className="break-words text-sm text-accent">{error.map(value => value.message).join(" ")}</p> : null}
    </div>;
  }

  function resolved(label: string, entry: Entry) {
    return <div key={label} className="min-w-0 rounded-md border border-border p-3 text-sm">
      <h4 className="font-medium">{label}</h4>
      <p className="break-words">Model: {entry.model ?? "Inherited runtime model"} · source: {entry.modelSource ?? "runtime default"}</p>
      <p className="break-words">Effort: {entry.effort ?? "Inherited session effort"} · source: {entry.effortSource ?? "runtime default"}</p>
    </div>;
  }

  const runtimeErrors = errors.filter(value => value.path === "work.loop.runtime");
  return <section className="mx-auto max-w-5xl p-5">
    <form onSubmit={save} className="min-w-0 space-y-5" aria-label="Project execution settings">
      <div><h2 className="text-2xl font-semibold">Project execution</h2><p className="text-sm text-muted-foreground">Choose the assistant for the next AOF run. Saving changes configuration only.</p></div>
      <p className="break-words text-sm">Installed asset runtimes: {data.assetRuntimes.length ? data.assetRuntimes.join(", ") : "None recorded"}. Asset targets and delegation are configured separately.</p>
      <div className="space-y-2"><label htmlFor="execution-runtime" className="text-sm font-medium">Default assistant</label>
        <select id="execution-runtime" className={control} value={draft.runtime ?? ""} disabled={saving} onChange={event => { setDraft({ ...draft, runtime: (event.target.value || null) as Runtime | null }); setMessage(""); }} aria-invalid={runtimeErrors.length ? true : undefined} aria-describedby={runtimeErrors.length ? "execution-runtime-error" : undefined}>
          <option value="">Inherited default (Claude Code)</option><option value="claude">Claude Code</option><option value="codex">Codex</option>
        </select>
        {runtimeErrors.length ? <p id="execution-runtime-error" role="alert">{runtimeErrors.map(value => value.message).join(" ")}</p> : null}
      </div>
      <fieldset disabled={saving} className="min-w-0 space-y-3"><legend className="font-semibold">{names[runtime]} phase settings</legend><p className="text-sm text-muted-foreground">Leave fields empty to inherit. Other assistant settings are preserved.</p>
        {phases.map(phase => <div key={phase} className="grid min-w-0 gap-3 rounded-md border border-border p-3 md:grid-cols-2">{field(phase, "models", true)}{field(phase, "effort", true)}</div>)}
      </fieldset>
      <details className="min-w-0 rounded-md border border-border p-3"><summary className="cursor-pointer font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Role overrides</summary><div className="mt-3 space-y-3">{roleNames.map(role => <div key={role} className="grid min-w-0 gap-3 md:grid-cols-2">{field(role, "models", false)}{field(role, "effort", false)}</div>)}</div></details>
      <section className="min-w-0 space-y-3" aria-label="Saved resolved choices"><h3 className="font-semibold">Saved resolved choices</h3><p className="text-sm text-muted-foreground">Preview for {names[runtime]} from the last saved configuration. Save edits to refresh.</p>
        <p className="break-words text-sm">Primary execution assistant: {data.execution ? names[data.execution.runtime] : "Unavailable"} · source: {data.execution?.runtimeSource ?? "invalid configuration"}</p>
        <div className="grid min-w-0 gap-3 md:grid-cols-2">{Object.entries(preview?.phases ?? {}).map(([name, entry]) => resolved(name, entry))}{Object.entries(preview?.roles ?? {}).map(([name, entry]) => resolved(name, entry))}</div>
        {(preview?.diagnostics ?? []).map(value => <p key={value.path} className="break-words text-sm text-muted-foreground">{value.message}</p>)}
      </section>
      {errors.length ? <div role="alert" className="space-y-1 text-sm text-accent">{errors.map((value, index) => <p key={index} className="break-words">{value.path}: {value.message}</p>)}</div> : null}
      {message ? <p role="status" className="break-words rounded-md border border-border p-3 text-sm">{message}</p> : null}
      <button className={action} type="submit" disabled={saving}>{saving ? "Saving execution settings…" : "Save execution settings"}</button>
    </form>
  </section>;
}
