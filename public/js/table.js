/** Spieltisch-Ansicht: Kopfzeile, Spielerleiste, Stich, Hand und Dialoge. */

import { $, el, escapeHtml, fill, show } from './dom.js';
import { SUIT_LABELS, SUIT_ORDER, SUIT_RACES, cardName, renderCard, suitSwatch } from './cards.js';

const nameOf = (state, playerId) =>
  state.players.find((p) => p.id === playerId)?.name ?? 'Jemand';

/** Spielername, maskiert für den Einsatz in `innerHTML`. */
const safeName = (state, playerId) => escapeHtml(nameOf(state, playerId));

/** Kompletter Tisch-Neuaufbau aus dem öffentlichen Zustand. */
export function renderTable(ctx) {
  const { state } = ctx;
  if (!state) return;
  renderTopbar(state);
  renderPlayers(state, ctx.meId);
  renderTrick(state);
  renderHint(state, ctx.meId);
  renderHand(ctx);
  renderBidOverlay(ctx);
  renderTrumpOverlay(ctx);
}

function renderTopbar(state) {
  $('pill-round').textContent = `Runde ${state.round}/${state.roundsTotal}`;
  $('pill-code').textContent = state.code;

  const slot = $('trump-slot');
  const label = el('span.trump-label', {}, [
    el('small', { text: 'Trumpf' }),
    el('b', {
      text: state.trumpSuit ? SUIT_LABELS[state.trumpSuit] : 'keiner',
    }),
  ]);

  if (state.trumpCard) {
    fill(slot, [renderCard(state.trumpCard), label]);
  } else {
    fill(slot, [label]);
  }
}

function renderPlayers(state, meId) {
  fill(
    $('players-strip'),
    state.players.map((player) => {
      const isTurn = state.turnPlayerId === player.id;
      const classes = ['pchip'];
      if (isTurn) classes.push('is-turn');
      if (!player.connected) classes.push('is-offline');

      const bidClass =
        player.bid === null
          ? ''
          : player.tricks === player.bid
            ? '.is-done'
            : player.tricks > player.bid
              ? '.is-over'
              : '';

      return el(`div.${classes.join('.')}`, {}, [
        el('div.pchip-top', {}, [
          el(`span.dot${player.connected ? '' : '.dot--off'}`),
          el('span.pchip-name', { text: player.name }),
          player.id === meId ? el('span.pchip-badge', { text: 'Du' }) : null,
          player.id === state.dealerId ? el('span.pchip-badge', { text: 'Geber' }) : null,
        ]),
        el('div.pchip-stats', {}, [
          el(`span.pchip-bid${bidClass}`, {
            title: 'Stiche / Ansage',
            html:
              player.bid === null
                ? '<b>–</b> Ansage offen'
                : `<b>${player.tricks}</b> / ${player.bid} Stiche`,
          }),
          el('span.pchip-score', {
            text: `${player.score > 0 ? '+' : ''}${player.score}`,
            title: 'Gesamtpunkte',
          }),
        ]),
      ]);
    }),
  );
}

function renderTrick(state) {
  const winnerId = state.trickResult?.winnerId ?? null;
  fill(
    $('trick-area'),
    state.trick.map((play) =>
      el(`div.trick-slot${winnerId === play.playerId ? '.is-winner' : ''}`, {}, [
        renderCard(play.card),
        el('span.player-tag', { text: nameOf(state, play.playerId) }),
      ]),
    ),
  );
}

function renderHint(state, meId) {
  const hint = $('table-hint');
  const isMe = state.turnPlayerId === meId;

  if (state.phase === 'choosing_trump') {
    hint.innerHTML =
      state.dealerId === meId
        ? '<b>Du bestimmst den Trumpf</b> – ein Zauberer wurde aufgedeckt.'
        : `Ein Zauberer wurde aufgedeckt. <b>${safeName(state, state.dealerId)}</b> wählt die Trumpffarbe …`;
    return;
  }

  if (state.phase === 'bidding') {
    const open = state.players.filter((p) => p.bid === null).length;
    const sum = state.players.reduce((total, p) => total + (p.bid ?? 0), 0);
    const info = `Bisher angesagt: ${sum} von ${state.round} Stichen · noch ${open} offen`;
    hint.innerHTML = isMe
      ? `<b>Du bist dran:</b> Wie viele Stiche machst du? <br><small>${info}</small>`
      : `<b>${safeName(state, state.turnPlayerId)}</b> sagt an … <br><small>${info}</small>`;
    return;
  }

  if (state.phase === 'playing') {
    if (state.trickResult) {
      const card = cardName(
        state.trick.find((p) => p.card.id === state.trickResult.winningCardId)?.card,
      );
      hint.innerHTML = `<b>${safeName(state, state.trickResult.winnerId)}</b> gewinnt den Stich mit ${escapeHtml(card)}.`;
      return;
    }
    const lead = state.leadSuit
      ? ` Angespielt: <b>${SUIT_LABELS[state.leadSuit]}</b>.`
      : state.trick.length
        ? ' Es muss nichts bedient werden.'
        : '';
    hint.innerHTML = isMe
      ? `<b>Du bist am Zug.</b>${lead}`
      : `<b>${safeName(state, state.turnPlayerId)}</b> ist am Zug.${lead}`;
    return;
  }

  if (state.phase === 'round_end') {
    hint.textContent = 'Runde beendet – gleich geht es weiter.';
    return;
  }

  if (state.phase === 'game_over') {
    hint.textContent = 'Spiel beendet.';
    return;
  }

  hint.textContent = '';
}

function renderHand(ctx) {
  const { state, hand, legal, meId, onPlay } = ctx;
  const legalSet = new Set(legal ?? []);
  const myTurn = state.phase === 'playing' && state.turnPlayerId === meId && !state.trickResult;

  $('hand-label').textContent = myTurn
    ? 'Deine Karten – wähle eine aus'
    : `Deine Karten (${hand.length})`;

  fill(
    $('hand'),
    hand.map((card) =>
      renderCard(card, {
        as: 'button',
        playable: myTurn && legalSet.has(card.id),
        blocked: myTurn && !legalSet.has(card.id),
        onSelect: onPlay,
      }),
    ),
  );
}

// ------------------------------------------------------------------ Dialoge

function renderBidOverlay(ctx) {
  const { state, meId, onBid } = ctx;
  const active = state.phase === 'bidding' && state.turnPlayerId === meId;
  show($('overlay-bid'), active);
  if (!active) return;

  const sum = state.players.reduce((total, p) => total + (p.bid ?? 0), 0);
  $('bid-sub').textContent =
    `Runde ${state.round}: ${state.round} ${state.round === 1 ? 'Stich' : 'Stiche'} zu vergeben. ` +
    `Bisher angesagt: ${sum}.`;

  fill(
    $('bid-grid'),
    Array.from({ length: state.round + 1 }, (_, value) =>
      el('button.bid-button', {
        type: 'button',
        text: String(value),
        onclick: () => onBid(value),
      }),
    ),
  );
}

function renderTrumpOverlay(ctx) {
  const { state, meId, onTrump } = ctx;
  const active = state.phase === 'choosing_trump' && state.dealerId === meId;
  show($('overlay-trump'), active);
  if (!active) return;

  fill(
    $('trump-grid'),
    SUIT_ORDER.map((suit) =>
      el('button.trump-option', { type: 'button', onclick: () => onTrump(suit) }, [
        suitSwatch(suit),
        el('span', {}, [SUIT_LABELS[suit], el('small', { text: SUIT_RACES[suit] })]),
      ]),
    ),
  );
}

/** Wertungstabelle einer einzelnen Runde. */
export function renderRoundOverlay(payload, meId) {
  $('round-title').textContent = `Wertung nach Runde ${payload.round}`;
  const rows = [...payload.entries].sort((a, b) => b.total - a.total);

  fill($('round-table'), [
    el('thead', {}, [
      el('tr', {}, [
        el('th', { text: 'Spieler' }),
        el('th', { text: 'Ansage' }),
        el('th', { text: 'Stiche' }),
        el('th', { text: 'Runde' }),
        el('th', { text: 'Gesamt' }),
      ]),
    ]),
    el(
      'tbody',
      {},
      rows.map((entry) =>
        el(`tr${entry.playerId === meId ? '.is-you' : ''}`, {}, [
          el('td', { text: entry.name }),
          el('td', { text: String(entry.bid) }),
          el('td', { text: String(entry.tricks) }),
          el(`td.delta--${entry.delta >= 0 ? 'plus' : 'minus'}`, {
            text: `${entry.delta > 0 ? '+' : ''}${entry.delta}`,
          }),
          el('td', { text: String(entry.total) }),
        ]),
      ),
    ),
  ]);
  show($('overlay-round'), true);
}

/** Laufender Gesamtstand (jederzeit über den Punkte-Button erreichbar). */
export function renderScoreboard(state, meId) {
  const rows = [...state.players].sort((a, b) => b.score - a.score);
  fill($('scores-table'), [
    el('thead', {}, [
      el('tr', {}, [
        el('th', { text: '#' }),
        el('th', { text: 'Spieler' }),
        el('th', { text: 'Ansage' }),
        el('th', { text: 'Stiche' }),
        el('th', { text: 'Punkte' }),
      ]),
    ]),
    el(
      'tbody',
      {},
      rows.map((player, index) =>
        el(`tr${player.id === meId ? '.is-you' : ''}`, {}, [
          el('td', { text: String(index + 1) }),
          el('td', { text: player.name }),
          el('td', { text: player.bid === null ? '–' : String(player.bid) }),
          el('td', { text: String(player.tricks) }),
          el('td', { text: String(player.score) }),
        ]),
      ),
    ),
  ]);
  show($('overlay-scores'), true);
}

/** Endstand. */
export function renderGameOver(payload, meId) {
  fill(
    $('ranking'),
    payload.ranking.map((entry, index) =>
      el('li', {}, [
        el('span.rank', { text: `${entry.rank}.` }),
        el('span.name', {
          text: entry.playerId === meId ? `${entry.name} (du)` : entry.name,
        }),
        el('span.points', { text: `${entry.score} Punkte` }),
        index === 0 ? el('span.tag.tag--host', { text: 'Sieg' }) : null,
      ]),
    ),
  );
  show($('overlay-gameover'), true);
}
