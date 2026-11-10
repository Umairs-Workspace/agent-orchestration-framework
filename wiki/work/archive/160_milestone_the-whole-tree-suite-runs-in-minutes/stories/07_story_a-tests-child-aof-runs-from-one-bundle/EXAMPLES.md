# 160/07 · A test's child aof runs from one bundle — example map

## R1 · In the whole-tree gate, a test's child aof runs the bundle built at the start of that run
- E1 · The sharded gate starts, the bundle builds in about 2 s, and a test that spawns `aof work find 160` gets the bundle's answer in about 0.6 s [stated Q1]
- E2 · The bundle fails to build: the run goes on with every child on the source, and its output says "# cli bundle unavailable: <reason>" [proposed]
- E3 · A focused `aof test` run of one suite sets no bundle, so its children run the source [stated Q1]

## R2 · Where the subject is how aof loads, the source runs
- E4 · FF-16004 counts the modules a child `aof --version` loads: it strips the bundle variable and still counts 16 [proposed]

## R3 · The bundle answers exactly as the source does
- E5 · `aof --version`, `aof work find 160 --json`, `aof work init` over a temp project and an unknown verb each give the same stdout, stderr and exit code from the bundle and from the source [proposed]

## Questions
- Q1 · business · answered · In the whole-tree gate, may a test's child `aof` run a bundle built from the tree at the start of the run instead of the source files? Measured at refine: about 0.6 s a start against about 2.0 s, over at least 800 child starts in the heaviest suites. A control checks that the bundle answers a fixed set of commands exactly as the source does. What it gives up: a defect that appears only when Node loads the separate source files, such as an import cycle the bundle orders differently, would not be caught by a child-process test in the gate. In-process tests and focused runs still load the source. Settles E1 and E3. On 2026-10-15 the operator answered "Yes, bundle in the gate": the sharded gate builds one bundle and every child aof in it runs that bundle; focused runs and module-loading tests stay on source.
- Q2 · technical · defaulted ADR-008 · What happens when the bundle cannot be built? The run goes on with the source and says so in one line; source is correct, only slower.
- Q3 · technical · defaulted ADR-008 · How does a child find the bundle? The runner names it in `AOF_TEST_CLI_BUNDLE`, and the bin imports it when that file exists.
