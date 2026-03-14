import type * as ROT from "rot-js";
import type { Scene } from "./Scene";
import type { Game } from "../Game";
import { MAP_WIDTH, MAP_HEIGHT, COLOR_PLAYER } from "../../constants";
import { CRAFT_RECIPES, EQUIPMENT_DEFS, MATERIAL_DEFS, type CraftRecipe } from "../Equipment";

export interface NpcDef {
  char: string;
  name: string;
  color: string;
  x: number;
  y: number;
  dialog: string[];
  crafterId?: string; // if this NPC can craft
  onInteract?: (game: Game) => void;
}

export interface TownDef {
  id: string;
  name: string;
  race: "human" | "lizard" | "elf" | "dwarf";
  width: number;
  height: number;
  npcs: NpcDef[];
  layout: string[];
  startX: number;
  startY: number;
}

function makeTownLayout(): string[] {
  return [
    "#########################",
    "#.......................#",
    "#..####.........####...#",
    "#..#..#.........#..#...#",
    "#..#..#.........#..#...#",
    "#..#..#.........#..#...#",
    "#.......................#",
    "#.......................#",
    "#.......................#",
    "#.......................#",
    "#.......................#",
    "#.......................#",
    "#.......................#",
    "#...........E...........#",
    "#########################",
  ];
}

// Positions for recruited NPCs in the starting village
const RECRUIT_POSITIONS: [number, number][] = [
  [18, 8],
  [14, 9],
  [8, 9],
  [20, 9],
  [12, 10],
];

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
    npcs: [
      {
        char: "V",
        name: "村長",
        color: "#ffcc00",
        x: 10,
        y: 7,
        dialog: [
          "ようこそ、転生者よ。ここは始まりの村だ。",
          "各地の街で出会った職人が移住してくれることがある。",
          "南の出口(E)からワールドマップに出られる。",
        ],
      },
      {
        char: "M",
        name: "商人",
        color: "#88ccff",
        x: 4,
        y: 7,
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
    npcs: [
      {
        char: "L",
        name: "リザ",
        color: "#44dd88",
        x: 14,
        y: 8,
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
        x: 8,
        y: 7,
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
    npcs: [
      {
        char: "Q",
        name: "エルフの女王",
        color: "#aaddff",
        x: 10,
        y: 7,
        dialog: [
          "...人間がここまで来るとは珍しい。",
          "私はこの森の守り手。エルフの女王よ。",
          "エリーナを連れて行くといい。村の役に立つだろう。",
        ],
      },
      {
        char: "S",
        name: "エリーナ",
        color: "#88ffaa",
        x: 16,
        y: 8,
        dialog: [
          "私はエリーナ。精霊魔法の使い手よ。",
          "素材を持ってきてくれれば、魔法の装備を作れるわ。",
          "あなたの村に行ってもいいかしら？",
        ],
        crafterId: "elf_enchanter",
        onInteract: (game: Game) => {
          if (!game.recruitedNpcs.some((n) => n.crafterId === "elf_enchanter")) {
            const npcDef: NpcDef = {
              char: "S",
              name: "エリーナ",
              color: "#88ffaa",
              x: 0,
              y: 0,
              dialog: ["素材を持ってきたのね。", "精霊の力を込めて、装備を作ってあげる。"],
              crafterId: "elf_enchanter",
            };
            game.recruitNpc(npcDef);
          }
        },
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
    npcs: [
      {
        char: "K",
        name: "鍛冶王",
        color: "#ff8844",
        x: 10,
        y: 7,
        dialog: [
          "ガハハ！よう来たな、冒険者！",
          "ワシはこの砦の鍛冶王だ。",
          "ボルドを連れてけ！おまえの村で鍛冶屋をやらせろ！",
        ],
      },
      {
        char: "W",
        name: "ボルド",
        color: "#ffaa44",
        x: 16,
        y: 8,
        dialog: [
          "オレはボルド。ドワーフの鍛冶師だ。",
          "素材さえあれば最高の武具を打ってやるぜ！",
          "おまえの村に工房を構えてもいいぞ。",
        ],
        crafterId: "dwarf_smith",
        onInteract: (game: Game) => {
          if (!game.recruitedNpcs.some((n) => n.crafterId === "dwarf_smith")) {
            const npcDef: NpcDef = {
              char: "W",
              name: "ボルド",
              color: "#ffaa44",
              x: 0,
              y: 0,
              dialog: ["おう！素材を持ってきたか？", "いい素材があれば最高の武具を打ってやるぜ！"],
              crafterId: "dwarf_smith",
            };
            game.recruitNpc(npcDef);
          }
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
  private activeNpcs: NpcDef[] = [];

  constructor(townDef: TownDef) {
    this.townDef = townDef;
  }

  onEnter(game: Game): void {
    this.parseTiles();
    this.buildNpcList(game);
    game.player.placeOnMap(this.townDef.startX, this.townDef.startY);
    game.player.visibleTiles.clear();
    game.addMessage(`${this.townDef.name}に入った`);
  }

  private buildNpcList(game: Game): void {
    // Filter out recruited NPCs from their original town
    this.activeNpcs = this.townDef.npcs.filter(
      (npc) => !game.recruitedNpcs.some((r) => r.name === npc.name),
    );

    // Add recruited NPCs to starting village
    if (this.townDef.id === "home") {
      for (let i = 0; i < game.recruitedNpcs.length; i++) {
        const npc = { ...game.recruitedNpcs[i] };
        const pos = RECRUIT_POSITIONS[i % RECRUIT_POSITIONS.length];
        npc.x = pos[0];
        npc.y = pos[1];
        this.activeNpcs.push(npc);
      }
    }
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
    const npc = this.activeNpcs.find((n) => n.x === nx && n.y === ny);
    if (npc) {
      this.interactWithNpc(game, npc);
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

  private interactWithNpc(game: Game, npc: NpcDef): void {
    // If this NPC is a crafter in the starting village, show craft menu
    if (npc.crafterId && this.townDef.id === "home") {
      this.openCraftMenu(game, npc);
      return;
    }

    // Normal dialog
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

  private openCraftMenu(game: Game, npc: NpcDef): void {
    const recipes = CRAFT_RECIPES.filter((r) => r.crafterId === npc.crafterId);
    if (recipes.length === 0) return;

    this.showingDialog = true;
    const overlay = document.getElementById("overlay")!;
    overlay.classList.remove("hidden");

    const p = game.player;
    let html = `<div class="tutorial-dialog"><p>${npc.name}の工房</p>`;

    // Show materials inventory
    html += '<p style="font-size:11px;color:#aaa;margin:8px 0">';
    html += "所持素材: ";
    if (p.materials.size === 0) {
      html += "なし";
    } else {
      const matStrs: string[] = [];
      for (const [matId, count] of p.materials) {
        const matDef = MATERIAL_DEFS.find((m) => m.id === matId);
        if (matDef) matStrs.push(`${matDef.name}x${count}`);
      }
      html += matStrs.join(", ");
    }
    html += "</p>";

    for (let i = 0; i < recipes.length; i++) {
      const recipe = recipes[i];
      const eqDef = EQUIPMENT_DEFS[recipe.resultEquipment];
      const canCraft = this.canCraft(game, recipe);
      const matStr = recipe.materials
        .map((m) => {
          const mat = MATERIAL_DEFS.find((md) => md.id === m.materialId);
          const have = p.getMaterialCount(m.materialId);
          const color = have >= m.count ? "#44ff88" : "#ff4444";
          return `<span style="color:${color}">${mat?.name ?? m.materialId}${have}/${m.count}</span>`;
        })
        .join(" ");

      html += `<button class="menu-btn${canCraft ? "" : " secondary"}" id="craft-${i}" ${canCraft ? "" : "disabled"}>`;
      html += `${eqDef?.name ?? recipe.name} (${eqDef?.description ?? ""})`;
      html += `<br><span style="font-size:10px">${matStr}</span>`;
      html += "</button>";
    }

    html += '<button class="menu-btn secondary" id="craft-close">閉じる</button></div>';
    overlay.innerHTML = html;

    for (let i = 0; i < recipes.length; i++) {
      const btn = document.getElementById(`craft-${i}`);
      if (!btn) continue;
      const recipe = recipes[i];
      btn.addEventListener("click", () => {
        this.doCraft(game, recipe, npc);
      });
    }
    document.getElementById("craft-close")!.addEventListener("click", () => {
      this.showingDialog = false;
      overlay.classList.add("hidden");
      game.render();
    });
  }

  private canCraft(game: Game, recipe: CraftRecipe): boolean {
    return recipe.materials.every((m) => game.player.getMaterialCount(m.materialId) >= m.count);
  }

  private doCraft(game: Game, recipe: CraftRecipe, npc: NpcDef): void {
    if (!this.canCraft(game, recipe)) return;

    // Consume materials
    for (const m of recipe.materials) {
      game.player.removeMaterial(m.materialId, m.count);
    }

    // Equip result
    const eqDef = EQUIPMENT_DEFS[recipe.resultEquipment];
    if (eqDef) {
      game.player.equip(eqDef);
    }

    // Refresh craft menu
    this.openCraftMenu(game, npc);
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

    // Draw NPCs (including recruited ones)
    for (const npc of this.activeNpcs) {
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

  getStatusHTML(game: Game): string {
    const raceLabel: Record<string, string> = {
      human: "人間",
      lizard: "竜人",
      elf: "エルフ",
      dwarf: "ドワーフ",
    };
    const race = raceLabel[this.townDef.race] ?? "";

    // Show equipment in status for home town
    let extra = "";
    if (this.townDef.id === "home" && game.recruitedNpcs.length > 0) {
      extra = ` 住人:${game.recruitedNpcs.length + 2}`;
    }

    return `<span class="floor-color">${this.townDef.name}</span>  <span style="color:#666">${race}の街${extra}</span>`;
  }
}
