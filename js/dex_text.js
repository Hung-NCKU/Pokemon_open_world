// Built flavor text is optional on the title screen; load it when a player opens the dex or starts a game.
let loading;
export function loadDexText() {
  if (window.POKEDEX?.[1]?.fl) return Promise.resolve(true);
  if (loading) return loading;
  loading = new Promise(resolve => {
    const script = document.createElement('script');
    script.src = new URL('data/dex_text.js', document.baseURI).href;
    script.onload = () => resolve(true);
    script.onerror = () => { loading = null; script.remove(); resolve(false); };
    document.head.appendChild(script);
  });
  return loading;
}
