import * as ROT from "rot-js";
import { Entity } from "./Entity";
import type { Game } from "./Game";
import type { DungeonDef } from "./scenes/DungeonScene";
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
  g: { char: "g", name: "ゴブリン", hp: 30, attack: 8, defense: 4, speed: 0.5, isBoss: false },
  s: { char: "s", name: "スライム", hp: 12, attack: 5, defense: 1, speed: 2, isBoss: false },
  O: { char: "O", name: "オーク", hp: 50, attack: 12, defense: 3, speed: 1, isBoss: false },
  D: { char: "D", name: "ドラゴン", hp: 100, attack: 15, defense: 6, speed: 1, isBoss: true },
  // Bosses per dungeon
  G: {
    char: "G",
    name: "ゴブリンキング",
    hp: 45,
    attack: 10,
    defense: 5,
    speed: 0.5,
    isBoss: true,
  },
  T: { char: "T", name: "トレント", hp: 70, attack: 12, defense: 5, speed: 0.5, isBoss: true },
  R: { char: "R", name: "炎竜", hp: 90, attack: 14, defense: 6, speed: 1, isBoss: true },
  A: { char: "A", name: "深淵の王", hp: 150, attack: 18, defense: 8, speed: 1, isBoss: true },
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
    const scene = this.game.dungeonScene;
    if (!scene) return;

    if (player.visibleTiles.has(`${this.x},${this.y}`)) {
      this.awakened = true;
    }

    if (!this.awakened) {
      this.wander(scene);
      return;
    }

    const dx = Math.abs(player.x - this.x);
    const dy = Math.abs(player.y - this.y);
    if (dx <= 1 && dy <= 1 && dx + dy > 0) {
      this.attackPlayer();
      return;
    }

    const passable = (x: number, y: number): boolean => {
      if (x === player.x && y === player.y) return true;
      if (!scene.dungeon.isWalkable(x, y)) return false;
      for (const e of scene.enemies) {
        if (e !== this && e.isAlive() && e.x === x && e.y === y) return false;
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

  private wander(scene: import("./scenes/DungeonScene").DungeonScene): void {
    const dirs = ROT.DIRS[8];
    const dir = dirs[Math.floor(ROT.RNG.getUniform() * dirs.length)];
    const nx = this.x + dir[0];
    const ny = this.y + dir[1];
    if (scene.dungeon.isWalkable(nx, ny)) {
      const occupied = scene.enemies.some(
        (e) => e !== this && e.isAlive() && e.x === nx && e.y === ny,
      );
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

export function spawnEnemies(game: Game, floor: number, dungeonDef?: DungeonDef): Enemy[] {
  const enemies: Enemy[] = [];
  const scene = game.dungeonScene;
  if (!scene) return enemies;

  const floorTiles = scene.dungeon.getFloorTiles().filter(([x, y]) => {
    if (x === scene.dungeon.startX && y === scene.dungeon.startY) return false;
    if (x === scene.dungeon.stairsX && y === scene.dungeon.stairsY) return false;
    return true;
  });

  // Tutorial floor
  if (floor === 0) {
    const slime = new Enemy(game, { ...ENEMY_DEFS["s"], hp: 5, attack: 2, defense: 0 });
    slime.x = 22;
    slime.y = 5;
    return [slime];
  }

  const count = 3 + floor * 2;
  const availableTypes = dungeonDef?.enemyTypes ?? ["g", "s"];

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

  // Boss floors
  const bossFloors = dungeonDef?.bossFloors ?? [5, 10];
  if (bossFloors.includes(floor) && floorTiles.length > 0) {
    const idx = Math.floor(ROT.RNG.getUniform() * floorTiles.length);
    const [x, y] = floorTiles[idx];
    const bossKey = dungeonDef?.bossType ?? "D";
    const boss = new Enemy(game, ENEMY_DEFS[bossKey]);
    boss.x = x;
    boss.y = y;
    boss.awakened = true;
    enemies.push(boss);
  }

  return enemies;
}
