# 169/03 · The Hyperagent package carries one zip — Outcome

## Delivered

### One upload for the seven skills
`aof work integrations hyperagent package` also writes `<aof home>/hyperagent/aof-hyperagent-skills.zip`. It holds `<id>/SKILL.md` for each of the seven planning skills and nothing else, uses the same bytes on every run, and the hand-over names it first, with each loose `SKILL.md` as the fallback.
- **Hyperagent drafts one skill per `<id>/` folder of an uploaded zip** — measured once, with a same-layout zip, on 2026-10-23.

### The doctor reads the zip
`aof work integrations hyperagent doctor` reports the package `missing` when the zip is absent and `stale` when its bytes differ from the zip the installed aof would write.
