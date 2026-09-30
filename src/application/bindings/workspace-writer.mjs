// Core assembly: construct once per application; collaborators are supplied explicitly.
import path from "node:path";

export function assembleWorkspaceWriter({ fsServices, configEditorServices, workspaceServices }) {
  const { writeText } = fsServices;
  const { assetBodyPath } = configEditorServices;
  const { workspacePaths } = workspaceServices;

  const WORKSPACE_GITIGNORE = "/work/\n";

  async function writeWorkspaceConfig(targetDir, config) {
    const paths = workspacePaths(targetDir);
    const resources = [];

    for (const resource of config.resources ?? []) {
      const resourcePath = assetBodyPath(resource);
      const content = resource.body ?? resource.prompt ?? resource.instructions ?? "";
      await writeText(path.join(paths.workspaceDir, resourcePath), `${content.trim()}\n`);

      const metadata = { ...resource, path: resourcePath.replaceAll(path.sep, "/") };
      delete metadata.body;
      delete metadata.prompt;
      delete metadata.instructions;
      delete metadata.overrides;
      resources.push(metadata);
    }

    await writeText(path.join(paths.workspaceDir, ".gitignore"), WORKSPACE_GITIGNORE);
    await writeText(paths.configPath, `${JSON.stringify({
      $schema: config.$schema ?? "https://aof.local/schemas/aof.schema.json",
      name: config.name ?? "assistant-project",
      resources,
      packages: config.packages ?? [],
      ...(config.items ? { items: config.items } : {}),
      ...(config.runtimes ? { runtimes: config.runtimes } : {})
    }, null, 2)}\n`);
  }

  return { writeWorkspaceConfig };
}
