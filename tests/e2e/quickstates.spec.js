import { test, expect } from '@playwright/test';
test.setTimeout(90000);
async function start(page){
 await page.goto('/');await page.waitForFunction(()=>window.Game&&!document.getElementById('loading'));
 await page.evaluate(()=>{const s=Game.newState('即時測試','kanto',1);s.party=[Mon.create(1,50),Mon.create(25,40)];document.getElementById('title').classList.add('hidden');Game.start(s,true);G.settings.textSpeed=0;G.settings.battleAuto=0;});
}
test('戰鬥即時存讀：重開後保留對手、HP、PP、能力階級與選單游標',async({page})=>{
 await start(page);
 await page.evaluate(()=>{U.sleep=()=>Promise.resolve();UI.say=async()=>{};Battle.prototype.wildIntro=async()=>{};Battle.prototype.sendOut=async()=>{};Game.battle({wild:Mon.create(129,40)});});
 await page.waitForFunction(()=>G.battle?.quickReady);
 await page.evaluate(()=>{const b=G.battle;b.me.hp=77;b.me.moves[0].pp=3;b.foe.hp=12;b.vMe.stg.atk=2;b.field.weather='raindance';b.field.weatherT=3;b.lastAction=2;Game.quickBoundary(b);Game.quickSlot(1,true);});
 await page.evaluate(()=>{G.battle.me.hp=1;G.battle.foe.hp=1;G.battle.vMe.stg.atk=-3;});
 await Promise.all([page.waitForEvent('load'),page.evaluate(()=>{Game.quickSlot(1,false);})]);
 await page.waitForFunction(()=>G.mode==='battle'&&G.battle?.quickReady);
 const result=await page.evaluate(()=>({hp:G.battle.me.hp,pp:G.battle.me.moves[0].pp,foe:G.battle.foe.hp,stage:G.battle.vMe.stg.atk,weather:G.battle.field.weather,menu:G.battle.lastAction,turn:G.battle.turn}));
 expect(result).toEqual({hp:77,pp:3,foe:12,stage:2,weather:'raindance',menu:2,turn:1});
});
test('讀取空格不會中斷目前場景；世界存檔能從戰鬥中讀取',async({page})=>{
 await start(page);await page.evaluate(()=>{Game.quickSlot(2,true);G.mode='battle';G.busy=true;});
 expect(await page.evaluate(()=>Game.quickSlot(12,false))).toBe(false);
 expect(await page.evaluate(()=>G.mode)).toBe('battle');
 await Promise.all([page.waitForEvent('load'),page.evaluate(()=>{Game.quickSlot(2,false);})]);
 await page.waitForFunction(()=>G.mode==='world'&&G.state?.name==='即時測試');
});
test('傳說必須確認挑戰；走向牠不會開啟對話',async({page})=>{
 await start(page);
 const result=await page.evaluate(async()=>{
  Game.flyTo(World.legendIsland);const l=[...World.legends.values()].find(l=>!l.lm);G.state.x=l.x;G.state.y=l.y+1;G.state.dir='up';G.busy=false;
  let battles=0,asked=0;const oldBattle=Game.battle,choose=UI.choose,say=UI.say;Game.battle=async()=>{battles++;return'run';};UI.say=async()=>{};UI.choose=async()=>{asked++;return 1;};
  G.keys.add('ArrowUp');Game.update(16);G.keys.clear();const bumped={battles,asked};await Story.legend(l);const cancelled={battles,asked};UI.choose=async()=>0;await Story.legend(l);Game.battle=oldBattle;UI.choose=choose;UI.say=say;return {bumped,cancelled,battles};
 });
 expect(result.bumped).toEqual({battles:0,asked:0});expect(result.cancelled).toEqual({battles:0,asked:1});expect(result.battles).toBe(1);
});
test('傳說戰鬥讀檔後仍可結算消失紀錄，不會遺失劇情後續',async({page})=>{
 await start(page);
 await page.evaluate(()=>{Game.flyTo(World.legendIsland);U.sleep=()=>Promise.resolve();UI.say=async()=>{};Battle.prototype.wildIntro=async()=>{};Battle.prototype.sendOut=async()=>{};const l=[...World.legends.values()].find(l=>!l.lm);window.savedLegend=l.sp;Story.legend(l);});
 await expect(page.locator('#choices')).toBeVisible();await page.keyboard.press('z');await page.waitForFunction(()=>G.battle?.quickReady);
 const sp=await page.evaluate(()=>{Game.quickSlot(3,true);return G.battle.wildMon.sp;});
 await Promise.all([page.waitForEvent('load'),page.evaluate(()=>{Game.quickSlot(3,false);})]);await page.waitForFunction(()=>G.battle?.quickReady);
 expect(await page.evaluate(()=>G.battle.wildMon.sp)).toBe(sp);
 await page.evaluate(()=>{UI.say=async()=>{};U.sleep=()=>Promise.resolve();G.battle.doTurn=async()=> 'win';});
 await page.keyboard.press('z');await expect(page.locator('#choices')).toHaveClass(/move-menu/);await page.keyboard.press('z');
 await page.waitForFunction(sp=>!!G.state.legendsGone?.[sp],sp);expect(await page.evaluate(()=>G.mode)).toBe('world');
});
test('雙打即時存讀保留場上位置、每隻寶可夢狀態及物件參照',async({page})=>{
 await start(page);
 await page.evaluate(()=>{UI.say=async()=>{};U.sleep=()=>Promise.resolve();Battle.prototype.trainerIntro=async()=>{};Battle.prototype.trainerLeave=async()=>{};Battle.prototype.sendOut=async()=>{};Game.battle({double:true,trainer:{title:'測試',name:'雙打',party:[Mon.create(129,30),Mon.create(19,30)],kind:'trainer',money:1}});});
 await page.waitForFunction(()=>G.battle?.doubles&&G.battle.quickReady);
 await page.evaluate(()=>{const b=G.battle;b.volOf(G.party[1]).stg.def=3;b.lastAction=1;Game.quickBoundary(b);Game.quickSlot(4,true);});
 await Promise.all([page.waitForEvent('load'),page.evaluate(()=>{Game.quickSlot(4,false);})]);await page.waitForFunction(()=>G.battle?.doubles&&G.battle.quickReady);
 expect(await page.evaluate(()=>({double:G.battle instanceof DoubleBattle,def:G.battle.volOf(G.party[1]).stg.def,slots:G.battle.mySlots,foes:G.battle.foeSlots}))).toEqual({double:true,def:3,slots:[0,1],foes:[0,1]});
});
test('主選單四項都記住上一回，新的戰鬥從戰鬥開始',async({page})=>{
 await start(page);
 const result=await page.evaluate(async()=>{
  const native=UI.choose,bag=Game.bagMenu,party=Game.partyMenu;
  Game.bagMenu=async()=>({item:'potion',target:0});Game.partyMenu=async()=>1;
  const rows=[];
  for(const command of [0,1,2,3]){
   const b=new Battle({wild:Mon.create(129,20)});b.setup();const starts=[];
   UI.choose=async(options,opts)=>{if(opts.cls==='battle-menu'){starts.push(opts.start);return command;}return 0;};
   await b.chooseAction();await b.chooseAction();rows.push(starts);
  }
  UI.choose=native;Game.bagMenu=bag;Game.partyMenu=party;return rows;
 });
 expect(result).toEqual([[0,0],[0,1],[0,2],[0,3]]);
});
test('動畫期間的存檔等到下一個回合邊界才寫入',async({page})=>{
 await start(page);
 const result=await page.evaluate(async()=>{
  const {unpackGraph}=await import('/js/quick_states.js');const b=new Battle({wild:Mon.create(129,20)});G.battle=b;G.mode='battle';b.quickReady=false;
  await Game.quickSlot(5,true);const before=localStorage.getItem(Game.slotKey(5));b.foe.hp=9;Game.quickBoundary(b);
  const after=unpackGraph(JSON.parse(localStorage.getItem(Game.slotKey(5))).graph);return {before,after:after.battle.foeParty[0].hp,same:after.battle.wildMon===after.battle.foeParty[0]};
 });
 expect(result).toEqual({before:null,after:9,same:true});
});
test('對戰塔讀檔後結算 BP 並恢復原隊伍，不遺失連戰流程',async({page})=>{
 await start(page);
 const original=await page.evaluate(()=>{G.state.party.push(Mon.create(7,35));UI.say=async()=>{};U.sleep=()=>Promise.resolve();Battle.prototype.trainerIntro=async()=>{};Battle.prototype.trainerLeave=async()=>{};Battle.prototype.sendOut=async()=>{};BattleTower.challenge();return G.party.map(m=>({uid:m.uid,lv:m.lv}));});
 for(let i=0;i<3;i++){await expect(page.locator('#choices .choice:not(.dis)').first()).toBeVisible();await page.locator('#choices .choice:not(.dis)').first().click();}
 await page.waitForFunction(()=>G.battle?.quickReady&&!!G.tower);await page.evaluate(()=>{Game.quickSlot(6,true);});
 await Promise.all([page.waitForEvent('load'),page.evaluate(()=>{Game.quickSlot(6,false);})]);await page.waitForFunction(()=>G.battle?.quickReady&&!!G.tower);
 await page.evaluate(()=>{UI.say=async()=>{};U.sleep=()=>Promise.resolve();G.battle.doTurn=async()=> 'win';});await page.keyboard.press('z');await expect(page.locator('#choices')).toHaveClass(/move-menu/);await page.keyboard.press('z');
 await expect(page.locator('#choices')).toContainText('休息');await page.locator('#choices .choice').nth(1).click();await page.waitForFunction(()=>!G.tower&&G.mode==='world');
 expect(await page.evaluate(()=>G.party.map(m=>({uid:m.uid,lv:m.lv})))).toEqual(original);expect(await page.evaluate(()=>G.state.bp)).toBeGreaterThanOrEqual(1);
});
test('聯盟房間戰鬥讀檔後，房間布局與打贏後開門狀態都正確',async({page})=>{
 await start(page);test.skip(!await page.evaluate(()=>!!window.INTERIORS?.league_e1),'需要室內素材');
 await page.evaluate(async()=>{const b=World.buildings.find(b=>b.kind==='league'&&b.town.region==='kanto');await Interior.enter(b);await Interior.goRoom('league_e1',1);const n=G.room.npcs.find(n=>n.role==='elite');G.room.x=n.x;G.room.y=n.y+1;G.room.dir='up';UI.say=async()=>{};U.sleep=()=>Promise.resolve();Battle.prototype.trainerIntro=async()=>{};Battle.prototype.trainerLeave=async()=>{};Battle.prototype.sendOut=async()=>{};Game.interact();});
 await page.waitForFunction(()=>G.battle?.quickReady);await page.evaluate(()=>{Game.quickSlot(7,true);});
 await Promise.all([page.waitForEvent('load'),page.evaluate(()=>{Game.quickSlot(7,false);})]);await page.waitForFunction(()=>G.battle?.quickReady&&G.room?.key==='league_e1');
 expect(await page.evaluate(()=>({layout:G.room.d===INTERIORS.league_e1,e4:G.room.e4,noBack:G.room.noBack}))).toEqual({layout:true,e4:1,noBack:true});
 await page.evaluate(()=>{UI.say=async()=>{};U.sleep=()=>Promise.resolve();G.battle.doTurn=async()=> 'win';});await page.keyboard.press('z');await expect(page.locator('#choices')).toHaveClass(/move-menu/);await page.keyboard.press('z');await page.waitForFunction(()=>G.mode==='world'&&G.room?.cleared===true);
});
