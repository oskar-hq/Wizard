/**
 * Kartendesigns.
 *
 * Alle Stile arbeiten mit derselben Karten-Struktur; umgeschaltet wird per
 * `data-deck`-Attribut am <html>-Element, den Rest macht CSS. Das ist eine
 * persönliche Einstellung – jeder am Tisch kann ein anderes Design fahren.
 */

import { el, fill } from './dom.js';
import { renderCard, setActiveDeck } from './cards.js';

export const DECKS = [
  {
    id: 'line',
    name: 'Linien',
    text: 'Helle Karten, geometrische Linienzeichnung in vier Farben. Der Standard.',
  },
  {
    id: 'solid',
    name: 'Vollfarbe',
    text: 'Kräftige Farbflächen mit großer Zahl – am schnellsten zu lesen, auch am Handy.',
  },
  {
    id: 'night',
    name: 'Nacht',
    text: 'Dunkle Karten mit leuchtenden Linien, passend zum dunklen Tisch.',
  },
  {
    id: 'redblack',
    name: 'Schwarz-Rot',
    text: 'Nur Schwarz und Rot wie ein klassisches Blatt: Rot und Gelb rot, Blau und Grün schwarz.',
  },
];

export const DEFAULT_DECK = 'line';

const DECK_IDS = new Set(DECKS.map((deck) => deck.id));

export function isDeckId(id) {
  return DECK_IDS.has(id);
}

/** Setzt das Design für die ganze Seite. */
export function applyDeck(id) {
  const deck = isDeckId(id) ? id : DEFAULT_DECK;
  document.documentElement.dataset.deck = deck;
  setActiveDeck(deck);
  return deck;
}

/** Beispielkarten für die Vorschau in der Auswahl. */
const SAMPLES = [
  { id: 'red-13', kind: 'suit', suit: 'red', value: 13 },
  { id: 'blue-7', kind: 'suit', suit: 'blue', value: 7 },
  { id: 'wizard-1', kind: 'wizard', suit: null, value: null },
];

/**
 * Baut die Auswahlliste. Jede Option zeigt eine echte Vorschau im jeweiligen
 * Design – dafür bekommt der Vorschaubehälter sein eigenes `data-deck`.
 */
export function renderDeckPicker(container, current, onPick) {
  fill(
    container,
    DECKS.map((deck) =>
      el(
        `button.deck-option${deck.id === current ? '.is-active' : ''}`,
        { type: 'button', onclick: () => onPick(deck.id) },
        [
          el(
            'span.deck-preview',
            {},
            SAMPLES.map((card) => renderCard(card, { deck: deck.id })),
          ),
          el('span.deck-meta', {}, [
            el('span.deck-name', { text: deck.name }),
            el('span.deck-text', { text: deck.text }),
          ]),
        ],
      ),
    ),
  );
}
