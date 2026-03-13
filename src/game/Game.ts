import { Display } from "../ui/Display";
import { TouchInput } from "../ui/TouchInput";
import { Dungeon } from "./Dungeon";
import { Player } from "./Player";
import { TOTAL_FLOORS } from "../constants";

export type GameState = "playing" | "gameover" | "win";

export class Game {
  display!: Display;
  dungeon!: Dungeon;
  player!: Player;
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
