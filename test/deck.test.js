import test from 'node:test';
import assert from 'node:assert/strict';

import { CARDS_PER_SUIT, SUITS, createDeck } from '../game/cards.js';
import { roundsForPlayers } from '../game/rules.js';
import { mulberry32, shuffle } from '../game/rng.js';

test('Deck hat exakt 60 Karten: 4×13 Farbkarten + 4 Zauberer + 4 Narren', () => {
  const deck = createDeck();
  assert.equal(deck.length, 60);

  assert.equal(deck.filter((c) => c.kind === 'suit').length, 52);
  assert.equal(deck.filter((c) => c.kind === 'wizard').length, 4);
  assert.equal(deck.filter((c) => c.kind === 'jester').length, 4);

  for (const suit of SUITS) {
    const cards = deck.filter((c) => c.kind === 'suit' && c.suit === suit);
    assert.equal(cards.length, CARDS_PER_SUIT, `Farbe ${suit}`);
    const values = cards.map((c) => c.value).sort((a, b) => a - b);
    assert.deepEqual(values, Array.from({ length: 13 }, (_, i) => i + 1));
  }
});

test('Alle Karten-IDs sind eindeutig', () => {
  const deck = createDeck();
  assert.equal(new Set(deck.map((c) => c.id)).size, 60);
});

test('Rundenzahl: 3→20, 4→15, 5→12, 6→10', () => {
  assert.equal(roundsForPlayers(3), 20);
  assert.equal(roundsForPlayers(4), 15);
  assert.equal(roundsForPlayers(5), 12);
  assert.equal(roundsForPlayers(6), 10);
});

test('Mischen erhält alle 60 Karten und ist mit Seed reproduzierbar', () => {
  const a = shuffle(createDeck(), mulberry32(1234));
  const b = shuffle(createDeck(), mulberry32(1234));
  assert.deepEqual(
    a.map((c) => c.id),
    b.map((c) => c.id),
  );
  assert.equal(new Set(a.map((c) => c.id)).size, 60);
  // Ein anderer Seed liefert (praktisch sicher) eine andere Reihenfolge.
  const c = shuffle(createDeck(), mulberry32(4321));
  assert.notDeepEqual(
    a.map((x) => x.id),
    c.map((x) => x.id),
  );
});
