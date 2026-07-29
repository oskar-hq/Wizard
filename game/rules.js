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

/** Ist die Ansage `bid` in Runde `round` zulässig (0 … round)? */
export function isValidBid(bid, round) {
  return Number.isInteger(bid) && bid >= 0 && bid <= round;
}

/** Ist `suit` eine gültige Trumpffarbe? */
export function isValidSuit(suit) {
  return SUITS.includes(suit);
}
