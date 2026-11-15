# 191/05 · The project is picked, not typed — Outcome

## Delivered

### One word for the project on every command
`/status`, `/asks`, `/loop stop`, `/loop resume` and `/loop start` take `project`, and no command registers a `workspace` option. A typed folder name or workspace id still resolves.

### The project is offered while typing
The `project` option autocompletes from the projects whose channel `allow` list holds the user, the same set the command would reach. A stranger, a direct message or a failed read gets an empty list, never a refusal.

## Assumptions

- **The project is registered with the machine's mesh** — a project not yet published (`aof mesh repo publish`) is not served, and so is not offered (F-16, now in the guide).
