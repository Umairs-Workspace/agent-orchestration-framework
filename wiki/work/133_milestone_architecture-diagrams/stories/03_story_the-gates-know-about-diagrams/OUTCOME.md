# 03 · The gates know about diagrams — Outcome

## Delivered

### A doctor lane for diagrams
`aof work doctor` runs a pure `diagramsGroup` lane that reports four things: a linked diagram file missing from the tree, an export owed by `formats` but absent, a link whose stem names a different ADR than the one it sits under, and an unlinked file in `diagrams/` (an orphan). The link codes are errors while the item is open and warnings once it is done. An orphan is always a warning.

### The lane is silent where there are no diagrams
An item with no `diagrams/` folder and no diagram link reports nothing. This repository's whole stream carries no `diagram-*` finding.
