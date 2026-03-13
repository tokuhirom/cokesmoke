import { Display } from "../ui/Display";
import { TouchInput } from "../ui/TouchInput";
import { Dungeon } from "./Dungeon";
import { Player } from "./Player";
import { Enemy, spawnEnemies } from "./Enemy";
import { ItemInstance, spawnItems } from "./Item";
import { TOTAL_FLOORS } from "../constants";

export type GameState = "playing" | "gameover" | "win";

export class Game {
  display!: Display;
  dungeon!: Dungeon;
  player!: Player;
  enemies: Enemy[] = [];
  items: ItemInstance[] = [];
  currentFloor = 1;
  state: GameState = "playing";
  messages: string[] = [];
  input!: TouchInput;

  init(): void {
    this.display = new Display();
    this.input = new TouchInput(this);
    this.startNewGame();
  }

  startNewGame(): void {
    this.currentFloor = 1;
    this.state = "playing";
    this.messages = ["地下坑道への入口に立っている..."];
    this.player = new Player(this);
    this.generateFloor();
    this.render();
  }

  generateFloor(): void {
    this.dungeon = new Dungeon(this, this.currentFloor);
    this.dungeon.generate();
    this.player.placeOnMap(this.dungeon.startX, this.dungeon.startY);
    this.enemies = spawnEnemies(this, this.currentFloor);
    this.items = spawnItems(this, this.currentFloor);
    this.player.computeFOV();
    this.addMessage(`--- ${this.currentFloor}階 ---`);
  }

  nextFloor(): void {
    if (this.currentFloor >= TOTAL_FLOORS) {
      this.state = "win";
      this.addMessage("地上への出口を見つけた！脱出成功！");
      this.render();
      return;
    }
    this.currentFloor++;
    this.generateFloor();
    this.render();
  }

  pickupItem(x: number, y: number): void {
    const item = this.items.find(i => !i.picked && i.x === x && i.y === y);
    if (item) {
      item.picked = true;
      item.def.effect(this);
    }
  }

  getEnemyAt(x: number, y: number): Enemy | undefined {
    return this.enemies.find(e => e.isAlive() && e.x === x && e.y === y);
  }

  processEnemyTurns(): void {
    for (const enemy of this.enemies) {
      if (enemy.isAlive()) {
        enemy.act();
        if (this.state !== "playing") return;
      }
    }
  }

  addMessage(msg: string): void {
    this.messages.push(msg);
    if (this.messages.length > 50) this.messages.shift();
  }

  render(): void {
    this.display.render(this);
  }

  gameOver(): void {
    this.state = "gameover";
    this.addMessage("蒸気義肢が停止した... ゲームオーバー");
    this.render();
  }
}
