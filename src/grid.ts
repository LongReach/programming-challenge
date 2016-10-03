import PIXI = require('pixi.js');

let cellDim:number = 50;

// -----------------------
// Class definitions
// -----------------------

/*
  Represents a cell on the game board. A cell contains an arrow Sprite
  which points in one of four cardinal directions. Each cell acts as
  a button and can be clicked.
*/
export class GridCell {
  sprite:PIXI.Sprite;
  // Arrow's facing direction: 0=left, 1=up, 2=right, 3=down
  direction:number;
  cellX:number; // coordinate on the game board, from left
  cellY:number; // coordinate on the game board, from top
  visited:boolean; // if the cell has been visited by game piece

  constructor(i:number, j:number, container:PIXI.Container) {
    var arrow = PIXI.Sprite.fromImage('images/arrow-icon.png');
    arrow.x = cellDim * (i + 0.5);
    arrow.y = cellDim * (j + 0.5);
    arrow.width = cellDim;
    arrow.height = cellDim;
    arrow.anchor.x = 0.5;
    arrow.anchor.y = 0.5;
    container.addChild(arrow);
    this.cellX = i;
    this.cellY = j;
    this.sprite = arrow;
    this.direction = 0;
    this.setVisited(false);
  }

  setMouseFunctions(onButtonDown:()=>void, onButtonOver:()=>void, onButtonOut:()=>void) {
      // onEvent functions are global functions (towards bottom of file)
      this.sprite.buttonMode = true;
      this.sprite.interactive = true;
      this.sprite.on('mousedown', onButtonDown);
      this.sprite.on('mouseover', onButtonOver);
      this.sprite.on('mouseout', onButtonOut)
  }

  // Sets the direction of the arrow: 0=left, 1=up, 2=right, 3=down
  setDirection(val) {
    const pi = 3.14159265;
    this.sprite.rotation = pi * val / 2.0;
    this.direction = val;
  }

  // Sets if the cell has been visited by a game piece
  setVisited(value:boolean) {
    if (value) {
      this.sprite.tint = 0xffffff; // make brighter
    }
    else {
      this.sprite.tint = 0xff77aa;
    }
    this.visited = value;
  }

  // If value==true, temporarily highlights the cell
  // If value==true, it reverts to its previous color
  setHighlight(value:boolean) {
    let currentValue:boolean = this.visited;
    if (!value) {
      value = currentValue;
    }
    this.setVisited(value);
    this.visited = currentValue;
  }
}

/*
  --------------------------------------------
  Represents the entire game board. Contains a 2d array of GricCell objects.
  --------------------------------------------
*/
export class ArrowGrid {
  container:PIXI.Container;
  grid:GridCell[][];
  dimX:number; // dimension of game board in cells
  dimY:number;

  constructor(width:number, height:number, stage:PIXI.Container) {
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
        this.grid[j][i] = newCell;
      };
    }
    this.reshuffleArrows();
  }

  setMouseFunctions(onButtonDown:()=>void, onButtonOver:()=>void, onButtonOut:()=>void) {
    for (var j = 0; j < this.dimY; j++) {
      for (var i = 0; i < this.dimX; i++) {
        this.grid[j][i].setMouseFunctions(onButtonDown, onButtonOver, onButtonOut);
      };
    }
  }

  // Marks all cells as unvisited
  resetArrows() {
    for (var j = 0; j < this.dimY; j++) {
      for (var i = 0; i < this.dimX; i++) {
        this.grid[j][i].setVisited(false);
      };
    }
  }

  // Marks all cells as unvisited and changes arrow directions
  reshuffleArrows() {
    for (var j = 0; j < this.dimY; j++) {
      for (var i = 0; i < this.dimX; i++) {
        this.grid[j][i].setVisited(false);
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
          proposedDirection = Math.floor(Math.random() * 4.0);
        }
        this.grid[j][i].setDirection(proposedDirection);
      };
    }
  }

  // Returns ref to cell at particular grid location
  getCell(gridX:number, gridY:number) {
    return this.grid[gridY][gridX];
  }
}
