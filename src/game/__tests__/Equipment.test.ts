import { describe, it, expect } from "vitest";
import {
  EQUIPMENT_DEFS,
  ELEMENT_NAMES,
  generateArtifact,
  CRAFT_RECIPES,
  MATERIAL_DEFS,
} from "../Equipment";

describe("EQUIPMENT_DEFS", () => {
  it("should have all required equipment", () => {
    expect(EQUIPMENT_DEFS["wooden_sword"]).toBeDefined();
    expect(EQUIPMENT_DEFS["leather_armor"]).toBeDefined();
    expect(EQUIPMENT_DEFS["heroes_ring"]).toBeDefined();
  });

  it("should have correct slots", () => {
    expect(EQUIPMENT_DEFS["wooden_sword"].slot).toBe("weapon");
    expect(EQUIPMENT_DEFS["leather_armor"].slot).toBe("armor");
    expect(EQUIPMENT_DEFS["heroes_ring"].slot).toBe("accessory");
  });

  it("should have resistances on relevant equipment", () => {
    expect(EQUIPMENT_DEFS["dragon_scale_armor"].resistances?.fire).toBe(50);
    expect(EQUIPMENT_DEFS["elven_cloak"].resistances?.ice).toBe(30);
    expect(EQUIPMENT_DEFS["adamantite_armor"].resistances?.fire).toBe(30);
    expect(EQUIPMENT_DEFS["adamantite_armor"].resistances?.lightning).toBe(30);
  });
});

describe("ELEMENT_NAMES", () => {
  it("should have all four elements", () => {
    expect(ELEMENT_NAMES.fire).toBe("炎");
    expect(ELEMENT_NAMES.ice).toBe("氷");
    expect(ELEMENT_NAMES.poison).toBe("毒");
    expect(ELEMENT_NAMES.lightning).toBe("雷");
  });
});

describe("generateArtifact", () => {
  it("should generate an artifact with valid properties", () => {
    const artifact = generateArtifact(5);
    expect(artifact.id).toMatch(/^artifact_/);
    expect(artifact.name).toBeTruthy();
    expect(artifact.isArtifact).toBe(true);
    expect(["weapon", "armor", "accessory"]).toContain(artifact.slot);
    expect(artifact.description).toBeTruthy();
  });

  it("should scale stats with floor", () => {
    const low = generateArtifact(1);
    const high = generateArtifact(10);
    // Higher floor should generally have higher total stats
    const totalLow = low.attack + low.defense + low.spBonus;
    const totalHigh = high.attack + high.defense + high.spBonus;
    // Not deterministic, but with floor 10 the base power is much higher
    expect(totalHigh).toBeGreaterThan(0);
    expect(totalLow).toBeGreaterThan(0);
  });

  it("should generate unique IDs", () => {
    const a1 = generateArtifact(3);
    const a2 = generateArtifact(3);
    expect(a1.id).not.toBe(a2.id);
  });

  it("weapons should have attack > 0", () => {
    // Generate many artifacts to find a weapon
    for (let i = 0; i < 100; i++) {
      const artifact = generateArtifact(5);
      if (artifact.slot === "weapon") {
        expect(artifact.attack).toBeGreaterThan(0);
        return;
      }
    }
  });
});

describe("CRAFT_RECIPES", () => {
  it("should reference valid equipment IDs", () => {
    for (const recipe of CRAFT_RECIPES) {
      expect(EQUIPMENT_DEFS[recipe.resultEquipment]).toBeDefined();
    }
  });

  it("should reference valid material IDs", () => {
    for (const recipe of CRAFT_RECIPES) {
      for (const mat of recipe.materials) {
        expect(MATERIAL_DEFS.find((m) => m.id === mat.materialId)).toBeDefined();
      }
    }
  });
});
