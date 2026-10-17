import { chromium } from '@playwright/test';
import { writeFileSync } from 'node:fs';
const browser=await chromium.launch({channel:'chrome'});
const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
await page.goto('http://localhost:4173/tests/ui_tour.html?screen=world#world');
await page.waitForFunction(()=>document.title.startsWith('READY'),null,{timeout:120000});
await page.waitForFunction(()=>!Gen3.on||Gen3.ready());
const cdp=await page.context().newCDPSession(page);await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});
const result=await page.evaluate(()=>{
 const samples=[];const x=G.state.x,y=G.state.y;
 for(let warm=0;warm<30;warm++)Game.render();
 for(let i=0;i<180;i++) {G.move={fx:x,fy:y,tx:x+1,ty:y,t:(i%30)/30*260,dur:260};const start=performance.now();Game.render();samples.push(performance.now()-start);}
 G.move=null;samples.sort((a,b)=>a-b);return {profile:'Chrome mobile 390x844 CPU 4x, 180 moving-camera renders',medianMs:samples[90],p95Ms:samples[171],maxMs:samples[179]};
});
console.log(JSON.stringify(result));if(process.argv[2])writeFileSync(process.argv[2],JSON.stringify(result,null,2));await browser.close();
