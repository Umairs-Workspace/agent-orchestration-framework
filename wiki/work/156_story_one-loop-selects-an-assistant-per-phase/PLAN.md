---
doc: plan
---
# 156 implementation plan

The acceptance example is a single command: refine with Codex/Astra high, implement
and verify with Claude/Sonnet high. Separate `work drive` calls are not acceptance.

1. Infer each assistant from its chosen model: phase model flag > unphased model
   flag > neutral phase configuration > older runtime-scoped defaults. Remove
   execution runtime flags. Discover native catalogue IDs and refuse unknown or
   ambiguous models, unavailable providers and unsupported effort before launch.
2. Resolve a mixed loop once into a version-2 plan containing a native version-1
   envelope per phase. Keep version-1 single-runtime records compatible. Store the
   plan in the loop declaration, but project one native envelope into each session
   record. Review/repair inherit continue. Native session identities never cross
   runtime boundaries.
3. Resume from the recorded plan, independent of subsequent config changes. Refuse
   conflicting flags. Transfer the entire plan to a worker; validate its native
   capabilities and prepare both installed asset sets before launch.
4. Edit phase models and effort in the configuration editor, preserving other settings, and
   document the one-command example.
5. Exercise resolution, rejection, edited-config recovery, worker handoff, legacy
   loops and real lifecycle gates with isolated scripted transports. Distinguish
   these results from a live model run. Build the UI. Record evidence and limits.

No dependency changes, provider credential changes, or changes to the project's
standing assistant choices are required. Root work is performed inline in solo mode.
