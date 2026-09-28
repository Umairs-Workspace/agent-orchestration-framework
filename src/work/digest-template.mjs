// Core owns the shipped template location/version; work owns digest mechanics.
import { readAssetText, packageVersionString } from "../asset-base.mjs";
import { parseDigestTemplate, renderDigestDocument as render, digestFindings as findings } from "@aof/work/digest";
export { parseDigestTemplate } from "@aof/work/digest";

let cached = null;
export function digestContract() {
  if (cached) return cached;
  cached = parseDigestTemplate(readAssetText("bundle", "templates/milestone/AOF.md"));
  return cached;
}
export function renderDigestDocument(input, { schemaVersion }) {
  return render(input, { schemaVersion, aofVersion: packageVersionString(), contract: digestContract() });
}
export function digestFindings(meta, text) {
  return findings(meta, text, digestContract());
}
