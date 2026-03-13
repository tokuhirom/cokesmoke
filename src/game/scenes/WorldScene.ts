import * as ROT from "rot-js";
import type { Scene } from "./Scene";
import type { Game } from "../Game";
import { MAP_WIDTH, MAP_HEIGHT, COLOR_PLAYER } from "../../constants";

export interface PointOfInterest {
  x: number;
  y: number;
  type: "town" | "dungeon";
  id: string;
  name: string;
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
  private seed: number;

  constructor(seed: number) {
    this.width = 80;
    this.height = 60;
    this.seed = seed;
  }

  onEnter(game: Game): void {
    if (this.tiles.length === 0) {
      this.generate();
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

    this.playerWorldX = nx;
    this.playerWorldY = ny;
    game.player.placeOnMap(nx, ny);

    // Check POI
    const poi = this.pois.find((p) => p.x === nx && p.y === ny);
    if (poi) {
      game.addMessage(`${poi.name}に到着した`);
    }

    return true;
  }

  onWait(_game: Game): void {
    // Nothing happens on world map wait
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
      `<span class="fuel-color">松明:${p.fuel}</span>  ` +
      `<span class="floor-color">${locStr}</span>`
    );
  }
}
