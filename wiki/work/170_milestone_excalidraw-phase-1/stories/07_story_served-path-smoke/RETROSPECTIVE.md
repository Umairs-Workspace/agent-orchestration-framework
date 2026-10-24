---
doc: retrospective
---
# 07 · The served-path smoke — retrospective

## R1 · Every measurement was on one platform, and the first Windows run found three reds

**Kind:** near-miss · **Area:** process · **Stage:** verify · **Owner:** qa · **Raised by:** product-owner · **Promoted to:** none

**What happened:** The smoke and every suite in VERIFICATION ran on macOS. The first run on the Windows control node, where the operator actually uses the editor, failed the review suite three times: EPERM on record replacement (story 00), and a symlink the test could not create without privilege.

**Why:** The evidence was complete for the platform it ran on and silent about the one in daily use.

**Lesson:** For a feature whose operator works on a named platform, run the focused suites there before calling the evidence complete, and say which platform each row was measured on.
