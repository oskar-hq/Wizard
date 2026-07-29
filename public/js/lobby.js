/** Warteraum-Ansicht. */

import { $, el, fill } from './dom.js';
import { renderVariantList } from './variants.js';

export function renderLobby(room, meId, handlers = {}) {
  const { onToggleVariant, onRounds } = handlers;
  $('lobby-code').textContent = room.code;

  fill(
    $('lobby-players'),
    room.players.map((player) =>
      el('li.player-row', {}, [
        el(`span.dot${player.connected ? '' : '.dot--off'}`, {
          title: player.connected ? 'verbunden' : 'getrennt',
        }),
        el('span.name', { text: player.name }),
        player.isBot ? el('span.tag.tag--bot', { text: 'Bot' }) : null,
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
      ? `Noch ${missing} ${missing === 1 ? 'Spieler' : 'Spieler'} – teile den Code oder setze Bots dazu.`
      : `${count} Spieler bereit. Es kann losgehen!`;

  // ------------------------------------------------------------------ Bots

  $('bot-count').textContent = String(room.botCount ?? 0);
  $('btn-bot-add').disabled = !isHost || count >= room.maxPlayers;
  $('btn-bot-remove').disabled = !isHost || (room.botCount ?? 0) === 0;
  $('bot-note').textContent = isHost
    ? 'Bots füllen den Tisch auf, wenn Freunde fehlen. Sie sagen an und spielen selbst.'
    : 'Nur der Host kann Bots setzen.';

  // -------------------------------------------------------------- Runden

  const slider = $('rounds-slider');
  slider.max = String(room.maxRounds);
  slider.disabled = !isHost;
  // Nicht überschreiben, während der Host gerade zieht.
  if (document.activeElement !== slider) {
    slider.value = String(room.roundsTotal);
  }
  $('rounds-value').textContent = String(room.roundsTotal);
  $('rounds-note').textContent =
    room.roundsTotal === room.maxRounds
      ? `Volles Spiel: alle ${room.maxRounds} Runden (Maximum bei ${Math.max(
          count,
          room.minPlayers,
        )} Spielern).`
      : `Kurzes Spiel: ${room.roundsTotal} von ${room.maxRounds} möglichen Runden.`;

  if (onRounds && !slider.dataset.bound) {
    slider.dataset.bound = '1';
    const push = () => {
      $('rounds-value').textContent = slider.value;
      onRounds(Number(slider.value));
    };
    slider.addEventListener('input', () => {
      $('rounds-value').textContent = slider.value;
    });
    slider.addEventListener('change', push);
  }

  // ------------------------------------------------------- Erweiterungen

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
