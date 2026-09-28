// Ordered CLI contribution. The descriptors are created by this package's command factories;
// core supplies their services and retains the compatibility instances during migration.
export { createNotionAssociateCommand } from './notion-associate.mjs';
export { createNotionSyncWorkCommand } from './notion-sync-work.mjs';
export function createNotionContribution({ syncWork, associate }) {
  if (syncWork?.id !== 'notion:sync-work' || associate?.id !== 'notion:associate') {
    throw new TypeError('Notion contribution requires both package command descriptors.');
  }
  return Object.freeze({ name: '@aof/integration-notion', commands: Object.freeze([syncWork, associate]) });
}
