import type * as ROT from "rot-js";
import type { Game } from "../Game";

export interface Scene {
  /** Called when the scene becomes active */
  onEnter(game: Game): void;
  /** Handle directional input (dx, dy). Return true if handled. */
  onMove(dx: number, dy: number, game: Game): boolean;
  /** Handle wait/rest input */
  onWait(game: Game): void;
  /** Handle descend/interact input */
  onDescend(game: Game): boolean;
  /** Render the scene onto the ROT.Display */
  render(display: ROT.Display, game: Game): void;
  /** Return status bar HTML */
  getStatusHTML(game: Game): string;
}
