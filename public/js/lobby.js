/** Warteraum-Ansicht. */

import { $, el, fill } from './dom.js';
import { renderVariantList } from './variants.js';

export function renderLobby(room, meId, { onToggleVariant } = {}) {
  $('lobby-code').textContent = room.code;

  fill(
    $('lobby-players'),
    room.players.map((player) =>
      el('li.player-row', {}, [
        el(`span.dot${player.connected ? '' : '.dot--off'}`, {
          title: player.connected ? 'verbunden' : 'getrennt',
        }),
        el('span.name', { text: player.name }),
        player.isHost ? el('span.tag.tag--host', { text: 'Host' }) : null,
        player.id === meId ? el('span.tag.tag--you', { text: 'Du' }) : null,
      ]),
    ),
  );

  const count = room.players.length;
  const missing = room.minPlayers - count;
  const isHost = room.hostId === meId;

  $('lobby-hint').textContent =
    missing > 0
      ? `Noch ${missing} ${missing === 1 ? 'Spieler' : 'Spieler'} – teile den Code mit deinen Freunden.`
      : `${count} Spieler bereit. Es kann losgehen!`;

  renderVariantList($('variant-list'), room.variants ?? {}, {
    editable: isHost,
    onToggle: onToggleVariant,
  });
  $('variants-note').textContent = isHost
    ? 'Ohne Häkchen gilt das Grundspiel.'
    : 'Nur der Host kann die Regeln ändern.';

  const startButton = $('btn-start');
  startButton.disabled = !isHost || missing > 0;
  startButton.textContent = isHost
    ? missing > 0
      ? `Mindestens ${room.minPlayers} Spieler nötig`
      : `Spiel starten (${count} Spieler)`
    : 'Nur der Host kann starten';
}
