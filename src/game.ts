import gridFile = require('./grid');
import PIXI = require('pixi.js');
import HOWL = require('howler');

/*
  --------------------------------------------
  Represents a game piece. A piece can occupy a cell and transition in a
  videogame-y manner between cells. It also has a state machine and
  can perform several animation sequences.
  --------------------------------------------
*/
export class GridCharacter {
  container:PIXI.Container;
  sprite:PIXI.Sprite;
  static cellDim:number; // Dimensions of a cell in pixels
                         // (changes after board resize)

  cellIndexRight:number; // board coordinate
  cellIndexDown:number;
  xMovementDir:number; // direction of current movement, (-1 = left, 1 = right)
  yMovementDir:number; // direction of current movement, (-1 = up, 1 = down)

  slideValue:number; // how far the piece has slid away from current cell
                     // 0 to 1
  effectSlider:number; // Used for the animation of effects
  restTimer:number;  // the piece "rests" for a bit after arriving
  moveTime:number; // how many seconds a move or rest period takes

  onInitialCell:boolean; // true is piece is still on first cell
  isMoving:boolean; // true if piece is visually moving
  paused:boolean; // true if piece is in a paused state, similar to game character

  private _state:string;

  constructor(name:string, container:PIXI.Container) {
    this.container = container;
    this.sprite = PIXI.Sprite.fromImage(name);
    GridCharacter.cellDim = gridFile.GridCell.cellDim;
    this.sprite.width = GridCharacter.cellDim;
    this.sprite.height = GridCharacter.cellDim;
    this.sprite.anchor.x = 0.5;
    this.sprite.anchor.y = 0.5;
    this.sprite.alpha = 0;
    container.addChild(this.sprite);

    this.xMovementDir = 0;
    this.yMovementDir = 0;
    this.isMoving = false;
    this.paused = false;
    this.restTimer = 0;
    this.moveTime = 1.0;
    this._state = "inactive";
  }

  // Prepares piece for destruction
  cleanup() {
    this.container.removeChild(this.sprite);
    this.sprite.destroy();
  }

  // Instantly positions the piece at its start position
  setPosition(i:number, j:number) {
    this.sprite.x = GridCharacter.cellDim * (i + 0.5);
    this.sprite.y = GridCharacter.cellDim * (j + 0.5);
    this.sprite.width = GridCharacter.cellDim;
    this.sprite.height = GridCharacter.cellDim;
    this.sprite.alpha = 1;
    this.cellIndexDown = j;
    this.cellIndexRight = i;
    this.onInitialCell = true;
    this.paused = false;
    this.isMoving = false;
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
      this.sprite.x = GridCharacter.cellDim * (this.cellIndexRight + 0.5 + this.xMovementDir * this.slideValue);
      this.sprite.y = GridCharacter.cellDim * (this.cellIndexDown + 0.5 + this.yMovementDir * this.slideValue);
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
      this.sprite.width = GridCharacter.cellDim * (0.5 + this.effectSlider / 2);
      this.sprite.height = GridCharacter.cellDim * (0.5 + this.effectSlider / 2);
      this.effectSlider = this.effectSlider - deltaT / (this.moveTime * 4.0);
      if (this.effectSlider <= 0.0) {
        this.setState("inactive");
      }
    }
    else if (this._state == "explode") {
      // burst and fade effect
      this.sprite.alpha = this.effectSlider;
      this.sprite.width = GridCharacter.cellDim * (1.0 + (3.0 - this.effectSlider * 3.0));
      this.sprite.height = GridCharacter.cellDim * (1.0 + (3.0 - this.effectSlider * 3.0));
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
  stage:PIXI.Container;

  theGrid:gridFile.ArrowGrid;
  boardSize:number; // in cells

  checkerCharacter:GridCharacter;
  checkMarkCharacter:GridCharacter;

  infoText:PIXI.Text;
  counterText:PIXI.Text;
  resetText:PIXI.Text;
  reshuffleText:PIXI.Text;
  pauseText:PIXI.Text;
  resizeText:PIXI.Text;

  minusSprite:PIXI.Sprite;
  plusSprite:PIXI.Sprite;

  gameState:string; // "ready", "in progress", or "done"
  paused:boolean;

  scoreCounter:number;

  // The game sounds
  // strong typing doesn't work on these, for whatever reason
  soundSuccess;
  soundAdvance;
  soundFailure;
  soundMenuChoice;
  soundResize;
  soundShuffle;
  soundPause;

  constructor(stage:PIXI.Container) {
    this.stage = stage;
    let boardDims = {w:500, h:500} // in pixels

    this.theGrid = null;
    this.boardSize = 16;
    this._createGrid();

    // Ugh, it took me a long time to get this working. The module couldn't be
    // named "Howl", or the browser would reject it (no compile error!)
    this.soundSuccess = new HOWL.Howl({src: 'sounds/success.wav'});
    this.soundAdvance = new HOWL.Howl({src: 'sounds/advance.wav', volume:0.3});
    this.soundFailure = new HOWL.Howl({src: 'sounds/failure.wav'});
    this.soundMenuChoice = new HOWL.Howl({src: 'sounds/menu-choice.wav'});
    this.soundResize = new HOWL.Howl({src: 'sounds/resize.wav'});
    this.soundShuffle = new HOWL.Howl({src: 'sounds/shuffle.mp3'});
    this.soundPause = new HOWL.Howl({src: 'sounds/pause.mp3'});

    // Set up info text and score counter
    // -------------------------------------

    // Some helper data for positioning text and menu items in a vertical
    // "layout"
    let textSlotSize = 50;
    let layoutStartPt = {x:0, y:0}
    layoutStartPt.x = this.theGrid.container.x + boardDims.w + textSlotSize;
    layoutStartPt.y = this.theGrid.container.y;
    let layoutEndPt = {x:layoutStartPt.x, y:layoutStartPt.y + boardDims.h}

    // create a text object with a nice stroke
    this.infoText = new PIXI.Text('Place piece on board', { font: 'bold 36px Arial', fill: '#ffff00', align: 'left', stroke: '#0000FF', strokeThickness: 4 });
    this.infoText.position.x = layoutStartPt.x;
    this.infoText.position.y = layoutStartPt.y;
    stage.addChild(this.infoText);

    this.counterText = new PIXI.Text('Score: 0', { font: 'bold 24px Arial', fill: '#ff0000', align: 'left', stroke: '#772200', strokeThickness: 4 });
    this.counterText.position.x = layoutStartPt.x;
    this.counterText.position.y = layoutStartPt.y + textSlotSize;
    stage.addChild(this.counterText);

    // Set up selectable menu items
    // -------------------------------------

    let mainTextDesc = { font: 'bold 30px Arial', fill: '#ff00ff', align: 'left', stroke: '#0000FF', strokeThickness: 4 };
    let currentGame:TheGame = this;
    this.resetText = new PIXI.Text('Reset', mainTextDesc);
    this.resetText.position.x = layoutStartPt.x;
    this.resetText.position.y = layoutEndPt.y - textSlotSize * 3;
    stage.addChild(this.resetText);
    this.resetText.buttonMode = true;
    this.resetText.interactive = true;
    this.resetText.on('mousedown', function() {
      currentGame.handleResetPressed();
    });
    this.resetText.visible = false;

    this.reshuffleText = new PIXI.Text('Reshuffle', mainTextDesc);
    this.reshuffleText.position.x = layoutStartPt.x;
    this.reshuffleText.position.y = layoutEndPt.y - textSlotSize * 2;
    stage.addChild(this.reshuffleText);
    this.reshuffleText.buttonMode = true;
    this.reshuffleText.interactive = true;
    this.reshuffleText.on('mousedown', function() {
      currentGame.handleReshufflePressed();
    });

    this.pauseText = new PIXI.Text('Pause', mainTextDesc);
    this.pauseText.position.x = layoutStartPt.x;
    this.pauseText.position.y = layoutEndPt.y - textSlotSize;
    stage.addChild(this.pauseText);
    this.pauseText.buttonMode = true;
    this.pauseText.interactive = true;
    this.pauseText.on('mousedown', function() {
      currentGame.handlePausePressed();
    });
    this.pauseText.visible = false;

    this.resizeText = new PIXI.Text('Board Size: ' + this.boardSize, mainTextDesc);
    this.resizeText.position.x = layoutStartPt.x;
    this.resizeText.position.y = layoutEndPt.y - textSlotSize * 4;
    stage.addChild(this.resizeText);
    this.resizeText.visible = true;

    // Handy factory function
    let makeButton = function(filename:string) {
      let sprite:PIXI.Sprite = PIXI.Sprite.fromImage(filename);
      sprite.tint = 0x888888;
      sprite.width = textSlotSize * 0.8;
      sprite.height = textSlotSize * 0.8;
      stage.addChild(sprite);
      sprite.buttonMode = true;
      sprite.interactive = true;
      sprite.on('mouseover', function() {
        this.tint = 0xffffff;
      });
      sprite.on('mouseout', function() {
        this.tint = 0x888888;
      });
      sprite.visible = true;
      return sprite;
    }

    // Button for changing board size
    this.minusSprite = makeButton('images/minus-icon.png');
    this.minusSprite.x = this.resizeText.x + this.resizeText.width + 10;
    this.minusSprite.y = this.resizeText.y;
    this.minusSprite.on('mousedown', function() {
      currentGame.handleResizePressed(-1);
    });

    // Button for changing board size
    this.plusSprite = makeButton('images/plus-icon.png');
    this.plusSprite.x = this.minusSprite.x + this.minusSprite.width + 10;
    this.plusSprite.y = this.minusSprite.y;
    this.plusSprite.on('mousedown', function() {
      currentGame.handleResizePressed(1);
    });

    this.checkerCharacter = null;
    this.checkMarkCharacter = null;
    // Make sure characters exist by now
    this._createCharacters();

    this.gameState = "ready";
    this.paused = false;
    this.scoreCounter = 0;
  }

  // Main update function. deltaT is seconds elapsed since last call.
  update(deltaT:number) {
    let characters:GridCharacter[] = [this.checkerCharacter, this.checkMarkCharacter];

    if (!this.checkerCharacter) {
      // no characters exist yet, no point in updating
      return;
    }

    if (this.paused) {
      for (let char of characters) {
        char.updatePaused(deltaT);
      }
      return;
    }

    let leavingGridChar:GridCharacter = null; // the char leaving the grid, if any
    // Iterate through game pieces, call their update functions, see if
    // any must be issued new move.
    for (let char of characters) {
      char.update(deltaT);
      if (char.readyToMove()) {
        // Has character fallen off grid?
        if (char.cellIndexDown < 0 || char.cellIndexDown >= this.theGrid.dimY ||
          char.cellIndexRight < 0 || char.cellIndexRight >= this.theGrid.dimX) {
          leavingGridChar = char;
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
            this.soundAdvance.play();
          }
          if (char == this.checkerCharacter) {
            // the slow-moving character advances
          }
        }
      }
    } // end for

    if (leavingGridChar == this.checkerCharacter) {
      // slower-moving piece has left the board
      this.checkerCharacter.setState("frozen");
    }
    if (leavingGridChar == this.checkMarkCharacter) {
      // faster-moving piece has left the board
      this.checkMarkCharacter.setState("dying");
      this.checkerCharacter.setState("frozen");
      this.infoText.text = "No Loop";
      this.soundFailure.play();
      this._setGameState("done");
    }
    // Are both pieces on the same square? If so, the faster-moving one has caught up with
    // the slower.
    else if (characters[0].testCollision(characters[1])) {
        // We've caught up
        this.checkerCharacter.setState("frozen");
        this.checkMarkCharacter.setState("explode");
        this.infoText.text = "Loop Detected!"
        this._setGameState("done");
        this.soundSuccess.play();
    }
  }

  // Called when user clicks on an arrow cell
  handleCellPress(pixX:number, pixY:number) {
    let cellX = Math.floor(pixX / GridCharacter.cellDim);
    let cellY = Math.floor(pixY / GridCharacter.cellDim);
    console.log("button cell: " + cellX + "," + cellY);
    if (this.checkerCharacter.getState() == "inactive") {
      this.checkerCharacter.setPosition(cellX, cellY);
      this.checkMarkCharacter.setPosition(cellX, cellY);
      this.soundMenuChoice.play();
      this._setGameState("in progress");
    }
  }

  handleCellOver(pixX:number, pixY:number) {
    let cellX = Math.floor(pixX / GridCharacter.cellDim);
    let cellY = Math.floor(pixY / GridCharacter.cellDim);
    let cell:gridFile.GridCell = this.theGrid.getCell(cellX, cellY);
    cell.setHighlight(true);
  }

  handleCellOut(pixX:number, pixY:number) {
    let cellX = Math.floor(pixX / GridCharacter.cellDim);
    let cellY = Math.floor(pixY / GridCharacter.cellDim);
    let cell:gridFile.GridCell = this.theGrid.getCell(cellX, cellY);
    cell.setHighlight(false);
  }

  handleResetPressed() {
    this.theGrid.resetArrows();
    this.soundMenuChoice.play();
    this._setGameState("ready");
  }

  handleReshufflePressed() {
    this.theGrid.reshuffleArrows();
    this.soundShuffle.play();
    this._setGameState("ready");
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
    this.soundPause.play();
    this.paused = pausedState;
  }

  // Called when user resizes the game board. Destroys the board and the
  // game pieces, then recreates them at new size.
  handleResizePressed(dir:number) {
    let oldSize:number = this.boardSize;
    this.boardSize = this.boardSize + dir;
    if (this.boardSize < 2) {
      this.boardSize = 2;
    }
    else if (this.boardSize > 32) {
      this.boardSize = 32;
    }
    if (oldSize == this.boardSize) {
      return;
    }
    this.soundResize.play();
    this._destroyCharacters();
    this._createGrid();
    this._createCharacters();
    this.resizeText.text = 'Board Size: ' + this.boardSize;
    this._setGameState("ready");
  }

  // Helper function to create the ArrowGrid
  private _createGrid() {
    if (this.theGrid) {
      this.theGrid.cleanup(this.stage);
    }
    let boardDims = {w:500, h:500} // in pixels
    // The dimensions of a board cell and a game character in pixels must be
    // set.
    gridFile.GridCell.cellDim = Math.floor(boardDims.w / this.boardSize);
    GridCharacter.cellDim = gridFile.GridCell.cellDim;
    this.theGrid = new gridFile.ArrowGrid(this.boardSize, this.boardSize, this.stage);
    let gameInstance:TheGame = this;
    // Set up handlers so that cells on board will act as mouse buttons
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
  }

  // Helper function to create the game characters
  private _createCharacters() {
    if (this.checkerCharacter) {
      // Already exist
      return;
    }
    GridCharacter.cellDim = gridFile.GridCell.cellDim;
    this.checkerCharacter = new GridCharacter('images/red-checker.png', this.theGrid.container);
    this.checkerCharacter.moveTime = 0.5;
    this.checkMarkCharacter = new GridCharacter('images/green-check-mark.png', this.theGrid.container);
    this.checkMarkCharacter.moveTime = 0.25;
  }

  // Helper function to destroy the game characters (should be done before grid destruction)
  private _destroyCharacters() {
    this.checkerCharacter.cleanup();
    this.checkerCharacter = null;
    this.checkMarkCharacter.cleanup();
    this.checkMarkCharacter = null;
  }

  // Puts the game into one of its overall states. Affects UI.
  //   "ready" = ready to place a piece
  //   "in progress" = game is being place
  //   "done" = game has reached end state
  private _setGameState(state:string) {
    console.log('Game state to: ' + state);
    if (state == "in progress") {
      this.infoText.text = "Traveling..."
      this.gameState = "in progress";
      this.resetText.visible = false;
      this.reshuffleText.visible = false;
      this.resizeText.visible = false;
      this.minusSprite.visible = false;
      this.plusSprite.visible = false;
      this.pauseText.visible = true;
    }
    else if (state == "ready") {
      this.checkerCharacter.setState("inactive");
      this.checkMarkCharacter.setState("inactive");
      this.infoText.text = "Place piece on board";
      this.scoreCounter = 0;
      this.counterText.text = 'Score: ' + this.scoreCounter;
    }
    else if (state == "done") {
      this.resetText.visible = true;
      this.reshuffleText.visible = true;
      this.resizeText.visible = true;
      this.minusSprite.visible = true;
      this.plusSprite.visible = true;
      this.pauseText.visible = false;
    }
  }
}
