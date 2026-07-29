/**
 * Sitzungsspeicher: merkt sich Raum, Spieler-ID und Token im localStorage,
 * damit ein Verbindungsabbruch (Handy, WLAN, Discord) folgenlos bleibt.
 */

const SESSION_KEY = 'wizard.session';
const NAME_KEY = 'wizard.name';
const DECK_KEY = 'wizard.deck';

const safeStorage = (() => {
  try {
    const probe = '__wizard__';
    localStorage.setItem(probe, '1');
    localStorage.removeItem(probe);
    return localStorage;
  } catch {
    const memory = new Map();
    return {
      getItem: (key) => memory.get(key) ?? null,
      setItem: (key, value) => memory.set(key, value),
      removeItem: (key) => memory.delete(key),
    };
  }
})();

export const session = {
  load() {
    try {
      const raw = safeStorage.getItem(SESSION_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      return data?.code && data?.playerId && data?.token ? data : null;
    } catch {
      return null;
    }
  },
  save({ code, playerId, token, name }) {
    safeStorage.setItem(SESSION_KEY, JSON.stringify({ code, playerId, token, name }));
  },
  clear() {
    safeStorage.removeItem(SESSION_KEY);
  },
};

export const lastName = {
  get: () => safeStorage.getItem(NAME_KEY) ?? '',
  set: (name) => safeStorage.setItem(NAME_KEY, name),
};

/** Gewähltes Kartendesign – eine rein persönliche Einstellung. */
export const deckStyle = {
  get: () => safeStorage.getItem(DECK_KEY) ?? 'line',
  set: (id) => safeStorage.setItem(DECK_KEY, id),
};
