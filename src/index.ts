/// <reference path="../typings/index.d.ts" />
/// <reference path="grid.ts" />
/// <reference path="game.ts" />

import gridFile = require('./grid');
import gameFile = require('./game'); // "requires game", ha
import PIXI = require('pixi.js');
import Howler = require('howler');
const renderer:PIXI.WebGLRenderer = new PIXI.WebGLRenderer(1280, 720);
document.body.appendChild(renderer.view);

let cellDim:number = 50;

// -----------------------
// Global vars and basic setup
// -----------------------

// Graphical container

// create the root of the scene graph
var stage = new PIXI.Container();

let gameInstance:gameFile.TheGame;

doSetup();

// -----------------------
// Function definitions
// -----------------------

function update() {
    gameInstance.update(0.01); // advance clock by 1/100th of a second
}

function doSetup() {
  //createGrid();
  console.log("Test");
  gameInstance = new gameFile.TheGame(stage);
  // A function that updates a hundred times a second
  setInterval(update, 10);
  animate();
}

function animate() {

    requestAnimationFrame(animate);

    // render the root container
    renderer.render(stage);
}
