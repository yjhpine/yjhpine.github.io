import Phaser from "phaser";
import "./style.css";
import { KitchenScene } from "./game/KitchenScene";
import { UIController } from "./ui/UIController";

const ui = new UIController(document.querySelector<HTMLElement>("#app")!);
const kitchenScene = new KitchenScene();
ui.attachScene(kitchenScene);

const game = new Phaser.Game({
  type: Phaser.CANVAS,
  parent: "game-canvas",
  backgroundColor: "#d6a86a",
  width: 960,
  height: 580,
  scene: [kitchenScene],
  scale: { mode: Phaser.Scale.FIT, width: 960, height: 580, autoCenter: Phaser.Scale.CENTER_BOTH },
  render: { antialias: true, pixelArt: true },
});

ui.attachGame(game);
