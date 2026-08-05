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
  backgroundColor: "#0b2137",
  width: 960,
  height: 540,
  scene: [kitchenScene],
  scale: { mode: Phaser.Scale.FIT, width: 960, height: 540, autoCenter: Phaser.Scale.CENTER_BOTH },
  render: { antialias: false, pixelArt: true },
});

ui.attachGame(game);
