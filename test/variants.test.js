/** Tests für die abschaltbaren Regelerweiterungen. */

import test from 'node:test';
import assert from 'node:assert/strict';

import { CS, riggedDeck } from './helpers.js';
import { GameError, WizardGame } from '../game/engine.js';
import { normalizeVariants, scoreRoundFor } from '../game/rules.js';

const P3 = ['p0', 'p1', 'p2'];

function gameWith({ hands, top = [], dealerIndex = 0, playerIds = P3, variants }) {
  const deck = riggedDeck({ hands, dealerIndex, top });
  const game = new WizardGame({
    playerIds,
    startDealerIndex: dealerIndex,
    variants,
    deckFor: () => deck.map((c) => ({ ...c })),
  });
  game.round = hands[0].length - 1;
  game.start();
  return game;
}

/** Spielt eine Runde mit einfachen Bots zu Ende. */
function playRound(game, random = Math.random) {
  if (game.phase === 'choosing_trump') game.chooseTrump(game.dealerId, 'red');
  while (game.phase === 'bidding') {
    const next = game.variants.hiddenBids
      ? game.players.find((p) => p.bid === null).id
      : game.turnPlayerId;
    let value = Math.floor(random() * (game.round + 1));
    if (value === game.forbiddenBidFor(next)) value = value === 0 ? 1 : value - 1;
    game.bid(next, value);
  }
  while (game.phase === 'playing') {
    if (game.trickResult) {
      game.finishTrick();
      continue;
    }
    const options = game.legalCardsFor(game.turnPlayerId);
    game.playCard(game.turnPlayerId, options[Math.floor(random() * options.length)].id);
  }
}

// ------------------------------------------------------- Variantenauflösung

test('Widersprüchliche Varianten werden aufgelöst', () => {
  assert.deepEqual(normalizeVariants(), {
    avoidTricks: false,
    plusMinusOne: false,
    hiddenBids: false,
  });
  // Ohne Ansage gibt es weder Plus/minus Eins noch verdeckte Ansage.
  assert.deepEqual(
    normalizeVariants({ avoidTricks: true, plusMinusOne: true, hiddenBids: true }),
    { avoidTricks: true, plusMinusOne: false, hiddenBids: false },
  );
  // Gleichzeitige Ansage lässt sich nicht mit Plus/minus Eins erzwingen.
  assert.deepEqual(normalizeVariants({ plusMinusOne: true, hiddenBids: true }), {
    avoidTricks: false,
    plusMinusOne: false,
    hiddenBids: true,
  });
  assert.deepEqual(normalizeVariants({ plusMinusOne: 1 }), {
    avoidTricks: false,
    plusMinusOne: true,
    hiddenBids: false,
  });
});

// --------------------------------------------------- „Nur keine Stiche!“

test('Nur keine Stiche: es wird nicht angesagt, alle stehen auf 0', () => {
  const game = gameWith({
    hands: [CS('red-5'), CS('red-9'), CS('red-2')],
    top: CS('yellow-9'),
    variants: { avoidTricks: true },
  });

  assert.equal(game.phase, 'playing', 'Ansagephase entfällt komplett');
  assert.equal(game.turnPlayerId, 'p1', 'links vom Geber wird eröffnet');
  for (const player of game.players) assert.equal(player.bid, 0);
  assert.equal(game.publicState().lowestWins, true);
  assert.throws(() => game.bid('p1', 0), /nicht möglich/);
});

test('Nur keine Stiche: jeder Stich zählt einen Strafpunkt', () => {
  const game = gameWith({
    hands: [CS('red-5', 'blue-2'), CS('red-3', 'blue-4'), CS('red-13', 'blue-6')],
    top: CS('yellow-9'),
    variants: { avoidTricks: true },
  });

  game.playCard('p1', 'red-3');
  game.playCard('p2', 'red-13');
  game.playCard('p0', 'red-5');
  assert.equal(game.trickResult.winnerId, 'p2');
  game.finishTrick();
  game.playCard('p2', 'blue-6');
  game.playCard('p0', 'blue-2');
  game.playCard('p1', 'blue-4');
  game.finishTrick();

  const byId = Object.fromEntries(game.roundResult.entries.map((e) => [e.playerId, e]));
  assert.equal(byId.p2.tricks, 2);
  assert.equal(byId.p2.delta, 2, 'zwei Stiche → zwei Strafpunkte');
  assert.equal(byId.p0.delta, 0, 'kein Stich → keine Strafpunkte');
  assert.equal(byId.p1.delta, 0);
});

test('Nur keine Stiche: die niedrigste Punktzahl gewinnt', () => {
  const game = new WizardGame({ playerIds: P3, seed: 5, variants: { avoidTricks: true } });
  game.players[0].score = 12;
  game.players[1].score = 3;
  game.players[2].score = 7;
  const ranking = game.ranking();
  assert.deepEqual(
    ranking.map((r) => r.playerId),
    ['p1', 'p2', 'p0'],
  );
  assert.equal(ranking[0].rank, 1);
});

test('Nur keine Stiche: die Punktesumme entspricht der Zahl aller Stiche', () => {
  const game = new WizardGame({ playerIds: P3, seed: 99, variants: { avoidTricks: true } });
  let s = 7;
  const random = () => {
    s = (s * 1103515245 + 12345) % 2147483648;
    return s / 2147483648;
  };
  game.start();
  let expected = 0;
  while (game.phase !== 'game_over') {
    // Getrumpft wird weiterhin – nur angesagt wird nichts.
    assert.ok(
      game.phase === 'playing' || game.phase === 'choosing_trump',
      `nie eine Ansagephase (war: ${game.phase})`,
    );
    playRound(game, random);
    expected += game.round;
    assert.equal(
      game.players.reduce((sum, p) => sum + p.score, 0),
      expected,
      'jede Runde vergibt genau so viele Strafpunkte wie es Stiche gibt',
    );
    game.nextRound();
  }
  assert.equal(game.history.length, 20);
});

test('scoreRoundFor bildet beide Wertungen ab', () => {
  assert.equal(scoreRoundFor(2, 2, { avoidTricks: false }), 40);
  assert.equal(scoreRoundFor(2, 0, { avoidTricks: false }), -20);
  assert.equal(scoreRoundFor(0, 3, { avoidTricks: true }), 3);
  assert.equal(scoreRoundFor(0, 0, { avoidTricks: true }), 0);
});

// ---------------------------------------------------------- Plus/minus Eins

test('Plus/minus Eins: der Geber darf die Summe nicht aufgehen lassen', () => {
  const game = gameWith({
    hands: [CS('red-5', 'blue-2'), CS('red-3', 'blue-4'), CS('red-13', 'blue-6')],
    top: CS('yellow-9'),
    variants: { plusMinusOne: true },
  });
  assert.equal(game.round, 2);

  // Vor dem letzten Ansager gibt es keine Einschränkung.
  assert.equal(game.forbiddenBidFor('p1'), null);
  game.bid('p1', 1);
  assert.equal(game.forbiddenBidFor('p2'), null);
  game.bid('p2', 0);

  // Jetzt fehlt noch der Geber: 1 + 0 + x darf nicht 2 ergeben.
  assert.equal(game.forbiddenBidFor('p0'), 1);
  assert.throws(() => game.bid('p0', 1), /Plus\/minus Eins/);
  assert.equal(game.phase, 'bidding', 'die verbotene Ansage wurde nicht übernommen');

  game.bid('p0', 2);
  assert.equal(game.phase, 'playing');
  assert.equal(game.publicState().bidsTotal, 3);
});

test('Plus/minus Eins: keine Einschränkung, wenn die Summe ohnehin nicht aufgeht', () => {
  const game = gameWith({
    hands: [CS('red-5', 'blue-2'), CS('red-3', 'blue-4'), CS('red-13', 'blue-6')],
    top: CS('yellow-9'),
    variants: { plusMinusOne: true },
  });
  game.bid('p1', 2);
  game.bid('p2', 2); // Summe schon 4 > 2
  assert.equal(game.forbiddenBidFor('p0'), null);
  game.bid('p0', 0);
  assert.equal(game.phase, 'playing');
});

test('Ohne die Variante ist jede Ansage erlaubt', () => {
  const game = gameWith({
    hands: [CS('red-5', 'blue-2'), CS('red-3', 'blue-4'), CS('red-13', 'blue-6')],
    top: CS('yellow-9'),
  });
  game.bid('p1', 1);
  game.bid('p2', 0);
  assert.equal(game.forbiddenBidFor('p0'), null);
  game.bid('p0', 1); // Summe = 2 = Stichzahl, im Grundspiel völlig in Ordnung
  assert.equal(game.phase, 'playing');
});

test('Plus/minus Eins über ein ganzes Spiel: die Summe geht nie auf', () => {
  const game = new WizardGame({ playerIds: P3, seed: 11, variants: { plusMinusOne: true } });
  let s = 3;
  const random = () => {
    s = (s * 1103515245 + 12345) % 2147483648;
    return s / 2147483648;
  };
  game.start();
  while (game.phase !== 'game_over') {
    playRound(game, random);
    const sum = game.players.reduce((total, p) => total + p.bid, 0);
    assert.notEqual(sum, game.round, `Runde ${game.round}: Summe darf nicht aufgehen`);
    game.nextRound();
  }
});

// ------------------------------------------------------- Verdeckte Ansage

test('Verdeckte Ansage: alle sagen gleichzeitig an, niemand ist am Zug', () => {
  const game = gameWith({
    hands: [CS('red-5', 'blue-2'), CS('red-3', 'blue-4'), CS('red-13', 'blue-6')],
    top: CS('yellow-9'),
    variants: { hiddenBids: true },
  });

  assert.equal(game.phase, 'bidding');
  assert.equal(game.turnPlayerId, null);
  for (const id of P3) assert.equal(game.canBid(id), true);

  // Reihenfolge egal – hier fängt der Geber an.
  game.bid('p0', 2);
  assert.equal(game.canBid('p0'), false);
  assert.throws(() => game.bid('p0', 1), /bereits angesagt/);

  const hidden = game.publicState();
  assert.equal(hidden.bidsHidden, true);
  assert.equal(hidden.bidsTotal, null);
  for (const player of hidden.players) {
    assert.equal(player.bid, null, 'niemand sieht fremde Ansagen');
  }
  assert.equal(hidden.players.find((p) => p.id === 'p0').hasBid, true);
  assert.equal(hidden.players.find((p) => p.id === 'p1').hasBid, false);
  assert.equal(game.bidOf('p0'), 2, 'die eigene Ansage sieht man selbst');

  game.bid('p2', 0);
  assert.equal(game.publicState().bidsHidden, true);
  game.bid('p1', 1);

  // Jetzt sind alle da – aufgedeckt und ab ins Spiel.
  const open = game.publicState();
  assert.equal(open.phase, 'playing');
  assert.equal(open.bidsHidden, false);
  assert.deepEqual(
    open.players.map((p) => p.bid),
    [2, 1, 0],
  );
  assert.equal(open.bidsTotal, 3);
  assert.equal(game.turnPlayerId, 'p1', 'links vom Geber wird eröffnet');
});

test('Verdeckte Ansage: ungültige Ansagen werden weiterhin abgelehnt', () => {
  const game = gameWith({
    hands: [CS('red-5'), CS('red-3'), CS('red-13')],
    top: CS('yellow-9'),
    variants: { hiddenBids: true },
  });
  assert.throws(() => game.bid('p2', 2), /zwischen 0 und 1/);
  assert.equal(game.publicState().players.find((p) => p.id === 'p2').hasBid, false);
});

test('Verdeckte Ansage über ein ganzes Spiel', () => {
  const game = new WizardGame({ playerIds: P3, seed: 21, variants: { hiddenBids: true } });
  let s = 13;
  const random = () => {
    s = (s * 1103515245 + 12345) % 2147483648;
    return s / 2147483648;
  };
  game.start();
  while (game.phase !== 'game_over') {
    playRound(game, random);
    assert.equal(game.players.reduce((sum, p) => sum + p.tricks, 0), game.round);
    game.nextRound();
  }
  assert.equal(game.history.length, 20);
});

// ------------------------------------------------------------ Kombinationen

test('Varianten lassen sich einzeln zuschalten, ohne das Grundspiel zu ändern', () => {
  const plain = new WizardGame({ playerIds: P3, seed: 4 });
  assert.deepEqual(plain.variants, {
    avoidTricks: false,
    plusMinusOne: false,
    hiddenBids: false,
  });
  plain.start();
  assert.equal(plain.phase === 'bidding' || plain.phase === 'choosing_trump', true);
  assert.equal(plain.publicState().lowestWins, false);
});

test('Engine lehnt eine unbekannte Variante still ab', () => {
  const game = new WizardGame({ playerIds: P3, variants: { quatsch: true } });
  assert.equal(game.variants.quatsch, undefined);
});

test('GameError trägt einen Code für die Oberfläche', () => {
  const game = gameWith({
    hands: [CS('red-5', 'blue-2'), CS('red-3', 'blue-4'), CS('red-13', 'blue-6')],
    top: CS('yellow-9'),
    variants: { plusMinusOne: true },
  });
  game.bid('p1', 1);
  game.bid('p2', 0);
  try {
    game.bid('p0', 1);
    assert.fail('hätte werfen müssen');
  } catch (error) {
    assert.ok(error instanceof GameError);
    assert.equal(error.code, 'forbidden_bid');
  }
});
