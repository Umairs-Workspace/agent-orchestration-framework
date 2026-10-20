// A dependency-free, deterministic zip writer (165/ADR-005): a file map
// (`relative path → string | bytes`) becomes one archive using the STORED method
// (method 0) and its own CRC-32 table. Entries are sorted by path, use `/`
// separators, are flagged UTF-8, and carry a fixed DOS timestamp (1980-01-01
// 00:00), so the same file map always yields the same bytes, whatever order it was
// given in. Only `node:` built-ins are imported (FF-16503). `zlib.crc32` is newer
// than the `engines` floor allows, hence the table.
import { Buffer } from "node:buffer";

const LOCAL_HEADER = 0x04034b50;
const CENTRAL_HEADER = 0x02014b50;
const END_OF_CENTRAL = 0x06054b50;
const VERSION = 20;
const UTF8_FLAG = 0x0800;
const STORED = 0;
const DOS_TIME = 0;
const DOS_DATE = (0 << 9) | (1 << 5) | 1; // 1980-01-01

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

export function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function entryPath(name) {
  if (name.length === 0 || name.startsWith("/") || name.includes("\\") || name.split("/").includes("..")) {
    throw new Error(`zipStored: "${name}" is not a relative, /-separated archive path.`);
  }
  return name;
}

// The archive bytes for a file map. Values are strings (written as UTF-8) or bytes.
export function zipStored(fileMap) {
  const entries = Object.keys(fileMap)
    .map(entryPath)
    .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))
    .map((name) => {
      const value = fileMap[name];
      const data = typeof value === "string" ? Buffer.from(value, "utf8") : Buffer.from(value);
      return { name: Buffer.from(name, "utf8"), data, crc: crc32(data) };
    });

  const locals = [];
  const centrals = [];
  let offset = 0;
  for (const entry of entries) {
    const local = Buffer.alloc(30);
    local.writeUInt32LE(LOCAL_HEADER, 0);
    local.writeUInt16LE(VERSION, 4);
    local.writeUInt16LE(UTF8_FLAG, 6);
    local.writeUInt16LE(STORED, 8);
    local.writeUInt16LE(DOS_TIME, 10);
    local.writeUInt16LE(DOS_DATE, 12);
    local.writeUInt32LE(entry.crc, 14);
    local.writeUInt32LE(entry.data.length, 18);
    local.writeUInt32LE(entry.data.length, 22);
    local.writeUInt16LE(entry.name.length, 26);
    local.writeUInt16LE(0, 28);
    locals.push(local, entry.name, entry.data);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(CENTRAL_HEADER, 0);
    central.writeUInt16LE(VERSION, 4);
    central.writeUInt16LE(VERSION, 6);
    central.writeUInt16LE(UTF8_FLAG, 8);
    central.writeUInt16LE(STORED, 10);
    central.writeUInt16LE(DOS_TIME, 12);
    central.writeUInt16LE(DOS_DATE, 14);
    central.writeUInt32LE(entry.crc, 16);
    central.writeUInt32LE(entry.data.length, 20);
    central.writeUInt32LE(entry.data.length, 24);
    central.writeUInt16LE(entry.name.length, 28);
    central.writeUInt32LE(offset, 42);
    centrals.push(central, entry.name);

    offset += local.length + entry.name.length + entry.data.length;
  }

  const centralSize = centrals.reduce((sum, part) => sum + part.length, 0);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(END_OF_CENTRAL, 0);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralSize, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, ...centrals, end]);
}
