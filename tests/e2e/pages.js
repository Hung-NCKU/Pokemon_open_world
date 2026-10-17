// 共用：打開 tests/ 的測試頁，等頁面把 document.title 設成 PASS／FAIL，再把結果列出來
import { expect } from '@playwright/test';

export async function runPage(page, path, { timeout } = {}) {
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  await page.goto(path);
  // 測試頁中途出錯時會把 EXC 與堆疊寫在 #out（或 body）
  await page.waitForFunction(() => document.title === 'PASS' || document.title === 'FAIL' || /^EXC /.test(((document.getElementById('out') || document.body).innerText || '').trim()), null, { timeout, polling: 1000 });
  const out = await page.evaluate(() => (document.getElementById('out') || document.body).innerText);
  const summary = (out.match(/\d+\/\d+ 通過.*/) || [''])[0];
  const failed = out.split('\n').filter(l => l.startsWith('✘') || l.startsWith('EXC'));
  console.log(`${path}: ${summary}`);
  if (failed.length) console.log(failed.join('\n'));
  expect(errors, `${path} 未捕捉的瀏覽器錯誤`).toEqual([]);
  expect(failed, `${path} 失敗的測試`).toEqual([]);
  expect(await page.title()).toBe('PASS');
  return { summary, errors };
}
