/**
 * Kartendarstellung – vollständig selbst gezeichnet (CSS + eigene SVG-Grafik).
 *
 * Gestaltung: helle Kartenfläche, kräftige geometrische Linienzeichnung in der
 * Farbe des Volkes. Zahlenkarten tragen die klassische Symbolanordnung, die
 * hohen Karten (11–13) sowie Zauberer und Narr abstrakte Figuren.
 *
 * Alle Figuren sind aus geraden Linien, Kreisen und Dreiecken aufgebaut und
 * bewusst reduziert – keine Vorlagen, keine fremden Illustrationen.
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

/**
 * Das aktuell gewählte Kartendesign. Es landet als Klasse auf jeder Karte,
 * damit auch die Vorschau in der Auswahl ein anderes Design zeigen kann als
 * der Rest der Seite.
 */
let activeDeck = 'line';

export function setActiveDeck(id) {
  activeDeck = id || 'line';
}

export function getActiveDeck() {
  return activeDeck;
}

// --------------------------------------------------------------- Symbole

/** Volks-Symbole in einem 24×24-Feld, als gefüllte Formen. */
const GLYPHS = {
  // Menschen – Gestalt
  blue: '<circle cx="12" cy="6.4" r="3.7"/><path d="M12 11.6c-4.5 0-7.6 3.5-7.6 8.4 0 .7.5 1.2 1.2 1.2h12.8c.7 0 1.2-.5 1.2-1.2 0-4.9-3.1-8.4-7.6-8.4z"/>',
  // Zwerge – Schmiedehammer
  red: '<path d="M4 4.4h16v6H4z"/><path d="M9.7 11.6h4.6L13.1 21h-2.2z"/>',
  // Elfen – Blatt
  green:
    '<path d="M20.6 2.6C10.4 3 3.9 7.8 3.9 15.1c0 1.9.5 3.5 1.1 4.7l2.2-2.9c2.7-4.8 6.7-7.3 6.7-7.3-3.3 3.2-5.3 6.7-6.4 10.3 1.1.4 2.1.6 3.2.6 5.9 0 10.1-5.3 9.9-17.9z"/>',
  // Riesen – Bergmassiv
  yellow: '<path d="M1.4 20.8 8.9 6.2l4.2 7.4 2.6-3.8 7.9 11z"/>',
  // Zauberer – Spitzhut mit Funken
  wizard:
    '<path d="M12 1.6 19 16.4H5z"/><path d="M3.4 17.8h17.2v3.4H3.4z"/><path d="m21 2.6.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z"/>',
  // Narr – Schellenkappe
  jester:
    '<path d="M12 5.2c3.3 0 5.6 2.3 5.6 5.6v3.6H6.4v-3.6c0-3.3 2.3-5.6 5.6-5.6z"/><circle cx="3.9" cy="7.2" r="2.2"/><circle cx="20.1" cy="7.2" r="2.2"/><path d="M6 15.4h12v3.4H6z"/><circle cx="12" cy="2.9" r="1.6"/>',
};

const svgTag = (inner, viewBox = '0 0 24 24', cls = '') =>
  `<svg${cls ? ` class="${cls}"` : ''} viewBox="${viewBox}" aria-hidden="true" focusable="false">${inner}</svg>`;

/** SVG-Markup für ein Volks-/Sondersymbol. */
export function glyphMarkup(key) {
  return svgTag(GLYPHS[key] ?? '');
}

// -------------------------------------------------- Symbolanordnung (1–10)

/** Spaltenmitten und Zeilenhöhen im 100×140-Kartenfeld. */
const COL = { left: 33, center: 50, right: 67 };
const ROW = { top: 33, upper: 52, middle: 70, lower: 88, bottom: 107 };

/** Klassische Anordnung der Symbole je Wert. */
const PIP_LAYOUT = {
  2: [[COL.center, ROW.top], [COL.center, ROW.bottom]],
  3: [[COL.center, ROW.top], [COL.center, ROW.middle], [COL.center, ROW.bottom]],
  4: [
    [COL.left, ROW.top], [COL.right, ROW.top],
    [COL.left, ROW.bottom], [COL.right, ROW.bottom],
  ],
  5: [
    [COL.left, ROW.top], [COL.right, ROW.top],
    [COL.center, ROW.middle],
    [COL.left, ROW.bottom], [COL.right, ROW.bottom],
  ],
  6: [
    [COL.left, ROW.top], [COL.right, ROW.top],
    [COL.left, ROW.middle], [COL.right, ROW.middle],
    [COL.left, ROW.bottom], [COL.right, ROW.bottom],
  ],
  7: [
    [COL.left, ROW.top], [COL.right, ROW.top],
    [COL.center, 51.5],
    [COL.left, ROW.middle], [COL.right, ROW.middle],
    [COL.left, ROW.bottom], [COL.right, ROW.bottom],
  ],
  8: [
    [COL.left, ROW.top], [COL.right, ROW.top],
    [COL.center, 51.5],
    [COL.left, ROW.middle], [COL.right, ROW.middle],
    [COL.center, 88.5],
    [COL.left, ROW.bottom], [COL.right, ROW.bottom],
  ],
  9: [
    [COL.left, ROW.top], [COL.right, ROW.top],
    [COL.left, ROW.upper], [COL.right, ROW.upper],
    [COL.center, ROW.middle],
    [COL.left, ROW.lower], [COL.right, ROW.lower],
    [COL.left, ROW.bottom], [COL.right, ROW.bottom],
  ],
  10: [
    [COL.left, ROW.top], [COL.right, ROW.top],
    [COL.left, ROW.upper], [COL.right, ROW.upper],
    [COL.center, 42.5],
    [COL.left, ROW.lower], [COL.right, ROW.lower],
    [COL.center, 97.5],
    [COL.left, ROW.bottom], [COL.right, ROW.bottom],
  ],
};

/** Ein einzelnes Symbol; in der unteren Kartenhälfte auf dem Kopf. */
function pip(suit, x, y, scale = 0.72) {
  const flip = y > 70 ? ' rotate(180)' : '';
  return (
    `<g class="art-fill" transform="translate(${x} ${y})${flip} scale(${scale}) translate(-12 -12)">` +
    `${GLYPHS[suit]}</g>`
  );
}

/** Die Eins bekommt ein einzelnes großes Symbol im Zierring. */
function aceArt(suit) {
  return (
    '<circle class="art-accent-line" cx="50" cy="70" r="30" stroke-dasharray="3 6" />' +
    '<circle class="art-line" cx="50" cy="70" r="24" />' +
    pip(suit, 50, 70, 1.25)
  );
}

function numberArt(card) {
  if (card.value === 1) return aceArt(card.suit);
  const layout = PIP_LAYOUT[card.value] ?? [];
  return layout.map(([x, y]) => pip(card.suit, x, y)).join('');
}

// ------------------------------------------------------- Figuren (11–13)

/**
 * Die hohen Karten tragen aufrechte Figuren, die die ganze Kartenfläche
 * nutzen – auf Bildschirmgröße bleibt so mehr erkennbar als bei den
 * gespiegelten Halbfiguren echter Spielkarten.
 */
const COURT_ART = {
  // 11 – Späher: Helm mit Federbusch, Speer
  11:
    // Speer
    '<path class="art-line" d="M82 104V36" />' +
    '<path class="art-fill" d="M82 18l6 15H76z" />' +
    '<path class="art-line" d="M75 40h14" />' +
    // Federbusch
    '<path class="art-accent-fill" d="M66 30c13-4 20 4 17 15-3-9-9-13-17-11z" />' +
    // Helm
    '<path class="art-line" d="M34 52v-9a16 16 0 0 1 32 0v9z" />' +
    '<path class="art-line" d="M50 28v24" />' +
    // Gesicht
    '<path class="art-line" d="M37 52v16h26V52" />' +
    '<circle class="art-fill" cx="44" cy="59" r="2.9" />' +
    '<circle class="art-fill" cx="56" cy="59" r="2.9" />' +
    '<path class="art-line" d="M37 68l5 10h16l5-10" />' +
    // Hals und Rumpf
    '<path class="art-line" d="M44 78v14" />' +
    '<path class="art-line" d="M56 78v14" />' +
    '<path class="art-line" d="M24 120v-15c0-8 6-13 14-13h24c8 0 14 5 14 13v15z" />' +
    '<path class="art-accent-line" d="M43 93l7 9 7-9" />' +
    '<circle class="art-accent-fill" cx="32" cy="110" r="3.4" />' +
    '<circle class="art-accent-fill" cx="68" cy="110" r="3.4" />',

  // 12 – Hüterin: Zackenreif, Haarbögen, Anhänger
  12:
    // Reif
    '<path class="art-line" d="M32 44l5-20 7 11 6-20 6 20 7-11 5 20z" />' +
    '<circle class="art-accent-fill" cx="37" cy="20" r="3.3" />' +
    '<circle class="art-accent-fill" cx="50" cy="13" r="3.3" />' +
    '<circle class="art-accent-fill" cx="63" cy="20" r="3.3" />' +
    // Haar
    '<path class="art-line" d="M32 44c-9 13-12 30-9 46" />' +
    '<path class="art-line" d="M68 44c9 13 12 30 9 46" />' +
    '<path class="art-line" d="M38 49c-5 11-6 23-4 33" />' +
    '<path class="art-line" d="M62 49c5 11 6 23 4 33" />' +
    // Gesicht
    '<path class="art-line" d="M39 44v14a11 11 0 0 0 22 0V44" />' +
    '<circle class="art-fill" cx="44.5" cy="51" r="2.9" />' +
    '<circle class="art-fill" cx="55.5" cy="51" r="2.9" />' +
    '<path class="art-accent-line" d="M45.5 62h9" />' +
    // Hals, Rumpf und Anhänger
    '<path class="art-line" d="M45 71v14" />' +
    '<path class="art-line" d="M55 71v14" />' +
    '<path class="art-line" d="M27 120v-18c0-8 6-13 14-13h18c8 0 14 5 14 13v18z" />' +
    '<path class="art-accent-line" d="M43 90l7 9 7-9" />' +
    '<circle class="art-accent-fill" cx="50" cy="105" r="3.8" />',

  // 13 – Fürst: Zackenkrone, Spitzbart, Schwert
  13:
    // Schwert
    '<path class="art-line" d="M82 104V38" />' +
    '<path class="art-line" d="M74 44h16" />' +
    '<circle class="art-accent-fill" cx="82" cy="30" r="4.2" />' +
    '<path class="art-line" d="M82 34v4" />' +
    // Krone
    '<path class="art-line" d="M30 44V22l8 9 12-16 12 16 8-9v22z" />' +
    '<circle class="art-accent-fill" cx="30" cy="18" r="3.3" />' +
    '<circle class="art-accent-fill" cx="50" cy="11" r="3.3" />' +
    '<circle class="art-accent-fill" cx="70" cy="18" r="3.3" />' +
    '<path class="art-line" d="M29 44h42v8H29z" />' +
    '<circle class="art-accent-fill" cx="39" cy="48" r="2.2" />' +
    '<circle class="art-accent-fill" cx="50" cy="48" r="2.2" />' +
    '<circle class="art-accent-fill" cx="61" cy="48" r="2.2" />' +
    // Gesicht
    '<path class="art-line" d="M36 52v14h28V52" />' +
    '<circle class="art-fill" cx="44" cy="58" r="3" />' +
    '<circle class="art-fill" cx="56" cy="58" r="3" />' +
    // Spitzbart
    '<path class="art-line" d="M36 66l5 16 9 8 9-8 5-16" />' +
    '<path class="art-accent-line" d="M40 72h20" />' +
    '<path class="art-accent-line" d="M43 78h14" />' +
    // Rumpf
    '<path class="art-line" d="M22 120v-16c0-8 6-13 14-13h28c8 0 14 5 14 13v16z" />' +
    '<path class="art-accent-line" d="M42 92l8 10 8-10" />' +
    '<path class="art-line" d="M50 102v18" />' +
    '<path class="art-accent-line" d="M30 112h13" />' +
    '<path class="art-accent-line" d="M57 112h13" />',
};

function courtArt(card) {
  return COURT_ART[card.value] ?? '';
}

// ---------------------------------------------------- Zauberer und Narr

/** Zauberer – Spitzhut, Funken, langer Bart. */
const WIZARD_ART =
  // Funken
  '<path class="art-accent-fill" d="m20 48 2.4 6 6 2.4-6 2.4-2.4 6-2.4-6-6-2.4 6-2.4z" />' +
  '<path class="art-accent-fill" d="m82 40 2 5 5 2-5 2-2 5-2-5-5-2 5-2z" />' +
  '<path class="art-accent-fill" d="m84 92 1.8 4.5 4.5 1.8-4.5 1.8-1.8 4.5-1.8-4.5-4.5-1.8 4.5-1.8z" />' +
  // Spitzhut
  '<path class="art-line" d="M50 12 68 56H32z" />' +
  '<path class="art-line" d="M24 56h52l-6 9H30z" />' +
  '<path class="art-accent-fill" d="m50 30 2.4 6 6 2.4-6 2.4-2.4 6-2.4-6-6-2.4 6-2.4z" />' +
  // Gesicht
  '<path class="art-line" d="M37 65v13h26V65" />' +
  '<circle class="art-fill" cx="44" cy="71" r="2.8" />' +
  '<circle class="art-fill" cx="56" cy="71" r="2.8" />' +
  // Bart
  '<path class="art-line" d="M37 78l4 18 9 8 9-8 4-18" />' +
  '<path class="art-accent-line" d="M40 85h20" />' +
  '<path class="art-accent-line" d="M43 92h14" />' +
  // Gewand
  '<path class="art-line" d="M23 120v-14c0-8 6-13 14-13h26c8 0 14 5 14 13v14z" />' +
  '<path class="art-accent-line" d="M42 94l8 10 8-10" />' +
  '<path class="art-line" d="M50 104v16" />';

/** Narr – Schellenkappe, Zackenkragen, breites Grinsen. */
const JESTER_ART =
  // Schellen
  '<circle class="art-accent-fill" cx="14" cy="46" r="6.5" />' +
  '<circle class="art-accent-fill" cx="86" cy="46" r="6.5" />' +
  '<circle class="art-accent-fill" cx="50" cy="16" r="6.5" />' +
  // Kappe
  '<path class="art-line" d="M33 54a17 17 0 0 1 34 0v3H33z" />' +
  '<path class="art-line" d="M34 52 20 47" />' +
  '<path class="art-line" d="M66 52 80 47" />' +
  '<path class="art-line" d="M50 37V23" />' +
  '<path class="art-accent-line" d="M36 57h28" />' +
  // Gesicht
  '<path class="art-line" d="M36 57v20h28V57" />' +
  '<path class="art-fill" d="m43 61 5 9h-10z" />' +
  '<path class="art-fill" d="m57 61 5 9h-10z" />' +
  '<path class="art-line" d="M42 72q8 8 16 0" />' +
  // Zackenkragen
  '<path class="art-line" d="M23 82h54" />' +
  '<path class="art-accent-fill" d="M23 83h13.5L29.75 96z" />' +
  '<path class="art-accent-fill" d="M36.5 83H50l-6.75 13z" />' +
  '<path class="art-accent-fill" d="M50 83h13.5L56.75 96z" />' +
  '<path class="art-accent-fill" d="M63.5 83H77l-6.75 13z" />' +
  // Wams
  '<path class="art-line" d="M27 120v-12c0-8 6-13 14-13h18c8 0 14 5 14 13v12z" />' +
  '<path class="art-line" d="M50 95v25" />' +
  '<circle class="art-accent-fill" cx="38" cy="110" r="3.2" />' +
  '<circle class="art-accent-fill" cx="62" cy="110" r="3.2" />';

// ------------------------------------------------------------ Kartenbau

/** Farbklasse der Karte. */
function cardVariant(card) {
  if (card.kind === 'wizard') return 'wizard';
  if (card.kind === 'jester') return 'jester';
  return card.suit;
}

/** Der Text in der Ecke: Zahl, Z oder N. */
function cardIndex(card) {
  if (card.kind === 'wizard') return 'Z';
  if (card.kind === 'jester') return 'N';
  return String(card.value);
}

/** Menschenlesbarer Name, z. B. "Rot 12". */
export function cardName(card) {
  if (!card) return '–';
  if (card.kind === 'wizard') return 'Zauberer';
  if (card.kind === 'jester') return 'Narr';
  return `${SUIT_LABELS[card.suit]} ${card.value}`;
}

/** Die Mittelgrafik einer Karte. */
function cardArt(card) {
  if (card.kind === 'wizard') return WIZARD_ART;
  if (card.kind === 'jester') return JESTER_ART;
  if (card.value >= 11) return courtArt(card);
  return numberArt(card);
}

function indexCorner(card, variant, position) {
  return el(`span.card-index.card-index--${position}`, {
    html: `<b>${cardIndex(card)}</b>${svgTag(GLYPHS[variant], '0 0 24 24', 'card-index-glyph')}`,
  });
}

/**
 * Baut ein Kartenelement.
 * @param {object} card
 * @param {object} [options]
 * @param {'div'|'button'} [options.as]
 * @param {boolean} [options.playable] Karte ist anklickbar
 * @param {boolean} [options.blocked] Karte ist regelwidrig (ausgegraut)
 * @param {boolean} [options.mini] Kleinformat ohne Mittelgrafik
 * @param {string} [options.deck] Kartendesign (Standard: das gewählte)
 * @param {(card: object) => void} [options.onSelect]
 */
export function renderCard(card, options = {}) {
  const { as = 'div', playable = false, blocked = false, mini = false, onSelect } = options;
  const variant = cardVariant(card);

  const classes = ['card', `card--${variant}`, `deck--${options.deck ?? activeDeck}`];
  if (playable) classes.push('is-playable');
  if (blocked) classes.push('is-blocked');
  if (mini) classes.push('card--mini');

  const node = el(`${as}.${classes.join('.')}`, {
    'data-card': card.id,
    'aria-label': cardName(card),
    ...(as === 'button' ? { type: 'button', disabled: !playable } : {}),
  });

  if (mini) {
    // In der Kopfzeile zählt nur die Lesbarkeit.
    node.append(
      el('span.card-mini-value', { text: cardIndex(card) }),
      el('span.card-mini-glyph', { html: glyphMarkup(variant) }),
    );
    return node;
  }

  node.append(
    indexCorner(card, variant, 'tl'),
    el('span.card-art', {
      html: svgTag(cardArt(card), '0 0 100 140', 'card-art-svg'),
    }),
    // Nur im Design „Vollfarbe“ sichtbar: große Zahl über blassem Symbol.
    el('span.card-face', {}, [
      el('span.card-face-glyph', { html: glyphMarkup(variant) }),
      el('span.card-face-value', { text: cardIndex(card) }),
    ]),
    indexCorner(card, variant, 'br'),
  );

  if (card.kind !== 'suit') {
    node.append(el('span.card-word', { text: card.kind === 'wizard' ? 'Zauberer' : 'Narr' }));
  }

  if (onSelect && playable) {
    node.addEventListener('click', () => onSelect(card));
  }
  return node;
}

// -------------------------------------------------------- Kartenrückseite

/** Geometrisches Rückseitenmuster – für den verdeckten Nachziehstapel. */
const BACK_PATTERN =
  '<defs><pattern id="wz-back" width="32" height="32" patternUnits="userSpaceOnUse">' +
  '<circle class="art-line" cx="8" cy="8" r="6" />' +
  '<circle class="art-accent-fill" cx="8" cy="8" r="2.4" />' +
  '<path class="art-line" d="M19 2h11v11H19z" />' +
  '<path class="art-line" d="M2 20l4 4 4-4 4 4" />' +
  '<path class="art-line" d="M19 19h11v11" />' +
  '<circle class="art-accent-fill" cx="25" cy="26" r="2.4" />' +
  '</pattern></defs>' +
  '<rect x="6" y="6" width="88" height="128" rx="7" fill="url(#wz-back)" />' +
  '<rect x="6" y="6" width="88" height="128" rx="7" class="art-line" />';

/** Eine verdeckte Karte (Rückseite). */
export function renderCardBack(options = {}) {
  const node = el(`div.card.card--back.deck--${options.deck ?? activeDeck}`, {
    'aria-hidden': 'true',
    ...(options.style ? { style: options.style } : {}),
  });
  node.innerHTML = svgTag(BACK_PATTERN, '0 0 100 140', 'card-art-svg');
  return node;
}

/** Kleine Farbkachel für die Trumpfwahl. */
export function suitSwatch(suit) {
  return el(`span.trump-swatch.card--${suit}.deck--${activeDeck}`, { html: glyphMarkup(suit) });
}
