/**
 * Beschreibungen der abschaltbaren Regelerweiterungen – gemeinsam genutzt von
 * Warteraum, Spieltisch und Regelübersicht.
 */

import { el, fill } from './dom.js';

export const VARIANTS = [
  {
    key: 'avoidTricks',
    name: 'Nur keine Stiche!',
    badge: 'Keine Stiche',
    text:
      'Es wird nichts angesagt – jeder versucht, möglichst gar keinen Stich zu machen. ' +
      'Jeder Stich bringt einen Strafpunkt. Am Ende gewinnt, wer die wenigsten Punkte hat.',
  },
  {
    key: 'plusMinusOne',
    name: 'Plus/minus Eins',
    badge: '±1',
    text:
      'Die Summe aller Ansagen darf nicht der Stichzahl der Runde entsprechen. ' +
      'Der Geber sagt zuletzt an und muss deshalb ausweichen – es geht nie glatt auf.',
  },
  {
    key: 'hiddenBids',
    name: 'Verdeckte Ansage',
    badge: 'Verdeckt',
    text:
      'Alle sagen gleichzeitig und geheim an. Aufgedeckt wird erst, wenn alle ihre Zahl ' +
      'abgegeben haben – niemand kann sich an den anderen orientieren.',
  },
];

/**
 * Welche Variante ist wegen einer anderen gesperrt?
 * @returns {string|null} Begründung oder null
 */
export function blockedReason(key, variants) {
  if (key !== 'avoidTricks' && variants.avoidTricks) {
    return 'Ohne Ansage nicht möglich';
  }
  if (key === 'plusMinusOne' && variants.hiddenBids) {
    return 'Bei verdeckter Ansage nicht möglich';
  }
  return null;
}

/** Kurze Namen der aktiven Varianten, z. B. ["±1", "Verdeckt"]. */
export function activeBadges(variants = {}) {
  return VARIANTS.filter((v) => variants[v.key]).map((v) => v.badge);
}

/** Liste der Umschalter im Warteraum. */
export function renderVariantList(container, variants, { editable, onToggle }) {
  fill(
    container,
    VARIANTS.map((variant) => {
      const active = Boolean(variants[variant.key]);
      const blocked = blockedReason(variant.key, variants);
      const input = el('input', {
        type: 'checkbox',
        class: 'variant-check',
        checked: active,
        disabled: !editable || Boolean(blocked),
      });
      if (editable && !blocked) {
        input.addEventListener('change', () => onToggle(variant.key, input.checked));
      }
      return el(`li.variant-item${active ? '.is-active' : ''}`, {}, [
        el('label.variant-label', {}, [
          input,
          el('span.variant-body', {}, [
            el('span.variant-name', { text: variant.name }),
            el('span.variant-text', { text: blocked ? `${blocked}.` : variant.text }),
          ]),
        ]),
      ]);
    }),
  );
}

/** Beschreibungen für die Regelübersicht. */
export function renderVariantDocs(container) {
  fill(
    container,
    VARIANTS.flatMap((variant) => [
      el('p', {}, [el('strong', { text: `${variant.name}: ` }), variant.text]),
    ]),
  );
}
