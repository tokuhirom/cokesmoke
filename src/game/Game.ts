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
      <h1>異世界迷宮録</h1>
      <div class="subtitle">Isekai Dungeon Crawl</div>
      <button class="menu-btn" id="btn-start">冒険に出る</button>
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
        <p>気がつくと、見知らぬ迷宮の奥深くにいた。
        手元にあるのは一本のたいまつだけ。
        地上への出口を目指し、10階層の迷宮を踏破せよ。</p>

        <h2>操作方法</h2>
        <table>
          <tr><td>移動</td><td>8方向D-pad / スワイプ / 矢印キー</td></tr>
          <tr><td>斜め</td><td>D-pad斜めボタン / 斜めスワイプ / YUBN</td></tr>
          <tr><td>待機</td><td>D-pad中央 / タップ / .キー</td></tr>
          <tr><td>階段</td><td>> キー / 階段ボタン</td></tr>
          <tr><td>スキル</td><td>1-3キー / スキルボタン</td></tr>
          <tr><td>攻撃</td><td>敵の方向に移動（斜めもOK）</td></tr>
        </table>

        <h2>魔力 (MP)</h2>
        <p>毎ターン自動回復する。MPが高いほど攻撃力にボーナス。
        魔法陣(<span style="color:#88ccff">\u2261</span>)の上でさらに回復。
        スキル使用で消費する。</p>

        <h2>たいまつ</h2>
        <p>毎ターン1ずつ減少する。0になると闇に呑まれ
        ゲームオーバー。たいまつ(<span style="color:#44ff88">\u2666</span>)を拾って補充しよう。</p>

        <h2>マップ記号</h2>
        <table>
          <tr><td style="color:#e94560">@</td><td>あなた（転生者）</td></tr>
          <tr><td style="color:#4a4a6a">\u2588</td><td>壁</td></tr>
          <tr><td style="color:#88ccff">\u2261</td><td>魔法陣（踏むとMP回復）</td></tr>
          <tr><td style="color:#ffcc00">></td><td>階段（次の階層へ）</td></tr>
          <tr><td style="color:#44ff88">\u2666 ! / [ ~ + ?</td><td>アイテム各種</td></tr>
          <tr><td style="color:#ff4444">g s O D</td><td>敵</td></tr>
        </table>

        <h2>敵</h2>
        <table>
          <tr><td style="color:#ff4444">g</td><td>ゴブリン - 低速・高耐久</td></tr>
          <tr><td style="color:#ff4444">s</td><td>スライム - 高速・群れ</td></tr>
          <tr><td style="color:#ff4444">O</td><td>オーク - 3F以降出現</td></tr>
          <tr><td style="color:#ff4444">D</td><td>ドラゴン - ボス(5F/10F)</td></tr>
        </table>

        <h2>アイテム</h2>
        <table>
          <tr><td style="color:#44ff88">\u2666</td><td>たいまつ - 明かり+50</td></tr>
          <tr><td style="color:#44ff88">!</td><td>魔法書 - MP上限+20</td></tr>
          <tr><td style="color:#44ff88">/</td><td>剣 - 攻撃力+3</td></tr>
          <tr><td style="color:#44ff88">[</td><td>鎧 - 防御力+2</td></tr>
          <tr><td style="color:#44ff88">~</td><td>エリクサー - MP全回復</td></tr>
          <tr><td style="color:#44ff88">+</td><td>回復薬 - HP+25</td></tr>
          <tr><td style="color:#44ff88">?</td><td>魔導書 - スキル習得</td></tr>
        </table>

        <h2>スキル (魔導書で習得・最大3つ)</h2>
        <table>
          <tr><td>ファイアボルト</td><td>前方2マスにダメージ (20MP)</td></tr>
          <tr><td>メテオ</td><td>MP全消費→周囲に大ダメージ</td></tr>
          <tr><td>バリア</td><td>1ターン無敵 (15MP)</td></tr>
          <tr><td>テレポート</td><td>周囲の敵が見失う (10MP)</td></tr>
        </table>

        <h2>ヒント</h2>
        <p>・たいまつを優先的に拾おう。明かりが尽きたら即死<br>
        ・魔法陣の上を通ってMPを回復<br>
        ・MPが高い時に攻撃するとボーナスダメージ<br>
        ・テレポートで逃走、バリアでピンチを凌ごう<br>
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
    this.messages = ["目を覚ますと、薄暗い迷宮の中だった..."];
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
    this.addMessage("たいまつが燃え尽き、闇に呑まれた...");
    this.render();
  }
}
