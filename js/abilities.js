// 特性與持有道具（名稱、說明取自 PokéAPI：data/abilities.js；效果參考 Pokémon Showdown 的 data/abilities.ts、data/items.ts）

// 已實作效果的特性
const AB_IMPL = new Set([
  // 登場
  'intimidate', 'drizzle', 'drought', 'sand-stream', 'snow-warning', 'electric-surge', 'grassy-surge', 'misty-surge', 'psychic-surge',
  'download', 'pressure', 'air-lock', 'cloud-nine', 'frisk', 'mold-breaker', 'teravolt', 'turboblaze',
  // 攻擊與威力
  'huge-power', 'pure-power', 'hustle', 'guts', 'blaze', 'torrent', 'overgrow', 'swarm', 'solar-power', 'flash-fire', 'defeatist',
  'gorilla-tactics', 'technician', 'iron-fist', 'strong-jaw', 'mega-launcher', 'tough-claws', 'sharpness', 'reckless', 'sheer-force',
  'sand-force', 'analytic', 'adaptability', 'tinted-lens', 'sniper', 'super-luck', 'skill-link', 'serene-grace', 'scrappy', 'water-bubble',
  'steelworker', 'transistor', 'dragons-maw', 'rocky-payload', 'punk-rock', 'aerilate', 'pixilate', 'refrigerate', 'galvanize', 'normalize',
  'stakeout', 'toxic-boost', 'flare-boost', 'hadron-engine', 'orichalcum-pulse', 'supreme-overlord',
  // 防禦
  'fur-coat', 'marvel-scale', 'thick-fat', 'heatproof', 'filter', 'solid-rock', 'prism-armor', 'multiscale', 'shadow-shield', 'fluffy',
  'ice-scales', 'dry-skin', 'battle-armor', 'shell-armor', 'sturdy', 'magic-guard', 'rock-head', 'unaware', 'grass-pelt', 'purifying-salt',
  'well-baked-body', 'thermal-exchange',
  // 免疫與吸收
  'levitate', 'volt-absorb', 'water-absorb', 'lightning-rod', 'motor-drive', 'storm-drain', 'sap-sipper', 'earth-eater', 'wonder-guard',
  'soundproof', 'bulletproof', 'overcoat', 'damp', 'wind-rider',
  // 異常狀態與能力
  'immunity', 'limber', 'insomnia', 'vital-spirit', 'sweet-veil', 'water-veil', 'magma-armor', 'own-tempo', 'oblivious', 'inner-focus',
  'leaf-guard', 'comatose', 'shield-dust', 'synchronize', 'clear-body', 'white-smoke', 'full-metal-body', 'hyper-cutter', 'keen-eye',
  'minds-eye', 'big-pecks', 'defiant', 'competitive', 'contrary', 'simple', 'natural-cure', 'regenerator', 'shed-skin', 'hydration',
  'poison-heal', 'rain-dish', 'ice-body', 'early-bird', 'quick-feet', 'steadfast',
  // 命中
  'compound-eyes', 'no-guard', 'sand-veil', 'snow-cloak', 'victory-star',
  // 速度與優先度
  'swift-swim', 'chlorophyll', 'sand-rush', 'slush-rush', 'surge-surfer', 'speed-boost', 'prankster', 'gale-wings', 'triage', 'stall',
  // 接觸
  'static', 'flame-body', 'poison-point', 'effect-spore', 'rough-skin', 'iron-barbs', 'cute-charm', 'gooey', 'tangling-hair',
  'aftermath', 'poison-touch', 'long-reach',
  // 受到攻擊、打倒對手
  'justified', 'rattled', 'weak-armor', 'stamina', 'anger-point', 'moxie', 'beast-boost', 'chilling-neigh', 'grim-neigh', 'soul-heart',
  'moody', 'berserk', 'anger-shell',
  // 逃走、困住
  'run-away', 'arena-trap', 'shadow-tag', 'magnet-pull',
  // 道具、屬性、其他
  'infiltrator', 'unburden', 'klutz', 'sticky-hold', 'suction-cups', 'heavy-metal', 'light-metal', 'protean', 'libero', 'protosynthesis',
  'quark-drive', 'liquid-ooze', 'cursed-body', 'tangled-feet', 'anticipation', 'forewarn', 'cheek-pouch', 'harvest', 'rivalry', 'wonder-skin',
  'trace', 'aroma-veil', 'magic-bounce',
  // 其他（野外效果或不影響單打）
  'pickup', 'honey-gather', 'illuminate', 'stench', 'ball-fetch', 'friend-guard', 'healer', 'telepathy', 'plus', 'minus', 'symbiosis',
  'flower-gift', 'receiver', 'power-of-alchemy', 'battery', 'power-spot', 'steely-spirit', 'curious-medicine', 'costar', 'commander',
  // 威力與能力修正
  'aura-break', 'dark-aura', 'fairy-aura', 'beads-of-ruin', 'sword-of-ruin', 'tablets-of-ruin', 'vessel-of-ruin', 'liquid-voice', 'merciless', 'slow-start',
  // 受到攻擊時
  'color-change', 'cotton-down', 'electromorphosis', 'wind-power', 'steam-engine', 'water-compaction', 'sand-spit', 'seed-sower', 'toxic-debris',
  'innards-out', 'mummy', 'lingering-aroma', 'wandering-spirit', 'perish-body', 'pickpocket', 'emergency-exit', 'wimp-out', 'gulp-missile',
  // 登場
  'intrepid-sword', 'dauntless-shield', 'supersweet-syrup', 'screen-cleaner', 'hospitality', 'imposter', 'neutralizing-gas', 'unnerve',
  // 防守與免疫
  'armor-tail', 'dazzling', 'queenly-majesty', 'good-as-gold', 'guard-dog', 'mirror-armor', 'flower-veil', 'disguise', 'ice-face',
  // 異常狀態與能力
  'corrosion', 'poison-puppeteer', 'toxic-chain', 'opportunist', 'bad-dreams',
  // 行動
  'truant', 'dancer', 'mycelium-might', 'unseen-fist', 'propeller-tail', 'stalwart', 'magician',
  // 樹果
  'cud-chew', 'ripen', 'gluttony',
  // 形態與屬性
  'forecast', 'multitype', 'rks-system', 'schooling', 'shields-down', 'stance-change', 'zen-mode', 'zero-to-hero', 'tera-shift', 'hunger-switch', 'illusion',
]);

// 已實作效果的持有道具
const IT_IMPL = new Set(['leftovers', 'life-orb', 'choice-band', 'choice-specs', 'choice-scarf', 'focus-sash', 'focus-band', 'sitrus-berry',
  'oran-berry', 'lum-berry', 'chesto-berry', 'cheri-berry', 'pecha-berry', 'rawst-berry', 'aspear-berry', 'persim-berry', 'leppa-berry',
  'expert-belt', 'muscle-band', 'wise-glasses', 'charcoal', 'mystic-water', 'miracle-seed', 'magnet', 'never-melt-ice', 'black-belt',
  'poison-barb', 'soft-sand', 'sharp-beak', 'twisted-spoon', 'silver-powder', 'hard-stone', 'spell-tag', 'dragon-fang', 'black-glasses',
  'metal-coat', 'silk-scarf', 'fairy-feather', 'rocky-helmet', 'black-sludge', 'eviolite', 'assault-vest', 'kings-rock', 'razor-fang',
  'scope-lens', 'razor-claw', 'quick-claw', 'shell-bell', 'air-balloon', 'heavy-duty-boots', 'light-clay', 'damp-rock', 'heat-rock',
  'smooth-rock', 'icy-rock', 'lucky-egg', 'amulet-coin', 'everstone', 'soothe-bell', 'bright-powder', 'wide-lens', 'zoom-lens', 'toxic-orb',
  'flame-orb', 'white-herb', 'mental-herb', 'power-herb', 'weakness-policy', 'clear-amulet', 'covert-cloak', 'loaded-dice',
  'punching-glove', 'protective-pads', 'safety-goggles', 'big-root', 'binding-band', 'grip-claw', 'shed-shell', 'metronome', 'throat-spray',
  'figy-berry', 'wiki-berry', 'mago-berry', 'aguav-berry', 'iapapa-berry', 'liechi-berry', 'ganlon-berry', 'salac-berry', 'petaya-berry', 'apicot-berry']);

const TYPE_ITEM = {
  charcoal: 'fire', 'mystic-water': 'water', 'miracle-seed': 'grass', magnet: 'electric', 'never-melt-ice': 'ice', 'black-belt': 'fighting',
  'poison-barb': 'poison', 'soft-sand': 'ground', 'sharp-beak': 'flying', 'twisted-spoon': 'psychic', 'silver-powder': 'bug', 'hard-stone': 'rock',
  'spell-tag': 'ghost', 'dragon-fang': 'dragon', 'black-glasses': 'dark', 'metal-coat': 'steel', 'silk-scarf': 'normal', 'fairy-feather': 'fairy',
};
// 危機時（體力 1/4 以下，貪吃鬼 1/2 以下）發動的樹果：回復 1/3 體力（性格討厭的味道會混亂）或提高能力
const PINCH_HEAL = { 'figy-berry': 1, 'wiki-berry': 3, 'mago-berry': 5, 'aguav-berry': 4, 'iapapa-berry': 2 }; // 討厭這個味道的性格：降低的能力
const PINCH_STAT = { 'liechi-berry': 'atk', 'ganlon-berry': 'def', 'salac-berry': 'spe', 'petaya-berry': 'spa', 'apicot-berry': 'spd' };
const STATUS_BERRY = { 'cheri-berry': ['par'], 'chesto-berry': ['slp'], 'pecha-berry': ['psn', 'tox'], 'rawst-berry': ['brn'], 'aspear-berry': ['frz'] };
const CONSUMABLE = new Set(['focus-sash', 'sitrus-berry', 'oran-berry', 'lum-berry', 'chesto-berry', 'cheri-berry', 'pecha-berry', 'rawst-berry',
  'aspear-berry', 'persim-berry', 'leppa-berry', ...Object.keys(PINCH_HEAL), ...Object.keys(PINCH_STAT), 'air-balloon', 'white-herb', 'mental-herb', 'power-herb', 'weakness-policy', 'throat-spray']);
// 商店販售的持有道具（價格參考最新世代）
const HELD_PRICE = {
  'oran-berry': 100, 'sitrus-berry': 300, 'lum-berry': 500, 'chesto-berry': 200, 'cheri-berry': 200, 'pecha-berry': 200, 'rawst-berry': 200,
  'aspear-berry': 200, 'persim-berry': 200, 'leppa-berry': 300,
  ...Object.fromEntries([...Object.keys(PINCH_HEAL), ...Object.keys(PINCH_STAT)].map(b => [b, PINCH_HEAL[b] ? 300 : 1000])),
};

const Abil = {
  name(id) { return (window.ABILITIES && ABILITIES[id] && ABILITIES[id].n) || id || '—'; },
  desc(id) { return (window.ABILITIES && ABILITIES[id] && ABILITIES[id].d) || ''; },
  supported(id) { return AB_IMPL.has(id); },
  // 新個體的特性：一般特性隨機，隱藏特性機率 hidden
  pick(sp, hidden = 0) {
    const list = (POKEDEX[sp] && POKEDEX[sp].ab) || [];
    const normal = list.filter(a => !a[1]).map(a => a[0]);
    const hid = list.filter(a => a[1]).map(a => a[0]);
    if (hid.length && U.rand() < hidden) return hid[0];
    return normal.length ? U.pick(normal) : (hid[0] || null);
  },
  // 進化後沿用同一個特性欄位
  afterEvolve(m, from, to) {
    const a = POKEDEX[from].ab || [], b = POKEDEX[to].ab || [];
    const i = a.findIndex(x => x[0] === m.ability);
    m.ability = (b[i] || b.find(x => !x[1]) || b[0] || [m.ability])[0];
  },
};
const Held = {
  name(id) { return (window.HELDITEMS && HELDITEMS[id] && HELDITEMS[id].n) || (ITEMS[id] && ITEMS[id].n) || id; },
  desc(id) { return (window.HELDITEMS && HELDITEMS[id] && HELDITEMS[id].d) || ''; },
};
// 培育道具（最新世代）；價格為參考原作的估計值
const NATURE_INDEX = { hardy: 0, lonely: 1, brave: 2, adamant: 3, naughty: 4, bold: 5, docile: 6, relaxed: 7, impish: 8, lax: 9, timid: 10,
  hasty: 11, serious: 12, jolly: 13, naive: 14, modest: 15, mild: 16, quiet: 17, bashful: 18, rash: 19, calm: 20, gentle: 21, sassy: 22,
  careful: 23, quirky: 24 };
// 太晶珠（重要物品）：讓寶可夢太晶化，每場戰鬥一次，用過後到寶可夢中心充能
ITEMS['tera-orb'] = { n: '太晶珠', kind: 'key', d: '能讓寶可夢太晶化的神奇寶珠。使用後需要在寶可夢中心充能。', price: 0 };

const VITAMIN = { 'hp-up': 0, protein: 1, iron: 2, calcium: 3, zinc: 4, carbos: 5 };
const EXP_CANDY = { 'exp-candy-xs': 100, 'exp-candy-s': 800, 'exp-candy-m': 3000, 'exp-candy-l': 10000, 'exp-candy-xl': 30000 };
const TRAIN_PRICE = { 'ability-capsule': 50000, 'ability-patch': 100000, 'bottle-cap': 30000, 'gold-bottle-cap': 100000 };
if (window.TRAINITEMS) {
  for (const [id, it] of Object.entries(TRAINITEMS)) {
    let kind = 'train', price = TRAIN_PRICE[id] || 20000;
    if (VITAMIN[id] !== undefined) { kind = 'vitamin'; price = 10000; }
    else if (EXP_CANDY[id]) { kind = 'expcandy'; price = Math.round(EXP_CANDY[id] / 10) * 3; }
    else if (id.endsWith('-mint')) { kind = 'mint'; price = 20000; }
    else if (id === 'ability-capsule') kind = 'abilcap';
    else if (id === 'ability-patch') kind = 'abilpatch';
    else if (id.endsWith('bottle-cap')) kind = 'bottlecap';
    ITEMS[id] = { n: it.n, price, kind, d: it.d };
    if (!SHOP_LIST.includes(id)) SHOP_LIST.push(id);
  }
}

// 把持有道具加進道具清單與商店
if (window.HELDITEMS) {
  for (const [id, it] of Object.entries(HELDITEMS)) {
    if (ITEMS[id]) { ITEMS[id].held = true; continue; }
    ITEMS[id] = { n: it.n, price: HELD_PRICE[id] || (it.cost >= 1000 ? it.cost : 4000), kind: 'held', d: it.d };
  }
  SHOP_LIST.push(...Object.keys(HELDITEMS).filter(id => !SHOP_LIST.includes(id) && ITEMS[id].kind === 'held'));
}
