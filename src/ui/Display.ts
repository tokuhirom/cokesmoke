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
  }

  private renderMessages(game: Game): void {
    const el = document.getElementById("message-log")!;
    const last2 = game.messages.slice(-2);
    el.textContent = last2.join("\n");
  }
}
