// Construction never calls runtime callbacks. They become usable together only
// after all services and the registry exist; closing revokes them together.
export function createApplicationLifetime() {
  let state = 'constructing';
  const resources = new Set();
  let closing;
  function assertReady() {
    if (state !== 'ready') throw new Error(`Application is ${state}; runtime operations require a ready application.`);
  }
  function ready() {
    if (state !== 'constructing') throw new Error(`Cannot finish application construction in state ${state}.`);
    state = 'ready';
  }
  function own(resource, method = 'close') {
    assertReady();
    if (!resource || typeof resource[method] !== 'function') throw new TypeError(`An owned resource must expose ${method}().`);
    const close = resource[method].bind(resource);
    const entry = { close: (...args) => resource[method](...args) };
    let closed = false;
    resource[method] = (...args) => {
      if (closed) return;
      closed = true;
      resources.delete(entry);
      return close(...args);
    };
    resources.add(entry);
    return resource;
  }
  function open(openResource) {
    return start(openResource, 'close');
  }
  function start(startResource, method = 'stop') {
    return async (...args) => {
      assertReady();
      const resource = await startResource(...args);
      // A refused launcher has no running resource to own.
      if (typeof resource?.[method] !== 'function') {
        if (resource?.refused === true) return resource;
        throw new TypeError(`An owned resource must expose ${method}().`);
      }
      if (state !== 'ready') {
        await resource[method]();
        assertReady();
      }
      return own(resource, method);
    };
  }
  function server(serve) {
    return async (...args) => {
      assertReady();
      const result = await serve(...args);
      const http = result.server;
      // closeAllConnections excludes upgraded sockets. Track connections so a
      // terminal WebSocket cannot keep shutdown waiting or outlive its owner.
      const sockets = new Set();
      const connected = socket => {
        sockets.add(socket);
        socket.once('close', () => sockets.delete(socket));
      };
      http.on('connection', connected);
      const entry = { close: () => new Promise((resolve, reject) => {
        for (const socket of sockets) socket.destroy();
        if (!http.listening) { resolve(); return; }
        http.closeAllConnections?.();
        http.close(error => error ? reject(error) : resolve());
      }) };
      if (state !== 'ready') {
        await entry.close();
        assertReady();
      }
      resources.add(entry);
      http.once('close', () => {
        resources.delete(entry);
        http.off('connection', connected);
      });
      return result;
    };
  }
  function close() {
    if (closing) return closing;
    state = 'closed';
    closing = (async () => {
      const failures = [];
      for (const resource of [...resources].reverse()) {
        try { await resource.close(); }
        catch (error) { failures.push(error); }
      }
      if (failures.length) throw new AggregateError(failures, 'Failed to close application resources.');
    })();
    return closing;
  }
  return { assertReady, ready, open, start, server, close };
}
