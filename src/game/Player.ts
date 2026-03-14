import { Entity } from "./Entity";
import type { Game } from "./Game";
import type { SkillDef } from "./Skill";
import type { EquipmentDef, Element, WeaponType } from "./Equipment";
import type { ItemDef } from "./Item";
import {
  PLAYER_INITIAL_HP,
  PLAYER_INITIAL_SP,
  PLAYER_INITIAL_HUNGER,
  COLOR_PLAYER,
} from "../constants";

export interface JobDef {
  id: string;
  name: string;
  description: string;
  attackBonus: number;
  defenseBonus: number;
  hpBonus: number;
  spBonus: number;
  maxSkills: number;
  spRegenBonus: number; // extra SP regen per turn
  hungerCostMult: number; // multiplier for hunger cost (1.0 = normal)
  hpRegen: boolean; // passive HP regen
  trapEvadeBonus: number; // extra trap evasion chance (0-1)
  initialSkills: string[]; // skill names to start with
  allowedWeapons?: WeaponType[]; // if set, can only equip these weapon types
  learnableSkills?: string[]; // if set, can only learn these skills
}

export const JOB_DEFS: JobDef[] = [
  {
    id: "warrior",
    name: "戦士",
    description: "攻撃+5 防御+3 HP+20 スキル枠2 剣・斧装備可",
    attackBonus: 5,
    defenseBonus: 3,
    hpBonus: 20,
    spBonus: -20,
    maxSkills: 2,
    spRegenBonus: 0,
    hungerCostMult: 1.0,
    hpRegen: false,
    trapEvadeBonus: 0,
    initialSkills: [],
    allowedWeapons: ["sword", "axe"],
    learnableSkills: ["バリア"],
  },
  {
    id: "mage",
    name: "魔法使い",
    description: "MP+40 MP回復速い 攻撃-3",
    attackBonus: -3,
    defenseBonus: 0,
    hpBonus: 0,
    spBonus: 40,
    maxSkills: 3,
    spRegenBonus: 2,
    hungerCostMult: 1.0,
    hpRegen: false,
    trapEvadeBonus: 0,
    initialSkills: ["ファイアボルト"],
    learnableSkills: ["ファイアボルト", "メテオ", "バリア", "テレポート"],
  },
  {
    id: "priest",
    name: "僧侶",
    description: "防御+2 HP自然回復 ヒール習得済",
    attackBonus: 0,
    defenseBonus: 2,
    hpBonus: 0,
    spBonus: 10,
    maxSkills: 3,
    spRegenBonus: 0,
    hungerCostMult: 1.0,
    hpRegen: true,
    trapEvadeBonus: 0,
    initialSkills: ["ヒール"],
    learnableSkills: ["ヒール", "ヒールII", "バリア", "テレポート"],
  },
  {
    id: "thief",
    name: "盗賊",
    description: "攻撃+2 満腹消費半減 罠回避+ スキル枠2",
    attackBonus: 2,
    defenseBonus: 0,
    hpBonus: 0,
    spBonus: 0,
    maxSkills: 2,
    spRegenBonus: 0,
    hungerCostMult: 0.5,
    hpRegen: false,
    trapEvadeBonus: 0.3,
    initialSkills: ["テレポート"],
    learnableSkills: ["テレポート", "射撃"],
  },
  {
    id: "ranger",
    name: "狩人",
    description: "攻撃+3 射撃習得済 短剣のみ装備可 矢を消費して射撃",
    attackBonus: 3,
    defenseBonus: 0,
    hpBonus: 0,
    spBonus: 0,
    maxSkills: 3,
    spRegenBonus: 0,
    hungerCostMult: 1.0,
    hpRegen: false,
    trapEvadeBonus: 0,
    initialSkills: ["射撃"],
    allowedWeapons: ["dagger"],
    learnableSkills: ["射撃"],
  },
];

export interface GiftDef {
  id: string;
  name: string;
  description: string;
  apply: (player: Player) => void;
}

export const GIFT_DEFS: GiftDef[] = [
  {
    id: "sword_saint",
    name: "剣聖の才",
    description: "攻撃力+5。剣の扱いに天賦の才を持つ。",
    apply: (p) => {
      p.baseAttack += 5;
      p.recalcStats();
    },
  },
  {
    id: "guardian",
    name: "守護の祝福",
    description: "防御+3、最大HP+20。女神の守りが身を護る。",
    apply: (p) => {
      p.baseDefense += 3;
      p.maxHp += 20;
      p.hp += 20;
      p.recalcStats();
    },
  },
  {
    id: "mana_spring",
    name: "魔力の泉",
    description: "最大MP+40。溢れる魔力が宿る。",
    apply: (p) => {
      p.baseSp += 40;
      p.sp += 40;
      p.recalcStats();
    },
  },
  {
    id: "fire_protection",
    name: "炎の加護",
    description: "炎耐性50%。炎から身を守る。",
    apply: (p) => {
      p.giftResistances.fire = 50;
    },
  },
  {
    id: "survival_instinct",
    name: "生存本能",
    description: "最大満腹+50、HP自然回復。生き延びる力が備わる。",
    apply: (p) => {
      p.maxHunger += 50;
      p.hunger += 50;
      p.hpRegen = true;
    },
  },
  {
    id: "poison_immunity",
    name: "毒無効の体質",
    description: "毒耐性100%。毒が一切効かない。",
    apply: (p) => {
      p.giftResistances.poison = 100;
    },
  },
];

export class Player extends Entity {
  sp: number;
  maxSp: number;
  baseSp: number;
  hunger: number;
  maxHunger: number;
  visibleTiles: Set<string> = new Set();
  skills: SkillDef[] = [];
  armorTurns = 0;
  lastDx = 0;
  lastDy = 1;

  // Base stats (without equipment)
  baseAttack: number;
  baseDefense: number;

  // Equipment (currently worn)
  weapon: EquipmentDef | null = null;
  armor: EquipmentDef | null = null;
  accessory: EquipmentDef | null = null;

  // Equipment inventory (all owned, including equipped)
  ownedEquipment: EquipmentDef[] = [];

  // Inventory: materials
  materials: Map<string, number> = new Map();

  // Inventory: consumables (name → {def, count})
  consumables: Map<string, { def: ItemDef; count: number }> = new Map();

  // Job
  jobId: string | null = null;
  maxSkills = 3;
  spRegenBonus = 0;
  hungerCostMult = 1.0;
  hungerAccum = 0;
  trapEvadeBonus = 0;
  allowedWeapons: WeaponType[] | null = null; // null = all allowed
  learnableSkills: string[] | null = null; // null = all allowed

  // Goddess gift
  giftId: string | null = null;
  giftResistances: Partial<Record<Element, number>> = {};
  hpRegen = false;

  // Gold
  gold = 0;

  // Death cause tracking
  deathCause = "";

  constructor(game: Game) {
    super(game, "@", COLOR_PLAYER, "転生者", PLAYER_INITIAL_HP, 10, 2);
    this.baseAttack = 10;
    this.baseDefense = 2;
    this.baseSp = PLAYER_INITIAL_SP;
    this.sp = PLAYER_INITIAL_SP;
    this.maxSp = PLAYER_INITIAL_SP;
    this.hunger = PLAYER_INITIAL_HUNGER;
    this.maxHunger = PLAYER_INITIAL_HUNGER;
  }

  applyJob(job: JobDef): void {
    this.jobId = job.id;
    this.baseAttack += job.attackBonus;
    this.baseDefense += job.defenseBonus;
    this.maxHp += job.hpBonus;
    this.hp += job.hpBonus;
    this.baseSp += job.spBonus;
    this.sp += job.spBonus;
    this.maxSkills = job.maxSkills;
    this.spRegenBonus = job.spRegenBonus;
    this.hungerCostMult = job.hungerCostMult;
    if (job.hpRegen) this.hpRegen = true;
    this.trapEvadeBonus = job.trapEvadeBonus;
    if (job.allowedWeapons) this.allowedWeapons = job.allowedWeapons;
    if (job.learnableSkills) this.learnableSkills = job.learnableSkills;
    this.recalcStats();
  }

  recalcStats(): void {
    this.attack = this.baseAttack;
    this.defense = this.baseDefense;
    this.maxSp = this.baseSp;

    if (this.weapon) {
      this.attack += this.weapon.attack;
      this.defense += this.weapon.defense;
      this.maxSp += this.weapon.spBonus;
    }
    if (this.armor) {
      this.attack += this.armor.attack;
      this.defense += this.armor.defense;
      this.maxSp += this.armor.spBonus;
    }
    if (this.accessory) {
      this.attack += this.accessory.attack;
      this.defense += this.accessory.defense;
      this.maxSp += this.accessory.spBonus;
    }

    if (this.sp > this.maxSp) this.sp = this.maxSp;
  }

  canEquip(equipment: EquipmentDef): boolean {
    if (equipment.slot === "weapon" && this.allowedWeapons && equipment.weaponType) {
      return this.allowedWeapons.includes(equipment.weaponType);
    }
    return true;
  }

  equip(equipment: EquipmentDef): void {
    if (!this.canEquip(equipment)) {
      this.game.addMessage(`${equipment.name}はこの職業では装備できない！`);
      return;
    }
    switch (equipment.slot) {
      case "weapon":
        this.weapon = equipment;
        break;
      case "armor":
        this.armor = equipment;
        break;
      case "accessory":
        this.accessory = equipment;
        break;
    }
    // Add to owned list if not already there
    if (!this.ownedEquipment.some((e) => e.id === equipment.id)) {
      this.ownedEquipment.push(equipment);
    }
    this.recalcStats();
    this.game.addMessage(`${equipment.name}を装備した！ (${equipment.description})`);
  }

  unequip(slot: "weapon" | "armor" | "accessory"): void {
    const current = this[slot];
    if (!current) return;
    this[slot] = null;
    this.recalcStats();
    this.game.addMessage(`${current.name}を外した`);
  }

  addMaterial(materialId: string, count = 1): void {
    const current = this.materials.get(materialId) ?? 0;
    this.materials.set(materialId, current + count);
  }

  getMaterialCount(materialId: string): number {
    return this.materials.get(materialId) ?? 0;
  }

  removeMaterial(materialId: string, count: number): boolean {
    const current = this.getMaterialCount(materialId);
    if (current < count) return false;
    if (current === count) {
      this.materials.delete(materialId);
    } else {
      this.materials.set(materialId, current - count);
    }
    return true;
  }

  addConsumable(def: ItemDef): void {
    const existing = this.consumables.get(def.name);
    if (existing) {
      existing.count++;
    } else {
      this.consumables.set(def.name, { def, count: 1 });
    }
    this.game.addMessage(`${def.name}をインベントリに入れた`);
  }

  useConsumable(name: string): boolean {
    const entry = this.consumables.get(name);
    if (!entry || entry.count <= 0) return false;
    entry.def.effect(this.game);
    entry.count--;
    if (entry.count <= 0) {
      this.consumables.delete(name);
    }
    return true;
  }

  placeOnMap(x: number, y: number): void {
    this.x = x;
    this.y = y;
  }

  getResistance(element: Element): number {
    let total = this.giftResistances[element] ?? 0;
    for (const eq of [this.weapon, this.armor, this.accessory]) {
      if (eq?.resistances?.[element]) {
        total += eq.resistances[element];
      }
    }
    return Math.min(100, total);
  }

  takeElementalDamage(amount: number, element: Element, sourceName: string): number {
    if (this.armorTurns > 0) {
      this.game.addMessage("バリアが攻撃を弾いた！");
      return 0;
    }
    const resist = this.getResistance(element);
    const reduced = Math.max(1, Math.floor(amount * (1 - resist / 100)) - this.defense);
    this.hp = Math.max(0, this.hp - reduced);
    this.deathCause = sourceName;
    return reduced;
  }

  override takeDamage(amount: number): number {
    if (this.armorTurns > 0) {
      this.game.addMessage("バリアが攻撃を弾いた！");
      return 0;
    }
    const dmg = super.takeDamage(amount);
    return dmg;
  }

  learnSkill(skill: SkillDef): "learned" | "duplicate" | "full" | "cannot" {
    if (this.learnableSkills && !this.learnableSkills.includes(skill.name)) {
      this.game.addMessage(`この職業では「${skill.name}」を習得できない！`);
      return "cannot";
    }
    if (this.skills.some((s) => s.name === skill.name)) {
      this.game.addMessage("すでに習得済みのスキルだ");
      return "duplicate";
    }
    if (this.skills.length >= this.maxSkills) {
      return "full";
    }
    this.skills.push(skill);
    this.game.addMessage(`スキル「${skill.name}」を習得した！`);
    return "learned";
  }

  forgetAndLearnSkill(forgetIndex: number, newSkill: SkillDef): void {
    const old = this.skills[forgetIndex];
    this.skills[forgetIndex] = newSkill;
    this.game.addMessage(`「${old.name}」を忘れて「${newSkill.name}」を習得した！`);
  }
}
