import * as ROT from "rot-js";
import { MAP_WIDTH, MAP_HEIGHT, DUNGEON_WIDTH, DUNGEON_HEIGHT } from "../constants";
import type { Game } from "./Game";

export interface Tile {
  char: string;
  walkable: boolean;
  transparent: boolean;
  explored: boolean;
}

export class Dungeon {
  tiles: Map<string, Tile> = new Map();
  startX = 0;
  startY = 0;
  stairsX = 0;
  stairsY = 0;
  width = DUNGEON_WIDTH;
  height = DUNGEON_HEIGHT;
  game: Game;
  floor: number;

  constructor(game: Game, floor: number) {
    this.game = game;
    this.floor = floor;
  }

  static key(x: number, y: number): string {
    return `${x},${y}`;
  }

  getTile(x: number, y: number): Tile | undefined {
    return this.tiles.get(Dungeon.key(x, y));
  }

  isWalkable(x: number, y: number): boolean {
    const tile = this.getTile(x, y);
    return tile ? tile.walkable : false;
  }

  isTransparent(x: number, y: number): boolean {
    const tile = this.getTile(x, y);
    return tile ? tile.transparent : false;
  }

  generate(): void {
    const digger = new ROT.Map.Digger(DUNGEON_WIDTH, DUNGEON_HEIGHT, {
      roomWidth: [5, 12],
      roomHeight: [4, 8],
      corridorLength: [2, 6],
      dugPercentage: 0.35,
    });

    // Fill everything as wall first
    for (let x = 0; x < DUNGEON_WIDTH; x++) {
      for (let y = 0; y < DUNGEON_HEIGHT; y++) {
        this.tiles.set(Dungeon.key(x, y), {
          char: "\u2588",
          walkable: false,
          transparent: false,
          explored: false,
        });
      }
    }

    // Dig out floors
    digger.create((x, y, value) => {
      if (value === 0) {
        this.tiles.set(Dungeon.key(x, y), {
          char: " ",
          walkable: true,
          transparent: true,
          explored: false,
        });
      }
    });

    // Place stairs and starting position from rooms
    const rooms = digger.getRooms();
    if (rooms.length >= 2) {
      const startRoom = rooms[0];
      this.startX = Math.floor((startRoom.getLeft() + startRoom.getRight()) / 2);
      this.startY = Math.floor((startRoom.getTop() + startRoom.getBottom()) / 2);

      const endRoom = rooms[rooms.length - 1];
      this.stairsX = Math.floor((endRoom.getLeft() + endRoom.getRight()) / 2);
      this.stairsY = Math.floor((endRoom.getTop() + endRoom.getBottom()) / 2);
    }

    // Place stairs
    this.tiles.set(Dungeon.key(this.stairsX, this.stairsY), {
      char: ">",
      walkable: true,
      transparent: true,
      explored: false,
    });

    // Place steam pipes randomly in corridors
    const floorTiles: [number, number][] = [];
    this.tiles.forEach((tile, key) => {
      if (tile.char === " ") {
        const [x, y] = key.split(",").map(Number);
        if (x !== this.startX || y !== this.startY) {
          floorTiles.push([x, y]);
        }
      }
    });

    const pipeCount = Math.floor(floorTiles.length * 0.01);
    for (let i = 0; i < pipeCount; i++) {
      const idx = Math.floor(ROT.RNG.getUniform() * floorTiles.length);
      const [px, py] = floorTiles[idx];
      this.tiles.set(Dungeon.key(px, py), {
        char: "\u2261",
        walkable: true,
        transparent: true,
        explored: false,
      });
      floorTiles.splice(idx, 1);
    }
  }

  generateTutorial(): void {
    // Small hand-crafted map for tutorial (fits on screen)
    const W = MAP_WIDTH;
    const H = MAP_HEIGHT;
    this.width = W;
    this.height = H;

    // Fill with walls
    for (let x = 0; x < W; x++) {
      for (let y = 0; y < H; y++) {
        this.tiles.set(Dungeon.key(x, y), {
          char: "\u2588",
          walkable: false,
          transparent: false,
          explored: false,
        });
      }
    }

    const floor = (x: number, y: number, ch = " ") => {
      this.tiles.set(Dungeon.key(x, y), {
        char: ch,
        walkable: true,
        transparent: true,
        explored: false,
      });
    };

    // Room 1: Start (5x4 at position 2,3)
    for (let x = 2; x <= 6; x++) for (let y = 3; y <= 6; y++) floor(x, y);
    this.startX = 4;
    this.startY = 5;

    // Corridor 1: horizontal
    for (let x = 7; x <= 10; x++) floor(x, 5);

    // Room 2: Item room (5x4 at 11,3)
    for (let x = 11; x <= 15; x++) for (let y = 3; y <= 6; y++) floor(x, y);
    // Magic circle in this room
    floor(13, 4, "\u2261");

    // Corridor 2: horizontal
    for (let x = 16; x <= 19; x++) floor(x, 5);

    // Room 3: Enemy room (5x5 at 20,3)
    for (let x = 20; x <= 24; x++) for (let y = 3; y <= 7; y++) floor(x, y);

    // Corridor 3: horizontal
    for (let x = 25; x <= 28; x++) floor(x, 5);

    // Room 4: Stairs room (5x4 at 29,3)
    for (let x = 29; x <= 33; x++) for (let y = 3; y <= 6; y++) floor(x, y);
    this.stairsX = 31;
    this.stairsY = 5;
    floor(this.stairsX, this.stairsY, ">");
  }

  placeExitPortal(): void {
    this.tiles.set(Dungeon.key(this.stairsX, this.stairsY), {
      char: "◎",
      walkable: true,
      transparent: true,
      explored: false,
    });
  }

  placeUpstairs(): void {
    this.tiles.set(Dungeon.key(this.startX, this.startY), {
      char: "<",
      walkable: true,
      transparent: true,
      explored: false,
    });
  }

  getFloorTiles(): [number, number][] {
    const result: [number, number][] = [];
    this.tiles.forEach((tile, key) => {
      if (tile.walkable) {
        const [x, y] = key.split(",").map(Number);
        result.push([x, y]);
      }
    });
    return result;
  }
}
