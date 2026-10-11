// 綠寶石版招式動畫：重現 pokeemerald battle_anim_scripts 的基本元素
//   proj（拋射，createsprite gLinearTranslate 類）、burst（在目標身上產生）、beam（連續拋射）、
//   rain（從畫面上方落下）、orbit（繞著目標）、lunge（衝向對手）、shake（震動）、tint（變色，blendcolor）、
//   flash（背景閃光／變暗）、wait
// 常見招式照原版腳本的動作順序重做；沒有腳本的招式沿用屬性通用動畫（battle_view.js 的 moveAnim）
import { Sound } from './core.js';
import { U } from './util.js';
import { Gen3 } from './gen3.js';
import { Battle } from './battle.js';
const AnimKit = {
  // 在 battle 上建立一組工具
  make(b, user, target) {
    const us = b.sideOf(user), ts = b.sideOf(target);
    const at = s => b.center(s === 'user' ? us : s === 'target' ? ts : s);
    const imgOf = s => b.el.querySelector(`.bmon.${s === 'user' ? us : ts} img`);
    const rnd = n => U.ri(-n, n);
    const A = {
      us, ts,
      wait: ms => U.sleep(ms),
      sfx: n => Sound.sfx(n),
      // 在某處產生一個特效（可隨機偏移）
      burst(name, where = 'target', { n = 1, spread = 0, dur = 400, gap = 0, scale = 3, dy = 0 } = {}) {
        const c = at(where);
        const els = [];
        const go = async () => {
          for (let i = 0; i < n; i++) {
            els.push(b.spawn(name, c.x + rnd(spread), c.y + dy + rnd(spread), { dur, scale }));
            if (gap) await U.sleep(gap);
          }
        };
        return go().then(() => U.sleep(gap ? 0 : dur * .6));
      },
      // 從使用者射向目標
      async proj(name, { n = 1, gap = 80, dur = 380, arc = 0, spread = 16, from = 'user', to = 'target', spin = false, loop = 2 } = {}) {
        const a = at(from), c = at(to);
        for (let i = 0; i < n; i++) {
          const p = b.spawn(name, a.x, a.y, { dur, loop });
          if (p) {
            const ex = c.x - a.x + rnd(spread), ey = c.y - a.y + rnd(spread);
            const mid = `translate(${ex / 2}px, ${ey / 2 - arc}px)${spin ? ' rotate(180deg)' : ''}`;
            p.animate([{ transform: 'translate(0,0)' }, { transform: mid }, { transform: `translate(${ex}px, ${ey}px)${spin ? ' rotate(360deg)' : ''}` }], { duration: dur, easing: 'linear', fill: 'forwards' });
          }
          if (gap) await U.sleep(gap);
        }
        await U.sleep(dur);
      },
      // 連續拋射（光束）
      beam(name, opts = {}) { return A.proj(name, { n: 10, gap: 35, dur: 280, spread: 8, ...opts }); },
      // 從畫面上方落下（暴風雪、打雷、岩崩）
      async rain(name, { n = 8, gap = 60, dur = 420, spread = 70, where = 'target', from = -220 } = {}) {
        const c = at(where);
        for (let i = 0; i < n; i++) {
          const x = c.x + rnd(spread);
          const p = b.spawn(name, x, c.y + from, { dur, loop: 2 });
          if (p) p.animate([{ transform: 'translate(0,0)' }, { transform: `translate(${rnd(10)}px, ${-from + rnd(20)}px)` }], { duration: dur, easing: 'ease-in', fill: 'forwards' });
          await U.sleep(gap);
        }
        await U.sleep(dur * .7);
      },
      // 繞著目標轉圈
      async orbit(name, { where = 'target', n = 6, r = 60, dur = 700 } = {}) {
        const c = at(where);
        for (let i = 0; i < n; i++) {
          const p = b.spawn(name, c.x, c.y, { dur, loop: 2 });
          if (p) {
            const k = i / n * Math.PI * 2;
            const pts = [0, 1, 2, 3, 4].map(j => { const t = k + j * Math.PI / 2; return { transform: `translate(${Math.cos(t) * r}px, ${Math.sin(t) * r * .5}px)` }; });
            p.animate(pts, { duration: dur, fill: 'forwards' });
          }
        }
        await U.sleep(dur);
      },
      // 衝向對手再回來
      async lunge({ dist = 60, dur = 300 } = {}) {
        const img = imgOf('user');
        if (!img) return;
        const dx = us === 'me' ? dist : -dist, dy = us === 'me' ? -dist / 2 : dist / 2;
        img.animate([{ translate: '0 0' }, { translate: `${dx}px ${dy}px` }, { translate: '0 0' }], { duration: dur });
        await U.sleep(dur / 2);
      },
      // 跳起（使用者）
      async hop({ h = 24, times = 1, dur = 260 } = {}) {
        const img = imgOf('user');
        if (img) img.animate([{ translate: '0 0' }, { translate: `0 ${-h}px` }, { translate: '0 0' }], { duration: dur, iterations: times });
        await U.sleep(dur * times);
      },
      // 震動
      async shake(who = 'target', { amp = 10, times = 4, dur = 60 } = {}) {
        const img = imgOf(who);
        if (img) img.animate([{ translate: '0 0' }, { translate: `${amp}px 0` }, { translate: `${-amp}px 0` }, { translate: '0 0' }], { duration: dur * 4, iterations: times / 2 });
        await U.sleep(dur * times * 2);
      },
      // 變色（blendcolor）
      async tint(who, color, { dur = 500 } = {}) {
        const img = imgOf(who);
        if (img) img.animate([{ filter: 'none' }, { filter: `drop-shadow(0 0 0 ${color}) brightness(1.4) sepia(1) saturate(4) hue-rotate(${{ '#f84': 0, '#48f': 180, '#ff4': 30, '#a4f': 240, '#4f4': 80, '#fff': 0, '#000': 0 }[color] || 0}deg)` }, { filter: 'none' }], { duration: dur });
        await U.sleep(dur);
      },
      // 背景閃光或變暗
      async flash(color = '#fff', { dur = 300, alpha = .8 } = {}) {
        const d = document.createElement('div');
        d.style.cssText = `position:absolute;inset:0;background:${color};pointer-events:none;z-index:6;opacity:0`;
        b.fxEl.appendChild(d);
        d.animate([{ opacity: 0 }, { opacity: alpha }, { opacity: 0 }], { duration: dur });
        await U.sleep(dur);
        d.remove();
      },
      async dark(dur = 600) { return A.flash('#000', { dur, alpha: .55 }); },
      hit(eff) { Sound.sfx('hit'); return A.shake('target', { amp: 8, times: 3 }); },
    };
    return A;
  },
};

// 招式腳本（Showdown 招式 id）
const MOVE_ANIM = {
  // ---------- 一般 ----------
  tackle: async A => { await A.lunge(); await A.burst('impact', 'target', { dur: 300 }); },
  pound: async A => { await A.lunge({ dist: 40 }); await A.burst('impact', 'target', { dur: 300 }); },
  scratch: async A => { await A.burst('scratch', 'target', { dur: 350 }); },
  quickattack: async A => { await A.lunge({ dist: 110, dur: 220 }); await A.burst('impact', 'target', { dur: 250 }); },
  bodyslam: async A => { await A.hop({ h: 40 }); await A.lunge({ dist: 90 }); await A.burst('impact', 'target', { n: 2, spread: 20, dur: 300 }); await A.shake('target', { amp: 14 }); },
  takedown: async A => { await A.lunge({ dist: 100 }); await A.burst('impact', 'target', { n: 3, spread: 24, gap: 60 }); await A.shake('user', { amp: 6 }); },
  doubleedge: async A => { await A.tint('user', '#fff'); await A.lunge({ dist: 110 }); await A.burst('impact', 'target', { n: 3, spread: 24, gap: 60 }); await A.shake('user', { amp: 8 }); },
  hyperbeam: async A => { await A.dark(300); await A.beam('orbs', { n: 16, gap: 25 }); await A.burst('explosion', 'target', { dur: 400 }); await A.shake('target', { amp: 16, times: 6 }); },
  slash: async A => { await A.burst('slash', 'target', { n: 2, gap: 120, spread: 10 }); },
  cut: async A => { await A.burst('cut', 'target', { dur: 350 }); },
  furyswipes: async A => { await A.burst('fury_swipes', 'target', { n: 3, gap: 120, spread: 20 }); },
  swordsdance: async A => { await A.burst('sword', 'user', { dur: 700 }); await A.tint('user', '#fff'); },
  growl: async A => { await A.burst('noise_line', 'user', { n: 3, gap: 100, spread: 20 }); await A.shake('target', { amp: 4 }); },
  leer: async A => { await A.burst('leer', 'user', { dur: 500 }); await A.shake('target', { amp: 6 }); },
  tailwhip: async A => { await A.hop({ h: 10, times: 2, dur: 180 }); },
  protect: async A => { await A.burst('protect', 'user', { dur: 700 }); },
  recover: async A => { await A.orbit('blue_star', { where: 'user', n: 6, r: 50 }); await A.tint('user', '#fff'); },
  rest: async A => { await A.burst('letter_z', 'user', { n: 3, gap: 200, spread: 20 }); },
  harden: async A => { await A.tint('user', '#fff', { dur: 600 }); },
  agility: async A => { await A.burst('speed_dust', 'user', { n: 4, gap: 80, spread: 30 }); await A.hop({ h: 8, times: 3, dur: 120 }); },
  // ---------- 火 ----------
  ember: async A => { await A.proj('small_ember', { n: 3, gap: 90 }); await A.burst('fire', 'target', { dur: 300 }); },
  flamethrower: async A => { await A.beam('fire', { n: 14, gap: 40 }); await A.tint('target', '#f84'); },
  fireblast: async A => { await A.proj('fire', { n: 2 }); await A.burst('fire_plume', 'target', { n: 5, spread: 40, gap: 60 }); await A.flash('#f84', { alpha: .4 }); },
  firepunch: async A => { await A.burst('fire', 'target', { n: 4, spread: 30, gap: 50 }); await A.burst('punch_impact', 'target', { dur: 300 }); },
  flareblitz: async A => { await A.tint('user', '#f84'); await A.lunge({ dist: 110 }); await A.burst('fire_plume', 'target', { n: 4, spread: 30, gap: 50 }); },
  willowisp: async A => { await A.proj('wisp_fire', { n: 3, gap: 120, arc: 30 }); await A.tint('target', '#a4f'); },
  heatwave: async A => { await A.flash('#f84', { alpha: .35, dur: 500 }); await A.beam('fire', { n: 10, gap: 40, spread: 60 }); },
  // ---------- 水 ----------
  watergun: async A => { await A.beam('water_orb', { n: 8, gap: 40 }); await A.burst('water_impact', 'target', { dur: 300 }); },
  bubble: async A => { await A.proj('bubble', { n: 6, gap: 70, arc: 20 }); },
  bubblebeam: async A => { await A.beam('bubble', { n: 12 }); await A.burst('bubble_burst', 'target', { dur: 300 }); },
  surf: async A => { await A.flash('#48f', { alpha: .4, dur: 400 }); await A.rain('water_droplet', { n: 10, from: 120, gap: 40 }); await A.shake('target', { amp: 10 }); },
  hydropump: async A => { await A.beam('water_orb', { n: 18, gap: 25 }); await A.burst('water_impact', 'target', { n: 3, spread: 20, gap: 60 }); },
  waterfall: async A => { await A.lunge({ dist: 90 }); await A.rain('water_droplet', { n: 8, gap: 40 }); },
  aquatail: async A => { await A.lunge({ dist: 80 }); await A.burst('water_impact', 'target', { n: 2, spread: 20, gap: 80 }); },
  scald: async A => { await A.beam('water_orb', { n: 10, gap: 35 }); await A.tint('target', '#f84'); },
  // ---------- 電 ----------
  thundershock: async A => { await A.burst('spark_0', 'target', { n: 3, spread: 30, gap: 60 }); await A.tint('target', '#ff4'); },
  thunderbolt: async A => { await A.flash('#ff4', { alpha: .3 }); await A.burst('lightning', 'target', { dy: -40, dur: 400 }); await A.burst('electricity', 'target', { n: 3, spread: 30, gap: 60 }); },
  thunder: async A => { await A.dark(300); await A.rain('lightning', { n: 3, gap: 120, spread: 20 }); await A.flash('#ff4', { alpha: .6 }); await A.shake('target', { amp: 14 }); },
  thunderpunch: async A => { await A.burst('spark_1', 'target', { n: 3, spread: 30, gap: 50 }); await A.burst('punch_impact', 'target', { dur: 300 }); },
  thunderwave: async A => { await A.proj('spark_h', { n: 2, gap: 120 }); await A.burst('electricity', 'target', { n: 2, gap: 120 }); },
  spark: async A => { await A.tint('user', '#ff4'); await A.lunge({ dist: 90 }); await A.burst('spark_2', 'target', { n: 3, spread: 30, gap: 60 }); },
  discharge: async A => { await A.burst('electric_orbs', 'user', { n: 3, spread: 40, gap: 80 }); await A.flash('#ff4', { alpha: .4 }); await A.burst('electricity', 'target', { n: 3, spread: 40, gap: 50 }); },
  // ---------- 草 ----------
  vinewhip: async A => { await A.burst('vine', 'target', { n: 2, gap: 150 }); },
  razorleaf: async A => { await A.proj('razor_leaf', { n: 6, gap: 60, arc: 40, spin: true }); },
  absorb: async A => { await A.burst('orbs', 'target', { n: 4, spread: 30, gap: 60 }); await A.proj('green_star', { from: 'target', to: 'user', n: 4, gap: 60 }); },
  megadrain: async A => { await A.burst('orbs', 'target', { n: 5, spread: 30, gap: 60 }); await A.proj('green_star', { from: 'target', to: 'user', n: 6, gap: 50 }); },
  gigadrain: async A => { await A.dark(300); await A.burst('orbs', 'target', { n: 6, spread: 40, gap: 50 }); await A.proj('green_star', { from: 'target', to: 'user', n: 8, gap: 40 }); },
  solarbeam: async A => { await A.flash('#ff8', { alpha: .5 }); await A.beam('sunlight', { n: 16, gap: 25 }); await A.burst('explosion', 'target', { dur: 300 }); },
  leafblade: async A => { await A.burst('leaf', 'target', { n: 3, spread: 30, gap: 60 }); await A.burst('slash', 'target', { dur: 300 }); },
  energyball: async A => { await A.proj('glowy_red_orb', { n: 1, dur: 450 }); await A.burst('green_sparkle', 'target', { n: 3, spread: 30 }); },
  sleeppowder: async A => { await A.rain('spore', { n: 8, from: -80, spread: 40 }); },
  stunspore: async A => { await A.rain('poison_powder', { n: 8, from: -80, spread: 40 }); await A.tint('target', '#ff4'); },
  // ---------- 冰 ----------
  icebeam: async A => { await A.beam('ice_crystals_0', { n: 14, gap: 35 }); await A.burst('ice_cube_0', 'target', { dur: 500 }); await A.tint('target', '#48f'); },
  blizzard: async A => { await A.dark(300); await A.rain('ice_crystals_1', { n: 14, gap: 40, spread: 100 }); await A.tint('target', '#48f'); },
  icepunch: async A => { await A.burst('ice_crystals_2', 'target', { n: 4, spread: 30, gap: 50 }); await A.burst('punch_impact', 'target', { dur: 300 }); },
  powdersnow: async A => { await A.proj('snowball', { n: 6, gap: 60, spread: 30 }); },
  aurorabeam: async A => { await A.beam('rainbow_rings', { n: 10, gap: 40 }); },
  // ---------- 超能力、幽靈、惡 ----------
  confusion: async A => { await A.flash('#a4f', { alpha: .3 }); await A.shake('target', { amp: 10, times: 6 }); },
  psychic: async A => { await A.flash('#a4f', { alpha: .5, dur: 500 }); await A.shake('target', { amp: 16, times: 6 }); },
  psybeam: async A => { await A.beam('thin_ring', { n: 10, gap: 40 }); await A.tint('target', '#a4f'); },
  shadowball: async A => { await A.dark(300); await A.proj('shadow_ball', { dur: 500 }); await A.burst('black_ball', 'target', { dur: 300 }); },
  lick: async A => { await A.burst('lick', 'target', { dur: 400 }); },
  nightshade: async A => { await A.dark(500); await A.tint('target', '#000', { dur: 500 }); },
  bite: async A => { await A.burst('sharp_teeth', 'target', { dur: 400 }); },
  crunch: async A => { await A.burst('sharp_teeth', 'target', { dur: 300 }); await A.burst('impact', 'target', { n: 2, spread: 20, gap: 60 }); },
  darkpulse: async A => { await A.dark(400); await A.orbit('black_ball', { where: 'user', n: 6, r: 70 }); await A.shake('target', { amp: 10 }); },
  // ---------- 地面、岩石 ----------
  earthquake: async A => { await A.shake('target', { amp: 18, times: 8 }); await A.shake('user', { amp: 8, times: 4 }); },
  dig: async A => { await A.burst('dirt_mound', 'target', { n: 2, spread: 20 }); await A.burst('impact', 'target', { dur: 300 }); },
  mudslap: async A => { await A.proj('mud_sand_0', { n: 4, gap: 60, arc: 30 }); },
  rockslide: async A => { await A.rain('rocks', { n: 8, gap: 60, spread: 60 }); await A.shake('target', { amp: 12 }); },
  rockthrow: async A => { await A.rain('rocks', { n: 3, gap: 100, spread: 20 }); },
  stoneedge: async A => { await A.burst('rocks', 'target', { n: 6, spread: 40, gap: 50, dy: 30 }); await A.shake('target', { amp: 12 }); },
  // ---------- 毒 ----------
  poisonsting: async A => { await A.proj('needle', { n: 1 }); await A.burst('poison_bubble', 'target', { dur: 300 }); },
  sludgebomb: async A => { await A.proj('poison_bubble', { n: 3, gap: 80, arc: 50 }); await A.burst('poison_bubble', 'target', { n: 4, spread: 30, gap: 50 }); await A.tint('target', '#a4f'); },
  toxic: async A => { await A.burst('toxic_bubble', 'target', { n: 5, spread: 30, gap: 60 }); await A.tint('target', '#a4f'); },
  poisonpowder: async A => { await A.rain('poison_powder', { n: 8, from: -80, spread: 40 }); await A.tint('target', '#a4f'); },
  // ---------- 飛行 ----------
  gust: async A => { await A.burst('gust', 'target', { n: 3, gap: 100, spread: 20 }); },
  wingattack: async A => { await A.lunge({ dist: 90 }); await A.burst('impact', 'target', { n: 2, spread: 30, gap: 80 }); },
  aerialace: async A => { await A.lunge({ dist: 120, dur: 220 }); await A.burst('slash', 'target', { dur: 300 }); },
  fly: async A => { await A.lunge({ dist: 120 }); await A.burst('impact', 'target', { dur: 300 }); },
  airslash: async A => { await A.proj('air_slash', { n: 2, gap: 100 }); await A.burst('slash', 'target', { dur: 300 }); },
  hurricane: async A => { await A.orbit('whirlwind_lines', { n: 8, r: 70, dur: 800 }); await A.shake('target', { amp: 12 }); },
  // ---------- 格鬥 ----------
  karatechop: async A => { await A.burst('hands_and_feet', 'target', { dur: 350 }); },
  lowkick: async A => { await A.burst('hands_and_feet', 'target', { dy: 30, dur: 350 }); },
  closecombat: async A => { await A.burst('punch_impact', 'target', { n: 5, spread: 40, gap: 60 }); await A.burst('hands_and_feet', 'target', { n: 3, spread: 40, gap: 60 }); },
  brickbreak: async A => { await A.burst('hands_and_feet', 'target', { dur: 300 }); await A.burst('impact', 'target', { dur: 250 }); await A.shake('target', { amp: 10 }); },
  machpunch: async A => { await A.lunge({ dist: 110, dur: 200 }); await A.burst('punch_impact', 'target', { dur: 250 }); },
  // ---------- 龍、鋼、妖精 ----------
  dragonclaw: async A => { await A.burst('claw_slash', 'target', { n: 2, gap: 120, spread: 10 }); },
  dragonbreath: async A => { await A.beam('fire', { n: 10, gap: 40 }); await A.tint('target', '#a4f'); },
  outrage: async A => { await A.tint('user', '#f84'); await A.lunge({ dist: 110 }); await A.burst('explosion', 'target', { n: 2, spread: 30, gap: 80 }); },
  dragonpulse: async A => { await A.beam('purple_flame', { n: 12, gap: 35 }); },
  ironhead: async A => { await A.tint('user', '#fff'); await A.lunge({ dist: 100 }); await A.burst('impact', 'target', { dur: 300 }); },
  flashcannon: async A => { await A.flash('#fff', { alpha: .5 }); await A.beam('orbs', { n: 12, gap: 30 }); },
  metalclaw: async A => { await A.burst('claw_slash', 'target', { n: 2, gap: 100 }); },
  moonblast: async A => { await A.burst('moon', 'user', { dur: 500 }); await A.proj('pink_orb', { dur: 450 }); await A.burst('sparkle_4', 'target', { n: 3, spread: 30 }); },
  dazzlinggleam: async A => { await A.flash('#fff', { alpha: .7 }); await A.burst('sparkle_3', 'target', { n: 4, spread: 40, gap: 60 }); },
};

// 招式音效（pokeemerald sound/songs/midi/se_m_*）：個別招式，其餘依屬性
const MOVE_SE = {
  tackle: 'comet_punch', pound: 'comet_punch', scratch: 'scratch', quickattack: 'comet_punch', bodyslam: 'mega_kick', takedown: 'take_down',
  doubleedge: 'take_down', hyperbeam: 'hyper_beam', slash: 'cut', cut: 'cut', furyswipes: 'scratch', swordsdance: 'swords_dance',
  growl: 'swagger', leer: 'leer', tailwhip: 'tail_whip', protect: 'detect', recover: 'moonlight', rest: 'snore', harden: 'harden', agility: 'double_team',
  ember: 'ember', flamethrower: 'flamethrower', fireblast: 'sacred_fire', firepunch: 'fire_punch', flareblitz: 'flame_wheel', willowisp: 'ember', heatwave: 'heat_wave',
  watergun: 'bubble', bubble: 'bubble', bubblebeam: 'bubble_beam', surf: 'surf', hydropump: 'hydro_pump', waterfall: 'waterfall', aquatail: 'waterfall', scald: 'hydro_pump',
  thundershock: 'thunderbolt', thunderbolt: 'thunderbolt', thunder: 'thunderbolt2', thunderpunch: 'thunderbolt', thunderwave: 'thunder_wave', spark: 'charge', discharge: 'thunderbolt2',
  vinewhip: 'double_slap', razorleaf: 'razor_wind', absorb: 'absorb', megadrain: 'absorb_2', gigadrain: 'giga_drain', solarbeam: 'solar_beam', leafblade: 'cut',
  energyball: 'absorb_2', sleeppowder: 'poison_powder', stunspore: 'poison_powder',
  icebeam: 'icy_wind', blizzard: 'blizzard', icepunch: 'icy_wind', powdersnow: 'icy_wind', aurorabeam: 'psybeam',
  confusion: 'psybeam2', psychic: 'psybeam', psybeam: 'psybeam', shadowball: 'nightmare', lick: 'lick', nightshade: 'nightmare', bite: 'bite', crunch: 'bite', darkpulse: 'faint_attack',
  earthquake: 'earthquake', dig: 'dig', mudslap: 'sand_attack', rockslide: 'rock_throw', rockthrow: 'rock_throw', stoneedge: 'rock_throw',
  poisonsting: 'horn_attack', sludgebomb: 'toxic', toxic: 'toxic', poisonpowder: 'poison_powder',
  gust: 'gust', wingattack: 'wing_attack', aerialace: 'wing_attack', fly: 'fly', airslash: 'razor_wind2', hurricane: 'twister',
  karatechop: 'vital_throw', lowkick: 'mega_kick2', closecombat: 'vital_throw2', brickbreak: 'brick_break', machpunch: 'comet_punch',
  dragonclaw: 'scratch', dragonbreath: 'dragon_rage', outrage: 'dragon_rage', dragonpulse: 'dragon_rage',
  ironhead: 'headbutt', flashcannon: 'reflect', metalclaw: 'scratch', moonblast: 'moonlight', dazzlinggleam: 'swift',
};
const TYPE_SE = {
  normal: 'comet_punch', fire: 'ember', water: 'bubble', electric: 'thunderbolt', grass: 'absorb', ice: 'icy_wind', fighting: 'vital_throw',
  poison: 'toxic', ground: 'dig', flying: 'wing_attack', psychic: 'psybeam', bug: 'string_shot', rock: 'rock_throw', ghost: 'nightmare',
  dragon: 'dragon_rage', dark: 'bite', steel: 'harden', fairy: 'charm',
};

// 有腳本的招式用腳本，其他沿用屬性通用動畫
const _moveAnimGeneric = Battle.prototype.moveAnim;
Battle.prototype.moveAnim = async function (user, target, mv) {
  if (mv) { const se = MOVE_SE[mv.id] || TYPE_SE[mv.t]; if (se) Sound.sfx('m_' + se); }
  const script = Gen3.on && mv && mv.id && MOVE_ANIM[mv.id];
  if (!script || !this.el) return _moveAnimGeneric.call(this, user, target, mv);
  try { await script(AnimKit.make(this, user, target)); } catch (e) { console.warn('招式動畫失敗', mv.id, e); }
};

export { AnimKit, MOVE_ANIM, MOVE_SE, TYPE_SE, _moveAnimGeneric };
