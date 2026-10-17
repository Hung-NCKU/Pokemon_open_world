/** Durable outbox, scoped to both provider and user. No access tokens are stored here. */
export function syncJournal(provider, user) {
  const key = 'pkmn_sync_' + provider + '_' + encodeURIComponent(user);
  const read = () => { try { return JSON.parse(localStorage.getItem(key) || '{}'); } catch { return {}; } };
  const write = s => localStorage.setItem(key, JSON.stringify(s));
  return {
    get: read,
    stage(json) { const s = read(); s.pending = json; write(s); },
    observe(head) { const s = read(); s.head = head; write(s); },
    remember(json) { const s = read(); s.lastUploaded = json; write(s); },
    ack(json, head) { const s = read(); s.head = head; if (s.pending === json) delete s.pending; if (!s.pending) delete s.conflict; write(s); },
    conflict(remote) { const s = read(); s.conflict = remote || { deleted: true }; write(s); },
    clearConflict() { const s = read(); delete s.conflict; write(s); },
  };
}

export function revisionOf(row) {
  if (!row) return null;
  return row.data?.syncRevision || row.updated_at || row.data?.savedAt || 'legacy';
}

export function revisionId() {
  return crypto.randomUUID ? crypto.randomUUID() : Array.from(crypto.getRandomValues(new Uint8Array(16)), x => x.toString(16).padStart(2, '0')).join('');
}
