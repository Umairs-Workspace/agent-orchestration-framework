// PARSING A `.feature` FILE — the one home (milestone 52 / story 05; F-52-05-D).
//
// A suite that traces its coverage back to a Gherkin feature has to parse that feature before it
// can assert anything about the trace: the scenario titles it claims to decide, and the example
// tables whose rows it drives. Story 05 landed THREE independently-written copies of that parse,
// and they did not agree — which is not a tidiness complaint, it is the cause of a finding.
//
// WHAT DIVERGED, AND WHAT IT COST. `test/loop/work-loops-registry-census.test.mjs` anchored
// `/^\s*Examples:\s*$/` (strict — the line must be bare) while the ledger and the command suite
// anchored `/^\s*Examples:/` (permissive — a TITLE after the colon is still a table). Over the
// fifteen `@executable` features of 52/00-52/02 the strict parser finds **21 tables / 415 rows**
// and the permissive one **28 tables / 461 rows**, because 52/02's four features title their
// tables (`Examples: the declared value, and the Field a consumer receives`). That is F-52-05-D:
// the story's own refine-time figure of "24 tables" was a miscount, and a strict read reproduces
// neither number.
//
// THE PERMISSIVE ANCHOR IS THE CORRECT ONE — 28/461 is the measured truth, agreeing three ways
// (this parser over the features, the sum of the five suites' `coverage.tables`, and the ledger's
// per-feature oracle). Gherkin itself admits a title on `Examples:`; a parser that drops those
// tables silently traces fewer rows than it claims to.
//
// AND THE LATENT BUG THE COPIES CARRIED: `coverage.tables[].index` is an ORDINAL into this parse.
// Two files parsing the same feature differently do not merely disagree on a count — they
// disagree on WHICH TABLE an entry names. They agree today only by the accident that 52/03's
// features (the census's own subject) carry no titled table.
//
// DELIBERATELY NOT COLLAPSED INTO THIS HOME: `test/loop/work-loops-coverage-ledger.test.mjs` keeps its
// own implementation. That ledger's whole job is to re-derive the counts the suites assert about
// themselves, so it triangulates them from a second parser on purpose; a checker importing the
// parser it checks would agree with the suites by construction.

/** Every `Scenario:` / `Scenario Outline:` title, in file order. */
export function scenarioTitles(text) {
  return text
    .split(/\r?\n/)
    .map((line) => line.match(/^\s*Scenario(?: Outline)?:\s*(.+?)\s*$/))
    .filter(Boolean)
    .map((match) => match[1]);
}

/**
 * Every `Examples:` block, in file order, as `{header, rows}` of trimmed cells.
 *
 * The anchor is PERMISSIVE — a title after the colon is part of the table, not a reason to skip
 * it (see the header). The rows are the contiguous run of `|` lines that follows; a `|---|`
 * separator row is skipped even though this milestone's features carry none, so a later author
 * adding one cannot shift a row count in silence.
 */
export function examplesTables(text) {
  const lines = text.split(/\r?\n/);
  const tables = [];
  for (let cursor = 0; cursor < lines.length; cursor += 1) {
    if (!/^\s*Examples:/.test(lines[cursor])) continue;
    const parsed = [];
    for (let row = cursor + 1; row < lines.length && /^\s*\|/.test(lines[row]); row += 1) {
      const cells = lines[row].trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((cell) => cell.trim());
      if (cells.every((cell) => /^-*$/.test(cell))) continue;
      parsed.push(cells);
    }
    tables.push({ header: parsed[0] ?? [], rows: parsed.slice(1) });
  }
  return tables;
}
