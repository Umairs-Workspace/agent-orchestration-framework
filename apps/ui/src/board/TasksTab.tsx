// The story's TASKS tab — its tasks/*.feature files, parsed server-side, one card per task with
// its scenarios grouped by rule (135/ADR-005). Extracted from DetailPanel.tsx at 135's verify:
// the panel sat over its 1,000-line ratchet (m43 ADR-015/F2) once the rule grouping landed, and a
// surface gains child components, not blocks. The panel mounts it; nothing else imports it.
import { useEffect, useState } from "react";
import { workApi } from "./api";
import type { TaskFeature, TaskLane, TaskScenario, WorkItem } from "./api";

type TasksState =
  | { kind: "loading" }
  | { kind: "ready"; tasks: TaskFeature[] }
  | { kind: "error"; message: string };

// The lane chip ramp (DESIGN): @executable = teal (primary), @manual = crimson
// (accent), @uat = red (destructive); via the existing token classes.
function laneChipClasses(lane: TaskLane | null): string {
  if (lane === "executable") return "bg-primary/12 text-primary";
  if (lane === "manual") return "bg-accent/12 text-accent";
  if (lane === "uat") return "bg-destructive/12 text-destructive";
  return "bg-muted text-muted-foreground";
}

export function TasksTab({ item }: { item: WorkItem }) {
  const [state, setState] = useState<TasksState>({ kind: "loading" });

  useEffect(() => {
    let cancelled = false;
    setState({ kind: "loading" });
    workApi
      .tasks(item.ref)
      .then((response) => {
        if (!cancelled) setState({ kind: "ready", tasks: response.tasks });
      })
      .catch((error) => {
        if (!cancelled) setState({ kind: "error", message: error instanceof Error ? error.message : "Load failed" });
      });
    return () => {
      cancelled = true;
    };
  }, [item.ref]);

  if (state.kind === "loading") return <p className="mono text-sm text-muted-foreground">Loading tasks...</p>;
  if (state.kind === "error") return <p className="text-sm text-accent">Could not load tasks: {state.message}</p>;
  if (state.tasks.length === 0) {
    return <p className="text-sm text-muted-foreground">No task features yet</p>;
  }

  return (
    <div className="space-y-4">
      {state.tasks.map((task) => (
        <section key={task.file} className="rounded-md border border-border p-3">
          <div className="flex items-baseline justify-between gap-2">
            <span className="mono truncate text-xs text-muted-foreground">{task.file}</span>
            <TaskCounts counts={task.counts} />
          </div>
          {task.feature ? <h3 className="mt-1 text-sm font-semibold leading-snug">{task.feature}</h3> : null}
          {ruleGroups(task.scenarios).map((group) =>
            group.rule == null ? (
              <ul key={`${task.file}:${group.start}`} className="mt-2 space-y-1.5">
                {group.scenarios.map((scenario, offset) => (
                  <ScenarioItem key={`${task.file}:${group.start + offset}`} scenario={scenario} />
                ))}
              </ul>
            ) : (
              <div key={`${task.file}:${group.start}`}>
                <h4 className="mt-3 text-xs font-semibold">{group.rule}</h4>
                <ul className="mt-2 space-y-1.5 border-l border-border pl-3">
                  {group.scenarios.map((scenario, offset) => (
                    <ScenarioItem key={`${task.file}:${group.start + offset}`} scenario={scenario} />
                  ))}
                </ul>
              </div>
            )
          )}
        </section>
      ))}
    </div>
  );
}

// 135/ADR-005 — a task's scenarios grouped by the rule they sit under, in file order: a new group
// starts whenever the rule changes, so the scenarios outside any rule (which Gherkin places first)
// form a leading group with no heading. A payload from an older node carries no `rule`; it reads as
// null, so such a task is one headless group — today's flat list.
type RuleGroup = { rule: string | null; start: number; scenarios: TaskScenario[] };
function ruleGroups(scenarios: TaskScenario[]): RuleGroup[] {
  const groups: RuleGroup[] = [];
  scenarios.forEach((scenario, index) => {
    const rule = scenario.rule ?? null;
    const last = groups[groups.length - 1];
    if (last && last.rule === rule) last.scenarios.push(scenario);
    else groups.push({ rule, start: index, scenarios: [scenario] });
  });
  return groups;
}

function ScenarioItem({ scenario }: { scenario: TaskScenario }) {
  return (
    <li className="flex items-start gap-2 text-sm">
      <span
        className={`mt-0.5 shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${laneChipClasses(scenario.lane)}`}
      >
        {scenario.lane ?? "—"}
      </span>
      <span className="leading-snug">
        {scenario.name}
        {scenario.outline ? <span className="ml-1.5 text-xs text-muted-foreground">(outline)</span> : null}
      </span>
    </li>
  );
}

function TaskCounts({ counts }: { counts: TaskFeature["counts"] }) {
  const entries: Array<[TaskLane, number]> = [
    ["executable", counts.executable],
    ["manual", counts.manual],
    ["uat", counts.uat],
  ];
  return (
    <span className="flex shrink-0 items-center gap-1">
      {entries
        .filter(([, n]) => n > 0)
        .map(([lane, n]) => (
          <span
            key={lane}
            className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${laneChipClasses(lane)}`}
            title={`${n} @${lane}`}
          >
            {lane.charAt(0)}·{n}
          </span>
        ))}
    </span>
  );
}
