import { Display } from "../ui/Display";
import { TouchInput } from "../ui/TouchInput";
import {
  hideOverlay,
  renderTitleScreen,
  renderWorldNameInput,
  renderJobSelection,
  renderGiftSelection,
  renderHelpScreen,
  renderEquipMenu,
  renderGameMenu,
  renderStatusScreen,
  renderInventoryMenu,
  renderSkillReplaceMenu,
  renderProloguePage,
  renderGoddessScene,
  renderTutorialDialog,
} from "../ui/GameOverlays";
import { Player, GIFT_DEFS, JOB_DEFS } from "./Player";
import { Companion } from "./Companion";
import { TutorialManager } from "./Tutorial";
import { SKILL_DEFS, type SkillDef } from "./Skill";
import { EQUIPMENT_DEFS } from "./Equipment";
import { ITEM_DEFS } from "./Item";
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
  "手元には何もない。腹が減っている。\n壁に刻まれた文字が微かに光る。\n\n『全ての迷宮を踏破せし者に、\n　帰還の道が開かれん』\n\n...行くしかない。",
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

  // --- Lifecycle ---

  init(): void {
    this.display = new Display();
    this.input = new TouchInput(this);
    this.showTitle();
  }

  isPlayable(): boolean {
    return this.state === "world" || this.state === "town" || this.state === "dungeon";
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

  // --- Title / New World ---

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

  showTitle(): void {
    this.state = "title";
    const tutorialDone = this.isTutorialDone();
    const worlds = listWorlds();
    renderTitleScreen(worlds, tutorialDone);

    // Wire up events
    for (const w of worlds) {
      document.getElementById(`load-${w.id}`)?.addEventListener("click", () => {
        this.loadWorld(w);
      });
      document.getElementById(`del-${w.id}`)?.addEventListener("click", () => {
        if (confirm(`「${w.name}」を削除しますか？`)) {
          deleteWorld(w.id);
          this.showTitle();
        }
      });
    }

    if (canCreateWorld()) {
      document.getElementById("btn-new-world")?.addEventListener("click", () => {
        this.showWorldNameInput();
      });
    }

    if (!tutorialDone) {
      document.getElementById("btn-tutorial")?.addEventListener("click", () => {
        this.showPrologue();
      });
    }
    document.getElementById("btn-help")?.addEventListener("click", () => {
      this.showHelp();
    });
  }

  private showWorldNameInput(): void {
    renderWorldNameInput();

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

    this.showJobSelection(name, seed);
  }

  private showJobSelection(worldName: string, seed: number): void {
    renderJobSelection();

    for (const job of JOB_DEFS) {
      document.getElementById(`job-${job.id}`)!.addEventListener("click", () => {
        this.player.applyJob(job);
        // Apply initial skills
        for (const skillName of job.initialSkills) {
          const skill = SKILL_DEFS.find((s) => s.name === skillName);
          if (skill) this.player.skills.push(skill);
        }
        // Ranger starts with arrows
        if (job.id === "ranger") {
          const arrowDef = ITEM_DEFS.find((d) => d.name === "木の矢");
          if (arrowDef) {
            this.player.consumables.set("木の矢", { def: arrowDef, count: 10 });
          }
        }
        this.showGiftSelection(worldName, seed);
      });
    }
  }

  private showGiftSelection(worldName: string, seed: number): void {
    renderGiftSelection();

    for (const gift of GIFT_DEFS) {
      document.getElementById(`gift-${gift.id}`)!.addEventListener("click", () => {
        this.player.giftId = gift.id;
        gift.apply(this.player);
        this.finishWorldCreation(worldName, seed);
      });
    }
  }

  private finishWorldCreation(name: string, seed: number): void {
    this.messages = ["目が覚めた...ここは始まりの村の近くだ。"];
    this.worldScene = new WorldScene(seed);
    this.currentScene = this.worldScene;
    this.state = "world";
    hideOverlay();
    this.worldScene.onEnter(this);

    const job = JOB_DEFS.find((j) => j.id === this.player.jobId);
    if (job) {
      this.addMessage(`職業「${job.name}」として転生した！`);
    }
    const gift = GIFT_DEFS.find((g) => g.id === this.player.giftId);
    if (gift) {
      this.addMessage(`女神の贈り物「${gift.name}」を授かった！`);
    }

    this.saveCurrentWorld(name);
    this.render();
  }

  // --- Save / Load ---

  private loadWorld(saved: SavedWorld): void {
    hideOverlay();
    this.currentWorldId = saved.id;
    this.clearedDungeons = new Set(saved.clearedDungeons ?? []);

    this.player = new Player(this);
    this.player.hp = saved.playerHp;
    this.player.maxHp = saved.playerMaxHp;
    this.player.sp = saved.playerSp;
    this.player.baseSp = saved.playerBaseSp;
    this.player.hunger = saved.playerHunger;
    this.player.baseAttack = saved.playerBaseAttack;
    this.player.baseDefense = saved.playerBaseDefense;

    // Restore job
    if (saved.jobId) {
      this.player.jobId = saved.jobId;
      this.player.maxSkills = saved.maxSkills ?? 3;
      this.player.spRegenBonus = saved.spRegenBonus ?? 0;
      this.player.hungerCostMult = saved.hungerCostMult ?? 1.0;
      this.player.trapEvadeBonus = saved.trapEvadeBonus ?? 0;
      this.player.allowedWeapons =
        (saved.allowedWeapons as import("./Equipment").WeaponType[] | null) ?? null;
      this.player.learnableSkills = saved.learnableSkills ?? null;
    }

    // Restore gift
    if (saved.giftId) {
      this.player.giftId = saved.giftId;
      const gift = GIFT_DEFS.find((g) => g.id === saved.giftId);
      if (gift) gift.apply(this.player);
      this.player.baseAttack = saved.playerBaseAttack;
      this.player.baseDefense = saved.playerBaseDefense;
      this.player.baseSp = saved.playerBaseSp;
      this.player.maxHp = saved.playerMaxHp;
      this.player.maxHunger = saved.playerMaxHunger ?? this.player.maxHunger;
    }

    // Restore gold
    this.player.gold = saved.playerGold ?? 0;

    // Restore owned equipment
    this.player.ownedEquipment = [];
    for (const eqId of saved.ownedEquipmentIds ?? []) {
      if (EQUIPMENT_DEFS[eqId]) {
        this.player.ownedEquipment.push(EQUIPMENT_DEFS[eqId]);
      }
    }
    for (const artifact of saved.artifacts ?? []) {
      this.player.ownedEquipment.push(artifact);
    }

    // Restore equipped items
    const findEquip = (id: string | null) => {
      if (!id) return null;
      return EQUIPMENT_DEFS[id] ?? this.player.ownedEquipment.find((e) => e.id === id) ?? null;
    };

    for (const slot of ["weapon", "armor", "accessory"] as const) {
      const slotId = saved[`${slot}Id`];
      if (slotId) {
        const eq = findEquip(slotId);
        if (eq) {
          this.player[slot] = eq;
          if (!this.player.ownedEquipment.some((e) => e.id === slotId)) {
            this.player.ownedEquipment.push(eq);
          }
        }
      }
    }
    this.player.recalcStats();

    // Restore materials & skills
    this.player.materials = new Map(Object.entries(saved.materials ?? {}));
    this.player.skills = [];
    for (const skillName of saved.playerSkills ?? []) {
      const skill = SKILL_DEFS.find((s) => s.name === skillName);
      if (skill) this.player.skills.push(skill);
    }

    // Restore consumables
    this.player.consumables.clear();
    if (saved.consumables) {
      for (const [name, count] of Object.entries(saved.consumables)) {
        const def = ITEM_DEFS.find((d) => d.name === name && d.consumable);
        if (def && count > 0) {
          this.player.consumables.set(name, { def, count });
        }
      }
    }

    // Restore companion & NPCs
    this.companion = saved.hasCompanion ? new Companion(this) : null;
    this.recruitedNpcs = (saved.recruitedNpcs ?? []).map(deserializeNpc);

    // Restore world
    this.tutorial = null;
    this.messages = ["冒険を再開した。"];
    this.worldScene = new WorldScene(saved.seed);
    this.worldScene.onEnter(this);
    this.worldScene.playerWorldX = saved.worldX;
    this.worldScene.playerWorldY = saved.worldY;
    this.worldScene.droppedLoots = saved.droppedLoots ?? [];

    // Restore dungeon state if player was in a dungeon
    if (saved.inDungeonId) {
      const ddef = DUNGEON_DEFS.find((d) => d.id === saved.inDungeonId);
      if (ddef) {
        const scene = new DungeonScene(ddef);
        this.dungeonScene = scene;
        this.currentScene = scene;
        this.state = "dungeon";
        scene.currentFloor = saved.dungeonFloor ?? 1;
        scene.generateFloor(this);
        // Place player at saved position (not the default start)
        if (saved.dungeonPlayerX != null && saved.dungeonPlayerY != null) {
          this.player.placeOnMap(saved.dungeonPlayerX, saved.dungeonPlayerY);
          scene.computePlayerFOV(this);
        }
        if (this.companion) {
          this.companion.x = this.player.x;
          this.companion.y = this.player.y + 1;
          this.companion.hp = this.companion.maxHp;
        }
        this.addMessage(`${ddef.name} ${scene.currentFloor}階で目が覚めた...`);
      } else {
        this.currentScene = this.worldScene;
        this.state = "world";
        this.player.placeOnMap(saved.worldX, saved.worldY);
      }
    } else {
      this.currentScene = this.worldScene;
      this.state = "world";
      this.player.placeOnMap(saved.worldX, saved.worldY);
    }

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
      playerHunger: this.player.hunger,
      playerBaseAttack: this.player.baseAttack,
      playerBaseDefense: this.player.baseDefense,
      playerMaxHunger: this.player.maxHunger,
      jobId: this.player.jobId,
      maxSkills: this.player.maxSkills,
      spRegenBonus: this.player.spRegenBonus,
      hungerCostMult: this.player.hungerCostMult,
      trapEvadeBonus: this.player.trapEvadeBonus,
      allowedWeapons: this.player.allowedWeapons,
      learnableSkills: this.player.learnableSkills,
      playerSkills: this.player.skills.map((s) => s.name),
      weaponId: this.player.weapon?.id ?? null,
      armorId: this.player.armor?.id ?? null,
      accessoryId: this.player.accessory?.id ?? null,
      ownedEquipmentIds: this.player.ownedEquipment.filter((e) => !e.isArtifact).map((e) => e.id),
      artifacts: this.player.ownedEquipment.filter((e) => e.isArtifact),
      giftId: this.player.giftId,
      playerGold: this.player.gold,
      materials: Object.fromEntries(this.player.materials),
      consumables: Object.fromEntries(
        [...this.player.consumables].map(([name, entry]) => [name, entry.count]),
      ),
      hasCompanion: this.companion != null,
      recruitedNpcs: this.recruitedNpcs.map(serializeNpc),
      worldX: this.worldScene?.playerWorldX ?? 0,
      worldY: this.worldScene?.playerWorldY ?? 0,
      clearedDungeons: [...this.clearedDungeons],
      droppedLoots: this.worldScene?.droppedLoots ?? [],
      inDungeonId: this.dungeonScene?.dungeonDef.id ?? null,
      dungeonFloor: this.dungeonScene?.currentFloor ?? undefined,
      dungeonPlayerX: this.state === "dungeon" ? this.player.x : undefined,
      dungeonPlayerY: this.state === "dungeon" ? this.player.y : undefined,
    };

    saveWorld(data);
  }

  // --- Scene Transitions ---

  enterDungeon(dungeonId: string): void {
    const def = DUNGEON_DEFS.find((d) => d.id === dungeonId);
    if (!def) return;

    hideOverlay();
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

    this.saveCurrentWorld();
    this.render();
  }

  exitDungeon(): void {
    if (this.dungeonScene) {
      this.clearedDungeons.add(this.dungeonScene.dungeonDef.id);
    }
    this.dungeonScene = null;
    this.currentScene = this.worldScene;
    this.state = "world";
    this.worldScene.onEnter(this);
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
    this.saveCurrentWorld();
    this.render();
  }

  // --- NPCs / Companions ---

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

  // --- Backward compat ---

  getEnemyAt(x: number, y: number) {
    return this.dungeonScene?.getEnemyAt(x, y);
  }

  pickupItem(x: number, y: number): void {
    this.dungeonScene?.pickupItem(this, x, y);
  }

  processEnemyTurns(): void {
    this.dungeonScene?.processEnemyTurns(this);
  }

  nextFloor(): void {
    this.dungeonScene?.nextFloor(this);
  }

  // --- UI Overlays ---

  showHelp(): void {
    this.state = "help";
    renderHelpScreen();
    document.getElementById("btn-back")!.addEventListener("click", () => {
      this.showTitle();
    });
  }

  private showHelpFromMenu(): void {
    renderHelpScreen();
    document.getElementById("btn-back")!.addEventListener("click", () => {
      this.showGameMenu();
    });
  }

  showEquipMenu(): void {
    if (!this.isPlayable()) return;
    renderEquipMenu(this.player);

    for (const eq of this.player.ownedEquipment) {
      document.getElementById(`eq-${eq.id}`)?.addEventListener("click", () => {
        this.player.equip(eq);
        this.showEquipMenu();
      });
    }

    for (const slot of ["weapon", "armor", "accessory"] as const) {
      document.getElementById(`uneq-${slot}`)?.addEventListener("click", () => {
        this.player.unequip(slot);
        this.showEquipMenu();
      });
    }

    document.getElementById("equip-close")!.addEventListener("click", () => {
      this.showGameMenu();
    });
  }

  showGameMenu(): void {
    if (!this.isPlayable()) return;
    renderGameMenu();

    document.getElementById("menu-status")!.addEventListener("click", () => {
      this.showStatusScreen();
    });
    document.getElementById("menu-equip")!.addEventListener("click", () => {
      this.showEquipMenu();
    });
    document.getElementById("menu-inv")!.addEventListener("click", () => {
      this.showInventoryMenu();
    });
    document.getElementById("menu-help")!.addEventListener("click", () => {
      this.showHelpFromMenu();
    });
    document.getElementById("menu-title")!.addEventListener("click", () => {
      if (confirm("タイトルに戻りますか？（進行状況はセーブされます）")) {
        this.saveCurrentWorld();
        hideOverlay();
        this.showTitle();
      }
    });
    document.getElementById("menu-close")!.addEventListener("click", () => {
      hideOverlay();
      this.render();
    });
  }

  showStatusScreen(): void {
    renderStatusScreen(this.player);

    document.getElementById("status-close")!.addEventListener("click", () => {
      this.showGameMenu();
    });
  }

  showInnMenu(): void {
    const p = this.player;
    const cost = 20;
    const overlay = document.getElementById("overlay")!;
    overlay.classList.remove("hidden");

    const canAfford = p.gold >= cost;
    const needsRest = p.hp < p.maxHp || p.hunger < p.maxHunger;

    let html = '<div class="tutorial-dialog">';
    html += "<p>宿屋</p>";
    html += `<p style="font-size:12px;color:#aaa">所持金: ${p.gold}G</p>`;

    if (!needsRest) {
      html += '<p style="font-size:12px;color:#888">体調は万全だ。休む必要はない。</p>';
    } else if (!canAfford) {
      html += `<p style="font-size:12px;color:#ff6644">宿泊費${cost}Gが足りない...</p>`;
    }

    html += `<button class="menu-btn${canAfford && needsRest ? "" : " secondary"}" id="inn-stay" ${canAfford && needsRest ? "" : "disabled"}>`;
    html += `宿泊する（${cost}G）`;
    html += "</button>";
    html += '<button class="menu-btn secondary" id="inn-close">やめる</button>';
    html += "</div>";
    overlay.innerHTML = html;

    document.getElementById("inn-stay")?.addEventListener("click", () => {
      p.gold -= cost;
      p.hp = p.maxHp;
      p.hunger = p.maxHunger;
      p.sp = p.maxSp;
      this.addMessage("宿屋でぐっすり眠った！HP・MP・満腹度が全回復！");
      overlay.classList.add("hidden");
      this.saveCurrentWorld();
      this.render();
    });

    document.getElementById("inn-close")!.addEventListener("click", () => {
      overlay.classList.add("hidden");
      this.render();
    });
  }

  showSkillReplaceMenu(newSkill: SkillDef): void {
    renderSkillReplaceMenu(this.player, newSkill);

    for (let i = 0; i < this.player.skills.length; i++) {
      document.getElementById(`forget-${i}`)?.addEventListener("click", () => {
        this.player.forgetAndLearnSkill(i, newSkill);
        hideOverlay();
        this.render();
      });
    }

    document.getElementById("forget-cancel")!.addEventListener("click", () => {
      this.addMessage("新しいスキルを覚えなかった");
      hideOverlay();
      this.render();
    });
  }

  showInventoryMenu(): void {
    if (!this.isPlayable()) return;
    renderInventoryMenu(this.player);

    let idx = 0;
    for (const [name] of this.player.consumables) {
      const btnId = `use-item-${idx}`;
      document.getElementById(btnId)?.addEventListener("click", () => {
        if (this.player.useConsumable(name)) {
          // Using consumable costs a turn in dungeon
          if (this.state === "dungeon" && this.dungeonScene) {
            this.dungeonScene.endTurn(this);
          }
          this.showInventoryMenu();
        }
      });
      idx++;
    }

    document.getElementById("inv-close")!.addEventListener("click", () => {
      this.showGameMenu();
    });
  }

  showPrologue(): void {
    this.state = "prologue";
    const overlay = document.getElementById("overlay")!;

    let pageIndex = 0;
    const renderPage = () => {
      if (pageIndex >= PROLOGUE_PAGES.length) {
        this.startTutorial();
        return;
      }
      renderProloguePage(PROLOGUE_PAGES[pageIndex], pageIndex === PROLOGUE_PAGES.length - 1);
      overlay.onclick = () => {
        pageIndex++;
        renderPage();
      };
    };
    renderPage();
  }

  private startTutorial(): void {
    hideOverlay();
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

  showTutorialDialog(): void {
    if (!this.tutorial?.pendingDialog) return;
    renderTutorialDialog(this.tutorial.pendingDialog.message);
    document.getElementById("btn-tutorial-ok")!.addEventListener("click", () => {
      this.tutorial!.advance(this);
      hideOverlay();
      this.render();
    });
  }

  onTutorialComplete(): void {
    this.markTutorialDone();
    this.tutorial = null;
    this.addMessage("チュートリアル完了！");
    this.showTitle();
  }

  // --- Death / Revival ---

  gameOver(): void {
    this.state = "gameover";

    if (this.worldScene) {
      if (this.dungeonScene) {
        // Drop loot inside dungeon
        this.worldScene.dropLoot(
          this,
          this.dungeonScene.dungeonDef.id,
          this.dungeonScene.currentFloor,
        );
      } else {
        // Drop loot on world map
        this.worldScene.dropLoot(this);
      }
    }

    // Save immediately so dropped loot persists through browser close
    this.saveCurrentWorld();

    this.showGoddessScene();
  }

  private showGoddessScene(): void {
    const cause = this.player.deathCause || "不明な力";
    const causeMsg =
      cause === "空腹" ? "空腹により力尽きたようですね..." : `${cause}にやられたようですね...`;

    const pages = [
      "目の前が暗くなっていく...\n\n力尽きた...",
      "...不思議な光に包まれる...\n\n暖かい...この光は...",
      `「...聞こえますか、旅の者よ」\n\n「私は女神ルミナ。\n　この世界の理を司る者」\n\n「${causeMsg}」`,
      "「あなたにはまだ、\n　果たすべき使命がある」\n\n「持ち物はあの場所に\n　残っています。\n　取りに戻りなさい」",
      "「さあ、目を覚ましなさい...\n　始まりの村が\n　あなたを待っています」",
    ];

    const overlay = document.getElementById("overlay")!;
    let pageIndex = 0;
    const renderPage = () => {
      if (pageIndex >= pages.length) {
        this.completeRevival();
        return;
      }
      renderGoddessScene(pages[pageIndex], pageIndex === pages.length - 1);
      overlay.onclick = () => {
        pageIndex++;
        renderPage();
      };
    };
    renderPage();
  }

  private completeRevival(): void {
    hideOverlay();

    this.player.hp = this.player.maxHp;
    this.player.sp = this.player.maxSp;
    this.player.hunger = this.player.maxHunger;

    this.dungeonScene = null;
    this.townScene = null;
    this.currentScene = this.worldScene;
    this.state = "world";
    const startPoi = this.worldScene.pois.find((p) => p.id === "home");
    if (startPoi) {
      this.worldScene.playerWorldX = startPoi.x;
      this.worldScene.playerWorldY = startPoi.y;
    }
    this.worldScene.onEnter(this);

    this.messages = [];
    this.addMessage("...始まりの村の近くで目が覚めた");
    this.addMessage("落としたアイテムは死んだ場所に残っている（!マーク）");
    this.addMessage("装備中のアイテムは無事だった");

    this.saveCurrentWorld();
    this.render();
  }
}
