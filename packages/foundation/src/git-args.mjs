// A value that lands in a git argv as a POSITIONAL — a branch name, a remote URL — must never be
// read as an OPTION: `git fetch origin --upload-pack=<cmd>` and `git ls-remote --upload-pack=<cmd>`
// run <cmd>. Every such call passes the value after `--` (which ends git's option parsing) AND
// through this guard, which refuses anything git could parse as an option before any git runs.
// No legitimate branch name or remote starts with "-": git itself refuses such branch names.
export function gitPositional(value, what = "git argument") {
  if (typeof value !== "string" || value.length === 0) throw new TypeError(`${what} must be a non-empty string`);
  if (value.startsWith("-")) throw new TypeError(`${what} may not start with "-" (git would read it as an option): ${JSON.stringify(value)}`);
  return value;
}
