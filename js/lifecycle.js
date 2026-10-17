import { Account, G, Game, UI } from './core.js';
import { Telemetry } from './telemetry.js';

export function safeToSave() {
  return !!G.state && G.mode === 'world' && !G.busy && !G.tower && !G.move && !UI.active();
}

export function checkpoint() {
  // Battles, animations and temporary tower teams must never become a background save.
  if (safeToSave()) { Telemetry.checkpoint?.(G.state); Game.save(true); }
  // The durable outbox survives page termination; flushing here is only best effort.
  return Account.resume?.();
}

let installed = false;
export function installLifecycle() {
  if (installed) return;
  installed = true;
  setInterval(checkpoint, 120000);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) void checkpoint();
    else void Account.resume?.();
  });
  window.addEventListener('pagehide', () => { void checkpoint(); });
  window.addEventListener('online', () => { void Account.resume?.(); });
  void Account.resume?.();
}
