// Compatibility entry; construction belongs to core application assembly.
import { meshCloneCredentialProvider } from "../application/default.mjs";
export const {
  CLONE_CREDENTIAL_PROVIDER_UNKNOWN,
  defaultSignAppJwt,
  createGithubAppMintProvider,
  createGithubAppPushMintProvider,
  resolveCloneCredentialProvider,
  resolveWriteCredentialProvider,
} = meshCloneCredentialProvider;
