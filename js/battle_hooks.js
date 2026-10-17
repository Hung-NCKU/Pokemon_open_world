// One ordered extension point per engine operation, instead of nested method patches.
const hooks = new Map(), installed = new WeakSet();
const asyncMethods = new Set(['doTurn', 'runMove', 'endOfTurn', 'onSwitchOut', 'onEntry']);
export const BattleHooks = {
  register(method, id, handlers) {
    const entries = hooks.get(method) || [];
    if (entries.some(h => h.id === id)) throw new Error('Duplicate battle hook: ' + id);
    entries.push({ id, ...handlers });
    entries.sort((a, b) => (a.priority || 0) - (b.priority || 0) || a.id.localeCompare(b.id));
    hooks.set(method, entries);
  },
  install(proto) {
    if (installed.has(proto)) return;
    installed.add(proto);
    for (const [method, entries] of hooks) {
      const original = proto[method];
      if (typeof original !== 'function') throw new Error('Missing engine operation: ' + method);
      if (asyncMethods.has(method)) proto[method] = async function (...args) {
        for (const h of entries) await h.before?.apply(this, args);
        const result = await original.apply(this, args);
        for (const h of entries) await h.after?.call(this, result, ...args);
        return result;
      };
      else proto[method] = function (...args) {
        for (const h of entries) h.before?.apply(this, args);
        const result = original.apply(this, args);
        for (const h of entries) h.after?.call(this, result, ...args);
        return result;
      };
    }
  },
  list() { return Object.fromEntries([...hooks].map(([method, entries]) => [method, entries.map(h => h.id)])); },
};
