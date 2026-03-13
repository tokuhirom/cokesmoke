import * as ROT from "rot-js";
import { Entity } from "./Entity";
import type { Game } from "./Game";
import { Dungeon } from "./Dungeon";
import { COLOR_ENEMY } from "../constants";

export interface EnemyDef {
  char: string;
  name: string;
  hp: number;
  attack: number;
  defense: number;
  speed: number;
  isBoss: boolean;
}

export const ENEMY_DEFS: Record<string, EnemyDef> = {
  g: { char: "g", name: "ゴーレム兵", hp: 30, attack: 8, defense: 4, speed: 0.5, isBoss: false },
  s: { char: "s", name: "蒸気スパイダー", hp: 12, attack: 5, defense: 1, speed: 2, isBoss: false },
  B: { char: "B", name: "ボイラーブルート", hp: 50, attack: 12, defense: 3, speed: 1, isBoss: false },
  W: { char: "W", name: "霧の番人", hp: 100, attack: 15, defense: 6, speed: 1, isBoss: true },
};

export class Enemy extends Entity {
  speed: number;
  isBoss: boolean;
  awakened = false;

  constructor(game: Game, def: EnemyDef) {
    super(game, def.char, COLOR_ENEMY, def.name, def.hp, def.attack, def.defense);
    this.speed = def.speed;
    this.isBoss = def.isBoss;
  }

  act(): void {
    const player = this.game.player;
    const playerKey = `${player.x},${player.y}`;

    // Check if player is visible
    if (player.visibleTiles.has(`${this.x},${this.y}`)) {
      this.awakened = true;
    }

    if (!this.awakened) {
      this.wander();
      return;
    }

    // Adjacent to player? Attack
    const dx = Math.abs(player.x - this.x);
    const dy = Math.abs(player.y - this.y);
    if (dx <= 1 && dy <= 1 && (dx + dy > 0)) {
      this.attackPlayer();
      return;
    }

    // Pathfind toward player
    const passable = (x: number, y: number): boolean => {
      if (x === player.x && y === player.y) return true;
      if (!this.game.dungeon.isWalkable(x, y)) return false;
      // Don't walk through other enemies
      for (const e of this.game.enemies) {
        if (e !== this && e.isAlive() && e.x === x && e.y === y) return false;
      }
      return true;
    };

    const astar = new ROT.Path.AStar(player.x, player.y, passable, { topology: 4 });
    const path: [number, number][] = [];
    astar.compute(this.x, this.y, (x, y) => {
      path.push([x, y]);
    });

    if (path.length > 1) {
      this.x = path[1][0];
      this.y = path[1][1];
    }
  }

  private wander(): void {
    const dirs = ROT.DIRS[4];
    const dir = dirs[Math.floor(ROT.RNG.getUniform() * dirs.length)];
    const nx = this.x + dir[0];
    const ny = this.y + dir[1];
    if (this.game.dungeon.isWalkable(nx, ny)) {
      // Don't walk into other enemies
      const occupied = this.game.enemies.some(e => e !== this && e.isAlive() && e.x === nx && e.y === ny);
      if (!occupied) {
        this.x = nx;
        this.y = ny;
      }
    }
  }

  private attackPlayer(): void {
    const player = this.game.player;
    const dmg = player.takeDamage(this.attack);
    this.game.addMessage(`${this.name}の攻撃！ ${dmg}ダメージ`);
    if (!player.isAlive()) {
      this.game.gameOver();
    }
  }
}

export function spawnEnemies(game: Game, floor: number): Enemy[] {
  const enemies: Enemy[] = [];
  const floorTiles = game.dungeon.getFloorTiles().filter(([x, y]) => {
    // Don't spawn on player start or stairs
    if (x === game.dungeon.startX && y === game.dungeon.startY) return false;
    if (x === game.dungeon.stairsX && y === game.dungeon.stairsY) return false;
    return true;
  });

  // Number of enemies scales with floor
  const count = 3 + floor * 2;

  // Pick enemy types based on floor
  const availableTypes: string[] = ["g", "s"];
  if (floor >= 3) availableTypes.push("B");

  for (let i = 0; i < Math.min(count, floorTiles.length); i++) {
    const idx = Math.floor(ROT.RNG.getUniform() * floorTiles.length);
    const [x, y] = floorTiles[idx];
    floorTiles.splice(idx, 1);

    const typeKey = availableTypes[Math.floor(ROT.RNG.getUniform() * availableTypes.length)];
    const enemy = new Enemy(game, ENEMY_DEFS[typeKey]);
    enemy.x = x;
    enemy.y = y;
    enemies.push(enemy);
  }

  // Add boss on boss floors
  if (floor === 5 || floor === 10) {
    const idx = Math.floor(ROT.RNG.getUniform() * floorTiles.length);
    const [x, y] = floorTiles[idx];
    const boss = new Enemy(game, ENEMY_DEFS["W"]);
    boss.x = x;
    boss.y = y;
    boss.awakened = true;
    enemies.push(boss);
  }

  return enemies;
}
