/**
 * WebSocket-Protokoll: übersetzt Client-Nachrichten in Engine-Aufrufe und
 * verteilt den autoritativen Zustand.
 *
 * Grundregel: Handkarten verlassen den Server nur an ihren Besitzer
 * (`your_hand`). Alles andere ist der öffentliche Tischzustand.
 */

import { GameError } from '../game/engine.js';
import { RoomError, RoomStore, sanitizeName } from './rooms.js';

/** Wie lange ein fertiger Stich liegen bleibt, bevor er abgeräumt wird. */
export const TRICK_DISPLAY_MS = 2600;
/** Wie lange die Rundenwertung stehen bleibt, wenn niemand „Weiter“ drückt. */
export const ROUND_END_MS = 15000;
/** Gnadenfrist, bis ein getrennter Spieler aus der offenen Lobby fliegt. */
export const LOBBY_GRACE_MS = 90000;

const send = (socket, payload) => {
  if (socket && socket.readyState === 1) {
    socket.send(JSON.stringify(payload));
  }
};

export class GameHub {
  constructor({
    store = new RoomStore(),
    log = () => {},
    trickDisplayMs = Number(process.env.WIZARD_TRICK_MS ?? TRICK_DISPLAY_MS),
    roundEndMs = Number(process.env.WIZARD_ROUND_MS ?? ROUND_END_MS),
  } = {}) {
    this.store = store;
    this.log = log;
    this.trickDisplayMs = trickDisplayMs;
    this.roundEndMs = roundEndMs;
  }

  // ------------------------------------------------------------ Verbindung

  handleConnection(socket) {
    socket.session = null;
    socket.isAlive = true;

    socket.on('pong', () => {
      socket.isAlive = true;
    });

    socket.on('message', (raw) => {
      let message;
      try {
        message = JSON.parse(raw.toString());
      } catch {
        return send(socket, { type: 'error', code: 'bad_json', message: 'Ungültige Nachricht.' });
      }
      try {
        this.handleMessage(socket, message);
      } catch (error) {
        if (error instanceof GameError || error instanceof RoomError) {
          send(socket, { type: 'error', code: error.code, message: error.message });
        } else {
          this.log('Unerwarteter Fehler:', error);
          send(socket, {
            type: 'error',
            code: 'internal',
            message: 'Da ist auf dem Server etwas schiefgelaufen.',
          });
        }
      }
    });

    socket.on('close', () => this.handleDisconnect(socket));
    socket.on('error', () => this.handleDisconnect(socket));
  }

  handleDisconnect(socket) {
    const session = socket.session;
    socket.session = null;
    if (!session) return;
    const room = this.store.get(session.roomCode);
    if (!room) return;
    const player = room.player(session.playerId);
    if (!player || player.socket !== socket) return;

    player.connected = false;
    player.socket = null;
    room.touch();
    this.log(`« ${player.name} hat Raum ${room.code} verlassen (Verbindung getrennt)`);

    if (!room.started) {
      // In der offenen Lobby nach kurzer Gnadenfrist den Platz freigeben.
      room.later(() => {
        const stillThere = room.player(player.id);
        if (stillThere && !stillThere.connected && !room.started) {
          room.removePlayer(player.id);
          this.broadcast(room);
          if (!room.players.length) this.store.delete(room.code);
        }
      }, LOBBY_GRACE_MS);
    }
    this.broadcast(room);
  }

  // -------------------------------------------------------------- Routing

  handleMessage(socket, message) {
    const type = message?.type;
    switch (type) {
      case 'ping':
        return send(socket, { type: 'pong' });
      case 'create_room':
        return this.createRoom(socket, message);
      case 'join_room':
        return this.joinRoom(socket, message);
      case 'reconnect':
        return this.reconnect(socket, message);
      case 'leave_room':
        return this.leaveRoom(socket);
      case 'start_game':
        return this.startGame(socket);
      case 'choose_trump':
        return this.chooseTrump(socket, message);
      case 'make_bid':
        return this.makeBid(socket, message);
      case 'play_card':
        return this.playCard(socket, message);
      case 'continue_round':
        return this.continueRound(socket);
      default:
        return send(socket, {
          type: 'error',
          code: 'unknown_type',
          message: 'Unbekannte Nachricht.',
        });
    }
  }

  /** Liefert {room, player} für einen angemeldeten Socket. */
  context(socket) {
    if (!socket.session) {
      throw new RoomError('not_in_room', 'Du bist in keinem Raum.');
    }
    const room = this.store.require(socket.session.roomCode);
    const player = room.player(socket.session.playerId);
    if (!player) {
      socket.session = null;
      throw new RoomError('not_in_room', 'Du bist in keinem Raum.');
    }
    return { room, player };
  }

  attach(socket, room, player) {
    if (player.socket && player.socket !== socket) {
      const old = player.socket;
      old.session = null;
      send(old, {
        type: 'error',
        code: 'session_replaced',
        message: 'Du hast dich in einem anderen Fenster verbunden.',
      });
      try {
        old.close();
      } catch {
        /* egal */
      }
    }
    player.socket = socket;
    player.connected = true;
    socket.session = { roomCode: room.code, playerId: player.id };
    room.touch();
  }

  // ---------------------------------------------------------- Lobby-Aktionen

  createRoom(socket, message) {
    const name = sanitizeName(message.name);
    const room = this.store.create();
    const player = room.addPlayer(name);
    this.attach(socket, room, player);
    this.log(`+ Raum ${room.code} erstellt von ${name}`);
    send(socket, {
      type: 'joined',
      code: room.code,
      playerId: player.id,
      token: player.token,
      name: player.name,
    });
    this.broadcast(room);
  }

  joinRoom(socket, message) {
    const name = sanitizeName(message.name);
    const room = this.store.require(message.code);
    const player = room.addPlayer(name);
    this.attach(socket, room, player);
    this.log(`→ ${name} betritt Raum ${room.code}`);
    send(socket, {
      type: 'joined',
      code: room.code,
      playerId: player.id,
      token: player.token,
      name: player.name,
    });
    this.broadcast(room);
  }

  /** Platz + Hand mit dem Session-Token wiederherstellen. */
  reconnect(socket, message) {
    const room = this.store.require(message.code);
    const player = room.playerByToken(String(message.token ?? ''));
    if (!player || player.id !== message.playerId) {
      throw new RoomError('bad_token', 'Deine Sitzung ist abgelaufen.');
    }
    this.attach(socket, room, player);
    this.log(`↺ ${player.name} ist zurück in Raum ${room.code}`);
    send(socket, {
      type: 'joined',
      code: room.code,
      playerId: player.id,
      token: player.token,
      name: player.name,
      reconnected: true,
    });
    this.broadcast(room);
  }

  leaveRoom(socket) {
    const { room, player } = this.context(socket);
    socket.session = null;
    if (room.started) {
      // Im laufenden Spiel bleibt der Platz erhalten (Reconnect möglich).
      player.connected = false;
      player.socket = null;
    } else {
      room.removePlayer(player.id);
    }
    send(socket, { type: 'left' });
    if (!room.players.length) {
      this.store.delete(room.code);
      return;
    }
    this.broadcast(room);
  }

  startGame(socket) {
    const { room, player } = this.context(socket);
    if (room.hostId !== player.id) {
      throw new RoomError('not_host', 'Nur der Host kann das Spiel starten.');
    }
    room.start();
    room.readyForNext = new Set();
    this.log(`▶ Raum ${room.code} startet mit ${room.players.length} Spielern`);
    this.broadcast(room);
  }

  // ---------------------------------------------------------- Spielaktionen

  requireGame(socket) {
    const { room, player } = this.context(socket);
    if (!room.game) {
      throw new RoomError('not_started', 'Das Spiel läuft noch nicht.');
    }
    return { room, player, game: room.game };
  }

  chooseTrump(socket, message) {
    const { room, player, game } = this.requireGame(socket);
    game.chooseTrump(player.id, message.suit);
    this.broadcast(room, {
      type: 'trump_chosen',
      playerId: player.id,
      name: player.name,
      suit: message.suit,
    });
  }

  makeBid(socket, message) {
    const { room, player, game } = this.requireGame(socket);
    game.bid(player.id, message.value);
    this.broadcast(room, {
      type: 'bid_made',
      playerId: player.id,
      name: player.name,
      value: message.value,
    });
  }

  playCard(socket, message) {
    const { room, player, game } = this.requireGame(socket);
    const event = game.playCard(player.id, String(message.cardId ?? ''));

    if (event.type === 'trick_complete') {
      const winner = room.player(event.winnerId);
      this.broadcast(room, {
        type: 'trick_won',
        winnerId: event.winnerId,
        winnerName: winner?.name ?? '?',
        winningCard: event.winningCard,
        cards: event.cards,
      });
      room.later(() => this.advanceTrick(room), this.trickDisplayMs);
      return;
    }
    this.broadcast(room);
  }

  advanceTrick(room) {
    if (!room.game || !room.game.trickResult) return;
    const event = room.game.finishTrick();
    if (event.type === 'round_scored') {
      room.readyForNext = new Set();
      this.broadcast(room, {
        type: 'round_scored',
        round: event.round,
        entries: this.withNames(room, event.entries),
      });
      room.later(() => this.advanceRound(room), this.roundEndMs);
      return;
    }
    this.broadcast(room);
  }

  /** „Weiter“-Klick in der Rundenwertung. */
  continueRound(socket) {
    const { room, player, game } = this.requireGame(socket);
    if (game.phase !== 'round_end') return;
    room.readyForNext ??= new Set();
    room.readyForNext.add(player.id);
    const waitingFor = room.players.filter(
      (p) => p.connected && !room.readyForNext.has(p.id),
    );
    if (waitingFor.length === 0) {
      this.advanceRound(room);
    } else {
      this.broadcast(room, { type: 'ready_update', ready: [...room.readyForNext] });
    }
  }

  advanceRound(room) {
    if (!room.game || room.game.phase !== 'round_end') return;
    room.readyForNext = new Set();
    const event = room.game.nextRound();
    if (event.type === 'game_over') {
      this.log(`■ Raum ${room.code}: Spiel beendet`);
      this.broadcast(room, {
        type: 'game_over',
        ranking: event.ranking.map((entry) => ({
          ...entry,
          name: room.player(entry.playerId)?.name ?? '?',
        })),
      });
      return;
    }
    this.broadcast(room, { type: 'round_started', round: event.round });
  }

  withNames(room, entries) {
    return entries.map((entry) => ({
      ...entry,
      name: room.player(entry.playerId)?.name ?? '?',
    }));
  }

  // ------------------------------------------------------------ Verteilung

  /**
   * Schickt allen verbundenen Spielern den aktuellen Zustand – jedem seine
   * eigene Hand, allen denselben öffentlichen Tisch.
   */
  broadcast(room, extraEvent = null) {
    const lobby = room.lobbyState();
    const state = room.publicState();
    if (state) {
      state.readyForNext = [...(room.readyForNext ?? [])];
    }
    for (const player of room.players) {
      if (!player.connected || !player.socket) continue;
      send(player.socket, { type: 'room_state', room: lobby });
      if (state) {
        send(player.socket, { type: 'game_state', state });
        send(player.socket, {
          type: 'your_hand',
          hand: room.game.handOf(player.id),
          legal: room.game.legalCardsFor(player.id).map((c) => c.id),
        });
      }
      if (extraEvent) send(player.socket, extraEvent);
    }
  }
}
