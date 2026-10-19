# 160/03 · A child process compiles once and loads only its verb — build plan

## Mechanism

There are two levers, and both sit at process entry.

**The compile cache.** `module.enableCompileCache()` only affects modules loaded after it is
called, and static imports are hoisted above any statement. So the bin has to call it first and
then reach the CLI through a dynamic `import()`. Every runner and unit process enters through the
test harness module, which is statically imported before any suite is dynamically loaded. Calling
it in that module's body therefore covers every suite a unit loads. Guard the call with optional
chaining for runtimes that lack it. Keep the bin's error handling and exit code exactly as today:
FF "the CLI entry executes" pins bin and direct-run byte-identity.

**The closure.** Profile two child starts, `aof --version` and `aof work find 160`, with a
resolve hook (`module.register`) that records each module URL and its load time. Defer what the
verb's path never calls, using the dynamic-import pattern the CLI already uses for the command core
and the session arm. The comment block at the top of the CLI module records the earlier cut, so
extend it rather than starting a second account.

## Verification step

Time `node -e "await import('aof/default-application')"` and `aof --version` five times each,
cold cache then warm, before and after, on an idle machine, and record the medians in
VERIFICATION. Then count the modules each child loads. That count becomes FF-16004's pinned ceiling.

A cache that is not really engaged shows no difference between the cold and warm medians. A cut
that broke a verb shows up in the CLI face contract and the cold-boot suites, so run both.

## Out of scope

- The SEA launcher: changing it costs the 88 MB rebuild (build-deploy rules).
- Lazy getters on the default application: tests read it synchronously everywhere.
