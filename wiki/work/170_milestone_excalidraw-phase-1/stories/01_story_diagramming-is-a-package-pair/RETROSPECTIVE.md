---
doc: retrospective
---
# 01 · Diagramming is a package pair — retrospective

## R1 · The new control took a delivered milestone's FF id

**Kind:** mistake · **Area:** architecture · **Stage:** build · **Owner:** architect · **Raised by:** product-owner · **Promoted to:** none

**What happened:** The package-direction control was numbered FF-13304, the id milestone 133 already gives "the console renders a diagram only as an image". Both controls ran under one id and named themselves `arch/133`, so neither cited register resolved to a single control.

**Why:** The work extended 133's diagram family and took the next number in 133's sequence. A control's id belongs to the milestone that declares it.

**Lesson:** Number a new control from the declaring item (FF-170NN), never from the series it extends. It is now FF-17001.
