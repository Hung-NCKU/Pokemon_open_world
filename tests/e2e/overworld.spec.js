import { test, expect } from '@playwright/test';

test('地形快取沿用畫面，改地形與換世界立即重繪；快速踏步不會跳格', async ({ page }) => {
  await page.goto('/');
  const result = await page.evaluate(async () => {
    const { TerrainView } = await import('/js/terrain_view.js');
    const { motionPose } = await import('/js/overworld_motion.js');
    const view = new TerrainView(), canvas = document.createElement('canvas'); canvas.width=96;canvas.height=96;
    const ctx=canvas.getContext('2d');let draws=0;
    const world={ tiles: [], revision:0, tile:()=>0, drawTile(g,t,x,y,px,py){draws++;g.fillStyle=this.revision?'#00ff00':'#ff0000';g.fillRect(px,py,48,48);} };
    const options={x0:0,y0:0,width:1,height:1,tileSize:48,ox:0,oy:0,frame:0,assets:true,onError:e=>{throw e;}};
    view.draw(ctx,world,options);const first=draws;
    view.draw(ctx,world,{...options,ox:12});const reuse=draws;
    world.revision++;view.draw(ctx,world,options);const changed=draws;
    const color=[...ctx.getImageData(2,2,1,1).data];
    world.tiles=[];view.draw(ctx,world,options);const regenerated=draws;
    view.draw(ctx,world,{...options,frame:1});const animated=draws;
    const w={px:0,py:0,x:1,y:0,moved:100,moveMs:180,dir:'right'};
    return {first,reuse,changed,regenerated,animated,color,half:motionPose(w,190),end:motionPose(w,280)};
  });
  expect(result.first).toBe(4);expect(result.reuse).toBe(4);expect(result.changed).toBe(8);
  expect(result.regenerated).toBe(12);expect(result.animated).toBe(16);expect(result.color).toEqual([0,255,0,255]);
  expect(result.half.x).toBe(.5);expect(result.half.moving).toBe(true);expect(result.end.x).toBe(1);expect(result.end.moving).toBe(false);expect(result.end.frame).toBe(0);
});

test('本站寶可夢圖片與完整選單圖集，跨世代隊伍與箱子不依賴遠端圖示', async ({ page }) => {
  await page.goto('/tests/ui_tour.html#world');await page.waitForFunction(()=>document.title==='READY world');
  test.skip(!await page.evaluate(()=>!!window.GEN3?.battleSprites), '需要本機建置素材');
  const result=await page.evaluate(async()=>{
    const {monIcon}=await import('/js/menus.js');
    const ids=[1,25,386,387,807,808,1025];
    const urls=ids.map(id=>Mon.sprite(id));
    const icons=ids.map(id=>monIcon(id,false));
    const decoded=await Promise.all(urls.map(url=>new Promise(resolve=>{const img=new Image();img.onload=()=>resolve(img.naturalWidth>0);img.onerror=()=>resolve(false);img.src=url;})));
    return {urls,icons,decoded};
  });
  expect(result.urls.every(url=>!url.startsWith('http'))).toBe(true);
  expect(result.icons.every(html=>html.includes('mon_icons.png')&&!html.includes('githubusercontent'))).toBe(true);
  expect(result.decoded.every(Boolean)).toBe(true);
});

test('電腦箱子與隊伍：封鎖外站圖片仍能顯示跨世代圖示與預覽', async ({ page }) => {
  await page.route('https://raw.githubusercontent.com/**', route => route.abort());
  await page.goto('/tests/ui_tour.html#world'); await page.waitForFunction(() => document.title === 'READY world');
  test.skip(!await page.evaluate(() => window.GEN3?.ui?.icons === 1025), '需要完整本機圖集');
  await page.evaluate(() => {
    const mons = [387, 650, 807, 808, 906, 1025].map(sp => Mon.create(sp, 20));
    G.state.party = mons; G.state.box = mons.map(m => ({ ...m }));
    StorageUI.open();
  });
  await expect(page.locator('#storage .st-cell .micon')).toHaveCount(6);
  await page.waitForFunction(() => { const img = document.querySelector('#storage .st-pic img'); return img?.complete && img.naturalWidth > 0; });
  const sources = await page.locator('#storage .st-cell .micon').evaluateAll(els => els.map(el => getComputedStyle(el).backgroundImage));
  expect(sources.every(src => src.includes('mon_icons.png') && !src.includes('githubusercontent'))).toBe(true);
  await page.keyboard.press('x');
  await page.evaluate(() => { PartyUI.pick(); });
  await expect(page.locator('#party .micon.g3')).toHaveCount(6);
});
