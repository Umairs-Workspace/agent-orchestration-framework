#!/usr/bin/env bash
# scripts/deploy-wsl.sh — push this working tree into the WSL worker node's own clone.
#
# Invoked by `node scripts/install-local.mjs --wsl` (which computes the /mnt/… path and
# picks the distro); runnable by hand for a fast src-only iteration:
#
#   wsl -d Ubuntu-22.04 -- bash /mnt/c/Source/umami/aof/scripts/deploy-wsl.sh \
#       /mnt/c/Source/umami/aof ~/source/aof .aof-wsl-deploy
#
# WHY THE DISTRO NEEDS A SEPARATE TREE AT ALL (it is not duplication for its own sake):
#   - node-pty ships prebuilds for darwin-{arm64,x64} and win32-{arm64,x64} ONLY. There
#     is no linux-x64 prebuild, so the distro must COMPILE it against its own Node —
#     the Windows repo's node_modules holds a win32 binary the distro cannot load.
#   - Node resolves symlinks BEFORE resolving node_modules, so symlinking the distro's
#     src/ at the Windows src/ would make `import "ws"` resolve from the WINDOWS tree's
#     node_modules and fail. Copying is what keeps resolution on the native tree.
#
# It carries UNCOMMITTED work, which is the whole point of a local test node and the one
# thing the Mac worker's `git pull` flow cannot do.
#
# $1 = this repo, as a distro-visible path (/mnt/c/…)   $2 = distro-side repo dir
# $3 = the deploy-stamp filename (holds the sha256 of the lockfile last installed from)
set -euo pipefail

export NVM_DIR="$HOME/.nvm"
# nvm defines `node`/`npm` as shell FUNCTIONS from ~/.bashrc, which a non-login shell
# never sources — source it explicitly or this runs with no Node at all. nvm is not
# `set -u` clean, so -u stays off across the source.
set +u
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh" >/dev/null 2>&1
set -u

SRC="$1"
# Expand a leading ~ without eval (the argument is an operator-supplied path).
DST="$2"
case "$DST" in
  "~/"*) DST="$HOME/$(printf '%s' "$DST" | cut -c3-)" ;;
  "~")   DST="$HOME" ;;
esac
STAMP="$DST/$3"

[ -d "$SRC/packages/core/src" ] || { echo "no core source at $SRC (path translation failed?)" >&2; exit 1; }
[ -d "$DST/.git" ] || { echo "no aof clone at $DST — provision the distro first" >&2; exit 1; }

# 1. the source tree. Core's source and assets travel together in packages/core/.
#    node_modules is NEVER copied — it is the Windows tree.
mkdir -p "$DST/bin"
cp "$SRC/bin/aof.mjs" "$DST/bin/aof.mjs"
cp "$SRC/package.json" "$DST/package.json"
# Focus still resolves the complete workspace graph. Follow locked owners,
# including relocated apps, and remove retired source files on updates. rsync
# keeps the distro's own nested dependencies and Rust build outputs untouched.
command -v rsync >/dev/null || { echo "rsync is required for workspace synchronization" >&2; exit 1; }
WORKSPACES="$(node "$SRC/scripts/workspace-paths.mjs" --list)"
while IFS= read -r workspace; do
  [ -n "$workspace" ] || continue
  mkdir -p "$DST/$workspace"
  rsync -a --delete --exclude=node_modules --exclude=target --exclude=.git "$SRC/$workspace/" "$DST/$workspace/"
done <<< "$WORKSPACES"
mkdir -p "$DST/.yarn/releases" "$DST/scripts"
cp "$SRC/yarn.lock" "$SRC/.yarnrc.yml" "$DST/"
cp "$SRC/.yarn/releases/yarn-4.18.1.cjs" "$DST/.yarn/releases/"
cp "$SRC/scripts/prepare-worktree.mjs" "$SRC/scripts/yarn.mjs" "$DST/scripts/"
rm -f "$DST/package-lock.json"
echo "  synced workspaces ($(find "$DST/packages/core/src" -name '*.mjs' | wc -l) core modules)"

# The WORKSPACE config travels too. It is machine-neutral (no paths), and it carries
# `mesh.workspaceId` — the DURABLE CROSS-MACHINE workspace anchor. Without it both ends
# fall back to the path derivation (sha256 of the project root), which necessarily
# diverges between C:\Source\umami\aof and ~/source/aof; the control then refuses every
# streamed frame as `unknown-workspace` and DISCARDS 100% of the worker's rows. That is
# not hypothetical — it is the failure workspace-identity.mjs's own header records
# ("silently discarded 100% of its frames for days"), and it was live on this mesh.
if [ -f "$SRC/.aof/aof.config.json" ]; then
  mkdir -p "$DST/.aof"
  cp "$SRC/.aof/aof.config.json" "$DST/.aof/aof.config.json"
  echo "  synced .aof/aof.config.json (workspaceId anchor)"
fi

# 2. dependency drift. A src-only sync is fast and almost always right, but a lockfile
#    change needs a native reinstall + node-pty rebuild — skipping that silently leaves
#    a stale native binary that fails at daemon start, far from its cause.
HASH="$(
  {
    cat "$SRC/yarn.lock" "$SRC/package.json" "$SRC/.yarnrc.yml" "$SRC/.yarn/releases/yarn-4.18.1.cjs"
    while IFS= read -r workspace; do cat "$SRC/$workspace/package.json"; done <<< "$WORKSPACES"
  } | sha256sum | cut -d' ' -f1
)"
PREV="$(cat "$STAMP" 2>/dev/null || echo none)"
# Resolve from execution's actual install, not an assumed root-hoisted copy.
PTY_DIR="$(cd "$DST" && node -e "const {createRequire}=require('node:module'); const path=require('node:path'); try { console.log(path.dirname(createRequire(path.resolve('packages/execution/package.json')).resolve('node-pty/package.json'))); } catch {}")"
PTY="$PTY_DIR/build/Release/pty.node"
if [ "$HASH" != "$PREV" ] || [ ! -f "$PTY" ]; then
  echo "  lockfile changed (or node-pty absent) — reinstalling natively"
  cd "$DST" || exit 1
  # Install only core's runtime closure; the worker does not need UI build tools.
  # A failed install writes NO stamp: stamping it would report "lockfile unchanged" on every
  # later deploy, over a tree that never received the new dependency.
  if ! YARN_ENABLE_SCRIPTS=false YARN_ENABLE_IMMUTABLE_INSTALLS=true node .yarn/releases/yarn-4.18.1.cjs workspaces focus aof --production 2>&1 | tail -3; then
    echo "  Yarn install failed — the stamp is left as it was, so the next deploy retries" >&2
    exit 1
  fi
  PTY_DIR="$(node -e "const {createRequire}=require('node:module'); const path=require('node:path'); console.log(path.dirname(createRequire(path.resolve('packages/execution/package.json')).resolve('node-pty/package.json')))")"
  PTY="$PTY_DIR/build/Release/pty.node"
  if [ ! -f "$PTY" ]; then
    echo "  building node-pty from source (no linux-x64 prebuild ships)"
    node .yarn/releases/yarn-4.18.1.cjs rebuild node-pty
  fi
  [ -f "$PTY" ] || { echo "  node-pty did not build — the worker cannot run PTY sessions" >&2; exit 1; }
  printf '%s' "$HASH" > "$STAMP"
else
  echo "  lockfile unchanged — native install kept"
fi

# 3. report what the distro ACTUALLY runs now, read from the distro itself.
cd "$DST" || exit 1
echo "  node-pty : $(node -e "require('node:module').createRequire(require('node:path').resolve('packages/execution/package.json'))('node-pty'); process.stdout.write('loads OK')" 2>&1 | tail -1)"
echo "  aof      : $(command -v aof || echo "NOT LINKED — link the aof package in $DST/packages/core")"
echo "  version  : $(aof --version 2>&1 | head -1)"
echo
echo "  NOTE: a running worker daemon keeps its in-memory module graph — restart it to pick this up."
