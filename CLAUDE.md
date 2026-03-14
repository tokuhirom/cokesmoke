# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

異世界ローグライク（Isekai Dungeon Crawl） - a turn-based roguelike browser game built with Vite + TypeScript + ROT.js. Originally designed as a steampunk roguelike, now an isekai fantasy with world map, multiple towns/dungeons, crafting, and companions.

## Commands

- `npm run dev` — Start Vite dev server
- `npm run build` — TypeScript compile + Vite build (`tsc && vite build`)
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

### Entity Hierarchy

`Entity` (base: position, HP, attack, defense) → `Player` (equipment, skills, hunger, materials) / `Enemy` (AI, pathfinding) / `Companion` (follows player, auto-attacks).

### Key Systems

- **Equipment**: 3 slots (weapon/armor/accessory). Base stats + equipment bonuses via `recalcStats()`.
- **Materials & Crafting**: Dungeon-specific material drops → NPC crafters (ボルド=dwarf_smith, エリーナ=elf_enchanter) produce equipment.
- **Hunger**: Replaces fuel. Drains 1/turn. At 0, HP-3/turn. Forest tiles have foraging chance.
- **World enemies**: Bandits/wolves roam world map. Chase within distance 8, wander otherwise.
- **Death**: Drops equipment+materials at death location (`!` marker). Goddess revival scene → respawn at starting village.
- **Save/Load**: localStorage-based. Multiple worlds (max 5). Auto-saves on dungeon/town exit.
- **NPC Recruitment**: Unique NPCs from other towns settle in starting village.

### Input Flow

`TouchInput` (keyboard + touch + D-pad) → `game.currentScene.onMove/onWait/onDescend` → scene handles logic → `game.render()` → `Display` delegates to `scene.render()` + `scene.getStatusHTML()`.

### Build-time Constants

`vite.config.ts` injects `__BUILD_TIME__` (JST) and `__COMMIT_HASH__` (declared in `env.d.ts`).

## Language

Game text is in Japanese. All UI strings, NPC dialog, item names, and messages use Japanese.
