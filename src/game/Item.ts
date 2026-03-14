import * as ROT from "rot-js";
import type { Game } from "./Game";
import { SKILL_DEFS } from "./Skill";
import { MATERIAL_DEFS, EQUIPMENT_DEFS } from "./Equipment";

export interface ItemDef {
  char: string;
  name: string;
  description: string;
  consumable?: boolean; // if true, goes to inventory instead of instant use
  effect: (game: Game) => void;
  arrowPower?: number; // damage multiplier for arrows (射撃 skill)
  weight?: number; // spawn weight (default 10), higher = more common
  minFloor?: number; // minimum floor to appear (default 1)
  dungeons?: string[]; // if set, only appears in these dungeons
}

export const ITEM_DEFS: ItemDef[] = [
  {
    char: "\u2666",
    name: "干し肉",
    description: "満腹+50",
    consumable: true,
    effect: (game) => {
      game.player.hunger = Math.min(game.player.maxHunger, game.player.hunger + 50);
      game.addMessage("干し肉を食べた！満腹+50");
    },
  },
  {
    char: "!",
    name: "魔法書",
    description: "MP上限+20",
    weight: 3,
    effect: (game) => {
      game.player.baseSp += 20;
      game.player.sp += 20;
      game.player.recalcStats();
      game.addMessage("魔法書を読んだ！MP上限+20");
    },
  },
  {
    char: "/",
    name: "木の剣",
    description: "攻撃+2（装備品）",
    effect: (game) => {
      game.player.equip(EQUIPMENT_DEFS["wooden_sword"]);
    },
  },
  {
    char: "[",
    name: "革の鎧",
    description: "防御+1（装備品）",
    effect: (game) => {
      game.player.equip(EQUIPMENT_DEFS["leather_armor"]);
    },
  },
  {
    char: "~",
    name: "エーテル",
    description: "MP+20回復",
    consumable: true,
    weight: 8,
    effect: (game) => {
      game.player.sp = Math.min(game.player.maxSp, game.player.sp + 20);
      game.addMessage("エーテルを飲んだ！MP+20回復");
    },
  },
  {
    char: "~",
    name: "エリクサー",
    description: "MP全回復",
    consumable: true,
    weight: 2,
    minFloor: 3,
    dungeons: ["forest", "fire"],
    effect: (game) => {
      game.player.sp = game.player.maxSp;
      game.addMessage("エリクサーを飲んだ！MP全回復");
    },
  },
  {
    char: "+",
    name: "回復薬",
    description: "HP+25",
    consumable: true,
    effect: (game) => {
      game.player.hp = Math.min(game.player.maxHp, game.player.hp + 25);
      game.addMessage("回復薬を飲んだ！HP+25");
    },
  },
  {
    char: "?",
    name: "魔導書",
    description: "ランダムスキル習得",
    weight: 2,
    minFloor: 2,
    effect: (game) => {
      const idx = Math.floor(ROT.RNG.getUniform() * SKILL_DEFS.length);
      const skill = SKILL_DEFS[idx];
      const result = game.player.learnSkill(skill);
      if (result === "full") {
        game.addMessage(`「${skill.name}」を覚えたい！しかしスキルがいっぱい...`);
        game.showSkillReplaceMenu(skill);
      }
    },
  },
  {
    char: "|",
    name: "木の矢",
    description: "射撃で使う矢（攻撃力の80%）",
    consumable: true,
    effect: (game) => {
      game.addMessage("木の矢は射撃スキルで使える");
    },
    arrowPower: 0.8,
  },
  {
    char: "|",
    name: "鉄の矢",
    description: "射撃で使う矢（攻撃力の120%）",
    consumable: true,
    effect: (game) => {
      game.addMessage("鉄の矢は射撃スキルで使える");
    },
    arrowPower: 1.2,
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

function pickWeightedItem(floor: number, dungeonId?: string): ItemDef {
  const candidates = ITEM_DEFS.filter((d) => {
    if (d.minFloor && floor < d.minFloor) return false;
    if (d.dungeons && dungeonId && !d.dungeons.includes(dungeonId)) return false;
    if (d.arrowPower) return false; // arrows are crafted, not found
    return true;
  });
  if (candidates.length === 0) return ITEM_DEFS[0];
  const totalWeight = candidates.reduce((sum, d) => sum + (d.weight ?? 10), 0);
  let roll = ROT.RNG.getUniform() * totalWeight;
  for (const d of candidates) {
    roll -= d.weight ?? 10;
    if (roll <= 0) return d;
  }
  return candidates[candidates.length - 1];
}

function makeMaterialItem(materialId: string, materialName: string, char: string): ItemDef {
  return {
    char,
    name: materialName,
    description: "素材（職人に渡して装備を作れる）",
    effect: (game) => {
      game.player.addMaterial(materialId);
      game.addMessage(`素材「${materialName}」を入手！（職人に渡して装備を作れる）`);
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

  // Scale item count with dungeon size (area ratio vs tutorial 35x20)
  const areaScale = (scene.dungeon.width * scene.dungeon.height) / (35 * 20);
  const count = Math.floor((5 + floor) * areaScale);
  for (let i = 0; i < Math.min(count, floorTiles.length); i++) {
    const idx = Math.floor(ROT.RNG.getUniform() * floorTiles.length);
    const [x, y] = floorTiles[idx];
    floorTiles.splice(idx, 1);

    let def: ItemDef;
    const roll = ROT.RNG.getUniform();
    if (roll < 0.4) {
      def = ITEM_DEFS[0]; // food is most common
    } else if (roll < 0.7) {
      // Weighted item selection with floor/dungeon filtering
      def = pickWeightedItem(floor, dungeonId);
    } else {
      // Material drop based on dungeon
      const availableMats = MATERIAL_DEFS.filter(
        (m) => !dungeonId || m.dungeons.includes(dungeonId),
      );
      if (availableMats.length > 0) {
        const mat = availableMats[Math.floor(ROT.RNG.getUniform() * availableMats.length)];
        if (ROT.RNG.getUniform() < mat.rarity) {
          def = makeMaterialItem(mat.id, mat.name, mat.char);
        } else {
          def = ITEM_DEFS[0];
        }
      } else {
        def = pickWeightedItem(floor, dungeonId);
      }
    }

    items.push(new ItemInstance(x, y, def));
  }

  return items;
}
