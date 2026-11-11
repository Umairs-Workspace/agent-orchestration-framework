@executable @cli @work @work-stream
Feature: --all lists the open questions of every workspace on this node

  WHY. One node runs loops for several repositories, and the operator reading questions from one
  checkout should not have to visit each of the others to find out what is waiting. `--all`
  widens the read to every workspace's asks; each row says which workspace it belongs to and where
  to run its answer, because `aof work answer` resolves its workspace from the checkout it runs in.

  Rule: R3 · `--all` widens the listing to every workspace on this node

    Scenario: E8 · without --all only this workspace's questions, with --all every workspace's
      Given workspace "aof" has a waiting ask on "011" with a running run
      And workspace "acme-core" has a waiting ask on "007" with a running run
      And both workspaces have descriptors on this node naming their checkouts
      When "aof work questions" is run from the "aof" checkout
      Then only the row for "011" is printed
      When "aof work questions --all" is run from the "aof" checkout
      Then rows are printed for "011" and "007"
      And the "007" row names the workspace "acme-core" and the checkout to answer from

    Scenario: E9 · an ask whose workspace has no descriptor is listed under its workspace id
      Given an ask file in the waiting state for workspace id "52294b307214c27d"
      And this node holds no descriptor for "52294b307214c27d"
      When "aof work questions --all" is run
      Then the row names the workspace "52294b307214c27d"

    Scenario: E14 · an ask in a workspace whose checkout cannot be read reports unknown liveness
      Given workspace "acme-core" has a waiting ask on "007"
      And its descriptor names a checkout that does not exist on this machine
      When "aof work questions --all" is run
      Then the row for "007" is listed with its liveness reported as unknown
      And the row is not marked stale

    Scenario: --all --json carries each row's workspace id and name
      Given workspace "acme-core" has a waiting ask on "007" with a running run
      When "aof work questions --all --json" is run
      Then the "007" row's "workspace" carries the id and the name "acme-core"
