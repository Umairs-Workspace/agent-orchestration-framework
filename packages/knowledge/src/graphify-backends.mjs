import { commandError } from '@aof/contracts/error';

// The extractors already classified by graph:build. This descriptor owns selection
// and diagnostics only; Graphify remains the sole provider and process driver.
export const GRAPHIFY_BACKENDS = Object.freeze([
  ...['claude', 'claude-cli', 'gemini', 'openai', 'kimi', 'deepseek'].map(backend => Object.freeze({ backend, network: true })),
  Object.freeze({ backend: 'ollama', network: false }),
]);
export const LEGACY_GRAPHIFY_BACKEND = 'claude-cli';
export const EXTRACTION_CONFIG_PATH = ['memory', 'graphify', 'extractionBackend'].join('.');
export const LOCAL_MEMORY_ALTERNATIVE = 'Select the existing "local" memory backend for a local record index without Graphify extraction; "none" disables memory.';

export function resolveGraphifyExtraction(memory = {}) {
  const block = memory?.graphify;
  const refuse = (message, path = EXTRACTION_CONFIG_PATH) => {
    const error = commandError(message, 'invalid-memory-extraction-backend', 400);
    error.path = path;
    throw error;
  };
  if (block !== undefined) {
    if (block === null || typeof block !== 'object' || Array.isArray(block)) refuse('memory.graphify must be an object.', 'memory.graphify');
    for (const key of Object.keys(block)) if (key !== 'extractionBackend') refuse(`Unknown memory.graphify setting "${key}".`, `memory.graphify.${key}`);
  }
  const explicit = block !== undefined && Object.hasOwn(block, 'extractionBackend');
  const backend = explicit ? block.extractionBackend : LEGACY_GRAPHIFY_BACKEND;
  const descriptor = GRAPHIFY_BACKENDS.find(entry => entry.backend === backend);
  if (!descriptor) refuse(`Unsupported Graphify extraction backend ${JSON.stringify(backend)}. Supported: ${GRAPHIFY_BACKENDS.map(entry => entry.backend).join(', ')}. ${LOCAL_MEMORY_ALTERNATIVE}`);
  const dependency = backend === 'claude-cli' ? 'Claude CLI (claude)' : backend === 'ollama' ? 'Ollama' : `${backend} provider credentials`;
  return {
    backend, source: explicit ? 'project setting' : 'legacy default', path: EXTRACTION_CONFIG_PATH,
    dependencies: ['Graphify (graphify)', dependency], network: descriptor.network, egress: 'docs-media',
    alternative: LOCAL_MEMORY_ALTERNATIVE,
  };
}
