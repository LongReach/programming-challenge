import gridFile = require('./grid');
import PIXI = require('pixi.js');

let cellDim:number = 50;

/*
  --------------------------------------------
  Represents a game piece. A piece can occupy a cell and transition in a
  videogame-y manner between cells. It also has a state machine and
  can perform several animation sequences.
  --------------------------------------------
*/
export class GridCharacter {
  sprite:PIXI.Sprite;
  cellIndexRight:number; // board coordinate
  cellIndexDown:number;
  xMovementDir:number; // direction of current movement, (-1 = left, 1 = right)
  yMovementDir:number; // direction of current movement, (-1 = up, 1 = down)

  slideValue:number; // how far the piece has slid away from current cell
                     // 0 to 1
  effectSlider:number; // Used for the animation of effects
  restTimer:number;  // the piece "rests" for a bit after arriving
  moveTime:number; // how many seconds a move or rest period takes

  onInitialCell:boolean;
  isMoving:boolean;
  isOnGrid:boolean; // false if piece moves off board
  paused:boolean;

  private _state:string;

  constructor(name:string, container:PIXI.Container) {
    this.sprite = PIXI.Sprite.fromImage(name);
    this.sprite.width = cellDim;
    this.sprite.height = cellDim;
    this.sprite.anchor.x = 0.5;
    this.sprite.anchor.y = 0.5;
    this.sprite.alpha = 0;
    container.addChild(this.sprite);

    this.xMovementDir = 0;
    this.yMovementDir = 0;
    this.isMoving = false;
    this.isOnGrid = true;
    this.paused = false;
    this.restTimer = 0;
    this.moveTime = 1.0;
    this._state = "inactive";
  }

  // Instantly positions the piece at its start position
  setPosition(i:number, j:number) {
    this.sprite.x = cellDim * (i + 0.5);
    this.sprite.y = cellDim * (j + 0.5);
    this.sprite.width = cellDim;
    this.sprite.height = cellDim;
    this.sprite.alpha = 1;
    this.cellIndexDown = j;
    this.cellIndexRight = i;
    this.onInitialCell = true;
    this.paused = false;
    this.isMoving = false;
    this.isOnGrid = true;
    this.slideValue = 0;
    this.restTimer = this.moveTime; // let it rest before starting move
    this._state = "active";
  }

  // Returns true if character can be issued a new move
  readyToMove() {
    if (this._state != "active") {
      return false;
    }
    return (!this.isMoving && this.restTimer == 0);
  }

  // Returns true if this character and the other have caught up to each other
  testCollision(other:GridCharacter) {
    if (this.onInitialCell || other.onInitialCell || this._state != "active") {
      return false;
    }
    if (this.cellIndexDown == other.cellIndexDown &&
      this.cellIndexRight == other.cellIndexRight) {
          return true;
    }
    return false;
  }

  // Tells the piece to begin moving in the given direction
  // See GridCell for direction values.
  requestNewMove(direction) {
    if (this._state != "active") {
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

  // Puts the piece in a new animation state
  // (I was going to use a typescript accessor, but not supported by this compiler)
  setState(state:string) {
    if (this._state == state || this._state == "inactive") {
      // Nothing happens if we're already in requested state or if character
      // is inactive
      return;
    }
    console.log("state to " + state);
    this._state = state;
    if (state == "frozen") {
      this.effectSlider = 0;
    }
    else if (state == "dying") {
      this.effectSlider = 1;
    }
    else if (state == "explode") {
      this.effectSlider = 1;
    }
    else if (state == "inactive") {
      this.sprite.alpha = 0;
      this.isMoving = false;
      this.isOnGrid = true;
    }
  }

  // Accessors and setters are good :)
  getState() {
    return this._state;
  }

  // Update function called periodically. deltaT is time in seconds since last
  // call.
  update(deltaT) {
    if (this._state == "active") {
      this.sprite.x = cellDim * (this.cellIndexRight + 0.5 + this.xMovementDir * this.slideValue);
      this.sprite.y = cellDim * (this.cellIndexDown + 0.5 + this.yMovementDir * this.slideValue);
      if (this.isMoving) {
        // it takes moveTime seconds to move one square
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
          this.onInitialCell = false;
          this.restTimer = this.moveTime;
        }
      }
      else if (this.restTimer > 0)
      {
        // Piece is resting after completing move
        this.restTimer = this.restTimer - deltaT;
        if (this.restTimer < 0) {
          this.restTimer = 0;
        }
      }
    } // end if active state
    else if (this._state == "frozen") {
      // sine wave alpha effect
      this.sprite.alpha = 0.5 + 0.5 * Math.cos(this.effectSlider);
      this.effectSlider = this.effectSlider + deltaT * 4;
    }
    else if (this._state == "dying") {
      // fade and shrink effect
      this.sprite.alpha = this.effectSlider;
      this.sprite.width = cellDim * (0.5 + this.effectSlider / 2);
      this.sprite.height = cellDim * (0.5 + this.effectSlider / 2);
      this.effectSlider = this.effectSlider - deltaT / (this.moveTime * 4.0);
      if (this.effectSlider <= 0.0) {
        this.setState("inactive");
      }
    }
    else if (this._state == "explode") {
      // burst and fade effect
      this.sprite.alpha = this.effectSlider;
      this.sprite.width = cellDim * (1.0 + (3.0 - this.effectSlider * 3.0));
      this.sprite.height = cellDim * (1.0 + (3.0 - this.effectSlider * 3.0));
      this.effectSlider = this.effectSlider - deltaT / (this.moveTime * 4.0);
      if (this.effectSlider <= 0.0) {
        this.effectSlider = 1; // keep exploding forever
      }
    }
  }

  // Puts this character into or out of paused state
  setPaused(val:boolean) {
    if (this.paused == val) {
      return;
    }

    this.paused = val;
    if (val) {
      this.effectSlider = 0;
    }
    else {
      this.sprite.alpha = 1;
    }
  }

  // Update function called while character is paused
  updatePaused(deltaT) {
    // sine wave alpha effect
    this.sprite.alpha = 0.5 + 0.5 * Math.cos(this.effectSlider);
    this.effectSlider = this.effectSlider + deltaT * 4;
  }
}

/*
  --------------------------------------------
  Represents the game at the highest level. Manages UI features, an ArrowGrid
  instance, and the game pieces.
  --------------------------------------------
*/
export class TheGame {
  theGrid:gridFile.ArrowGrid;

  checkerCharacter:GridCharacter;
  checkMarkCharacter:GridCharacter;

  infoText:PIXI.Text;
  counterText:PIXI.Text;
  resetText:PIXI.Text;
  reshuffleText:PIXI.Text;
  pauseText:PIXI.Text;

  gameState:string; // "ready", "in progress", or "done"
  paused:boolean;

  scoreCounter:number;

  constructor(stage:PIXI.Container) {
    this.theGrid = new gridFile.ArrowGrid(10, 10, stage);
    let gameInstance:TheGame = this;
    let onButtonDown = function() {
      gameInstance.handleCellPress(this.x, this.y);
    }
    let onButtonOver = function() {
      gameInstance.handleCellOver(this.x, this.y);
    }
    let onButtonOut = function() {
      gameInstance.handleCellOut(this.x, this.y);
    }
    this.theGrid.setMouseFunctions(onButtonDown, onButtonOver, onButtonOut);

    // create a text object with a nice stroke
    this.infoText = new PIXI.Text('Place piece on board', { font: 'bold 36px Arial', fill: '#ffff00', align: 'left', stroke: '#0000FF', strokeThickness: 4 });
    this.infoText.position.x = this.theGrid.container.x + cellDim * (this.theGrid.dimX + 1);
    this.infoText.position.y = this.theGrid.container.y + cellDim;
    stage.addChild(this.infoText);

    this.counterText = new PIXI.Text('Score: 0', { font: 'bold 24px Arial', fill: '#ff0000', align: 'left', stroke: '#772200', strokeThickness: 4 });
    this.counterText.position.x = this.theGrid.container.x + cellDim * (this.theGrid.dimX + 1);
    this.counterText.position.y = this.theGrid.container.y + cellDim * 2;
    stage.addChild(this.counterText);

    let currentGame:TheGame = this;
    this.resetText = new PIXI.Text('Reset', { font: 'bold 30px Arial', fill: '#ff00ff', align: 'left', stroke: '#0000FF', strokeThickness: 4 });
    this.resetText.position.x = this.theGrid.container.x + cellDim * (this.theGrid.dimX + 1);
    this.resetText.position.y = this.theGrid.container.y + cellDim * (this.theGrid.dimY - 3);
    stage.addChild(this.resetText);
    this.resetText.buttonMode = true;
    this.resetText.interactive = true;
    this.resetText.on('mousedown', function() {
      currentGame.handleResetPressed();
    });
    this.resetText.visible = false;

    this.reshuffleText = new PIXI.Text('Reshuffle', { font: 'bold 30px Arial', fill: '#ff00ff', align: 'left', stroke: '#0000FF', strokeThickness: 4 });
    this.reshuffleText.position.x = this.theGrid.container.x + cellDim * (this.theGrid.dimX + 1);
    this.reshuffleText.position.y = this.theGrid.container.y + cellDim * (this.theGrid.dimY - 2);
    stage.addChild(this.reshuffleText);
    this.reshuffleText.buttonMode = true;
    this.reshuffleText.interactive = true;
    this.reshuffleText.on('mousedown', function() {
      currentGame.handleReshufflePressed();
    });

    this.pauseText = new PIXI.Text('Pause', { font: 'bold 30px Arial', fill: '#ff00ff', align: 'left', stroke: '#0000FF', strokeThickness: 4 });
    this.pauseText.position.x = this.theGrid.container.x + cellDim * (this.theGrid.dimX + 1);
    this.pauseText.position.y = this.theGrid.container.y + cellDim * (this.theGrid.dimY - 1);
    stage.addChild(this.pauseText);
    this.pauseText.buttonMode = true;
    this.pauseText.interactive = true;
    this.pauseText.on('mousedown', function() {
      currentGame.handlePausePressed();
    });
    this.pauseText.visible = false;

    // Initialize characters
    this.checkerCharacter = new GridCharacter('images/red-checker.png', this.theGrid.container);
    this.checkerCharacter.moveTime = 0.5;
    this.checkMarkCharacter = new GridCharacter('images/green-check-mark.png', this.theGrid.container);
    this.checkMarkCharacter.moveTime = 0.25;

    this.gameState = "ready";
    this.paused = false;
    this.scoreCounter = 0;
  }

  // Main update function. deltaT is seconds elapsed since last call.
  update(deltaT:number) {
    let characters:GridCharacter[] = [this.checkerCharacter, this.checkMarkCharacter];

    if (this.paused) {
      for (let char of characters) {
        char.updatePaused(deltaT);
      }
      return;
    }

    for (let char of characters) {
      char.update(deltaT);
      if (char.readyToMove()) {
        // Has character fallen off grid?
        if (char.cellIndexDown < 0 || char.cellIndexDown >= this.theGrid.dimY ||
          char.cellIndexRight < 0 || char.cellIndexRight >= this.theGrid.dimX) {
          char.isOnGrid = false;
        }
        else
        {
          // Character is still on board
          let cell:gridFile.GridCell = this.theGrid.getCell(char.cellIndexRight, char.cellIndexDown);
          cell.setVisited(true);
          char.requestNewMove(cell.direction);
          if (char == this.checkMarkCharacter) {
            // the faster-moving character advances, so increment score
            this.scoreCounter = this.scoreCounter + 1;
            this.counterText.text = 'Score: ' + this.scoreCounter;
          }
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
      this.infoText.text = "No Loop";
      this.gameState = "done";
      this.resetText.visible = true;
      this.reshuffleText.visible = true;
      this.pauseText.visible = false;
    }
    // Are both pieces on the same square? If so, the faster-moving one has caught up with
    // the slower.
    else if (characters[0].testCollision(characters[1])) {
        // We've caught up
        this.checkerCharacter.setState("frozen");
        this.checkMarkCharacter.setState("explode");
        this.infoText.text = "Loop Detected!"
        this.gameState = "done";
        this.resetText.visible = true;
        this.reshuffleText.visible = true;
        this.pauseText.visible = false;
    }
  }

  // Called when user clicks on an arrow cell
  handleCellPress(pixX:number, pixY:number) {
    let cellX = Math.floor(pixX / cellDim);
    let cellY = Math.floor(pixY / cellDim);
    console.log("button cell: " + cellX + "," + cellY);
    if (this.checkerCharacter.getState() == "inactive") {
      this.checkerCharacter.setPosition(cellX, cellY);
      this.checkMarkCharacter.setPosition(cellX, cellY);
      this.infoText.text = "Traveling..."
      this.gameState = "in progress";
      this.resetText.visible = false;
      this.reshuffleText.visible = false;
      this.pauseText.visible = true;
    }
  }

  handleCellOver(pixX:number, pixY:number) {
    let cellX = Math.floor(pixX / cellDim);
    let cellY = Math.floor(pixY / cellDim);
    let cell:gridFile.GridCell = this.theGrid.getCell(cellX, cellY);
    cell.setHighlight(true);
  }

  handleCellOut(pixX:number, pixY:number) {
    let cellX = Math.floor(pixX / cellDim);
    let cellY = Math.floor(pixY / cellDim);
    let cell:gridFile.GridCell = this.theGrid.getCell(cellX, cellY);
    cell.setHighlight(false);
  }

  private _resetMechanics() {
    this.checkerCharacter.setState("inactive");
    this.checkMarkCharacter.setState("inactive");
    this.infoText.text = "Place piece on board";
    this.scoreCounter = 0;
    this.counterText.text = 'Score: ' + this.scoreCounter;
    this.gameState = "ready";
  }

  handleResetPressed() {
    this.theGrid.resetArrows();
    this._resetMechanics();
  }

  handleReshufflePressed() {
    this.theGrid.reshuffleArrows();
    this._resetMechanics();
  }

  handlePausePressed() {
    let pausedState:boolean = !this.paused;

    if (pausedState) {
      this.pauseText.text = "Unpause";
    }
    else {
      this.pauseText.text = "Pause";
    }
    this.checkerCharacter.setPaused(pausedState);
    this.checkMarkCharacter.setPaused(pausedState);
    this.paused = pausedState;
  }
}
