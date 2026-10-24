---
doc: retrospective
---
# 02 · The opt-out seam — retrospective

## R1 · An opt-out enforced in one face is a hidden control, not an opt-out

**Kind:** mistake · **Area:** contract · **Stage:** verify · **Owner:** developer · **Raised by:** developer · **Promoted to:** none

**What happened:** The board hid Edit draft with diagrams off, but `diagram:scene` still wrote, and a directly opened `/diagram` loaded the editor. When the surface was fixed to ask the capability, the UAT showed the opposite failure: on the fleet origin, which serves no diagram API, a 404 read as "diagrams are off in this project".

**Why:** The seam was designed for the one path the board takes. "Not configured" and "not served here" were folded into one falsy answer.

**Lesson:** Enforce an opt-out at the store every face writes through, and keep "off" distinct from "unreachable" in what the page says.
