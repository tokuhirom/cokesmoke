import * as ROT from "rot-js";
import { MAP_WIDTH, MAP_HEIGHT } from "../constants";
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
    const digger = new ROT.Map.Digger(MAP_WIDTH, MAP_HEIGHT, {
      roomWidth: [3, 8],
      roomHeight: [3, 5],
      corridorLength: [1, 5],
    });

    // Fill everything as wall first
    for (let x = 0; x < MAP_WIDTH; x++) {
      for (let y = 0; y < MAP_HEIGHT; y++) {
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

    const pipeCount = Math.floor(floorTiles.length * 0.03);
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
