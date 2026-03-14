import * as ROT from "rot-js";
import type { Scene } from "./Scene";
import type { Game } from "../Game";
import { Dungeon } from "../Dungeon";
import { Enemy, spawnEnemies } from "../Enemy";
import { ItemInstance, spawnItems } from "../Item";
import { generateArtifact } from "../Equipment";
import { JOB_DEFS } from "../Player";
import {
  MAP_WIDTH,
  MAP_HEIGHT,
  COLOR_WALL,
  COLOR_FLOOR,
  COLOR_STEAM_PIPE,
  COLOR_STAIRS,
  COLOR_PLAYER,
  COLOR_EXPLORED,
  COLOR_ENEMY,
  COLOR_ITEM,
  SP_REGEN_PER_TURN,
  HUNGER_COST_PER_TURN,
  FOV_RADIUS,
} from "../../constants";

export interface DungeonDef {
  id: string;
  name: string;
  floors: number;
  enemyTypes: string[];
  bossFloors: number[];
  bossType: string;
  description: string;
}

export const DUNGEON_DEFS: DungeonDef[] = [
  {
    id: "first",
    name: "始まりの迷宮",
    floors: 5,
    enemyTypes: ["s", "g"],
    bossFloors: [5],
    bossType: "G",
    description: "初心者向け。鉄鉱石が採れる。",
  },
  {
    id: "forest",
    name: "妖精の森窟",
    floors: 7,
    enemyTypes: ["s", "g", "O"],
    bossFloors: [7],
    bossType: "T",
    description: "鉄鉱石・精霊石が採れる。オークも出現。",
  },
  {
    id: "fire",
    name: "灼熱の坑道",
    floors: 8,
    enemyTypes: ["g", "O"],
    bossFloors: [4, 8],
    bossType: "R",
    description: "竜の鱗・竜の牙・ミスリル鉱が採れる。ドラゴンに注意。",
  },
  {
    id: "abyss",
    name: "深淵の迷宮",
    floors: 10,
    enemyTypes: ["O", "D"],
    bossFloors: [5, 10],
    bossType: "A",
    description: "アダマン鉱・闇の結晶が眠る最深部。",
  },
];

interface TrapDef {
  id: string;
  name: string;
  char: string;
  trigger: (scene: DungeonScene, game: Game) => void;
}

const TRAP_DEFS: TrapDef[] = [
  {
    id: "pitfall",
    name: "落とし穴",
    char: "^",
    trigger: (scene, game) => {
      const p = game.player;
      const dmg = 5 + scene.currentFloor * 2;
      p.hp = Math.max(0, p.hp - dmg);
      p.deathCause = "落とし穴";
      game.addMessage(`落とし穴だ！ ${dmg}ダメージを受け、下の階に落ちた！`);
      if (p.hp <= 0) {
        game.gameOver();
        return;
      }
      // Fall to next floor if not the last
      if (scene.currentFloor < scene.dungeonDef.floors) {
        scene.saveFloorCache();
        scene.currentFloor++;
        const cached = scene.floorCache.get(scene.currentFloor);
        if (cached) {
          // Place on a random walkable tile (not in a wall)
          const tiles = cached.dungeon.getFloorTiles();
          const [fx, fy] = tiles[Math.floor(Math.random() * tiles.length)];
          scene.loadFloorCache(scene.currentFloor, game, fx, fy);
        } else {
          scene.generateFloor(game);
        }
        game.render();
      }
    },
  },
  {
    id: "arrow",
    name: "矢の罠",
    char: "^",
    trigger: (_scene, game) => {
      const p = game.player;
      const dmg = 8 + Math.floor(Math.random() * 10);
      p.hp = Math.max(0, p.hp - dmg);
      p.deathCause = "矢の罠";
      game.addMessage(`矢の罠だ！ ${dmg}ダメージ！`);
      if (p.hp <= 0) {
        game.gameOver();
      }
    },
  },
  {
    id: "poison_gas",
    name: "毒ガスの罠",
    char: "^",
    trigger: (_scene, game) => {
      const p = game.player;
      const dmg = p.takeElementalDamage(12, "poison", "毒ガスの罠");
      game.addMessage(`毒ガスの罠だ！ ${dmg}ダメージ！`);
      if (p.hp <= 0) {
        game.gameOver();
      }
    },
  },
  {
    id: "hunger",
    name: "空腹の罠",
    char: "^",
    trigger: (_scene, game) => {
      const p = game.player;
      const loss = 30;
      p.hunger = Math.max(0, p.hunger - loss);
      game.addMessage(`空腹の罠だ！ 満腹度が${loss}減った！`);
    },
  },
];

interface Trap {
  x: number;
  y: number;
  def: TrapDef;
  revealed: boolean;
  triggered: boolean;
}

interface FloorCache {
  dungeon: Dungeon;
  enemies: Enemy[];
  items: ItemInstance[];
  traps: Trap[];
}

export class DungeonScene implements Scene {
  dungeon!: Dungeon;
  enemies: Enemy[] = [];
  items: ItemInstance[] = [];
  traps: Trap[] = [];
  currentFloor = 1;
  dungeonDef: DungeonDef;
  isTutorial: boolean;
  floorCache: Map<number, FloorCache> = new Map();

  constructor(dungeonDef: DungeonDef, isTutorial = false) {
    this.dungeonDef = dungeonDef;
    this.isTutorial = isTutorial;
  }

  onEnter(game: Game): void {
    this.currentFloor = this.isTutorial ? 0 : 1;
    this.floorCache.clear();
    this.generateFloor(game);
  }

  saveFloorCache(): void {
    this.floorCache.set(this.currentFloor, {
      dungeon: this.dungeon,
      enemies: this.enemies,
      items: this.items,
      traps: this.traps,
    });
  }

  loadFloorCache(floor: number, game: Game, spawnX: number, spawnY: number): boolean {
    const cached = this.floorCache.get(floor);
    if (!cached) return false;

    this.dungeon = cached.dungeon;
    this.enemies = cached.enemies;
    this.items = cached.items;
    this.traps = cached.traps;
    game.player.placeOnMap(spawnX, spawnY);
    this.computePlayerFOV(game);
    game.addMessage(`--- ${this.dungeonDef.name} ${this.currentFloor}階 ---`);
    return true;
  }

  generateFloor(game: Game): void {
    this.dungeon = new Dungeon(game, this.currentFloor);
    if (this.isTutorial) {
      this.dungeon.generateTutorial();
    } else {
      this.dungeon.generate();
    }

    // Final floor: replace downstairs with exit portal
    if (!this.isTutorial && this.currentFloor >= this.dungeonDef.floors) {
      this.dungeon.placeExitPortal();
    }

    // Place upstairs at start position for going back
    if (!this.isTutorial) {
      this.dungeon.placeUpstairs();
    }

    game.player.placeOnMap(this.dungeon.startX, this.dungeon.startY);
    this.enemies = spawnEnemies(game, this.currentFloor, this.dungeonDef);
    this.items = spawnItems(game, this.currentFloor, this.dungeonDef.id);
    this.traps = this.isTutorial ? [] : this.spawnTraps();
    this.saveFloorCache();
    this.computePlayerFOV(game);
    if (this.currentFloor > 0) {
      game.addMessage(`--- ${this.dungeonDef.name} ${this.currentFloor}階 ---`);
    }
  }

  private spawnTraps(): Trap[] {
    const traps: Trap[] = [];
    const floorTiles = this.dungeon.getFloorTiles().filter(([x, y]) => {
      if (x === this.dungeon.startX && y === this.dungeon.startY) return false;
      if (x === this.dungeon.stairsX && y === this.dungeon.stairsY) return false;
      return true;
    });

    const count = 2 + Math.floor(this.currentFloor * 0.5);
    for (let i = 0; i < Math.min(count, floorTiles.length); i++) {
      const idx = Math.floor(ROT.RNG.getUniform() * floorTiles.length);
      const [x, y] = floorTiles[idx];
      floorTiles.splice(idx, 1);
      const def = TRAP_DEFS[Math.floor(ROT.RNG.getUniform() * TRAP_DEFS.length)];
      traps.push({ x, y, def, revealed: false, triggered: false });
    }
    return traps;
  }

  private checkTrap(game: Game): void {
    const p = game.player;
    const trap = this.traps.find((t) => !t.triggered && t.x === p.x && t.y === p.y);
    if (!trap) return;

    // Evasion check: base 15% + thief bonus
    const evadeChance = 0.15 + p.trapEvadeBonus;
    if (Math.random() < evadeChance) {
      trap.revealed = true;
      game.addMessage(`${trap.def.name}を見つけたが、うまく避けた！`);
      return;
    }

    trap.triggered = true;
    trap.revealed = true;
    trap.def.trigger(this, game);
  }

  computePlayerFOV(game: Game): void {
    const p = game.player;
    p.visibleTiles.clear();
    const fov = new ROT.FOV.PreciseShadowcasting((x, y) => {
      return this.dungeon.isTransparent(x, y);
    });
    fov.compute(p.x, p.y, FOV_RADIUS, (x, y, _r, visible) => {
      if (visible) {
        const key = `${x},${y}`;
        p.visibleTiles.add(key);
        const tile = this.dungeon.getTile(x, y);
        if (tile) tile.explored = true;
      }
    });
  }

  onMove(dx: number, dy: number, game: Game): boolean {
    const p = game.player;
    const nx = p.x + dx;
    const ny = p.y + dy;

    p.lastDx = dx;
    p.lastDy = dy;

    if (!this.dungeon.isWalkable(nx, ny)) return false;

    const enemy = this.getEnemyAt(nx, ny);
    if (enemy) {
      this.attackEnemy(game, enemy);
      this.endTurn(game);
      return true;
    }

    p.x = nx;
    p.y = ny;

    this.checkTrap(game);
    if (game.state !== "dungeon") return true; // died or fell to next floor

    this.pickupItem(game, p.x, p.y);
    this.endTurn(game);
    return true;
  }

  private attackEnemy(game: Game, enemy: Enemy): void {
    const p = game.player;
    const spBonus = Math.floor(p.sp / 20);
    const totalAtk = p.attack + spBonus;
    const dmg = enemy.takeDamage(totalAtk);
    game.addMessage(`${enemy.name}に${dmg}ダメージ！`);
    if (!enemy.isAlive()) {
      const goldDrop = enemy.isBoss ? 50 + this.currentFloor * 10 : 5 + this.currentFloor * 2;
      p.gold += goldDrop;
      game.addMessage(`${enemy.name}を倒した！ ${goldDrop}G入手`);
      if (enemy.isBoss) {
        const artifact = generateArtifact(this.currentFloor);
        p.ownedEquipment.push(artifact);
        game.addMessage(`★ ${artifact.name}を手に入れた！（${artifact.description}）`);
      }
    }
  }

  onWait(game: Game): void {
    // Resting: recover HP but costs extra hunger
    const p = game.player;
    if (p.hp < p.maxHp && p.hunger > 0) {
      const heal = Math.min(3, p.maxHp - p.hp);
      p.hp += heal;
      p.hunger = Math.max(0, p.hunger - 1);
      game.addMessage(`休息してHP${heal}回復（満腹-1）`);
    }
    this.endTurn(game);
  }

  onDescend(game: Game): boolean {
    const tile = this.dungeon.getTile(game.player.x, game.player.y);
    if (tile && tile.char === ">") {
      this.nextFloor(game);
      return true;
    }
    if (tile && tile.char === "<") {
      this.prevFloor(game);
      return true;
    }
    if (tile && tile.char === "◎") {
      this.nextFloor(game); // triggers dungeon clear
      return true;
    }
    return false;
  }

  endTurn(game: Game): void {
    const p = game.player;

    if (p.armorTurns > 0) p.armorTurns--;

    // hungerCostMult < 1 means reduced hunger consumption
    // For 0.5: only consume on even turns (tracked via accumulated fractional cost)
    p.hungerAccum = (p.hungerAccum ?? 0) + HUNGER_COST_PER_TURN * p.hungerCostMult;
    const hungerCost = Math.floor(p.hungerAccum);
    p.hungerAccum -= hungerCost;
    p.hunger -= hungerCost;
    if (p.hunger < 0) p.hunger = 0;
    if (p.hunger === 0) {
      const starveDmg = 3;
      p.hp -= starveDmg;
      p.deathCause = "空腹";
      game.addMessage(`空腹で${starveDmg}ダメージ！`);
      if (p.hp <= 0) {
        p.hp = 0;
        game.gameOver();
        return;
      }
    }

    p.sp = Math.min(p.maxSp, p.sp + SP_REGEN_PER_TURN + p.spRegenBonus);

    // Gift: HP regen
    if (p.hpRegen && p.hp < p.maxHp && p.hunger > 0) {
      p.hp = Math.min(p.maxHp, p.hp + 1);
    }

    const tile = this.dungeon.getTile(p.x, p.y);
    if (tile && tile.char === "\u2261") {
      p.sp = Math.min(p.maxSp, p.sp + 5);
      game.addMessage("魔法陣からMPを回復した");
    }

    if (tile && tile.char === ">") {
      game.addMessage("階段を見つけた！ >キーで降りる");
    }
    if (tile && tile.char === "◎") {
      game.addMessage("転移陣だ！ >キーで地上に脱出できる");
    }
    if (tile && tile.char === "<") {
      if (this.currentFloor <= 1) {
        game.addMessage("上り階段だ！ >キーで迷宮から脱出できる");
      } else {
        game.addMessage("上り階段だ！ >キーで上の階に戻れる");
      }
    }

    // Companion acts
    if (game.companion && game.companion.isAlive()) {
      game.companion.act(this);
    }

    this.processEnemyTurns(game);
    this.computePlayerFOV(game);
  }

  nextFloor(game: Game): void {
    if (this.isTutorial) {
      game.onTutorialComplete();
      return;
    }

    if (this.currentFloor >= this.dungeonDef.floors) {
      game.addMessage(`${this.dungeonDef.name}を踏破した！`);
      game.exitDungeon();
      return;
    }

    this.saveFloorCache();
    this.currentFloor++;

    // Try to load cached floor (spawn at upstairs position)
    const cached = this.floorCache.get(this.currentFloor);
    if (cached) {
      this.loadFloorCache(this.currentFloor, game, cached.dungeon.startX, cached.dungeon.startY);
    } else {
      this.generateFloor(game);
    }
    game.render();
  }

  prevFloor(game: Game): void {
    if (this.currentFloor <= 1) {
      game.addMessage("迷宮から脱出した！");
      game.exitDungeon();
      return;
    }

    this.saveFloorCache();
    this.currentFloor--;

    // Try to load cached floor (spawn at stairs/down position)
    const cached = this.floorCache.get(this.currentFloor);
    if (cached) {
      this.loadFloorCache(this.currentFloor, game, cached.dungeon.stairsX, cached.dungeon.stairsY);
    } else {
      this.generateFloor(game);
      game.player.placeOnMap(this.dungeon.stairsX, this.dungeon.stairsY);
    }
    game.addMessage(`${this.currentFloor}階に戻った`);
    game.render();
  }

  pickupItem(game: Game, x: number, y: number): void {
    const item = this.items.find((i) => !i.picked && i.x === x && i.y === y);
    if (item) {
      item.picked = true;
      if (item.def.consumable) {
        game.player.addConsumable(item.def);
      } else {
        item.def.effect(game);
      }
    }
  }

  getEnemyAt(x: number, y: number): Enemy | undefined {
    return this.enemies.find((e) => e.isAlive() && e.x === x && e.y === y);
  }

  processEnemyTurns(game: Game): void {
    for (const enemy of this.enemies) {
      if (enemy.isAlive()) {
        enemy.act();
        if (game.state !== "dungeon") return;
      }
    }
  }

  render(display: ROT.Display, game: Game): void {
    const player = game.player;

    for (let x = 0; x < MAP_WIDTH; x++) {
      for (let y = 0; y < MAP_HEIGHT; y++) {
        const key = Dungeon.key(x, y);
        const tile = this.dungeon.getTile(x, y);
        if (!tile) continue;

        const visible = player.visibleTiles.has(key);
        const explored = tile.explored;

        if (!visible && !explored) continue;

        let fg: string;
        let bg: string | null = null;
        let ch = tile.char;

        if (!visible) {
          if (tile.char === ">" || tile.char === "<" || tile.char === "◎") {
            fg = tile.char === "◎" ? "#886600" : "#998800";
            bg = "#0d0d1a";
          } else {
            fg = COLOR_EXPLORED;
            if (tile.walkable) ch = "\u00b7";
            bg = "#0d0d1a";
          }
        } else {
          switch (tile.char) {
            case "\u2588":
              fg = COLOR_WALL;
              bg = "#1e1e3a";
              break;
            case "\u2261":
              fg = COLOR_STEAM_PIPE;
              bg = "#1a2030";
              break;
            case ">":
            case "<":
              fg = COLOR_STAIRS;
              bg = "#1a2030";
              break;
            case "◎":
              fg = "#ffdd44";
              bg = "#2a2020";
              break;
            case " ":
              ch = "\u00b7";
              fg = "#333350";
              bg = "#1a2030";
              break;
            default:
              fg = COLOR_FLOOR;
              bg = "#1a2030";
              break;
          }
        }

        display.draw(x, y, ch, fg, bg);
      }
    }

    // Draw revealed traps
    for (const trap of this.traps) {
      if (trap.revealed && !trap.triggered && player.visibleTiles.has(`${trap.x},${trap.y}`)) {
        display.draw(trap.x, trap.y, trap.def.char, "#ff8800", null);
      }
    }

    for (const item of this.items) {
      if (!item.picked && player.visibleTiles.has(`${item.x},${item.y}`)) {
        display.draw(item.x, item.y, item.def.char, COLOR_ITEM, null);
      }
    }

    for (const enemy of this.enemies) {
      if (enemy.isAlive() && player.visibleTiles.has(`${enemy.x},${enemy.y}`)) {
        display.draw(enemy.x, enemy.y, enemy.char, COLOR_ENEMY, null);
      }
    }

    // Draw companion
    if (game.companion && game.companion.isAlive()) {
      display.draw(
        game.companion.x,
        game.companion.y,
        game.companion.char,
        game.companion.color,
        null,
      );
    }

    display.draw(player.x, player.y, player.char, COLOR_PLAYER, null);
  }

  getStatusHTML(game: Game): string {
    const p = game.player;
    const hpBar = makeBar(p.hp, p.maxHp, "\u2588", "\u2591");
    const spBar = makeBar(p.sp, p.maxSp, "=", "-");
    const armorStr = p.armorTurns > 0 ? ' <span style="color:#44ff88">[バリア]</span>' : "";
    const job = JOB_DEFS.find((j) => j.id === p.jobId);
    const jobStr = job ? `${job.name} ` : "";
    const floorLabel = this.isTutorial
      ? "Tutorial"
      : `${jobStr}${this.dungeonDef.name} ${this.currentFloor}F`;

    const weaponStr = p.weapon ? ` <span style="color:#ffaa44">${p.weapon.name}</span>` : "";

    // Resistance summary
    const resists: string[] = [];
    for (const elem of ["fire", "ice", "poison", "lightning"] as const) {
      const val = p.getResistance(elem);
      if (val > 0) {
        const names: Record<string, string> = {
          fire: "炎",
          ice: "氷",
          poison: "毒",
          lightning: "雷",
        };
        resists.push(`${names[elem]}${val}%`);
      }
    }
    const resistStr =
      resists.length > 0 ? ` <span style="color:#88aacc">[${resists.join(" ")}]</span>` : "";

    return (
      `<span class="hp-color">HP:${hpBar} ${p.hp}/${p.maxHp}</span>  ` +
      `<span class="fuel-color">満腹:${p.hunger}</span>  ` +
      `<span style="color:#ffdd44">${p.gold}G</span>  ` +
      `<span class="floor-color">${floorLabel}</span>${armorStr}${weaponStr}<br>` +
      `<span class="sp-color">MP:[${spBar}] ${p.sp}/${p.maxSp}</span>` +
      `  ATK:${p.attack} DEF:${p.defense}${resistStr}`
    );
  }
}

function makeBar(current: number, max: number, fillChar: string, emptyChar: string): string {
  const width = 8;
  const filled = Math.round((current / max) * width);
  return fillChar.repeat(filled) + emptyChar.repeat(width - filled);
}
