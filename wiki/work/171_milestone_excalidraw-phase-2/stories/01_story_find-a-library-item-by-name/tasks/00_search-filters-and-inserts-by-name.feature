@executable @ui @work @design
Feature: Library search filters the loaded items by name and inserts a result exactly as the Library panel does

  WHY. With a real set of 249 icons an item can only be found by scrolling (F-170-12), and the SDK's
  only search box searches the canvas. The editor already holds every item from both library roots,
  tagged with where it came from; search is a filter over those items, and insertion reuses the
  SDK's own library drop so the tag survives (ADR-002).

  Background:
    Given the editor has loaded these library items
      | library                | item                  |
      | aws-architecture-icons | Kinesis               |
      | aws-architecture-icons | Kinesis Data Firehose |
      | aws-architecture-icons | Kinesis Data Streams  |
      | aws-architecture-icons | Lambda                |
      | aws-architecture-icons | Lambda Function URL   |
      | azure                  | Function App          |

  Rule: R1 · Typing filters the items by item name or library name, ignoring case

    Scenario: E1 · a part of an item's name shows only the items that contain it
      When the operator searches the libraries for "kinesis"
      Then the results are "Kinesis", "Kinesis Data Firehose" and "Kinesis Data Streams"

    Scenario: E3 · a library's name shows every item of that library
      When the operator searches the libraries for "aws-architecture"
      Then the results are the 5 items of "aws-architecture-icons"

    Scenario: E5 · a query nothing matches says so
      When the operator searches the libraries for "zzzz"
      Then there are no results
      And the search says "No item matches zzzz"

    Scenario Outline: case and word order do not matter, every word must match
      When the operator searches the libraries for "<query>"
      Then the results are <results>

      Examples:
        | example | query           | results                                                     |
        | E2      | KINESIS         | "Kinesis", "Kinesis Data Firehose" and "Kinesis Data Streams" |
        | E4      | data stream     | "Kinesis Data Streams"                                      |
        |         | streams data    | "Kinesis Data Streams"                                      |
        |         | azure function  | "Function App"                                              |

    Scenario: an empty query shows every item, library by library
      When the operator searches the libraries for ""
      Then the results are the 6 loaded items, the "aws-architecture-icons" items before the "azure" item

    Scenario: items whose name starts with the query come first
      When the operator searches the libraries for "function"
      Then the results are "Function App" then "Lambda Function URL"

  Rule: R2 · Search covers both library roots, and a shadowed library counts once

    @cli
    Scenario: E6 · a project library and a global library are searched together
      Given the project holds "azure.excalidrawlib" with the item "Function App"
      And the global home holds "aws-architecture-icons.excalidrawlib" with the items "Lambda" and "Lambda Function URL"
      When the editor's library items are read and searched for "function"
      Then the results are "Function App" then "Lambda Function URL"

    @cli
    Scenario: E7 · a library in both roots is searched once, from the project
      Given the project and the global home each hold "azure.excalidrawlib" with an item "Function App"
      When the editor's library items are read and searched for "function app"
      Then there is exactly 1 result, from the project's "azure.excalidrawlib"

    Scenario: E8 · with no library at all, the search says where libraries go
      Given the editor has loaded no library items
      When the operator opens the library search
      Then the search names "~/.aof/diagrams/libraries" and ".aof/diagrams/libraries" as the places for ".excalidrawlib" files

  Rule: R3 · An item found by search is inserted exactly as one from the Library panel

    Scenario: E9 · a found item carries the same elements and provenance as the panel's
      When the operator searches the libraries for "kinesis" and takes the result "Kinesis"
      Then the insertion carries the same elements the Library panel offers for "Kinesis"
      And every inserted element is tagged with library "aws-architecture-icons" and item "Kinesis"
      And a multi-element item is held in one outer group

    Scenario: E10 · a dragged result uses the SDK's own library drop type
      When the operator drags the result "Kinesis"
      Then the drag carries the "application/vnd.excalidrawlib+json" type with the item's elements
