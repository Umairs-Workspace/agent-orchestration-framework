# @aof/learning

Private workspace for teaching: the operator-led mode in which AOF teaches a human the code one
story or task touches while the human writes it (milestone 179). It is a practice, not core
behaviour, so it lives here rather than in core or `@aof/work` (179/ADR-004).

| Export | Responsibility |
| --- | --- |
| `mode` | `teachMode`, the `{ flag, command, description }` descriptor the continue door is handed. |

Dependencies run one way (179/ADR-004 §2, FF-17902): this package may import `@aof/contracts`, and
`@aof/work` imports nothing from it, does not list it, and never spells the mode's name. `@aof/work`
offers one seam that names no practice — `operatorModes` on the phase doors — and core composes this
package's descriptor into it, as it composes specification by example's before-build check.
