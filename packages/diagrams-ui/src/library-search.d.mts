// Type declarations for library-search.mjs (library search's headless half — @aof/diagrams-ui).

export type LibraryEntry = { library: string; item: string; id: string; elements: ReadonlyArray<Record<string, unknown>> };
export type SearchResult<T extends LibraryEntry = LibraryEntry> = { entry: T; index: number };
export declare const LIBRARY_MIME: "application/vnd.excalidrawlib+json";
export declare const NO_LIBRARIES: string;
export declare function noMatch(query: string): string;
export declare function searchLibraries<T extends LibraryEntry>(entries: readonly T[] | null | undefined, query: string): SearchResult<T>[];
export declare function searchSummary(entries: readonly LibraryEntry[] | null | undefined, query: string, results: readonly SearchResult[]): string;
export declare function insertionFor<I>(result: { index: number } | null | undefined, libraryItems: readonly I[] | null | undefined): I | null;
export declare function libraryDrag(item: unknown, source: string): { type: "application/vnd.excalidrawlib+json"; data: string };
