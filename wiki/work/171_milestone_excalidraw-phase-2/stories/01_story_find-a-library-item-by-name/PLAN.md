# 01 · Find a library item by name — build plan

## Mechanism

**A filter, then the SDK's own drop.** `library-search.mjs` is pure: given the `LibraryEntry`
list the editor already holds (`{ library, item, id, elements }`, from the `libraries` action) and
a query, it splits the query into words, keeps the entries whose `item + " " + library` contains
every word case-insensitively, and orders them prefix-of-item-name first, then the rest, each group
in the order loaded (library, then item). The empty query returns everything in load order.

`LibrarySearch.tsx` is a `Sidebar.Tab` inside the SDK's `DefaultSidebar`, with its trigger in
`DefaultSidebar.TabTriggers`, so the SDK keeps owning the sidebar's open state and the Library tab
is untouched. A tile's payload is the entry from `libraryItemsFor(libraries)` with the same id —
the one tagging path — never a re-tagged copy. Drag sets
`dataTransfer.setData(MIME_TYPES.excalidrawlib, serializeLibraryAsJSON([item]))` so the canvas's own
drop handler inserts it; click calls the same insertion at the viewport centre (the SDK's
`viewportCoordsToSceneCoords` of the canvas centre) through `updateScene`, regenerating ids the way
the SDK's library insertion does (`duplicateElements`). Previews render with `exportToSvg` per
tile, lazily through an `IntersectionObserver`, cached by entry id.

Feasibility to check first: whether 0.18 exports `serializeLibraryAsJSON` and a library-insertion
helper. If it does not, the click path builds the insertion from `libraryItemsFor`'s elements with
fresh ids and one fresh outer group, and the drag path still uses the MIME type.

## Verification step

Serve a throwaway project (`aof work ui`) with a 30-item `.excalidrawlib` in an isolated
`AOF_GLOBAL_HOME`, open `/diagram?…`, open Find, type "kin": only matches remain. Click one and
drag another, Save, then read the Mermaid view: both are `%% aof:lib` lines. Read the screenshot
of the tab before calling it green. Then `yarn ui:build`.

## Out of scope

- Searching inside an item's elements, tags or keywords — library items carry only names.
- Editing or removing library items from search.
- Any server change: the `libraries` action already answers both roots with shadowing.
