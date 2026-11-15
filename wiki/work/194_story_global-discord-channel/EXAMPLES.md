# 194 · Global Discord channel settings — example map
<!--
Global = `work.notify.channels` in `~/.aof/aof.config.json` (AOF_GLOBAL_HOME). Ids below: the
global channel 1571198918107078736, project B's own channel 1580000000000000001, the allowed user
1119197349521137757, and a stranger 1200000000000000002.
-->

## R1 · A Discord channel declared in the global config serves every project that declares none of its own
- E1 · Project A has no `work.notify`; the global config names channel 1571198918107078736. A's loop stops: the stop posts to 1571198918107078736 [proposed]
- E2 · User 1119197349521137757 (on the global `allow`) types `/loop status` in 1571198918107078736 while projects A and B are served: both answer, and a command that needs one project asks for it as it does today [proposed]
- E3 · User 1119197349521137757 replies to A's posted ask in 1571198918107078736: the answer is recorded on A's ask [proposed]
- E4 · User 1200000000000000002 (not on the global `allow`) replies to the same ask: refused, and the refusal names `work.notify.channels.discord.allow` in `~/.aof/aof.config.json` [proposed]

## R2 · A project's own channels take precedence over the global ones
- E5 · Project B declares its own channel 1580000000000000001; the global config names 1571198918107078736. B's loop stops: the stop posts to 1580000000000000001 only [stated Q1]
- E6 · Project B's own channel is 1571198918107078736 too, with `allow` holding only 1200000000000000002: in that channel B answers 1200000000000000002 and refuses 1119197349521137757 [stated Q1]

## R3 · A project can switch the global channel off for itself
- E7 · In project C, which has no channel of its own, `aof messaging disable discord`: C stops posting, `~/.aof/aof.config.json` is unchanged, and C's config records that C declares no channel [stated Q2]

## R4 · The global channel is set and read from the CLI
- E8 · Outside any project, `aof messaging enable discord --channel 1571198918107078736 --allow 1119197349521137757 --global`: `~/.aof/aof.config.json` gains `work.notify.channels.discord`, and no project config is written [proposed]
- E9 · In project A, `aof messaging status`: the discord line says enabled on 1571198918107078736, from the global config [proposed]
- E10 · In project A, `aof messaging test discord`: one test message is posted to 1571198918107078736 [proposed]
- E11 · `aof messaging disable discord --global`: the global channels are removed, and every project's own channels are untouched [proposed]

## Questions
- Q1 · business · answered · When a project has its own Discord channel and a global one exists, does the project post to its own channel only, or to both? — Its own only: a project's channels replace the global ones, `allow` included (operator, 2026-11-14).
- Q2 · business · answered · Should a project be able to switch the global channel off for itself? — Yes: `aof messaging disable discord` in the project records that it declares no channel, and leaves the global config alone (operator, 2026-11-14).
- Q3 · technical · defaulted packages/core/src/application/bindings/work.mjs:167 · Where the global layer is applied: in `loadWorkspace`, beside the existing global `mesh` merge, so the notifier, replies, buttons and slash commands all see it from one place.
- Q4 · technical · defaulted packages/messaging/src/notify.mjs:137 · Only `work.notify.channels` is global; `work.notify.link` stays per project, because it is a per-repo URL template filled with `{ref}`.
- Q5 · technical · defaulted packages/messaging/src/commands.mjs:353 · How a project says "none of my own": a present `work.notify.channels` key, even `{}`, is the project's declaration and wins whole; only an absent key inherits the global channels. So a project-level `disable` keeps `channels: {}` while the global config has channels, instead of deleting the block as it does today.
