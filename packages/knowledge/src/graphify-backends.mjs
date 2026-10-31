import { GRAPHIFY_EXTRACTORS, LOCAL_MEMORY_ALTERNATIVE, readMemoryConfig } from './memory-config.mjs';

// The extractors already classified by graph:build. This descriptor owns selection
// and diagnostics only; Graphify remains the sole provider and process driver.
// The names are the setting's admitted values (`memory-config.mjs`); the classification is here.
const LOCAL_EXTRACTORS = new Set(['ollama']);
export const GRAPHIFY_BACKENDS = Object.freeze(GRAPHIFY_EXTRACTORS.map(backend => Object.freeze({ backend, network: !LOCAL_EXTRACTORS.has(backend) })));
export const LEGACY_GRAPHIFY_BACKEND = 'claude-cli';
export const EXTRACTION_CONFIG_PATH = ['memory', 'backends', 'graphify', 'extractionBackend'].join('.');
export { LOCAL_MEMORY_ALTERNATIVE };

// The graphify engine's extraction setting, read from `memory.backends.graphify` or the legacy
// `memory.graphify` (180/ADR-004). The node validates the block whether or not graphify is the
// selected backend, and `path` names the key the author wrote.
export function resolveGraphifyExtraction(memory = {}) {
  const node = readMemoryConfig({ memory });
  const block = node.backends.graphify;
  const explicit = Object.hasOwn(block, 'extractionBackend');
  const backend = explicit ? block.extractionBackend : LEGACY_GRAPHIFY_BACKEND;
  const descriptor = GRAPHIFY_BACKENDS.find(entry => entry.backend === backend);
  const dependency = backend === 'claude-cli' ? 'Claude CLI (claude)' : backend === 'ollama' ? 'Ollama' : `${backend} provider credentials`;
  return {
    backend, source: explicit ? 'project setting' : 'legacy default', path: node.paths.extraction,
    dependencies: ['Graphify (graphify)', dependency], network: descriptor.network, egress: 'docs-media',
    alternative: LOCAL_MEMORY_ALTERNATIVE,
  };
}
