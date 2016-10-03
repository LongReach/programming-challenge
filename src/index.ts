/// <reference path="../typings/index.d.ts" />

import PIXI = require('pixi.js');
const renderer:PIXI.WebGLRenderer = new PIXI.WebGLRenderer(1280, 720);
document.body.appendChild(renderer.view);

// -----------------------
// Class definitions
// -----------------------

class GridCell {
  sprite:PIXI.Sprite;
  // Arrow's facing direction: 0=left, 1=up, 2=right, 3=down
  direction:number;

  constructor(i:number, j:number, container:PIXI.Container) {
    var arrow = PIXI.Sprite.fromImage('images/arrow-icon.png');
    arrow.x = cellDim * (i + 0.5);
    arrow.y = cellDim * (j + 0.5);
    arrow.width = cellDim;
    arrow.height = cellDim;
    arrow.anchor.x = 0.5;
    arrow.anchor.y = 0.5;
    container.addChild(arrow);
    this.sprite = arrow;
    this.direction = 0;
    this.setVisited(false);
  }

  setDirection(val) {
    const pi = 3.14159265;
    this.sprite.rotation = pi * val / 2.0;
    this.direction = val;
  }

  setVisited(visited:boolean) {
    if (visited) {
      this.sprite.tint = 0xffffff;
    }
    else {
      this.sprite.tint = 0xff77aa;
    }
  }
}

class GridCharacter {
  sprite:PIXI.Sprite;
  cellIndexRight:number;
  cellIndexDown:number;
  xMovementDir:number;
  yMovementDir:number;

  slideValue:number;
  restTimer:number;
  moveTime:number;

  isMoving:boolean;
  isOnGrid:boolean;
  state:string;

  constructor(name:string, container:PIXI.Container) {
    this.sprite = PIXI.Sprite.fromImage(name);
    this.sprite.width = cellDim;
    this.sprite.height = cellDim;
    this.sprite.anchor.x = 0.5;
    this.sprite.anchor.y = 0.5;
    container.addChild(this.sprite);

    this.isMoving = false;
    this.restTimer = 0;
    this.moveTime = 1.0;
    this.state = "inactive";
  }

  setPosition(i:number, j:number) {
    this.sprite.x = cellDim * (i + 0.5);
    this.sprite.y = cellDim * (j + 0.5);
    this.cellIndexDown = i;
    this.cellIndexRight = j;
    this.isMoving = false;
    this.isOnGrid = true;
    this.slideValue = 0;
    this.state = "active";
  }

  readyToMove() {
    if (this.state != "active") {
      return false;
    }
    return (!this.isMoving && this.restTimer == 0);
  }

  isCollidable() {
    if (this.state != "active") {
      return false;
    }
    return !this.isMoving;
  }

  requestNewMove(direction) {
    if (this.state != "active") {
      return;
    }
    if (this.isMoving) {
      return; // can't change while already moving
    }
    if (direction == 0) // left
    {
      this.xMovementDir = -1.0;
      this.yMovementDir =  0.0;
    }
    else if (direction == 1) // up
    {
      this.xMovementDir =  0.0;
      this.yMovementDir = -1.0;
    }
    else if (direction == 2) // right
    {
      this.xMovementDir =  1.0;
      this.yMovementDir =  0.0;
    }
    else  // down
    {
      this.xMovementDir =  0.0;
      this.yMovementDir =  1.0;
    }
    this.slideValue = 0;
    this.isMoving = true;
  }

  setState(state:string) {
    if (this.state == state || this.state == "inactive") {
      // Nothing happens if we're already in requested state or if character
      // is inactive
      return;
    }
    console.log("state to " + state);
    this.state = state;
    if (state == "frozen") {
      this.slideValue = 0;
    }
    else if (state == "dying") {
      this.slideValue = 1;
    }
    else if (state == "explode") {
      this.slideValue = 1;
    }
  }

  update(deltaT) {
    if (this.state == "active") {
      this.sprite.x = cellDim * (this.cellIndexRight + 0.5 + this.xMovementDir * this.slideValue);
      this.sprite.y = cellDim * (this.cellIndexDown + 0.5 + this.yMovementDir * this.slideValue);
      if (this.isMoving) {
        // it takes half a second to move one square
        this.slideValue = this.slideValue + deltaT / this.moveTime;
        if (this.slideValue > 1.0)
        {
          // We've arrived
          this.cellIndexRight = this.cellIndexRight + this.xMovementDir;
          this.cellIndexDown = this.cellIndexDown + this.yMovementDir;
          this.slideValue = 0;
          this.xMovementDir = 0.0;
          this.yMovementDir = 0.0;
          this.isMoving = false;
          this.restTimer = this.moveTime;
        }
      }
      else if (this.restTimer > 0)
      {
        this.restTimer = this.restTimer - deltaT;
        if (this.restTimer < 0) {
          this.restTimer = 0;
        }
      }
    } // end if active state
    else if (this.state == "frozen") {
      // sine wave effect
      this.sprite.alpha = 0.5 + 0.5 * Math.cos(this.slideValue);
      this.slideValue = this.slideValue + deltaT * 4;
    }
    else if (this.state == "dying") {
      // fade and shrink effect
      this.sprite.alpha = this.slideValue;
      this.sprite.width = cellDim * (0.5 + this.slideValue / 2);
      this.sprite.height = cellDim * (0.5 + this.slideValue / 2);
      this.slideValue = this.slideValue - deltaT / (this.moveTime * 4.0);
      if (this.slideValue <= 0.0) {
        this.setState("inactive");
      }
    }
    else if (this.state == "explode") {
      // burst and fade effect
      this.sprite.alpha = this.slideValue;
      this.sprite.width = cellDim * (1.0 + (3.0 - this.slideValue * 3.0));
      this.sprite.height = cellDim * (1.0 + (3.0 - this.slideValue * 3.0));
      this.slideValue = this.slideValue - deltaT / (this.moveTime * 4.0);
      if (this.slideValue <= 0.0) {
        this.slideValue = 1; // keep exploding forever
      }
    }
  }
}

class ArrowGrid {
  container:PIXI.Container;
  grid:GridCell[][];
  dimX:number;
  dimY:number;

  checkerCharacter:GridCharacter;
  checkMarkCharacter:GridCharacter;

  theText:PIXI.Text;

  constructor(width:number, height:number) {
    this.container = new PIXI.Container();
    stage.addChild(this.container);
    this.container.x = 100;
    this.container.y = 60;
    this.dimX = width;
    this.dimY = height;
    this.grid = [];
    for (var j = 0; j < height; j++) {
        this.grid[j] = [];
        for (var i = 0; i < width; i++) {
          let newCell:GridCell = new GridCell(i, j, this.container);
          // It's a little boring to have two arrows pointing at each other, so prevent that
          let allowedDirections:boolean[] = [true, true, true, true, false];
          // Is the one above me pointing down?
          if (j > 0 && this.grid[j-1][i].direction == 3) {
            // Not allowed to point straight up
            allowedDirections[1] = false;
            //console.log("Forbidden up at " + i + "," + j);
          }
          // Is the one to my left pointing right?
          if (i > 0 && this.grid[j][i-1].direction == 2) {
            // Not allowed to point left
            allowedDirections[0] = false;
            //console.log("Forbidden left at " + i + "," + j);
          }
          let proposedDirection:number = 4; // not a valid direction, so the first test will fail
          while (allowedDirections[proposedDirection] == false)
          {
            console.log("Forbidden direction of " + proposedDirection + " at " + i + "," + j);
            proposedDirection = Math.floor(Math.random() * 4.0);
            console.log("  switching to " + proposedDirection);
          }
          newCell.setDirection(proposedDirection);
          this.grid[j][i] = newCell;
        };
    };

    // create a text object with a nice stroke
    this.theText = new PIXI.Text('Click to begin', { font: 'bold 36px Arial', fill: '#ffff00', align: 'left', stroke: '#0000FF', strokeThickness: 4 });
    this.theText.position.x = this.container.x + cellDim * (this.dimX + 1);
    this.theText.position.y = this.container.y + cellDim;
    stage.addChild(this.theText);

    //let startPosX:number = Math.floor(Math.random() * this.dimX);
    //let startPosY:number = Math.floor(Math.random() * this.dimY);
    let startPosX:number = 2 + Math.floor(Math.random() * 5);
    let startPosY:number = 2 + Math.floor(Math.random() * 5);
    this.checkerCharacter = new GridCharacter('images/red-checker.png', this.container);
    this.checkerCharacter.moveTime = 0.5;
    this.checkerCharacter.setPosition(startPosX, startPosY);
    this.checkMarkCharacter = new GridCharacter('images/green-check-mark.png', this.container);
    this.checkMarkCharacter.moveTime = 0.25;
    this.checkMarkCharacter.setPosition(startPosX, startPosY);
  }

  update(deltaT:number) {
    let characters:GridCharacter[] = [this.checkerCharacter, this.checkMarkCharacter];

    for (let char of characters) {
      char.update(deltaT);
      if (char.readyToMove()) {
        if (char.cellIndexDown < 0 || char.cellIndexDown >= this.dimY ||
          char.cellIndexRight < 0 || char.cellIndexRight >= this.dimX) {
          char.isOnGrid = false;
        }
        else
        {
          this.grid[char.cellIndexDown][char.cellIndexRight].setVisited(true);
          char.requestNewMove(this.grid[char.cellIndexDown][char.cellIndexRight].direction);
        }
      }
    } // end for

    if (!this.checkerCharacter.isOnGrid) {
      // slower-moving piece has left the board
      this.checkerCharacter.setState("frozen");
    }
    if (!this.checkMarkCharacter.isOnGrid) {
      // faster-moving piece has left the board
      this.checkMarkCharacter.setState("dying");
      this.checkerCharacter.setState("frozen");
      this.theText.text = "No Loop"
    }
    // Are both pieces on the same square? If so, the faster-moving one has caught up with
    // the slower.
    else if (characters[0].isCollidable() && characters[1].isCollidable() &&
      characters[0].cellIndexDown == characters[1].cellIndexDown &&
      characters[0].cellIndexRight == characters[1].cellIndexRight) {
        // We've caught up
        this.checkerCharacter.setState("frozen");
        this.checkMarkCharacter.setState("explode");
        this.theText.text = "Loop Detected!"
    }
  }
}

// -----------------------
// Global vars and basic setup
// -----------------------

// Graphical container

// create the root of the scene graph
var stage = new PIXI.Container();

// Array and dimensions for the grid
let cellDim:number = 50;

let theGrid:ArrowGrid;

doSetup();

// -----------------------
// Function definitions
// -----------------------

function update() {
    theGrid.update(0.01); // advance clock by 1/100th of a second
}

function doSetup() {
  //createGrid();
  console.log("Test");
  theGrid = new ArrowGrid(10, 10);
  // A function that updates a hundred times a second
  setInterval(update, 10);
  animate();
}

function animate() {

    requestAnimationFrame(animate);

    // render the root container
    renderer.render(stage);
}
