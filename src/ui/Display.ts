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
  COLOR_ENEMY,
  COLOR_ITEM,
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
      forceSquareRatio: true,
      bg: "#1a1a2e",
    });
    container.appendChild(this.rotDisplay.getContainer()!);
  }

  render(game: Game): void {
    this.rotDisplay.clear();
    this.renderMap(game);
    this.renderStatusBar(game);
    this.renderMessages(game);
    game.input.updateSkillButtons();
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
        let bg: string | null = null;
        let ch = tile.char;

        if (!visible) {
          // Explored but not currently visible
          if (tile.char === ">") {
            // Always show stairs once discovered
            fg = "#998800";
            bg = "#0d0d1a";
          } else {
            fg = COLOR_EXPLORED;
            if (tile.walkable) {
              ch = "\u00b7";
            }
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
              fg = COLOR_STAIRS;
              bg = "#1a2030";
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

        this.rotDisplay.draw(x, y, ch, fg, bg);
      }
    }

    // Draw items
    for (const item of game.items) {
      if (!item.picked && player.visibleTiles.has(`${item.x},${item.y}`)) {
        this.rotDisplay.draw(item.x, item.y, item.def.char, COLOR_ITEM, null);
      }
    }

    // Draw enemies
    for (const enemy of game.enemies) {
      if (enemy.isAlive() && player.visibleTiles.has(`${enemy.x},${enemy.y}`)) {
        this.rotDisplay.draw(enemy.x, enemy.y, enemy.char, COLOR_ENEMY, null);
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
    const armorStr = p.armorTurns > 0 ? ' <span style="color:#44ff88">[バリア]</span>' : "";

    el.innerHTML =
      `<span class="hp-color">HP:${hpBar} ${p.hp}/${p.maxHp}</span>  ` +
      `<span class="fuel-color">松明:${p.fuel}</span>  ` +
      `<span class="floor-color">${game.currentFloor === 0 ? "Tutorial" : `${game.currentFloor}F`}</span>${armorStr}<br>` +
      `<span class="sp-color">MP:[${spBar}] ${p.sp}/${p.maxSp}</span>`;
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
