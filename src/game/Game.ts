import { Display } from "../ui/Display";
import { TouchInput } from "../ui/TouchInput";
import { Player } from "./Player";
import { Companion } from "./Companion";
import { TutorialManager } from "./Tutorial";
import { SKILL_DEFS } from "./Skill";
import { EQUIPMENT_DEFS } from "./Equipment";
import type { Scene } from "./scenes/Scene";
import { DungeonScene, DUNGEON_DEFS } from "./scenes/DungeonScene";
import { WorldScene } from "./scenes/WorldScene";
import { TownScene, TOWN_DEFS } from "./scenes/TownScene";
import type { NpcDef } from "./scenes/TownScene";
import {
  listWorlds,
  saveWorld,
  deleteWorld,
  canCreateWorld,
  generateWorldId,
  serializeNpc,
  deserializeNpc,
  type SavedWorld,
} from "./SaveData";

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

  // Current world save
  currentWorldId: string | null = null;
  clearedDungeons: Set<string> = new Set();

  // For backward compat
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

    const worlds = listWorlds();
    const tutorialDone = this.isTutorialDone();

    let html = `
      <h1>異世界迷宮録</h1>
      <div class="subtitle">Isekai Dungeon Crawl</div>
    `;

    // Existing worlds
    if (worlds.length > 0) {
      html += '<div style="width:100%;max-width:300px;margin:8px 0">';
      for (const w of worlds) {
        const date = new Date(w.lastPlayed).toLocaleDateString("ja-JP");
        html += `
          <div style="display:flex;gap:4px;margin:4px 0">
            <button class="menu-btn" style="flex:1;font-size:13px;padding:8px" id="load-${w.id}">
              ${w.name}<br><span style="font-size:10px;color:#888">${date} HP:${w.playerHp}</span>
            </button>
            <button class="menu-btn secondary" style="padding:8px;font-size:11px" id="del-${w.id}">×</button>
          </div>
        `;
      }
      html += "</div>";
    }

    // New world button
    if (canCreateWorld()) {
      html += '<button class="menu-btn" id="btn-new-world">新しい世界を作る</button>';
    }

    if (!tutorialDone) {
      html += '<button class="menu-btn secondary" id="btn-tutorial">チュートリアル</button>';
    }
    html += '<button class="menu-btn secondary" id="btn-help">遊び方</button>';
    html += `<div class="build-info">${__BUILD_TIME__} / ${__COMMIT_HASH__}</div>`;

    overlay.innerHTML = html;

    // Wire up events
    for (const w of worlds) {
      document.getElementById(`load-${w.id}`)!.addEventListener("click", () => {
        this.loadWorld(w);
      });
      document.getElementById(`del-${w.id}`)!.addEventListener("click", () => {
        if (confirm(`「${w.name}」を削除しますか？`)) {
          deleteWorld(w.id);
          this.showTitle();
        }
      });
    }

    if (canCreateWorld()) {
      document.getElementById("btn-new-world")!.addEventListener("click", () => {
        this.showWorldNameInput();
      });
    }

    if (!tutorialDone) {
      document.getElementById("btn-tutorial")!.addEventListener("click", () => {
        this.showPrologue();
      });
    }
    document.getElementById("btn-help")!.addEventListener("click", () => {
      this.showHelp();
    });
  }

  private showWorldNameInput(): void {
    const overlay = document.getElementById("overlay")!;
    overlay.innerHTML = `
      <div class="tutorial-dialog">
        <p>世界の名前を入力</p>
        <input type="text" id="world-name-input" value="世界${listWorlds().length + 1}"
          style="background:#0f3460;color:#e94560;border:1px solid #e94560;padding:8px;
          font-family:monospace;font-size:14px;width:200px;text-align:center;border-radius:4px">
        <br>
        <button class="menu-btn" id="btn-create-world" style="margin-top:12px">作成</button>
        <button class="menu-btn secondary" id="btn-cancel-create">戻る</button>
      </div>
    `;

    document.getElementById("btn-create-world")!.addEventListener("click", () => {
      const input = document.getElementById("world-name-input") as HTMLInputElement;
      const name = input.value.trim() || `世界${listWorlds().length + 1}`;
      this.createNewWorld(name);
    });
    document.getElementById("btn-cancel-create")!.addEventListener("click", () => {
      this.showTitle();
    });
  }

  private createNewWorld(name: string): void {
    const seed = Math.floor(Math.random() * 100000);
    const worldId = generateWorldId();
    this.currentWorldId = worldId;
    this.clearedDungeons = new Set();
    this.companion = null;
    this.recruitedNpcs = [];
    this.player = new Player(this);
    this.tutorial = null;
    this.messages = ["目が覚めた...ここは始まりの村の近くだ。"];
    this.worldScene = new WorldScene(seed);
    this.currentScene = this.worldScene;
    this.state = "world";
    this.hideOverlay();
    this.worldScene.onEnter(this);

    // Save immediately
    this.saveCurrentWorld(name);
    this.render();
  }

  private loadWorld(saved: SavedWorld): void {
    this.hideOverlay();
    this.currentWorldId = saved.id;
    this.clearedDungeons = new Set(saved.clearedDungeons ?? []);

    // Restore player
    this.player = new Player(this);
    this.player.hp = saved.playerHp;
    this.player.maxHp = saved.playerMaxHp;
    this.player.sp = saved.playerSp;
    this.player.baseSp = saved.playerBaseSp;
    this.player.fuel = saved.playerFuel;
    this.player.baseAttack = saved.playerBaseAttack;
    this.player.baseDefense = saved.playerBaseDefense;

    // Restore equipment
    if (saved.weaponId && EQUIPMENT_DEFS[saved.weaponId]) {
      this.player.weapon = EQUIPMENT_DEFS[saved.weaponId];
    }
    if (saved.armorId && EQUIPMENT_DEFS[saved.armorId]) {
      this.player.armor = EQUIPMENT_DEFS[saved.armorId];
    }
    if (saved.accessoryId && EQUIPMENT_DEFS[saved.accessoryId]) {
      this.player.accessory = EQUIPMENT_DEFS[saved.accessoryId];
    }
    this.player.recalcStats();

    // Restore materials
    this.player.materials = new Map(Object.entries(saved.materials ?? {}));

    // Restore skills
    this.player.skills = [];
    for (const skillName of saved.playerSkills ?? []) {
      const skill = SKILL_DEFS.find((s) => s.name === skillName);
      if (skill) this.player.skills.push(skill);
    }

    // Restore companion
    this.companion = saved.hasCompanion ? new Companion(this) : null;

    // Restore recruited NPCs
    this.recruitedNpcs = (saved.recruitedNpcs ?? []).map(deserializeNpc);

    // Restore world
    this.tutorial = null;
    this.messages = ["冒険を再開した。"];
    this.worldScene = new WorldScene(saved.seed);
    this.currentScene = this.worldScene;
    this.state = "world";
    this.worldScene.onEnter(this);
    this.worldScene.playerWorldX = saved.worldX;
    this.worldScene.playerWorldY = saved.worldY;
    this.player.placeOnMap(saved.worldX, saved.worldY);

    this.render();
  }

  saveCurrentWorld(name?: string): void {
    if (!this.currentWorldId) return;

    const existing = listWorlds().find((w) => w.id === this.currentWorldId);
    const worldName = name ?? existing?.name ?? "世界";

    const data: SavedWorld = {
      id: this.currentWorldId,
      name: worldName,
      seed: this.worldScene?.seed ?? 0,
      createdAt: existing?.createdAt ?? new Date().toISOString(),
      lastPlayed: new Date().toISOString(),
      playerHp: this.player.hp,
      playerMaxHp: this.player.maxHp,
      playerSp: this.player.sp,
      playerBaseSp: this.player.baseSp,
      playerFuel: this.player.fuel,
      playerBaseAttack: this.player.baseAttack,
      playerBaseDefense: this.player.baseDefense,
      playerSkills: this.player.skills.map((s) => s.name),
      weaponId: this.player.weapon?.id ?? null,
      armorId: this.player.armor?.id ?? null,
      accessoryId: this.player.accessory?.id ?? null,
      materials: Object.fromEntries(this.player.materials),
      hasCompanion: this.companion != null,
      recruitedNpcs: this.recruitedNpcs.map(serializeNpc),
      worldX: this.worldScene?.playerWorldX ?? 0,
      worldY: this.worldScene?.playerWorldY ?? 0,
      clearedDungeons: [...this.clearedDungeons],
    };

    saveWorld(data);
  }

  showPrologue(): void {
    this.state = "prologue";
    const overlay = document.getElementById("overlay")!;
    overlay.classList.remove("hidden");

    let pageIndex = 0;
    const renderPage = () => {
      if (pageIndex >= PROLOGUE_PAGES.length) {
        this.startTutorial();
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

  private startTutorial(): void {
    this.hideOverlay();
    this.companion = null;
    this.recruitedNpcs = [];
    this.player = new Player(this);
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

        <h2>装備と素材</h2>
        <p>迷宮で素材を集め、各地の職人に装備を作ってもらおう。
        職人はスカウトして始まりの村に住み着かせることもできる。</p>

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

  onTutorialComplete(): void {
    this.markTutorialDone();
    this.tutorial = null;
    this.addMessage("チュートリアル完了！");
    this.showTitle();
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

    if (this.companion) {
      this.companion.x = this.player.x;
      this.companion.y = this.player.y + 1;
      this.companion.hp = this.companion.maxHp;
    }

    this.render();
  }

  exitDungeon(): void {
    // Mark dungeon as cleared
    if (this.dungeonScene) {
      this.clearedDungeons.add(this.dungeonScene.dungeonDef.id);
    }
    this.dungeonScene = null;
    this.currentScene = this.worldScene;
    this.state = "world";
    this.worldScene.onEnter(this);

    // Auto-save when exiting dungeon
    this.saveCurrentWorld();
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

    // Auto-save when exiting town
    this.saveCurrentWorld();
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

  // Backward compat
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

    // Respawn at starting town with HP restored, lose materials
    this.player.hp = this.player.maxHp;
    this.player.sp = this.player.maxSp;
    this.player.fuel = 200;
    this.player.materials.clear();
    this.addMessage("素材を全て失った...");

    this.saveCurrentWorld();
    this.render();
  }

  nextFloor(): void {
    this.dungeonScene?.nextFloor(this);
  }
}
