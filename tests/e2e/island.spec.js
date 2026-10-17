import { test, expect } from '@playwright/test';
test('傳說之島：全部物種、舊進度、可步行接近與直接飛抵', async ({ page }) => {
 await page.goto('/tests/ui_tour.html#world');await page.waitForFunction(()=>document.title==='READY world');
 const result=await page.evaluate(()=>{
  const island=World.legendIsland, all=Object.values(POKEDEX).filter(s=>s.lg).map(s=>s.id);
  const legends=[...World.legends.values()];
  const occupied=new Set(legends.map(l=>`${l.x},${l.y}`));
  const seen=new Set(),queue=[[island.landX,island.landY]];
  for(let i=0;i<queue.length;i++){const [x,y]=queue[i],key=`${x},${y}`;if(seen.has(key)||!World.islandAt(x,y)||occupied.has(key)||[T.WATER,T.DEEP,T.MOUNT,T.TREE,T.BLDG].includes(World.tile(x,y)))continue;seen.add(key);for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]])queue.push([x+dx,y+dy]);}
  const reachable=legends.every(l=>[[1,0],[-1,0],[0,1],[0,-1]].some(([dx,dy])=>seen.has(`${l.x+dx},${l.y+dy}`)));
  G.state.legendsCaught={151:1};G.state.legendsGone={150:1};const mew=legends.find(l=>l.sp===151),mewtwo=legends.find(l=>l.sp===150);
  const preserved=!World.legendAt(mew.x,mew.y)&&!World.legendAt(mewtwo.x,mewtwo.y);
  Game.flyTo(island);
  return {all,placed:legends.map(l=>l.sp),inside:legends.every(l=>!!World.islandAt(l.x,l.y)),reachable,preserved,landing:[G.state.x,G.state.y],expected:[island.landX,island.landY],available:World.flyDestinations({...G.state,visited:{}}).some(t=>t.id===island.id),townCollision:World.towns.some(t=>World.islandAt(t.cx,t.cy))};
 });
 expect(result.placed).toEqual(result.all);expect(result.inside).toBe(true);expect(result.reachable).toBe(true);expect(result.preserved).toBe(true);expect(result.landing).toEqual(result.expected);expect(result.available).toBe(true);expect(result.townCollision).toBe(false);
});

test('地圖確認可飛往尚未造訪的傳說之島', async ({ page }) => {
 await page.goto('/tests/ui_tour.html#world');await page.waitForFunction(()=>document.title==='READY world');
 await page.evaluate(()=>{G.state.x=World.legendIsland.cx;G.state.y=World.legendIsland.cy;G.state.visited={};window.islandDestination=null;MapUI.show({canFly:true}).then(t=>{window.islandDestination=t;if(t)Game.flyTo(t);});});
 await page.keyboard.press('z');await expect(page.locator('#choices')).toBeVisible();await page.keyboard.press('z');
 await page.waitForFunction(()=>window.islandDestination?.id==='legend-island');
 expect(await page.evaluate(()=>[G.state.x,G.state.y])).toEqual([820,220]);
});
