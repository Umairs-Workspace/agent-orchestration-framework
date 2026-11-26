// 209/05 — the second board's adapter: cards in one JSON file beside the project's manifest.
// It shares nothing with the Azure example, and AOF is not rebuilt to run it.
import { readFileSync, writeFileSync } from "node:fs";

export function createAlternateBoard(stateFile) {
  const load = () => {
    try { return JSON.parse(readFileSync(stateFile, "utf8")); }
    catch (error) { if (error.code === "ENOENT") return { nextId: 1, cards: [] }; throw error; }
  };
  const save = state => writeFileSync(stateFile, JSON.stringify(state, null, 2) + "\n");
  const view = (card, cards) => {
    const refOf = id => cards.find(other => other.id === id)?.ref ?? null;
    const { key, parentId = null, dependsIds = [], ...rest } = card;
    return {
      ...rest, key, parentId, dependsIds,
      number: card.membership === "backlog" ? null : String(card.ref).split("/").at(-1),
      slug: String(key ?? card.ref).toLowerCase().replace(/[^a-z0-9-]+/g, "-"),
      parent: refOf(parentId), depends: dependsIds.map(refOf).filter(Boolean),
      ...(card.membership === "backlog" && { backlog: "" }),
    };
  };
  return {
    readItems({ ids, keys } = {}) {
      const { cards } = load();
      const chosen = cards.filter(card => (!ids || ids.includes(card.id)) && (!keys || keys.includes(card.key)));
      return { items: chosen.map(card => view(card, cards)), missingIds: (ids ?? []).filter(id => !cards.some(card => card.id === id)) };
    },
    readChanges({ cursor } = {}) {
      return { changes: [], cursor: cursor ?? "cards-0", coverage: true };
    },
    applyChanges({ changes }) {
      const state = load();
      const results = changes.map(change => {
        const { key, correlationKey, expectedRevision, id, ...values } = change;
        if (id == null) {
          const card = { id: state.nextId++, revision: 1, key: correlationKey ?? key, ...values };
          state.cards.push(card);
          return { key, id: card.id, revision: card.revision, outcome: "applied" };
        }
        const card = state.cards.find(row => row.id === id);
        if (!card) return { key, id, outcome: "refused", code: "card-missing" };
        if (card.revision !== expectedRevision) return { key, id, outcome: "refused", code: "card-stale" };
        Object.assign(card, values, { revision: card.revision + 1 });
        return { key, id, revision: card.revision, outcome: "applied" };
      });
      save(state);
      return { results };
    },
  };
}
