import { spawn as spawnChild } from "node:child_process";

// THE ASYNC RUNNER (81/00). The default `spawn` seam: it answers the SAME shape `spawnSync`
// answered — a status, the two captured streams, and the `error`/`signal` channel carrying
// the three ways a spawn can end — so `runRubric` below reads one shape, and the injected
// stubs the shipped suites drive the grade with are unchanged.
//
// WHAT `spawnSync` GAVE FOR FREE AND IS RE-ESTABLISHED HERE BY HAND, because losing any of
// them silently would be a regression the async spawn paid for:
//
//   • the DEADLINE — a timer that force-kills with the declared signal, reported as
//     `ETIMEDOUT` so `compileGrade` still reaches `runner-timeout` and no tenth code is
//     coined for the async path;
//   • the CAPTURE CEILING — `spawn` has no `maxBuffer`, so the captured length is counted
//     and a child that out-talks it is killed and reported as `ENOBUFS`, which is the
//     outcome the shipped code already discards rather than grades;
//   • the ENCODING — `spawn` decodes nothing, so both streams are set to utf8 rather than
//     concatenating Buffers into a string by accident.
//
// It resolves rather than rejects. A spawn that could not happen is an OBSERVATION about the
// runner (`runner-spawn-failed`), never an exception thrown at the loop — the shipped
// contract, kept.
export function spawnRubricAsync(program, args, options = {}) {
  return new Promise((resolve) => {
    const outChunks = [];
    const errChunks = [];
    const decode = (chunks) => Buffer.concat(chunks).toString("utf8");
    let captured = 0;
    let timer = null;
    let expired = false;
    let overflowed = false;
    let settled = false;

    const settle = (value) => {
      if (settled) return;
      settled = true;
      if (timer != null) clearTimeout(timer);
      resolve(value);
    };

    let child;
    try {
      child = spawnChild(program, args, {
        cwd: options.cwd,
        env: options.env,
        stdio: options.stdio,
        shell: options.shell,
      });
    } catch (error) {
      // A synchronous throw is the same fact as an asynchronous `error` event.
      settle({ status: null, stdout: "", stderr: "", error, signal: null });
      return;
    }

    child.once("error", (error) => settle({ status: null, stdout: decode(outChunks), stderr: decode(errChunks), error, signal: null }));

    // THE CEILING IS COUNTED IN BYTES, AS ITS NAME SAYS AND AS `spawnSync`'s `maxBuffer` did.
    // The chunks are therefore kept as BUFFERS and decoded once at the end, rather than
    // decoded per chunk and counted by string length: `setEncoding` would make the count
    // UTF-16 code units, so a report of multi-byte text would be allowed several times the
    // declared budget — the ceiling silently becoming a different, larger ceiling. Decoding
    // the concatenation also settles a multi-byte character split across a chunk boundary,
    // which per-chunk decoding only gets right by accident of where the kernel split it.
    const capture = (stream, chunks) => {
      if (stream == null) return;
      stream.on("data", (chunk) => {
        captured += chunk.length;
        // THE CHILD RAN AND OUT-TALKED THE CEILING. Past it nothing further is kept — a
        // report cut off mid-stream is the vacuous green this milestone exists to refuse —
        // and the child is stopped rather than left to fill a buffer nobody will read.
        if (captured > options.maxBuffer) {
          if (!overflowed) {
            overflowed = true;
            child.kill("SIGKILL");
          }
          return;
        }
        chunks.push(chunk);
      });
    };
    capture(child.stdout, outChunks);
    capture(child.stderr, errChunks);

    if (Number.isFinite(options.timeout) && options.timeout > 0) {
      timer = setTimeout(() => {
        expired = true;
        child.kill(options.killSignal ?? "SIGKILL");
      }, options.timeout);
    }

    // `close` rather than `exit`: the streams are drained by then, so a runner whose last
    // write lands as it exits is still captured.
    child.once("close", (status, signal) => {
      settle({
        // A killed child's status is not a result. `spawnSync` reports null for both, and
        // `runRubric` reads the outcome off the error/signal channel either way.
        status: expired || overflowed ? null : status,
        stdout: decode(outChunks),
        stderr: decode(errChunks),
        error: expired
          ? Object.assign(new Error("the runner did not finish within its deadline"), { code: "ETIMEDOUT" })
          : overflowed
            ? Object.assign(new Error("the runner emitted more than the capture ceiling"), { code: "ENOBUFS" })
            : null,
        signal: expired ? options.killSignal ?? "SIGKILL" : signal,
      });
    });
  });
}

