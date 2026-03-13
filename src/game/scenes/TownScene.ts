import type * as ROT from "rot-js";
import type { Scene } from "./Scene";
import type { Game } from "../Game";
import { MAP_WIDTH, MAP_HEIGHT, COLOR_PLAYER } from "../../constants";

export interface NpcDef {
  char: string;
  name: string;
  color: string;
  x: number;
  y: number;
  dialog: string[];
  onInteract?: (game: Game) => void;
}

export interface ShopItem {
  name: string;
  description: string;
  effect: (game: Game) => void;
}

export interface TownDef {
  id: string;
  name: string;
  race: "human" | "lizard" | "elf" | "dwarf";
  width: number;
  height: number;
  npcs: NpcDef[];
  shopItems: ShopItem[];
  layout: string[];
  startX: number;
  startY: number;
}

function makeTownLayout(): string[] {
  return [
    "#########################",
    "#.......................#",
    "#..###..........###....#",
    "#..#.#..........#.#....#",
    "#..###..........###....#",
    "#.......................#",
    "#.......########.......#",
    "#.......#......#.......#",
    "#.......#......#.......#",
    "#.......########.......#",
    "#.......................#",
    "#.......................#",
    "#.......................#",
    "#...........E...........#",
    "#########################",
  ];
}

export const TOWN_DEFS: TownDef[] = [
  {
    id: "home",
    name: "始まりの村",
    race: "human",
    width: 25,
    height: 15,
    startX: 12,
    startY: 13,
    layout: makeTownLayout(),
    shopItems: [],
    npcs: [
      {
        char: "V",
        name: "村長",
        color: "#ffcc00",
        x: 10,
        y: 8,
        dialog: [
          "ようこそ、転生者よ。ここは始まりの村だ。",
          "南の出口(E)からワールドマップに出られる。",
          "近くの迷宮で力をつけるといい。",
        ],
      },
      {
        char: "M",
        name: "商人",
        color: "#88ccff",
        x: 4,
        y: 3,
        dialog: [
          "いらっしゃい！まだ品揃えは少ないが...",
          "冒険者が増えればこの村も発展するだろう。",
        ],
      },
    ],
  },
  {
    id: "lizard",
    name: "竜人の里",
    race: "lizard",
    width: 25,
    height: 15,
    startX: 12,
    startY: 13,
    layout: makeTownLayout(),
    shopItems: [
      {
        name: "竜鱗の鎧",
        description: "防御+5",
        effect: (game) => {
          game.player.defense += 5;
          game.addMessage("竜鱗の鎧を装備した！防御力+5");
        },
      },
    ],
    npcs: [
      {
        char: "L",
        name: "リザ",
        color: "#44dd88",
        x: 14,
        y: 4,
        dialog: [
          "...あなたが噂の転生者？",
          "私はリザ。竜人の戦士よ。",
          "一人で迷宮は危険だわ。私も一緒に行く。",
        ],
        onInteract: (game: Game) => {
          if (!game.companion) {
            game.recruitCompanion();
            game.addMessage("リザが仲間になった！");
          }
        },
      },
      {
        char: "E",
        name: "長老",
        color: "#ccaa66",
        x: 4,
        y: 3,
        dialog: ["我らの里へようこそ。", "リザは腕の立つ戦士だ。力になってくれるだろう。"],
      },
    ],
  },
  {
    id: "elf",
    name: "エルフの隠れ里",
    race: "elf",
    width: 25,
    height: 15,
    startX: 12,
    startY: 13,
    layout: makeTownLayout(),
    shopItems: [
      {
        name: "精霊の魔法書",
        description: "MP上限+30",
        effect: (game) => {
          game.player.maxSp += 30;
          game.player.sp += 30;
          game.addMessage("精霊の魔法書を読んだ！MP上限+30");
        },
      },
      {
        name: "エルフの霊薬",
        description: "HP全回復",
        effect: (game) => {
          game.player.hp = game.player.maxHp;
          game.addMessage("エルフの霊薬を飲んだ！HP全回復");
        },
      },
    ],
    npcs: [
      {
        char: "Q",
        name: "エルフの女王",
        color: "#aaddff",
        x: 10,
        y: 8,
        dialog: [
          "...人間がここまで来るとは珍しい。",
          "私はこの森の守り手。エルフの女王よ。",
          "あなたに力を貸しましょう。店を見てゆきなさい。",
        ],
      },
      {
        char: "S",
        name: "エルフの賢者",
        color: "#88ffaa",
        x: 4,
        y: 3,
        dialog: ["我らエルフは魔法に長けている。", "魔法書をお求めならこの里がよかろう。"],
      },
    ],
  },
  {
    id: "dwarf",
    name: "ドワーフの砦",
    race: "dwarf",
    width: 25,
    height: 15,
    startX: 12,
    startY: 13,
    layout: makeTownLayout(),
    shopItems: [
      {
        name: "ミスリルの剣",
        description: "攻撃力+8",
        effect: (game) => {
          game.player.attack += 8;
          game.addMessage("ミスリルの剣を手に入れた！攻撃力+8");
        },
      },
      {
        name: "アダマンタイトの鎧",
        description: "防御力+8",
        effect: (game) => {
          game.player.defense += 8;
          game.addMessage("アダマンタイトの鎧を装備した！防御力+8");
        },
      },
      {
        name: "ドワーフの大たいまつ",
        description: "明かり+200",
        effect: (game) => {
          game.player.fuel += 200;
          game.addMessage("ドワーフの大たいまつ！明かり+200");
        },
      },
    ],
    npcs: [
      {
        char: "K",
        name: "鍛冶王",
        color: "#ff8844",
        x: 10,
        y: 8,
        dialog: [
          "ガハハ！よう来たな、冒険者！",
          "ワシはこの砦の鍛冶王だ。",
          "最高の武器と防具がほしけりゃ、店を見てけ！",
        ],
      },
      {
        char: "W",
        name: "武器屋",
        color: "#ffaa44",
        x: 16,
        y: 4,
        dialog: ["いらっしゃい！ドワーフ製の武具は一級品だぜ。"],
        onInteract: (game: Game) => {
          // Open shop
          const townScene = game.currentScene as TownScene;
          townScene.openShop(game);
        },
      },
    ],
  },
];

interface TownTile {
  char: string;
  walkable: boolean;
}

export class TownScene implements Scene {
  townDef: TownDef;
  tiles: TownTile[][] = [];
  dialogQueue: string[] = [];
  showingDialog = false;

  constructor(townDef: TownDef) {
    this.townDef = townDef;
  }

  onEnter(game: Game): void {
    this.parseTiles();
    game.player.placeOnMap(this.townDef.startX, this.townDef.startY);
    game.player.visibleTiles.clear();
    game.addMessage(`${this.townDef.name}に入った`);
  }

  private parseTiles(): void {
    this.tiles = [];
    for (let x = 0; x < this.townDef.width; x++) {
      this.tiles[x] = [];
      for (let y = 0; y < this.townDef.height; y++) {
        const ch = this.townDef.layout[y]?.[x] ?? "#";
        this.tiles[x][y] = {
          char: ch,
          walkable: ch === "." || ch === "E",
        };
      }
    }
  }

  onMove(dx: number, dy: number, game: Game): boolean {
    if (this.showingDialog) return false;

    const p = game.player;
    const nx = p.x + dx;
    const ny = p.y + dy;

    if (nx < 0 || nx >= this.townDef.width || ny < 0 || ny >= this.townDef.height) return false;

    // Check NPC collision
    const npc = this.townDef.npcs.find((n) => n.x === nx && n.y === ny);
    if (npc) {
      this.startDialog(game, npc);
      return true;
    }

    if (!this.tiles[nx][ny].walkable) return false;

    // Check exit
    if (this.tiles[nx][ny].char === "E") {
      game.exitTown();
      return true;
    }

    p.x = nx;
    p.y = ny;
    return true;
  }

  private startDialog(game: Game, npc: NpcDef): void {
    this.dialogQueue = [...npc.dialog];
    this.showingDialog = true;
    this.showNextDialog(game);

    if (npc.onInteract) {
      npc.onInteract(game);
    }
  }

  showNextDialog(game: Game): void {
    if (this.dialogQueue.length === 0) {
      this.showingDialog = false;
      const overlay = document.getElementById("overlay")!;
      overlay.classList.add("hidden");
      game.render();
      return;
    }

    const text = this.dialogQueue.shift()!;
    const overlay = document.getElementById("overlay")!;
    overlay.classList.remove("hidden");
    overlay.innerHTML = `
      <div class="tutorial-dialog">
        <p>${text}</p>
        <button class="menu-btn" id="btn-dialog-next">${this.dialogQueue.length > 0 ? "次へ" : "閉じる"}</button>
      </div>
    `;
    document.getElementById("btn-dialog-next")!.addEventListener("click", () => {
      this.showNextDialog(game);
    });
  }

  openShop(game: Game): void {
    if (this.townDef.shopItems.length === 0) {
      game.addMessage("まだ商品がないようだ...");
      return;
    }

    this.showingDialog = true;
    const overlay = document.getElementById("overlay")!;
    overlay.classList.remove("hidden");

    let html = '<div class="tutorial-dialog"><p>何を買う？</p>';
    for (let i = 0; i < this.townDef.shopItems.length; i++) {
      const item = this.townDef.shopItems[i];
      html += `<button class="menu-btn" id="shop-item-${i}">${item.name} (${item.description})</button>`;
    }
    html += '<button class="menu-btn secondary" id="shop-close">やめる</button></div>';
    overlay.innerHTML = html;

    for (let i = 0; i < this.townDef.shopItems.length; i++) {
      const item = this.townDef.shopItems[i];
      document.getElementById(`shop-item-${i}`)!.addEventListener("click", () => {
        item.effect(game);
        this.showingDialog = false;
        overlay.classList.add("hidden");
        game.render();
      });
    }
    document.getElementById("shop-close")!.addEventListener("click", () => {
      this.showingDialog = false;
      overlay.classList.add("hidden");
      game.render();
    });
  }

  onWait(_game: Game): void {
    // Nothing
  }

  onDescend(game: Game): boolean {
    const p = game.player;
    const tile = this.tiles[p.x]?.[p.y];
    if (tile && tile.char === "E") {
      game.exitTown();
      return true;
    }
    return false;
  }

  render(display: ROT.Display, game: Game): void {
    const p = game.player;
    const offX = Math.floor((MAP_WIDTH - this.townDef.width) / 2);
    const offY = Math.floor((MAP_HEIGHT - this.townDef.height) / 2);

    const raceColors = this.getRaceColors();

    // Clear
    for (let x = 0; x < MAP_WIDTH; x++) {
      for (let y = 0; y < MAP_HEIGHT; y++) {
        display.draw(x, y, " ", "#000", "#111118");
      }
    }

    // Draw town tiles
    for (let x = 0; x < this.townDef.width; x++) {
      for (let y = 0; y < this.townDef.height; y++) {
        const tile = this.tiles[x][y];
        let ch = tile.char;
        let fg = "#666666";
        const bg = raceColors.bg;

        if (ch === "#") {
          ch = "\u2588";
          fg = raceColors.wall;
        } else if (ch === "E") {
          ch = "E";
          fg = "#ffcc00";
        } else if (ch === ".") {
          ch = "\u00b7";
          fg = raceColors.floor;
        }

        display.draw(offX + x, offY + y, ch, fg, bg);
      }
    }

    // Draw NPCs
    for (const npc of this.townDef.npcs) {
      display.draw(offX + npc.x, offY + npc.y, npc.char, npc.color, raceColors.bg);
    }

    // Draw player
    display.draw(offX + p.x, offY + p.y, "@", COLOR_PLAYER, null);

    // Draw companion if present
    if (game.companion) {
      const cx =
        p.x + 1 < this.townDef.width && this.tiles[p.x + 1]?.[p.y]?.walkable ? p.x + 1 : p.x - 1;
      display.draw(offX + cx, offY + p.y, "L", "#44dd88", null);
    }
  }

  private getRaceColors(): { wall: string; floor: string; bg: string } {
    switch (this.townDef.race) {
      case "lizard":
        return { wall: "#2a6a4a", floor: "#224433", bg: "#0d1a14" };
      case "elf":
        return { wall: "#3a6a3a", floor: "#1a4422", bg: "#0a1a0d" };
      case "dwarf":
        return { wall: "#6a4a2a", floor: "#443322", bg: "#1a0d0a" };
      default:
        return { wall: "#4a4a6a", floor: "#333350", bg: "#1a1a2e" };
    }
  }

  getStatusHTML(_game: Game): string {
    const raceLabel: Record<string, string> = {
      human: "人間",
      lizard: "竜人",
      elf: "エルフ",
      dwarf: "ドワーフ",
    };
    const race = raceLabel[this.townDef.race] ?? "";
    return `<span class="floor-color">${this.townDef.name}</span>  <span style="color:#666">${race}の街 - NPCに話しかけてみよう</span>`;
  }
}
