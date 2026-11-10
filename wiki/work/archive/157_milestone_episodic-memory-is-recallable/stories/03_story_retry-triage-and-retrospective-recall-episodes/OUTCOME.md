# 157/03 · A retry, a triage and a retrospective recall what happened before — Outcome

## Delivered

### A retried build recalls its prior attempt
On attempt 2 or later, the continue procedure ingests, then recalls `"" --item <ref> --area delivery --all --json`. Before the first code change, it names the prior run (by `retryOf`, else the latest terminal earlier attempt), that run's `failureReason` and the story's findings in the milestone `STATE.md`. It submits one `continue-episodic` / `developer` observation.

### Finding triage recalls the stream's prior findings
The verify procedure ingests, then recalls `"<finding text>" --kind finding --block` across the stream before each triage decision. It cites a prior finding only on matching cause and evidence, never closes the new finding, and submits one `verify-finding` / `verifier` observation on the item being verified.

### The retrospective's evidence comes through recall
The retrospective procedure refreshes observability, ingests, and gathers findings, feedback and terminal runs through one `--all` recall of the item. When memory is off it reports the evidence as unavailable and does not fall back to reading the raw ledgers.

- **Prompt-bound** — all three edges are procedure text, held in the authored source and every render by FF-15702. Nothing in the runtime enforces that an agent follows them.
