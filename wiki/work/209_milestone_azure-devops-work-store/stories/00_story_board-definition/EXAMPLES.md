# 209/00 · Board selection — example map

## R1 · Each workspace reads through the store it selects
- E1 · An existing checkout with local item 17 and no store setting finds 17 without loading any board module [proposed]
- E2 · Two checkouts select different definitions. The same find for 17 returns Orchard in one and Harbour in the other [proposed]

## R2 · Only a valid definition and an explicitly selected project adapter can reach the board
- E3 · A definition with two mappings for the same YAML key is refused before its adapter loads [proposed]
- E4 · An adapter symlink inside the project resolves outside its real .aof directory. Selection refuses it before the module runs [proposed]

## R3 · A project supplies the required operations and can omit optional capabilities
- E5 · A second board binds its read operation to listCards. A public find returns card 71 as story 17/00 with its parent and dependency [proposed]
- E6 · The same board omits attachment and daemon-probe capabilities. Its work items remain readable and neither optional operation runs [proposed]

## Questions
