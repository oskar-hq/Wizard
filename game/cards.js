/**
 * Kartendeck für Wizard (60 Karten).
 *
 * 4 Farben à 13 Werte (52) + 4 Zauberer + 4 Narren.
 *
 * Kartenmodell:
 *   { id: string, kind: 'suit'|'wizard'|'jester', suit: string|null, value: number|null }
 */

export const SUITS = ['blue', 'red', 'green', 'yellow'];

/** Anzeigenamen der Farben (deutsch). */
export const SUIT_LABELS = {
  blue: 'Blau',
  red: 'Rot',
  green: 'Grün',
  yellow: 'Gelb',
};

/** Die Völker hinter den Farben – rein kosmetisch. */
export const SUIT_RACES = {
  blue: 'Menschen',
  red: 'Zwerge',
  green: 'Elfen',
  yellow: 'Riesen',
};

export const KIND_LABELS = {
  wizard: 'Zauberer',
  jester: 'Narr',
};

export const CARDS_PER_SUIT = 13;
export const WIZARD_COUNT = 4;
export const JESTER_COUNT = 4;
export const DECK_SIZE = SUITS.length * CARDS_PER_SUIT + WIZARD_COUNT + JESTER_COUNT; // 60

/** Erzeugt ein frisches, ungemischtes Deck mit 60 Karten. */
export function createDeck() {
  const deck = [];
  for (const suit of SUITS) {
    for (let value = 1; value <= CARDS_PER_SUIT; value++) {
      deck.push({ id: `${suit}-${value}`, kind: 'suit', suit, value });
    }
  }
  for (let i = 1; i <= WIZARD_COUNT; i++) {
    deck.push({ id: `wizard-${i}`, kind: 'wizard', suit: null, value: null });
  }
  for (let i = 1; i <= JESTER_COUNT; i++) {
    deck.push({ id: `jester-${i}`, kind: 'jester', suit: null, value: null });
  }
  return deck;
}

export const isWizard = (card) => card.kind === 'wizard';
export const isJester = (card) => card.kind === 'jester';
export const isSuitCard = (card) => card.kind === 'suit';

/** Menschenlesbarer Kartenname, z. B. "Rot 12" oder "Zauberer". */
export function cardName(card) {
  if (!card) return '–';
  if (card.kind === 'wizard') return 'Zauberer';
  if (card.kind === 'jester') return 'Narr';
  return `${SUIT_LABELS[card.suit]} ${card.value}`;
}
