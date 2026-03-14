import type { Game } from "../Game";

/** Minimal mock of Game for unit testing game logic without DOM */
export function createMockGame(): Game {
  const messages: string[] = [];
  const mock = {
    state: "dungeon" as string,
    messages,
    player: null as unknown,
    companion: null,
    dungeonScene: null,
    currentScene: null,
    addMessage(msg: string) {
      messages.push(msg);
    },
    isPlayable() {
      return true;
    },
    gameOver() {
      mock.state = "gameover";
    },
  };
  return mock as unknown as Game;
}
