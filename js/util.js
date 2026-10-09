// 共用工具：亂數、雜訊、雜項
const U = {
  ri(a, b) { return a + Math.floor(Math.random() * (b - a + 1)); },
  pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; },
  chance(p) { return Math.random() < p; },
  clamp(v, a, b) { return v < a ? a : v > b ? b : v; },
  sleep(ms) { return new Promise(r => setTimeout(r, ms)); },
  weighted(list, rnd = Math.random) {
    let t = 0;
    for (const e of list) t += e.w;
    let r = rnd() * t;
    for (const e of list) { r -= e.w; if (r <= 0) return e; }
    return list[list.length - 1];
  },
  esc(s) {
    return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  },
  isNight() { const h = new Date().getHours(); return h < 6 || h >= 19; },
  pad3(n) { return String(n).padStart(4, '0'); },
};

function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function hash2(x, y, seed) {
  let h = seed ^ Math.imul(x, 374761393) ^ Math.imul(y, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

function valueNoise(x, y, seed) {
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash2(xi, yi, seed), b = hash2(xi + 1, yi, seed);
  const c = hash2(xi, yi + 1, seed), d = hash2(xi + 1, yi + 1, seed);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

function fbm(x, y, seed, oct = 4) {
  let v = 0, amp = 1, f = 1, t = 0;
  for (let i = 0; i < oct; i++) {
    v += valueNoise(x * f, y * f, seed + i * 1013) * amp;
    t += amp; amp *= 0.5; f *= 2;
  }
  return v / t;
}
