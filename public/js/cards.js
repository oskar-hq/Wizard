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

// ------------------------------------------- Design „Klassisch“ (gemalt)

/**
 * Eigenständige Umsetzung im Stil klassischer Fantasy-Spielkarten:
 * atmosphärische Landschaft, Figuren als Silhouetten, Goldrahmen, Runen und
 * große Eckzahlen. Der Himmel kommt als CSS-Verlauf von der Kartenfläche,
 * das SVG zeichnet Sonne, Horizont, Figur und Rahmen.
 *
 * Es werden keine Illustrationen des Originalspiels verwendet oder
 * nachgezeichnet – alle Formen sind hier von Hand gesetzt.
 */

/** Runische Zeichen je Volk – für das Design „Klassisch“. */
const RUNES = {
  blue: '<path d="M12 3v18M12 9 5.5 3M12 9l6.5-6" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>',
  red: '<path d="M12 3v18M5 6h14M8 12h8" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>',
  green:
    '<path d="M12 3v18M12 4l6 4-6 4" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>',
  yellow:
    '<path d="M12 3v18M6 7l12 6M18 7 6 13" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>',
  wizard:
    '<path d="M12 2 4 20h16z" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"/><path d="M12 9v6" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>',
  jester:
    '<circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" stroke-width="2.4"/><path d="M12 7v10" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>',
};

/** Beschriftung der Figurenkarten im Design „Klassisch“. */
const CLASSIC_TITLES = {
  11: 'der Späher',
  12: 'die Hüterin',
  13: 'der Fürst',
  wizard: 'der Zauberer',
  jester: 'der Narr',
};

/** Nadelwald aus einer Reihe Dreiecke. */
function forestPath() {
  const peaks = [
    [4, 26], [16, 34], [28, 22], [40, 32], [52, 26], [64, 36], [76, 24], [88, 30], [98, 22],
  ];
  return peaks
    .map(([x, h]) => `M${x - 8} 120 L${x} ${120 - h} L${x + 8} 120 Z`)
    .join('');
}

/** Horizont je Volk – Berge, Vulkane, Wald oder Steinkreis. */
const HORIZON = {
  yellow:
    '<circle class="cl-glow" cx="52" cy="100" r="20" />' +
    '<path class="cl-sil" d="M0 140V106l14-20 12 14 14-24 16 26 12-12 14 16 18-12v46z" />',
  red:
    '<ellipse class="cl-glow" cx="50" cy="110" rx="34" ry="14" />' +
    '<path class="cl-sil" d="M0 140v-32l12-12 10 8 14-24 8 12 8-18 12 26 14-12 12 14 10-6v44z" />',
  green:
    '<circle class="cl-glow" cx="50" cy="104" r="17" />' +
    `<path class="cl-sil" d="${forestPath()} M0 118h100v22H0z" />`,
  wizard:
    '<circle class="cl-glow" cx="26" cy="34" r="9" />' +
    '<path class="cl-sil" d="M0 140v-30l18-16 14 12 16-20 14 18 20-14 18 16v34z" />',
  jester:
    '<circle class="cl-glow" cx="50" cy="102" r="18" />' +
    '<path class="cl-sil" d="M0 140v-22l16-8 14 6 20-10 18 8 16-6 16 8v24z" />',
  blue:
    '<circle class="cl-glow" cx="68" cy="42" r="10" />' +
    // Steinkreis – ein Gruß an die Rahmengeschichte, frei gezeichnet
    '<path class="cl-sil" d="M12 118V84h9v34zM29 118V84h9v34zM9 84h33v-7H9z" />' +
    '<path class="cl-sil" d="M47 118V92h8v26z" />' +
    '<path class="cl-sil" d="M61 118V88h8v30zM75 118V88h8v30zM58 88h28v-6H58z" />' +
    '<path class="cl-sil" d="M89 118v-17h7v17z" />' +
    '<path class="cl-sil" d="M0 118h100v22H0z" />',
};

/** Figuren als Silhouette – stehen auf dem Boden bei y = 118. */
const CLASSIC_FIGURE = {
  11:
    // Speer
    '<path class="cl-sil" d="M28 120V64h2.6v56z" />' +
    '<path class="cl-sil" d="M29.3 54l4 12h-8z" />' +
    // Umhang und Körper
    '<path class="cl-sil" d="M37 120l5-34q1-7 8-7t8 7l5 34z" />' +
    '<circle class="cl-sil" cx="50" cy="74" r="7" />' +
    // Kapuze
    '<path class="cl-sil" d="M43 74q0-11 7-11t7 11z" />',
  12:
    // Kleid
    '<path class="cl-sil" d="M34 120l9-36q1-6 7-6t7 6l9 36z" />' +
    '<circle class="cl-sil" cx="50" cy="76" r="6.6" />' +
    // Haar
    '<path class="cl-sil" d="M42 78q-1-14 8-14t8 14q-3-7-8-7t-8 7z" />' +
    // Reif
    '<path class="cl-glow" d="M43 68h14v2H43z" />',
  13:
    // Schwert
    '<path class="cl-sil" d="M70 120V70h2.6v50z" />' +
    '<path class="cl-sil" d="M65 78h13v2.6H65z" />' +
    // Körper
    '<path class="cl-sil" d="M35 120v-28q0-13 15-13t15 13v28z" />' +
    '<circle class="cl-sil" cx="50" cy="72" r="7.4" />' +
    // Krone
    '<path class="cl-glow" d="M42 66v-9l4 5 4-7 4 7 4-5v9z" />',
  wizard:
    // Stab mit Kugel
    '<path class="cl-sil" d="M74 120V60h2.6v60z" />' +
    '<circle class="cl-glow" cx="75.3" cy="54" r="5.4" />' +
    // Gewand
    '<path class="cl-sil" d="M32 120l9-38q2-7 9-7t9 7l9 38z" />' +
    '<circle class="cl-sil" cx="50" cy="72" r="6.6" />' +
    // Spitzhut
    '<path class="cl-sil" d="M50 40 63 70H37z" />' +
    '<path class="cl-sil" d="M33 70h34v4H33z" />' +
    // Funken
    '<path class="cl-glow" d="m22 58 1.6 4 4 1.6-4 1.6-1.6 4-1.6-4-4-1.6 4-1.6z" />' +
    '<path class="cl-glow" d="m84 84 1.3 3.2 3.2 1.3-3.2 1.3-1.3 3.2-1.3-3.2-3.2-1.3 3.2-1.3z" />',
  jester:
    // Wams
    '<path class="cl-sil" d="M35 120l8-36q1-6 7-6t7 6l8 36z" />' +
    '<circle class="cl-sil" cx="50" cy="76" r="6.6" />' +
    // Kappe mit drei Spitzen
    '<path class="cl-sil" d="M40 72q0-10 10-10t10 10z" />' +
    '<path class="cl-sil" d="M41 68 33 61l2.6-3 8 7zM59 68l8-7 2.6 3-8 7z" />' +
    '<circle class="cl-glow" cx="31" cy="59" r="3.2" />' +
    '<circle class="cl-glow" cx="69" cy="59" r="3.2" />' +
    '<path class="cl-sil" d="M50 63v-7h2v7z" />' +
    '<circle class="cl-glow" cx="51" cy="53" r="3.2" />' +
    // Zackenkragen
    '<path class="cl-sil" d="M38 86h24l-4 7-4-5-4 5-4-5-4 5z" />',
};

/** Rahmen und Zierecken. */
const CLASSIC_FRAME =
  '<rect class="cl-frame" x="3.2" y="3.2" width="93.6" height="133.6" rx="7" />' +
  '<rect class="cl-frame-inner" x="6.4" y="6.4" width="87.2" height="127.2" rx="5" />' +
  '<path class="cl-frame" d="M6.4 18V6.4H18M82 6.4h11.6V18M93.6 122v11.6H82M18 133.6H6.4V122" />';

/** Die komplette Szene einer Karte im Design „Klassisch“. */
function classicArt(card) {
  const key = card.kind === 'suit' ? card.suit : card.kind;
  const figure = CLASSIC_FIGURE[card.kind === 'suit' ? card.value : card.kind] ?? '';
  let horizon = HORIZON[key] ?? '';

  if (figure) {
    // Hinter einer Figur wird die Landschaft flachgedrückt, damit die
    // Silhouette gegen den Himmel steht und nicht im Horizont verschwindet.
    horizon = `<g transform="translate(0 122) scale(1 0.45) translate(0 -122)">${horizon}</g>`;
  }

  // Lichthof: hebt die dunkle Figur vom dunklen Horizont ab.
  const halo = figure
    ? '<ellipse class="cl-halo" cx="50" cy="94" rx="34" ry="38" />' +
      '<ellipse class="cl-halo" cx="50" cy="92" rx="24" ry="28" />'
    : '';

  // Zahlenkarten tragen statt einer Figur ihre Rune im Himmel.
  const emblem =
    figure ||
    `<g class="cl-rune" transform="translate(50 62) scale(2.1) translate(-12 -12)">` +
      `${RUNES[key] ?? ''}</g>`;

  return `<g class="cl-scene">${halo}${horizon}${emblem}${CLASSIC_FRAME}</g>`;
}

/** Die Mittelgrafik einer Karte. */
function cardArt(card) {
  if (card.kind === 'wizard') return WIZARD_ART;
  if (card.kind === 'jester') return JESTER_ART;
  if (card.value >= 11) return courtArt(card);
  return numberArt(card);
}

function indexCorner(card, variant, position, deck) {
  const glyph = deck === 'classic' ? RUNES[variant] : GLYPHS[variant];
  return el(`span.card-index.card-index--${position}`, {
    html: `<b>${cardIndex(card)}</b>${svgTag(glyph, '0 0 24 24', 'card-index-glyph')}`,
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
  const deck = options.deck ?? activeDeck;

  const classes = ['card', `card--${variant}`, `deck--${deck}`];
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

  // Je Design wird nur die Ebene gebaut, die es tatsächlich zeigt.
  if (deck === 'classic') {
    node.append(
      el('span.card-scene', {
        html: svgTag(classicArt(card), '0 0 100 140', 'card-art-svg'),
      }),
      indexCorner(card, variant, 'tl', deck),
      indexCorner(card, variant, 'br', deck),
    );
    const title = CLASSIC_TITLES[card.kind === 'suit' ? card.value : card.kind];
    if (title) node.append(el('span.card-title', { text: title }));
    if (onSelect && playable) node.addEventListener('click', () => onSelect(card));
    return node;
  }

  node.append(
    indexCorner(card, variant, 'tl', deck),
    deck === 'solid'
      ? // Vollfarbe: große Zahl über blassem Symbol.
        el('span.card-face', {}, [
          el('span.card-face-glyph', { html: glyphMarkup(variant) }),
          el('span.card-face-value', { text: cardIndex(card) }),
        ])
      : el('span.card-art', {
          html: svgTag(cardArt(card), '0 0 100 140', 'card-art-svg'),
        }),
    indexCorner(card, variant, 'br', deck),
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
  const deck = options.deck ?? activeDeck;
  const node = el(`div.card.card--back.deck--${deck}`, {
    'aria-hidden': 'true',
    ...(options.style ? { style: options.style } : {}),
  });
  node.innerHTML = svgTag(
    deck === 'classic' ? CLASSIC_BACK : BACK_PATTERN,
    '0 0 100 140',
    'card-art-svg',
  );
  return node;
}

/** Rückseite im Design „Klassisch“: Runenmedaillon im Goldrahmen. */
const CLASSIC_BACK =
  '<g class="cl-scene">' +
  '<circle class="cl-glow" cx="50" cy="70" r="30" />' +
  '<circle class="cl-frame" cx="50" cy="70" r="27" />' +
  '<circle class="cl-frame-inner" cx="50" cy="70" r="22" />' +
  // Achtstrahliger Stern
  '<path class="cl-star" d="M50 48l4.6 13.4L68 66l-13.4 4.6L50 84l-4.6-13.4L32 66l13.4-4.6z" />' +
  '<path class="cl-star" d="M50 55l2.2 10.8L63 68l-10.8 2.2L50 81l-2.2-10.8L37 68l10.8-2.2z"' +
  ' transform="rotate(45 50 68)" />' +
  '<circle class="cl-frame-inner" cx="50" cy="26" r="3.4" />' +
  '<circle class="cl-frame-inner" cx="50" cy="114" r="3.4" />' +
  '<path class="cl-frame-inner" d="M20 70h14M66 70h14" />' +
  CLASSIC_FRAME +
  '</g>';

/** Kleine Farbkachel für die Trumpfwahl. */
export function suitSwatch(suit) {
  return el(`span.trump-swatch.card--${suit}.deck--${activeDeck}`, { html: glyphMarkup(suit) });
}
