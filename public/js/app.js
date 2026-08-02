/**
 * Anwendungslogik des Clients: verbindet Netzwerk, Zustand und Ansichten.
 *
 * Der Client rendert ausschließlich, was der Server schickt. Er kennt weder
 * fremde Hände noch entscheidet er über Regeln – das macht der Server.
 */

import { $, joinNames, show, toast } from './dom.js';
import { Net } from './net.js';
import { deckStyle, lastName, session, tableStyle } from './store.js';
import { renderCard } from './cards.js';
import { renderLobby } from './lobby.js';
import { renderVariantDocs } from './variants.js';
import { applyDeck, renderDeckPicker } from './decks.js';
import { applyTable, renderTablePicker } from './tables.js';
import { renderGameOver, renderRoundOverlay, renderScoreboard, renderTable } from './table.js';

const net = new Net();

const app = {
  meId: null,
  code: null,
  room: null,
  state: null,
  hand: [],
  legal: [],
  canBid: false,
  forbiddenBid: null,
  yourBid: null,
  screen: 'home',
};

// ---------------------------------------------------------------- Ansichten

const SCREENS = { home: 'screen-home', lobby: 'screen-lobby', game: 'screen-game' };

function showScreen(name) {
  app.screen = name;
  for (const [key, id] of Object.entries(SCREENS)) show($(id), key === name);
  if (name !== 'game') {
    for (const id of ['overlay-bid', 'overlay-trump', 'overlay-round', 'overlay-scores']) {
      show($(id), false);
    }
    document.body.classList.remove('hand-above-dialog');
  }
}

/** Ergänzt Wertungseinträge um die Spielernamen. */
function withNames(entries) {
  const names = new Map((app.state?.players ?? []).map((p) => [p.id, p.name]));
  return entries.map((entry) => ({ ...entry, name: entry.name ?? names.get(entry.playerId) ?? '?' }));
}

function render() {
  if (!app.room) {
    showScreen('home');
    return;
  }
  if (!app.state || app.state.phase === 'idle') {
    // Beim Reconnect kommt `room_state` vor `game_state` – dann kurz warten,
    // statt für einen Wimpernschlag die Lobby zu zeigen.
    if (app.room.started) return;
    showScreen('lobby');
    renderLobby(app.room, app.meId, {
      onToggleVariant: (key, value) =>
        net.send({
          type: 'set_variants',
          variants: { ...(app.room.variants ?? {}), [key]: value },
        }),
      onRounds: (rounds) => net.send({ type: 'set_rounds', rounds }),
    });
    return;
  }

  showScreen('game');
  show($('btn-abort'), app.room.hostId === app.meId && app.state.phase !== 'game_over');
  renderTable({
    state: app.state,
    hand: app.hand,
    legal: app.legal,
    meId: app.meId,
    onPlay: (card) => net.send({ type: 'play_card', cardId: card.id }),
    onBid: (value) => net.send({ type: 'make_bid', value }),
    onTrump: (suit) => net.send({ type: 'choose_trump', suit }),
    canBid: app.canBid,
    forbiddenBid: app.forbiddenBid,
    yourBid: app.yourBid,
  });

  // Rundenwertung
  if (app.state.phase === 'round_end' && app.state.roundResult) {
    renderRoundOverlay(
      { round: app.state.roundResult.round, entries: withNames(app.state.roundResult.entries) },
      app.meId,
      app.state.variants,
    );
    const ready = new Set(app.state.readyForNext ?? []);
    const waiting = app.state.players
      .filter((p) => p.connected && !p.isBot && !ready.has(p.id))
      .map((p) => p.name);
    $('btn-continue').disabled = ready.has(app.meId);
    $('round-waiting').textContent = waiting.length
      ? `Warten auf ${joinNames(waiting)} …`
      : 'Weiter geht’s …';
  } else {
    show($('overlay-round'), false);
  }

  // Endstand
  if (app.state.phase === 'game_over' && app.state.ranking) {
    renderGameOver({ ranking: withNames(app.state.ranking) }, app.meId, app.state.variants);
  } else {
    show($('overlay-gameover'), false);
  }
}

// ------------------------------------------------------------- Netzwerk

net.resume = () => {
  const saved = session.load();
  if (!saved) return null;
  return { type: 'reconnect', code: saved.code, playerId: saved.playerId, token: saved.token };
};

net.on('status', ({ online }) => {
  show($('connection'), !online);
  $('connection-text').textContent = 'Verbindung verloren – versuche erneut zu verbinden …';
});

net.on('joined', (message) => {
  app.meId = message.playerId;
  app.code = message.code;
  session.save(message);
  lastName.set(message.name);
  if (message.reconnected) toast('Willkommen zurück!', 'good');
});

net.on('room_state', (message) => {
  app.room = message.room;
  if (!app.room.started) app.state = null;
  render();
});

net.on('game_state', (message) => {
  app.state = message.state;
  render();
});

net.on('your_hand', (message) => {
  app.hand = message.hand ?? [];
  app.legal = message.legal ?? [];
  app.canBid = Boolean(message.canBid);
  app.forbiddenBid = message.forbiddenBid ?? null;
  app.yourBid = message.yourBid ?? null;
  render();
});

// Wer den Stich gewinnt, steht ohnehin am Tisch – nur der eigene Erfolg
// bekommt eine kurze Rückmeldung.
net.on('trick_won', (message) => {
  if (message.winnerId === app.meId) toast('Der Stich gehört dir!', 'good', 1800);
});

net.on('game_aborted', (message) => {
  for (const id of ['overlay-bid', 'overlay-trump', 'overlay-round', 'overlay-gameover']) {
    show($(id), false);
  }
  toast(`${message.by} hat das Spiel abgebrochen.`, 'error', 4000);
});

net.on('trump_chosen', (message) => {
  if (message.playerId !== app.meId) {
    toast(`${message.name} wählt ${SUIT_NAMES[message.suit] ?? message.suit} als Trumpf.`);
  }
});

function resetSession() {
  session.clear();
  Object.assign(app, {
    meId: null,
    code: null,
    room: null,
    state: null,
    hand: [],
    legal: [],
    canBid: false,
    forbiddenBid: null,
    yourBid: null,
  });
}

net.on('left', () => {
  resetSession();
  render();
});

net.on('error', (message) => {
  toast(message.message ?? 'Fehler', 'error');
  if (['bad_token', 'no_such_room', 'not_in_room'].includes(message.code)) {
    resetSession();
    render();
  }
});

const SUIT_NAMES = { blue: 'Blau', red: 'Rot', green: 'Grün', yellow: 'Gelb' };

// ------------------------------------------------------------ Bedienung

/** Drei Beispielkarten auf der Startseite – zeigt gleich, wie das Deck aussieht. */
function renderHeroCards() {
  $('hero-cards').replaceChildren(
    ...[
      { id: 'red-13', kind: 'suit', suit: 'red', value: 13 },
      { id: 'wizard-1', kind: 'wizard', suit: null, value: null },
      { id: 'green-11', kind: 'suit', suit: 'green', value: 11 },
    ].map((card, index) => {
      const node = renderCard(card);
      node.classList.add(`hero-card--${index + 1}`);
      return node;
    }),
  );
}

function currentName() {
  const name = $('input-name').value.trim();
  if (name.length < 2) {
    toast('Bitte gib einen Namen mit mindestens 2 Zeichen ein.', 'error');
    $('input-name').focus();
    return null;
  }
  lastName.set(name);
  return name;
}

$('btn-create').addEventListener('click', () => {
  const name = currentName();
  if (name) net.send({ type: 'create_room', name });
});

$('btn-join').addEventListener('click', () => {
  const name = currentName();
  if (!name) return;
  const code = $('input-code').value.trim().toUpperCase();
  if (code.length !== 4) {
    toast('Der Raum-Code besteht aus 4 Zeichen.', 'error');
    $('input-code').focus();
    return;
  }
  net.send({ type: 'join_room', code, name });
});

$('input-code').addEventListener('input', (event) => {
  event.target.value = event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
});

for (const id of ['input-name', 'input-code']) {
  $(id).addEventListener('keydown', (event) => {
    if (event.key !== 'Enter') return;
    ($('input-code').value.trim().length === 4 ? $('btn-join') : $('btn-create')).click();
  });
}

$('btn-start').addEventListener('click', () => net.send({ type: 'start_game' }));
$('btn-leave').addEventListener('click', () => net.send({ type: 'leave_room' }));
$('btn-continue').addEventListener('click', () => {
  $('btn-continue').disabled = true;
  net.send({ type: 'continue_round' });
});

$('btn-bot-add').addEventListener('click', () => net.send({ type: 'add_bot' }));
$('btn-bot-remove').addEventListener('click', () => net.send({ type: 'remove_bot' }));

$('btn-abort').addEventListener('click', () => show($('overlay-abort'), true));
$('btn-abort-cancel').addEventListener('click', () => show($('overlay-abort'), false));
$('btn-abort-confirm').addEventListener('click', () => {
  show($('overlay-abort'), false);
  net.send({ type: 'abort_game' });
});

// --------------------------------------------------------- Kartendesign

/** Design wählen: speichern, anwenden und alle Karten neu zeichnen. */
function pickDeck(id) {
  deckStyle.set(applyDeck(id));
  renderDeckPicker($('deck-list'), deckStyle.get(), pickDeck);
  renderHeroCards();
  render();
}

/** Spieltisch wählen: speichern und sofort anwenden. */
function pickTable(id) {
  tableStyle.set(applyTable(id));
  renderTablePicker($('table-list'), tableStyle.get(), pickTable);
}

function openDeckPicker() {
  renderDeckPicker($('deck-list'), deckStyle.get(), pickDeck);
  renderTablePicker($('table-list'), tableStyle.get(), pickTable);
  show($('overlay-decks'), true);
}

for (const id of ['btn-decks-home', 'btn-decks-game']) {
  $(id).addEventListener('click', openDeckPicker);
}
$('btn-close-decks').addEventListener('click', () => show($('overlay-decks'), false));

$('btn-copy-code').addEventListener('click', async () => {
  const code = app.room?.code ?? '';
  try {
    await navigator.clipboard.writeText(code);
    toast('Code kopiert.', 'good');
  } catch {
    toast(`Raum-Code: ${code}`);
  }
});

renderVariantDocs($('rules-variants'));

$('btn-scores').addEventListener('click', () => {
  if (app.state) renderScoreboard(app.state, app.meId);
});
$('btn-close-scores').addEventListener('click', () => show($('overlay-scores'), false));

for (const id of ['btn-rules-home', 'btn-rules-game']) {
  $(id).addEventListener('click', () => show($('overlay-rules'), true));
}
$('btn-close-rules').addEventListener('click', () => show($('overlay-rules'), false));

$('btn-home').addEventListener('click', () => {
  show($('overlay-gameover'), false);
  net.send({ type: 'leave_room' });
});

document.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape') return;
  for (const id of ['overlay-rules', 'overlay-scores', 'overlay-decks', 'overlay-abort']) {
    show($(id), false);
  }
});

// Beim Zurückkehren auf die Seite (Handy aus dem Standby) sofort prüfen.
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') net.connect();
});

// ----------------------------------------------------------------- Start

$('input-name').value = lastName.get();
applyDeck(deckStyle.get());
applyTable(tableStyle.get());
renderHeroCards();
const saved = session.load();
if (saved) {
  app.meId = saved.playerId;
  app.code = saved.code;
  $('input-code').value = saved.code;
}
net.connect();
render();
