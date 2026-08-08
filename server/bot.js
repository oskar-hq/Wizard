/**
 * Mitspieler-Bots.
 *
 * Bewusst regelbasiert und ohne Blick in fremde Hände – der Bot bekommt genau
 * die Informationen, die auch ein Mensch am Tisch hätte: seine eigene Hand,
 * den laufenden Stich, die Trumpffarbe und die Ansagen.
 */

import { isJester, isSuitCard, isWizard } from '../game/cards.js';
import { legalCards, trickWinnerIndex } from '../game/rules.js';

/** Namensvorrat für Bots. */
export const BOT_NAMES = [
  'Merlin',
  'Morgana',
  'Zauberin',
  'Krähe',
  'Runa',
  'Balthasar',
  'Nimue',
  'Alraune',
];

/**
 * Wie stark gewinnt eine Karte voraussichtlich einen Stich?
 * Grobe Einschätzung von 0 (Narr) bis 1 (Zauberer).
 */
function winChance(card, trumpSuit) {
  if (isWizard(card)) return 1;
  if (isJester(card)) return 0;
  if (trumpSuit && card.suit === trumpSuit) {
    if (card.value >= 11) return 0.95;
    if (card.value >= 8) return 0.75;
    if (card.value >= 5) return 0.5;
    return 0.3;
  }
  if (card.value === 13) return 0.7;
  if (card.value === 12) return 0.55;
  if (card.value >= 10) return 0.4;
  if (card.value >= 8) return 0.2;
  return 0.05;
}

/**
 * Ansage: die erwarteten Stiche der eigenen Hand, leicht zurückhaltend
 * gerundet – zu hohe Ansagen kosten hier mehr als zu tiefe.
 */
export function botBid({ hand, round, trumpSuit, forbidden = null, random = Math.random }) {
  const expected = hand.reduce((sum, card) => sum + winChance(card, trumpSuit), 0);
  let bid = Math.round(expected - 0.15);

  // Mit ein wenig Streuung wirken mehrere Bots weniger gleichförmig.
  if (random() < 0.2) bid += random() < 0.5 ? -1 : 1;

  bid = Math.max(0, Math.min(round, bid));

  // „Plus/minus Eins“: die verbotene Zahl umgehen.
  if (forbidden !== null && forbidden !== undefined && bid === forbidden) {
    bid = bid > 0 ? bid - 1 : Math.min(round, bid + 1);
  }
  return bid;
}

/** Trumpfwahl: die Farbe, in der der Bot am stärksten aufgestellt ist. */
export function botTrump({ hand, random = Math.random }) {
  const strength = { blue: 0, red: 0, green: 0, yellow: 0 };
  for (const card of hand) {
    if (!isSuitCard(card)) continue;
    strength[card.suit] += 1 + card.value / 13;
  }
  const best = Object.entries(strength).sort((a, b) => b[1] - a[1]);
  // Bei völlig leerer Hand (Runde ohne Farbkarten) einfach etwas wählen.
  if (best[0][1] === 0) {
    const suits = Object.keys(strength);
    return suits[Math.floor(random() * suits.length)];
  }
  return best[0][0];
}

/** Gewinnt `card` den Stich, wenn er jetzt so endete? */
function winsTrick(card, trick, trumpSuit) {
  const probe = [...trick, { playerId: '__bot__', card }];
  return probe[trickWinnerIndex(probe, trumpSuit)].playerId === '__bot__';
}

const byValueAsc = (trumpSuit) => (a, b) => winChance(a, trumpSuit) - winChance(b, trumpSuit);

/**
 * Kartenwahl.
 *
 * @param {object} options
 * @param {object[]} options.hand Eigene Hand
 * @param {Array}    options.trick Laufender Stich
 * @param {string|null} options.trumpSuit
 * @param {number}   options.bid Eigene Ansage
 * @param {number}   options.tricks Bereits gewonnene Stiche
 * @param {number}   options.tricksLeft Verbleibende Stiche dieser Runde
 * @param {boolean}  [options.avoidTricks] Variante „Nur keine Stiche!“
 */
export function botCard({
  hand,
  trick,
  trumpSuit,
  bid,
  tricks,
  tricksLeft,
  avoidTricks = false,
  random = Math.random,
}) {
  const options = legalCards(hand, trick);
  if (options.length === 1) return options[0];

  const sorted = [...options].sort(byValueAsc(trumpSuit));
  const needed = avoidTricks ? 0 : Math.max(0, (bid ?? 0) - tricks);

  // Kein Bedarf an weiteren Stichen → möglichst niedrig abwerfen.
  if (needed === 0) {
    const jester = sorted.find(isJester);
    if (jester) return jester;
    const losing = sorted.filter((card) => !winsTrick(card, trick, trumpSuit));
    if (losing.length) return losing[losing.length - 1]; // höchste Karte, die nicht gewinnt
    return sorted[0]; // nichts zu machen: die niedrigste spielen
  }

  // Muss unbedingt stechen → knapp gewinnen, wenn möglich.
  const mustWinAll = needed >= tricksLeft;
  const winners = sorted.filter((card) => winsTrick(card, trick, trumpSuit));

  if (trick.length === 0) {
    // Ausspielen: mit einer starken Karte die Führung übernehmen.
    const strong = sorted.filter((card) => winChance(card, trumpSuit) >= 0.55);
    if (strong.length) return strong[0];
    return sorted[sorted.length - 1];
  }

  if (winners.length) {
    // Der billigste sichere Gewinner; einen Zauberer nur, wenn es sein muss.
    const cheap = winners.filter((card) => !isWizard(card));
    if (cheap.length) return cheap[0];
    if (mustWinAll || random() < 0.6) return winners[0];
    return sorted[0];
  }

  // Kann nicht gewinnen → niedrigste Karte opfern.
  return sorted[0];
}
