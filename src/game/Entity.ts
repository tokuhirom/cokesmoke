import type { Game } from "./Game";

export class Entity {
  x = 0;
  y = 0;
  char: string;
  color: string;
  name: string;
  hp: number;
  maxHp: number;
  attack: number;
  defense: number;
  game: Game;

  constructor(game: Game, char: string, color: string, name: string, hp: number, attack: number, defense: number) {
    this.game = game;
    this.char = char;
    this.color = color;
    this.name = name;
    this.hp = hp;
    this.maxHp = hp;
    this.attack = attack;
    this.defense = defense;
  }

  isAlive(): boolean {
    return this.hp > 0;
  }

  takeDamage(amount: number): number {
    const actual = Math.max(1, amount - this.defense);
    this.hp = Math.max(0, this.hp - actual);
    return actual;
  }
}
