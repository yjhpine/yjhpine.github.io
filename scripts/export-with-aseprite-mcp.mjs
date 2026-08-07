#!/usr/bin/env node
/**
 * Invoke @iborymagic/aseprite-mcp handlers with LibreSprite CLI.
 * Archives still PNGs as .ase + metadata. Does NOT overwrite Phaser
 * horizontal animation strips (LibreSprite multi-file import is unreliable).
 */
import { existsSync, readdirSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function findToolsModule() {
  const local = path.join(root, "node_modules/@iborymagic/aseprite-mcp/build/aseprite/tools.js");
  if (existsSync(local)) return local;
  for (const d of readdirSync("/home/ubuntu/.npm/_npx", { withFileTypes: true })) {
    if (!d.isDirectory()) continue;
    const candidate = path.join("/home/ubuntu/.npm/_npx", d.name, "node_modules/@iborymagic/aseprite-mcp/build/aseprite/tools.js");
    if (existsSync(candidate)) return candidate;
  }
  throw new Error("Missing @iborymagic/aseprite-mcp");
}

function parseResult(res) {
  const text = res?.content?.[0]?.text ?? "";
  try { return JSON.parse(text); } catch { return { success: false, raw: text }; }
}

function runAseprite(args) {
  return new Promise((resolve, reject) => {
    const child = spawn("aseprite", args, {
      env: {
        ...process.env,
        PATH: `${process.env.HOME}/.local/bin:/usr/local/bin:${process.env.PATH}`,
        SDL_VIDEODRIVER: "dummy",
        XDG_RUNTIME_DIR: process.env.XDG_RUNTIME_DIR || `/tmp/runtime-${process.env.USER || "ubuntu"}`,
      },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stderr = "";
    child.stderr.on("data", (d) => { stderr += d; });
    child.on("close", (code) => (code === 0 ? resolve() : reject(new Error(stderr.trim() || `exit ${code}`))));
  });
}

async function pngToAse(pngAbs, aseAbs) {
  mkdirSync(path.dirname(aseAbs), { recursive: true });
  await runAseprite(["--batch", pngAbs, "--save-as", aseAbs]);
}

function writeSheetMeta(dataFile, name, fw, fh, count, duration) {
  const frames = [];
  for (let i = 0; i < count; i += 1) {
    frames.push({ filename: `${name}_${i}.png`, frame: { x: i * fw, y: 0, w: fw, h: fh }, duration });
  }
  mkdirSync(path.dirname(dataFile), { recursive: true });
  writeFileSync(dataFile, JSON.stringify({
    frames,
    meta: { app: "aseprite-mcp-pipeline", size: { w: fw * count, h: fh }, frameTags: [{ name: "play", from: 0, to: count - 1 }] },
  }, null, 2));
}

async function main() {
  const { createToolHandlers } = await import(findToolsModule());
  const handlers = createToolHandlers();
  const env = parseResult(await handlers.aseprite_check_environment());
  console.log("aseprite_check_environment:", env.result?.path, String(env.result?.version || "").split("\n")[0]);

  const stills = [
    "stations/station_input.png", "stations/station_input_filled.png", "stations/station_slot_empty.png",
    "stations/station_produce_idle.png", "stations/station_produce_busy.png", "stations/station_produce_done.png",
    "stations/station_output_empty.png", "stations/station_output_ready.png",
    "modules/module_image_maker.png", "modules/module_style_processor.png", "modules/module_ban_list.png",
    "modules/module_composition_planner.png", "modules/module_sharpener.png", "modules/module_quality_checker.png",
  ];
  for (const rel of stills) {
    const png = path.join(root, "public/assets/art", rel);
    const ase = path.join(root, "public/assets/aseprite", rel.replace(/\.png$/, ".ase"));
    console.log("png->ase", rel);
    await pngToAse(png, ase);
    const meta = parseResult(await handlers.aseprite_export_metadata({
      inputFile: ase, dataFile: ase.replace(/\.ase$/, ".json"), format: "json-array",
    }));
    console.log("  metadata", meta.success);
  }

  writeSheetMeta(path.join(root, "public/assets/aseprite/effects/produce_spark.json"), "produce_spark", 16, 16, 4, 100);
  writeSheetMeta(path.join(root, "public/assets/aseprite/effects/counter_bell.json"), "counter_bell", 16, 16, 4, 80);
  for (const kind of ["rabbit", "dog", "hamster", "duck"]) {
    writeSheetMeta(path.join(root, `public/assets/aseprite/customers/customer_${kind}_idle.json`), `customer_${kind}_idle`, 32, 40, 2, 400);
  }
  console.log("sheet metadata written; Phaser strips left untouched");
}

main().catch((e) => { console.error(e); process.exit(1); });
