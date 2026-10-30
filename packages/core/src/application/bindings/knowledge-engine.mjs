// Core assembly: construct once per application; collaborators are supplied explicitly.
import { createKnowledgeEngine, KNOWLEDGE_CORPORA, ENGINE_VERBS, RECORD_CORPORA } from "@aof/knowledge/engine";
import { createGraphifyCodeBackend, isNetworkBackend, isKnownNetworkBackend, classifyEgress } from "@aof/knowledge/graphify-code-backend";
import { defaultGitExec } from "@aof/execution/worktrees";
import { ensureGraphifyOutGitignore } from "../../aof-gitignore.mjs";

export function assembleKnowledgeEngine({ graphifyServices }) {
  // The core home of the knowledge-engine port (179/ADR-001). A face composes the port over the
  // backends it holds by calling `createKnowledgeEngine`; construction is pure. The code faces and
  // readers compose it over the graphify code backend (ADR-002), built here once from the existing
  // graphify services: git lists the tree its inputs stamp covers (166), and every build writes the
  // nested graphify-out ignore (149's gap).

  const { resolveGraphifyBinary, runGraphifyBuild, readGraph, normalizeGraph, graphJsonPath, graphArtifactBuiltAt, isCodeOnlyWholeRootBuild } = graphifyServices;

  const { graphifyCodeBackend, readBuiltGraph } = createGraphifyCodeBackend({ resolveGraphifyBinary, runGraphifyBuild, readGraph, normalizeGraph, graphJsonPath, graphArtifactBuiltAt, isCodeOnlyWholeRootBuild, git: defaultGitExec, ensureGraphifyOutGitignore });
  const codeEngine = createKnowledgeEngine({ backends: [graphifyCodeBackend] });

  return { createKnowledgeEngine, KNOWLEDGE_CORPORA, ENGINE_VERBS, RECORD_CORPORA, graphifyCodeBackend, codeEngine, readBuiltGraph, isNetworkBackend, isKnownNetworkBackend, classifyEgress };
}
