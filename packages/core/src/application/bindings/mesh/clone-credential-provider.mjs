// Core assembly: construct once per application; collaborators are supplied explicitly.
import { createCloneCredentialProviders } from "@aof/mesh/clone-credential-provider";

export function assembleMeshCloneCredentialProvider({ controlStreamServerServices }) {
  // Core composition for mesh-owned runtime services.

  const { defaultMintCloneCredential } = controlStreamServerServices;

  const { CLONE_CREDENTIAL_PROVIDER_UNKNOWN, defaultSignAppJwt, createGithubAppMintProvider, createGithubAppPushMintProvider, resolveCloneCredentialProvider, resolveWriteCredentialProvider } = createCloneCredentialProviders({ defaultMintCloneCredential });

  return { CLONE_CREDENTIAL_PROVIDER_UNKNOWN, defaultSignAppJwt, createGithubAppMintProvider, createGithubAppPushMintProvider, resolveCloneCredentialProvider, resolveWriteCredentialProvider };
}
