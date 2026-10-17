/**
 * Shared data contracts for gradual type checking without changing the save format.
 * @typedef {{id: number, pp: number}} MoveSlot
 * @typedef {{sp: number, lv: number, hp: number, iv: number[], ev: number[], nat: number, moves: MoveSlot[], uid?: string}} Pokemon
 * @typedef {{v: number, seed: number, region: string, name: string, x: number, y: number, party: Pokemon[], box: Pokemon[], savedAt?: string, syncRevision?: string}} SaveState
 * @typedef {{type: 'move', idx: number, tera?: boolean, mega?: boolean, z?: boolean, dmax?: boolean} | {type: 'switch', idx: number} | {type: 'run'}} BattleAction
 */
export {};
