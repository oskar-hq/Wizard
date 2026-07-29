import test from 'node:test';
import assert from 'node:assert/strict';

import { C, CS, trickOf } from './helpers.js';
import {
  isLegalPlay,
  isValidBid,
  leadSuitOf,
  legalCards,
  scoreFor,
  trickWinner,
} from '../game/rules.js';

// ------------------------------------------------------------ Bedien-Farbe

test('Erste Farbkarte legt die Bedien-Farbe fest', () => {
  assert.equal(leadSuitOf([]), null);
  assert.equal(leadSuitOf(trickOf(['a', 'red-5'])), 'red');
  assert.equal(leadSuitOf(trickOf(['a', 'red-5'], ['b', 'blue-9'])), 'red');
});

test('Narr eröffnet → die nächste Farbkarte legt die Bedien-Farbe fest', () => {
  assert.equal(leadSuitOf(trickOf(['a', 'jester-1'])), null);
  assert.equal(leadSuitOf(trickOf(['a', 'jester-1'], ['b', 'green-4'])), 'green');
  assert.equal(
    leadSuitOf(trickOf(['a', 'jester-1'], ['b', 'jester-2'], ['c', 'yellow-2'], ['d', 'red-13'])),
    'yellow',
  );
});

test('Zauberer eröffnet → es gibt keine Bedien-Farbe, alles ist erlaubt', () => {
  const trick = trickOf(['a', 'wizard-1'], ['b', 'red-3']);
  assert.equal(leadSuitOf(trick), null);
  const hand = CS('red-7', 'blue-2');
  assert.ok(isLegalPlay(C('blue-2'), hand, trick), 'Abwerfen muss erlaubt sein');
});

// ------------------------------------------------------------ Bedienpflicht

test('Bedienpflicht: wer die Farbe hat, darf keine andere Farbkarte legen', () => {
  const trick = trickOf(['a', 'red-5']);
  const hand = CS('red-9', 'blue-2', 'wizard-1', 'jester-1');

  assert.ok(isLegalPlay(C('red-9'), hand, trick), 'Bedienen ist erlaubt');
  assert.ok(!isLegalPlay(C('blue-2'), hand, trick), 'Andere Farbe ist verboten');
  assert.ok(isLegalPlay(C('wizard-1'), hand, trick), 'Zauberer darf immer');
  assert.ok(isLegalPlay(C('jester-1'), hand, trick), 'Narr darf immer');

  assert.deepEqual(
    legalCards(hand, trick).map((c) => c.id),
    ['red-9', 'wizard-1', 'jester-1'],
  );
});

test('Ohne die angespielte Farbe darf beliebig abgeworfen oder getrumpft werden', () => {
  const trick = trickOf(['a', 'red-5']);
  const hand = CS('blue-2', 'green-12');
  assert.ok(isLegalPlay(C('blue-2'), hand, trick));
  assert.ok(isLegalPlay(C('green-12'), hand, trick));
  assert.equal(legalCards(hand, trick).length, 2);
});

test('Der Eröffner darf alles spielen', () => {
  const hand = CS('red-5', 'blue-2', 'wizard-1', 'jester-1');
  assert.equal(legalCards(hand, []).length, 4);
});

// -------------------------------------------------------- Stich-Auflösung

test('Erster Zauberer im Stich gewinnt – egal was danach kommt', () => {
  const trick = trickOf(
    ['a', 'wizard-1'],
    ['b', 'wizard-2'],
    ['c', 'red-13'],
    ['d', 'jester-1'],
  );
  assert.equal(trickWinner(trick, 'red'), 'a');
});

test('Zauberer schlägt jeden Trumpf, auch wenn er später fällt', () => {
  const trick = trickOf(['a', 'red-13'], ['b', 'red-1'], ['c', 'wizard-3']);
  assert.equal(trickWinner(trick, 'red'), 'c');
});

test('Höchster Trumpf schlägt jede Farbkarte', () => {
  const trick = trickOf(['a', 'blue-13'], ['b', 'red-2'], ['c', 'blue-12']);
  assert.equal(trickWinner(trick, 'red'), 'b', 'Trumpf 2 schlägt Blau 13');
});

test('Mehrere Trümpfe: der höchste gewinnt', () => {
  const trick = trickOf(['a', 'blue-13'], ['b', 'red-2'], ['c', 'red-9'], ['d', 'red-4']);
  assert.equal(trickWinner(trick, 'red'), 'c');
});

test('Ohne Trumpf gewinnt die höchste Karte der angespielten Farbe', () => {
  const trick = trickOf(['a', 'green-7'], ['b', 'green-11'], ['c', 'yellow-13']);
  assert.equal(trickWinner(trick, null), 'b');
});

test('Narren verlieren jeden Stich', () => {
  const trick = trickOf(['a', 'jester-1'], ['b', 'blue-1'], ['c', 'jester-2']);
  assert.equal(trickWinner(trick, 'red'), 'b', 'Blau 1 schlägt beide Narren');
});

test('Nur Narren im Stich → der erste Narr gewinnt', () => {
  const trick = trickOf(['a', 'jester-1'], ['b', 'jester-2'], ['c', 'jester-3']);
  assert.equal(trickWinner(trick, 'red'), 'a');
  assert.equal(trickWinner(trick, null), 'a');
});

test('Narr eröffnet: die nachfolgende Farbe entscheidet den Stich', () => {
  const trick = trickOf(['a', 'jester-1'], ['b', 'green-4'], ['c', 'yellow-13'], ['d', 'green-5']);
  // Grün ist Bedien-Farbe, Gelb 13 ist wertlos (kein Trumpf).
  assert.equal(trickWinner(trick, null), 'd');
  // Mit Gelb als Trumpf gewinnt Gelb 13.
  assert.equal(trickWinner(trick, 'yellow'), 'c');
});

test('Zauberer eröffnet: auch ein späterer Trumpf verliert', () => {
  const trick = trickOf(['a', 'wizard-1'], ['b', 'red-13'], ['c', 'red-12']);
  assert.equal(trickWinner(trick, 'red'), 'a');
});

// --------------------------------------------------------------- Wertung

test('Punkte: getroffen → 20 + 10 × Stiche', () => {
  assert.equal(scoreFor(0, 0), 20);
  assert.equal(scoreFor(1, 1), 30);
  assert.equal(scoreFor(2, 2), 40);
  assert.equal(scoreFor(5, 5), 70);
});

test('Punkte: daneben → −10 × |Differenz|', () => {
  assert.equal(scoreFor(0, 1), -10);
  assert.equal(scoreFor(3, 1), -20);
  assert.equal(scoreFor(1, 4), -30);
  assert.equal(scoreFor(0, 5), -50);
});

test('Ansage muss zwischen 0 und der Rundennummer liegen', () => {
  assert.ok(isValidBid(0, 3));
  assert.ok(isValidBid(3, 3));
  assert.ok(!isValidBid(4, 3));
  assert.ok(!isValidBid(-1, 3));
  assert.ok(!isValidBid(1.5, 3));
  assert.ok(!isValidBid('2', 3));
});
