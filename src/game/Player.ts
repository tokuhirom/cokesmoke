import { Entity } from "./Entity";
import type { Game } from "./Game";
import type { SkillDef } from "./Skill";
import {
  PLAYER_INITIAL_HP,
  PLAYER_INITIAL_SP,
  PLAYER_INITIAL_FUEL,
  COLOR_PLAYER,
} from "../constants";

export class Player extends Entity {
  sp: number;
  maxSp: number;
  fuel: number;
  visibleTiles: Set<string> = new Set();
  skills: SkillDef[] = [];
  armorTurns = 0;
  lastDx = 0;
  lastDy = 1;

  constructor(game: Game) {
    super(game, "@", COLOR_PLAYER, "転生者", PLAYER_INITIAL_HP, 10, 2);
    this.sp = PLAYER_INITIAL_SP;
    this.maxSp = PLAYER_INITIAL_SP;
    this.fuel = PLAYER_INITIAL_FUEL;
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
