import type { Game } from "./Game";
import type { DungeonScene } from "./scenes/DungeonScene";
import { OVERLOAD_DAMAGE } from "../constants";

function hasLineOfSight(
  scene: DungeonScene,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
): boolean {
  // Bresenham's line to check for wall blocking
  let x = x0;
  let y = y0;
  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;

  while (x !== x1 || y !== y1) {
    const e2 = 2 * err;
    if (e2 > -dy) {
      err -= dy;
      x += sx;
    }
    if (e2 < dx) {
      err += dx;
      y += sy;
    }
    if (x === x1 && y === y1) break;
    if (!scene.dungeon.isTransparent(x, y)) return false;
  }
  return true;
}

export interface SkillDef {
  name: string;
  description: string;
  spCost: number | "all";
  execute: (game: Game) => void;
}

export const SKILL_DEFS: SkillDef[] = [
  {
    name: "ファイアボルト",
    description: "前方2マスに炎",
    spCost: 20,

    execute: (game) => {
      const p = game.player;
      const lastDx = game.player.lastDx;
      const lastDy = game.player.lastDy;
      if (lastDx === 0 && lastDy === 0) {
        game.addMessage("方向が定まらない...");
        return;
      }
      let hit = false;
      for (let i = 1; i <= 2; i++) {
        const tx = p.x + lastDx * i;
        const ty = p.y + lastDy * i;
        const enemy = game.getEnemyAt(tx, ty);
        if (enemy) {
          const dmg = enemy.takeDamage(25);
          game.addMessage(`ファイアボルト！${enemy.name}に${dmg}ダメージ！`);
          if (!enemy.isAlive()) game.addMessage(`${enemy.name}を倒した！`);
          hit = true;
        }
      }
      if (!hit) game.addMessage("ファイアボルト！...しかし何も当たらなかった");
    },
  },
  {
    name: "メテオ",
    description: "MP全消費→大ダメージ",
    spCost: "all",

    execute: (game) => {
      const p = game.player;
      const dmg = p.sp * 2;
      p.sp = 0;
      let hit = false;
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          if (dx === 0 && dy === 0) continue;
          const enemy = game.getEnemyAt(p.x + dx, p.y + dy);
          if (enemy) {
            const actual = enemy.takeDamage(dmg);
            game.addMessage(`メテオ！${enemy.name}に${actual}ダメージ！`);
            if (!enemy.isAlive()) game.addMessage(`${enemy.name}を倒した！`);
            hit = true;
          }
        }
      }
      if (!hit) game.addMessage("メテオ！...周囲に敵がいなかった");
    },
  },
  {
    name: "バリア",
    description: "1ターン無敵",
    spCost: 15,

    execute: (game) => {
      game.player.armorTurns = 2;
      game.addMessage("バリア展開！一時的に無敵状態");
    },
  },
  {
    name: "射撃",
    description: "矢を消費して視界内の敵を攻撃",
    spCost: 0,
    execute: (game) => {
      const p = game.player;
      const scene = game.dungeonScene;
      if (!scene) return;

      // Find best arrow in inventory (prefer stronger arrows)
      let arrowEntry: { name: string; def: { arrowPower?: number }; count: number } | null = null;
      for (const [name, entry] of p.consumables) {
        if (entry.def.arrowPower) {
          if (!arrowEntry || entry.def.arrowPower > (arrowEntry.def.arrowPower ?? 0)) {
            arrowEntry = { name, def: entry.def, count: entry.count };
          }
        }
      }

      if (!arrowEntry) {
        game.addMessage("矢がない！");
        return;
      }

      // Find nearest visible enemy with clear line of sight
      let bestEnemy: ReturnType<typeof game.getEnemyAt> = undefined;
      let bestDist = Infinity;

      for (const enemy of scene.enemies) {
        if (!enemy.isAlive()) continue;
        if (!p.visibleTiles.has(`${enemy.x},${enemy.y}`)) continue;

        const dist = Math.abs(enemy.x - p.x) + Math.abs(enemy.y - p.y);
        if (dist < bestDist) {
          if (hasLineOfSight(scene, p.x, p.y, enemy.x, enemy.y)) {
            bestDist = dist;
            bestEnemy = enemy;
          }
        }
      }

      if (bestEnemy) {
        // Consume arrow
        const entry = p.consumables.get(arrowEntry.name)!;
        entry.count--;
        if (entry.count <= 0) p.consumables.delete(arrowEntry.name);

        const power = arrowEntry.def.arrowPower ?? 1;
        const dmg = bestEnemy.takeDamage(Math.floor(p.attack * power));
        game.addMessage(`射撃（${arrowEntry.name}）！${bestEnemy.name}に${dmg}ダメージ！`);
        if (!bestEnemy.isAlive()) game.addMessage(`${bestEnemy.name}を倒した！`);
      } else {
        game.addMessage("射撃！...しかし射程内に敵がいない");
      }
    },
  },
  {
    name: "ヒール",
    description: "HP25回復",
    spCost: 15,

    execute: (game) => {
      const p = game.player;
      const actual = Math.min(25, p.maxHp - p.hp);
      p.hp = Math.min(p.maxHp, p.hp + 25);
      if (actual > 0) {
        game.addMessage(`ヒール！HP${actual}回復！`);
      } else {
        game.addMessage("ヒール！...しかしHPは満タンだった");
      }
    },
  },
  {
    name: "ヒールII",
    description: "HP60回復",
    spCost: 35,

    execute: (game) => {
      const p = game.player;
      const actual = Math.min(60, p.maxHp - p.hp);
      p.hp = Math.min(p.maxHp, p.hp + 60);
      if (actual > 0) {
        game.addMessage(`ヒールII！HP${actual}回復！`);
      } else {
        game.addMessage("ヒールII！...しかしHPは満タンだった");
      }
    },
  },
  {
    name: "テレポート",
    description: "ランダムな場所に瞬間移動",
    spCost: 10,

    execute: (game) => {
      const scene = game.dungeonScene;
      if (!scene) return;
      const floorTiles = scene.dungeon.getFloorTiles().filter(([x, y]) => {
        if (x === game.player.x && y === game.player.y) return false;
        if (scene.getEnemyAt(x, y)) return false;
        return true;
      });
      if (floorTiles.length === 0) {
        game.addMessage("テレポート失敗...移動先がない");
        return;
      }
      const [nx, ny] = floorTiles[Math.floor(Math.random() * floorTiles.length)];
      game.player.x = nx;
      game.player.y = ny;
      // Nearby enemies lose track
      for (const enemy of scene.enemies) {
        if (enemy.isAlive() && enemy.awakened) {
          const dist = Math.abs(enemy.x - nx) + Math.abs(enemy.y - ny);
          if (dist > 5) {
            enemy.awakened = false;
          }
        }
      }
      game.addMessage("テレポート！別の場所に瞬間移動した");
    },
  },
];

export function useSkill(game: Game, skillIndex: number): boolean {
  if (game.state !== "dungeon") return false;

  const p = game.player;
  if (skillIndex >= p.skills.length) return false;

  const skill = p.skills[skillIndex];
  const cost = skill.spCost === "all" ? p.sp : skill.spCost;

  if (cost < 0 && skill.spCost !== "all") {
    game.addMessage("MPが足りない！");
    return false;
  }

  if (typeof skill.spCost === "number" && p.sp < skill.spCost) {
    game.addMessage("MPが足りない！");
    return false;
  }

  if (typeof skill.spCost === "number") {
    p.sp -= skill.spCost;
    if (p.sp < 0) {
      const overloadDmg = p.takeDamage(OVERLOAD_DAMAGE);
      game.addMessage(`魔力暴走！${overloadDmg}ダメージを受けた！`);
      p.sp = 0;
    }
  }

  skill.execute(game);

  // End turn via dungeon scene
  const scene = game.dungeonScene;
  if (scene) {
    scene.endTurn(game);
  }

  return true;
}
