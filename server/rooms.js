/**
 * Raumverwaltung – hält alle Spielräume im Arbeitsspeicher.
 *
 * Ein Raum kennt seine Spieler (inkl. geheimem Session-Token für den
 * Reconnect) und – sobald gestartet – eine WizardGame-Instanz.
 */

import { randomBytes, randomUUID } from 'node:crypto';

import { WizardGame, GameError } from '../game/engine.js';
import {
  DEFAULT_VARIANTS,
  MAX_PLAYERS,
  MIN_PLAYERS,
  clampRounds,
  normalizeVariants,
  roundsForPlayers,
} from '../game/rules.js';
import { BOT_NAMES } from './bot.js';

/** Zeichen ohne Verwechslungsgefahr (kein 0/O, 1/I). */
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 4;

/** Wie lange ein Raum ohne verbundene Spieler überlebt (ms). */
export const ROOM_TTL_MS = 60 * 60 * 1000;

export class RoomError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'RoomError';
    this.code = code;
  }
}

function randomCode() {
  const bytes = randomBytes(CODE_LENGTH);
  let code = '';
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  }
  return code;
}

export function sanitizeName(raw) {
  const name = String(raw ?? '')
    // Steuerzeichen und Winkelklammern raus – Namen landen in fremden Browsern.
    .replace(/[\u0000-\u001f\u007f<>]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 16);
  if (name.length < 2) {
    throw new RoomError('invalid_name', 'Der Name muss 2 bis 16 Zeichen lang sein.');
  }
  return name;
}

export class Room {
  constructor(code) {
    this.code = code;
    this.players = []; // {id, name, token, connected, socket, isHost}
    this.game = null;
    this.variants = { ...DEFAULT_VARIANTS };
    this.roundsWanted = null; // null = so viele Runden wie möglich
    this.createdAt = Date.now();
    this.lastActivity = Date.now();
    this.timers = new Set();
    this.botTimer = null;
  }

  touch() {
    this.lastActivity = Date.now();
  }

  get hostId() {
    return this.players.find((p) => p.isHost)?.id ?? null;
  }

  get started() {
    return this.game !== null;
  }

  player(playerId) {
    return this.players.find((p) => p.id === playerId) ?? null;
  }

  playerByToken(token) {
    return this.players.find((p) => p.token === token) ?? null;
  }

  addPlayer(name) {
    if (this.started) {
      throw new RoomError('already_started', 'Das Spiel läuft bereits.');
    }
    if (this.players.length >= MAX_PLAYERS) {
      throw new RoomError('room_full', `Der Raum ist voll (max. ${MAX_PLAYERS} Spieler).`);
    }
    if (this.players.some((p) => p.name.toLowerCase() === name.toLowerCase())) {
      throw new RoomError('name_taken', 'Dieser Name ist im Raum schon vergeben.');
    }
    const player = {
      id: randomUUID(),
      token: randomBytes(24).toString('hex'),
      name,
      connected: false,
      socket: null,
      isHost: this.players.length === 0,
    };
    this.players.push(player);
    this.touch();
    return player;
  }

  /**
   * Setzt einen Bot an den Tisch. Bots haben keinen Socket und gelten immer
   * als anwesend; sie können nie Host werden.
   */
  addBot() {
    if (this.started) {
      throw new RoomError('already_started', 'Das Spiel läuft bereits.');
    }
    if (this.players.length >= MAX_PLAYERS) {
      throw new RoomError('room_full', `Der Raum ist voll (max. ${MAX_PLAYERS} Spieler).`);
    }
    const taken = new Set(this.players.map((p) => p.name.toLowerCase()));
    const name =
      BOT_NAMES.find((candidate) => !taken.has(candidate.toLowerCase())) ??
      `Bot ${this.players.length + 1}`;
    const bot = {
      id: randomUUID(),
      token: null,
      name,
      connected: true,
      socket: null,
      isHost: false,
      isBot: true,
    };
    this.players.push(bot);
    this.touch();
    return bot;
  }

  /** Entfernt den zuletzt hinzugefügten Bot (oder einen bestimmten). */
  removeBot(playerId = null) {
    if (this.started) {
      throw new RoomError('already_started', 'Das Spiel läuft bereits.');
    }
    const bots = this.players.filter((p) => p.isBot);
    const target = playerId ? bots.find((p) => p.id === playerId) : bots[bots.length - 1];
    if (!target) {
      throw new RoomError('no_such_bot', 'Es sitzt kein Bot am Tisch.');
    }
    this.removePlayer(target.id);
    return target;
  }

  get botCount() {
    return this.players.filter((p) => p.isBot).length;
  }

  get humanCount() {
    return this.players.filter((p) => !p.isBot).length;
  }

  /** Die höchste sinnvolle Rundenzahl bei der aktuellen Besetzung. */
  get maxRounds() {
    return roundsForPlayers(Math.max(MIN_PLAYERS, this.players.length));
  }

  /** Die tatsächlich gespielte Rundenzahl. */
  get roundsTotal() {
    return clampRounds(this.roundsWanted, Math.max(MIN_PLAYERS, this.players.length));
  }

  /**
   * Rundenzahl setzen (nur vor dem Spielstart). `null` = so viele wie möglich.
   * Die endgültige Begrenzung passiert erst beim Start, weil sich die
   * Spielerzahl in der Lobby noch ändern kann.
   */
  setRounds(wanted) {
    if (this.started) {
      throw new RoomError('already_started', 'Das Spiel läuft bereits.');
    }
    if (wanted === null || wanted === undefined) {
      this.roundsWanted = null;
    } else {
      const value = Number(wanted);
      if (!Number.isFinite(value)) {
        throw new RoomError('invalid_rounds', 'Ungültige Rundenzahl.');
      }
      const ceiling = roundsForPlayers(MIN_PLAYERS); // 20 – mehr geht nie
      this.roundsWanted = Math.max(1, Math.min(ceiling, Math.floor(value)));
    }
    this.touch();
    return this.roundsTotal;
  }

  /** Bricht eine laufende Partie ab; alle bleiben im Raum. */
  abortGame() {
    if (!this.game) {
      throw new RoomError('not_started', 'Es läuft gerade kein Spiel.');
    }
    this.clearTimers();
    this.game = null;
    this.readyForNext = new Set();
    this.touch();
  }

  removePlayer(playerId) {
    const index = this.players.findIndex((p) => p.id === playerId);
    if (index === -1) return;
    const [removed] = this.players.splice(index, 1);
    if (removed.isHost && this.players.length) {
      this.players[0].isHost = true;
    }
    this.touch();
  }

  /** Regelerweiterungen setzen (nur vor dem Spielstart). */
  setVariants(raw) {
    if (this.started) {
      throw new RoomError('already_started', 'Das Spiel läuft bereits.');
    }
    this.variants = normalizeVariants(raw);
    this.touch();
    return this.variants;
  }

  start(options = {}) {
    if (this.started) {
      throw new RoomError('already_started', 'Das Spiel läuft bereits.');
    }
    if (this.players.length < MIN_PLAYERS) {
      throw new RoomError(
        'not_enough_players',
        `Es werden mindestens ${MIN_PLAYERS} Spieler gebraucht.`,
      );
    }
    this.game = new WizardGame({
      playerIds: this.players.map((p) => p.id),
      startDealerIndex: Math.floor(Math.random() * this.players.length),
      variants: this.variants,
      roundsTotal: this.roundsWanted,
      ...options,
    });
    this.game.start();
    this.touch();
    return this.game;
  }

  /** Öffentliche Raumdaten für die Lobby. */
  lobbyState() {
    return {
      code: this.code,
      started: this.started,
      hostId: this.hostId,
      minPlayers: MIN_PLAYERS,
      maxPlayers: MAX_PLAYERS,
      variants: { ...this.variants },
      roundsTotal: this.roundsTotal,
      maxRounds: this.maxRounds,
      roundsWanted: this.roundsWanted,
      botCount: this.botCount,
      players: this.players.map((p) => ({
        id: p.id,
        name: p.name,
        connected: p.connected,
        isHost: p.isHost,
        isBot: Boolean(p.isBot),
      })),
    };
  }

  /** Öffentlicher Tischzustand inkl. Namen – niemals fremde Handkarten. */
  publicState() {
    if (!this.game) return null;
    const state = this.game.publicState();
    const meta = new Map(this.players.map((p) => [p.id, p]));
    state.players = state.players.map((p, index) => ({
      ...p,
      name: meta.get(p.id)?.name ?? '?',
      connected: meta.get(p.id)?.connected ?? false,
      isHost: meta.get(p.id)?.isHost ?? false,
      isBot: Boolean(meta.get(p.id)?.isBot),
      seat: index,
    }));
    state.code = this.code;
    return state;
  }

  clearTimers() {
    for (const timer of this.timers) clearTimeout(timer);
    this.timers.clear();
    this.botTimer = null;
  }

  /** setTimeout, das beim Aufräumen des Raums mit abgeräumt wird. */
  later(fn, ms) {
    const timer = setTimeout(() => {
      this.timers.delete(timer);
      fn();
    }, ms);
    this.timers.add(timer);
    return timer;
  }

  /** Nur echte Menschen halten einen Raum am Leben. */
  get anyoneConnected() {
    return this.players.some((p) => p.connected && !p.isBot);
  }
}

export class RoomStore {
  constructor() {
    this.rooms = new Map();
  }

  create() {
    let code;
    do {
      code = randomCode();
    } while (this.rooms.has(code));
    const room = new Room(code);
    this.rooms.set(code, room);
    return room;
  }

  get(code) {
    return this.rooms.get(String(code ?? '').toUpperCase().trim()) ?? null;
  }

  require(code) {
    const room = this.get(code);
    if (!room) {
      throw new RoomError('no_such_room', 'Diesen Raum gibt es nicht (mehr).');
    }
    return room;
  }

  delete(code) {
    const room = this.rooms.get(code);
    if (room) {
      room.clearTimers();
      this.rooms.delete(code);
    }
  }

  /** Räume aufräumen, in denen schon lange niemand mehr verbunden war. */
  sweep(ttl = ROOM_TTL_MS) {
    const now = Date.now();
    for (const [code, room] of this.rooms) {
      if (!room.anyoneConnected && now - room.lastActivity > ttl) {
        this.delete(code);
      }
    }
  }

  get size() {
    return this.rooms.size;
  }
}

export { GameError };
