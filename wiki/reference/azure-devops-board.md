# Azure DevOps board definition for AOF

Use a dedicated area of an Azure DevOps project on an inherited Agile process. The definition
and adapter are the three files in
[`test/golden/fixtures/work-stream/azure-devops/`](../../test/golden/fixtures/work-stream/azure-devops/)
(`board.yaml`, `adapter.mjs` and `http.mjs`), which the work-verb golden suite runs over
recorded Azure responses. Copy them into the project's `.aof/boards/azure-devops/`, since AOF
loads a selected definition only from under the project's own `.aof/`. Then set the
organization, project, process name and full area path in `board.yaml`. Use the actual reference names for the fields and relation
types provisioned in that process.

## Administrator setup

1. Create an inherited process under Organization settings → Process, using Agile as its
   base. Make the changes below before assigning the project to that process. The operator
   responsible for the existing project should review the impact before switching it.
2. Reuse Feature, User Story and Task. Create Chore, Spike, UAT and Prototype as custom work
   item types. For each governed type, match the five states in the manifest to separate
   Azure states. Add any missing states, including Blocked, and use the appropriate Azure
   state categories. Prototype uses Active, Paused, Closed and Abandoned.
3. Add string fields with the reference names `Custom.AofRef`, `Custom.AofKey` and
   `Custom.AofMembership` to every mapped type. Enable the configured numeric order field
   across those types. If the process exposes a different rank field, update the manifest.
   The membership values are `active`, `backlog` and `archived`. AOF's archive command
   is available in local file mode.
4. Provision the area and grant the executing account permission to read its metadata and
   create or update work items there. Use Azure's child-to-parent and successor-to-predecessor
   links for the parent and dependency bindings. Attachment support uses the item's
   AttachedFile relation.

## Enable access

Run `az login` under the account that will execute AOF, including the daemon account when
applicable. Check Azure DevOps token acquisition in that environment by using the adapter's
read path. The adapter acquires and refreshes its token in memory and omits it from diagnostics.

Set the following in the project's `.aof/aof.config.json` to opt in.

```json
{"work":{"store":{"manifest":".aof/boards/azure-devops/board.yaml"}}}
```

Run `aof work list --json`. The adapter checks the project's process, area, types, states,
fields and relations before it reads the selected area. An empty area returns an empty board
snapshot. An invalid mapping names the affected type, state or field. Work item writes verify
revision and attachment operations verify the resulting item relation. To disable uploads,
omit the manifest's `capabilities.attachments` entry.

Provider endpoints and process metadata are defined in the [Azure DevOps Work Item Tracking REST API](https://learn.microsoft.com/en-us/rest/api/azure/devops/wit/).
