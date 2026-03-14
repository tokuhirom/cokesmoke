export type Element = "fire" | "ice" | "poison" | "lightning";

export const ELEMENT_NAMES: Record<Element, string> = {
  fire: "炎",
  ice: "氷",
  poison: "毒",
  lightning: "雷",
};

export type WeaponType = "sword" | "dagger" | "staff" | "axe" | "spear";

export interface EquipmentDef {
  id: string;
  name: string;
  slot: "weapon" | "armor" | "accessory";
  attack: number;
  defense: number;
  spBonus: number;
  description: string;
  resistances?: Partial<Record<Element, number>>; // 0-100%
  isArtifact?: boolean;
  weaponType?: WeaponType; // only for weapons
}

export const EQUIPMENT_DEFS: Record<string, EquipmentDef> = {
  // Starter (found in dungeons)
  wooden_sword: {
    id: "wooden_sword",
    name: "木の剣",
    slot: "weapon",
    attack: 2,
    defense: 0,
    spBonus: 0,
    description: "攻撃+2",
    weaponType: "sword",
  },
  wooden_dagger: {
    id: "wooden_dagger",
    name: "木の短剣",
    slot: "weapon",
    attack: 1,
    defense: 0,
    spBonus: 0,
    description: "攻撃+1",
    weaponType: "dagger",
  },
  leather_armor: {
    id: "leather_armor",
    name: "革の鎧",
    slot: "armor",
    attack: 0,
    defense: 1,
    spBonus: 0,
    description: "防御+1",
  },
  // Iron tier (crafted from iron ore)
  iron_sword: {
    id: "iron_sword",
    name: "鉄の剣",
    slot: "weapon",
    attack: 5,
    defense: 0,
    spBonus: 0,
    description: "攻撃+5",
    weaponType: "sword",
  },
  iron_dagger: {
    id: "iron_dagger",
    name: "鉄の短剣",
    slot: "weapon",
    attack: 3,
    defense: 0,
    spBonus: 0,
    description: "攻撃+3",
    weaponType: "dagger",
  },
  iron_axe: {
    id: "iron_axe",
    name: "鉄の斧",
    slot: "weapon",
    attack: 7,
    defense: 0,
    spBonus: 0,
    description: "攻撃+7 戦士専用",
    weaponType: "axe",
  },
  iron_armor: {
    id: "iron_armor",
    name: "鉄の鎧",
    slot: "armor",
    attack: 0,
    defense: 4,
    spBonus: 0,
    description: "防御+4",
  },
  // Lizard crafts
  dragon_scale_armor: {
    id: "dragon_scale_armor",
    name: "竜鱗の鎧",
    slot: "armor",
    attack: 0,
    defense: 6,
    spBonus: 0,
    description: "防御+6 炎耐性50%",
    resistances: { fire: 50 },
  },
  dragon_fang_sword: {
    id: "dragon_fang_sword",
    name: "竜牙の剣",
    slot: "weapon",
    attack: 8,
    defense: 0,
    spBonus: 0,
    description: "攻撃+8",
    weaponType: "sword",
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
    weaponType: "staff",
  },
  elven_cloak: {
    id: "elven_cloak",
    name: "エルフのマント",
    slot: "accessory",
    attack: 0,
    defense: 3,
    spBonus: 20,
    description: "防御+3 MP上限+20 氷耐性30%",
    resistances: { ice: 30 },
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
    weaponType: "sword",
  },
  mithril_axe: {
    id: "mithril_axe",
    name: "ミスリルの戦斧",
    slot: "weapon",
    attack: 15,
    defense: -2,
    spBonus: 0,
    description: "攻撃+15 防御-2 戦士専用",
    weaponType: "axe",
  },
  adamantite_armor: {
    id: "adamantite_armor",
    name: "アダマンの鎧",
    slot: "armor",
    attack: 0,
    defense: 10,
    spBonus: 0,
    description: "防御+10 炎耐性30% 雷耐性30%",
    resistances: { fire: 30, lightning: 30 },
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
  { id: "wood", name: "木材", char: "=", rarity: 0.5, dungeons: ["first", "forest"] },
  { id: "leather", name: "獣の皮", char: "~", rarity: 0.4, dungeons: ["first", "forest"] },
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
    materials: [{ materialId: "wood", count: 2 }],
    crafterId: "merchant",
  },
  {
    id: "craft_wooden_dagger",
    name: "木の短剣を作る",
    resultEquipment: "wooden_dagger",
    materials: [{ materialId: "wood", count: 1 }],
    crafterId: "merchant",
  },
  {
    id: "craft_leather_armor",
    name: "革の鎧を作る",
    resultEquipment: "leather_armor",
    materials: [{ materialId: "leather", count: 2 }],
    crafterId: "merchant",
  },
  {
    id: "craft_iron_sword",
    name: "鉄の剣を作る",
    resultEquipment: "iron_sword",
    materials: [{ materialId: "iron_ore", count: 2 }],
    crafterId: "dwarf_smith",
  },
  {
    id: "craft_iron_dagger",
    name: "鉄の短剣を作る",
    resultEquipment: "iron_dagger",
    materials: [{ materialId: "iron_ore", count: 1 }],
    crafterId: "dwarf_smith",
  },
  {
    id: "craft_iron_axe",
    name: "鉄の斧を作る",
    resultEquipment: "iron_axe",
    materials: [{ materialId: "iron_ore", count: 3 }],
    crafterId: "dwarf_smith",
  },
  {
    id: "craft_iron_armor",
    name: "鉄の鎧を作る",
    resultEquipment: "iron_armor",
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
    id: "craft_mithril_axe",
    name: "ミスリルの戦斧を作る",
    resultEquipment: "mithril_axe",
    materials: [
      { materialId: "mithril_ore", count: 3 },
      { materialId: "iron_ore", count: 2 },
    ],
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

export interface ConsumableCraftRecipe {
  id: string;
  name: string;
  resultItem: string; // item name
  count: number; // how many produced
  materials: { materialId: string; count: number }[];
  crafterId: string;
}

export const CONSUMABLE_CRAFT_RECIPES: ConsumableCraftRecipe[] = [
  {
    id: "craft_wood_arrow",
    name: "木の矢を作る（5本）",
    resultItem: "木の矢",
    count: 5,
    materials: [{ materialId: "wood", count: 1 }],
    crafterId: "merchant",
  },
  {
    id: "craft_iron_arrow",
    name: "鉄の矢を作る（5本）",
    resultItem: "鉄の矢",
    count: 5,
    materials: [
      { materialId: "wood", count: 1 },
      { materialId: "iron_ore", count: 1 },
    ],
    crafterId: "merchant",
  },
];

// --- Random Artifact Generation ---

const ARTIFACT_PREFIXES = [
  "輝く",
  "古の",
  "呪われし",
  "聖なる",
  "竜殺しの",
  "失われた",
  "伝説の",
  "黄金の",
  "星降りの",
  "魔王の",
];

const ARTIFACT_WEAPON_NAMES: { name: string; type: WeaponType }[] = [
  { name: "剣", type: "sword" },
  { name: "斧", type: "axe" },
  { name: "槍", type: "spear" },
  { name: "刀", type: "sword" },
  { name: "短剣", type: "dagger" },
  { name: "大剣", type: "sword" },
  { name: "杖", type: "staff" },
];
const ARTIFACT_ARMOR_NAMES = ["鎧", "胸当て", "法衣", "外套", "甲冑"];
const ARTIFACT_ACCESSORY_NAMES = ["指輪", "首飾り", "腕輪", "護符", "冠"];

let artifactCounter = 0;

export function generateArtifact(floor: number): EquipmentDef {
  const slots: ("weapon" | "armor" | "accessory")[] = ["weapon", "armor", "accessory"];
  const slot = slots[Math.floor(Math.random() * slots.length)];

  const prefix = ARTIFACT_PREFIXES[Math.floor(Math.random() * ARTIFACT_PREFIXES.length)];
  let baseName: string;
  let weaponType: WeaponType | undefined;
  switch (slot) {
    case "weapon": {
      const entry = ARTIFACT_WEAPON_NAMES[Math.floor(Math.random() * ARTIFACT_WEAPON_NAMES.length)];
      baseName = entry.name;
      weaponType = entry.type;
      break;
    }
    case "armor":
      baseName = ARTIFACT_ARMOR_NAMES[Math.floor(Math.random() * ARTIFACT_ARMOR_NAMES.length)];
      break;
    case "accessory":
      baseName =
        ARTIFACT_ACCESSORY_NAMES[Math.floor(Math.random() * ARTIFACT_ACCESSORY_NAMES.length)];
      break;
  }

  const name = `${prefix}${baseName}`;
  const id = `artifact_${Date.now()}_${artifactCounter++}`;

  // Scale stats with floor
  const power = Math.floor(floor * 1.5) + 2;
  let attack = 0;
  let defense = 0;
  let spBonus = 0;

  if (slot === "weapon") {
    attack = power + Math.floor(Math.random() * (power / 2));
  } else if (slot === "armor") {
    defense = power + Math.floor(Math.random() * (power / 2));
  } else {
    // Accessory: mixed
    attack = Math.floor(power / 2);
    defense = Math.floor(power / 2);
    spBonus = Math.floor(power * 3);
  }

  // Random resistances (0-2 elements)
  const elements: Element[] = ["fire", "ice", "poison", "lightning"];
  const resistances: Partial<Record<Element, number>> = {};
  const numResist = Math.floor(Math.random() * 3); // 0, 1, or 2
  const shuffled = [...elements].sort(() => Math.random() - 0.5);
  for (let i = 0; i < numResist; i++) {
    resistances[shuffled[i]] = 20 + Math.floor(Math.random() * 40); // 20-59%
  }

  // Build description
  const parts: string[] = [];
  if (attack > 0) parts.push(`攻撃+${attack}`);
  if (defense > 0) parts.push(`防御+${defense}`);
  if (spBonus > 0) parts.push(`MP+${spBonus}`);
  for (const [elem, val] of Object.entries(resistances)) {
    parts.push(`${ELEMENT_NAMES[elem as Element]}耐性${val}%`);
  }

  return {
    id,
    name,
    slot,
    attack,
    defense,
    spBonus,
    description: parts.join(" "),
    resistances: Object.keys(resistances).length > 0 ? resistances : undefined,
    isArtifact: true,
    weaponType,
  };
}
