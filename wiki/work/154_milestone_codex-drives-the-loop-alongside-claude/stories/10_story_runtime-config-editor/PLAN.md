# 154/10 · The config editor explains effective assistant settings — build plan

Advisory to the builder; the task features are the acceptance contract.

## Mechanism

Extend the existing project-config payload and validated save path. Group runtime, phase settings, role settings and a read-only resolved preview in the current form language. Keep local form state on failed validation and distinguish defaulted from explicit values.

## Verification step

Exercise load/edit/save/reload through the config API and mounted surface, assert zero apply/launch calls, then inspect keyboard/error states against DESIGN at the three specified widths. Run the UI build.

## Out of scope

No new configuration route, execution dashboard, auto-apply or independent template selector.

