// Fresh browser contexts; consistent network/CPU settings for before/after comparisons.
// node tools/perf_check.mjs http://localhost:8080/ [output.json]
import { chromium } from '@playwright/test';
import { writeFileSync } from 'node:fs';
const url = process.argv[2] || 'http://localhost:8080/';
const browser = await chromium.launch({ channel: process.env.PW_CHANNEL || 'chrome' });
const runs = [];
try {
  for (let i = 0; i < 3; i++) {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, serviceWorkers: 'block' });
    const page = await context.newPage(), cdp = await context.newCDPSession(page);
    await cdp.send('Network.enable');
    await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 40, downloadThroughput: 1250000, uploadThroughput: 625000 });
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.Game && window.UI && !document.getElementById('loading'));
    runs.push(await page.evaluate(() => ({ readyMs: Math.round(performance.now()),
      resources: performance.getEntriesByType('resource').map(r => ({ name: new URL(r.name).pathname, bytes: r.encodedBodySize, ms: Math.round(r.duration) })) })));
    await context.close();
  }
} finally { await browser.close(); }
const result = { url, profile: '390x844 touch, CPU 4x, 40ms RTT, 10Mbps, fresh cache, 3 runs',
  medianReadyMs: runs.map(r => r.readyMs).sort((a,b) => a-b)[1], runs };
if (process.argv[3]) writeFileSync(process.argv[3], JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));
