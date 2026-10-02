import { assembleWorkDigestTemplate } from './bindings/work/digest-template.mjs';
import { assembleWork } from './bindings/work.mjs';

export function createWorkspaceServices({ env, workspace, fs }) {

  const workDigestTemplate = assembleWorkDigestTemplate({  });
  const work = assembleWork({ workspaceServices: workspace, fsServices: fs, workDigestTemplateServices: workDigestTemplate, applicationEnv: env });
  return { workDigestTemplate, work };
}
