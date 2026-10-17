// Graph serialization preserves combat references (Maps, Sets, transformed mons).
// A checkpoint is taken before command selection, never halfway through damage.
import { Account, G, Game, Interior, Sound, Story, UI } from './core.js';
import { Battle } from './battle.js';
import { Mon } from './mon.js';
import { World } from './world.js';
const TRANSFER = 'pokemon_quick_resume_v2';
const clone = value => JSON.parse(JSON.stringify(value));
let entry = null, replay = null, pending = null;
const namespaces = {};
const entryMethods = new Map();

export function packGraph(value) {
  const nodes = [], seen = new Map();
  function pack(v) {
    if (v === undefined || typeof v === 'function' || v instanceof WeakMap || (typeof Node !== 'undefined' && v instanceof Node)) return { u: 1 };
    if (v === null || typeof v !== 'object') return v;
    if (seen.has(v)) return { r: seen.get(v) };
    const id = nodes.length; seen.set(v, id); nodes.push(null);
    if (v instanceof Map) nodes[id] = { t: 'map', v: [...v].map(([k,x]) => [pack(k),pack(x)]) };
    else if (v instanceof Set) nodes[id] = { t: 'set', v: [...v].map(pack) };
    else if (Array.isArray(v)) nodes[id] = { t: 'array', v: v.map(pack) };
    else nodes[id] = { t: 'object', v: Object.entries(v).filter(([k]) => !['__proto__','constructor','prototype','_quickBoundary'].includes(k)).map(([k,x]) => [k,pack(x)]) };
    return { r: id };
  }
  const root = pack(value); return { root, nodes };
}
export function unpackGraph(graph) {
  if (!graph || !Array.isArray(graph.nodes) || graph.nodes.length > 50000) throw Error('即時存檔資料無效');
  const values = graph.nodes.map(n => n.t === 'map' ? new Map() : n.t === 'set' ? new Set() : n.t === 'array' ? [] : {});
  const get = v => v && typeof v === 'object' ? v.u ? undefined : Number.isInteger(v.r) && v.r >= 0 && v.r < values.length ? values[v.r] : (()=>{throw Error('即時存檔參照無效');})() : v;
  graph.nodes.forEach((n,i) => {
    const out = values[i];
    if (n.t === 'map') for (const [k,v] of n.v) out.set(get(k),get(v));
    else if (n.t === 'set') for (const v of n.v) out.add(get(v));
    else if (n.t === 'array') for (const v of n.v) out.push(get(v));
    else for (const [k,v] of n.v) if (!['__proto__','constructor','prototype'].includes(k)) out[k]=get(v);
  });
  return get(graph.root);
}
function roomState() {
  if (!G.room) return null;
  const { b, key, x, y, dir, boulders, npcs, cleared, e4, noBack } = G.room;
  return { building: b.town ? [b.x,b.y] : null, landmark: b.lm?.id, key, x, y, dir, boulders, npcs, cleared, e4, noBack };
}
async function restoreRoom(saved) {
  if (!saved) { Interior.leave(); return; }
  const sameRoom = G.room?.key === saved.key && (saved.building
    ? G.room.b?.x === saved.building[0] && G.room.b?.y === saved.building[1]
    : G.room.b?.lm?.id === saved.landmark);
  if (!sameRoom && saved.building) {
    const b = World.buildings.find(b => b.x === saved.building[0] && b.y === saved.building[1]);
    if (!b) throw Error('找不到存檔中的建築');
    await Interior.enter(b);
    if (G.room.key !== saved.key && window.INTERIORS?.[saved.key]) await Interior.goRoom(saved.key, saved.e4);
  } else if (!sameRoom) {
    const lm = [...World.landmarks.values()].find(l => l.id === saved.landmark);
    if (!lm) throw Error('找不到存檔中的洞窟');
    await Interior.enterCave(lm,saved.key,()=>Story.caveGoal(lm));
  }
  for (const k of ['x','y','dir','boulders','npcs','cleared','e4','noBack']) if (saved[k] !== undefined) G.room[k] = saved[k];
}
function snapshot(battle = null) {
  const attrs = battle ? Object.fromEntries(Object.entries(battle).filter(([k]) => !['el','fxEl','slotEls','shown','_quickBoundary'].includes(k))) : null;
  const mons = [...G.party,...(battle?.foeParty || [])];
  return { quickVersion: 2, graph: packGraph({ state:G.state, room:roomState(), tower:G.tower || null,
    battle:attrs, entry:entry && clone(entry), bench:mons.map(m=>[m,battle?._benchVol?.get(m)]), overrides:mons.map(m=>[m,Mon.ovr.get(m)]), cursors:mons.map(m=>[m,Battle.moveCursor(m)]) }) };
}
function store(n, data) {
  try { localStorage.setItem(Game.slotKey(n),JSON.stringify(data)); Sound.sfx('save'); UI.banner(`已即時存檔到第 ${n} 格（F${n} 讀取）`); return true; }
  catch { UI.banner('即時存檔失敗：瀏覽器儲存空間不足'); return false; }
}
export function quickBoundary(battle) {
  battle.quickReady = true;
  battle._quickBoundary = JSON.stringify(snapshot(battle));
  if (pending !== null) { const n=pending;pending=null;store(n,JSON.parse(battle._quickBoundary)); }
}
function bindArg(v) {
  if (!v || typeof v !== 'object') return v;
  if (v.cx !== undefined && v.id !== undefined) return World.towns.find(t=>t.id===v.id) || v;
  if (v.island && v.sp) return [...World.legends.values()].find(l=>l.sp===v.sp) || v;
  if (v.door && v.kind) return World.buildings.find(b=>b.x===v.x&&b.y===v.y) || v;
  if (v.id && v.n) return [...World.landmarks.values()].find(l=>l.id===v.id) || v;
  if (v.cls !== undefined && v.x !== undefined) return World.trainers.get(`${v.x},${v.y}`) || v;
  return v;
}
// Rebind saved references to the live state objects used by the resumed event.
// This also preserves local party arrays in multi-battle challenges.
function graftState(saved, root = { state: saved }) {
  const aliases = new Map();
  function match(source, target) {
    if (!source || !target || typeof source !== 'object' || typeof target !== 'object' || aliases.has(source)) return;
    if (Array.isArray(source) !== Array.isArray(target)) return;
    aliases.set(source,target);
    for (const key of Object.keys(source)) match(source[key],target[key]);
  }
  match(saved,G.state);
  const seen = new Map();
  function rewrite(source) {
    if (!source || typeof source !== 'object') return source;
    if (seen.has(source)) return seen.get(source);
    const out = aliases.get(source) || (source instanceof Map ? new Map() : source instanceof Set ? new Set() : Array.isArray(source) ? [] : {});
    seen.set(source,out);
    if (source instanceof Map) { const entries=[...source];out.clear();for(const [k,v] of entries)out.set(rewrite(k),rewrite(v)); }
    else if (source instanceof Set) { const values=[...source];out.clear();for(const value of values)out.add(rewrite(value)); }
    else if (Array.isArray(source)) { const values=[...source];out.length=0;for(const value of values)out.push(rewrite(value)); }
    else { const entries=Object.entries(source);for(const key of Object.keys(out))delete out[key];for(const [key,value] of entries)out[key]=rewrite(value); }
    return out;
  }
  return rewrite(root);
}

export function installQuickStates(objects) {
  Object.assign(namespaces,objects);
  const gameEntries = new Set(['interact','touchEvent','enterBuilding','labTalk','momTalk','trainerBattle','gymChallenge','leagueChallenge','eliteBattle','championBattle']);
  const roomEntries = new Set(['interact','tryGoal','goRoom']);
  for (const [ns,obj] of Object.entries(objects)) for (const [name,fn] of Object.entries(obj)) {
    if (ns === 'Game' && !gameEntries.has(name) || ns === 'Interior' && !roomEntries.has(name)) continue;
    if (typeof fn!=='function'||fn.constructor.name!=='AsyncFunction'||['flow','battle','quickSlot','newGame','title','mainMenu','partyMenu','dexMenu','mapMenu','pcMenu','shopMenu','optionMenu','resumeQuickState'].includes(name)) continue;
    entryMethods.set(ns + '.' + name, fn);
    obj[name]=async function(...args) {
      if(entry||!G.state)return fn.apply(this,args);
      entry={ns,name,args:unpackGraph(packGraph(args)),base:clone(G.state),room:unpackGraph(packGraph(roomState())),choices:[],history:[]};
      try{return await fn.apply(this,args);}
      finally{entry=null;if(pending!==null&&G.mode==='world'){const n=pending;pending=null;store(n,snapshot());}}
    };
  }
  const save=Game.save, jingle=Sound.jingle;
  Game.save=function(...args){return replay?.active ? true : save.apply(this,args);};
  Sound.jingle=function(...args){return replay?.active ? Promise.resolve() : jingle.apply(this,args);};
  const choose=UI.choose, say=UI.say;
  UI.say=function(...args){return replay?.active ? Promise.resolve() : say.apply(this,args);};
  UI.choose=async function(...args){
    if(replay?.active){if(replay.choice>=entry.choices.length)throw Error('即時存檔的對話紀錄不完整');return entry.choices[replay.choice++];}
    const value=await choose.apply(this,args);if(entry)entry.choices.push(value);return value;
  };
  const battle=Game.battle;
  Game.battle=async function(opts){
    if(replay?.active){
      const index=replay.battle++;
      if(index<entry.history.length){const h=entry.history[index];graftState(clone(h.state));return h.result;}
      let root=replay.root;replay.active=false;entry.choices=entry.choices.slice(0,replay.choice);
      root=graftState(root.state,root);G.tower=root.tower;await restoreRoom(root.room);
      opts={wild:root.battle.wildMon,trainer:root.battle.trainer,biome:root.battle.biome,double:root.battle.doubles,noBlackout:root.battle.noBlackout,_quickRoot:root};
    }
    const result=await battle.call(this,opts);
    if(entry)entry.history.push({result,state:clone(G.state)});
    else if(pending!==null&&G.mode==='world'){const n=pending;pending=null;store(n,snapshot());}
    return result;
  };
  Game.restoreQuickBattle=(b,root)=>{
    Object.assign(b,root.battle);b._benchVol=new WeakMap(root.bench.filter(([,v])=>v));
    for(const [m,v] of root.overrides)if(v)Mon.ovr.set(m,v);
    for(const [m,v] of root.cursors || [])if(v!==undefined)Battle.moveCursor(m,v);
    b.turn=Math.max(0,b.turn-1);b.quickReady=false;
  };
  Game.quickBoundary=quickBoundary;
  Game.readQuickState=async function(n){
    if(!Number.isInteger(n)||n<1||n>12)return false;
    let raw;try{raw=localStorage.getItem(Game.slotKey(n));}catch{}
    let data;try{data=JSON.parse(raw);}catch{}
    if(!data){UI.banner(`第 ${n} 格沒有可讀取的即時存檔`);return false;}
    try{
      const root=data.quickVersion===2?unpackGraph(data.graph):{state:data};
      const valid=Game.parseSave(JSON.stringify(root.entry?.base||root.state));
      if(!valid.ok)throw Error(valid.error);
      if(root.entry&&!entryMethods.has(root.entry.ns+'.'+root.entry.name))throw Error('找不到存檔中的劇情入口');
      if(root.battle&&!Game.parseSave(JSON.stringify({...root.state,party:root.battle.foeParty})).ok)throw Error('戰鬥隊伍資料無效');
      sessionStorage.setItem(TRANSFER,JSON.stringify({key:Account.saveKey(),n,data}));
      G.mode='loading';G.busy=true;location.reload();return true;
    }catch(error){UI.banner(`即時存檔無法讀取：${error.message}`);return false;}
  };
  Game.writeQuickState=function(n){
    if(!Number.isInteger(n)||n<1||n>12)return false;
    if(!G.state){UI.banner('開始遊戲後才能即時存檔');return false;}
    if(G.mode==='battle'&&G.battle){
      const b=G.battle;
      if(b.quickReady&&b._quickBoundary)return store(n,JSON.parse(b._quickBoundary));
      pending=n;UI.banner(`本回合結算完成後，將存入第 ${n} 格`);return true;
    }
    if(entry&&(G.busy||UI.active())){pending=n;UI.banner(`目前事件結束後，將存入第 ${n} 格`);return true;}
    return store(n,snapshot());
  };
  Game.resumeQuickState=function(){
    let transfer;try{transfer=JSON.parse(sessionStorage.getItem(TRANSFER));sessionStorage.removeItem(TRANSFER);}catch{}
    if(!transfer||transfer.key!==Account.saveKey())return false;
    let root, valid;
    try { root=transfer.data.quickVersion===2?unpackGraph(transfer.data.graph):{state:transfer.data};valid=Game.parseSave(JSON.stringify(root.entry?.base||root.state)); } catch { return false; }
    if(!valid.ok || root.entry&&!entryMethods.has(root.entry.ns+'.'+root.entry.name))return false;
    document.getElementById('title').classList.add('hidden');
    Game.start(valid.state);G.tower=root.tower;
    void (async()=>{
      try{
        if(root.battle&&root.entry){
          entry=root.entry;replay={active:true,choice:0,battle:0,root};
          await restoreRoom(entry.room);G.busy=true;
          const {ns,name,args}=entry;await entryMethods.get(ns+'.'+name).apply(namespaces[ns],args.map(bindArg));
        }else{
          await restoreRoom(root.room);
          if(root.battle){const restored=graftState(root.state,root);G.busy=true;await Game.battle({wild:restored.battle.wildMon,trainer:restored.battle.trainer,biome:restored.battle.biome,double:restored.battle.doubles,noBlackout:restored.battle.noBlackout,_quickRoot:restored});}
        }
      }catch(error){console.error('讀取即時存檔失敗',error);UI.banner('即時存檔還原失敗，請讀取其他存檔');}
      finally{entry=null;replay=null;G.busy=false;}
    })();
    UI.banner(`已讀取第 ${transfer.n} 格的即時存檔`);return true;
  };
}
