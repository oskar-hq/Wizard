import test from 'node:test';
import assert from 'node:assert/strict';

import { C, CS, riggedDeck } from './helpers.js';
import { GameError, WizardGame } from '../game/engine.js';
import { createDeck } from '../game/cards.js';
import { scoreFor } from '../game/rules.js';

const P3 = ['p0', 'p1', 'p2'];

/**
 * Baut ein Spiel mit vorgegebenen Händen. Die Rundennummer ergibt sich aus der
 * Handgröße (Runde r → r Karten pro Spieler).
 */
function gameWith({ hands, top = [], dealerIndex = 0, playerIds = P3 }) {
  const deck = riggedDeck({ hands, dealerIndex, top });
  const game = new WizardGame({
    playerIds,
    startDealerIndex: dealerIndex,
    deckFor: () => deck.map((c) => ({ ...c })),
  });
  game.round = hands[0].length - 1; // beginRound() zählt hoch
  game.start();
  return game;
}

// ------------------------------------------------------------- Grundsetup

test('Spielerzahl muss zwischen 3 und 6 liegen', () => {
  assert.throws(() => new WizardGame({ playerIds: ['a', 'b'] }), GameError);
  assert.throws(
    () => new WizardGame({ playerIds: ['a', 'b', 'c', 'd', 'e', 'f', 'g'] }),
    GameError,
  );
  assert.doesNotThrow(() => new WizardGame({ playerIds: P3 }));
});

test('Rundenzahl wird aus der Spielerzahl abgeleitet', () => {
  assert.equal(new WizardGame({ playerIds: P3 }).roundsTotal, 20);
  assert.equal(new WizardGame({ playerIds: ['a', 'b', 'c', 'd'] }).roundsTotal, 15);
  assert.equal(new WizardGame({ playerIds: ['a', 'b', 'c', 'd', 'e'] }).roundsTotal, 12);
  assert.equal(new WizardGame({ playerIds: ['a', 'b', 'c', 'd', 'e', 'f'] }).roundsTotal, 10);
});

test('Runde 1: jeder bekommt eine Karte, der Rest bleibt als Stapel liegen', () => {
  const game = gameWith({
    hands: [CS('red-5'), CS('blue-3'), CS('green-7')],
    top: CS('yellow-9'),
  });
  assert.equal(game.round, 1);
  assert.equal(game.handOf('p0').length, 1);
  assert.equal(game.handOf('p1').length, 1);
  assert.equal(game.handOf('p2').length, 1);
  assert.equal(game.stack.length, 57);
  assert.equal(game.trumpCard.id, 'yellow-9');
  assert.equal(game.trumpSuit, 'yellow');
  assert.equal(game.phase, 'bidding');
  // Ansagen beginnen beim linken Nachbarn des Gebers (p0 gibt → p1 sagt an).
  assert.equal(game.turnPlayerId, 'p1');
});

// ------------------------------------------------------------- Trumpfkarte

test('Aufgedeckter Narr → in dieser Runde kein Trumpf', () => {
  const game = gameWith({
    hands: [CS('red-5'), CS('blue-3'), CS('green-7')],
    top: CS('jester-1'),
  });
  assert.equal(game.trumpCard.id, 'jester-1');
  assert.equal(game.trumpSuit, null);
  assert.equal(game.phase, 'bidding');
});

test('Aufgedeckter Zauberer → der Geber wählt die Trumpffarbe, nachdem er seine Hand gesehen hat', () => {
  const game = gameWith({
    hands: [CS('red-5'), CS('blue-3'), CS('green-7')],
    top: CS('wizard-1'),
  });
  assert.equal(game.phase, 'choosing_trump');
  assert.equal(game.turnPlayerId, 'p0'); // p0 ist Geber
  assert.equal(game.trumpSuit, null);
  // Der Geber hat seine Karten bereits.
  assert.deepEqual(
    game.handOf('p0').map((c) => c.id),
    ['red-5'],
  );

  // Vor der Trumpfwahl darf nicht angesagt werden.
  assert.throws(() => game.bid('p1', 0), /nicht möglich/);
  // Nur der Geber darf wählen, und nur eine echte Farbe.
  assert.throws(() => game.chooseTrump('p1', 'red'), /Geber/);
  assert.throws(() => game.chooseTrump('p0', 'lila'), /Trumpffarbe/);

  game.chooseTrump('p0', 'yellow');
  assert.equal(game.trumpSuit, 'yellow');
  assert.equal(game.phase, 'bidding');
  assert.equal(game.turnPlayerId, 'p1');
});

test('Letzte Runde: alle Karten verteilt, kein Stapel, kein Trumpf', () => {
  const game = new WizardGame({ playerIds: P3 });
  game.start();
  // Direkt in die letzte Runde springen (Weißkasten-Test).
  game.round = game.roundsTotal - 1;
  game.phase = 'round_end';
  game.nextRound();

  assert.equal(game.round, 20);
  assert.equal(game.stack.length, 0);
  assert.equal(game.trumpCard, null);
  assert.equal(game.trumpSuit, null);
  assert.equal(game.phase, 'bidding');
  for (const id of P3) assert.equal(game.handOf(id).length, 20);
});

// ----------------------------------------------------------------- Ansage

test('Ansage nur 0 … Rundennummer und nur, wer am Zug ist', () => {
  const game = gameWith({
    hands: [CS('red-5'), CS('blue-3'), CS('green-7')],
    top: CS('yellow-9'),
  });
  assert.throws(() => game.bid('p0', 0), /nicht am Zug/);
  assert.throws(() => game.bid('p1', 2), /zwischen 0 und 1/);
  assert.throws(() => game.bid('p1', -1), /zwischen 0 und 1/);

  game.bid('p1', 1);
  game.bid('p2', 0);
  assert.equal(game.phase, 'bidding');
  game.bid('p0', 0);
  assert.equal(game.phase, 'playing');
  // Der linke Nachbar des Gebers eröffnet den ersten Stich.
  assert.equal(game.turnPlayerId, 'p1');
  assert.equal(game.trickNumber, 1);
});

// ------------------------------------------------------------- Kartenspiel

test('Bedienpflicht wird serverseitig erzwungen', () => {
  const game = gameWith({
    hands: [CS('red-5', 'blue-2'), CS('red-9', 'blue-4'), CS('green-7', 'jester-1')],
    top: CS('yellow-9'),
    dealerIndex: 0,
  });
  game.bid('p1', 1);
  game.bid('p2', 0);
  game.bid('p0', 0);

  game.playCard('p1', 'red-9'); // p1 eröffnet mit Rot
  assert.throws(() => game.playCard('p0', 'red-5'), /nicht am Zug/);
  // p2 hat kein Rot → darf abwerfen
  game.playCard('p2', 'green-7');
  // p0 hat Rot → darf kein Blau legen
  assert.throws(() => game.playCard('p0', 'blue-2'), /bedienen/);
  game.playCard('p0', 'red-5');

  assert.equal(game.trickResult.winnerId, 'p1');
});

test('Zauberer und Narr dürfen trotz Bedienpflicht gespielt werden', () => {
  const game = gameWith({
    hands: [CS('red-5', 'wizard-1'), CS('red-9', 'blue-4'), CS('red-2', 'jester-1')],
    top: CS('yellow-9'),
  });
  game.bid('p1', 1);
  game.bid('p2', 0);
  game.bid('p0', 1);

  game.playCard('p1', 'red-9');
  const legalP2 = game.legalCardsFor('p2').map((c) => c.id);
  assert.deepEqual(legalP2.sort(), ['jester-1', 'red-2']);
  game.playCard('p2', 'jester-1');
  const legalP0 = game.legalCardsFor('p0').map((c) => c.id);
  assert.deepEqual(legalP0.sort(), ['red-5', 'wizard-1']);
  game.playCard('p0', 'wizard-1');

  assert.equal(game.trickResult.winnerId, 'p0');
});

test('Karten, die man nicht hat, kann man nicht spielen', () => {
  const game = gameWith({
    hands: [CS('red-5'), CS('blue-3'), CS('green-7')],
    top: CS('yellow-9'),
  });
  game.bid('p1', 0);
  game.bid('p2', 0);
  game.bid('p0', 1);
  assert.throws(() => game.playCard('p1', 'red-5'), /nicht auf der Hand/);
});

test('Zauberer eröffnet → alle dürfen alles legen, der erste Zauberer gewinnt', () => {
  const game = gameWith({
    hands: [CS('red-5', 'red-6'), CS('wizard-1', 'red-1'), CS('red-2', 'blue-8')],
    top: CS('yellow-9'),
  });
  game.bid('p1', 1);
  game.bid('p2', 0);
  game.bid('p0', 1);

  game.playCard('p1', 'wizard-1');
  // p2 darf trotz Rot auf der Hand Blau abwerfen.
  assert.deepEqual(game.legalCardsFor('p2').map((c) => c.id).sort(), ['blue-8', 'red-2']);
  game.playCard('p2', 'blue-8');
  game.playCard('p0', 'red-6');
  assert.equal(game.trickResult.winnerId, 'p1');
});

test('Narr eröffnet → die nächste Farbkarte legt die Bedien-Farbe fest', () => {
  const game = gameWith({
    hands: [CS('green-3', 'blue-2'), CS('jester-1', 'red-1'), CS('green-11', 'green-4')],
    top: CS('yellow-9'),
  });
  game.bid('p1', 0);
  game.bid('p2', 1);
  game.bid('p0', 0);

  game.playCard('p1', 'jester-1');
  assert.equal(game.publicState().leadSuit, null);
  game.playCard('p2', 'green-11'); // legt Grün als Bedien-Farbe fest
  assert.equal(game.publicState().leadSuit, 'green');
  assert.throws(() => game.playCard('p0', 'blue-2'), /bedienen/);
  game.playCard('p0', 'green-3');
  assert.equal(game.trickResult.winnerId, 'p2');
});

test('Nur Narren im Stich → der erste Narr gewinnt', () => {
  const game = gameWith({
    hands: [CS('jester-3'), CS('jester-1'), CS('jester-2')],
    top: CS('yellow-9'),
  });
  game.bid('p1', 1);
  game.bid('p2', 0);
  game.bid('p0', 0);
  game.playCard('p1', 'jester-1');
  game.playCard('p2', 'jester-2');
  game.playCard('p0', 'jester-3');
  assert.equal(game.trickResult.winnerId, 'p1');
});

test('Der Gewinner eines Stichs eröffnet den nächsten', () => {
  const game = gameWith({
    hands: [CS('red-5', 'blue-2'), CS('red-3', 'blue-4'), CS('red-13', 'blue-6')],
    top: CS('yellow-9'),
  });
  game.bid('p1', 0);
  game.bid('p2', 1);
  game.bid('p0', 0);
  game.playCard('p1', 'red-3');
  game.playCard('p2', 'red-13');
  game.playCard('p0', 'red-5');
  assert.equal(game.trickResult.winnerId, 'p2');
  game.finishTrick();
  assert.equal(game.turnPlayerId, 'p2');
  assert.equal(game.trickNumber, 2);
  assert.equal(game.players.find((p) => p.id === 'p2').tricks, 1);
});

// ---------------------------------------------------------------- Wertung

test('Rundenwertung: getroffen 20 + 10×Stiche, daneben −10×Differenz', () => {
  const game = gameWith({
    hands: [CS('red-5', 'blue-2'), CS('red-3', 'blue-4'), CS('red-13', 'blue-6')],
    top: CS('yellow-9'),
  });
  game.bid('p1', 0); // bekommt 0 → +20
  game.bid('p2', 2); // bekommt 2 → +40
  game.bid('p0', 1); // bekommt 0 → −10

  game.playCard('p1', 'red-3');
  game.playCard('p2', 'red-13');
  game.playCard('p0', 'red-5');
  game.finishTrick();
  game.playCard('p2', 'blue-6');
  game.playCard('p0', 'blue-2');
  game.playCard('p1', 'blue-4');
  const event = game.finishTrick();

  assert.equal(event.type, 'round_scored');
  assert.equal(game.phase, 'round_end');
  const byId = Object.fromEntries(game.roundResult.entries.map((e) => [e.playerId, e]));
  assert.deepEqual(
    { bid: byId.p1.bid, tricks: byId.p1.tricks, delta: byId.p1.delta },
    { bid: 0, tricks: 0, delta: 20 },
  );
  assert.deepEqual(
    { bid: byId.p2.bid, tricks: byId.p2.tricks, delta: byId.p2.delta },
    { bid: 2, tricks: 2, delta: 40 },
  );
  assert.deepEqual(
    { bid: byId.p0.bid, tricks: byId.p0.tricks, delta: byId.p0.delta },
    { bid: 1, tricks: 0, delta: -10 },
  );
});

test('Punkte werden über die Runden aufsummiert und der Geber rotiert im Uhrzeigersinn', () => {
  const game = new WizardGame({ playerIds: P3, seed: 7 });
  game.start();
  assert.equal(game.dealerId, 'p0');
  playRoundWithBots(game);
  const afterRound1 = game.players.map((p) => p.score);
  game.nextRound();
  assert.equal(game.dealerId, 'p1');
  assert.equal(game.round, 2);
  playRoundWithBots(game);
  for (let i = 0; i < game.players.length; i++) {
    const entry = game.history[1].entries.find((e) => e.playerId === game.players[i].id);
    assert.equal(game.players[i].score, afterRound1[i] + entry.delta);
    assert.equal(entry.total, game.players[i].score);
  }
  game.nextRound();
  assert.equal(game.dealerId, 'p2');
});

// ------------------------------------------------------- Privatheit / Sim

test('Der öffentliche Zustand enthält keine fremden Handkarten', () => {
  const game = gameWith({
    hands: [CS('red-5', 'blue-2'), CS('red-3', 'blue-4'), CS('red-13', 'blue-6')],
    top: CS('yellow-9'),
  });
  const json = JSON.stringify(game.publicState());
  for (const id of ['red-5', 'blue-2', 'red-3', 'blue-4', 'red-13', 'blue-6']) {
    assert.ok(!json.includes(id), `${id} darf nicht im öffentlichen Zustand stehen`);
  }
  for (const p of game.publicState().players) {
    assert.equal(p.handCount, 2);
    assert.equal(p.hand, undefined);
  }
});

/** Spielt eine komplette Runde mit einfachen Bots zu Ende. */
function playRoundWithBots(game, random = Math.random) {
  if (game.phase === 'choosing_trump') {
    game.chooseTrump(game.dealerId, ['blue', 'red', 'green', 'yellow'][Math.floor(random() * 4)]);
  }
  while (game.phase === 'bidding') {
    game.bid(game.turnPlayerId, Math.floor(random() * (game.round + 1)));
  }
  while (game.phase === 'playing') {
    if (game.trickResult) {
      game.finishTrick();
      continue;
    }
    const options = game.legalCardsFor(game.turnPlayerId);
    assert.ok(options.length > 0, 'Es muss immer eine legale Karte geben');
    game.playCard(game.turnPlayerId, options[Math.floor(random() * options.length)].id);
  }
  return game.roundResult;
}

for (const playerCount of [3, 4, 5, 6]) {
  test(`Komplettes Spiel mit ${playerCount} Spielern läuft regelkonform durch`, () => {
    const playerIds = Array.from({ length: playerCount }, (_, i) => `p${i}`);
    const game = new WizardGame({ playerIds, seed: 1000 + playerCount });
    const random = (() => {
      let s = 42;
      return () => {
        s = (s * 1103515245 + 12345) % 2147483648;
        return s / 2147483648;
      };
    })();
    game.start();

    const allIds = new Set(createDeck().map((c) => c.id));
    let rounds = 0;

    while (game.phase !== 'game_over') {
      rounds += 1;
      // Kartenintegrität: Hände + Stapel = 60 eindeutige Karten.
      const seen = new Set();
      for (const p of game.players) for (const c of p.hand) seen.add(c.id);
      for (const c of game.stack) seen.add(c.id);
      assert.equal(seen.size, 60);
      for (const id of seen) assert.ok(allIds.has(id));
      for (const p of game.players) assert.equal(p.hand.length, game.round);

      playRoundWithBots(game, random);

      // Die Summe der Stiche entspricht der Rundennummer.
      const tricks = game.players.reduce((sum, p) => sum + p.tricks, 0);
      assert.equal(tricks, game.round);
      // Wertung stimmt mit der Regel überein.
      for (const entry of game.roundResult.entries) {
        assert.equal(entry.delta, scoreFor(entry.bid, entry.tricks));
      }
      game.nextRound();
    }

    assert.equal(rounds, Math.floor(60 / playerCount));
    assert.equal(game.history.length, rounds);
    // Endstand entspricht der Summe aller Rundendeltas.
    for (const player of game.players) {
      const sum = game.history
        .flatMap((h) => h.entries)
        .filter((e) => e.playerId === player.id)
        .reduce((acc, e) => acc + e.delta, 0);
      assert.equal(player.score, sum);
    }
    assert.equal(game.ranking()[0].rank, 1);
    assert.ok(game.ranking()[0].score >= game.ranking()[game.players.length - 1].score);
  });
}
