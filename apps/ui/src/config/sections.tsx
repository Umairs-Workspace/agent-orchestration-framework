import type * as React from "react";
import { Brain, Code2, FileText, Library, Settings2 } from "lucide-react";

// The config editor's JSON-node sections — each one node of the config, edited in place by
// `SectionEditor`. Moved out of App.tsx at `aof:verify 180` (180/F-02): the Memory section took the
// editor past its 1,300-line ceiling, and that ceiling's note says the next section belongs here.
export type SectionKind = "mcpServers" | "hooks" | "projectDocs" | "settings" | "memory";

type SectionPayload = {
  mcpServers: unknown[];
  hooks: unknown[];
  projectDocs: unknown[];
  settings: Record<string, unknown>;
  memory?: Record<string, unknown>;
};

export const sections: Array<{ id: SectionKind; label: string; icon: React.ReactNode }> = [
  { id: "mcpServers", label: "MCP Servers", icon: <Library className="h-4 w-4" aria-hidden="true" /> },
  { id: "hooks", label: "Hooks", icon: <Code2 className="h-4 w-4" aria-hidden="true" /> },
  { id: "projectDocs", label: "Project Docs", icon: <FileText className="h-4 w-4" aria-hidden="true" /> },
  { id: "settings", label: "Settings", icon: <Settings2 className="h-4 w-4" aria-hidden="true" /> },
  { id: "memory", label: "Memory", icon: <Brain className="h-4 w-4" aria-hidden="true" /> }
];

export function sectionLabel(section: SectionKind) {
  return sections.find((item) => item.id === section)?.label ?? section;
}

export function sectionJson(payload: SectionPayload, section: SectionKind) {
  return `${JSON.stringify(payload[section] ?? (section === "memory" ? {} : []), null, 2)}\n`;
}

export function sectionCount(payload: SectionPayload, section: SectionKind) {
  if (section === "settings") return Object.keys(payload.settings ?? {}).length;
  if (section === "memory") return Object.keys(payload.memory ?? {}).length;
  const value = payload[section];
  return Array.isArray(value) ? value.length : 0;
}

export function sectionHint(section: SectionKind) {
  if (section === "mcpServers") return "Project MCP declarations rendered to runtime config files.";
  if (section === "hooks") return "Common command hooks with runtime-specific escape hatches.";
  if (section === "projectDocs") return "Root assistant guidance rendered to AGENTS.md and CLAUDE.md.";
  if (section === "memory") return "Memory backend, corpora, the code graph's sharing and per-engine settings.";
  return "Runtime-specific settings merged into generated project config.";
}

export function sectionSchemaHint(section: SectionKind) {
  if (section === "settings" || section === "memory") return "JSON object";
  return "JSON array";
}
