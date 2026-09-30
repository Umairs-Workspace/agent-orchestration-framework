// Core assembly: construct once per application; collaborators are supplied explicitly.
import { readAssetText, packageVersionString } from "../../../asset-base.mjs";
import { parseDigestTemplate, renderDigestDocument as render, digestFindings as findings } from "@aof/work/digest";
import * as api0 from "@aof/work/digest";

export function assembleWorkDigestTemplate({  } = {}) {
  // Core owns the shipped template location/version; work owns digest mechanics.

  let cached = null;
  function digestContract() {
    if (cached) return cached;
    cached = parseDigestTemplate(readAssetText("bundle", "templates/milestone/AOF.md"));
    return cached;
  }
  function renderDigestDocument(input, { schemaVersion }) {
    return render(input, { schemaVersion, aofVersion: packageVersionString(), contract: digestContract() });
  }
  function digestFindings(meta, text) {
    return findings(meta, text, digestContract());
  }

  return { "parseDigestTemplate": api0.parseDigestTemplate, digestContract, renderDigestDocument, digestFindings };
}
