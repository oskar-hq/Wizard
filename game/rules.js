/**
 * Reine Regelfunktionen für Wizard – ohne Zustand, ohne Netzwerk.
 *
 * Ein "Stich" (trick) ist hier immer ein Array in Spielreihenfolge:
 *   [{ playerId: string, card: Card }, ...]
 */

import { DECK_SIZE, SUITS, isJester, isSuitCard, isWizard } from './cards.js';

/** Anzahl der Runden bei gegebener Spielerzahl: floor(60 / Spieler). */
export function roundsForPlayers(playerCount) {
  return Math.floor(DECK_SIZE / playerCount);
}

export const MIN_PLAYERS = 3;
export const MAX_PLAYERS = 6;

/**
 * Begrenzt eine gewünschte Rundenzahl auf das, was das Deck hergibt.
 * `null`/`undefined` bedeutet „so viele Runden wie möglich“.
 */
export function clampRounds(wanted, playerCount) {
  const max = roundsForPlayers(playerCount);
  if (wanted === null || wanted === undefined || !Number.isFinite(Number(wanted))) return max;
  return Math.max(1, Math.min(max, Math.floor(Number(wanted))));
}

/**
 * Die Farbe, die bedient werden muss.
 *
 * - Leerer Stich → keine.
 * - Eröffnet ein Zauberer den Stich, muss nie bedient werden (bleibt null),
 *   auch wenn danach Farbkarten fallen.
 * - Sonst legt die erste gespielte Farbkarte die Bedien-Farbe fest
 *   (Narren legen keine fest).
 *
 * @returns {string|null}
 */
export function leadSuitOf(trick) {
  if (!trick.length) return null;
  if (isWizard(trick[0].card)) return null;
  for (const play of trick) {
    if (isSuitCard(play.card)) return play.card.suit;
  }
  return null;
}

/**
 * Darf `card` aus `hand` auf den laufenden `trick` gelegt werden?
 *
 * Bedienpflicht: Wer die angespielte Farbe hat, muss sie bedienen.
 * Zauberer und Narren dürfen jedoch IMMER gespielt werden.
 */
export function isLegalPlay(card, hand, trick) {
  if (isWizard(card) || isJester(card)) return true;
  const lead = leadSuitOf(trick);
  if (lead === null) return true;
  if (card.suit === lead) return true;
  // Andere Farbe nur, wenn die Bedien-Farbe nicht auf der Hand ist.
  return !hand.some((c) => isSuitCard(c) && c.suit === lead);
}

/** Alle Karten der Hand, die aktuell legal gespielt werden dürfen. */
export function legalCards(hand, trick) {
  return hand.filter((card) => isLegalPlay(card, hand, trick));
}

/**
 * Ermittelt den Index des Gewinner-Eintrags im Stich.
 *
 * Priorität:
 *   1. Der erste im Stich gespielte Zauberer.
 *   2. Die höchste Trumpfkarte.
 *   3. Die höchste Karte der zuerst ausgespielten Farbe.
 *   4. Nur Narren im Stich → der erste Narr.
 *
 * @param {Array<{playerId: string, card: object}>} trick
 * @param {string|null} trumpSuit
 * @returns {number} Index in `trick`
 */
export function trickWinnerIndex(trick, trumpSuit) {
  if (!trick.length) throw new Error('Leerer Stich hat keinen Gewinner.');

  // 1. Erster Zauberer gewinnt immer.
  const wizardIndex = trick.findIndex((play) => isWizard(play.card));
  if (wizardIndex !== -1) return wizardIndex;

  // 2. Höchster Trumpf.
  if (trumpSuit) {
    let best = -1;
    for (let i = 0; i < trick.length; i++) {
      const card = trick[i].card;
      if (isSuitCard(card) && card.suit === trumpSuit) {
        if (best === -1 || card.value > trick[best].card.value) best = i;
      }
    }
    if (best !== -1) return best;
  }

  // 3. Höchste Karte der angespielten Farbe.
  const lead = leadSuitOf(trick);
  if (lead) {
    let best = -1;
    for (let i = 0; i < trick.length; i++) {
      const card = trick[i].card;
      if (isSuitCard(card) && card.suit === lead) {
        if (best === -1 || card.value > trick[best].card.value) best = i;
      }
    }
    if (best !== -1) return best;
  }

  // 4. Nur Narren (oder: kein Farb-/Trumpfkandidat) → erster Narr gewinnt.
  const jesterIndex = trick.findIndex((play) => isJester(play.card));
  if (jesterIndex !== -1) return jesterIndex;

  // Kann nicht eintreten – Sicherheitsnetz.
  return 0;
}

/** Bequemer Wrapper: liefert die Spieler-ID des Stichgewinners. */
export function trickWinner(trick, trumpSuit) {
  return trick[trickWinnerIndex(trick, trumpSuit)].playerId;
}

/**
 * Punkte einer Runde für einen Spieler.
 *   getroffen  → 20 + 10 × Stiche
 *   daneben    → −10 × |Ansage − Stiche|
 */
export function scoreFor(bid, tricks) {
  if (bid === tricks) return 20 + 10 * tricks;
  return -10 * Math.abs(bid - tricks);
}

// ------------------------------------------------------- Regelerweiterungen

/**
 * Abschaltbare Regelvarianten. Alle sind standardmäßig aus – ohne sie gilt
 * exakt das Grundspiel.
 *
 * - `avoidTricks`  „Nur keine Stiche!“: Es wird nichts angesagt. Jeder Stich
 *                  zählt einen Strafpunkt, am Ende gewinnt die niedrigste
 *                  Punktzahl.
 * - `plusMinusOne` „Plus/minus Eins“: Die Summe aller Ansagen darf nicht der
 *                  Stichzahl der Runde entsprechen. Der Geber sagt zuletzt an
 *                  und darf die passende Zahl deshalb nicht wählen.
 * - `hiddenBids`   „Verdeckte Ansage“: Alle sagen gleichzeitig und geheim an;
 *                  aufgedeckt wird erst, wenn alle abgegeben haben.
 */
export const DEFAULT_VARIANTS = Object.freeze({
  avoidTricks: false,
  plusMinusOne: false,
  hiddenBids: false,
});

export const VARIANT_KEYS = Object.keys(DEFAULT_VARIANTS);

/**
 * Bringt eine Variantenauswahl in eine widerspruchsfreie Form.
 * Ohne Ansage gibt es weder „Plus/minus Eins“ noch eine verdeckte Ansage;
 * und bei gleichzeitiger Ansage lässt sich „Plus/minus Eins“ nicht erzwingen.
 */
export function normalizeVariants(raw = {}) {
  const variants = {};
  for (const key of VARIANT_KEYS) variants[key] = Boolean(raw?.[key]);
  if (variants.avoidTricks) {
    variants.plusMinusOne = false;
    variants.hiddenBids = false;
  } else if (variants.hiddenBids) {
    variants.plusMinusOne = false;
  }
  return variants;
}

/** Rundenpunkte unter Berücksichtigung der aktiven Varianten. */
export function scoreRoundFor(bid, tricks, variants = DEFAULT_VARIANTS) {
  if (variants.avoidTricks) return tricks; // ein Strafpunkt je Stich
  return scoreFor(bid, tricks);
}

/** Gewinnt in dieser Variante die niedrigste Punktzahl? */
export function lowestWins(variants = DEFAULT_VARIANTS) {
  return Boolean(variants.avoidTricks);
}

/** Wird in dieser Variante überhaupt angesagt? */
export function hasBidding(variants = DEFAULT_VARIANTS) {
  return !variants.avoidTricks;
}

/** Ist die Ansage `bid` in Runde `round` zulässig (0 … round)? */
export function isValidBid(bid, round) {
  return Number.isInteger(bid) && bid >= 0 && bid <= round;
}

/** Ist `suit` eine gültige Trumpffarbe? */
export function isValidSuit(suit) {
  return SUITS.includes(suit);
}
