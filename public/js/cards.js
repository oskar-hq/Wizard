/**
 * Kartendarstellung – vollständig selbst gezeichnet (CSS + eigene SVG-Symbole).
 * Bewusst schlicht: große Zahl, Farbe über Hintergrund und Symbol codiert.
 */

import { el } from './dom.js';

export const SUIT_LABELS = {
  blue: 'Blau',
  red: 'Rot',
  green: 'Grün',
  yellow: 'Gelb',
};

export const SUIT_RACES = {
  blue: 'Menschen',
  red: 'Zwerge',
  green: 'Elfen',
  yellow: 'Riesen',
};

export const SUIT_ORDER = ['blue', 'red', 'green', 'yellow'];

/** Eigene, bewusst simple Piktogramme (24×24). */
const GLYPHS = {
  // Menschen
  blue: '<circle cx="12" cy="7.2" r="3.4"/><path d="M4.6 20.4c0-4.1 3.3-6.6 7.4-6.6s7.4 2.5 7.4 6.6z"/>',
  // Zwerge – Schmiedehammer
  red: '<path d="M4.4 4.6h10.2v5.2H4.4z" rx="1"/><path d="M8.2 10.2h3l1 10.2H7.2z"/>',
  // Elfen – Blatt
  green:
    '<path d="M20.4 3.2C10.6 3.4 4.2 8 4.2 15.1c0 1.8.5 3.3 1 4.4l2-2.6c2.6-4.6 6.4-7 6.4-7-3.1 3-5 6.4-6 9.8 1 .4 1.9.6 2.9.6 5.6 0 10-5 9.9-17.1z"/>',
  // Riesen – Berge
  yellow: '<path d="M1.6 20.2 8.8 6.4l3.9 6.9 2.5-3.6 7.2 10.5z"/>',
  // Zauberer – Hut mit Funken
  wizard:
    '<path d="M12 1.8 18.6 16H5.4z"/><path d="M3.6 17.4h16.8v3.2H3.6z"/><path d="m20.6 3.4.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z"/><path d="m3.4 8.2.5 1.3 1.3.5-1.3.5-.5 1.3-.5-1.3-1.3-.5 1.3-.5z"/>',
  // Narr – Schellenkappe
  jester:
    '<path d="M12 5.4c3.2 0 5.4 2.2 5.4 5.4v3.4H6.6V10.8c0-3.2 2.2-5.4 5.4-5.4z"/><circle cx="4.2" cy="7.4" r="2.1"/><circle cx="19.8" cy="7.4" r="2.1"/><path d="M6.2 15.4h11.6v3.2H6.2z"/><circle cx="12" cy="3.2" r="1.5"/>',
};

const svg = (glyph) =>
  `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">${glyph}</svg>`;

/** SVG-Markup für ein Farb-/Sondersymbol. */
export function glyphMarkup(key) {
  return svg(GLYPHS[key] ?? '');
}

/** Kartenklasse für die Hintergrundfarbe. */
function cardVariant(card) {
  if (card.kind === 'wizard') return 'wizard';
  if (card.kind === 'jester') return 'jester';
  return card.suit;
}

/** Menschenlesbarer Name, z. B. "Rot 12". */
export function cardName(card) {
  if (!card) return '–';
  if (card.kind === 'wizard') return 'Zauberer';
  if (card.kind === 'jester') return 'Narr';
  return `${SUIT_LABELS[card.suit]} ${card.value}`;
}

/**
 * Baut ein Kartenelement.
 * @param {object} card
 * @param {object} [options]
 * @param {'div'|'button'} [options.as]
 * @param {boolean} [options.playable] Karte ist anklickbar
 * @param {boolean} [options.blocked] Karte ist regelwidrig (ausgegraut)
 * @param {(card: object) => void} [options.onSelect]
 */
export function renderCard(card, options = {}) {
  const { as = 'div', playable = false, blocked = false, onSelect } = options;
  const variant = cardVariant(card);

  const classes = ['card', `card--${variant}`];
  if (playable) classes.push('is-playable');
  if (blocked) classes.push('is-blocked');

  const node = el(`${as}.${classes.join('.')}`, {
    'data-card': card.id,
    'aria-label': cardName(card),
    ...(as === 'button' ? { type: 'button', disabled: !playable } : {}),
  });

  if (card.kind === 'suit') {
    // Farbkarten: Symbol in den Ecken, große Zahl in der Mitte.
    node.append(
      el('span.card-corner.card-corner--tl', { html: glyphMarkup(variant) }),
      el('span.card-corner.card-corner--br', { html: glyphMarkup(variant) }),
      el('span.card-value', { text: String(card.value) }),
    );
  } else {
    // Zauberer und Narr: großes Symbol plus Beschriftung – ohne Ecksymbole,
    // damit sich auf kleinen Karten nichts überlagert.
    node.append(
      el('span.card-glyph', { html: glyphMarkup(variant) }),
      el('span.card-word', { text: card.kind === 'wizard' ? 'Zauberer' : 'Narr' }),
    );
  }

  if (onSelect && playable) {
    node.addEventListener('click', () => onSelect(card));
  }
  return node;
}

/** Kleine Farbkachel für die Trumpfwahl. */
export function suitSwatch(suit) {
  return el(`span.trump-swatch.card--${suit}`, { html: glyphMarkup(suit) });
}
