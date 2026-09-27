// The diagram-generator registry (milestone 133, ADR-002 §1). A frozen map built from each
// adapter's OWN `id`, so no id is spelled twice: the config validator lists `generatorIds()`,
// `aof diagram plan` resolves `generatorFor(id)`, and only the adapter file names its tool
// (FF-13301). A second generator is one import and one array member here.
import { diagramDesignGenerator } from "./generator-diagram-design.mjs";

const ADAPTERS = [diagramDesignGenerator];

const REGISTRY = new Map(ADAPTERS.map((adapter) => [adapter.id, adapter]));

export function generatorIds() {
  return [...REGISTRY.keys()];
}

// The adapter for a registered id, or null — never a fallback to another generator.
export function generatorFor(id) {
  return REGISTRY.get(id) ?? null;
}
