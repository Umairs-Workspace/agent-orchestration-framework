// HTML stripping for markdown text, done to a fixed point. One pass of `<!--[\s\S]*?-->` can leave a
// comment behind: removing an inner comment can join the text around it into a new `<!--`. So each
// strip repeats until the text stops changing. Comments also close on `--!>`, which browsers accept
// as a comment end, so a strip that only knows `-->` would leave the rest of such a comment in place.
export function stripHtmlComments(text) {
  let current = String(text ?? "");
  let previous;
  do {
    previous = current;
    current = current.replace(/<!--[\s\S]*?--!?>/g, "");
  } while (current !== previous);
  return current;
}

export function stripHtmlTags(text) {
  let current = String(text ?? "");
  let previous;
  do {
    previous = current;
    current = current.replace(/<[^>]+>/g, "");
  } while (current !== previous);
  return current;
}
