import Phaser from "phaser";
import "./style.css";
import { FactoryScene } from "./game/FactoryScene";
import { UIController } from "./ui/UIController";

const ui = new UIController(document.querySelector<HTMLElement>("#app")!);
const factoryScene = new FactoryScene();
ui.attachScene(factoryScene);

const game = new Phaser.Game({
  type: Phaser.CANVAS,
  parent: "game-canvas",
  backgroundColor: "#102b46",
  width: 960,
  height: 540,
  scene: [factoryScene],
  scale: { mode: Phaser.Scale.RESIZE, width: "100%", height: "100%" },
  render: { antialias: true, pixelArt: false },
});

ui.attachGame(game);
