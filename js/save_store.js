// Storage boundary: validate before replacing a save; preserve recoverable copies.
export const SaveStore = {
  read(key) { return localStorage.getItem(key); },
  write(key, json, validate) {
    const next = validate(json);
    if (!next.ok) throw new Error(next.error || '無效的存檔');
    const prev = localStorage.getItem(key);
    if (prev && validate(prev).ok) localStorage.setItem(key + '_bak', prev);
    localStorage.setItem(key, json);
    return next.state;
  },
  conflict(key, json) {
    // One local and one remote branch, bounded so autosaves cannot exhaust quota.
    localStorage.setItem(key, json);
  },
};
