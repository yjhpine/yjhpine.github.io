# AGENTS.md

## Project

Meowdel — Phaser 3 + TypeScript + Vite + Vitest overcooked-style factory puzzle game. No real generative AI API; results are procedural.

## Local commands

```bash
npm install
npm run dev
npm run typecheck
npm run test
npm run build
```

## Cursor Cloud specific instructions

### Environment

- Config: `.cursor/environment.json`
- Install installs npm deps, runs typecheck/tests, and sets up a LibreSprite-based `aseprite` CLI for MCP.
- Dev server starts on port `5173` via the `vite-dev` terminal.

### Aseprite MCP

- Project MCP config: `.cursor/mcp.json` (`@iborymagic/aseprite-mcp`)
- Cloud Agents also need the same MCP enabled in [cursor.com/agents](https://cursor.com/agents) MCP dropdown (stdio):

```json
{
  "command": "npx",
  "args": ["-y", "@iborymagic/aseprite-mcp"],
  "env": {
    "PATH": "/home/ubuntu/.local/bin:/usr/local/bin:/usr/bin:/bin"
  }
}
```

- Install script places `~/.local/bin/aseprite` and `/usr/local/bin/aseprite` (LibreSprite wrapper).
- Verified: PNG↔`.ase` convert, sprite sheet/metadata export (`--sheet` / `--data`).
- LibreSprite Lua (`--script`) is limited vs official Aseprite; prefer CLI export tools for automation.
- For a licensed Aseprite binary, put it on PATH ahead of the wrapper (or replace `/usr/local/bin/aseprite`).

### Sprite assets

- Generated/factory art scripts live under `scripts/`
- Runtime assets live under `public/assets/`
