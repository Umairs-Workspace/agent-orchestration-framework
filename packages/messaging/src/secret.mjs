import { randomUUID } from "node:crypto";
import { chmod, mkdir, readFile, rename, stat, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

// Core supplies configured application services; construction performs no I/O.
export function createMessagingSecrets({ defaultGlobalWorkspaceDir }) {
// src/notify/secret.mjs — THE MESSAGING SECRET STORE (milestone 131 / story 08; ADR-005 §1, as
// amended at 131/08, and ADR-007: since 131/09 the discord credential is a bot token). A channel's
// credential is kept machine-wide, in one owner-only file per channel type under the global home —
// `<defaultGlobalWorkspaceDir()>/messaging/<type>.secret` — the way the mesh GitHub App key is a
// `.pem` file and never a config value. This is the ONE module that spells the `messaging` segment
// (`messagingStoreDir`, which 131/10's ask-message index lives beneath), and the one that reads and
// writes the secret file (FF-13106's store-path leg).
//
// THE HOME IS THE PROCESS'S. Every function takes an optional `env`, and a caller that passes none
// gets `process.env`'s home, so `AOF_GLOBAL_HOME` relocates the store. The notifier never passes the
// `env` it was handed: that `env` is the override's source only (ADR-005 §1), which keeps an
// injected `env: {}` in a test from reaching the real `~/.aof`.
//
// THE FILE holds the credential and one trailing newline, nothing else; a read trims it. The write
// is atomic — a temporary file in the same directory, then a rename — so a reader never sees half a
// credential. On POSIX the file is `0600` in a `0700` directory, re-applied on every write because
// `writeFile`'s `mode` acts only on creation. On win32 no mode is asserted: the file sits under the
// user profile and inherits its owner-only ACL, and that is the reason, not a gap.
//
// Nothing here ever puts the credential in an error message, a degrade or a return value other than
// `readMessagingSecret`'s own answer.

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

// messagingStoreDir(env) → `<global home>/messaging`, the machine-wide messaging store: the secret
// files, and beneath it 131/10's ask-message index (`./ask-messages.mjs`).
function messagingStoreDir(env = process.env) {
  return path.join(defaultGlobalWorkspaceDir(env), "messaging");
}

// messagingSecretPath(type, env) → `<global home>/messaging/<type>.secret`.
function messagingSecretPath(type, env = process.env) {
  return path.join(messagingStoreDir(env), `${checkedType(type)}.secret`);
}

// readMessagingSecret(type, { env }) → the stored credential, trimmed, or `null` when nothing usable is
// stored. An absent file, an unreadable one and a blank one all answer `null`; none throws.
async function readMessagingSecret(type, { env = process.env } = {}) {
  let text;
  try {
    text = await readFile(messagingSecretPath(type, env), "utf8");
  } catch {
    return null;
  }
  const value = text.trim();
  return value.length > 0 ? value : null;
}

// messagingSecretPresent(type, { env }) → whether a usable credential is stored — the one question a
// report may ask of the store without holding the value.
async function messagingSecretPresent(type, options = {}) {
  return (await readMessagingSecret(type, options)) != null;
}

// writeMessagingSecret(type, secret, { env, platform }) → `{ path, replaced }`. Writes the credential
// and one newline atomically, owner-only on POSIX. `replaced` says whether a file stood there before.
async function writeMessagingSecret(type, secret, { env = process.env, platform = process.platform } = {}) {
  const target = messagingSecretPath(type, env);
  const dir = path.dirname(target);
  const posix = platform !== "win32";
  await mkdir(dir, { recursive: true, ...(posix ? { mode: DIR_MODE } : {}) });
  if (posix) await chmod(dir, DIR_MODE);
  const replaced = await stat(target).then(() => true, () => false);
  const temp = path.join(dir, `.tmp-${path.basename(target)}-${process.pid}-${randomUUID()}`);
  await writeFile(temp, `${String(secret).trim()}\n`, { encoding: "utf8", ...(posix ? { mode: FILE_MODE } : {}) });
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

return { messagingStoreDir, messagingSecretPath, readMessagingSecret, messagingSecretPresent, writeMessagingSecret };
}
