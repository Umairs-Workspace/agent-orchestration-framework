// The macOS login autostart's LaunchAgent plist (175/ADR-004 §1) — rendered and read back as
// text. Pure: no I/O and no spawn, so the autostart act writes the file through its own
// injected seam, and FF-12607's sweep stays quiet over this module.
//
// The plist is the narrow subset launchd needs — a top-level dict of strings, booleans, an
// array of strings and one nested dict — so it is rendered by hand rather than through a
// plist library, and read back by a reader of exactly that subset.

// renderLaunchAgent({ label, executable, path }) -> the plist XML.
//   RunAtLoad + LimitLoadToSessionType Aqua: start at login, inside the GUI session, where
//     the login keychain (and so `claude`'s credentials) is unlocked (RESEARCH P1, P4);
//   KeepAlive false: Quit stays quit, as with the Windows Run key;
//   EnvironmentVariables.PATH: the installing shell's PATH, because launchd hands a job
//     `/usr/bin:/bin:/usr/sbin:/sbin` and `claude` is spawned by name.
export function renderLaunchAgent({ label, executable, path }) {
  const string = (value) => `<string>${escapeXml(value)}</string>`;
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">',
    '<plist version="1.0">',
    "<dict>",
    "  <key>Label</key>",
    `  ${string(label)}`,
    "  <key>ProgramArguments</key>",
    "  <array>",
    `    ${string(executable)}`,
    "  </array>",
    "  <key>RunAtLoad</key>",
    "  <true/>",
    "  <key>LimitLoadToSessionType</key>",
    "  <string>Aqua</string>",
    "  <key>ProcessType</key>",
    "  <string>Interactive</string>",
    "  <key>KeepAlive</key>",
    "  <false/>",
    "  <key>EnvironmentVariables</key>",
    "  <dict>",
    "    <key>PATH</key>",
    `    ${string(path)}`,
    "  </dict>",
    "</dict>",
    "</plist>",
    "",
  ].join("\n");
}

// parseLaunchAgent(xml) -> the plist's top-level dict as a plain object, or null when the text
// is not a plist this module would have written. Strings, `<true/>`/`<false/>`, arrays and
// nested dicts are read; anything else makes the whole answer null rather than a partial one.
export function parseLaunchAgent(xml) {
  if (typeof xml !== "string") return null;
  const tokens = [...xml.matchAll(/<(\/?)(dict|array|key|string|true|false)(\/?)>([^<]*)/g)];
  let index = tokens.findIndex((t) => t[2] === "dict" && t[1] === "");
  if (index < 0) return null;

  const value = () => {
    const [, close, tag, selfClosing, text] = tokens[index] ?? [];
    if (close) return undefined;
    index += 1;
    if (tag === "true" && selfClosing) return true;
    if (tag === "false" && selfClosing) return false;
    if (tag === "string") {
      index += 1; // its closing tag
      return unescapeXml(text);
    }
    if (tag === "array") {
      const items = [];
      while (tokens[index] && !(tokens[index][1] && tokens[index][2] === "array")) {
        const item = value();
        if (item === undefined) return undefined;
        items.push(item);
      }
      index += 1;
      return items;
    }
    if (tag === "dict") {
      const dict = {};
      while (tokens[index] && !(tokens[index][1] && tokens[index][2] === "dict")) {
        const [, close, keyTag, , keyText] = tokens[index];
        if (close || keyTag !== "key") return undefined;
        index += 2; // <key> and </key>
        const item = value();
        if (item === undefined) return undefined;
        dict[unescapeXml(keyText)] = item;
      }
      index += 1;
      return dict;
    }
    return undefined;
  };

  const dict = value();
  return dict && typeof dict === "object" && !Array.isArray(dict) ? dict : null;
}

// readLaunchAgentPath(xml) -> the PATH the LaunchAgent hands its job, or null when the plist
// carries none. The preflight probes the daemons' environment through it (175/ADR-004 §4).
export function readLaunchAgentPath(xml) {
  const path = parseLaunchAgent(xml)?.EnvironmentVariables?.PATH;
  return typeof path === "string" ? path : null;
}

function escapeXml(value) {
  return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function unescapeXml(value) {
  return String(value).replaceAll("&lt;", "<").replaceAll("&gt;", ">").replaceAll("&amp;", "&");
}
