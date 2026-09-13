import { readFile, rename, rm } from "node:fs/promises";
import path from "node:path";

import { reportDegrade } from "./degrade.mjs";
import { heartbeat, readRuns, runsDir } from "./run-store.mjs";

const HEARTBEAT_QUEUE = ".heartbeats.ndjson";
const HEARTBEAT_BATCH = `${HEARTBEAT_QUEUE}.batch`;

// The hook appends facts without opening the store. Runtime readers consume those
// facts before making liveness decisions, keeping the frozen run-store unchanged.
export async function consumeHeartbeatQueue(item) {
  const queue = path.join(runsDir(item), HEARTBEAT_QUEUE);
  const batch = path.join(runsDir(item), HEARTBEAT_BATCH);
  try {
    await rename(queue, batch);
  } catch (error) {
    if (error?.code !== "ENOENT") reportDegrade("run-heartbeat", error);
    try {
      await readFile(batch, "utf8");
    } catch (batchError) {
      if (batchError?.code !== "ENOENT") reportDegrade("run-heartbeat", batchError);
      return;
    }
  }

  let text;
  try {
    text = await readFile(batch, "utf8");
  } catch (error) {
    reportDegrade("run-heartbeat", error);
    return;
  }

  const latest = new Map();
  for (const raw of text.split("\n")) {
    if (raw.trim() === "") continue;
    try {
      const event = JSON.parse(raw);
      if (typeof event?.runId !== "string" || typeof event?.at !== "string" || !Number.isFinite(Date.parse(event.at))) continue;
      const prior = latest.get(event.runId);
      if (prior == null || Date.parse(event.at) > Date.parse(prior)) latest.set(event.runId, event.at);
    } catch (error) {
      reportDegrade("run-heartbeat", error);
    }
  }

  const records = new Map((await readRuns(item)).map((record) => [record.runId, record]));
  for (const [runId, at] of latest) {
    const current = records.get(runId);
    if (current?.state !== "running") continue;
    if (current.heartbeatAt != null && Date.parse(current.heartbeatAt) >= Date.parse(at)) continue;
    try {
      await heartbeat(item, runId, { now: at });
    } catch (error) {
      if (error?.code !== "ENOENT") reportDegrade("run-heartbeat", error);
    }
  }
  await rm(batch, { force: true });
}

export async function readConsumedHeartbeatAt(item, runId) {
  await consumeHeartbeatQueue(item);
  return (await readRuns(item)).find((record) => record.runId === runId)?.heartbeatAt ?? null;
}
