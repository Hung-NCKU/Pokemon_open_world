import { test, expect } from '@playwright/test';
test('戰鬥擴充依明確優先順序執行，保留引擎結果且不重複安裝', async ({ page }) => {
  await page.goto('/'); await page.waitForFunction(() => !!window.BattleHooks);
  const result = await page.evaluate(async () => {
    const events = [], proto = { async doTurn(action) { events.push('engine'); return action; } };
    BattleHooks.register('doTurn', 'test-a', { priority: -10, before() { events.push('before'); }, after() { events.push('after'); } });
    // Use a separate operation so this test doesn't need a complete battle fixture for built-in hooks.
    const { BattleHooks: clean } = await import('/js/battle_hooks.js?isolated');
    clean.register('doTurn', 'z', { priority: 2, before() { events.push('z'); } });
    clean.register('doTurn', 'a', { priority: 1, before() { events.push('a'); }, after() { events.push('done'); } });
    clean.install(proto); clean.install(proto);
    const value = await proto.doTurn('win');
    return { value, events, registered: BattleHooks.list() };
  });
  expect(result.value).toBe('win'); expect(result.events).toEqual(['a', 'z', 'engine', 'done']);
  expect(Object.keys(result.registered)).toEqual(expect.arrayContaining(['doTurn', 'runMove', 'resolveMove', 'endOfTurn', 'onSwitchOut', 'onEntry']));
});
