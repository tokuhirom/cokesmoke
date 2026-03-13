export interface EquipmentDef {
  id: string;
  name: string;
  slot: "weapon" | "armor" | "accessory";
  attack: number;
  defense: number;
  spBonus: number;
  description: string;
}

export const EQUIPMENT_DEFS: Record<string, EquipmentDef> = {
  // Starter
  wooden_sword: {
    id: "wooden_sword",
    name: "木の剣",
    slot: "weapon",
    attack: 3,
    defense: 0,
    spBonus: 0,
    description: "攻撃+3",
  },
  leather_armor: {
    id: "leather_armor",
    name: "革の鎧",
    slot: "armor",
    attack: 0,
    defense: 2,
    spBonus: 0,
    description: "防御+2",
  },
  // Lizard crafts
  dragon_scale_armor: {
    id: "dragon_scale_armor",
    name: "竜鱗の鎧",
    slot: "armor",
    attack: 0,
    defense: 6,
    spBonus: 0,
    description: "防御+6",
  },
  dragon_fang_sword: {
    id: "dragon_fang_sword",
    name: "竜牙の剣",
    slot: "weapon",
    attack: 8,
    defense: 0,
    spBonus: 0,
    description: "攻撃+8",
  },
  // Elf crafts
  spirit_staff: {
    id: "spirit_staff",
    name: "精霊の杖",
    slot: "weapon",
    attack: 4,
    defense: 0,
    spBonus: 30,
    description: "攻撃+4 MP上限+30",
  },
  elven_cloak: {
    id: "elven_cloak",
    name: "エルフのマント",
    slot: "accessory",
    attack: 0,
    defense: 3,
    spBonus: 20,
    description: "防御+3 MP上限+20",
  },
  // Dwarf crafts
  mithril_sword: {
    id: "mithril_sword",
    name: "ミスリルの剣",
    slot: "weapon",
    attack: 12,
    defense: 0,
    spBonus: 0,
    description: "攻撃+12",
  },
  adamantite_armor: {
    id: "adamantite_armor",
    name: "アダマンの鎧",
    slot: "armor",
    attack: 0,
    defense: 10,
    spBonus: 0,
    description: "防御+10",
  },
  // Ultimate
  heroes_ring: {
    id: "heroes_ring",
    name: "勇者の指輪",
    slot: "accessory",
    attack: 5,
    defense: 5,
    spBonus: 20,
    description: "攻撃+5 防御+5 MP+20",
  },
};

export interface MaterialDef {
  id: string;
  name: string;
  char: string;
  rarity: number; // 0-1, lower = rarer
  dungeons: string[]; // which dungeons drop this
}

export const MATERIAL_DEFS: MaterialDef[] = [
  { id: "iron_ore", name: "鉄鉱石", char: "*", rarity: 0.4, dungeons: ["first", "forest"] },
  { id: "dragon_scale", name: "竜の鱗", char: "$", rarity: 0.15, dungeons: ["fire", "abyss"] },
  { id: "dragon_fang", name: "竜の牙", char: "%", rarity: 0.1, dungeons: ["fire", "abyss"] },
  { id: "spirit_stone", name: "精霊石", char: "&", rarity: 0.2, dungeons: ["forest"] },
  { id: "mithril_ore", name: "ミスリル鉱", char: "$", rarity: 0.1, dungeons: ["fire", "abyss"] },
  { id: "adamantite", name: "アダマン鉱", char: "$", rarity: 0.05, dungeons: ["abyss"] },
  { id: "dark_crystal", name: "闇の結晶", char: "&", rarity: 0.08, dungeons: ["abyss"] },
];

export interface CraftRecipe {
  id: string;
  name: string;
  resultEquipment: string; // equipment def id
  materials: { materialId: string; count: number }[];
  crafterId: string; // which NPC can craft this
}

export const CRAFT_RECIPES: CraftRecipe[] = [
  {
    id: "craft_wooden_sword",
    name: "木の剣を作る",
    resultEquipment: "wooden_sword",
    materials: [{ materialId: "iron_ore", count: 2 }],
    crafterId: "dwarf_smith",
  },
  {
    id: "craft_leather_armor",
    name: "革の鎧を作る",
    resultEquipment: "leather_armor",
    materials: [{ materialId: "iron_ore", count: 3 }],
    crafterId: "dwarf_smith",
  },
  {
    id: "craft_dragon_scale_armor",
    name: "竜鱗の鎧を作る",
    resultEquipment: "dragon_scale_armor",
    materials: [{ materialId: "dragon_scale", count: 3 }],
    crafterId: "dwarf_smith",
  },
  {
    id: "craft_dragon_fang_sword",
    name: "竜牙の剣を作る",
    resultEquipment: "dragon_fang_sword",
    materials: [
      { materialId: "dragon_fang", count: 2 },
      { materialId: "iron_ore", count: 3 },
    ],
    crafterId: "dwarf_smith",
  },
  {
    id: "craft_spirit_staff",
    name: "精霊の杖を作る",
    resultEquipment: "spirit_staff",
    materials: [{ materialId: "spirit_stone", count: 3 }],
    crafterId: "elf_enchanter",
  },
  {
    id: "craft_elven_cloak",
    name: "エルフのマントを作る",
    resultEquipment: "elven_cloak",
    materials: [{ materialId: "spirit_stone", count: 2 }],
    crafterId: "elf_enchanter",
  },
  {
    id: "craft_mithril_sword",
    name: "ミスリルの剣を作る",
    resultEquipment: "mithril_sword",
    materials: [{ materialId: "mithril_ore", count: 3 }],
    crafterId: "dwarf_smith",
  },
  {
    id: "craft_adamantite_armor",
    name: "アダマンの鎧を作る",
    resultEquipment: "adamantite_armor",
    materials: [{ materialId: "adamantite", count: 3 }],
    crafterId: "dwarf_smith",
  },
  {
    id: "craft_heroes_ring",
    name: "勇者の指輪を作る",
    resultEquipment: "heroes_ring",
    materials: [
      { materialId: "dark_crystal", count: 2 },
      { materialId: "mithril_ore", count: 1 },
      { materialId: "spirit_stone", count: 1 },
    ],
    crafterId: "dwarf_smith",
  },
];
