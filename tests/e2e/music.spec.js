import { test, expect } from '@playwright/test';
test('九地區 BGM 配曲與傳說原生世代配曲',async({page})=>{
 await page.goto('/tests/ui_tour.html#world');await page.waitForFunction(()=>document.title==='READY world');
 test.skip(!await page.evaluate(()=>!!window.GEN3?.regionalMusic),'需要已建置的音樂');
 const result=await page.evaluate(async()=>{
  const {regionalTrack}=await import('/js/regional_music.js');G.room=null;G.battle=null;
  const rows=[];for(const region of REGION_KEYS){const town=World.towns.find(t=>t.region===region&&t.kind==='home');G.state.x=town.cx;G.state.y=town.cy;const home=regionalTrack('home'),wild=regionalTrack('battle_wild');rows.push({region,home:home.title,wild:wild.title,loop:home.loopStart>=0&&home.loopEnd>home.loopStart});}
  Game.flyTo(World.legendIsland);G.battle={wildMon:Mon.create(150,70)};const mewtwo=regionalTrack('battle_legend').title;G.battle={wildMon:Mon.create(382,70)};const kyogre=regionalTrack('battle_legend').title;return{rows,mewtwo,kyogre};
 });
 expect(result.rows).toHaveLength(9);expect(result.rows.every(r=>r.loop)).toBe(true);expect(new Set(result.rows.map(r=>r.home)).size).toBe(9);expect(result.mewtwo).toContain('FRLG');expect(result.kyogre).toContain('RSE');
});
test('BGM 按需載入且可解碼；音量與停播仍生效',async({page})=>{
 const downloads=[];page.on('request',r=>{if(r.url().includes('/assets/bgm/')&&r.url().endsWith('.ogg'))downloads.push(r.url());});
 await page.goto('/');await page.waitForFunction(()=>window.Game&&!document.getElementById('loading'));expect(downloads).toHaveLength(0);
 test.skip(!await page.evaluate(()=>!!window.GEN3?.regionalMusic),'需要已建置的音樂');
 await page.evaluate(()=>{const s=Game.newState('音樂測試','johto',155);s.party=[Mon.create(155,20)];Game.start(s,true);Sound.init();Sound.play('battle_wild');});
 await page.waitForFunction(()=>Sound.track&&performance.getEntriesByType('resource').some(r=>r.name.includes('/assets/bgm/')&&r.responseEnd>0));
 await page.waitForFunction(()=>!!Sound.playback);
 expect(await page.evaluate(()=>Sound.playback.loopEnd>Sound.playback.loopStart)).toBe(true);
 expect(downloads.length).toBeLessThanOrEqual(2);
 await page.evaluate(()=>{G.settings.musicVol=0;Sound.applyVolume();Sound.stop();});expect(await page.evaluate(()=>Sound.current)).toBe(null);
});
