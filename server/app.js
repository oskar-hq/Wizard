/**
 * Baut den HTTP-/WebSocket-Server zusammen – ohne ihn zu starten.
 * `server/index.js` startet ihn, die Tests benutzen dieselbe Funktion.
 */

import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import express from 'express';
import { WebSocketServer } from 'ws';

import { GameHub } from './protocol.js';
import { RoomStore } from './rooms.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const PUBLIC_DIR = path.join(__dirname, '..', 'public');

export function createServer({ log = () => {}, staticDir = PUBLIC_DIR, hub: hubOptions = {} } = {}) {
  const store = new RoomStore();
  const hub = new GameHub({ store, log, ...hubOptions });

  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', true);

  app.use(
    express.static(staticDir, {
      extensions: ['html'],
      maxAge: process.env.NODE_ENV === 'production' ? '1h' : 0,
    }),
  );

  app.get('/healthz', (_req, res) => {
    res.json({ ok: true, rooms: store.size, uptime: Math.round(process.uptime()) });
  });

  // Alles Unbekannte auf die Startseite (Single-Page-Frontend).
  app.use((_req, res) => res.sendFile(path.join(staticDir, 'index.html')));

  const server = http.createServer(app);
  const wss = new WebSocketServer({ server, path: '/ws', maxPayload: 64 * 1024 });
  wss.on('connection', (socket) => hub.handleConnection(socket));

  // Tote Verbindungen erkennen (Handy im Standby, Discord-Drop, …).
  const heartbeat = setInterval(() => {
    for (const socket of wss.clients) {
      if (socket.isAlive === false) {
        socket.terminate();
        continue;
      }
      socket.isAlive = false;
      try {
        socket.ping();
      } catch {
        /* egal */
      }
    }
  }, 30000);
  heartbeat.unref?.();

  // Verwaiste Räume aufräumen.
  const sweeper = setInterval(() => store.sweep(), 5 * 60 * 1000);
  sweeper.unref?.();

  async function close() {
    clearInterval(heartbeat);
    clearInterval(sweeper);
    for (const room of store.rooms.values()) room.clearTimers();
    for (const socket of wss.clients) socket.terminate();
    await new Promise((resolve) => wss.close(resolve));
    await new Promise((resolve) => server.close(resolve));
  }

  return { app, server, wss, hub, store, close };
}
