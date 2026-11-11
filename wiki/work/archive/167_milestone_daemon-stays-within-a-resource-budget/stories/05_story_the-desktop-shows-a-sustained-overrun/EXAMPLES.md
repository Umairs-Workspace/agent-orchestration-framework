# 167/05 · The desktop shows a sustained overrun — example map

## R1 · A sustained overrun is shown and logged, and a short spike is not
- E1 · `serve` holds 60% of a core while idle against a 2% idle budget, for 5 minutes: the tray turns `degraded`, the footer reads that `mesh serve` is using 60% of a core against its 2% budget, mostly on its top cause, and one `daemon-over-budget` line is logged [stated Q1]
- E2 · `serve` spikes to 90% for 40 s during a large sync, then drops under budget: nothing is shown and nothing is logged [proposed]
- E3 · After an overrun, `serve` stays under budget for a full minute: the footer notice clears, the tray returns to its fleet state, and one `daemon-back-within-budget` line is logged [proposed]

## R2 · The guard judges only against a budget it was handed
- E4 · `mesh status --json` fails or carries no `cost.budget`: the guard judges nothing and shows nothing [proposed]
- E5 · `serve`'s snapshot is `not-reporting`, while the OS shows it at 100% for 5 minutes: it is judged against the 10% viewer-open budget and shown as an overrun [stated Q1]

## R3 · The guard never stops a daemon
- E6 · `serve` has been in overrun for an hour: it is still running, and the guard has issued no stop, restart or kill; the operator's own Stop works as before [proposed]
- E7 · `serve` is in overrun and `ui` has crashed with a standing exit notice: the footer shows the exit notice, and the tray is `degraded` [proposed]

## Questions
- Q1 · business · answered · How long must a daemon stay over budget before the desktop app tells you? A big sync or a `git pull` can push a daemon over for a short while, and that is normal; a real runaway stays over. (a) 2 minutes: you hear quickly, and a long sync may cry wolf now and then. (b) 5 minutes (recommended): no normal spike lasts that long, and a runaway shows within minutes. (c) 15 minutes: never a false alarm, but a runaway burns a quarter of an hour first. Answer (2026-10-20): (b) 5 minutes.
- Q2 · business · answered · Do you have a mock for how the overrun should look in the desktop app? (a) No mock (recommended): it uses the tray's existing degraded icon and the window footer's one notice line, and DESIGN.md records a binding checklist for it. (b) Yes: I'll export it as an image into the milestone's `mocks/` folder, and it becomes the design's source of truth. Answer (2026-10-20): (a) no mock; DESIGN.md's binding checklist is the source of truth.
- Q3 · technical · defaulted ARCHITECTURE.md#adr-006 · What does an unknown state judge against? The viewer-open budget, the looser of the two, so a daemon too busy to report is still caught.
- Q4 · technical · defaulted ARCHITECTURE.md#adr-006 · Which notice wins the one footer slot? A standing exit notice outranks an overrun, and the overrun still sets the tray.
