import type { NpcDef } from "./scenes/TownScene";
import type { DroppedLoot } from "./scenes/WorldScene";

export interface SavedWorld {
  id: string;
  name: string;
  seed: number;
  createdAt: string;
  lastPlayed: string;
  // Player
  playerHp: number;
  playerMaxHp: number;
  playerSp: number;
  playerBaseSp: number;
  playerHunger: number;
  playerBaseAttack: number;
  playerBaseDefense: number;
  playerSkills: string[]; // skill names
  // Equipment IDs
  weaponId: string | null;
  armorId: string | null;
  accessoryId: string | null;
  // Equipment inventory
  ownedEquipmentIds: string[];
  // Materials
  materials: Record<string, number>;
  // Companion
  hasCompanion: boolean;
  // Recruited NPCs
  recruitedNpcs: SerializedNpc[];
  // World position
  worldX: number;
  worldY: number;
  // Cleared dungeons
  clearedDungeons: string[];
  // Dropped loot from deaths
  droppedLoots?: DroppedLoot[];
}

export interface SerializedNpc {
  char: string;
  name: string;
  color: string;
  dialog: string[];
  crafterId?: string;
}

const WORLDS_INDEX_KEY = "isekai_worlds";
const MAX_WORLDS = 5;

export function listWorlds(): SavedWorld[] {
  try {
    const raw = localStorage.getItem(WORLDS_INDEX_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as SavedWorld[];
  } catch {
    return [];
  }
}

export function saveWorld(world: SavedWorld): void {
  try {
    const worlds = listWorlds();
    const idx = worlds.findIndex((w) => w.id === world.id);
    world.lastPlayed = new Date().toISOString();
    if (idx >= 0) {
      worlds[idx] = world;
    } else {
      worlds.push(world);
    }
    localStorage.setItem(WORLDS_INDEX_KEY, JSON.stringify(worlds));
  } catch {
    // Ignore storage errors
  }
}

export function deleteWorld(worldId: string): void {
  try {
    const worlds = listWorlds().filter((w) => w.id !== worldId);
    localStorage.setItem(WORLDS_INDEX_KEY, JSON.stringify(worlds));
  } catch {
    // Ignore
  }
}

export function canCreateWorld(): boolean {
  return listWorlds().length < MAX_WORLDS;
}

export function generateWorldId(): string {
  return `w_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
}

export function serializeNpc(npc: NpcDef): SerializedNpc {
  return {
    char: npc.char,
    name: npc.name,
    color: npc.color,
    dialog: npc.dialog,
    crafterId: npc.crafterId,
  };
}

export function deserializeNpc(data: SerializedNpc): NpcDef {
  return {
    char: data.char,
    name: data.name,
    color: data.color,
    x: 0,
    y: 0,
    dialog: data.dialog,
    crafterId: data.crafterId,
  };
}
