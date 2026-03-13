import * as ROT from "rot-js";
import type { Game } from "../game/Game";
import {
  MAP_WIDTH,
  MAP_HEIGHT,
  FONT_SIZE,
  COLOR_WALL,
  COLOR_FLOOR,
  COLOR_STEAM_PIPE,
  COLOR_STAIRS,
  COLOR_PLAYER,
  COLOR_EXPLORED,
} from "../constants";
import { Dungeon } from "../game/Dungeon";

export class Display {
  rotDisplay: ROT.Display;

  constructor() {
    const container = document.getElementById("game-container")!;
    this.rotDisplay = new ROT.Display({
      width: MAP_WIDTH,
      height: MAP_HEIGHT,
      fontSize: FONT_SIZE,
      fontFamily: "monospace",
      bg: "#1a1a2e",
    });
    container.appendChild(this.rotDisplay.getContainer()!);
  }

  render(game: Game): void {
    this.rotDisplay.clear();
    this.renderMap(game);
    this.renderStatusBar(game);
    this.renderMessages(game);
  }

  private renderMap(game: Game): void {
    const dungeon = game.dungeon;
    const player = game.player;

    for (let x = 0; x < MAP_WIDTH; x++) {
      for (let y = 0; y < MAP_HEIGHT; y++) {
        const key = Dungeon.key(x, y);
        const tile = dungeon.getTile(x, y);
        if (!tile) continue;

        const visible = player.visibleTiles.has(key);
        const explored = tile.explored;

        if (!visible && !explored) continue;

        let fg: string;
        if (!visible) {
          fg = COLOR_EXPLORED;
        } else {
          switch (tile.char) {
            case "\u2588":
              fg = COLOR_WALL;
              break;
            case "\u2261":
              fg = COLOR_STEAM_PIPE;
              break;
            case ">":
              fg = COLOR_STAIRS;
              break;
            default:
              fg = COLOR_FLOOR;
              break;
          }
        }

        this.rotDisplay.draw(x, y, tile.char, fg, null);
      }
    }

    // Draw player
    this.rotDisplay.draw(player.x, player.y, player.char, COLOR_PLAYER, null);
  }

  private renderStatusBar(game: Game): void {
    const p = game.player;
    const el = document.getElementById("status-bar")!;

    const hpBar = this.makeBar(p.hp, p.maxHp, "\u2588", "\u2591");
    const spBar = this.makeBar(p.sp, p.maxSp, "=", "-");

    el.innerHTML =
      `HP:${hpBar} ${p.hp}/${p.maxHp}  燃料:${p.fuel}  ${game.currentFloor}F<br>` +
      `SP:[${spBar}] ${p.sp}/${p.maxSp}`;
  }

  private makeBar(current: number, max: number, fillChar: string, emptyChar: string): string {
    const width = 8;
    const filled = Math.round((current / max) * width);
    return fillChar.repeat(filled) + emptyChar.repeat(width - filled);
  }

  private renderMessages(game: Game): void {
    const el = document.getElementById("message-log")!;
    const last2 = game.messages.slice(-2);
    el.textContent = last2.join("\n");
  }
}
