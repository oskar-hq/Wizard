/**
 * Integrationstests für Server + WebSocket-Protokoll.
 * Es wird ein echter Server auf einem freien Port gestartet.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';

import WebSocket from 'ws';

import { createServer } from '../server/app.js';

/** Ein Testclient mit Nachrichtenpuffer und `waitFor`. */
class Client {
  constructor(url, label) {
    this.label = label;
    this.socket = new WebSocket(url);
    this.messages = [];
    this.waiters = [];
    this.socket.on('message', (raw) => {
      const message = JSON.parse(raw.toString());
      this.messages.push(message);
      for (const waiter of [...this.waiters]) {
        if (waiter.match(message)) {
          this.waiters.splice(this.waiters.indexOf(waiter), 1);
          waiter.resolve(message);
        }
      }
    });
  }

  static async connect(url, label) {
    const client = new Client(url, label);
    await once(client.socket, 'open');
    return client;
  }

  send(payload) {
    this.socket.send(JSON.stringify(payload));
  }

  /** Wartet auf die nächste (oder bereits eingetroffene) passende Nachricht. */
  waitFor(match, { timeout = 5000, fresh = false } = {}) {
    const predicate = typeof match === 'string' ? (m) => m.type === match : match;
    if (!fresh) {
      const existing = this.messages.filter(predicate).pop();
      if (existing) return Promise.resolve(existing);
    }
    return new Promise((resolve, reject) => {
      const waiter = { match: predicate, resolve };
      this.waiters.push(waiter);
      setTimeout(() => {
        const index = this.waiters.indexOf(waiter);
        if (index !== -1) {
          this.waiters.splice(index, 1);
          reject(new Error(`${this.label}: Timeout beim Warten auf ${match}`));
        }
      }, timeout).unref();
    });
  }

  /** Der zuletzt empfangene Zustand eines Typs. */
  last(type) {
    return [...this.messages].reverse().find((m) => m.type === type) ?? null;
  }

  get state() {
    return this.last('game_state')?.state ?? null;
  }

  get hand() {
    return this.last('your_hand')?.hand ?? [];
  }

  clear() {
    this.messages = [];
  }

  close() {
    this.socket.close();
  }
}

/** Startet einen Server und liefert URL + Aufräumfunktion. */
async function startServer() {
  const { server, close, store } = createServer({
    hub: { trickDisplayMs: 30, roundEndMs: 60000 },
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  return { url: `ws://127.0.0.1:${port}/ws`, httpUrl: `http://127.0.0.1:${port}`, close, store };
}

/** Erstellt einen Raum mit `names.length` Spielern. */
async function makeRoom(url, names) {
  const clients = [];
  const host = await Client.connect(url, names[0]);
  host.send({ type: 'create_room', name: names[0] });
  const joined = await host.waitFor('joined');
  host.session = joined;
  clients.push(host);

  for (const name of names.slice(1)) {
    const client = await Client.connect(url, name);
    client.send({ type: 'join_room', code: joined.code, name });
    client.session = await client.waitFor('joined');
    clients.push(client);
  }
  // Warten, bis alle in der Lobby sichtbar sind.
  await host.waitFor((m) => m.type === 'room_state' && m.room.players.length === names.length);
  return { code: joined.code, clients };
}

const byId = (clients) => new Map(clients.map((c) => [c.session.playerId, c]));

test('Lobby: Raum erstellen, beitreten, Host darf als Einziger starten', async (t) => {
  const { url, close } = await startServer();
  t.after(close);

  const { code, clients } = await makeRoom(url, ['Anna', 'Ben', 'Cem']);
  const [anna, ben] = clients;

  assert.match(code, /^[A-Z2-9]{4}$/);
  const lobby = anna.last('room_state').room;
  assert.equal(lobby.players.length, 3);
  assert.equal(lobby.hostId, anna.session.playerId);
  assert.ok(lobby.players.every((p) => p.connected));

  ben.send({ type: 'start_game' });
  const error = await ben.waitFor('error');
  assert.equal(error.code, 'not_host');

  anna.send({ type: 'start_game' });
  const state = (await anna.waitFor('game_state')).state;
  assert.equal(state.round, 1);
  assert.equal(state.roundsTotal, 20);
  for (const client of clients) client.close();
});

test('Beitreten scheitert bei unbekanntem Code, doppeltem Namen und vollem Raum', async (t) => {
  const { url, close } = await startServer();
  t.after(close);

  const ghost = await Client.connect(url, 'Geist');
  ghost.send({ type: 'join_room', code: 'ZZZZ', name: 'Geist' });
  assert.equal((await ghost.waitFor('error')).code, 'no_such_room');

  const { code, clients } = await makeRoom(url, ['Anna', 'Ben', 'Cem']);
  const twin = await Client.connect(url, 'Anna2');
  twin.send({ type: 'join_room', code, name: 'Anna' });
  assert.equal((await twin.waitFor('error')).code, 'name_taken');

  const tooShort = await Client.connect(url, 'X');
  tooShort.send({ type: 'join_room', code, name: 'X' });
  assert.equal((await tooShort.waitFor('error')).code, 'invalid_name');

  // Auf 6 auffüllen, dann muss der siebte abgewiesen werden.
  for (const name of ['Dana', 'Emil', 'Fee']) {
    const extra = await Client.connect(url, name);
    extra.send({ type: 'join_room', code, name });
    await extra.waitFor('joined');
    clients.push(extra);
  }
  const seventh = await Client.connect(url, 'Gustav');
  seventh.send({ type: 'join_room', code, name: 'Gustav' });
  assert.equal((await seventh.waitFor('error')).code, 'room_full');

  for (const client of [...clients, ghost, twin, tooShort, seventh]) client.close();
});

test('Jeder Client sieht nur seine eigene Hand', async (t) => {
  const { url, close } = await startServer();
  t.after(close);

  const { clients } = await makeRoom(url, ['Anna', 'Ben', 'Cem']);
  clients[0].send({ type: 'start_game' });
  for (const client of clients) await client.waitFor('your_hand');

  const hands = clients.map((c) => c.hand.map((card) => card.id));
  for (const hand of hands) assert.equal(hand.length, 1);
  assert.equal(new Set(hands.flat()).size, 3, 'Alle Hände sind verschieden');

  // Im öffentlichen Zustand tauchen keine fremden Karten auf.
  const publicJson = JSON.stringify(clients[0].state);
  for (const id of [...hands[1], ...hands[2]]) {
    assert.ok(!publicJson.includes(id), `${id} darf nicht öffentlich sein`);
  }
  for (const player of clients[0].state.players) {
    assert.equal(player.handCount, 1);
    assert.equal(player.hand, undefined);
  }
  for (const client of clients) client.close();
});

test('Komplette Runde über WebSockets inkl. Trumpfwahl, Ansage, Stich und Wertung', async (t) => {
  const { url, close } = await startServer();
  t.after(close);

  const { clients } = await makeRoom(url, ['Anna', 'Ben', 'Cem']);
  const lookup = byId(clients);
  clients[0].send({ type: 'start_game' });
  for (const client of clients) await client.waitFor('game_state');

  let state = clients[0].state;

  // Trumpfwahl, falls ein Zauberer aufgedeckt wurde.
  if (state.phase === 'choosing_trump') {
    const dealer = lookup.get(state.dealerId);
    dealer.send({ type: 'choose_trump', suit: 'red' });
    await clients[0].waitFor(
      (m) => m.type === 'game_state' && m.state.phase === 'bidding',
      { fresh: true },
    );
    state = clients[0].state;
    assert.equal(state.trumpSuit, 'red');
  }

  // Ansagen: nur wer am Zug ist, darf ansagen.
  const notInTurn = clients.find((c) => c.session.playerId !== state.turnPlayerId);
  notInTurn.send({ type: 'make_bid', value: 0 });
  assert.equal((await notInTurn.waitFor('error')).code, 'not_your_turn');

  const active = lookup.get(state.turnPlayerId);
  active.send({ type: 'make_bid', value: 5 });
  assert.equal((await active.waitFor((m) => m.type === 'error' && m.code === 'invalid_bid')).code, 'invalid_bid');

  while (clients[0].state.phase === 'bidding') {
    const current = lookup.get(clients[0].state.turnPlayerId);
    const before = clients[0].state.players.filter((p) => p.bid !== null).length;
    current.send({ type: 'make_bid', value: 1 });
    await clients[0].waitFor(
      (m) => m.type === 'game_state' && m.state.players.filter((p) => p.bid !== null).length > before,
    );
  }

  assert.equal(clients[0].state.phase, 'playing');
  assert.equal(clients[0].state.bidsTotal, 3);

  // Stich spielen – illegale Karten werden abgelehnt.
  const leader = lookup.get(clients[0].state.turnPlayerId);
  const other = clients.find((c) => c !== leader);
  other.send({ type: 'play_card', cardId: other.hand[0].id });
  assert.equal((await other.waitFor('error')).code, 'not_your_turn');
  leader.send({ type: 'play_card', cardId: 'red-99' });
  assert.equal((await leader.waitFor((m) => m.type === 'error' && m.code === 'no_such_card')).code, 'no_such_card');

  for (let i = 0; i < 3; i++) {
    const current = lookup.get(clients[0].state.turnPlayerId);
    // Der Server schickt jedem Spieler mit, welche Karten er legal spielen darf.
    const yourHand = await current.waitFor((m) => m.type === 'your_hand' && m.legal.length > 0);
    current.send({ type: 'play_card', cardId: yourHand.legal[0] });
    if (i < 2) {
      await clients[0].waitFor(
        (m) => m.type === 'game_state' && m.state.trick.length === i + 1,
        { fresh: true },
      );
    }
  }

  const trickWon = await clients[0].waitFor('trick_won');
  assert.equal(trickWon.cards.length, 3);
  assert.ok(lookup.has(trickWon.winnerId));

  const scored = await clients[0].waitFor('round_scored');
  assert.equal(scored.round, 1);
  assert.equal(scored.entries.length, 3);
  const winnerEntry = scored.entries.find((e) => e.playerId === trickWon.winnerId);
  assert.equal(winnerEntry.tricks, 1);
  assert.equal(winnerEntry.delta, 30, 'Ansage 1, ein Stich → 20 + 10');
  for (const entry of scored.entries.filter((e) => e.playerId !== trickWon.winnerId)) {
    assert.equal(entry.delta, -10, 'Ansage 1, kein Stich → −10');
    assert.ok(entry.name, 'Namen werden mitgeschickt');
  }

  // „Weiter“ von allen startet sofort die nächste Runde.
  for (const client of clients) client.send({ type: 'continue_round' });
  const next = await clients[0].waitFor('round_started');
  assert.equal(next.round, 2);
  assert.equal(clients[0].hand.length, 2);

  for (const client of clients) client.close();
});

test('Reconnect stellt Platz und Hand wieder her', async (t) => {
  const { url, close } = await startServer();
  t.after(close);

  const { code, clients } = await makeRoom(url, ['Anna', 'Ben', 'Cem']);
  clients[0].send({ type: 'start_game' });
  for (const client of clients) await client.waitFor('your_hand');

  const ben = clients[1];
  const handBefore = ben.hand.map((c) => c.id);
  const session = ben.session;
  ben.close();

  // Die anderen sehen ihn als getrennt.
  await clients[0].waitFor(
    (m) => m.type === 'game_state' && m.state.players.some((p) => p.id === session.playerId && !p.connected),
    { fresh: true },
  );

  // Falsches Token wird abgewiesen.
  const impostor = await Client.connect(url, 'Betrüger');
  impostor.send({ type: 'reconnect', code, playerId: session.playerId, token: 'falsch' });
  assert.equal((await impostor.waitFor('error')).code, 'bad_token');
  impostor.close();

  // Mit dem richtigen Token ist er zurück – inklusive Hand.
  const back = await Client.connect(url, 'Ben (zurück)');
  back.send({ type: 'reconnect', code, playerId: session.playerId, token: session.token });
  const joined = await back.waitFor('joined');
  assert.equal(joined.reconnected, true);
  const hand = (await back.waitFor('your_hand')).hand.map((c) => c.id);
  assert.deepEqual(hand, handBefore);

  await clients[0].waitFor(
    (m) => m.type === 'game_state' && m.state.players.some((p) => p.id === session.playerId && p.connected),
    { fresh: true },
  );

  back.close();
  for (const client of clients) client.close();
});

test('Statische Auslieferung und /healthz funktionieren', async (t) => {
  const { httpUrl, close } = await startServer();
  t.after(close);

  const health = await fetch(`${httpUrl}/healthz`).then((r) => r.json());
  assert.equal(health.ok, true);

  const page = await fetch(httpUrl);
  assert.equal(page.status, 200);
  const html = await page.text();
  assert.match(html, /<title>.*Wizard/i);
});
