/**
 * Wizard Online – Serverstart.
 *
 * Express liefert das statische Frontend aus `public/`, `ws` hängt auf
 * demselben HTTP-Server unter `/ws`. Dadurch läuft alles über einen einzigen
 * Port – genau das, was ein Cloudflare Tunnel braucht.
 */

import { createServer } from './app.js';

const PORT = Number(process.env.PORT ?? 3000);
const HOST = process.env.HOST ?? '0.0.0.0';

const { server, wss, close } = createServer({
  log: (...args) => console.log(new Date().toISOString(), ...args),
});

server.listen(PORT, HOST, () => {
  console.log(`Wizard Online läuft auf http://${HOST}:${PORT} (WebSocket: /ws)`);
});

let shuttingDown = false;
async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`\n${signal} empfangen – fahre herunter …`);
  for (const socket of wss.clients) socket.close(1001, 'Server wird beendet');
  setTimeout(() => process.exit(0), 3000).unref();
  await close();
  process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
