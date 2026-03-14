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
    this.setupDpad();
  }

  private isInputBlocked(): boolean {
    return this.game.tutorial?.pendingDialog != null;
  }

  private doMove(dx: number, dy: number): void {
    if (!this.game.isPlayable() || this.isInputBlocked()) return;
    if (!this.game.currentScene) return;
    this.game.currentScene.onMove(dx, dy, this.game);
    this.game.render();
  }

  private setupKeyboard(): void {
    window.addEventListener("keydown", (e) => {
      if (this.game.state === "title" || this.game.state === "help") return;
      if (this.game.state === "gameover" || this.game.state === "win") {
        if (e.key === "Enter") this.game.showTitle();
        return;
      }

      if (this.isInputBlocked()) return;

      // Minimap toggle (Tab key)
      if (e.key === "Tab") {
        if (this.game.state === "dungeon" && this.game.dungeonScene) {
          this.game.dungeonScene.toggleMinimap();
          this.game.render();
        } else if (this.game.state === "world" && this.game.worldScene) {
          this.game.worldScene.toggleMinimap();
          this.game.render();
        }
        e.preventDefault();
        return;
      }

      // Skill keys: 1, 2, 3 (only in dungeon)
      if (this.game.state === "dungeon" && e.key >= "1" && e.key <= "3") {
        const idx = parseInt(e.key) - 1;
        if (useSkill(this.game, idx)) {
          this.game.render();
        }
        e.preventDefault();
        return;
      }

      // Game menu (e, i, or m)
      if (e.key === "e" || e.key === "i" || e.key === "m") {
        this.game.showGameMenu();
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
        case "y":
          dx = -1;
          dy = -1;
          break;
        case "u":
          dx = 1;
          dy = -1;
          break;
        case "b":
          dx = -1;
          dy = 1;
          break;
        case "n":
          dx = 1;
          dy = 1;
          break;
        case ".":
        case "5":
          if (this.game.currentScene) {
            this.game.currentScene.onWait(this.game);
            this.game.render();
          }
          return;
        case ">":
          if (this.game.currentScene) {
            this.game.currentScene.onDescend(this.game);
            this.game.render();
          }
          return;
        default:
          return;
      }

      e.preventDefault();
      if (dx !== 0 || dy !== 0) {
        this.doMove(dx, dy);
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
      if (!this.game.isPlayable()) {
        if (this.game.state === "gameover" || this.game.state === "win") {
          this.game.showTitle();
        }
        return;
      }

      const touch = e.changedTouches[0];
      const diffX = touch.clientX - this.startX;
      const diffY = touch.clientY - this.startY;

      if (Math.abs(diffX) < MIN_SWIPE && Math.abs(diffY) < MIN_SWIPE) {
        if (this.game.currentScene) {
          this.game.currentScene.onWait(this.game);
          this.game.render();
        }
        return;
      }

      const angle = Math.atan2(diffY, diffX);
      const [dx, dy] = this.angleToDir(angle);

      this.doMove(dx, dy);
    });
  }

  private angleToDir(angle: number): [number, number] {
    const deg = (angle * 180) / Math.PI;
    if (deg >= -22.5 && deg < 22.5) return [1, 0];
    if (deg >= 22.5 && deg < 67.5) return [1, 1];
    if (deg >= 67.5 && deg < 112.5) return [0, 1];
    if (deg >= 112.5 && deg < 157.5) return [-1, 1];
    if (deg >= 157.5 || deg < -157.5) return [-1, 0];
    if (deg >= -157.5 && deg < -112.5) return [-1, -1];
    if (deg >= -112.5 && deg < -67.5) return [0, -1];
    if (deg >= -67.5 && deg < -22.5) return [1, -1];
    return [0, 0];
  }

  private setupDpad(): void {
    const dpad = document.getElementById("dpad")!;
    if (!dpad) return;

    const dirs: [string, number, number][] = [
      ["\u2196", -1, -1],
      ["\u2191", 0, -1],
      ["\u2197", 1, -1],
      ["\u2190", -1, 0],
      ["\u00b7", 0, 0],
      ["\u2192", 1, 0],
      ["\u2199", -1, 1],
      ["\u2193", 0, 1],
      ["\u2198", 1, 1],
    ];

    for (const [label, dx, dy] of dirs) {
      const btn = document.createElement("button");
      btn.textContent = label;
      if (dx === 0 && dy === 0) {
        btn.addEventListener("click", () => {
          if (!this.game.isPlayable()) return;
          if (this.game.currentScene) {
            this.game.currentScene.onWait(this.game);
            this.game.render();
          }
        });
      } else {
        btn.addEventListener("click", () => this.doMove(dx, dy));
      }
      dpad.appendChild(btn);
    }
  }

  private setupSkillButtons(): void {
    const skillBar = document.getElementById("skill-bar")!;

    for (let i = 0; i < 3; i++) {
      const btn = document.createElement("button");
      btn.id = `skill-btn-${i}`;
      btn.textContent = `[${i + 1}]---`;
      btn.addEventListener("click", () => {
        if (this.game.state !== "dungeon") return;
        if (useSkill(this.game, i)) {
          this.game.render();
        }
      });
      skillBar.appendChild(btn);
    }

    const descendBtn = document.createElement("button");
    descendBtn.id = "descend-btn";
    descendBtn.className = "descend-btn";
    descendBtn.textContent = "入る>";
    descendBtn.disabled = true;
    descendBtn.addEventListener("click", () => {
      if (!this.game.isPlayable()) return;
      if (this.game.currentScene) {
        this.game.currentScene.onDescend(this.game);
        this.game.render();
      }
    });
    skillBar.appendChild(descendBtn);

    const menuBtn = document.createElement("button");
    menuBtn.className = "wait-btn";
    menuBtn.textContent = "メニュー";
    menuBtn.addEventListener("click", () => {
      if (!this.game.isPlayable()) return;
      this.game.showGameMenu();
    });
    skillBar.appendChild(menuBtn);

    const waitBtn = document.createElement("button");
    waitBtn.className = "wait-btn";
    waitBtn.textContent = "待機";
    waitBtn.addEventListener("click", () => {
      if (!this.game.isPlayable()) return;
      if (this.game.currentScene) {
        this.game.currentScene.onWait(this.game);
        this.game.render();
      }
    });
    skillBar.appendChild(waitBtn);
  }

  updateSkillButtons(): void {
    const p = this.game.player;
    if (!p) return;

    for (let i = 0; i < 3; i++) {
      const btn = document.getElementById(`skill-btn-${i}`) as HTMLButtonElement;
      if (!btn) continue;
      if (this.game.state === "dungeon" && i < p.skills.length) {
        const skill = p.skills[i];
        const cost = skill.spCost === "all" ? "全MP" : `${skill.spCost}MP`;
        btn.textContent = `${skill.name}(${cost})`;
        btn.disabled = false;
      } else {
        btn.textContent = `[${i + 1}]---`;
        btn.disabled = true;
      }
    }

    const descendBtn = document.getElementById("descend-btn") as HTMLButtonElement;
    if (descendBtn) {
      if (this.game.state === "dungeon") {
        const scene = this.game.currentScene as import("../game/scenes/DungeonScene").DungeonScene;
        const tile = scene.dungeon.getTile(p.x, p.y);
        if (tile && tile.char === "<") {
          descendBtn.textContent = "上る<";
        } else if (tile && tile.char === "◎") {
          descendBtn.textContent = "脱出◎";
        } else {
          descendBtn.textContent = "階段>";
        }
        descendBtn.disabled = !(
          tile &&
          (tile.char === ">" || tile.char === "<" || tile.char === "◎")
        );
      } else if (this.game.state === "world") {
        const scene = this.game.currentScene as import("../game/scenes/WorldScene").WorldScene;
        const poi = scene.pois.find(
          (pp) => pp.x === scene.playerWorldX && pp.y === scene.playerWorldY,
        );
        descendBtn.textContent = poi ? `${poi.name}に入る` : "入る>";
        descendBtn.disabled = !poi;
      } else if (this.game.state === "town") {
        descendBtn.textContent = "出る";
        descendBtn.disabled = false;
      } else {
        descendBtn.disabled = true;
      }
    }
  }
}
