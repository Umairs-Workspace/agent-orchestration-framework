# 02 · My own items read from my files — Outcome

## Delivered

### Own records answer from disk
`aof work find`, `list` and `next` answer a record this node reported from its local file; a cached row overlays a local record only when another node reported it and the file has not changed since this node observed it, decided by the one `cacheAnswers` predicate (FF-16402).

### Doctor reads the way the stream does
`aof work doctor`'s overlay asks the same `cacheAnswers`, with this node identified by the id the publisher stamps rows with, so its coherence group and the stream view judge one identity; own rows no longer raise `cache-status-divergence`.

### Store-only items are still listed
An item with no local folder (work another machine owns) is still listed from the store.
