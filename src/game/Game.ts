import { Display } from "../ui/Display";
import { TouchInput } from "../ui/TouchInput";
import { Dungeon } from "./Dungeon";
import { Player } from "./Player";
import { Enemy, spawnEnemies } from "./Enemy";
import { ItemInstance, spawnItems } from "./Item";
import { TOTAL_FLOORS } from "../constants";

export type GameState = "title" | "help" | "playing" | "gameover" | "win";

export class Game {
  display!: Display;
  dungeon!: Dungeon;
  player!: Player;
  enemies: Enemy[] = [];
  items: ItemInstance[] = [];
  currentFloor = 1;
  state: GameState = "title";
  messages: string[] = [];
  input!: TouchInput;

  init(): void {
    this.display = new Display();
    this.input = new TouchInput(this);
    this.showTitle();
  }

  showTitle(): void {
    this.state = "title";
    const overlay = document.getElementById("overlay")!;
    overlay.classList.remove("hidden");
    overlay.innerHTML = `
      <h1>COALSMOKE</h1>
      <div class="subtitle">Steampunk Roguelike</div>
      <button class="menu-btn" id="btn-start">探索開始</button>
      <button class="menu-btn secondary" id="btn-help">遊び方</button>
    `;
    document.getElementById("btn-start")!.addEventListener("click", () => {
      this.startNewGame();
    });
    document.getElementById("btn-help")!.addEventListener("click", () => {
      this.showHelp();
    });
  }

  showHelp(): void {
    this.state = "help";
    const overlay = document.getElementById("overlay")!;
    overlay.classList.remove("hidden");
    overlay.innerHTML = `
      <div id="help-content">
        <h2>世界観</h2>
        <p>蒸気文明が発達した地下都市。蒸気義肢を持つ探索者として、
        地上への出口を目指し10階層の坑道を進む。</p>

        <h2>操作方法</h2>
        <table>
          <tr><td>移動</td><td>8方向D-pad / スワイプ / 矢印キー</td></tr>
          <tr><td>斜め</td><td>D-pad斜めボタン / 斜めスワイプ / YUBN</td></tr>
          <tr><td>待機</td><td>D-pad中央 / タップ / .キー</td></tr>
          <tr><td>階段</td><td>> キー / 階段ボタン</td></tr>
          <tr><td>スキル</td><td>1-3キー / スキルボタン</td></tr>
          <tr><td>攻撃</td><td>敵の方向に移動（斜めもOK）</td></tr>
        </table>

        <h2>蒸気圧 (SP)</h2>
        <p>毎ターン自動回復する。SPが高いほど攻撃力にボーナス。
        蒸気管(<span style="color:#88ccff">\u2261</span>)の上でさらに回復。
        スキル使用で消費する。</p>

        <h2>燃料</h2>
        <p>毎ターン1ずつ減少する。0になると蒸気義肢が停止し
        ゲームオーバー。石炭袋(<span style="color:#44ff88">\u2666</span>)を拾って補給しよう。</p>

        <h2>マップ記号</h2>
        <table>
          <tr><td style="color:#e94560">@</td><td>あなた（探索者）</td></tr>
          <tr><td style="color:#4a4a6a">\u2588</td><td>壁（鉄板）</td></tr>
          <tr><td style="color:#88ccff">\u2261</td><td>蒸気管（踏むとSP回復）</td></tr>
          <tr><td style="color:#ffcc00">></td><td>階段（次の階層へ）</td></tr>
          <tr><td style="color:#44ff88">\u2666 ! / [ ~ + ?</td><td>アイテム各種</td></tr>
          <tr><td style="color:#ff4444">g s B W</td><td>敵</td></tr>
        </table>

        <h2>敵</h2>
        <table>
          <tr><td style="color:#ff4444">g</td><td>ゴーレム兵 - 低速・高耐久</td></tr>
          <tr><td style="color:#ff4444">s</td><td>蒸気スパイダー - 高速・群れ</td></tr>
          <tr><td style="color:#ff4444">B</td><td>ボイラーブルート - 3F以降出現</td></tr>
          <tr><td style="color:#ff4444">W</td><td>霧の番人 - ボス(5F/10F)</td></tr>
        </table>

        <h2>アイテム</h2>
        <table>
          <tr><td style="color:#44ff88">\u2666</td><td>石炭袋 - 燃料+50</td></tr>
          <tr><td style="color:#44ff88">!</td><td>圧力弁 - SP上限+20</td></tr>
          <tr><td style="color:#44ff88">/</td><td>蒸気ランス - 攻撃力+3</td></tr>
          <tr><td style="color:#44ff88">[</td><td>鉄板鎧 - 防御力+2</td></tr>
          <tr><td style="color:#44ff88">~</td><td>潤滑油 - SP全回復</td></tr>
          <tr><td style="color:#44ff88">+</td><td>修理キット - HP+25</td></tr>
          <tr><td style="color:#44ff88">?</td><td>設計図 - スキル習得</td></tr>
        </table>

        <h2>スキル (設計図で習得・最大3つ)</h2>
        <table>
          <tr><td>蒸気噴射</td><td>前方2マスにダメージ (20SP)</td></tr>
          <tr><td>緊急弁開放</td><td>SP全消費→周囲に大ダメージ</td></tr>
          <tr><td>装甲展開</td><td>1ターン無敵 (15SP)</td></tr>
          <tr><td>煙幕</td><td>周囲の敵が見失う (10SP)</td></tr>
        </table>

        <h2>ヒント</h2>
        <p>・石炭袋を優先的に拾おう。燃料切れ＝即死<br>
        ・蒸気管の上を通ってSPを回復<br>
        ・SPが高い時に攻撃するとボーナスダメージ<br>
        ・煙幕で逃走、装甲展開でピンチを凌ごう<br>
        ・5Fと10Fにボスが出現する</p>

        <div class="back-btn-wrap">
          <button class="menu-btn secondary" id="btn-back">戻る</button>
        </div>
      </div>
    `;
    document.getElementById("btn-back")!.addEventListener("click", () => {
      this.showTitle();
    });
  }

  private hideOverlay(): void {
    document.getElementById("overlay")!.classList.add("hidden");
  }

  startNewGame(): void {
    this.hideOverlay();
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
    const item = this.items.find((i) => !i.picked && i.x === x && i.y === y);
    if (item) {
      item.picked = true;
      item.def.effect(this);
    }
  }

  getEnemyAt(x: number, y: number): Enemy | undefined {
    return this.enemies.find((e) => e.isAlive() && e.x === x && e.y === y);
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
