import * as ROT from "rot-js";
import type { Scene } from "./Scene";
import type { Game } from "../Game";
import { MAP_WIDTH, MAP_HEIGHT, COLOR_PLAYER, HUNGER_COST_PER_TURN } from "../../constants";
import { EQUIPMENT_DEFS } from "../Equipment";
import { DUNGEON_DEFS } from "./DungeonScene";

export interface PointOfInterest {
  x: number;
  y: number;
  type: "town" | "dungeon";
  id: string;
  name: string;
}

interface WorldEnemyDef {
  char: string;
  name: string;
  hp: number;
  attack: number;
  defense: number;
  color: string;
}

const WORLD_ENEMY_DEFS: WorldEnemyDef[] = [
  { char: "b", name: "野盗", hp: 25, attack: 8, defense: 3, color: "#cc6644" },
  { char: "B", name: "野盗の頭", hp: 50, attack: 14, defense: 5, color: "#ee5533" },
  { char: "w", name: "野狼", hp: 18, attack: 10, defense: 2, color: "#aaaacc" },
];

interface WorldEnemy {
  x: number;
  y: number;
  def: WorldEnemyDef;
  hp: number;
  alive: boolean;
  respawnTimer: number;
}

export interface DroppedLoot {
  x: number;
  y: number;
  weaponId: string | null;
  armorId: string | null;
  accessoryId: string | null;
  equipmentIds: string[];
  materials: Record<string, number>;
}

interface WorldTile {
  char: string;
  fg: string;
  walkable: boolean;
}

const TERRAIN: Record<string, WorldTile> = {
  water: { char: "~", fg: "#4488cc", walkable: false },
  sand: { char: ".", fg: "#ccbb88", walkable: true },
  grass: { char: ".", fg: "#44aa44", walkable: true },
  forest: { char: "T", fg: "#228833", walkable: true },
  mountain: { char: "^", fg: "#888888", walkable: false },
  road: { char: "#", fg: "#aa9966", walkable: true },
};

export class WorldScene implements Scene {
  width: number;
  height: number;
  tiles: WorldTile[][] = [];
  pois: PointOfInterest[] = [];
  playerWorldX = 0;
  playerWorldY = 0;
  seed: number;
  worldEnemies: WorldEnemy[] = [];
  droppedLoots: DroppedLoot[] = [];

  constructor(seed: number) {
    this.width = 80;
    this.height = 60;
    this.seed = seed;
  }

  onEnter(game: Game): void {
    if (this.tiles.length === 0) {
      this.generate();
    }
    if (this.worldEnemies.length === 0) {
      this.spawnWorldEnemies();
    }
    game.player.placeOnMap(this.playerWorldX, this.playerWorldY);
    game.player.visibleTiles.clear();
  }

  private generate(): void {
    ROT.RNG.setSeed(this.seed);
    const noise = new ROT.Noise.Simplex();

    // Generate terrain
    this.tiles = [];
    for (let x = 0; x < this.width; x++) {
      this.tiles[x] = [];
      for (let y = 0; y < this.height; y++) {
        const n1 = noise.get(x / 15, y / 15);
        const n2 = noise.get(x / 8 + 100, y / 8 + 100) * 0.3;
        const val = n1 + n2;

        let terrain: WorldTile;
        if (val < -0.3) {
          terrain = TERRAIN.water;
        } else if (val < -0.15) {
          terrain = TERRAIN.sand;
        } else if (val < 0.2) {
          terrain = TERRAIN.grass;
        } else if (val < 0.45) {
          terrain = TERRAIN.forest;
        } else {
          terrain = TERRAIN.mountain;
        }

        this.tiles[x][y] = { ...terrain };
      }
    }

    // Place POIs on grass tiles, spread out
    this.placePOIs();

    // Build roads between towns
    this.buildRoads();

    ROT.RNG.setSeed(Date.now());
  }

  private placePOIs(): void {
    const candidates = this.getGrassTiles();

    // Starting town near center
    const cx = Math.floor(this.width / 2);
    const cy = Math.floor(this.height / 2);
    const startPos = this.findNearestGrass(cx, cy, candidates);
    this.addPOI(startPos[0], startPos[1], "town", "home", "始まりの村");
    this.playerWorldX = startPos[0];
    this.playerWorldY = startPos[1];

    // Other towns
    const towns = [
      { id: "lizard", name: "竜人の里", minDist: 15 },
      { id: "elf", name: "エルフの隠れ里", minDist: 18 },
      { id: "dwarf", name: "ドワーフの砦", minDist: 20 },
    ];

    for (const t of towns) {
      const pos = this.findDistantFromAll(t.minDist, candidates);
      this.addPOI(pos[0], pos[1], "town", t.id, t.name);
    }

    // Dungeons
    const dungeonSpots = [
      { id: "first", name: "始まりの迷宮", minDist: 6 },
      { id: "forest", name: "妖精の森窟", minDist: 10 },
      { id: "fire", name: "灼熱の坑道", minDist: 12 },
      { id: "abyss", name: "深淵の迷宮", minDist: 15 },
    ];

    for (const spot of dungeonSpots) {
      const pos = this.findDistantFromAll(spot.minDist, candidates);
      this.addPOI(pos[0], pos[1], "dungeon", spot.id, spot.name);
    }
  }

  private addPOI(x: number, y: number, type: "town" | "dungeon", id: string, name: string): void {
    this.pois.push({ x, y, type, id, name });
    // Make sure POI tile is walkable grass
    this.tiles[x][y] = { ...TERRAIN.grass };
  }

  private getGrassTiles(): [number, number][] {
    const result: [number, number][] = [];
    for (let x = 2; x < this.width - 2; x++) {
      for (let y = 2; y < this.height - 2; y++) {
        if (this.tiles[x][y].walkable) {
          result.push([x, y]);
        }
      }
    }
    return result;
  }

  private findNearestGrass(cx: number, cy: number, tiles: [number, number][]): [number, number] {
    let best = tiles[0];
    let bestDist = Infinity;
    for (const [x, y] of tiles) {
      const d = Math.abs(x - cx) + Math.abs(y - cy);
      if (d < bestDist) {
        bestDist = d;
        best = [x, y];
      }
    }
    return best;
  }

  private findDistantGrass(
    fx: number,
    fy: number,
    minDist: number,
    tiles: [number, number][],
  ): [number, number] {
    const valid = tiles.filter(([x, y]) => {
      const d = Math.abs(x - fx) + Math.abs(y - fy);
      return d >= minDist && d < minDist + 15;
    });
    if (valid.length === 0) return this.findNearestGrass(fx + minDist, fy, tiles);
    return valid[Math.floor(ROT.RNG.getUniform() * valid.length)];
  }

  private findDistantFromAll(minDist: number, tiles: [number, number][]): [number, number] {
    const valid = tiles.filter(([x, y]) => {
      return this.pois.every((poi) => {
        const d = Math.abs(x - poi.x) + Math.abs(y - poi.y);
        return d >= minDist;
      });
    });
    if (valid.length === 0) {
      // Relax constraint
      return this.findDistantFromAll(Math.floor(minDist * 0.7), tiles);
    }
    return valid[Math.floor(ROT.RNG.getUniform() * valid.length)];
  }

  private buildRoads(): void {
    // Connect towns with roads
    const towns = this.pois.filter((p) => p.type === "town");
    if (towns.length < 2) return;

    // Connect all POIs to nearest town
    for (const poi of this.pois) {
      let nearest = towns[0];
      let bestDist = Infinity;
      for (const t of towns) {
        if (t === poi) continue;
        const d = Math.abs(t.x - poi.x) + Math.abs(t.y - poi.y);
        if (d < bestDist) {
          bestDist = d;
          nearest = t;
        }
      }
      this.drawRoad(poi.x, poi.y, nearest.x, nearest.y);
    }

    // Also connect towns to each other
    for (let i = 0; i < towns.length - 1; i++) {
      this.drawRoad(towns[i].x, towns[i].y, towns[i + 1].x, towns[i + 1].y);
    }
  }

  private drawRoad(x1: number, y1: number, x2: number, y2: number): void {
    let cx = x1;
    let cy = y1;
    while (cx !== x2 || cy !== y2) {
      if (this.tiles[cx][cy].char !== "." || !this.tiles[cx][cy].walkable) {
        // Don't overwrite water/mountain, but make them passable roads
      }
      // Only draw road on walkable tiles (don't create bridges)
      if (this.tiles[cx][cy].walkable && !this.pois.some((p) => p.x === cx && p.y === cy)) {
        this.tiles[cx][cy] = { ...TERRAIN.road };
      }
      // Move toward target
      if (Math.abs(x2 - cx) > Math.abs(y2 - cy)) {
        cx += cx < x2 ? 1 : -1;
      } else {
        cy += cy < y2 ? 1 : -1;
      }
    }
  }

  onMove(dx: number, dy: number, game: Game): boolean {
    const nx = this.playerWorldX + dx;
    const ny = this.playerWorldY + dy;

    if (nx < 0 || nx >= this.width || ny < 0 || ny >= this.height) return false;
    if (!this.tiles[nx][ny].walkable) return false;

    // Check for enemy at destination
    const enemy = this.getWorldEnemyAt(nx, ny);
    if (enemy) {
      this.fightWorldEnemy(game, enemy);
      this.worldEnemyTurn();
      this.consumeHunger(game);
      return true;
    }

    this.playerWorldX = nx;
    this.playerWorldY = ny;
    game.player.placeOnMap(nx, ny);

    this.worldEnemyTurn();
    this.forage(game, nx, ny);
    this.consumeHunger(game);

    // Check if enemy walked into player
    const attacker = this.getWorldEnemyAt(nx, ny);
    if (attacker) {
      this.enemyAttacksPlayer(game, attacker);
    }

    // Check dropped loot
    this.pickupLoot(game, nx, ny);

    // Check POI
    const poi = this.pois.find((p) => p.x === nx && p.y === ny);
    if (poi) {
      game.addMessage(`${poi.name}に到着した`);
      if (poi.type === "dungeon") {
        const ddef = DUNGEON_DEFS.find((d) => d.id === poi.id);
        if (ddef) {
          game.addMessage(`${ddef.floors}階層 / ${ddef.description}`);
        }
      }
    }

    return true;
  }

  private consumeHunger(game: Game): void {
    const p = game.player;
    p.hunger -= HUNGER_COST_PER_TURN;
    if (p.hunger < 0) p.hunger = 0;
    if (p.hunger === 0) {
      p.hp -= 3;
      game.addMessage("空腹で3ダメージ！");
      if (p.hp <= 0) {
        p.hp = 0;
        game.gameOver();
      }
    }
  }

  onWait(game: Game): void {
    // Resting on world map
    const p = game.player;
    if (p.hp < p.maxHp && p.hunger > 0) {
      const heal = Math.min(3, p.maxHp - p.hp);
      p.hp += heal;
      p.hunger = Math.max(0, p.hunger - 1);
      game.addMessage(`休息してHP${heal}回復（満腹-1）`);
    }
    this.worldEnemyTurn();
    this.consumeHunger(game);

    // Check if enemy walked into player
    const attacker = this.getWorldEnemyAt(this.playerWorldX, this.playerWorldY);
    if (attacker) {
      this.enemyAttacksPlayer(game, attacker);
    }
  }

  onDescend(game: Game): boolean {
    // Enter POI at current position
    const poi = this.pois.find((p) => p.x === this.playerWorldX && p.y === this.playerWorldY);
    if (!poi) return false;

    if (poi.type === "town") {
      game.enterTown(poi.id);
      return true;
    }
    if (poi.type === "dungeon") {
      game.enterDungeon(poi.id);
      return true;
    }
    return false;
  }

  dropLoot(game: Game): void {
    const p = game.player;
    const materials: Record<string, number> = {};
    for (const [id, count] of p.materials) {
      materials[id] = count;
    }

    const hasStuff = p.ownedEquipment.length > 0 || Object.keys(materials).length > 0;

    if (hasStuff) {
      this.droppedLoots.push({
        x: this.playerWorldX,
        y: this.playerWorldY,
        weaponId: p.weapon?.id ?? null,
        armorId: p.armor?.id ?? null,
        accessoryId: p.accessory?.id ?? null,
        equipmentIds: p.ownedEquipment.map((e) => e.id),
        materials,
      });
    }

    // Strip player of items
    p.weapon = null;
    p.armor = null;
    p.accessory = null;
    p.ownedEquipment = [];
    p.materials.clear();
    p.recalcStats();
  }

  private pickupLoot(game: Game, x: number, y: number): void {
    const idx = this.droppedLoots.findIndex((l) => l.x === x && l.y === y);
    if (idx < 0) return;

    const loot = this.droppedLoots[idx];
    const p = game.player;

    // Recover all owned equipment
    let eqCount = 0;
    for (const eqId of loot.equipmentIds ?? []) {
      if (EQUIPMENT_DEFS[eqId] && !p.ownedEquipment.some((e) => e.id === eqId)) {
        p.ownedEquipment.push(EQUIPMENT_DEFS[eqId]);
        eqCount++;
      }
    }

    // Re-equip what was worn
    if (loot.weaponId && EQUIPMENT_DEFS[loot.weaponId]) {
      p.weapon = EQUIPMENT_DEFS[loot.weaponId];
    }
    if (loot.armorId && EQUIPMENT_DEFS[loot.armorId]) {
      p.armor = EQUIPMENT_DEFS[loot.armorId];
    }
    if (loot.accessoryId && EQUIPMENT_DEFS[loot.accessoryId]) {
      p.accessory = EQUIPMENT_DEFS[loot.accessoryId];
    }
    p.recalcStats();

    if (eqCount > 0) {
      game.addMessage(`装備${eqCount}個を回収した！`);
    }

    // Recover materials
    let matCount = 0;
    for (const [matId, count] of Object.entries(loot.materials)) {
      p.addMaterial(matId, count);
      matCount += count;
    }
    if (matCount > 0) {
      game.addMessage(`素材${matCount}個を回収した！`);
    }

    this.droppedLoots.splice(idx, 1);
    game.addMessage("落としたアイテムを全て回収した！");
  }

  private forage(game: Game, x: number, y: number): void {
    const tile = this.tiles[x][y];
    if (tile.char === "T") {
      // Forest: chance to find nuts/berries
      if (Math.random() < 0.15) {
        const amount = 10 + Math.floor(Math.random() * 20);
        game.player.hunger = Math.min(game.player.maxHunger, game.player.hunger + amount);
        game.addMessage(`樹の実を見つけた！ 満腹+${amount}`);
      }
    } else if (tile.char === "." && tile.fg === "#44aa44") {
      // Grass: rare chance for wild herbs
      if (Math.random() < 0.03) {
        game.player.hunger = Math.min(game.player.maxHunger, game.player.hunger + 8);
        game.addMessage("野草を見つけた！ 満腹+8");
      }
    }
  }

  private spawnWorldEnemies(): void {
    const count = 12;
    for (let i = 0; i < count; i++) {
      const pos = this.findEnemySpawnPos();
      if (!pos) continue;

      // Pick enemy type: mostly bandits and wolves, rare boss bandit
      const roll = Math.random();
      let def: WorldEnemyDef;
      if (roll < 0.45) {
        def = WORLD_ENEMY_DEFS[0]; // 野盗
      } else if (roll < 0.85) {
        def = WORLD_ENEMY_DEFS[2]; // 野狼
      } else {
        def = WORLD_ENEMY_DEFS[1]; // 野盗の頭
      }

      this.worldEnemies.push({
        x: pos[0],
        y: pos[1],
        def,
        hp: def.hp,
        alive: true,
        respawnTimer: 0,
      });
    }
  }

  private findEnemySpawnPos(): [number, number] | null {
    for (let attempt = 0; attempt < 50; attempt++) {
      const x = 2 + Math.floor(Math.random() * (this.width - 4));
      const y = 2 + Math.floor(Math.random() * (this.height - 4));
      if (!this.tiles[x][y].walkable) continue;
      // Not too close to POIs
      const nearPoi = this.pois.some((p) => Math.abs(p.x - x) + Math.abs(p.y - y) < 5);
      if (nearPoi) continue;
      // Not on another enemy
      if (this.worldEnemies.some((e) => e.alive && e.x === x && e.y === y)) continue;
      return [x, y];
    }
    return null;
  }

  private getWorldEnemyAt(x: number, y: number): WorldEnemy | undefined {
    return this.worldEnemies.find((e) => e.alive && e.x === x && e.y === y);
  }

  private fightWorldEnemy(game: Game, enemy: WorldEnemy): void {
    const p = game.player;
    // Player attacks
    const playerDmg = Math.max(1, p.attack - enemy.def.defense);
    enemy.hp -= playerDmg;
    game.addMessage(`${enemy.def.name}に${playerDmg}ダメージ！`);

    if (enemy.hp <= 0) {
      enemy.alive = false;
      enemy.respawnTimer = 30 + Math.floor(Math.random() * 20);
      game.addMessage(`${enemy.def.name}を倒した！`);
      return;
    }

    // Enemy counterattacks
    this.enemyAttacksPlayer(game, enemy);
  }

  private enemyAttacksPlayer(game: Game, enemy: WorldEnemy): void {
    const p = game.player;
    const enemyDmg = p.takeDamage(enemy.def.attack);
    game.addMessage(`${enemy.def.name}の攻撃！ ${enemyDmg}ダメージ`);
    if (!p.isAlive()) {
      game.gameOver();
    }
  }

  private worldEnemyTurn(): void {
    for (const enemy of this.worldEnemies) {
      if (!enemy.alive) {
        // Handle respawn timer
        if (enemy.respawnTimer > 0) {
          enemy.respawnTimer--;
          if (enemy.respawnTimer === 0) {
            const pos = this.findEnemySpawnPos();
            if (pos) {
              enemy.x = pos[0];
              enemy.y = pos[1];
              enemy.hp = enemy.def.hp;
              enemy.alive = true;
            } else {
              enemy.respawnTimer = 10; // Try again later
            }
          }
        }
        continue;
      }

      // Chase if close to player, otherwise wander
      const dist = Math.abs(enemy.x - this.playerWorldX) + Math.abs(enemy.y - this.playerWorldY);
      let nx: number;
      let ny: number;

      if (dist <= 8) {
        // Chase player
        const dx = Math.sign(this.playerWorldX - enemy.x);
        const dy = Math.sign(this.playerWorldY - enemy.y);
        nx = enemy.x + dx;
        ny = enemy.y + dy;
      } else {
        // Wander randomly
        const dirs = [
          [0, 1],
          [0, -1],
          [1, 0],
          [-1, 0],
        ];
        const dir = dirs[Math.floor(Math.random() * dirs.length)];
        nx = enemy.x + dir[0];
        ny = enemy.y + dir[1];
      }

      // Validate move
      if (
        nx >= 0 &&
        nx < this.width &&
        ny >= 0 &&
        ny < this.height &&
        this.tiles[nx][ny].walkable &&
        !this.pois.some((p) => p.x === nx && p.y === ny) &&
        !this.worldEnemies.some((e) => e !== enemy && e.alive && e.x === nx && e.y === ny)
      ) {
        enemy.x = nx;
        enemy.y = ny;
      }
    }
  }

  render(display: ROT.Display, game: Game): void {
    const p = game.player;
    const camX = Math.max(
      0,
      Math.min(this.width - MAP_WIDTH, this.playerWorldX - Math.floor(MAP_WIDTH / 2)),
    );
    const camY = Math.max(
      0,
      Math.min(this.height - MAP_HEIGHT, this.playerWorldY - Math.floor(MAP_HEIGHT / 2)),
    );

    for (let sx = 0; sx < MAP_WIDTH; sx++) {
      for (let sy = 0; sy < MAP_HEIGHT; sy++) {
        const wx = camX + sx;
        const wy = camY + sy;

        if (wx < 0 || wx >= this.width || wy < 0 || wy >= this.height) {
          display.draw(sx, sy, " ", "#000", "#000");
          continue;
        }

        const tile = this.tiles[wx][wy];
        let ch = tile.char;
        let fg = tile.fg;
        const bg = "#111118";

        // Draw POI markers
        const poi = this.pois.find((pp) => pp.x === wx && pp.y === wy);
        if (poi) {
          if (poi.type === "town") {
            ch = "*";
            fg = "#ffcc00";
          } else {
            ch = "D";
            fg = "#ff6644";
          }
        }

        display.draw(sx, sy, ch, fg, bg);
      }
    }

    // Draw dropped loot
    for (const loot of this.droppedLoots) {
      const lsx = loot.x - camX;
      const lsy = loot.y - camY;
      if (lsx >= 0 && lsx < MAP_WIDTH && lsy >= 0 && lsy < MAP_HEIGHT) {
        display.draw(lsx, lsy, "!", "#ff44ff", "#111118");
      }
    }

    // Draw world enemies
    for (const enemy of this.worldEnemies) {
      if (!enemy.alive) continue;
      const esx = enemy.x - camX;
      const esy = enemy.y - camY;
      if (esx >= 0 && esx < MAP_WIDTH && esy >= 0 && esy < MAP_HEIGHT) {
        display.draw(esx, esy, enemy.def.char, enemy.def.color, "#111118");
      }
    }

    // Draw player
    const psx = p.x - camX;
    const psy = p.y - camY;
    if (psx >= 0 && psx < MAP_WIDTH && psy >= 0 && psy < MAP_HEIGHT) {
      display.draw(psx, psy, "@", COLOR_PLAYER, null);
    }
  }

  getStatusHTML(game: Game): string {
    const p = game.player;
    const poi = this.pois.find((pp) => pp.x === this.playerWorldX && pp.y === this.playerWorldY);
    const locStr = poi
      ? `<span style="color:#ffcc00">${poi.name}</span>  [Enter]で入る`
      : "ワールドマップ";

    return (
      `<span class="hp-color">HP:${p.hp}/${p.maxHp}</span>  ` +
      `<span class="fuel-color">満腹:${p.hunger}</span>  ` +
      `<span class="floor-color">${locStr}</span>`
    );
  }
}
