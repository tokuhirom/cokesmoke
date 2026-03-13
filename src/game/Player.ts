import { Entity } from "./Entity";
import type { Game } from "./Game";
import type { SkillDef } from "./Skill";
import type { EquipmentDef } from "./Equipment";
import {
  PLAYER_INITIAL_HP,
  PLAYER_INITIAL_SP,
  PLAYER_INITIAL_FUEL,
  COLOR_PLAYER,
} from "../constants";

export class Player extends Entity {
  sp: number;
  maxSp: number;
  baseSp: number;
  fuel: number;
  visibleTiles: Set<string> = new Set();
  skills: SkillDef[] = [];
  armorTurns = 0;
  lastDx = 0;
  lastDy = 1;

  // Base stats (without equipment)
  baseAttack: number;
  baseDefense: number;

  // Equipment
  weapon: EquipmentDef | null = null;
  armor: EquipmentDef | null = null;
  accessory: EquipmentDef | null = null;

  // Inventory: materials
  materials: Map<string, number> = new Map();

  constructor(game: Game) {
    super(game, "@", COLOR_PLAYER, "転生者", PLAYER_INITIAL_HP, 10, 2);
    this.baseAttack = 10;
    this.baseDefense = 2;
    this.baseSp = PLAYER_INITIAL_SP;
    this.sp = PLAYER_INITIAL_SP;
    this.maxSp = PLAYER_INITIAL_SP;
    this.fuel = PLAYER_INITIAL_FUEL;
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

  equip(equipment: EquipmentDef): void {
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
    this.recalcStats();
    this.game.addMessage(`${equipment.name}を装備した！ (${equipment.description})`);
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

  placeOnMap(x: number, y: number): void {
    this.x = x;
    this.y = y;
  }

  override takeDamage(amount: number): number {
    if (this.armorTurns > 0) {
      this.game.addMessage("バリアが攻撃を弾いた！");
      return 0;
    }
    return super.takeDamage(amount);
  }

  learnSkill(skill: SkillDef): boolean {
    if (this.skills.length >= 3) {
      this.game.addMessage("スキルスロットがいっぱいだ！");
      return false;
    }
    if (this.skills.some((s) => s.name === skill.name)) {
      this.game.addMessage("すでに習得済みのスキルだ");
      return false;
    }
    this.skills.push(skill);
    this.game.addMessage(`スキル「${skill.name}」を習得した！`);
    return true;
  }
}
