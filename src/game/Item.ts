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
    name: "石炭袋",
    description: "燃料+50",
    effect: (game) => {
      game.player.fuel += 50;
      game.addMessage("石炭袋を拾った！燃料+50");
    },
  },
  {
    char: "!",
    name: "圧力弁",
    description: "SP上限+20",
    effect: (game) => {
      game.player.maxSp += 20;
      game.player.sp += 20;
      game.addMessage("圧力弁を装着！SP上限+20");
    },
  },
  {
    char: "/",
    name: "蒸気ランス",
    description: "攻撃力+3",
    effect: (game) => {
      game.player.attack += 3;
      game.addMessage("蒸気ランスを装備！攻撃力+3");
    },
  },
  {
    char: "[",
    name: "鉄板鎧",
    description: "防御力+2",
    effect: (game) => {
      game.player.defense += 2;
      game.addMessage("鉄板鎧を装着！防御力+2");
    },
  },
  {
    char: "~",
    name: "潤滑油",
    description: "SP全回復",
    effect: (game) => {
      game.player.sp = game.player.maxSp;
      game.addMessage("潤滑油を使った！SP全回復");
    },
  },
  {
    char: "+",
    name: "修理キット",
    description: "HP+25",
    effect: (game) => {
      game.player.hp = Math.min(game.player.maxHp, game.player.hp + 25);
      game.addMessage("修理キットでHP+25回復！");
    },
  },
  {
    char: "?",
    name: "設計図",
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
    // Don't place on enemies
    if (game.enemies.some((e) => e.x === x && e.y === y)) return false;
    return true;
  });

  // More items per floor to keep fuel sustainable
  const count = 5 + floor;
  for (let i = 0; i < Math.min(count, floorTiles.length); i++) {
    const idx = Math.floor(ROT.RNG.getUniform() * floorTiles.length);
    const [x, y] = floorTiles[idx];
    floorTiles.splice(idx, 1);

    // Weight coal bags heavily so fuel doesn't run out
    let defIdx: number;
    if (ROT.RNG.getUniform() < 0.5) {
      defIdx = 0; // coal bag
    } else {
      defIdx = Math.floor(ROT.RNG.getUniform() * ITEM_DEFS.length);
    }

    items.push(new ItemInstance(x, y, ITEM_DEFS[defIdx]));
  }

  return items;
}
