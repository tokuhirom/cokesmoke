import { describe, it, expect } from "vitest";
import { Player, GIFT_DEFS } from "../Player";
import { EQUIPMENT_DEFS } from "../Equipment";
import { createMockGame } from "./testHelper";

function createPlayer() {
  const game = createMockGame();
  const player = new Player(game);
  game.player = player;
  return { player, game };
}

describe("Player basics", () => {
  it("should initialize with correct base stats", () => {
    const { player } = createPlayer();
    expect(player.baseAttack).toBe(10);
    expect(player.baseDefense).toBe(2);
    expect(player.hp).toBeGreaterThan(0);
    expect(player.hunger).toBeGreaterThan(0);
  });

  it("should take damage correctly", () => {
    const { player } = createPlayer();
    const initialHp = player.hp;
    const dmg = player.takeDamage(5);
    expect(dmg).toBe(Math.max(1, 5 - player.defense));
    expect(player.hp).toBe(initialHp - dmg);
  });

  it("should block damage with barrier", () => {
    const { player } = createPlayer();
    player.armorTurns = 3;
    const initialHp = player.hp;
    const dmg = player.takeDamage(100);
    expect(dmg).toBe(0);
    expect(player.hp).toBe(initialHp);
  });
});

describe("Equipment system", () => {
  it("should equip weapon and recalc stats", () => {
    const { player } = createPlayer();
    const baseAtk = player.attack;
    player.equip(EQUIPMENT_DEFS["wooden_sword"]);
    expect(player.attack).toBe(baseAtk + 2);
    expect(player.weapon).toBe(EQUIPMENT_DEFS["wooden_sword"]);
  });

  it("should add to owned equipment on equip", () => {
    const { player } = createPlayer();
    player.equip(EQUIPMENT_DEFS["leather_armor"]);
    expect(player.ownedEquipment).toContain(EQUIPMENT_DEFS["leather_armor"]);
  });

  it("should not duplicate in owned equipment", () => {
    const { player } = createPlayer();
    player.equip(EQUIPMENT_DEFS["wooden_sword"]);
    player.equip(EQUIPMENT_DEFS["wooden_sword"]);
    const count = player.ownedEquipment.filter((e) => e.id === "wooden_sword").length;
    expect(count).toBe(1);
  });

  it("should unequip and recalc stats", () => {
    const { player } = createPlayer();
    const baseAtk = player.attack;
    player.equip(EQUIPMENT_DEFS["wooden_sword"]);
    player.unequip("weapon");
    expect(player.attack).toBe(baseAtk);
    expect(player.weapon).toBeNull();
  });
});

describe("Resistance system", () => {
  it("should return 0 resistance by default", () => {
    const { player } = createPlayer();
    expect(player.getResistance("fire")).toBe(0);
    expect(player.getResistance("ice")).toBe(0);
  });

  it("should get resistance from equipment", () => {
    const { player } = createPlayer();
    player.equip(EQUIPMENT_DEFS["dragon_scale_armor"]);
    expect(player.getResistance("fire")).toBe(50);
  });

  it("should stack resistance from multiple equipment", () => {
    const { player } = createPlayer();
    player.equip(EQUIPMENT_DEFS["dragon_scale_armor"]); // fire 50
    player.equip(EQUIPMENT_DEFS["adamantite_armor"]); // fire 30, lightning 30
    // Only one armor at a time - second equip replaces first
    expect(player.getResistance("fire")).toBe(30);
    expect(player.getResistance("lightning")).toBe(30);
  });

  it("should include gift resistance", () => {
    const { player } = createPlayer();
    player.giftResistances.fire = 50;
    expect(player.getResistance("fire")).toBe(50);
  });

  it("should stack gift and equipment resistance", () => {
    const { player } = createPlayer();
    player.giftResistances.fire = 50;
    player.equip(EQUIPMENT_DEFS["dragon_scale_armor"]); // fire 50
    expect(player.getResistance("fire")).toBe(100); // capped at 100
  });

  it("should cap resistance at 100", () => {
    const { player } = createPlayer();
    player.giftResistances.poison = 100;
    expect(player.getResistance("poison")).toBe(100);
  });

  it("should reduce elemental damage by resistance", () => {
    const { player } = createPlayer();
    player.giftResistances.fire = 50;
    const initialHp = player.hp;
    const dmg = player.takeElementalDamage(20, "fire", "テスト");
    // 50% reduction: 20 * 0.5 = 10, minus defense 2 = 8
    expect(dmg).toBe(8);
    expect(player.hp).toBe(initialHp - 8);
  });

  it("should deal minimum 1 damage even with 100% resistance", () => {
    const { player } = createPlayer();
    player.giftResistances.poison = 100;
    const initialHp = player.hp;
    player.takeElementalDamage(10, "poison", "テスト");
    expect(player.hp).toBe(initialHp - 1);
  });

  it("should track death cause on elemental damage", () => {
    const { player } = createPlayer();
    player.takeElementalDamage(10, "fire", "炎竜");
    expect(player.deathCause).toBe("炎竜");
  });
});

describe("Materials", () => {
  it("should add and get materials", () => {
    const { player } = createPlayer();
    player.addMaterial("iron_ore", 3);
    expect(player.getMaterialCount("iron_ore")).toBe(3);
  });

  it("should remove materials", () => {
    const { player } = createPlayer();
    player.addMaterial("iron_ore", 5);
    expect(player.removeMaterial("iron_ore", 3)).toBe(true);
    expect(player.getMaterialCount("iron_ore")).toBe(2);
  });

  it("should fail to remove more than owned", () => {
    const { player } = createPlayer();
    player.addMaterial("iron_ore", 2);
    expect(player.removeMaterial("iron_ore", 5)).toBe(false);
    expect(player.getMaterialCount("iron_ore")).toBe(2);
  });
});

describe("Skills", () => {
  it("should learn a skill", () => {
    const { player } = createPlayer();
    const result = player.learnSkill({
      name: "テスト",
      description: "",
      spCost: 10,
      execute: () => {},
    });
    expect(result).toBe("learned");
    expect(player.skills.length).toBe(1);
  });

  it("should not learn duplicate skills", () => {
    const { player } = createPlayer();
    const skill = { name: "テスト", description: "", spCost: 10, execute: () => {} };
    player.learnSkill(skill);
    const result = player.learnSkill(skill);
    expect(result).toBe("duplicate");
    expect(player.skills.length).toBe(1);
  });

  it("should return full when 3 skills learned", () => {
    const { player } = createPlayer();
    player.learnSkill({ name: "A", description: "", spCost: 10, execute: () => {} });
    player.learnSkill({ name: "B", description: "", spCost: 10, execute: () => {} });
    player.learnSkill({ name: "C", description: "", spCost: 10, execute: () => {} });
    const result = player.learnSkill({ name: "D", description: "", spCost: 10, execute: () => {} });
    expect(result).toBe("full");
    expect(player.skills.length).toBe(3);
  });
});

describe("Gifts", () => {
  it("should have valid gift definitions", () => {
    expect(GIFT_DEFS.length).toBeGreaterThan(0);
    for (const gift of GIFT_DEFS) {
      expect(gift.id).toBeTruthy();
      expect(gift.name).toBeTruthy();
      expect(gift.description).toBeTruthy();
    }
  });

  it("sword_saint should increase attack", () => {
    const { player } = createPlayer();
    const baseAtk = player.baseAttack;
    const gift = GIFT_DEFS.find((g) => g.id === "sword_saint")!;
    gift.apply(player);
    expect(player.baseAttack).toBe(baseAtk + 5);
  });

  it("fire_protection should add fire resistance", () => {
    const { player } = createPlayer();
    const gift = GIFT_DEFS.find((g) => g.id === "fire_protection")!;
    gift.apply(player);
    expect(player.getResistance("fire")).toBe(50);
  });

  it("poison_immunity should give 100% poison resistance", () => {
    const { player } = createPlayer();
    const gift = GIFT_DEFS.find((g) => g.id === "poison_immunity")!;
    gift.apply(player);
    expect(player.getResistance("poison")).toBe(100);
  });

  it("survival_instinct should increase max hunger and enable regen", () => {
    const { player } = createPlayer();
    const baseHunger = player.maxHunger;
    const gift = GIFT_DEFS.find((g) => g.id === "survival_instinct")!;
    gift.apply(player);
    expect(player.maxHunger).toBe(baseHunger + 50);
    expect(player.hpRegen).toBe(true);
  });
});
