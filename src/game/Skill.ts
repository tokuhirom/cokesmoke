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
    name: "蒸気噴射",
    description: "前方2マスにダメージ",
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
          game.addMessage(`蒸気噴射！${enemy.name}に${dmg}ダメージ！`);
          if (!enemy.isAlive()) game.addMessage(`${enemy.name}を倒した！`);
          hit = true;
        }
      }
      if (!hit) game.addMessage("蒸気噴射！...しかし何も当たらなかった");
    },
  },
  {
    name: "緊急弁開放",
    description: "SP全消費→大ダメージ",
    spCost: "all",
    execute: (game) => {
      const p = game.player;
      const dmg = p.sp * 2;
      p.sp = 0;
      // Damage all adjacent enemies
      let hit = false;
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          if (dx === 0 && dy === 0) continue;
          const enemy = game.getEnemyAt(p.x + dx, p.y + dy);
          if (enemy) {
            const actual = enemy.takeDamage(dmg);
            game.addMessage(`緊急弁開放！${enemy.name}に${actual}ダメージ！`);
            if (!enemy.isAlive()) game.addMessage(`${enemy.name}を倒した！`);
            hit = true;
          }
        }
      }
      if (!hit) game.addMessage("緊急弁開放！...周囲に敵がいなかった");
    },
  },
  {
    name: "装甲展開",
    description: "1ターン無敵",
    spCost: 15,
    execute: (game) => {
      game.player.armorTurns = 2; // Current + next turn
      game.addMessage("装甲展開！一時的に無敵状態");
    },
  },
  {
    name: "煙幕",
    description: "周囲を霧で覆う",
    spCost: 10,
    execute: (game) => {
      // De-aggro all nearby enemies
      for (const enemy of game.enemies) {
        if (enemy.isAlive()) {
          const dx = Math.abs(enemy.x - game.player.x);
          const dy = Math.abs(enemy.y - game.player.y);
          if (dx <= 3 && dy <= 3) {
            enemy.awakened = false;
          }
        }
      }
      game.addMessage("煙幕を張った！周囲の敵が見失った");
    },
  },
];

export function useSkill(game: Game, skillIndex: number): boolean {
  const p = game.player;
  if (skillIndex >= p.skills.length) return false;

  const skill = p.skills[skillIndex];
  const cost = skill.spCost === "all" ? p.sp : skill.spCost;

  if (cost <= 0 && skill.spCost !== "all") {
    game.addMessage("SPが足りない！");
    return false;
  }

  if (typeof skill.spCost === "number" && p.sp < skill.spCost) {
    // Can still use but check overload
    if (p.sp < skill.spCost) {
      game.addMessage("SPが足りない！");
      return false;
    }
  }

  if (typeof skill.spCost === "number") {
    p.sp -= skill.spCost;
    // Overload check
    if (p.sp < 0) {
      const overloadDmg = p.takeDamage(OVERLOAD_DAMAGE);
      game.addMessage(`過負荷！${overloadDmg}ダメージを受けた！`);
      p.sp = 0;
    }
  }

  skill.execute(game);
  p.endTurn();
  return true;
}
