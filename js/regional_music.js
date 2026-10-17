import { G } from './core.js';
import { World } from './world.js';
import { U } from './util.js';
const GENERATIONS = ['kanto','johto','hoenn','sinnoh','unova','kalos','alola','galar','paldea'];
const ALIASES = { town2:'town', mart:'center', lab:'home', desert:'route3', snow:'route3', victory_league:'victory_gym' };
export function regionalTrack(name) {
  const library = window.GEN3?.regionalMusic;
  if (!library || !G.state || name === 'title' || name === 'evolution') return null;
  let region = G.room?.b?.town?.region || World.regionAt(G.state.x, G.state.y);
  if (/^(battle_|victory_)/.test(name) && G.battle?.wildMon && POKEDEX[G.battle.wildMon.sp]?.lg) {
    region = GENERATIONS[POKEDEX[G.battle.wildMon.sp].g - 1] || region;
  }
  let role = name;
  const legend = name === 'battle_legend' && G.battle?.wildMon?.sp;
  if (legend && library.regions[region]?.['battle_legend_' + legend]) role = 'battle_legend_' + legend;
  if (!/^(battle_|victory_)/.test(name) && World.islandAt?.(G.state.x, G.state.y) && !G.room) {
    region = 'johto'; role = 'sanctuary';
  }
  const town = !G.room && G.state && World.townAt(G.state.x,G.state.y);
  if (town?.kind === 'gym' && ['town','town2','city','city2'].includes(name) && library.regions[region]?.['gymtown_' + town.gym]) role = 'gymtown_' + town.gym;
  const choices = library.regions[region];
  if (!choices) return null;
  const base = choices[role] ? role : ALIASES[role] || role;
  const id = U.isNight() && choices[base + '_night'] || choices[base] || choices[/^victory_/.test(base) ? 'victory_trainer' : /^battle_/.test(base) ? 'battle_trainer' : 'route'];
  const track = library.tracks[id];
  return track ? { ...track, id, region, role } : null;
}
