# Runtime form browser evidence

Frozen application: `53b99b1cd81c1896fa7bfed251fb0ae9f6f27706`.
Real AOF configuration API and production UI, isolated project/home, `/config` → Settings.
Existing Python Playwright and cached Chromium 1243; no dependency added.

- `browser-report.json`: 12 passing responsive, keyboard, validation, save and scope checks.
- `browser-state-report.json`: six passing loading, retry and long-model checks.
- `form-viewport-{390,768,1280}.png`: viewport captures with the heading below the fixed shell.
- Other images capture inherited/populated/invalid/failed/saved/global and role-override states.
  Full-page and element screenshots can include the fixed shell over the scrolled document;
  use viewport captures when judging heading visibility.

GET delay/failure and PUT failure are explicitly injected browser transport faults against the real
component. Ordinary saves use the real API. These images and the binding DESIGN checklist were
reviewed inline in solo mode. They are initial evidence, not a claim of a pre-existing automated
pixel baseline comparison. The main VERIFICATION.md holds the verdict and its limitations.
