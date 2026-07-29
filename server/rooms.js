/**
 * Raumverwaltung – hält alle Spielräume im Arbeitsspeicher.
 *
 * Ein Raum kennt seine Spieler (inkl. geheimem Session-Token für den
 * Reconnect) und – sobald gestartet – eine WizardGame-Instanz.
 */

import { randomBytes, randomUUID } from 'node:crypto';

import { WizardGame, GameError } from '../game/engine.js';
import { MAX_PLAYERS, MIN_PLAYERS } from '../game/rules.js';

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
    this.createdAt = Date.now();
    this.lastActivity = Date.now();
    this.timers = new Set();
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

  removePlayer(playerId) {
    const index = this.players.findIndex((p) => p.id === playerId);
    if (index === -1) return;
    const [removed] = this.players.splice(index, 1);
    if (removed.isHost && this.players.length) {
      this.players[0].isHost = true;
    }
    this.touch();
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
      players: this.players.map((p) => ({
        id: p.id,
        name: p.name,
        connected: p.connected,
        isHost: p.isHost,
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
      seat: index,
    }));
    state.code = this.code;
    return state;
  }

  clearTimers() {
    for (const timer of this.timers) clearTimeout(timer);
    this.timers.clear();
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

  get anyoneConnected() {
    return this.players.some((p) => p.connected);
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
