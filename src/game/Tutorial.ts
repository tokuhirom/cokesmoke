import type { Game } from "./Game";

export interface TutorialStep {
  id: string;
  trigger: (game: Game) => boolean;
  message: string;
  onComplete?: (game: Game) => void;
}

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: "wake_up",
    trigger: () => true, // Immediate
    message:
      "頭がぼんやりする...ここは...迷宮？\n少し腹が減っている。\n\nまずは歩いてみよう。\n（D-padか矢印キーで移動）",
  },
  {
    id: "first_move",
    trigger: (game) => {
      const p = game.player;
      return p.x !== game.dungeon.startX || p.y !== game.dungeon.startY;
    },
    message:
      "動けるようだ。周囲が少し見える。\n\n満腹度は毎ターン減る。0になると空腹で\n体力が削られていくので食料を確保しよう。",
  },
  {
    id: "see_enemy",
    trigger: (game) => {
      return game.enemies.some((e) => e.isAlive() && game.player.visibleTiles.has(`${e.x},${e.y}`));
    },
    message: "モンスターだ！\n\n敵の方向に移動すると攻撃できる。\n斜め方向の攻撃もOK。",
  },
  {
    id: "first_kill",
    trigger: (game) => {
      return game.enemies.some((e) => !e.isAlive());
    },
    message:
      "やった、倒せた！\n\nMPが高いほど攻撃にボーナスがつく。\n魔法陣（≡）の上を通るとMP回復。",
  },
  {
    id: "see_item",
    trigger: (game) => {
      return game.items.some((i) => !i.picked && game.player.visibleTiles.has(`${i.x},${i.y}`));
    },
    message: "何か落ちている！\n\nアイテムの上を歩くと自動で拾える。\n食料は最優先で確保しよう。",
  },
  {
    id: "pickup_item",
    trigger: (game) => {
      return game.items.some((i) => i.picked);
    },
    message:
      "アイテムを手に入れた！\n\n迷宮には剣、鎧、回復薬、魔導書など\n様々なアイテムが落ちている。",
  },
  {
    id: "see_stairs",
    trigger: (game) => {
      const d = game.dungeon;
      return game.player.visibleTiles.has(`${d.stairsX},${d.stairsY}`);
    },
    message:
      "階段(>)を見つけた！\n\n階段の上に立って「階段>」ボタンか\n>キーを押すと次の階層へ進める。\n\nこの先が本当の迷宮だ。準備はいいか？",
  },
];

export class TutorialManager {
  private steps: TutorialStep[];
  currentStepIndex = 0;
  pendingDialog: TutorialStep | null = null;
  active: boolean;
  private dialogShownForStep = -1;

  constructor(active: boolean) {
    this.active = active;
    this.steps = TUTORIAL_STEPS;
  }

  check(game: Game): void {
    if (!this.active || this.currentStepIndex >= this.steps.length) return;
    if (this.pendingDialog) return; // Already showing a dialog

    const step = this.steps[this.currentStepIndex];
    if (step.trigger(game) && this.dialogShownForStep !== this.currentStepIndex) {
      this.pendingDialog = step;
      this.dialogShownForStep = this.currentStepIndex;
    }
  }

  advance(game: Game): void {
    if (this.pendingDialog?.onComplete) {
      this.pendingDialog.onComplete(game);
    }
    this.pendingDialog = null;
    this.currentStepIndex++;
  }

  isComplete(): boolean {
    return this.currentStepIndex >= this.steps.length;
  }
}
