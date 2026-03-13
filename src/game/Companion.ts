import * as ROT from "rot-js";
import { Entity } from "./Entity";
import type { Game } from "./Game";
import type { DungeonScene } from "./scenes/DungeonScene";

export class Companion extends Entity {
  constructor(game: Game) {
    super(game, "L", "#44dd88", "リザ", 80, 12, 4);
  }

  act(scene: DungeonScene): void {
    const player = this.game.player;

    // Attack adjacent enemy first
    for (const enemy of scene.enemies) {
      if (!enemy.isAlive()) continue;
      const dx = Math.abs(enemy.x - this.x);
      const dy = Math.abs(enemy.y - this.y);
      if (dx <= 1 && dy <= 1 && dx + dy > 0) {
        const dmg = enemy.takeDamage(this.attack);
        this.game.addMessage(`リザの攻撃！${enemy.name}に${dmg}ダメージ`);
        if (!enemy.isAlive()) {
          this.game.addMessage(`${enemy.name}を倒した！`);
        }
        return;
      }
    }

    // Follow player - move toward player
    const pdx = Math.abs(player.x - this.x);
    const pdy = Math.abs(player.y - this.y);
    if (pdx <= 1 && pdy <= 1) return; // Already adjacent

    const passable = (x: number, y: number): boolean => {
      if (x === player.x && y === player.y) return true;
      if (!scene.dungeon.isWalkable(x, y)) return false;
      for (const e of scene.enemies) {
        if (e.isAlive() && e.x === x && e.y === y) return false;
      }
      return true;
    };

    const astar = new ROT.Path.AStar(player.x, player.y, passable, { topology: 8 });
    const path: [number, number][] = [];
    astar.compute(this.x, this.y, (x, y) => {
      path.push([x, y]);
    });

    if (path.length > 1) {
      this.x = path[1][0];
      this.y = path[1][1];
    }
  }
}
