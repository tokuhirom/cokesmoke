# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

異世界ローグライク（Isekai Dungeon Crawl） - a turn-based roguelike browser game built with Vite + TypeScript + ROT.js. Isekai fantasy theme with world map, multiple towns/dungeons, crafting, companions, goddess revival system, and elemental resistance puzzle.

## Commands

- `npm run dev` — Start Vite dev server
- `npm run build` — TypeScript compile + Vite build (`tsc && vite build`)
- `npm run test` — Run tests with vitest (`vitest run`)
- `npm run test:watch` — Run tests in watch mode
- `npm run lint` — Lint with oxlint (`oxlint -c .oxlintrc.json src/`)
- `npm run fmt` — Format with oxfmt (`oxfmt --write src/`)
- `npm run fmt:check` — Check formatting (`oxfmt --check src/`)
- `npx tsc --noEmit` — Type-check without emitting

**Pre-commit hook** (husky): runs `oxlint src/ && oxfmt --check src/`. Uses **oxlint/oxfmt**, not ESLint/Prettier.

## Architecture

### Scene System

`Game.ts` is the central controller with a state machine (`GameState`: title, help, prologue, world, town, dungeon, gameover, win). All gameplay delegates to the active `Scene`:

```
Scene interface (scenes/Scene.ts)
├── WorldScene   — 80x60 procedural world map (Simplex noise), POIs, symbol encounters, foraging
├── TownScene    — Race-themed towns (human/lizard/elf/dwarf), NPC dialog, crafting UI
└── DungeonScene — Multi-floor dungeons (ROT.js Digger), enemies, items, FOV, floor traversal
```

Scene methods: `onEnter`, `onMove(dx,dy)`, `onWait`, `onDescend`, `render`, `getStatusHTML`.

### UI Layer

- `ui/Display.ts` — ROT.js Display wrapper, delegates rendering to active scene
- `ui/TouchInput.ts` — All input handling (keyboard, touch gestures, D-pad, skill/equip buttons)
- `ui/GameOverlays.ts` — HTML overlay rendering (title, help, equip menu, goddess scenes, etc.)

Game.ts handles event wiring; GameOverlays.ts handles pure HTML generation.

### Entity Hierarchy

`Entity` (base: position, HP, attack, defense) → `Player` (equipment, skills, hunger, materials, resistances) / `Enemy` (AI, pathfinding, elemental attacks) / `Companion` (follows player, auto-attacks).

### Key Systems

- **Equipment**: 3 slots (weapon/armor/accessory). Base stats + equipment bonuses via `recalcStats()`. Equipment can have elemental resistances.
- **Elemental Resistances**: 4 elements (fire/ice/poison/lightning). Equipment and goddess gifts provide resistance (0-100%). Stacks from multiple sources, capped at 100%.
- **Random Artifacts**: Boss kills drop procedurally generated equipment with random stats and resistances. Artifacts store full definitions (not just IDs) in save data.
- **Goddess Gift**: At world creation, player chooses one gift from goddess Lumina. Provides permanent bonuses (stat boosts, resistances, HP regen, etc.).
- **Materials & Crafting**: Dungeon-specific material drops → NPC crafters (ボルド=dwarf_smith, エリーナ=elf_enchanter) produce equipment.
- **Hunger**: Drains 1/turn. At 0, HP-3/turn. Forest tiles have foraging chance.
- **World enemies**: Bandits/wolves roam world map. Chase within distance 5, wander otherwise.
- **Death**: Tracks death cause. Drops equipment+materials at death location (`!` marker). Goddess revival scene shows cause → respawn at starting village.
- **Save/Load**: localStorage-based. Multiple worlds (max 5). Auto-saves on dungeon/town exit. Regular equipment saved as IDs, artifacts saved as full objects.
- **NPC Recruitment**: Unique NPCs from other towns settle in starting village. Disappear from original town when recruited.

### Testing

Tests are in `src/game/__tests__/` using vitest. `testHelper.ts` provides `createMockGame()` for unit testing game logic without DOM dependencies. Test coverage focuses on:
- Equipment definitions and artifact generation
- Player stats, resistance calculations, damage, skills
- Enemy definitions and elemental attributes

### Input Flow

`TouchInput` (keyboard + touch + D-pad) → `game.currentScene.onMove/onWait/onDescend` → scene handles logic → `game.render()` → `Display` delegates to `scene.render()` + `scene.getStatusHTML()`.

### Build-time Constants

`vite.config.ts` injects `__BUILD_TIME__` (JST) and `__COMMIT_HASH__` (declared in `env.d.ts`).

## Workflow

- **動作確認はGitHub Pagesで行う**。コミット後は必ず即座に`git push`すること。プッシュを待たない。
- コミット前に`npx oxfmt --write src/`でフォーマット。

## Language

Game text is in Japanese. All UI strings, NPC dialog, item names, and messages use Japanese.
