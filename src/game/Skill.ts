import type { Game } from "./Game";
import { OVERLOAD_DAMAGE } from "../constants";

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

  if (cost <= 0 && skill.spCost !== "all") {
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
