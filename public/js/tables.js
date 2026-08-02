/**
 * Spieltisch-Hintergründe.
 *
 * Wie die Kartendesigns eine rein persönliche Einstellung: Sie landet als
 * Klasse am <body>, den Rest macht CSS. Alle Tische sind aus Farbverläufen
 * gebaut – keine Bilddateien, nichts nachzuladen.
 */

import { el, fill } from './dom.js';

export const TABLES = [
  {
    id: 'night',
    name: 'Nachtblau',
    text: 'Ruhiger dunkelblauer Verlauf. Der Standard – lenkt am wenigsten ab.',
  },
  {
    id: 'casino',
    name: 'Casino-Filz',
    text: 'Tiefgrünes Filztuch unter einem Lichtkegel, mit abgedunkeltem Rand.',
  },
  {
    id: 'wood',
    name: 'Alter Holztisch',
    text: 'Dunkle Bretter mit Maserung und Fugen, warm von oben beleuchtet.',
  },
  {
    id: 'beach',
    name: 'Strand',
    text: 'Abendlicher Sand mit Meer am Horizont – warm und hell, aber lesbar.',
  },
  {
    id: 'tower',
    name: 'Zaubererturm',
    text: 'Violette Nacht mit Sternenfeld. Passt zum Thema des Spiels.',
  },
  {
    id: 'salon',
    name: 'Kaminzimmer',
    text: 'Dunkles Leder, Feuerschein von unten links. Gemütlich und ruhig.',
  },
];

export const DEFAULT_TABLE = 'night';

const TABLE_IDS = new Set(TABLES.map((table) => table.id));

export function isTableId(id) {
  return TABLE_IDS.has(id);
}

/** Setzt den Hintergrund für die ganze Seite. */
export function applyTable(id) {
  const table = isTableId(id) ? id : DEFAULT_TABLE;
  for (const candidate of TABLE_IDS) {
    document.body.classList.toggle(`table--${candidate}`, candidate === table);
  }
  return table;
}

/** Auswahlliste mit echter Vorschau je Tisch. */
export function renderTablePicker(container, current, onPick) {
  fill(
    container,
    TABLES.map((table) =>
      el(
        `button.deck-option${table.id === current ? '.is-active' : ''}`,
        { type: 'button', onclick: () => onPick(table.id) },
        [
          el(`span.table-swatch.table--${table.id}`),
          el('span.deck-meta', {}, [
            el('span.deck-name', { text: table.name }),
            el('span.deck-text', { text: table.text }),
          ]),
        ],
      ),
    ),
  );
}
