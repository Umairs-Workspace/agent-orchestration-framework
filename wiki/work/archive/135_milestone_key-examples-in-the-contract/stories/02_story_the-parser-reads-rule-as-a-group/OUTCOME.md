# 02 · The parser reads `Rule:` as a group — Outcome

## Delivered

### The one Gherkin parser reports rules
`parseFeature` gives each scenario a `rule` (or none) and the feature a `rules` list. A rule's tags apply to every scenario inside it and to no other, and a tag above a `Rule:` is listed once.

### `Example:` is a scenario and an Examples row keeps its cells
`Example:` parses as a scenario, and each Examples table carries its `columns` and its rows' `cells`. A feature with no `Rule:` parses to the same value under the old keys, across the whole corpus (FF-5704).
