import * as ROT from "rot-js";
import { Entity } from "./Entity";
import type { Game } from "./Game";
import {
  PLAYER_INITIAL_HP,
  PLAYER_INITIAL_SP,
  PLAYER_INITIAL_FUEL,
  SP_REGEN_PER_TURN,
  FUEL_COST_PER_TURN,
  FOV_RADIUS,
  COLOR_PLAYER,
} from "../constants";

export class Player extends Entity {
  sp: number;
  maxSp: number;
  fuel: number;
  visibleTiles: Set<string> = new Set();

  constructor(game: Game) {
    super(game, "@", COLOR_PLAYER, "探索者", PLAYER_INITIAL_HP, 10, 2);
    this.sp = PLAYER_INITIAL_SP;
    this.maxSp = PLAYER_INITIAL_SP;
    this.fuel = PLAYER_INITIAL_FUEL;
  }

  placeOnMap(x: number, y: number): void {
    this.x = x;
    this.y = y;
  }

  computeFOV(): void {
    this.visibleTiles.clear();
    const fov = new ROT.FOV.PreciseShadowcasting((x, y) => {
      return this.game.dungeon.isTransparent(x, y);
    });
    fov.compute(this.x, this.y, FOV_RADIUS, (x, y, _r, visible) => {
      if (visible) {
        const key = `${x},${y}`;
        this.visibleTiles.add(key);
        const tile = this.game.dungeon.getTile(x, y);
        if (tile) tile.explored = true;
      }
    });
  }

  tryMove(dx: number, dy: number): boolean {
    const nx = this.x + dx;
    const ny = this.y + dy;

    if (!this.game.dungeon.isWalkable(nx, ny)) return false;

    this.x = nx;
    this.y = ny;
    this.endTurn();
    return true;
  }

  endTurn(): void {
    // Fuel consumption
    this.fuel -= FUEL_COST_PER_TURN;
    if (this.fuel <= 0) {
      this.fuel = 0;
      this.game.gameOver();
      return;
    }

    // SP regen
    this.sp = Math.min(this.maxSp, this.sp + SP_REGEN_PER_TURN);

    // Check steam pipe
    const tile = this.game.dungeon.getTile(this.x, this.y);
    if (tile && tile.char === "\u2261") {
      this.sp = Math.min(this.maxSp, this.sp + 5);
      this.game.addMessage("蒸気管からSPを回復した");
    }

    // Check stairs
    if (tile && tile.char === ">") {
      this.game.addMessage("階段を見つけた！降りますか？（階段の上でもう一度移動）");
    }

    this.computeFOV();
  }

  descend(): boolean {
    const tile = this.game.dungeon.getTile(this.x, this.y);
    if (tile && tile.char === ">") {
      this.game.nextFloor();
      return true;
    }
    return false;
  }
}
