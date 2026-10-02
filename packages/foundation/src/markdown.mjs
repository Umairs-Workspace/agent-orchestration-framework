// HTML stripping for markdown text, done to a fixed point. One pass of `<!--[\s\S]*?-->` can leave a
// comment behind: removing an inner comment can join the text around it into a new `<!--`. So each
// strip repeats until the text stops changing. Comments also close on `--!>`, which browsers accept
// as a comment end, so a strip that only knows `-->` would leave the rest of such a comment in place.
export function stripHtmlComments(text) {
  let current = String(text ?? "");
  let previous;
  do {
    previous = current;
    current = htmlCommentsOnce(current);
  } while (current !== previous);
  return current;
}

export function stripHtmlTags(text) {
  let current = String(text ?? "");
  let previous;
  do {
    previous = current;
    current = htmlTagsOnce(current);
  } while (current !== previous);
  return current;
}

// One linear pass removing `<!-- … -->` / `<!-- … --!>` spans — exactly what `/<!--[\s\S]*?--!?>/g` removes,
// without the regex's quadratic rescans when many `<!--` have no end.
function htmlCommentsOnce(text) {
  let out = "";
  let at = 0;
  for (;;) {
    const open = text.indexOf("<!--", at);
    if (open < 0) return out + text.slice(at);
    let end = -1;
    for (let dash = text.indexOf("--", open + 4); dash >= 0; dash = text.indexOf("--", dash + 1)) {
      if (text[dash + 2] === ">") { end = dash + 3; break; }
      if (text[dash + 2] === "!" && text[dash + 3] === ">") { end = dash + 4; break; }
    }
    if (end < 0) return out + text.slice(at);
    out += text.slice(at, open);
    at = end;
  }
}

// One linear pass removing `<…>` spans — exactly what `/<[^>]+>/g` removes, without its quadratic rescans.
function htmlTagsOnce(text) {
  let out = "";
  let at = 0;
  for (;;) {
    const open = text.indexOf("<", at);
    if (open < 0) return out + text.slice(at);
    const close = text.indexOf(">", open + 1);
    if (close < 0) return out + text.slice(at);
    if (close === open + 1) { out += text.slice(at, open + 1); at = open + 1; continue; }
    out += text.slice(at, open);
    at = close + 1;
  }
}
