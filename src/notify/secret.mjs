// src/notify/secret.mjs — THE MESSAGING SECRET STORE (milestone 131 / story 08; ADR-005 §1, as
// amended at 131/08). A channel's webhook URL carries its token in its path, so the URL IS the
// credential. It is kept machine-wide, in one owner-only file per channel type under the global
// home — `<defaultGlobalWorkspaceDir()>/messaging/<type>.secret` — the way the mesh GitHub App key
// is a `.pem` file and never a config value. This is the ONE module that knows that path, and the
// one that reads and writes the file (FF-13106's store-path leg).
//
// THE HOME IS THE PROCESS'S. Every function takes an optional `env`, and a caller that passes none
// gets `process.env`'s home, so `AOF_GLOBAL_HOME` relocates the store. The notifier never passes the
// `env` it was handed: that `env` is the override's source only (ADR-005 §1), which keeps an
// injected `env: {}` in a test from reaching the real `~/.aof`.
//
// THE FILE holds the URL and one trailing newline, nothing else; a read trims it. The write is
// atomic — a temporary file in the same directory, then a rename — so a reader never sees half a
// URL. On POSIX the file is `0600` in a `0700` directory, re-applied on every write because
// `writeFile`'s `mode` acts only on creation. On win32 no mode is asserted: the file sits under the
// user profile and inherits its owner-only ACL, and that is the reason, not a gap.
//
// Nothing here ever puts the URL in an error message, a degrade or a return value other than
// `readMessagingSecret`'s own answer.
import { randomUUID } from "node:crypto";
import { chmod, mkdir, readFile, rename, stat, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { defaultGlobalWorkspaceDir } from "../paths.mjs";

// A channel type is a registry key (`CHANNELS` in `notify.mjs`), so it is a bare lowercase word —
// never a path segment that could climb out of the store.
const TYPE_RE = /^[a-z][a-z0-9-]*$/u;
const FILE_MODE = 0o600;
const DIR_MODE = 0o700;

function checkedType(type) {
  if (typeof type !== "string" || !TYPE_RE.test(type)) {
    const error = new Error(`"${String(type)}" is not a messaging channel type`);
    error.code = "messaging-unknown-channel";
    throw error;
  }
  return type;
}

// messagingSecretPath(type, env) → `<global home>/messaging/<type>.secret`.
export function messagingSecretPath(type, env = process.env) {
  return path.join(defaultGlobalWorkspaceDir(env), "messaging", `${checkedType(type)}.secret`);
}

// readMessagingSecret(type, { env }) → the stored URL, trimmed, or `null` when nothing usable is
// stored. An absent file, an unreadable one and a blank one all answer `null`; none throws.
export async function readMessagingSecret(type, { env = process.env } = {}) {
  let text;
  try {
    text = await readFile(messagingSecretPath(type, env), "utf8");
  } catch {
    return null;
  }
  const value = text.trim();
  return value.length > 0 ? value : null;
}

// messagingSecretPresent(type, { env }) → whether a usable URL is stored — the one question a
// report may ask of the store without holding the value.
export async function messagingSecretPresent(type, options = {}) {
  return (await readMessagingSecret(type, options)) != null;
}

// writeMessagingSecret(type, url, { env, platform }) → `{ path, replaced }`. Writes the URL and one
// newline atomically, owner-only on POSIX. `replaced` says whether a file stood there before.
export async function writeMessagingSecret(type, url, { env = process.env, platform = process.platform } = {}) {
  const target = messagingSecretPath(type, env);
  const dir = path.dirname(target);
  const posix = platform !== "win32";
  await mkdir(dir, { recursive: true, ...(posix ? { mode: DIR_MODE } : {}) });
  if (posix) await chmod(dir, DIR_MODE);
  const replaced = await stat(target).then(() => true, () => false);
  const temp = path.join(dir, `.tmp-${path.basename(target)}-${process.pid}-${randomUUID()}`);
  await writeFile(temp, `${String(url).trim()}\n`, { encoding: "utf8", ...(posix ? { mode: FILE_MODE } : {}) });
  try {
    if (posix) await chmod(temp, FILE_MODE);
    await rename(temp, target);
  } catch (error) {
    await unlink(temp).catch(() => undefined);
    throw error;
  }
  if (posix) await chmod(target, FILE_MODE);
  return { path: target, replaced };
}
