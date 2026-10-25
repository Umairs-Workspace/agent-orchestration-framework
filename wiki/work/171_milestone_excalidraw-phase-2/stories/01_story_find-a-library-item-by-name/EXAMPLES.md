# 171/01 · Find a library item by name — example map

## R1 · Typing filters the items by item name or library name, ignoring case
- E1 · With the AWS Architecture Icons set loaded (249 items), the operator types "kinesis": only items whose names contain "Kinesis" are shown, such as "Kinesis" and "Kinesis Data Firehose" [proposed]
- E2 · The operator types "KINESIS": the same items are shown as for "kinesis" [proposed]
- E3 · The operator types "aws-architecture": every item of the `aws-architecture-icons` library is shown, because the library's name matches [proposed]
- E4 · The operator types "data stream": only items whose item or library name contains both words are shown [proposed]
- E5 · The operator types "zzzz": no tile is shown and the tab says "No item matches zzzz" [proposed]

## R2 · Search covers both library roots, and a shadowed library counts once
- E6 · `azure.excalidrawlib` is in the project and `aws-architecture-icons.excalidrawlib` is in the global home: typing "function" finds "Function App" from azure and every AWS item named with "Function" [proposed]
- E7 · Both roots hold an `azure.excalidrawlib`: typing "function app" shows one "Function App", the project's [proposed]
- E8 · Neither root holds a library: the tab says where to put `.excalidrawlib` files [proposed]

## R3 · An item found by search is inserted exactly as one from the Library panel
- E9 · The operator clicks "Kinesis": it is placed at the centre of the view, and after Save the Mermaid view reads `%% aof:lib n1 aws-architecture-icons/"Kinesis"` [proposed]
- E10 · The operator drags "Kinesis" onto the canvas: it lands where it is dropped, with the same library line after Save [proposed]

## Questions
- Q1 · technical · defaulted ARCHITECTURE.md#adr-002 · In what order are matches shown? Items whose name starts with the query first, then the other matches, each group in library order then item name.
- Q2 · technical · defaulted ARCHITECTURE.md#adr-002 · Is the search done in the browser or by a new server action? In the browser, over the items the editor already loads.
