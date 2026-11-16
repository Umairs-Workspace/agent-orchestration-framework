// writeJson / formatJson — a config a person also edits is written back without being reformatted.
// Pins:
//   - every value that did not change keeps the file's own text (inline arrays, a block indented by
//     four), and only what changed is laid out, in the file's indent unit
//   - the file's line ending and its trailing newline (or lack of one) survive
//   - an absent or unparseable file is written as before: 2-space JSON plus a newline
//   - the written text always parses to exactly the value handed in
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { formatJson, writeJson } from "@aof/foundation/fs";

async function withTemp(fn) {
  const root = await mkdtemp(path.join(os.tmpdir(), "aof-fs-json-"));
  try {
    return await fn(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

const HAND_EDITED = [
  "{",
  "  \"name\": \"p\",",
  "  \"work\": {",
  "    \"examples\": { \"enabled\": true },",
  "    \"test\": { \"paths\": [\"a/**\", \"b/**\"], \"why\": \"x\" },",
  "    \"notify\": {",
  "        \"channels\": { \"discord\": { \"allow\": [\"1\"] } }",
  "    }",
  "  }",
  "}",
  "",
].join("\n");

export const fsJsonFormatTests = [
  {
    name: "fs-json/an added key is the only change: untouched values keep the file's own text",
    run: () => {
      const value = JSON.parse(HAND_EDITED);
      value.work.examples.operatorAware = true;
      value.work.operator = { role: "R", expertise: { fraud: "new" } };
      const text = formatJson(value, HAND_EDITED);
      assert.deepEqual(JSON.parse(text), value);
      assert.ok(text.includes("\"test\": { \"paths\": [\"a/**\", \"b/**\"], \"why\": \"x\" }"), "an untouched inline object stays inline");
      assert.ok(text.includes("    \"notify\": {\n        \"channels\": { \"discord\": { \"allow\": [\"1\"] } }\n    }"), "a block indented by four stays at four");
      assert.ok(text.includes("    \"examples\": {\n      \"enabled\": true,\n      \"operatorAware\": true\n    }"), "the changed object is laid out in the file's unit");
      assert.ok(text.includes("    \"operator\": {\n      \"role\": \"R\",\n      \"expertise\": {\n        \"fraud\": \"new\"\n      }\n    }"), "a new key is laid out at its depth");
    },
  },
  {
    name: "fs-json/a removed key leaves nothing behind and an inline scalar array stays inline when it changes",
    run: () => {
      const value = JSON.parse(HAND_EDITED);
      delete value.work.notify;
      value.work.test.paths.push("c/**");
      const text = formatJson(value, HAND_EDITED);
      assert.deepEqual(JSON.parse(text), value);
      assert.ok(!text.includes("notify"));
      assert.ok(text.includes("\"paths\": [\"a/**\", \"b/**\", \"c/**\"]"));
    },
  },
  {
    name: "fs-json/an unchanged value writes the file back byte for byte, CRLF and a missing final newline included",
    run: () => {
      const crlf = HAND_EDITED.trimEnd().split("\n").join("\r\n");
      assert.equal(formatJson(JSON.parse(crlf), crlf), crlf);
      const value = JSON.parse(crlf);
      value.extra = [1, { a: 2 }];
      const text = formatJson(value, crlf);
      assert.deepEqual(JSON.parse(text), value);
      assert.ok(!/(^|[^\r])\n/.test(text), "every line ending is the file's CRLF");
      assert.ok(!text.endsWith("\n"), "no final newline is added to a file that had none");
    },
  },
  {
    name: "fs-json/an absent or unparseable file is written as 2-space JSON plus a newline",
    run: () => {
      const value = { a: [1, 2], b: { c: null } };
      const plain = `${JSON.stringify(value, null, 2)}\n`;
      assert.equal(formatJson(value), plain);
      assert.equal(formatJson(value, "{ not json"), plain);
      assert.equal(formatJson(value, "﻿{}"), plain);
    },
  },
  {
    name: "fs-json/what is written always parses to the value: reordered keys, changed types, dropped undefined",
    run: () => {
      const previous = "{\n  \"a\": 1,\n  \"b\": [\"x\"],\n  \"c\": { \"d\": 1 }\n}\n";
      const value = { c: "now a string", b: { now: "an object" }, a: 1, gone: undefined };
      const text = formatJson(value, previous);
      assert.deepEqual(JSON.parse(text), { c: "now a string", b: { now: "an object" }, a: 1 });
      assert.deepEqual(Object.keys(JSON.parse(text)), ["c", "b", "a"], "the value's key order wins");
    },
  },
  {
    name: "fs-json/writeJson writes through to disk and a dry run writes nothing",
    run: () => withTemp(async (root) => {
      const file = path.join(root, "aof.config.json");
      await writeFile(file, HAND_EDITED);
      const value = JSON.parse(HAND_EDITED);
      value.name = "q";
      assert.deepEqual(await writeJson(file, value, { dryRun: true }), { path: file, action: "write" });
      assert.equal(await readFile(file, "utf8"), HAND_EDITED);
      await writeJson(file, value);
      assert.equal(await readFile(file, "utf8"), HAND_EDITED.replace("\"name\": \"p\"", "\"name\": \"q\""));
      const fresh = path.join(root, "new.json");
      await writeJson(fresh, { a: 1 });
      assert.equal(await readFile(fresh, "utf8"), "{\n  \"a\": 1\n}\n");
    }),
  },
];
