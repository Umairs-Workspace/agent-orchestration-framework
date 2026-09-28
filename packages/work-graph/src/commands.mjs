// Ordered package-owned contribution; core supplies the descriptor collaborators.
export function createWorkGraphContribution({ show, graph, validate, groundedness, document, record }) {
  const commands = [show, graph, validate, groundedness, document, record];
  const ids = ['work:loops-show', 'work:loops-graph', 'work:loops-validate', 'work:loops-groundedness', 'work:loop-document', 'work:loop-record'];
  if (commands.some((command, index) => command?.id !== ids[index])) throw new TypeError('Work-graph contribution requires all six package command descriptors.');
  return Object.freeze({ name: '@aof/work-graph', commands: Object.freeze(commands) });
}
