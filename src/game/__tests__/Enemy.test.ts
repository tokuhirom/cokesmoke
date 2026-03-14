import { describe, it, expect } from "vitest";
import { ENEMY_DEFS } from "../Enemy";

describe("ENEMY_DEFS", () => {
  it("should have all enemy types defined", () => {
    const expectedKeys = ["g", "s", "O", "D", "G", "T", "R", "A"];
    for (const key of expectedKeys) {
      expect(ENEMY_DEFS[key]).toBeDefined();
    }
  });

  it("bosses should be marked as isBoss", () => {
    expect(ENEMY_DEFS["D"].isBoss).toBe(true);
    expect(ENEMY_DEFS["G"].isBoss).toBe(true);
    expect(ENEMY_DEFS["T"].isBoss).toBe(true);
    expect(ENEMY_DEFS["R"].isBoss).toBe(true);
    expect(ENEMY_DEFS["A"].isBoss).toBe(true);
  });

  it("regular enemies should not be bosses", () => {
    expect(ENEMY_DEFS["g"].isBoss).toBe(false);
    expect(ENEMY_DEFS["s"].isBoss).toBe(false);
    expect(ENEMY_DEFS["O"].isBoss).toBe(false);
  });

  it("elemental enemies should have elements", () => {
    expect(ENEMY_DEFS["s"].element).toBe("poison");
    expect(ENEMY_DEFS["D"].element).toBe("fire");
    expect(ENEMY_DEFS["R"].element).toBe("fire");
    expect(ENEMY_DEFS["T"].element).toBe("poison");
    expect(ENEMY_DEFS["A"].element).toBe("lightning");
  });

  it("non-elemental enemies should have no element", () => {
    expect(ENEMY_DEFS["g"].element).toBeUndefined();
    expect(ENEMY_DEFS["O"].element).toBeUndefined();
    expect(ENEMY_DEFS["G"].element).toBeUndefined();
  });

  it("boss stats should scale with dungeon difficulty", () => {
    // first dungeon boss < forest boss < fire boss < abyss boss
    expect(ENEMY_DEFS["G"].hp).toBeLessThan(ENEMY_DEFS["T"].hp);
    expect(ENEMY_DEFS["T"].hp).toBeLessThan(ENEMY_DEFS["R"].hp);
    expect(ENEMY_DEFS["R"].hp).toBeLessThan(ENEMY_DEFS["A"].hp);
  });
});
