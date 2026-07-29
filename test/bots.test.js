/** Tests für Bot-Entscheidungen, Rundenzahl und Spielabbruch. */

import test from 'node:test';
import assert from 'node:assert/strict';

import { C, CS } from './helpers.js';
import { WizardGame } from '../game/engine.js';
import { clampRounds, roundsForPlayers } from '../game/rules.js';
import { botBid, botCard, botTrump, BOT_NAMES } from '../server/bot.js';
import { RoomStore } from '../server/rooms.js';

const P3 = ['p0', 'p1', 'p2'];

// ------------------------------------------------------------- Rundenzahl

test('clampRounds begrenzt auf das, was das Deck hergibt', () => {
  assert.equal(clampRounds(null, 4), 15, 'null = Maximum');
  assert.equal(clampRounds(undefined, 6), 10);
  assert.equal(clampRounds(7, 4), 7);
  assert.equal(clampRounds(99, 4), 15, 'nach oben begrenzt');
  assert.equal(clampRounds(0, 4), 1, 'mindestens eine Runde');
  assert.equal(clampRounds(-5, 3), 1);
  assert.equal(clampRounds(3.7, 3), 3, 'wird abgeschnitten');
  assert.equal(clampRounds('abc', 5), 12, 'Unsinn = Maximum');
});

test('Die Engine spielt genau die gewünschte Rundenzahl', () => {
  const game = new WizardGame({ playerIds: P3, seed: 3, roundsTotal: 4 });
  assert.equal(game.roundsTotal, 4);
  assert.equal(game.maxRounds, 20);
  game.start();

  let rounds = 0;
  let guard = 0;
  while (game.phase !== 'game_over' && guard++ < 100) {
    rounds += 1;
    if (game.phase === 'choosing_trump') game.chooseTrump(game.dealerId, 'red');
    while (game.phase === 'bidding') game.bid(game.turnPlayerId, 0);
    while (game.phase === 'playing') {
      if (game.trickResult) {
        game.finishTrick();
        continue;
      }
      game.playCard(game.turnPlayerId, game.legalCardsFor(game.turnPlayerId)[0].id);
    }
    game.nextRound();
  }
  assert.equal(rounds, 4);
  assert.equal(game.phase, 'game_over');
  assert.equal(game.history.length, 4);
});

test('Eine zu große Rundenzahl wird auf das Maximum gekürzt', () => {
  const game = new WizardGame({ playerIds: ['a', 'b', 'c', 'd', 'e', 'f'], roundsTotal: 50 });
  assert.equal(game.roundsTotal, roundsForPlayers(6));
});

// -------------------------------------------------------------- Bot-Logik

test('Bot sagt bei starker Hand mehr an als bei schwacher', () => {
  const random = () => 0.9; // keine Zufallsstreuung
  const stark = botBid({
    hand: CS('wizard-1', 'wizard-2', 'red-13', 'red-12', 'red-11'),
    round: 5,
    trumpSuit: 'red',
    random,
  });
  const schwach = botBid({
    hand: CS('jester-1', 'jester-2', 'blue-2', 'green-3', 'yellow-4'),
    round: 5,
    trumpSuit: 'red',
    random,
  });
  assert.ok(stark >= 4, `starke Hand sollte hoch ansagen, war ${stark}`);
  assert.equal(schwach, 0, 'schwache Hand sagt null an');
});

test('Bot-Ansage bleibt immer im erlaubten Bereich', () => {
  for (let round = 1; round <= 20; round++) {
    for (let i = 0; i < 20; i++) {
      const hand = CS('wizard-1', 'wizard-2', 'wizard-3', 'wizard-4', 'red-13').slice(
        0,
        Math.min(5, round),
      );
      const bid = botBid({ hand, round, trumpSuit: 'red' });
      assert.ok(bid >= 0 && bid <= round, `Runde ${round}: Ansage ${bid}`);
      assert.ok(Number.isInteger(bid));
    }
  }
});

test('Bot umgeht die bei „Plus/minus Eins“ gesperrte Zahl', () => {
  for (let i = 0; i < 30; i++) {
    const bid = botBid({
      hand: CS('wizard-1', 'red-13'),
      round: 2,
      trumpSuit: 'red',
      forbidden: 2,
    });
    assert.notEqual(bid, 2);
    assert.ok(bid >= 0 && bid <= 2);
  }
});

test('Bot wählt die Trumpffarbe, in der er am stärksten ist', () => {
  assert.equal(
    botTrump({ hand: CS('green-13', 'green-12', 'green-4', 'red-2') }),
    'green',
  );
  assert.equal(botTrump({ hand: CS('yellow-13', 'yellow-11', 'blue-1') }), 'yellow');
  // Nur Sonderkarten → irgendeine gültige Farbe
  const suit = botTrump({ hand: CS('wizard-1', 'jester-1'), random: () => 0.1 });
  assert.ok(['blue', 'red', 'green', 'yellow'].includes(suit));
});

test('Bot wirft ab, wenn er keine Stiche mehr braucht', () => {
  const card = botCard({
    hand: CS('red-13', 'blue-2', 'jester-1'),
    trick: [{ playerId: 'x', card: C('red-5') }],
    trumpSuit: 'red',
    bid: 0,
    tricks: 0,
    tricksLeft: 3,
  });
  assert.equal(card.id, 'jester-1', 'der Narr ist der sicherste Abwurf');
});

test('Bot sticht, wenn er den Stich noch braucht', () => {
  const card = botCard({
    hand: CS('red-13', 'red-3', 'blue-2'),
    trick: [{ playerId: 'x', card: C('red-9') }],
    trumpSuit: 'blue',
    bid: 2,
    tricks: 0,
    tricksLeft: 2,
  });
  assert.equal(card.id, 'red-13', 'die Rot 13 gewinnt den Stich');
});

test('Bot spielt in der Variante „Nur keine Stiche!“ immer defensiv', () => {
  const card = botCard({
    hand: CS('red-13', 'red-2'),
    trick: [{ playerId: 'x', card: C('red-9') }],
    trumpSuit: null,
    bid: 0,
    tricks: 0,
    tricksLeft: 2,
    avoidTricks: true,
  });
  assert.equal(card.id, 'red-2', 'die niedrige Karte verliert den Stich');
});

test('Bot beachtet die Bedienpflicht', () => {
  const hand = CS('red-4', 'blue-13', 'blue-2');
  for (let i = 0; i < 30; i++) {
    const card = botCard({
      hand,
      trick: [{ playerId: 'x', card: C('red-9') }],
      trumpSuit: 'green',
      bid: 1,
      tricks: 0,
      tricksLeft: 3,
    });
    assert.equal(card.id, 'red-4', 'Rot muss bedient werden');
  }
});

test('Bot wählt immer eine Karte aus der eigenen Hand', () => {
  const game = new WizardGame({ playerIds: P3, seed: 77 });
  game.start();
  let guard = 0;
  while (game.phase !== 'game_over' && guard++ < 500) {
    if (game.phase === 'choosing_trump') {
      game.chooseTrump(game.dealerId, botTrump({ hand: game.handOf(game.dealerId) }));
    }
    while (game.phase === 'bidding') {
      const id = game.turnPlayerId;
      game.bid(
        id,
        botBid({
          hand: game.handOf(id),
          round: game.round,
          trumpSuit: game.trumpSuit,
          forbidden: game.forbiddenBidFor(id),
        }),
      );
    }
    while (game.phase === 'playing') {
      if (game.trickResult) {
        game.finishTrick();
        continue;
      }
      const id = game.turnPlayerId;
      const seat = game.player(id);
      const card = botCard({
        hand: game.handOf(id),
        trick: game.trick,
        trumpSuit: game.trumpSuit,
        bid: seat.bid,
        tricks: seat.tricks,
        tricksLeft: game.round - game.trickNumber + 1,
      });
      const legal = game.legalCardsFor(id).map((c) => c.id);
      assert.ok(legal.includes(card.id), `${card.id} war nicht legal (erlaubt: ${legal})`);
      game.playCard(id, card.id);
    }
    game.nextRound();
  }
  assert.equal(game.phase, 'game_over');
});

test('Bots spielen ein komplettes Spiel gegeneinander regelkonform durch', () => {
  const game = new WizardGame({ playerIds: ['a', 'b', 'c', 'd'], seed: 5, roundsTotal: 5 });
  game.start();
  let guard = 0;
  while (game.phase !== 'game_over' && guard++ < 200) {
    if (game.phase === 'choosing_trump') {
      game.chooseTrump(game.dealerId, botTrump({ hand: game.handOf(game.dealerId) }));
    }
    while (game.phase === 'bidding') {
      const id = game.turnPlayerId;
      game.bid(id, botBid({ hand: game.handOf(id), round: game.round, trumpSuit: game.trumpSuit }));
    }
    while (game.phase === 'playing') {
      if (game.trickResult) {
        game.finishTrick();
        continue;
      }
      const id = game.turnPlayerId;
      const seat = game.player(id);
      game.playCard(
        id,
        botCard({
          hand: game.handOf(id),
          trick: game.trick,
          trumpSuit: game.trumpSuit,
          bid: seat.bid,
          tricks: seat.tricks,
          tricksLeft: game.round - game.trickNumber + 1,
        }).id,
      );
    }
    assert.equal(
      game.players.reduce((sum, p) => sum + p.tricks, 0),
      game.round,
    );
    game.nextRound();
  }
  assert.equal(game.phase, 'game_over');
  assert.equal(game.history.length, 5);
});

// ----------------------------------------------------------- Raumverwaltung

test('Bots lassen sich setzen und wieder entfernen', () => {
  const room = new RoomStore().create();
  room.addPlayer('Anna');
  const bot1 = room.addBot();
  const bot2 = room.addBot();

  assert.equal(room.players.length, 3);
  assert.equal(room.botCount, 2);
  assert.equal(room.humanCount, 1);
  assert.ok(BOT_NAMES.includes(bot1.name));
  assert.notEqual(bot1.name, bot2.name, 'Bots bekommen verschiedene Namen');
  assert.equal(bot1.token, null, 'Bots haben kein Session-Token');
  assert.equal(bot1.isHost, false, 'ein Bot wird nie Host');

  const removed = room.removeBot();
  assert.equal(removed.id, bot2.id, 'ohne Angabe geht der letzte Bot');
  assert.equal(room.botCount, 1);

  room.removeBot();
  assert.throws(() => room.removeBot(), /kein Bot/);
});

test('Bots halten einen Raum nicht künstlich am Leben', () => {
  const room = new RoomStore().create();
  const anna = room.addPlayer('Anna');
  room.addBot();
  room.addBot();
  assert.equal(room.anyoneConnected, false, 'noch ist niemand verbunden');
  anna.connected = true;
  assert.equal(room.anyoneConnected, true);
  anna.connected = false;
  assert.equal(room.anyoneConnected, false, 'Bots zählen nicht als Zuschauer');
});

test('Der Tisch wird nicht überfüllt', () => {
  const room = new RoomStore().create();
  room.addPlayer('Anna');
  for (let i = 0; i < 5; i++) room.addBot();
  assert.equal(room.players.length, 6);
  assert.throws(() => room.addBot(), /voll/);
});

test('Ein laufendes Spiel lässt sich abbrechen, alle bleiben im Raum', () => {
  const room = new RoomStore().create();
  room.addPlayer('Anna');
  room.addBot();
  room.addBot();
  assert.throws(() => room.abortGame(), /kein Spiel/);

  room.start();
  assert.ok(room.started);
  assert.throws(() => room.addBot(), /läuft bereits/);
  assert.throws(() => room.setRounds(5), /läuft bereits/);

  room.abortGame();
  assert.equal(room.started, false);
  assert.equal(room.game, null);
  assert.equal(room.players.length, 3, 'alle sitzen weiter am Tisch');
  // Danach kann neu gestartet werden.
  room.setRounds(3);
  room.start();
  assert.equal(room.game.roundsTotal, 3);
});

test('Die Rundenzahl der Lobby landet in der Partie', () => {
  const room = new RoomStore().create();
  room.addPlayer('Anna');
  room.addBot();
  room.addBot();
  room.addBot();
  room.setRounds(6);
  assert.equal(room.lobbyState().roundsTotal, 6);
  assert.equal(room.lobbyState().maxRounds, 15);
  assert.equal(room.lobbyState().botCount, 3);
  room.start();
  assert.equal(room.game.roundsTotal, 6);
  assert.equal(room.publicState().roundsTotal, 6);
});
