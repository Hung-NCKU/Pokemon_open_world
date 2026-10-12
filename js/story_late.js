// 原始回歸（豐緣）與究極爆發（阿羅拉）的劇情（名稱依神奇寶貝百科 52poke；世界配置第 9 版以後才有這些地標）
// - 豐緣：煙囪山的熔岩隊（赤焰松）→ 送神山的海洋隊（水梧桐）→ 送神山的老爺爺交給你朱紅色寶珠與靛藍色寶珠
//   （蓋歐卡攜帶靛藍色寶珠、固拉多攜帶朱紅色寶珠，在戰鬥中原始回歸）；海底洞窟、覺醒神殿的傳說要在趕走海洋隊之後才會醒來
// - 阿羅拉：成為阿羅拉冠軍後，拉納基拉山的山頂出現究極奈克洛茲瑪；打倒後得到究極奈克洛Ｚ（合體後的奈克洛茲瑪攜帶，戰鬥中究極爆發）
import { G, Game, LANDMARKS, Sound, Story, UI } from './core.js';
import { ITEMS } from './data.js';
import { Mon } from './mon.js';
import { World } from './world.js';

const VER = 9;
const has = id => [...(World.landmarks || new Map()).values()].some(l => l.id === id);

// ---------- 豐緣：原始回歸 ----------
LANDMARKS.hoenn.push(
  { id: 'mtchimney', n: '煙囪山', near: 3, ver: VER, event: 'boss', need: 3, lvOff: 2,
    fights: [{ title: '熔岩隊手下', name: '', sprite: 'magmagrunt', team: [322, 262] }, { title: '熔岩隊手下', name: '', sprite: 'magmagruntf', team: [218, 322] },
      { title: '熔岩隊首領', name: '赤焰松', sprite: 'maxie-gen6', team: [262, 42, 323] }],
    intro: '熔岩隊包圍了煙囪山的火山口！\n赤焰松：「只要讓火山活躍起來，大地就會擴張……人類和寶可夢都能過得更好！」',
    win: '赤焰松：「……是我輸了。看來我的想法還有不足之處。」\n熔岩隊撤退了。（聽說海洋隊盯上了送神山……）', reward: [['rare-candy', 2]] },
  { id: 'mtpyre', n: '送神山', near: 5, ver: VER, event: 'boss', need: 5, lvOff: 3, needFlag: 'boss_mtchimney',
    fights: [{ title: '海洋隊手下', name: '', sprite: 'aquagrunt', team: [318, 41] }, { title: '海洋隊手下', name: '', sprite: 'aquagruntf', team: [320, 318] },
      { title: '海洋隊首領', name: '水梧桐', sprite: 'archie-gen6', team: [262, 42, 319] }],
    intro: '海洋隊搶走了送神山山頂供奉的寶珠！\n水梧桐：「有了這個，就能喚醒沉睡在海底的那傢伙！讓大海擴張吧！」',
    win: '水梧桐：「……可惡！」海洋隊丟下寶珠逃走了。\n送神山的老爺爺：「謝謝你。這兩顆寶珠就交給你保管吧。\n據說古代的寶可夢拿著它們，就能回歸原始的姿態……」',
    reward: [['red-orb', 1], ['blue-orb', 1]] },
);

// 蓋歐卡、固拉多：趕走海洋隊之前還在沉睡（舊世界沒有送神山時照舊）
const _legend = Story.legend;
Story.legend = async function (l) {
  const id = l.lm && l.lm.id;
  if ((id === 'seafloorcavern' || id === 'caveoforigin') && has('mtpyre') && !G.state.flags.boss_mtpyre) {
    await UI.say(`${POKEDEX[l.sp].n} 還在深深地沉睡……\n（聽說熔岩隊和海洋隊想要喚醒牠。先去煙囪山和送神山看看吧）`);
    return;
  }
  return _legend.call(this, l);
};

// ---------- 阿羅拉：究極爆發 ----------
(LANDMARKS.alola = LANDMARKS.alola || []).push(
  { id: 'lanakila', n: '拉納基拉山的山頂', near: 'league', ver: VER, event: 'ultraburst' },
);

const _landmark = Story.landmark;
Story.landmark = async function (lm) {
  if (lm.event !== 'ultraburst') return _landmark.call(this, lm);
  const s = G.state;
  s.flags['seen_' + lm.id] = 1;
  await UI.say(`這裡是${lm.n}。天空中有一道刺眼的光芒……`);
  if (s.flags.ultraburst) { await UI.say('山頂恢復了平靜，只剩下星空閃爍著。'); return; }
  if (!s.champs.alola) { await UI.say('強烈的光芒讓人睜不開眼睛，沒辦法再往前走了。\n（成為阿羅拉的冠軍之後再來看看吧）'); return; }
  await UI.say('光芒凝聚成了巨大的身影……\n「光……光……！」\n究極奈克洛茲瑪出現了！');
  const league = World.towns.find(t => t.region === 'alola' && t.kind === 'league');
  const L = Math.min(100, Math.max(...World.championParty(league).map(m => m.lv)) + 2);
  const boss = Mon.create(800, L, { form: 'necrozma-ultra', perfect: 31 });
  const r = await Game.battle({ trainer: { title: '', name: '究極奈克洛茲瑪', party: [boss], kind: 'gym', money: 0, sprite: null, aura: true, lose: '' }, biome: 'rock' });
  if (r !== 'win') return;
  s.flags.ultraburst = 1; s.flags['lm_' + lm.id] = 1;
  await UI.say('究極奈克洛茲瑪的光芒散去，消失在夜空中……\n地上留著一顆閃閃發光的純晶。');
  if (!s.bag['ultranecrozium-z'] && ITEMS['ultranecrozium-z']) {
    Game.giveItem('ultranecrozium-z', 1);
    Sound.sfx('item');
    await UI.say('獲得了究極奈克洛Ｚ！\n（讓和索爾迦雷歐或露奈雅拉合體的奈克洛茲瑪攜帶，在戰鬥中按 M 究極爆發）');
  }
  Game.save(true);
};

// 任務選單：劇情的進度
const _questSummary = Story.questSummary;
Story.questSummary = function (s) {
  const out = [];
  if (has('mtchimney') && (s.region === 'hoenn' || World.towns.some(t => t.region === 'hoenn' && s.visited[t.id]))) {
    out.push(s.flags.boss_mtpyre ? '原始回歸：已取得朱紅色寶珠與靛藍色寶珠（讓固拉多、蓋歐卡攜帶）'
      : s.flags.boss_mtchimney ? '原始回歸：海洋隊在送神山（需要 5 枚豐緣徽章）' : '原始回歸：熔岩隊在煙囪山（需要 3 枚豐緣徽章）');
  }
  if (has('lanakila') && (s.region === 'alola' || World.towns.some(t => t.region === 'alola' && s.visited[t.id]))) {
    out.push(s.flags.ultraburst ? '究極爆發：已取得究極奈克洛Ｚ' : `究極爆發：拉納基拉山的山頂有奇怪的光芒${s.champs.alola ? '' : '（成為阿羅拉冠軍之後）'}`);
  }
  const base = _questSummary.call(this, s);
  return out.length ? base + '\n' + out.map(x => '・' + x).join('\n') : base;
};

export { VER as STORY_LATE_VER };
