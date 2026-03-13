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
    description: "敵の注意を逸らす",
    spCost: 10,
    execute: (game) => {
      for (const enemy of game.enemies) {
        if (enemy.isAlive()) {
          const dx = Math.abs(enemy.x - game.player.x);
          const dy = Math.abs(enemy.y - game.player.y);
          if (dx <= 3 && dy <= 3) {
            enemy.awakened = false;
          }
        }
      }
      game.addMessage("姿をくらました！周囲の敵が見失った");
    },
  },
];

export function useSkill(game: Game, skillIndex: number): boolean {
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
  p.endTurn();
  return true;
}
