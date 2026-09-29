import assert from "node:assert/strict";
import test from "node:test";
import { createWorkUiCommand } from "@aof/server/commands/work-ui";
import { createServerContribution } from "@aof/server/commands";

test("board command construction and probe never bind or read the fleet default", async () => {
  let defaults = 0;
  const { workUiCommand, resolveStandaloneFleetOrigin } = createWorkUiCommand({
    serveBoard: () => assert.fail("probe must not bind"),
    boardUiProbe: input => ({ ...input, probe: true }),
    getDefaultMeshUiPort: () => { defaults++; return 4181; },
    commandError: (message, code, status) => Object.assign(new Error(message), { code, status }),
  });
  assert.equal(defaults, 0);
  assert.deepEqual(await workUiCommand.run({ port: 123, projectDir: "/project" }), { port: 123, projectDir: "/project", probe: true });
  assert.equal(defaults, 0);
  assert.equal(resolveStandaloneFleetOrigin().origin, "http://127.0.0.1:4181");
  assert.throws(() => resolveStandaloneFleetOrigin("https://fleet.example/path"), { code: "invalid-fleet-origin" });
  assert.equal(createServerContribution(workUiCommand).commands[0], workUiCommand);
});
