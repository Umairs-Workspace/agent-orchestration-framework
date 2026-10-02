// trimRun(value, chars, { start, end }) — strip every leading and/or trailing character found in `chars`
// with a linear scan. An end-anchored regex (`/-+$/`, `/[\\/]+$/`) retries from each position of a long run
// that is NOT at the end, which is quadratic on hostile input; this never rescans.
export function trimRun(value, chars, { start = true, end = true } = {}) {
  let from = 0;
  let to = value.length;
  if (start) while (from < to && chars.includes(value[from])) from += 1;
  if (end) while (to > from && chars.includes(value[to - 1])) to -= 1;
  return value.slice(from, to);
}
