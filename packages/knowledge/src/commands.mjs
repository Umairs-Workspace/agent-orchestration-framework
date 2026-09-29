export const KNOWLEDGE_COMMAND_IDS = Object.freeze([
  'graph:build', 'graph:query', 'graph:triage', 'graph:impact', 'graph:serve', 'work:memory',
]);

// Ordered groups allow the shared work namespace and preserve the existing command enumeration.
export function createKnowledgeContribution(commands) {
  if (!Array.isArray(commands) || commands.length === 0 || commands.some(command =>
    !KNOWLEDGE_COMMAND_IDS.includes(command?.id) || typeof command.run !== 'function')) {
    throw new TypeError('Knowledge contributions require nonempty groups of owned command descriptors.');
  }
  return Object.freeze({name:'@aof/knowledge', commands:Object.freeze([...commands])});
}
