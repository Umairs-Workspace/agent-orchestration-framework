# 155 · One agent-mode setting governs every session — example map

## R1 · A loop-driven session takes the loop key, then work.agents.mode, then solo
- E1 · No loop key, `work.agents.mode: "orchestrated"`: the loop drives continue with `--orchestrated` [confirmed]
- E2 · Loop key `continue.mode: "solo"`, `work.agents.mode: "orchestrated"`: the loop drives continue with `--solo` [proposed]
- E3 · Nothing set anywhere: the loop drives refine and continue with `--solo` [proposed]
- E4 · Loop key `continue.mode: "Solo"` (a misspelling), `work.agents.mode: "orchestrated"`: the misspelling counts as unset, so `--orchestrated` [proposed]

## R2 · A hand-run session takes work.agents.mode, then solo, for every command
- E5 · `work.agents.mode` unset, operator types `/aof:continue 12/03`: solo, no agent spawned [confirmed]
- E6 · `work.agents.mode` unset, operator types `/aof:review 12/03` or `/aof:assimilate-code`: solo [proposed]
- E7 · `work.agents.mode: "solo"`, operator types `/aof:continue 12/03 --orchestrated`: orchestrated for that run only [proposed]
- E8 · A mesh worker with `work.agents.mode` unset receives the flagless `/aof:continue 12/03`: solo [proposed]
- E11 · `work.agents.mode` unset, operator types `/aof:verify 12/03`: verify still spawns its QA, designer and developer roles — it reads no mode [stated Q1]

## R3 · A per-role map is reported inert wherever the effective mode is solo
- E9 · `work.agents.mode` unset and `work.agents.models` names `aof-qa`: `aof config inspect` reports the map inert [proposed]
- E10 · `work.agents.mode: "orchestrated"` and the same map: no inert notice [proposed]

## Questions
- Q1 · business · answered · Does verify obey work.agents.mode too, playing QA/designer inline under solo?
- Q2 · technical · defaulted STORY.md#decisions-taken-at-refine · Does the drive compose the whole chain into a flag, or only the loop key?
- Q3 · technical · defaulted STORY.md#decisions-taken-at-refine · Where does the one `solo` default live in code?
- Q4 · technical · defaulted STORY.md#decisions-taken-at-refine · Does the inert-map notice follow the effective mode or only an explicit `solo`?
