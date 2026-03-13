import { Display } from "../ui/Display";
import { TouchInput } from "../ui/TouchInput";
import { Player } from "./Player";
import { Companion } from "./Companion";
import { TutorialManager } from "./Tutorial";
import type { Scene } from "./scenes/Scene";
import { DungeonScene, DUNGEON_DEFS } from "./scenes/DungeonScene";
import { WorldScene } from "./scenes/WorldScene";
import { TownScene, TOWN_DEFS } from "./scenes/TownScene";
import type { NpcDef } from "./scenes/TownScene";

export type GameState =
  | "title"
  | "help"
  | "prologue"
  | "world"
  | "town"
  | "dungeon"
  | "gameover"
  | "win";

const STORAGE_KEY = "isekai_dungeon_tutorial_done";

const PROLOGUE_PAGES = [
  "「...あれ？ 俺、たしか帰り道で...」",
  "目を開けると、冷たい石の床の上だった。\n\nここは...迷宮？\n記憶が曖昧だが、一つだけ確かなことがある\n——元の世界とは違う場所にいる。",
  "手元に一本のたいまつ。\n壁に刻まれた文字が微かに光る。\n\n『10階を踏破せし者に、\n　地上への道が開かれん』\n\n...行くしかない。",
];

export class Game {
  display!: Display;
  player!: Player;
  companion: Companion | null = null;
  state: GameState = "title";
  messages: string[] = [];
  input!: TouchInput;
  tutorial: TutorialManager | null = null;

  // Scene system
  currentScene: Scene | null = null;
  worldScene!: WorldScene;
  dungeonScene: DungeonScene | null = null;
  private townScene: TownScene | null = null;

  // Recruited NPCs that settle in starting village
  recruitedNpcs: NpcDef[] = [];

  // For backward compat with Player/Enemy that reference game.dungeon
  get dungeon() {
    return this.dungeonScene!.dungeon;
  }

  get enemies() {
    return this.dungeonScene?.enemies ?? [];
  }

  get items() {
    return this.dungeonScene?.items ?? [];
  }

  get currentFloor() {
    return this.dungeonScene?.currentFloor ?? 0;
  }

  init(): void {
    this.display = new Display();
    this.input = new TouchInput(this);
    this.showTitle();
  }

  private isTutorialDone(): boolean {
    try {
      return localStorage.getItem(STORAGE_KEY) === "1";
    } catch {
      return false;
    }
  }

  private markTutorialDone(): void {
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // Ignore
    }
  }

  isPlayable(): boolean {
    return this.state === "world" || this.state === "town" || this.state === "dungeon";
  }

  showTitle(): void {
    this.state = "title";
    const overlay = document.getElementById("overlay")!;
    overlay.classList.remove("hidden");

    const tutorialDone = this.isTutorialDone();

    overlay.innerHTML = `
      <h1>異世界迷宮録</h1>
      <div class="subtitle">Isekai Dungeon Crawl</div>
      <button class="menu-btn" id="btn-start">冒険に出る</button>
      ${tutorialDone ? '<button class="menu-btn secondary" id="btn-tutorial">チュートリアル</button>' : ""}
      <button class="menu-btn secondary" id="btn-help">遊び方</button>
      <div class="build-info">${__BUILD_TIME__} / ${__COMMIT_HASH__}</div>
    `;
    document.getElementById("btn-start")!.addEventListener("click", () => {
      if (tutorialDone) {
        this.startNewGame(false);
      } else {
        this.showPrologue();
      }
    });
    if (tutorialDone) {
      document.getElementById("btn-tutorial")!.addEventListener("click", () => {
        this.showPrologue();
      });
    }
    document.getElementById("btn-help")!.addEventListener("click", () => {
      this.showHelp();
    });
  }

  showPrologue(): void {
    this.state = "prologue";
    const overlay = document.getElementById("overlay")!;
    overlay.classList.remove("hidden");

    let pageIndex = 0;
    const renderPage = () => {
      if (pageIndex >= PROLOGUE_PAGES.length) {
        this.startNewGame(true);
        return;
      }
      const text = PROLOGUE_PAGES[pageIndex].replace(/\n/g, "<br>");
      overlay.innerHTML = `
        <div class="prologue-text">
          <p>${text}</p>
          <div class="prologue-tap">${pageIndex < PROLOGUE_PAGES.length - 1 ? "タップで次へ" : "タップして冒険を始める"}</div>
        </div>
      `;
      overlay.onclick = () => {
        pageIndex++;
        renderPage();
      };
    };
    renderPage();
  }

  showHelp(): void {
    this.state = "help";
    const overlay = document.getElementById("overlay")!;
    overlay.classList.remove("hidden");
    overlay.innerHTML = `
      <div id="help-content">
        <h2>世界観</h2>
        <p>気がつくと、見知らぬ村にいた。
        この世界には複数の迷宮が存在し、
        全ての迷宮を踏破した者だけが元の世界に帰れるという。</p>

        <h2>操作方法</h2>
        <table>
          <tr><td>移動</td><td>8方向D-pad / スワイプ / 矢印キー</td></tr>
          <tr><td>斜め</td><td>D-pad斜めボタン / 斜めスワイプ / YUBN</td></tr>
          <tr><td>待機</td><td>D-pad中央 / タップ / .キー</td></tr>
          <tr><td>入る</td><td>> キー / 階段ボタン（街・迷宮に入る）</td></tr>
          <tr><td>スキル</td><td>1-3キー / スキルボタン</td></tr>
          <tr><td>攻撃</td><td>敵の方向に移動（斜めもOK）</td></tr>
        </table>

        <h2>ワールドマップ</h2>
        <p>ランダム生成のワールドを冒険しよう。
        <span style="color:#ffcc00">*</span>=街、
        <span style="color:#ff6644">D</span>=迷宮入口。
        街やダンジョンの上で>キーで入れる。</p>

        <h2>迷宮</h2>
        <p>入るたびに構成が変わる不思議な迷宮。
        たいまつ(<span style="color:#44ff88">\u2666</span>)を拾って明かりを確保しよう。
        最深部に到達すると踏破完了。</p>

        <h2>仲間</h2>
        <p>各地の街で仲間を見つけよう。
        仲間は迷宮で一緒に戦ってくれる。</p>

        <h2>死亡</h2>
        <p>死亡するとスポーン地点（始まりの村）に戻される。
        集めたアイテムは死んだ場所に残される。</p>

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
    const overlay = document.getElementById("overlay")!;
    overlay.classList.add("hidden");
    overlay.onclick = null;
  }

  startNewGame(withTutorial: boolean): void {
    this.hideOverlay();
    this.companion = null;
    this.recruitedNpcs = [];

    this.player = new Player(this);

    if (withTutorial) {
      // Start in tutorial dungeon
      this.tutorial = new TutorialManager(true);
      this.messages = [];
      const tutDungeon = new DungeonScene(DUNGEON_DEFS[0], true);
      this.dungeonScene = tutDungeon;
      this.currentScene = tutDungeon;
      this.state = "dungeon";
      tutDungeon.onEnter(this);
      this.render();

      if (this.tutorial) {
        this.tutorial.check(this);
        if (this.tutorial.pendingDialog) {
          this.showTutorialDialog();
        }
      }
    } else {
      // Start on world map
      this.tutorial = null;
      this.messages = ["目が覚めた...ここは始まりの村の近くだ。"];
      this.worldScene = new WorldScene(Math.floor(Math.random() * 100000));
      this.currentScene = this.worldScene;
      this.state = "world";
      this.worldScene.onEnter(this);
      this.render();
    }
  }

  onTutorialComplete(): void {
    this.markTutorialDone();
    this.tutorial = null;
    this.addMessage("チュートリアル完了！ワールドマップへ...");

    // Transition to world map
    this.worldScene = new WorldScene(Math.floor(Math.random() * 100000));
    this.currentScene = this.worldScene;
    this.state = "world";
    this.worldScene.onEnter(this);
    this.render();
  }

  enterDungeon(dungeonId: string): void {
    const def = DUNGEON_DEFS.find((d) => d.id === dungeonId);
    if (!def) return;

    this.hideOverlay();
    const scene = new DungeonScene(def);
    this.dungeonScene = scene;
    this.currentScene = scene;
    this.state = "dungeon";
    scene.onEnter(this);

    // Place companion in dungeon
    if (this.companion) {
      this.companion.x = this.player.x;
      this.companion.y = this.player.y + 1;
      this.companion.hp = this.companion.maxHp;
    }

    this.render();
  }

  exitDungeon(): void {
    this.dungeonScene = null;
    this.currentScene = this.worldScene;
    this.state = "world";
    this.worldScene.onEnter(this);
    this.render();
  }

  enterTown(townId: string): void {
    const def = TOWN_DEFS.find((t) => t.id === townId);
    if (!def) return;

    const scene = new TownScene(def);
    this.townScene = scene;
    this.currentScene = scene;
    this.state = "town";
    scene.onEnter(this);
    this.render();
  }

  exitTown(): void {
    this.townScene = null;
    this.currentScene = this.worldScene;
    this.state = "world";
    this.worldScene.onEnter(this);
    this.render();
  }

  recruitCompanion(): void {
    if (!this.companion) {
      this.companion = new Companion(this);
    }
  }

  recruitNpc(npc: NpcDef): void {
    if (this.recruitedNpcs.some((n) => n.name === npc.name)) return;
    this.recruitedNpcs.push(npc);
    this.addMessage(`${npc.name}が始まりの村に移住した！`);
  }

  // Backward compat methods used by Enemy/Skill/Tutorial
  getEnemyAt(x: number, y: number) {
    return this.dungeonScene?.getEnemyAt(x, y);
  }

  pickupItem(x: number, y: number): void {
    this.dungeonScene?.pickupItem(this, x, y);
  }

  processEnemyTurns(): void {
    this.dungeonScene?.processEnemyTurns(this);
  }

  addMessage(msg: string): void {
    this.messages.push(msg);
    if (this.messages.length > 50) this.messages.shift();
  }

  render(): void {
    this.display.render(this);

    // Check tutorial triggers after render
    if (this.tutorial?.active && !this.tutorial.pendingDialog) {
      this.tutorial.check(this);
      if (this.tutorial.pendingDialog) {
        this.showTutorialDialog();
      }
    }
  }

  showTutorialDialog(): void {
    if (!this.tutorial?.pendingDialog) return;
    const step = this.tutorial.pendingDialog;
    const overlay = document.getElementById("overlay")!;
    overlay.classList.remove("hidden");

    const text = step.message.replace(/\n/g, "<br>");
    overlay.innerHTML = `
      <div class="tutorial-dialog">
        <p>${text}</p>
        <button class="menu-btn" id="btn-tutorial-ok">了解</button>
      </div>
    `;
    document.getElementById("btn-tutorial-ok")!.addEventListener("click", () => {
      this.tutorial!.advance(this);
      this.hideOverlay();
      this.render();
    });
  }

  gameOver(): void {
    this.state = "gameover";
    this.addMessage("力尽きた...");
    // TODO: drop items at death location, respawn at starting town
    this.render();
  }

  nextFloor(): void {
    this.dungeonScene?.nextFloor(this);
  }
}
