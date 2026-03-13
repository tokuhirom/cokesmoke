import type { Game } from "../game/Game";

export class TouchInput {
  private game: Game;
  private startX = 0;
  private startY = 0;

  constructor(game: Game) {
    this.game = game;
    this.setupKeyboard();
    this.setupTouch();
  }

  private setupKeyboard(): void {
    window.addEventListener("keydown", (e) => {
      if (this.game.state !== "playing") {
        if (e.key === "Enter") this.game.startNewGame();
        return;
      }

      let dx = 0, dy = 0;
      switch (e.key) {
        case "ArrowUp": case "k": dy = -1; break;
        case "ArrowDown": case "j": dy = 1; break;
        case "ArrowLeft": case "h": dx = -1; break;
        case "ArrowRight": case "l": dx = 1; break;
        case ".": case "5":
          this.game.player.endTurn();
          this.game.render();
          return;
        case ">":
          if (this.game.player.descend()) return;
          break;
        default: return;
      }

      e.preventDefault();
      if (dx !== 0 || dy !== 0) {
        this.game.player.tryMove(dx, dy);
        this.game.render();
      }
    });
  }

  private setupTouch(): void {
    const container = document.getElementById("game-container")!;
    const MIN_SWIPE = 30;

    container.addEventListener("touchstart", (e) => {
      const touch = e.touches[0];
      this.startX = touch.clientX;
      this.startY = touch.clientY;
    }, { passive: true });

    container.addEventListener("touchend", (e) => {
      if (this.game.state !== "playing") {
        this.game.startNewGame();
        return;
      }

      const touch = e.changedTouches[0];
      const diffX = touch.clientX - this.startX;
      const diffY = touch.clientY - this.startY;

      if (Math.abs(diffX) < MIN_SWIPE && Math.abs(diffY) < MIN_SWIPE) {
        // Tap - wait action
        this.game.player.endTurn();
        this.game.render();
        return;
      }

      let dx = 0, dy = 0;
      if (Math.abs(diffX) > Math.abs(diffY)) {
        dx = diffX > 0 ? 1 : -1;
      } else {
        dy = diffY > 0 ? 1 : -1;
      }

      this.game.player.tryMove(dx, dy);
      this.game.render();
    });
  }
}
