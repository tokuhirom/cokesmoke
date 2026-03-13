import * as ROT from "rot-js";
import type { Game } from "./Game";
import { SKILL_DEFS } from "./Skill";

export interface ItemDef {
  char: string;
  name: string;
  description: string;
  effect: (game: Game) => void;
}

export const ITEM_DEFS: ItemDef[] = [
  {
    char: "\u2666",
    name: "たいまつ",
    description: "明かり+50",
    effect: (game) => {
      game.player.fuel += 50;
      game.addMessage("たいまつを拾った！明かり+50");
    },
  },
  {
    char: "!",
    name: "魔法書",
    description: "MP上限+20",
    effect: (game) => {
      game.player.maxSp += 20;
      game.player.sp += 20;
      game.addMessage("魔法書を読んだ！MP上限+20");
    },
  },
  {
    char: "/",
    name: "剣",
    description: "攻撃力+3",
    effect: (game) => {
      game.player.attack += 3;
      game.addMessage("剣を手に入れた！攻撃力+3");
    },
  },
  {
    char: "[",
    name: "鎧",
    description: "防御力+2",
    effect: (game) => {
      game.player.defense += 2;
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

export function spawnItems(game: Game, floor: number): ItemInstance[] {
  const items: ItemInstance[] = [];
  const floorTiles = game.dungeon.getFloorTiles().filter(([x, y]) => {
    if (x === game.dungeon.startX && y === game.dungeon.startY) return false;
    if (x === game.dungeon.stairsX && y === game.dungeon.stairsY) return false;
    if (game.enemies.some((e) => e.x === x && e.y === y)) return false;
    return true;
  });

  const count = 5 + floor;
  for (let i = 0; i < Math.min(count, floorTiles.length); i++) {
    const idx = Math.floor(ROT.RNG.getUniform() * floorTiles.length);
    const [x, y] = floorTiles[idx];
    floorTiles.splice(idx, 1);

    // Weight torches heavily so light doesn't run out
    let defIdx: number;
    if (ROT.RNG.getUniform() < 0.5) {
      defIdx = 0; // torch
    } else {
      defIdx = Math.floor(ROT.RNG.getUniform() * ITEM_DEFS.length);
    }

    items.push(new ItemInstance(x, y, ITEM_DEFS[defIdx]));
  }

  return items;
}
