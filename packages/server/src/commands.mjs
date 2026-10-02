// The transport owns its launcher route; core supplies configured services.
export function createServerContribution(workUiCommand) {
  return { name: "@aof/server", commands: [workUiCommand] };
}
