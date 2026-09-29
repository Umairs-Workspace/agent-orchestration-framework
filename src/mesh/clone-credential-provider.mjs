// Transitional core composition for mesh-owned runtime services.
import { createCloneCredentialProviders } from "@aof/mesh/clone-credential-provider";
import { defaultMintCloneCredential } from "../control-stream-server.mjs";


export const { CLONE_CREDENTIAL_PROVIDER_UNKNOWN, defaultSignAppJwt, createGithubAppMintProvider, createGithubAppPushMintProvider, resolveCloneCredentialProvider, resolveWriteCredentialProvider } = createCloneCredentialProviders({ defaultMintCloneCredential });
