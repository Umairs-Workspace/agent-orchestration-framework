// The frozen-set compiler (milestone 55 / ADR-004; the fourth point armed by 63/ADR-005).
//
// The declaration is data. This module is the only place that knows how its four
// enforcement-point spellings become runtime-shaped values. Compilation is pure:
// callers inject a declaration and receive a complete plan or one coded refusal;
// no member is applied while another member is still being validated.
//
// ALL FOUR POINTS COMPILE (63/ADR-005 §1, 2026-09-02). "the worker launch envelope" carried
// a spelling and no enforcement from 55 until now — reported by name in `deferred`, which is
// the only honest way to carry a gap and also the reason it survived two months. Its rule is
// re-declared from the referent-free `{ "argument": "--aof-gate-order" }` (a flag no runtime
// accepts, so honouring it literally would have broken every launch) to a DECLARED LAUNCH:
// the program and the leading argv an unattended run may be. `compileFrozenSet` therefore
// gains `unattendedLaunch` beside `hooks`, `permissions` and `agentScopes`, `deferred` is
// empty, and `COMPILED_POINTS` is now `FROZEN_ENFORCEMENT_POINTS` itself rather than a slice
// — a point added to the vocabulary later arrives either compiled or refusing, never quietly
// deferred, because there is no longer a set it can fall between.
//
// The ADMISSION of a requested unattended launch against this artifact is NOT here: it is the
// launch seam's own branch (`resolveInteractiveDriverLaunch`), because the refusal has to be
// produced where the spawn would otherwise happen. This module says what is declared; that
// one says what may run.
import path from "node:path";
import { readFile } from "node:fs/promises";
import { readAssetText } from "./asset-base.mjs";

export const FROZEN_SET_RELPATH = ".aof/frozen-set.jsonc";
export const FROZEN_MEMBER_MARKER = "aofFrozen";
export const FROZEN_OWNERSHIP_MARKER = "aofManaged";

export const FROZEN_ENFORCEMENT_POINTS = Object.freeze([
  "tool-call hook entries",
  "permission denials",
  "agent tool scope",
  "the worker launch envelope",
]);

// Every declared enforcement point compiles. Derived from the vocabulary rather than
// retyped, so the set a member may NAME and the set that COMPILES cannot drift apart.
const COMPILED_POINTS = new Set(FROZEN_ENFORCEMENT_POINTS);

// The only two keys the launch envelope's rule knows. A rule carrying anything else — the
// retired `{ "argument": … }` spelling included — is refused by name rather than ignored,
// which is what stops a member reading like a rule and behaving like a comment.
const LAUNCH_RULE_KEYS = Object.freeze(["program", "args"]);

export class FrozenSetError extends Error {
  constructor(code, memberId, message, details = {}) {
    super(message);
    this.name = "FrozenSetError";
    this.code = code;
    this.memberId = memberId ?? null;
    Object.assign(this, details);
  }
}

export function bundledFrozenSet() {
  return parseDeclaration(readAssetText("bundle", "frozen-set.jsonc"));
}

function parseDeclaration(text) {
  return JSON.parse(String(text).replace(/^\s*\/\/[^\r\n]*(?:\r?\n|$)/, ""));
}

export async function readFrozenSet(targetDir) {
  const declarationPath = path.join(targetDir, ...FROZEN_SET_RELPATH.split("/"));
  try {
    return parseDeclaration(await readFile(declarationPath, "utf8"));
  } catch (error) {
    if (error?.code === "ENOENT") return bundledFrozenSet();
    if (error instanceof SyntaxError) {
      throw new FrozenSetError(
        "frozen-set-unparseable",
        null,
        `Refusing frozen-set compilation: ${declarationPath} is not parseable JSON.`,
        { path: declarationPath },
      );
    }
    throw error;
  }
}

function refuse(member, message, code = "frozen-set-member-invalid") {
  const id = typeof member?.id === "string" && member.id.length > 0 ? member.id : "<unnamed>";
  throw new FrozenSetError(code, id, `Frozen-set member "${id}" refused: ${message}`);
}

function stringArray(value, member, label) {
  if (!Array.isArray(value) || value.length === 0 || value.some((entry) => typeof entry !== "string" || entry.length === 0)) {
    refuse(member, `${label} must be a non-empty array of strings.`);
  }
  return [...value];
}

function compileMember(member) {
  if (member == null || typeof member !== "object" || Array.isArray(member)) refuse(member, "the member must be an object.");
  if (typeof member.id !== "string" || member.id.length === 0) refuse(member, "id is required.");
  if (typeof member.protects !== "string" || member.protects.trim().length === 0) refuse(member, "protects is required.");
  if (typeof member.enforcementPoint !== "string" || member.enforcementPoint.length === 0) {
    refuse(member, "enforcementPoint is required.", "frozen-set-enforcement-point-missing");
  }
  if (!FROZEN_ENFORCEMENT_POINTS.includes(member.enforcementPoint)) {
    refuse(
      member,
      `unknown enforcement point "${member.enforcementPoint}"; known enforcement points: ${FROZEN_ENFORCEMENT_POINTS.join(", ")}.`,
      "frozen-set-enforcement-point-unknown",
    );
  }

  const owned = member[FROZEN_OWNERSHIP_MARKER] === member.id;
  const base = { id: member.id, protects: member.protects, enforcementPoint: member.enforcementPoint, owned };
  if (!COMPILED_POINTS.has(member.enforcementPoint)) return { ...base, compiled: false };

  if (member.enforcementPoint === "tool-call hook entries") {
    const rule = member.rule;
    if (rule == null || typeof rule !== "object" || Array.isArray(rule)) refuse(member, "hook rule is required.");
    for (const key of ["event", "matcher", "command"]) {
      if (typeof rule[key] !== "string" || rule[key].length === 0) refuse(member, `hook rule.${key} is required.`);
    }
    const args = stringArray(rule.args, member, "hook rule.args");
    return {
      ...base,
      compiled: owned,
      hook: owned ? {
        id: member.id,
        event: rule.event,
        matcher: rule.matcher,
        type: "command",
        command: rule.command,
        runtimes: ["claude"],
        claude: { args, [FROZEN_MEMBER_MARKER]: member.id },
        frozenMember: member.id,
        protects: member.protects,
      } : null,
    };
  }

  if (member.enforcementPoint === "permission denials") {
    const deny = stringArray(member?.rule?.deny, member, "permission rule.deny");
    return { ...base, compiled: owned, permissions: owned ? deny.map((rule) => ({ id: member.id, rule })) : [] };
  }

  if (member.enforcementPoint === "the worker launch envelope") {
    const rule = member.rule;
    if (rule == null || typeof rule !== "object" || Array.isArray(rule)) {
      refuse(member, "launch envelope rule is required and must be an object naming a program and its leading arguments.");
    }
    const unknown = Object.keys(rule).filter((key) => !LAUNCH_RULE_KEYS.includes(key));
    if (unknown.length > 0) {
      refuse(member, `launch envelope rule carries ${unknown.map((key) => `"${key}"`).join(", ")}, which this enforcement point does not know; it knows ${LAUNCH_RULE_KEYS.join(", ")}.`);
    }
    if (typeof rule.program !== "string" || rule.program.length === 0) {
      refuse(member, "launch envelope rule.program must name the program an unattended run may be.");
    }
    const args = stringArray(rule.args, member, "launch envelope rule.args");
    return {
      ...base,
      compiled: owned,
      // The artifact carries the id of the member that declared it, exactly as the other
      // three points do — a compiled launch nobody can trace back to a declaration is the
      // decoration this enforcement point exists to stop being.
      unattendedLaunch: owned ? Object.freeze({ memberId: member.id, program: rule.program, args: Object.freeze(args) }) : null,
    };
  }

  const scopes = member?.rule?.agents;
  if (scopes == null || typeof scopes !== "object" || Array.isArray(scopes) || Object.keys(scopes).length === 0) {
    refuse(member, "agent scope rule.agents must name at least one agent.");
  }
  const agents = {};
  for (const [agentId, tools] of Object.entries(scopes)) agents[agentId] = stringArray(tools, member, `tools for agent "${agentId}"`);
  return { ...base, compiled: owned, agents: owned ? agents : {} };
}

export function compileFrozenSet(declaration) {
  if (declaration == null || typeof declaration !== "object" || Array.isArray(declaration)) {
    throw new FrozenSetError("frozen-set-invalid", null, "Refusing frozen-set compilation: declaration must be an object.");
  }
  if (!Array.isArray(declaration.members)) {
    throw new FrozenSetError("frozen-set-invalid", null, "Refusing frozen-set compilation: members must be an array.");
  }

  const ids = new Set();
  const compiledMembers = [];
  for (const member of declaration.members) {
    if (ids.has(member?.id)) refuse(member, "id is duplicated.");
    ids.add(member?.id);
    compiledMembers.push(compileMember(member));
  }

  const hooks = [];
  const permissions = [];
  const permissionCatalogue = [];
  const agentScopes = {};
  let unattendedLaunch = null;
  const installed = [];
  const deferred = [];
  const escaped = [];
  for (const member of compiledMembers) {
    if (!COMPILED_POINTS.has(member.enforcementPoint)) {
      deferred.push(member.id);
      continue;
    }
    if (!member.owned) {
      if (member.enforcementPoint === "permission denials") {
        const source = declaration.members.find((candidate) => candidate?.id === member.id);
        for (const rule of source?.rule?.deny ?? []) permissionCatalogue.push({ id: member.id, rule, owned: false });
      }
      escaped.push(member.id);
      continue;
    }
    if (member.hook) hooks.push(member.hook);
    if (member.permissions) {
      permissions.push(...member.permissions);
      permissionCatalogue.push(...member.permissions.map((entry) => ({ ...entry, owned: true })));
    }
    if (member.unattendedLaunch) {
      if (unattendedLaunch != null) refuse(member, `the worker launch envelope is already declared by "${unattendedLaunch.memberId}".`);
      unattendedLaunch = member.unattendedLaunch;
    }
    for (const [agentId, tools] of Object.entries(member.agents ?? {})) {
      if (agentScopes[agentId] != null) refuse(member, `agent "${agentId}" is already scoped by another member.`);
      agentScopes[agentId] = { memberId: member.id, tools };
    }
    installed.push(member.id);
  }

  return Object.freeze({ members: compiledMembers, hooks, permissions, permissionCatalogue, agentScopes, unattendedLaunch, installed, deferred, escaped });
}

export function applyFrozenAgentScopes(resources, compiled) {
  const byId = new Map(resources.map((resource) => [resource.id, resource]));
  for (const [agentId, scope] of Object.entries(compiled.agentScopes ?? {})) {
    const resource = byId.get(agentId);
    if (resource?.kind !== "agent") {
      throw new FrozenSetError(
        "frozen-set-compile-refused",
        scope.memberId,
        `Frozen-set member "${scope.memberId}" cannot reach agent tool scope "${agentId}".`,
      );
    }
  }
  for (const [agentId, scope] of Object.entries(compiled.agentScopes ?? {})) {
    const resource = byId.get(agentId);
    resource.tools = [...scope.tools];
    resource.frozenMember = scope.memberId;
  }
  return resources;
}
