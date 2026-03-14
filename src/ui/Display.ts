import * as ROT from "rot-js";
import type { Game } from "../game/Game";
import { MAP_WIDTH, MAP_HEIGHT, FONT_SIZE } from "../constants";

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

    if (game.currentScene) {
      game.currentScene.render(this.rotDisplay, game);
    }

    // Hide minimap when not in dungeon
    if (game.state !== "dungeon") {
      const minimap = document.getElementById("minimap");
      if (minimap) (minimap as HTMLElement).style.display = "none";
    }

    this.renderStatusBar(game);
    this.renderMessages(game);
    game.input.updateSkillButtons();
  }

  private renderStatusBar(game: Game): void {
    const el = document.getElementById("status-bar")!;
    if (game.currentScene) {
      el.innerHTML = game.currentScene.getStatusHTML(game);
    } else {
      el.innerHTML = "";
    }

    // Visual warnings
    const p = game.player;
    el.classList.toggle("hunger-warning", p.hunger <= 0 && game.isPlayable());
    el.classList.toggle("hunger-low", p.hunger > 0 && p.hunger <= 20 && game.isPlayable());
    el.classList.toggle("hp-critical", p.hp <= p.maxHp * 0.1 && p.hp > 0 && game.isPlayable());
  }

  private renderMessages(game: Game): void {
    const el = document.getElementById("message-log")!;
    const last2 = game.messages.slice(-2);
    el.textContent = last2.join("\n");
  }
}
