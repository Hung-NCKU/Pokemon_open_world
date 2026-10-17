// Sanctuary on the small island north of Alola. Applied after the original
// generation pass so existing saves keep their towns, quests and RNG layout.
import { T } from './core.js';
import { World } from './world.js';
import { Mon } from './mon.js';
import { U } from './util.js';
const ISLAND = Object.freeze({ id: 'legend-island', name: '傳說之島', cx: 820, cy: 205,
  rx: 34, ry: 22, landX: 820, landY: 220, region: 'alola', alwaysFly: true });
const insideIsland = (x, y) => ((x - ISLAND.cx) / ISLAND.rx) ** 2 + ((y - ISLAND.cy) / ISLAND.ry) ** 2 <= 1;

World.legendIsland = ISLAND;
World.islandAt = (x, y) => insideIsland(x, y) ? ISLAND : null;
World.flyDestinations = state => [...World.towns.filter(t => state.visited[t.id]), ISLAND];
World.placeLegendIsland = function () {
  for (let dy = -ISLAND.ry - 3; dy <= ISLAND.ry + 3; dy++) for (let dx = -ISLAND.rx - 3; dx <= ISLAND.rx + 3; dx++) {
    const x = ISLAND.cx + dx, y = ISLAND.cy + dy;
    if (!insideIsland(x, y) && (dx / (ISLAND.rx + 3)) ** 2 + (dy / (ISLAND.ry + 3)) ** 2 <= 1
      && !this.townAt(x, y) && !this.landmarks.has(`${x},${y}`)) this.set(x, y, T.WATER);
  }
  const old = new Map([...this.legends.values()].map(l => [l.sp, l]));
  // This patch is entirely offshore; no town, building or quest landmark moves.
  for (let dy = -ISLAND.ry; dy <= ISLAND.ry; dy++) for (let dx = -ISLAND.rx; dx <= ISLAND.rx; dx++) {
    const x = ISLAND.cx + dx, y = ISLAND.cy + dy;
    if (!insideIsland(x, y)) continue;
    const edge = !insideIsland(x + 2, y) || !insideIsland(x - 2, y) || !insideIsland(x, y + 2) || !insideIsland(x, y - 2);
    this.set(x, y, edge ? T.SAND : T.GRASS);
  }
  const species = Object.values(POKEDEX).filter(s => s.lg).sort((a, b) => a.id - b.id);
  this.legends = new Map();
  for (const [i, s] of species.entries()) {
    const x = ISLAND.cx - 26 + (i % 14) * 4, y = ISLAND.cy - 12 + Math.floor(i / 14) * 4;
    const previous = old.get(s.id);
    const [, hi] = this.regionBand(previous?.region || ISLAND.region);
    const lv = previous?.lv || U.clamp(Math.max(50, hi + 5) + (Mon.bst(s.id) >= 670 ? 10 : 0), 50, 90);
    this.set(x, y, T.FLOWER);
    this.legends.set(`${x},${y}`, { ...previous, sp: s.id, x, y, lv, region: previous?.region || ISLAND.region, island: true });
  }
  // Walkways run between the rows, leaving every encounter approachable.
  for (let y = ISLAND.cy - 10; y <= ISLAND.cy + 14; y += 4)
    for (let x = ISLAND.cx - 27; x <= ISLAND.cx + 27; x++) this.set(x, y, T.PATH);
  for (let y = ISLAND.cy - 15; y <= ISLAND.landY; y++) this.set(ISLAND.cx, y, T.PATH);
  this.set(ISLAND.landX, ISLAND.landY, T.PATH);
};
const generate = World.generate;
World.generate = function (...args) {
  const result = generate.apply(this, args);
  this.placeLegendIsland();
  return result;
};
export { ISLAND, insideIsland };
