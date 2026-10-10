// 關都城鎮小屋裡的人（data/towns.js 的 houses 指定）：原作的經典事件與實用服務
// 名稱依神奇寶貝百科（52poke）：奈奈美、姓名鑑定師、招式回憶處、遺忘爺爺、寶可夢發燒友俱樂部會長、格鬥道場（空手道大王 武德）
ITEMS['old-amber'] = { n: '秘密琥珀', price: 0, kind: 'key', d: '封存著古代寶可夢遺傳因子的琥珀。紅蓮島的研究所可以讓牠復活。' };
ITEMS['helix-fossil'] = { n: '貝殼化石', price: 0, kind: 'key', d: '古代寶可夢的化石，看起來像貝殼的一部分。紅蓮島的研究所可以讓牠復活。' };
ITEMS['dome-fossil'] = { n: '甲殼化石', price: 0, kind: 'key', d: '古代寶可夢的化石，看起來像甲殼的一部分。紅蓮島的研究所可以讓牠復活。' };

const TownEvents = (() => {
  // 每個事件的人物：名稱與行走圖
  const DEF = {
    daisy: { n: '奈奈美', gfx: 'woman_2' }, rivalhome: { n: '青綠的家人', gfx: 'girl_3' },
    namerater: { n: '姓名鑑定師', gfx: 'gentleman' }, oldman: { n: '老爺爺', gfx: 'old_man' },
    amber: { n: '博物館的研究員', gfx: 'scientist_1' }, fossilchoice: { n: '化石愛好者', gfx: 'man_1' },
    trade_jynx: { n: '想交換的人', gfx: 'man_1' }, tips_cerulean: { n: '女孩', gfx: 'lass' },
    fanclub: { n: '寶可夢發燒友俱樂部會長', gfx: 'pokefan_m' }, trade_farfetchd: { n: '想交換的女孩', gfx: 'girl_3' },
    eevee: { n: '玉虹公寓的住戶', gfx: 'woman_2' }, stones: { n: '收集石頭的人', gfx: 'cook' },
    reminder: { n: '招式回憶處', gfx: 'expert_f' }, deleter: { n: '遺忘爺爺', gfx: 'old_man' },
    dojo: { n: '空手道大王 武德', gfx: 'black_belt' }, dojo_tip: { n: '道場的弟子', gfx: 'black_belt' },
    psychic: { n: '超能力者', gfx: 'psychic_m' }, tips_saffron: { n: '女士', gfx: 'woman_2' },
    fossil: { n: '研究所的研究員', gfx: 'scientist_1' }, trade_seel: { n: '想交換的水手', gfx: 'sailor' },
  };
  // 原作的遊戲內交換：想要的寶可夢 → 送出的寶可夢
  const TRADES = { trade_jynx: [61, 124], trade_farfetchd: [21, 83], trade_seel: [77, 86] };
  const FOSSILS = { 'old-amber': 142, 'helix-fossil': 138, 'dome-fossil': 140 };

  const flags = () => G.state.flags;
  const once = k => !flags()['town_' + k];
  const done = k => { flags()['town_' + k] = 1; };
  const say = (who, text) => UI.say(`${DEF[who].n}：「${text}」`);

  // 收到寶可夢：隊伍滿了就送到箱子
  async function receive(m) {
    Game.markSeen(m.sp); Game.markCaught(m.sp);
    m.happy = Math.max(m.happy, 70);
    Sound.jingle && Sound.jingle('catch');
    await UI.say(`得到了 ${Mon.name(m)}！`);
    if (G.party.length < 6) G.party.push(m);
    else { G.state.box.push(m); await UI.say(`隊伍已經滿了，${Mon.name(m)} 被送到箱子裡了。`); }
  }
  const pick = can => Game.partyMenu({ pick: can });

  const RUN = {
    // 真新鎮：奈奈美幫帶頭的寶可夢整理毛髮（每走 300 步可以再整理一次，親密度 +10）
    async daisy() {
      const m = G.party[0];
      const last = flags().town_daisy_step;
      if (last !== undefined && G.state.steps - last < 300) return say('daisy', `${Mon.name(m)} 的毛髮還很整齊喔。過一陣子再來吧！`);
      await say('daisy', `你好！我是青綠的姊姊。來，讓我幫 ${Mon.name(m)} 整理一下毛髮吧。`);
      m.happy = Math.min(255, m.happy + 10);
      flags().town_daisy_step = G.state.steps;
      Sound.sfx('use_item');
      await UI.say(`${Mon.name(m)} 看起來很開心！`);
    },
    rivalhome: () => say('rivalhome', '青綠說他要成為最強的訓練家，一大早就出門了。他好像也在收集道館徽章喔！'),
    // 常青市
    async namerater() {
      await say('namerater', '我是姓名鑑定師。要幫你的寶可夢取個新名字嗎？');
      const i = await pick(() => true);
      if (i < 0) return;
      const m = G.party[i];
      const n = await UI.input(`要幫 ${Mon.name(m)} 取什麼名字？（留空用原名）`, '', { cancel: true });
      if (n === null) return;
      m.nick = n && n !== Forms.data(m).n ? n.slice(0, 10) : undefined;
      await say('namerater', `${Mon.name(m)}……真是個好名字！`);
    },
    async oldman() {
      if (once('oldman')) {
        done('oldman');
        Game.giveItem('poke-ball', 5);
        await say('oldman', '捕捉寶可夢之前，先把牠的體力削弱，讓牠睡著或麻痺，就比較容易成功喔。這些精靈球送你吧！');
        return UI.say('獲得了 5 個精靈球！');
      }
      return say('oldman', '我年輕的時候也是個訓練家喔……咖啡喝了以後精神好多了。');
    },
    // 深灰市：博物館
    async amber() {
      if (once('amber')) {
        done('amber'); Game.giveItem('old-amber', 1);
        await say('amber', '這是在附近的山裡挖到的琥珀，裡面好像封存著古代寶可夢的遺傳因子。送你吧！');
        return UI.say('獲得了秘密琥珀！\n（紅蓮島的寶可夢研究所可以讓牠復活）');
      }
      return say('amber', '紅蓮島的研究所，聽說可以讓化石裡的寶可夢復活。');
    },
    async fossilchoice() {
      if (!once('fossilchoice')) return say('fossilchoice', '化石真是浪漫啊！你一定要讓牠復活喔。');
      await say('fossilchoice', '我在月見山挖到了兩塊化石，可以送你其中一塊。');
      const c = await UI.choose(['貝殼化石', '甲殼化石', '不用了'], { prompt: '要哪一塊化石？' });
      if (c < 0 || c > 1) return;
      const id = c === 0 ? 'helix-fossil' : 'dome-fossil';
      done('fossilchoice'); Game.giveItem(id, 1);
      return UI.say(`獲得了${ITEMS[id].n}！`);
    },
    // 交換
    trade_jynx: () => trade('trade_jynx'), trade_farfetchd: () => trade('trade_farfetchd'), trade_seel: () => trade('trade_seel'),
    tips_cerulean: () => say('tips_cerulean', '華藍市北邊的洞窟裡，聽說住著非常強大的寶可夢……'),
    // 枯葉市：寶可夢發燒友俱樂部（看帶頭寶可夢的親密度）
    async fanclub() {
      const m = G.party[0];
      const h = m.happy;
      const mood = h >= 250 ? '非常非常喜歡你，已經離不開你了！' : h >= 200 ? '很喜歡你喔！' : h >= 150 ? '跟你蠻親近的。' : h >= 100 ? '還算習慣你。' : h >= 50 ? '對你還有點陌生。' : '好像不太喜歡你……';
      await say('fanclub', `我是寶可夢發燒友俱樂部的會長！讓我看看……你的 ${Mon.name(m)} ${mood}`);
      if (once('fanclub')) {
        done('fanclub'); Game.giveItem('rare-candy', 1);
        await say('fanclub', '謝謝你聽我說了這麼多寶可夢的事！這個給你吧。');
        await UI.say('獲得了神奇糖果！');
      }
    },
    // 玉虹市：玉虹公寓
    async eevee() {
      if (!once('eevee')) return say('eevee', '伊布會依照石頭或環境進化成各種不同的樣子喔！');
      await say('eevee', '這隻伊布是朋友寄放在我這裡的，但我照顧不來……你願意帶牠去冒險嗎？');
      done('eevee');
      await receive(Mon.create(133, 25));
    },
    async stones() {
      if (!once('stones')) return say('stones', '進化的石頭在友好商店也買得到喔！');
      await say('stones', '我收集了好多進化的石頭，送你一顆吧！');
      const ids = ['fire-stone', 'water-stone', 'thunder-stone', 'leaf-stone'].filter(id => ITEMS[id]);
      const c = await UI.choose([...ids.map(id => ITEMS[id].n), '不用了'], { prompt: '要哪一顆石頭？' });
      if (c < 0 || c >= ids.length) return;
      done('stones'); Game.giveItem(ids[c], 1);
      return UI.say(`獲得了${ITEMS[ids[c]].n}！`);
    },
    // 淺紅市：招式回憶處（500 元）、遺忘爺爺
    async reminder() {
      await say('reminder', '這裡是招式回憶處。可以讓寶可夢想起以前學過的招式，一次 500 元。');
      if (G.state.money < 500) return say('reminder', '你的錢好像不夠呢。');
      const forgot = m => [...new Set(Forms.data(m).l.filter(([lv, id]) => lv <= m.lv && MOVES[id] && !m.moves.some(x => x.id === id)).map(([, id]) => id))];
      const i = await pick(m => forgot(m).length > 0);
      if (i < 0) return;
      const m = G.party[i], list = forgot(m);
      const c = await UI.choose([...list.map(id => MOVES[id].n), '取消'], { prompt: `要讓 ${Mon.name(m)} 想起哪一個招式？` });
      if (c < 0 || c >= list.length) return;
      const before = m.moves.map(x => x.id).join();
      await Game.learnMove(m, list[c]);
      if (m.moves.map(x => x.id).join() !== before) { G.state.money -= 500; await say('reminder', '想起來了呢！'); }
    },
    async deleter() {
      await say('deleter', '我是遺忘爺爺。可以讓寶可夢忘記招式喔。');
      const i = await pick(m => m.moves.length > 1);
      if (i < 0) return;
      const m = G.party[i];
      const c = await UI.choose([...m.moves.map(x => MOVES[x.id].n), '取消'], { prompt: `要讓 ${Mon.name(m)} 忘記哪一個招式？` });
      if (c < 0 || c >= m.moves.length) return;
      const n = MOVES[m.moves[c].id].n;
      m.moves.splice(c, 1);
      await UI.say(`${Mon.name(m)} 忘記了 ${n}！`);
    },
    // 金黃市：格鬥道場（打敗空手道大王後選一隻）、超能力者
    async dojo(t) {
      if (once('dojo_win')) {
        await say('dojo', '我是格鬥道場的空手道大王武德！打贏我的話，就讓你選一隻格鬥寶可夢！');
        const c = await UI.choose(['對戰', '離開'], { prompt: '要挑戰空手道大王嗎？' });
        if (c !== 0) return;
        const lv = Math.max(15, World.gymLevel(t) - 2);
        const rnd = mulberry32(World.seed + 0xd0d0);
        const party = [0, 1, 2].map(i => Mon.create(World.pickForLevel(rnd, lv - 2 + i, { types: ['fighting'], gen: 1 }), lv - 2 + i));
        const r = await Game.battle({ trainer: { title: '空手道大王', name: '武德', party, kind: 'trainer', money: 80, sprite: TRAINER_BATTLE_SPRITES[6], lose: '我輸了……你真強！' }, biome: 'gym' });
        if (r !== 'win') return;
        done('dojo_win');
      }
      if (once('dojo_gift')) {
        await say('dojo', '你贏了！就讓你從這兩隻裡選一隻吧！');
        const c = await UI.choose(['飛腿郎', '快拳郎'], { prompt: '要選哪一隻？', cancel: false });
        done('dojo_gift');
        return receive(Mon.create(c === 0 ? 106 : 107, 25));
      }
      return say('dojo', '下次我一定會贏的！再來比一場吧！');
    },
    dojo_tip: () => say('dojo_tip', '師父是空手道大王！打贏他就能得到格鬥道場的寶可夢喔！'),
    async psychic() {
      if (once('psychic') && typeof TM !== 'undefined') {
        done('psychic');
        await say('psychic', '……我早就知道你會來。這個送給你。');
        const tm = TM.give(94);
        return UI.say(tm ? `獲得了 ${ITEMS[tm.id].n}！` : '可是你好像已經有了。');
      }
      return say('psychic', '……我感覺得到，你將會成為非常厲害的訓練家。');
    },
    tips_saffron: () => say('tips_saffron', '西爾佛公司的大樓就在這座城市裡。最近好像有可疑的人進出……'),
    // 紅蓮島：寶可夢研究所（化石復活）
    async fossil() {
      const have = Object.keys(FOSSILS).filter(id => G.state.bag[id] > 0);
      if (!have.length) return say('fossil', '這裡的研究所可以讓化石裡的古代寶可夢復活。如果找到化石，就拿來給我吧！');
      await say('fossil', '你有化石！要讓牠復活嗎？');
      const c = await UI.choose([...have.map(id => ITEMS[id].n), '不用了'], { prompt: '要讓哪一塊化石復活？' });
      if (c < 0 || c >= have.length) return;
      const id = have[c];
      if (--G.state.bag[id] <= 0) delete G.state.bag[id];
      await say('fossil', '……成功了！古代的寶可夢復活了！');
      return receive(Mon.create(FOSSILS[id], 20));
    },
  };

  // 遊戲內交換：隊伍中要有對方想要的寶可夢（不能是最後一隻）
  async function trade(ev) {
    const [want, give] = TRADES[ev];
    if (!once(ev)) return say(ev, `謝謝你！${POKEDEX[give].n} 過得還好嗎？`);
    await say(ev, `我想要 ${POKEDEX[want].n}！可以用我的 ${POKEDEX[give].n} 跟你交換嗎？`);
    const has = G.party.some(m => m.sp === want);
    if (!has || G.party.length < 2) return say(ev, `你沒有 ${POKEDEX[want].n} 嗎……找到的話再來找我吧！`);
    const i = await pick(m => m.sp === want);
    if (i < 0) return;
    const c = await UI.choose(['交換', '不要'], { prompt: `要用 ${Mon.name(G.party[i])} 交換 ${POKEDEX[give].n} 嗎？` });
    if (c !== 0) return;
    const old = G.party[i];
    const m = Mon.create(give, old.lv);
    Game.markSeen(give); Game.markCaught(give);
    G.party[i] = m;
    done(ev);
    Sound.jingle && Sound.jingle('catch');
    await UI.say(`${Mon.name(old)} 和 ${POKEDEX[give].n} 交換了！`);
    await say(ev, '謝謝你！我會好好照顧牠的！');
  }

  async function run(ev, t) {
    if (!RUN[ev]) return;
    Telemetry.event('城鎮事件', { ev, town: t && t.name });
    return RUN[ev](t);
  }
  // 沒有室內地圖時：進門選要跟誰說話
  async function house(b) {
    const c = await UI.choose([...b.ev.map(e => DEF[e].n), '離開'], { prompt: '屋裡有兩個人。要跟誰說話？' });
    if (c >= 0 && c < b.ev.length) await run(b.ev[c], b.town);
  }
  return { DEF, TRADES, FOSSILS, RUN, run, house };
})();
