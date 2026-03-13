import * as ROT from "rot-js";
import type { Game } from "./Game";
import { SKILL_DEFS } from "./Skill";
import { MATERIAL_DEFS } from "./Equipment";

export interface ItemDef {
  char: string;
  name: string;
  description: string;
  effect: (game: Game) => void;
}

export const ITEM_DEFS: ItemDef[] = [
  {
    char: "\u2666",
    name: "干し肉",
    description: "満腹+50",
    effect: (game) => {
      game.player.hunger = Math.min(game.player.maxHunger, game.player.hunger + 50);
      game.addMessage("干し肉を食べた！満腹+50");
    },
  },
  {
    char: "!",
    name: "魔法書",
    description: "MP上限+20",
    effect: (game) => {
      game.player.baseSp += 20;
      game.player.sp += 20;
      game.player.recalcStats();
      game.addMessage("魔法書を読んだ！MP上限+20");
    },
  },
  {
    char: "/",
    name: "剣",
    description: "攻撃力+3",
    effect: (game) => {
      game.player.baseAttack += 3;
      game.player.recalcStats();
      game.addMessage("剣を手に入れた！攻撃力+3");
    },
  },
  {
    char: "[",
    name: "鎧",
    description: "防御力+2",
    effect: (game) => {
      game.player.baseDefense += 2;
      game.player.recalcStats();
      game.addMessage("鎧を装備した！防御力+2");
    },
  },
  {
    char: "~",
    name: "エリクサー",
    description: "MP全回復",
    effect: (game) => {
      game.player.sp = game.player.maxSp;
      game.addMessage("エリクサーを飲んだ！MP全回復");
    },
  },
  {
    char: "+",
    name: "回復薬",
    description: "HP+25",
    effect: (game) => {
      game.player.hp = Math.min(game.player.maxHp, game.player.hp + 25);
      game.addMessage("回復薬を飲んだ！HP+25");
    },
  },
  {
    char: "?",
    name: "魔導書",
    description: "ランダムスキル習得",
    effect: (game) => {
      const idx = Math.floor(ROT.RNG.getUniform() * SKILL_DEFS.length);
      game.player.learnSkill(SKILL_DEFS[idx]);
    },
  },
];

export class ItemInstance {
  x: number;
  y: number;
  def: ItemDef;
  picked = false;

  constructor(x: number, y: number, def: ItemDef) {
    this.x = x;
    this.y = y;
    this.def = def;
  }
}

function makeMaterialItem(materialId: string, materialName: string, char: string): ItemDef {
  return {
    char,
    name: materialName,
    description: "素材",
    effect: (game) => {
      game.player.addMaterial(materialId);
      game.addMessage(`${materialName}を拾った！`);
    },
  };
}

export function spawnItems(game: Game, floor: number, dungeonId?: string): ItemInstance[] {
  const items: ItemInstance[] = [];
  const scene = game.dungeonScene;
  if (!scene) return items;

  const floorTiles = scene.dungeon.getFloorTiles().filter(([x, y]) => {
    if (x === scene.dungeon.startX && y === scene.dungeon.startY) return false;
    if (x === scene.dungeon.stairsX && y === scene.dungeon.stairsY) return false;
    if (scene.enemies.some((e) => e.x === x && e.y === y)) return false;
    return true;
  });

  // Tutorial floor: hand-placed items
  if (floor === 0) {
    items.push(new ItemInstance(13, 5, ITEM_DEFS[0])); // Torch in item room
    items.push(new ItemInstance(12, 4, ITEM_DEFS[5])); // Potion in item room
    return items;
  }

  const count = 5 + floor;
  for (let i = 0; i < Math.min(count, floorTiles.length); i++) {
    const idx = Math.floor(ROT.RNG.getUniform() * floorTiles.length);
    const [x, y] = floorTiles[idx];
    floorTiles.splice(idx, 1);

    // Weight torches heavily so light doesn't run out
    let def: ItemDef;
    const roll = ROT.RNG.getUniform();
    if (roll < 0.4) {
      def = ITEM_DEFS[0]; // torch
    } else if (roll < 0.7) {
      // Regular item
      const defIdx = Math.floor(ROT.RNG.getUniform() * ITEM_DEFS.length);
      def = ITEM_DEFS[defIdx];
    } else {
      // Material drop based on dungeon
      const availableMats = MATERIAL_DEFS.filter(
        (m) => !dungeonId || m.dungeons.includes(dungeonId),
      );
      if (availableMats.length > 0) {
        // Pick based on rarity
        const mat = availableMats[Math.floor(ROT.RNG.getUniform() * availableMats.length)];
        if (ROT.RNG.getUniform() < mat.rarity) {
          def = makeMaterialItem(mat.id, mat.name, mat.char);
        } else {
          def = ITEM_DEFS[0]; // fallback torch
        }
      } else {
        def = ITEM_DEFS[Math.floor(ROT.RNG.getUniform() * ITEM_DEFS.length)];
      }
    }

    items.push(new ItemInstance(x, y, def));
  }

  return items;
}
