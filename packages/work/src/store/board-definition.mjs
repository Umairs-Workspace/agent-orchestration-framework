import path from "node:path";
import { readFile, realpath } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import Ajv from "ajv";
import yaml from "js-yaml";
import { commandError } from "@aof/contracts/error";
import schema from "./work-board.schema.json" with { type: "json" };

let validate;

function invalid(message) {
  return commandError(message, "work-board-definition-invalid", 400);
}

function within(root, target) {
  const relative = path.relative(root, target);
  return relative !== "" && relative !== ".." && !relative.startsWith(".." + path.sep) && !path.isAbsolute(relative);
}

async function containedFile(root, base, name, label) {
  try {
    if (path.isAbsolute(name)) throw new Error("expected a relative path");
    const file = await realpath(path.resolve(base, name));
    if (!within(root, file)) throw new Error("must resolve inside the project's .aof directory");
    return file;
  } catch (error) {
    throw invalid(`Invalid ${label} path ${JSON.stringify(name)}: ${error.message}`);
  }
}

function adapterOperation(module, operation, binding) {
  if (!Object.hasOwn(module, binding) || typeof module[binding] !== "function") {
    throw invalid(`Board operation ${operation} requires a callable export named ${binding}`);
  }
  return module[binding];
}

export async function loadBoardDefinition(workspace, manifest) {
  const project = await realpath(workspace.projectRoot);
  let root;
  try {
    root = await realpath(path.join(project, ".aof"));
    if (!within(project, root)) throw new Error("must resolve inside the project");
  } catch (error) {
    throw invalid(`Invalid board manifest path: ${error.message}`);
  }
  const file = await containedFile(root, project, manifest, "board manifest");
  let definition;
  try {
    definition = yaml.load(await readFile(file, "utf8"), { schema: yaml.JSON_SCHEMA, filename: manifest });
  } catch (error) {
    throw invalid(`Board manifest ${manifest}: ${error.message}`);
  }
  validate ??= new Ajv().compile(schema);
  if (!validate(definition)) {
    const relevant = validate.errors[0];
    throw invalid(`Board manifest ${manifest} ${relevant.instancePath || "/"}: ${relevant.message}`);
  }
  const adapter = await containedFile(root, path.dirname(file), definition.adapter, "board adapter");
  let module;
  try {
    module = await import(pathToFileURL(adapter).href);
  } catch (error) {
    throw invalid(`Board adapter ${definition.adapter} failed to load (${error.code ?? error.name})`);
  }
  const operations = Object.fromEntries(Object.entries(definition.operations).map(([operation, binding]) =>
    [operation, adapterOperation(module, operation, binding)]));
  const capabilities = {};
  const probe = definition.capabilities?.accessProbe;
  const attachments = definition.capabilities?.attachments;
  if (probe !== undefined) capabilities.accessProbe = adapterOperation(module, "accessProbe", probe);
  if (attachments !== undefined) capabilities.copyAttachment = adapterOperation(module, "attachments.copy", attachments.copy);
  const invoke = (handler, input) => handler(input, { definition: structuredClone(definition) });
  return {
    definition,
    manifestPath: path.relative(root, file).replaceAll("\\", "/"),
    readItems: input => invoke(operations.readItems, input),
    readChanges: input => invoke(operations.readChanges, input),
    applyChanges: input => invoke(operations.applyChanges, input),
    ...(capabilities.accessProbe && { accessProbe: input => invoke(capabilities.accessProbe, input) }),
    ...(capabilities.copyAttachment && { copyAttachment: input => invoke(capabilities.copyAttachment, input) }),
  };
}
