/**
 * Wizard – Spiel-Engine (autoritativ, ohne Netzwerk).
 *
 * Die Engine kennt keine Sockets und keine Räume. Sie hält den kompletten
 * Spielzustand und akzeptiert nur regelkonforme Züge; alles andere wirft
 * einen `GameError` mit deutschem Klartext.
 *
 * Phasen:
 *   'idle'          – noch nicht gestartet
 *   'choosing_trump'– Zauberer aufgedeckt, Geber wählt die Trumpffarbe
 *   'bidding'       – Ansagen reihum
 *   'playing'       – Stiche werden gespielt
 *   'round_end'     – Runde gewertet, wartet auf nextRound()
 *   'game_over'     – Spiel beendet
 */

import { createDeck, isSuitCard, isWizard, isJester } from './cards.js';
import { mulberry32, randomSeed, shuffle } from './rng.js';
import {
  MAX_PLAYERS,
  MIN_PLAYERS,
  isLegalPlay,
  isValidBid,
  isValidSuit,
  clampRounds,
  leadSuitOf,
  legalCards,
  lowestWins,
  normalizeVariants,
  roundsForPlayers,
  scoreRoundFor,
  trickWinnerIndex,
} from './rules.js';

export class GameError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'GameError';
    this.code = code;
  }
}

export class WizardGame {
  /**
   * @param {object} options
   * @param {string[]} options.playerIds Sitzreihenfolge im Uhrzeigersinn
   * @param {number} [options.seed] Seed für den Mischalgorithmus
   * @param {number} [options.startDealerIndex] Geber der ersten Runde
   * @param {object} [options.variants] Regelerweiterungen (siehe rules.js)
   * @param {number} [options.roundsTotal] Gewünschte Rundenzahl (Standard: Maximum)
   * @param {(round: number) => object[]} [options.deckFor]
   *        Test-Hook: liefert ein fertig sortiertes 60-Karten-Deck pro Runde.
   */
  constructor({ playerIds, seed, startDealerIndex = 0, deckFor, variants, roundsTotal } = {}) {
    if (!Array.isArray(playerIds)) {
      throw new GameError('invalid_players', 'Spielerliste fehlt.');
    }
    if (playerIds.length < MIN_PLAYERS || playerIds.length > MAX_PLAYERS) {
      throw new GameError(
        'invalid_players',
        `Wizard braucht ${MIN_PLAYERS} bis ${MAX_PLAYERS} Spieler.`,
      );
    }
    if (new Set(playerIds).size !== playerIds.length) {
      throw new GameError('invalid_players', 'Spieler-IDs müssen eindeutig sein.');
    }

    this.variants = normalizeVariants(variants);
    this.seed = seed ?? randomSeed();
    this.random = mulberry32(this.seed);
    this.deckFor = deckFor ?? (() => shuffle(createDeck(), this.random));

    this.players = playerIds.map((id) => ({
      id,
      hand: [],
      bid: null,
      tricks: 0,
      score: 0,
    }));
    this.playerCount = this.players.length;
    this.maxRounds = roundsForPlayers(this.playerCount);
    this.roundsTotal = clampRounds(roundsTotal, this.playerCount);

    this.round = 0;
    this.phase = 'idle';
    this.dealerIndex = ((startDealerIndex % this.playerCount) + this.playerCount) % this.playerCount;
    this.turnIndex = null;

    this.stack = []; // verdeckter Nachziehstapel (Reste)
    this.trumpCard = null; // aufgedeckte Karte (null in der letzten Runde)
    this.trumpSuit = null; // null = kein Trumpf

    this.trickNumber = 0;
    this.trick = []; // [{playerId, card}]
    this.trickResult = null; // {winnerId, cards} solange der Stich noch liegt
    this.roundResult = null; // Wertung der letzten Runde
    this.history = []; // alle Rundenwertungen
  }

  // ---------------------------------------------------------------- Helfer

  get dealerId() {
    return this.players[this.dealerIndex].id;
  }

  get turnPlayerId() {
    return this.turnIndex === null ? null : this.players[this.turnIndex].id;
  }

  /** Linker Nachbar = nächster Spieler im Uhrzeigersinn. */
  leftOf(index) {
    return (index + 1) % this.playerCount;
  }

  indexOf(playerId) {
    const index = this.players.findIndex((p) => p.id === playerId);
    if (index === -1) throw new GameError('unknown_player', 'Unbekannter Spieler.');
    return index;
  }

  player(playerId) {
    return this.players[this.indexOf(playerId)];
  }

  requirePhase(phase) {
    if (this.phase !== phase) {
      throw new GameError('wrong_phase', 'Das ist gerade nicht möglich.');
    }
  }

  requireTurn(playerId) {
    if (this.turnPlayerId !== playerId) {
      throw new GameError('not_your_turn', 'Du bist nicht am Zug.');
    }
  }

  // ---------------------------------------------------------------- Ablauf

  /** Startet das Spiel mit Runde 1. */
  start() {
    if (this.phase !== 'idle') {
      throw new GameError('wrong_phase', 'Das Spiel läuft bereits.');
    }
    this.beginRound();
  }

  /** Gibt Karten, deckt die Trumpfkarte auf und startet die Ansagen. */
  beginRound() {
    this.round += 1;
    this.trickNumber = 0;
    this.trick = [];
    this.trickResult = null;
    this.roundResult = null;
    this.trumpCard = null;
    this.trumpSuit = null;

    const deck = this.deckFor(this.round);
    if (deck.length !== 60) {
      throw new GameError('invalid_deck', 'Das Deck muss 60 Karten haben.');
    }

    // Geben: reihum, beginnend beim linken Nachbarn des Gebers.
    for (const player of this.players) {
      player.hand = [];
      player.bid = null;
      player.tricks = 0;
    }
    let cursor = 0;
    for (let c = 0; c < this.round; c++) {
      for (let step = 0; step < this.playerCount; step++) {
        const index = (this.dealerIndex + 1 + step) % this.playerCount;
        this.players[index].hand.push(deck[cursor++]);
      }
    }
    this.stack = deck.slice(cursor);

    // Trumpf bestimmen.
    if (this.stack.length === 0) {
      // Letzte Runde: alle Karten verteilt → kein Trumpf.
      this.trumpCard = null;
      this.trumpSuit = null;
      this.startBidding();
      return;
    }

    this.trumpCard = this.stack[0];
    if (isSuitCard(this.trumpCard)) {
      this.trumpSuit = this.trumpCard.suit;
      this.startBidding();
    } else if (isJester(this.trumpCard)) {
      this.trumpSuit = null; // Narr → kein Trumpf
      this.startBidding();
    } else if (isWizard(this.trumpCard)) {
      // Der Geber wählt – er hat seine Hand bereits gesehen.
      this.trumpSuit = null;
      this.phase = 'choosing_trump';
      this.turnIndex = this.dealerIndex;
    }
  }

  startBidding() {
    // Variante „Nur keine Stiche!“: Es wird nicht angesagt – jeder will null.
    if (this.variants.avoidTricks) {
      for (const player of this.players) player.bid = 0;
      this.startPlaying();
      return;
    }
    this.phase = 'bidding';
    // Verdeckte Ansage: alle gleichzeitig, also niemand „am Zug“.
    this.turnIndex = this.variants.hiddenBids ? null : this.leftOf(this.dealerIndex);
  }

  startPlaying() {
    this.phase = 'playing';
    this.trickNumber = 1;
    this.turnIndex = this.leftOf(this.dealerIndex);
  }

  /**
   * Variante „Plus/minus Eins“: Der letzte Ansager (der Geber) darf die Zahl
   * nicht wählen, mit der die Summe aller Ansagen genau der Stichzahl der
   * Runde entspricht.
   *
   * @returns {number|null} verbotene Ansage oder null
   */
  forbiddenBidFor(playerId) {
    if (!this.variants.plusMinusOne || this.phase !== 'bidding') return null;
    const open = this.players.filter((p) => p.bid === null);
    if (open.length !== 1 || open[0].id !== playerId) return null;
    const placed = this.players.reduce((sum, p) => sum + (p.bid ?? 0), 0);
    const forbidden = this.round - placed;
    return forbidden >= 0 && forbidden <= this.round ? forbidden : null;
  }

  /** Trumpfwahl des Gebers, wenn ein Zauberer aufgedeckt wurde. */
  chooseTrump(playerId, suit) {
    this.requirePhase('choosing_trump');
    if (playerId !== this.dealerId) {
      throw new GameError('not_dealer', 'Nur der Geber bestimmt die Trumpffarbe.');
    }
    if (!isValidSuit(suit)) {
      throw new GameError('invalid_suit', 'Ungültige Trumpffarbe.');
    }
    this.trumpSuit = suit;
    this.startBidding();
    return { type: 'trump_chosen', playerId, suit };
  }

  /** Ansage eines Spielers (0 … Rundennummer). */
  bid(playerId, value) {
    this.requirePhase('bidding');
    const player = this.player(playerId);

    if (this.variants.hiddenBids) {
      // Reihenfolge egal – aber jeder nur einmal.
      if (player.bid !== null) {
        throw new GameError('already_bid', 'Du hast bereits angesagt.');
      }
    } else {
      this.requireTurn(playerId);
    }

    if (!isValidBid(value, this.round)) {
      throw new GameError(
        'invalid_bid',
        `Die Ansage muss zwischen 0 und ${this.round} liegen.`,
      );
    }

    const forbidden = this.forbiddenBidFor(playerId);
    if (forbidden !== null && value === forbidden) {
      throw new GameError(
        'forbidden_bid',
        `„Plus/minus Eins“: Die Summe der Ansagen darf nicht ${this.round} ergeben – ${value} ist nicht erlaubt.`,
      );
    }

    player.bid = value;

    if (this.players.every((p) => p.bid !== null)) {
      this.startPlaying();
    } else if (!this.variants.hiddenBids) {
      this.turnIndex = this.leftOf(this.turnIndex);
    }
    return { type: 'bid_made', playerId, value };
  }

  /** Die aktuell legal spielbaren Karten eines Spielers. */
  legalCardsFor(playerId) {
    const player = this.player(playerId);
    if (this.phase !== 'playing' || this.trickResult || this.turnPlayerId !== playerId) {
      return [];
    }
    return legalCards(player.hand, this.trick);
  }

  /** Spielt eine Karte aus. */
  playCard(playerId, cardId) {
    this.requirePhase('playing');
    if (this.trickResult) {
      throw new GameError('trick_pending', 'Der Stich wird noch abgeräumt.');
    }
    this.requireTurn(playerId);

    const player = this.player(playerId);
    const cardIndex = player.hand.findIndex((c) => c.id === cardId);
    if (cardIndex === -1) {
      throw new GameError('no_such_card', 'Diese Karte hast du nicht auf der Hand.');
    }
    const card = player.hand[cardIndex];
    if (!isLegalPlay(card, player.hand, this.trick)) {
      throw new GameError('must_follow_suit', 'Du musst die angespielte Farbe bedienen.');
    }

    player.hand.splice(cardIndex, 1);
    this.trick.push({ playerId, card });

    if (this.trick.length === this.playerCount) {
      const winnerIndex = trickWinnerIndex(this.trick, this.trumpSuit);
      const winner = this.trick[winnerIndex];
      this.trickResult = {
        winnerId: winner.playerId,
        winningCard: winner.card,
        cards: this.trick.map((p) => ({ ...p })),
        trickNumber: this.trickNumber,
      };
      this.turnIndex = null;
      return { type: 'trick_complete', ...this.trickResult };
    }

    this.turnIndex = this.leftOf(this.turnIndex);
    return { type: 'card_played', playerId, card };
  }

  /**
   * Räumt den fertigen Stich ab: der Gewinner bekommt ihn gutgeschrieben und
   * eröffnet den nächsten. War es der letzte Stich, wird die Runde gewertet.
   */
  finishTrick() {
    if (!this.trickResult) {
      throw new GameError('no_trick', 'Es liegt kein fertiger Stich.');
    }
    const winnerIndex = this.indexOf(this.trickResult.winnerId);
    this.players[winnerIndex].tricks += 1;
    this.trick = [];
    this.trickResult = null;

    if (this.trickNumber >= this.round) {
      return this.scoreRound();
    }
    this.trickNumber += 1;
    this.turnIndex = winnerIndex;
    return { type: 'next_trick', leaderId: this.players[winnerIndex].id };
  }

  /** Wertet die Runde und wechselt in die Phase 'round_end'. */
  scoreRound() {
    const entries = this.players.map((player) => {
      const delta = scoreRoundFor(player.bid, player.tricks, this.variants);
      player.score += delta;
      return {
        playerId: player.id,
        bid: player.bid,
        tricks: player.tricks,
        delta,
        total: player.score,
        hit: player.bid === player.tricks,
      };
    });
    this.roundResult = { round: this.round, entries };
    this.history.push(this.roundResult);
    this.phase = 'round_end';
    this.turnIndex = null;
    return { type: 'round_scored', ...this.roundResult };
  }

  /** Nächste Runde – oder Spielende. */
  nextRound() {
    this.requirePhase('round_end');
    if (this.round >= this.roundsTotal) {
      this.phase = 'game_over';
      return { type: 'game_over', ranking: this.ranking() };
    }
    this.dealerIndex = this.leftOf(this.dealerIndex); // Geber rotiert im Uhrzeigersinn
    this.beginRound();
    return { type: 'round_started', round: this.round };
  }

  /**
   * Endstand, bester Platz zuerst. In der Variante „Nur keine Stiche!“ gewinnt
   * die niedrigste Punktzahl, sonst die höchste.
   */
  ranking() {
    const ascending = lowestWins(this.variants);
    return this.players
      .map((p) => ({ playerId: p.id, score: p.score }))
      .sort((a, b) => (ascending ? a.score - b.score : b.score - a.score))
      .map((entry, index, all) => ({
        ...entry,
        rank: all.findIndex((e) => e.score === entry.score) + 1,
      }));
  }

  // ------------------------------------------------------------- Ausgaben

  /**
   * Der öffentliche Tischzustand – enthält NIEMALS fremde Handkarten.
   * Bei verdeckter Ansage bleiben auch die Ansagen geheim, bis alle abgegeben
   * haben; die eigene Ansage bekommt jeder über `bidOf()` mitgeteilt.
   */
  publicState() {
    const allBidsIn = this.players.every((p) => p.bid !== null);
    const hideBids = this.variants.hiddenBids && this.phase === 'bidding' && !allBidsIn;
    return {
      variants: { ...this.variants },
      lowestWins: lowestWins(this.variants),
      bidsHidden: hideBids,
      phase: this.phase,
      round: this.round,
      roundsTotal: this.roundsTotal,
      maxRounds: this.maxRounds,
      dealerId: this.phase === 'idle' ? null : this.dealerId,
      turnPlayerId: this.turnPlayerId,
      trumpCard: this.trumpCard,
      trumpSuit: this.trumpSuit,
      leadSuit: leadSuitOf(this.trick),
      stackSize: this.stack.length,
      trickNumber: this.trickNumber,
      trick: this.trick.map((p) => ({ playerId: p.playerId, card: p.card })),
      trickResult: this.trickResult
        ? { winnerId: this.trickResult.winnerId, winningCardId: this.trickResult.winningCard.id }
        : null,
      bidsTotal: hideBids ? null : this.players.reduce((sum, p) => sum + (p.bid ?? 0), 0),
      allBidsIn,
      players: this.players.map((p) => ({
        id: p.id,
        bid: hideBids ? null : p.bid,
        hasBid: p.bid !== null,
        tricks: p.tricks,
        score: p.score,
        handCount: p.hand.length,
      })),
      roundResult: this.roundResult,
      ranking: this.phase === 'game_over' ? this.ranking() : null,
    };
  }

  /** Die eigene Hand eines Spielers (nur für ihn selbst). */
  handOf(playerId) {
    return this.player(playerId).hand.map((c) => ({ ...c }));
  }

  /** Die eigene Ansage – auch bei verdeckter Ansage sichtbar. */
  bidOf(playerId) {
    return this.player(playerId).bid;
  }

  /** Darf dieser Spieler gerade ansagen? */
  canBid(playerId) {
    if (this.phase !== 'bidding') return false;
    if (this.variants.hiddenBids) return this.player(playerId).bid === null;
    return this.turnPlayerId === playerId;
  }
}

export { GameError as WizardGameError };
