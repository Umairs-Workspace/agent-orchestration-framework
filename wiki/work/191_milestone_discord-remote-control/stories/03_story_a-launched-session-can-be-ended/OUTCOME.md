# 191/03 · A launched session can be ended — Outcome

## Delivered

### The end lane has both ends
`SESSION_END_KIND` and its frame builder live in the session lane's one home. The worker client reads it, and the router sends an end for the control's own node to its local handler (FF-19104).

### A node ends only a session it launched
`handler.end(sessionId)` kills the PTY of a session this node's handler opened, and refuses any other id. A `claude` started by hand in a terminal is never ended from the mesh.

### An end is confirmed from presence
`aof mesh session end <session>` reports the session ended once presence no longer lists it. When it is still listed after 15 seconds, it reports the request sent but unconfirmed (`session-end-unconfirmed`).

### A session has no idle limit
A launched session runs until it is ended, until `claude` exits, or until its node's desktop app quits or restarts.
