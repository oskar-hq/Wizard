import { createDeck } from '../game/cards.js';

const ALL = createDeck();

/** Holt eine Karte per ID, z. B. C('red-7'), C('wizard-1'), C('jester-2'). */
export function C(id) {
  const card = ALL.find((c) => c.id === id);
  if (!card) throw new Error(`Unbekannte Karte: ${id}`);
  return { ...card };
}

/** Mehrere Karten auf einmal. */
export const CS = (...ids) => ids.map(C);

/**
 * Baut ein 60-Karten-Deck so, dass beim Geben genau die gewünschten Hände
 * entstehen und danach die gewünschten Karten oben auf dem Reststapel liegen.
 *
 * @param {object[]} hands  hands[playerIndex] = Karten dieses Spielers
 * @param {number} dealerIndex
 * @param {object[]} top    Karten des Reststapels (top[0] = Trumpfkarte)
 */
export function riggedDeck({ hands, dealerIndex = 0, top = [] }) {
  const n = hands.length;
  const r = hands[0].length;
  const sequence = [];
  for (let c = 0; c < r; c++) {
    for (let step = 0; step < n; step++) {
      sequence.push(hands[(dealerIndex + 1 + step) % n][c]);
    }
  }
  const used = new Set([...sequence, ...top].map((c) => c.id));
  const rest = ALL.filter((c) => !used.has(c.id)).map((c) => ({ ...c }));
  const deck = [...sequence, ...top, ...rest];
  if (deck.length !== 60) {
    throw new Error(`Rigged deck hat ${deck.length} Karten statt 60.`);
  }
  return deck;
}

/** Baut einen Stich aus [spielerId, kartenId]-Paaren. */
export function trickOf(...pairs) {
  return pairs.map(([playerId, cardId]) => ({ playerId, card: C(cardId) }));
}
