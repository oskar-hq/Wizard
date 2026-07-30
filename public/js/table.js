/** Spieltisch-Ansicht: Kopfzeile, Spielerleiste, Stich, Hand und Dialoge. */

import { $, el, escapeHtml, fill, show } from './dom.js';
import {
  SUIT_LABELS,
  SUIT_ORDER,
  SUIT_RACES,
  cardName,
  renderCard,
  renderCardBack,
  suitSwatch,
} from './cards.js';
import { activeBadges } from './variants.js';

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

  // Bei Ansage und Trumpfwahl muss die eigene Hand lesbar bleiben – beides
  // sind Entscheidungen, die man nur mit Blick auf die Karten treffen kann.
  const bidOpen = renderBidOverlay(ctx);
  const trumpOpen = renderTrumpOverlay(ctx);
  document.body.classList.toggle('hand-above-dialog', bidOpen || trumpOpen);
  syncHandHeight();
}

/**
 * Merkt die Höhe der Kartenablage in `--hand-h`. Damit können sich Ansage- und
 * Trumpfdialog direkt darüber setzen, statt die Hand zu verdecken.
 */
function syncHandHeight() {
  requestAnimationFrame(() => {
    const dock = $('hand-dock');
    if (!dock) return;
    document.documentElement.style.setProperty('--hand-h', `${dock.offsetHeight}px`);
  });
}

function renderTopbar(state) {
  $('pill-round').textContent = `Runde ${state.round}/${state.roundsTotal}`;
  $('pill-code').textContent = state.code;

  const badges = activeBadges(state.variants);
  const pill = $('pill-variants');
  pill.hidden = badges.length === 0;
  pill.textContent = badges.join(' · ');

  const slot = $('trump-slot');
  const label = el('span.trump-label', {}, [
    el('small', { text: 'Trumpf' }),
    el('b', {
      text: state.trumpSuit ? SUIT_LABELS[state.trumpSuit] : 'keiner',
    }),
  ]);

  if (state.trumpCard) {
    fill(slot, [renderCard(state.trumpCard, { mini: true }), label]);
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

      const avoid = state.variants?.avoidTricks;
      const bidClass = avoid
        ? player.tricks > 0
          ? '.is-over'
          : '.is-done'
        : player.bid === null
          ? ''
          : player.tricks === player.bid
            ? '.is-done'
            : player.tricks > player.bid
              ? '.is-over'
              : '';

      // „Nur keine Stiche!“: es gibt keine Ansage, nur gefangene Stiche.
      // Verdeckte Ansage: bis zum Aufdecken sieht man nur, wer schon abgegeben hat.
      const bidHtml = avoid
        ? `<b>${player.tricks}</b> ${player.tricks === 1 ? 'Stich' : 'Stiche'}`
        : player.bid === null
          ? state.bidsHidden && player.hasBid
            ? '<b>✓</b> verdeckt angesagt'
            : '<b>–</b> Ansage offen'
          : `<b>${player.tricks}</b> / ${player.bid} Stiche`;

      return el(`div.${classes.join('.')}`, {}, [
        el('div.pchip-top', {}, [
          el(`span.dot${player.connected ? '' : '.dot--off'}`),
          el('span.pchip-name', { text: player.name }),
          player.id === meId ? el('span.pchip-badge', { text: 'Du' }) : null,
          player.id === state.dealerId ? el('span.pchip-badge', { text: 'Geber' }) : null,
        ]),
        el('div.pchip-stats', {}, [
          el(`span.pchip-bid${bidClass}`, {
            title: avoid ? 'Gewonnene Stiche' : 'Stiche / Ansage',
            html: bidHtml,
          }),
          el('span.pchip-score', {
            text: avoid ? String(player.score) : `${player.score > 0 ? '+' : ''}${player.score}`,
            title: avoid ? 'Strafpunkte (weniger ist besser)' : 'Gesamtpunkte',
          }),
        ]),
      ]);
    }),
  );
}

function renderTrick(state) {
  const winnerId = state.trickResult?.winnerId ?? null;
  const area = $('trick-area');

  // Solange nichts ausgespielt ist, liegt der Nachziehstapel in der Mitte.
  if (!state.trick.length) {
    fill(area, [renderDeck(state)]);
    return;
  }

  fill(
    area,
    state.trick.map((play) =>
      el(`div.trick-slot${winnerId === play.playerId ? '.is-winner' : ''}`, {}, [
        renderCard(play.card),
        el('span.player-tag', { text: nameOf(state, play.playerId) }),
      ]),
    ),
  );
}

/** Verdeckter Reststapel mit der aufgedeckten Trumpfkarte daneben. */
function renderDeck(state) {
  const pile = el('div.deck-pile', {}, [renderCardBack(), renderCardBack(), renderCardBack()]);
  const parts = [];

  if (state.stackSize > 0) {
    parts.push(
      el('div.deck-slot', {}, [
        pile,
        el('span.deck-caption', {
          text: `${state.stackSize} ${state.stackSize === 1 ? 'Karte' : 'Karten'}`,
        }),
      ]),
    );
  }

  if (state.trumpCard) {
    parts.push(
      el('div.deck-slot', {}, [
        renderCard(state.trumpCard),
        el('span.deck-caption', {
          text: state.trumpSuit ? `Trumpf: ${SUIT_LABELS[state.trumpSuit]}` : 'kein Trumpf',
        }),
      ]),
    );
  } else {
    parts.push(
      el('div.deck-slot', {}, [
        el('span.deck-caption', { text: 'Letzte Runde – kein Trumpf' }),
      ]),
    );
  }

  return el('div.deck-row', {}, parts);
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
    // Verdeckte Ansage: alle gleichzeitig, niemand ist „am Zug“.
    if (state.bidsHidden) {
      const missing = state.players.filter((p) => !p.hasBid);
      hint.innerHTML = missing.some((p) => p.id === meId)
        ? '<b>Verdeckte Ansage:</b> Gib deine Zahl ab – niemand sieht sie.'
        : `Verdeckte Ansage – warte auf ${missing
            .map((p) => `<b>${escapeHtml(p.name)}</b>`)
            .join(', ')} …`;
      return;
    }
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
    const goal = state.variants?.avoidTricks ? ' <small>Bloß keinen Stich machen!</small>' : '';
    hint.innerHTML = isMe
      ? `<b>Du bist am Zug.</b>${lead}${goal}`
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
  const { state, onBid, canBid, forbiddenBid } = ctx;
  const active = state.phase === 'bidding' && canBid;
  show($('overlay-bid'), active);
  if (!active) return false;

  const stichwort = state.round === 1 ? 'Stich' : 'Stiche';
  $('bid-sub').textContent = state.bidsHidden
    ? `Runde ${state.round}: ${state.round} ${stichwort} zu vergeben. Deine Ansage bleibt geheim, ` +
      'bis alle abgegeben haben.'
    : `Runde ${state.round}: ${state.round} ${stichwort} zu vergeben. Bisher angesagt: ` +
      `${state.players.reduce((total, p) => total + (p.bid ?? 0), 0)}.`;

  $('bid-note').textContent =
    forbiddenBid === null || forbiddenBid === undefined
      ? ''
      : `„Plus/minus Eins“: ${forbiddenBid} ist gesperrt – die Summe der Ansagen darf nicht ` +
        `${state.round} ergeben.`;

  fill(
    $('bid-grid'),
    Array.from({ length: state.round + 1 }, (_, value) => {
      const blocked = value === forbiddenBid;
      return el(`button.bid-button${blocked ? '.is-blocked' : ''}`, {
        type: 'button',
        text: String(value),
        disabled: blocked,
        title: blocked ? 'Durch „Plus/minus Eins“ gesperrt' : null,
        onclick: blocked ? null : () => onBid(value),
      });
    }),
  );
  return true;
}

function renderTrumpOverlay(ctx) {
  const { state, meId, onTrump } = ctx;
  const active = state.phase === 'choosing_trump' && state.dealerId === meId;
  show($('overlay-trump'), active);
  if (!active) return false;

  fill(
    $('trump-grid'),
    SUIT_ORDER.map((suit) =>
      el('button.trump-option', { type: 'button', onclick: () => onTrump(suit) }, [
        suitSwatch(suit),
        el('span', {}, [SUIT_LABELS[suit], el('small', { text: SUIT_RACES[suit] })]),
      ]),
    ),
  );
  return true;
}

/** Wertungstabelle einer einzelnen Runde. */
export function renderRoundOverlay(payload, meId, variants = {}) {
  const avoid = Boolean(variants.avoidTricks);
  $('round-title').textContent = `Wertung nach Runde ${payload.round}`;
  const rows = [...payload.entries].sort((a, b) =>
    avoid ? a.total - b.total : b.total - a.total,
  );

  fill($('round-table'), [
    el('thead', {}, [
      el('tr', {}, [
        el('th', { text: 'Spieler' }),
        el('th', { text: avoid ? '' : 'Ansage' }),
        el('th', { text: 'Stiche' }),
        el('th', { text: avoid ? 'Strafp.' : 'Runde' }),
        el('th', { text: 'Gesamt' }),
      ]),
    ]),
    el(
      'tbody',
      {},
      rows.map((entry) =>
        el(`tr${entry.playerId === meId ? '.is-you' : ''}`, {}, [
          el('td', { text: entry.name }),
          el('td', { text: avoid ? '–' : String(entry.bid) }),
          el('td', { text: String(entry.tricks) }),
          el(`td.delta--${avoid ? (entry.delta > 0 ? 'minus' : 'plus') : entry.delta >= 0 ? 'plus' : 'minus'}`, {
            text: avoid ? `+${entry.delta}` : `${entry.delta > 0 ? '+' : ''}${entry.delta}`,
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
  const avoid = Boolean(state.variants?.avoidTricks);
  const rows = [...state.players].sort((a, b) => (avoid ? a.score - b.score : b.score - a.score));
  fill($('scores-table'), [
    el('thead', {}, [
      el('tr', {}, [
        el('th', { text: '#' }),
        el('th', { text: 'Spieler' }),
        el('th', { text: avoid ? '' : 'Ansage' }),
        el('th', { text: 'Stiche' }),
        el('th', { text: avoid ? 'Strafpunkte' : 'Punkte' }),
      ]),
    ]),
    el(
      'tbody',
      {},
      rows.map((player, index) =>
        el(`tr${player.id === meId ? '.is-you' : ''}`, {}, [
          el('td', { text: String(index + 1) }),
          el('td', { text: player.name }),
          el('td', {
            text: avoid || player.bid === null ? '–' : String(player.bid),
          }),
          el('td', { text: String(player.tricks) }),
          el('td', { text: String(player.score) }),
        ]),
      ),
    ),
  ]);
  show($('overlay-scores'), true);
}

/** Endstand. */
export function renderGameOver(payload, meId, variants = {}) {
  const avoid = Boolean(variants.avoidTricks);
  $('gameover-sub').textContent = avoid
    ? 'Variante „Nur keine Stiche!“ – die wenigsten Strafpunkte gewinnen.'
    : 'Die höchste Punktzahl gewinnt.';
  fill(
    $('ranking'),
    payload.ranking.map((entry, index) =>
      el('li', {}, [
        el('span.rank', { text: `${entry.rank}.` }),
        el('span.name', {
          text: entry.playerId === meId ? `${entry.name} (du)` : entry.name,
        }),
        el('span.points', {
          text: avoid ? `${entry.score} Strafpunkte` : `${entry.score} Punkte`,
        }),
        index === 0 ? el('span.tag.tag--host', { text: 'Sieg' }) : null,
      ]),
    ),
  );
  show($('overlay-gameover'), true);
}
