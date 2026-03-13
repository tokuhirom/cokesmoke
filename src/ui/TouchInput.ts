import type { Game } from "../game/Game";
import { useSkill } from "../game/Skill";

export class TouchInput {
  private game: Game;
  private startX = 0;
  private startY = 0;

  constructor(game: Game) {
    this.game = game;
    this.setupKeyboard();
    this.setupTouch();
    this.setupSkillButtons();
  }

  private setupKeyboard(): void {
    window.addEventListener("keydown", (e) => {
      if (this.game.state === "title" || this.game.state === "help") return;
      if (this.game.state === "gameover" || this.game.state === "win") {
        if (e.key === "Enter") this.game.showTitle();
        return;
      }

      // Skill keys: 1, 2, 3
      if (e.key >= "1" && e.key <= "3") {
        const idx = parseInt(e.key) - 1;
        if (useSkill(this.game, idx)) {
          this.game.render();
        }
        e.preventDefault();
        return;
      }

      let dx = 0,
        dy = 0;
      switch (e.key) {
        case "ArrowUp":
        case "k":
          dy = -1;
          break;
        case "ArrowDown":
        case "j":
          dy = 1;
          break;
        case "ArrowLeft":
        case "h":
          dx = -1;
          break;
        case "ArrowRight":
        case "l":
          dx = 1;
          break;
        case ".":
        case "5":
          this.game.player.endTurn();
          this.game.render();
          return;
        case ">":
          if (this.game.player.descend()) return;
          break;
        default:
          return;
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

    container.addEventListener(
      "touchstart",
      (e) => {
        const touch = e.touches[0];
        this.startX = touch.clientX;
        this.startY = touch.clientY;
      },
      { passive: true },
    );

    container.addEventListener("touchend", (e) => {
      if (this.game.state !== "playing") {
        if (this.game.state === "gameover" || this.game.state === "win") {
          this.game.showTitle();
        }
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

      let dx = 0,
        dy = 0;
      if (Math.abs(diffX) > Math.abs(diffY)) {
        dx = diffX > 0 ? 1 : -1;
      } else {
        dy = diffY > 0 ? 1 : -1;
      }

      this.game.player.tryMove(dx, dy);
      this.game.render();
    });
  }

  private setupSkillButtons(): void {
    const skillBar = document.getElementById("skill-bar")!;

    // Create 3 skill buttons + wait button
    for (let i = 0; i < 3; i++) {
      const btn = document.createElement("button");
      btn.id = `skill-btn-${i}`;
      btn.textContent = `[${i + 1}]---`;
      btn.addEventListener("click", () => {
        if (this.game.state !== "playing") return;
        if (useSkill(this.game, i)) {
          this.game.render();
        }
      });
      skillBar.appendChild(btn);
    }

    const descendBtn = document.createElement("button");
    descendBtn.id = "descend-btn";
    descendBtn.className = "descend-btn";
    descendBtn.textContent = "階段>";
    descendBtn.disabled = true;
    descendBtn.addEventListener("click", () => {
      if (this.game.state !== "playing") return;
      this.game.player.descend();
      this.game.render();
    });
    skillBar.appendChild(descendBtn);

    const waitBtn = document.createElement("button");
    waitBtn.className = "wait-btn";
    waitBtn.textContent = "待機";
    waitBtn.addEventListener("click", () => {
      if (this.game.state !== "playing") return;
      this.game.player.endTurn();
      this.game.render();
    });
    skillBar.appendChild(waitBtn);
  }

  updateSkillButtons(): void {
    const p = this.game.player;
    for (let i = 0; i < 3; i++) {
      const btn = document.getElementById(`skill-btn-${i}`) as HTMLButtonElement;
      if (!btn) continue;
      if (i < p.skills.length) {
        const skill = p.skills[i];
        const cost = skill.spCost === "all" ? "全SP" : `${skill.spCost}SP`;
        btn.textContent = `${skill.name}(${cost})`;
        btn.disabled = false;
      } else {
        btn.textContent = `[${i + 1}]---`;
        btn.disabled = true;
      }
    }

    // Update descend button
    const descendBtn = document.getElementById("descend-btn") as HTMLButtonElement;
    if (descendBtn) {
      const tile = this.game.dungeon.getTile(p.x, p.y);
      descendBtn.disabled = !(tile && tile.char === ">");
    }
  }
}
