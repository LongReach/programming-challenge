(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.jiboProgrammingChallenge = f()}})(function(){var define,module,exports;return (function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
"use strict";
var gridFile = require('./grid');
var PIXI = require('pixi.js');
var HOWL = require('howler');
/*
  --------------------------------------------
  Represents a game piece. A piece can occupy a cell and transition in a
  videogame-y manner between cells. It also has a state machine and
  can perform several animation sequences.
  --------------------------------------------
*/
var GridCharacter = (function () {
    function GridCharacter(name, container) {
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
    GridCharacter.prototype.cleanup = function () {
        this.container.removeChild(this.sprite);
        this.sprite.destroy();
    };
    // Instantly positions the piece at its start position
    GridCharacter.prototype.setPosition = function (i, j) {
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
    };
    // Returns true if character can be issued a new move
    GridCharacter.prototype.readyToMove = function () {
        if (this._state != "active") {
            return false;
        }
        return (!this.isMoving && this.restTimer == 0);
    };
    // Returns true if this character and the other have caught up to each other
    GridCharacter.prototype.testCollision = function (other) {
        if (this.onInitialCell || other.onInitialCell || this._state != "active") {
            return false;
        }
        if (this.cellIndexDown == other.cellIndexDown &&
            this.cellIndexRight == other.cellIndexRight) {
            return true;
        }
        return false;
    };
    // Tells the piece to begin moving in the given direction
    // See GridCell for direction values.
    GridCharacter.prototype.requestNewMove = function (direction) {
        if (this._state != "active") {
            return;
        }
        if (this.isMoving) {
            return; // can't change while already moving
        }
        if (direction == 0) {
            this.xMovementDir = -1.0;
            this.yMovementDir = 0.0;
        }
        else if (direction == 1) {
            this.xMovementDir = 0.0;
            this.yMovementDir = -1.0;
        }
        else if (direction == 2) {
            this.xMovementDir = 1.0;
            this.yMovementDir = 0.0;
        }
        else {
            this.xMovementDir = 0.0;
            this.yMovementDir = 1.0;
        }
        this.slideValue = 0;
        this.isMoving = true;
    };
    // Puts the piece in a new animation state
    // (I was going to use a typescript accessor, but not supported by this compiler)
    GridCharacter.prototype.setState = function (state) {
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
    };
    // Accessors and setters are good :)
    GridCharacter.prototype.getState = function () {
        return this._state;
    };
    // Update function called periodically. deltaT is time in seconds since last
    // call.
    GridCharacter.prototype.update = function (deltaT) {
        if (this._state == "active") {
            this.sprite.x = GridCharacter.cellDim * (this.cellIndexRight + 0.5 + this.xMovementDir * this.slideValue);
            this.sprite.y = GridCharacter.cellDim * (this.cellIndexDown + 0.5 + this.yMovementDir * this.slideValue);
            if (this.isMoving) {
                // it takes moveTime seconds to move one square
                this.slideValue = this.slideValue + deltaT / this.moveTime;
                if (this.slideValue > 1.0) {
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
            else if (this.restTimer > 0) {
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
    };
    // Puts this character into or out of paused state
    GridCharacter.prototype.setPaused = function (val) {
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
    };
    // Update function called while character is paused
    GridCharacter.prototype.updatePaused = function (deltaT) {
        // sine wave alpha effect
        this.sprite.alpha = 0.5 + 0.5 * Math.cos(this.effectSlider);
        this.effectSlider = this.effectSlider + deltaT * 4;
    };
    return GridCharacter;
}());
exports.GridCharacter = GridCharacter;
/*
  --------------------------------------------
  Represents the game at the highest level. Manages UI features, an ArrowGrid
  instance, and the game pieces.
  --------------------------------------------
*/
var TheGame = (function () {
    function TheGame(stage) {
        this.stage = stage;
        var boardDims = { w: 500, h: 500 }; // in pixels
        this.theGrid = null;
        this.boardSize = 16;
        this._createGrid();
        // Ugh, it took me a long time to get this working. The module couldn't be
        // named "Howl", or the browser would reject it (no compile error!)
        this.soundSuccess = new HOWL.Howl({ src: 'sounds/success.wav' });
        this.soundAdvance = new HOWL.Howl({ src: 'sounds/advance.wav', volume: 0.3 });
        this.soundFailure = new HOWL.Howl({ src: 'sounds/failure.wav' });
        this.soundMenuChoice = new HOWL.Howl({ src: 'sounds/menu-choice.wav' });
        this.soundResize = new HOWL.Howl({ src: 'sounds/resize.wav' });
        this.soundShuffle = new HOWL.Howl({ src: 'sounds/shuffle.mp3' });
        this.soundPause = new HOWL.Howl({ src: 'sounds/pause.mp3' });
        // Set up info text and score counter
        // -------------------------------------
        // Some helper data for positioning text and menu items in a vertical
        // "layout"
        var textSlotSize = 50;
        var layoutStartPt = { x: 0, y: 0 };
        layoutStartPt.x = this.theGrid.container.x + boardDims.w + textSlotSize;
        layoutStartPt.y = this.theGrid.container.y;
        var layoutEndPt = { x: layoutStartPt.x, y: layoutStartPt.y + boardDims.h };
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
        var mainTextDesc = { font: 'bold 30px Arial', fill: '#ff00ff', align: 'left', stroke: '#0000FF', strokeThickness: 4 };
        var currentGame = this;
        this.resetText = new PIXI.Text('Reset', mainTextDesc);
        this.resetText.position.x = layoutStartPt.x;
        this.resetText.position.y = layoutEndPt.y - textSlotSize * 3;
        stage.addChild(this.resetText);
        this.resetText.buttonMode = true;
        this.resetText.interactive = true;
        this.resetText.on('mousedown', function () {
            currentGame.handleResetPressed();
        });
        this.resetText.visible = false;
        this.reshuffleText = new PIXI.Text('Reshuffle', mainTextDesc);
        this.reshuffleText.position.x = layoutStartPt.x;
        this.reshuffleText.position.y = layoutEndPt.y - textSlotSize * 2;
        stage.addChild(this.reshuffleText);
        this.reshuffleText.buttonMode = true;
        this.reshuffleText.interactive = true;
        this.reshuffleText.on('mousedown', function () {
            currentGame.handleReshufflePressed();
        });
        this.pauseText = new PIXI.Text('Pause', mainTextDesc);
        this.pauseText.position.x = layoutStartPt.x;
        this.pauseText.position.y = layoutEndPt.y - textSlotSize;
        stage.addChild(this.pauseText);
        this.pauseText.buttonMode = true;
        this.pauseText.interactive = true;
        this.pauseText.on('mousedown', function () {
            currentGame.handlePausePressed();
        });
        this.pauseText.visible = false;
        this.resizeText = new PIXI.Text('Board Size: ' + this.boardSize, mainTextDesc);
        this.resizeText.position.x = layoutStartPt.x;
        this.resizeText.position.y = layoutEndPt.y - textSlotSize * 4;
        stage.addChild(this.resizeText);
        this.resizeText.visible = true;
        // Handy factory function
        var makeButton = function (filename) {
            var sprite = PIXI.Sprite.fromImage(filename);
            sprite.tint = 0x888888;
            sprite.width = textSlotSize * 0.8;
            sprite.height = textSlotSize * 0.8;
            stage.addChild(sprite);
            sprite.buttonMode = true;
            sprite.interactive = true;
            sprite.on('mouseover', function () {
                this.tint = 0xffffff;
            });
            sprite.on('mouseout', function () {
                this.tint = 0x888888;
            });
            sprite.visible = true;
            return sprite;
        };
        // Button for changing board size
        this.minusSprite = makeButton('images/minus-icon.png');
        this.minusSprite.x = this.resizeText.x + this.resizeText.width + 10;
        this.minusSprite.y = this.resizeText.y;
        this.minusSprite.on('mousedown', function () {
            currentGame.handleResizePressed(-1);
        });
        // Button for changing board size
        this.plusSprite = makeButton('images/plus-icon.png');
        this.plusSprite.x = this.minusSprite.x + this.minusSprite.width + 10;
        this.plusSprite.y = this.minusSprite.y;
        this.plusSprite.on('mousedown', function () {
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
    TheGame.prototype.update = function (deltaT) {
        var characters = [this.checkerCharacter, this.checkMarkCharacter];
        if (!this.checkerCharacter) {
            // no characters exist yet, no point in updating
            return;
        }
        if (this.paused) {
            for (var _i = 0, characters_1 = characters; _i < characters_1.length; _i++) {
                var char = characters_1[_i];
                char.updatePaused(deltaT);
            }
            return;
        }
        var leavingGridChar = null; // the char leaving the grid, if any
        // Iterate through game pieces, call their update functions, see if
        // any must be issued new move.
        for (var _a = 0, characters_2 = characters; _a < characters_2.length; _a++) {
            var char = characters_2[_a];
            char.update(deltaT);
            if (char.readyToMove()) {
                // Has character fallen off grid?
                if (char.cellIndexDown < 0 || char.cellIndexDown >= this.theGrid.dimY ||
                    char.cellIndexRight < 0 || char.cellIndexRight >= this.theGrid.dimX) {
                    leavingGridChar = char;
                }
                else {
                    // Character is still on board
                    var cell = this.theGrid.getCell(char.cellIndexRight, char.cellIndexDown);
                    cell.setVisited(true);
                    char.requestNewMove(cell.direction);
                    if (char == this.checkMarkCharacter) {
                        // the faster-moving character advances, so increment score
                        this.scoreCounter = this.scoreCounter + 1;
                        this.counterText.text = 'Score: ' + this.scoreCounter;
                        this.soundAdvance.play();
                    }
                    if (char == this.checkerCharacter) {
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
        else if (characters[0].testCollision(characters[1])) {
            // We've caught up
            this.checkerCharacter.setState("frozen");
            this.checkMarkCharacter.setState("explode");
            this.infoText.text = "Loop Detected!";
            this._setGameState("done");
            this.soundSuccess.play();
        }
    };
    // Called when user clicks on an arrow cell
    TheGame.prototype.handleCellPress = function (pixX, pixY) {
        var cellX = Math.floor(pixX / GridCharacter.cellDim);
        var cellY = Math.floor(pixY / GridCharacter.cellDim);
        console.log("button cell: " + cellX + "," + cellY);
        if (this.checkerCharacter.getState() == "inactive") {
            this.checkerCharacter.setPosition(cellX, cellY);
            this.checkMarkCharacter.setPosition(cellX, cellY);
            this.soundMenuChoice.play();
            this._setGameState("in progress");
        }
    };
    TheGame.prototype.handleCellOver = function (pixX, pixY) {
        var cellX = Math.floor(pixX / GridCharacter.cellDim);
        var cellY = Math.floor(pixY / GridCharacter.cellDim);
        var cell = this.theGrid.getCell(cellX, cellY);
        cell.setHighlight(true);
    };
    TheGame.prototype.handleCellOut = function (pixX, pixY) {
        var cellX = Math.floor(pixX / GridCharacter.cellDim);
        var cellY = Math.floor(pixY / GridCharacter.cellDim);
        var cell = this.theGrid.getCell(cellX, cellY);
        cell.setHighlight(false);
    };
    TheGame.prototype.handleResetPressed = function () {
        this.theGrid.resetArrows();
        this.soundMenuChoice.play();
        this._setGameState("ready");
    };
    TheGame.prototype.handleReshufflePressed = function () {
        this.theGrid.reshuffleArrows();
        this.soundShuffle.play();
        this._setGameState("ready");
    };
    TheGame.prototype.handlePausePressed = function () {
        var pausedState = !this.paused;
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
    };
    // Called when user resizes the game board. Destroys the board and the
    // game pieces, then recreates them at new size.
    TheGame.prototype.handleResizePressed = function (dir) {
        var oldSize = this.boardSize;
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
    };
    // Helper function to create the ArrowGrid
    TheGame.prototype._createGrid = function () {
        if (this.theGrid) {
            this.theGrid.cleanup(this.stage);
        }
        var boardDims = { w: 500, h: 500 }; // in pixels
        // The dimensions of a board cell and a game character in pixels must be
        // set.
        gridFile.GridCell.cellDim = Math.floor(boardDims.w / this.boardSize);
        GridCharacter.cellDim = gridFile.GridCell.cellDim;
        this.theGrid = new gridFile.ArrowGrid(this.boardSize, this.boardSize, this.stage);
        var gameInstance = this;
        // Set up handlers so that cells on board will act as mouse buttons
        var onButtonDown = function () {
            gameInstance.handleCellPress(this.x, this.y);
        };
        var onButtonOver = function () {
            gameInstance.handleCellOver(this.x, this.y);
        };
        var onButtonOut = function () {
            gameInstance.handleCellOut(this.x, this.y);
        };
        this.theGrid.setMouseFunctions(onButtonDown, onButtonOver, onButtonOut);
    };
    // Helper function to create the game characters
    TheGame.prototype._createCharacters = function () {
        if (this.checkerCharacter) {
            // Already exist
            return;
        }
        GridCharacter.cellDim = gridFile.GridCell.cellDim;
        this.checkerCharacter = new GridCharacter('images/red-checker.png', this.theGrid.container);
        this.checkerCharacter.moveTime = 0.5;
        this.checkMarkCharacter = new GridCharacter('images/green-check-mark.png', this.theGrid.container);
        this.checkMarkCharacter.moveTime = 0.25;
    };
    // Helper function to destroy the game characters (should be done before grid destruction)
    TheGame.prototype._destroyCharacters = function () {
        this.checkerCharacter.cleanup();
        this.checkerCharacter = null;
        this.checkMarkCharacter.cleanup();
        this.checkMarkCharacter = null;
    };
    // Puts the game into one of its overall states. Affects UI.
    //   "ready" = ready to place a piece
    //   "in progress" = game is being place
    //   "done" = game has reached end state
    TheGame.prototype._setGameState = function (state) {
        console.log('Game state to: ' + state);
        if (state == "in progress") {
            this.infoText.text = "Traveling...";
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
    };
    return TheGame;
}());
exports.TheGame = TheGame;
},{"./grid":2,"howler":undefined,"pixi.js":undefined}],2:[function(require,module,exports){
"use strict";
var PIXI = require('pixi.js');
// -----------------------
// Class definitions
// -----------------------
/*
  Represents a cell on the game board. A cell contains an arrow Sprite
  which points in one of four cardinal directions. Each cell acts as
  a button and can be clicked.
*/
var GridCell = (function () {
    function GridCell(i, j, container) {
        var arrow = PIXI.Sprite.fromImage('images/arrow-icon.png');
        arrow.x = GridCell.cellDim * (i + 0.5);
        arrow.y = GridCell.cellDim * (j + 0.5);
        arrow.width = GridCell.cellDim;
        arrow.height = GridCell.cellDim;
        arrow.anchor.x = 0.5;
        arrow.anchor.y = 0.5;
        container.addChild(arrow);
        this.cellX = i;
        this.cellY = j;
        this.sprite = arrow;
        this.direction = 0;
        this.setVisited(false);
    }
    // Set up this cell to act as a button
    GridCell.prototype.setMouseFunctions = function (onButtonDown, onButtonOver, onButtonOut) {
        this.sprite.buttonMode = true;
        this.sprite.interactive = true;
        this.sprite.on('mousedown', onButtonDown);
        this.sprite.on('mouseover', onButtonOver);
        this.sprite.on('mouseout', onButtonOut);
    };
    // Sets the direction of the arrow: 0=left, 1=up, 2=right, 3=down
    GridCell.prototype.setDirection = function (val) {
        var pi = 3.14159265;
        this.sprite.rotation = pi * val / 2.0;
        this.direction = val;
    };
    // Sets if the cell has been visited by a game piece
    GridCell.prototype.setVisited = function (value) {
        if (value) {
            this.sprite.tint = 0xffffff; // make brighter
        }
        else {
            this.sprite.tint = 0xff77aa;
        }
        this.visited = value;
    };
    // If value==true, temporarily highlights the cell
    // If value==false, it reverts to its previous color
    GridCell.prototype.setHighlight = function (value) {
        var currentValue = this.visited;
        if (!value) {
            value = currentValue;
        }
        this.setVisited(value);
        this.visited = currentValue;
    };
    GridCell.cellDim = 50; // dimension of a cell in pixels
    return GridCell;
}());
exports.GridCell = GridCell;
/*
  --------------------------------------------
  Represents the entire game board. Contains a 2d array of GricCell objects.
  --------------------------------------------
*/
var ArrowGrid = (function () {
    function ArrowGrid(width, height, stage) {
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
                var newCell = new GridCell(i, j, this.container);
                this.grid[j][i] = newCell;
            }
            ;
        }
        this.reshuffleArrows();
    }
    // Prepares the grid for removal
    ArrowGrid.prototype.cleanup = function (stage) {
        stage.removeChild(this.container);
        this.container.destroy();
    };
    // Sets up each cell to act as a button. The given functions respond to various
    // mouse events.
    ArrowGrid.prototype.setMouseFunctions = function (onButtonDown, onButtonOver, onButtonOut) {
        for (var j = 0; j < this.dimY; j++) {
            for (var i = 0; i < this.dimX; i++) {
                this.grid[j][i].setMouseFunctions(onButtonDown, onButtonOver, onButtonOut);
            }
            ;
        }
    };
    // Marks all cells as unvisited
    ArrowGrid.prototype.resetArrows = function () {
        for (var j = 0; j < this.dimY; j++) {
            for (var i = 0; i < this.dimX; i++) {
                this.grid[j][i].setVisited(false);
            }
            ;
        }
    };
    // Marks all cells as unvisited and changes arrow directions
    ArrowGrid.prototype.reshuffleArrows = function () {
        for (var j = 0; j < this.dimY; j++) {
            for (var i = 0; i < this.dimX; i++) {
                this.grid[j][i].setVisited(false);
                // It's a little boring to have two arrows pointing at each other, so prevent that
                var allowedDirections = [true, true, true, true, false];
                // Is the one above me pointing down?
                if (j > 0 && this.grid[j - 1][i].direction == 3) {
                    // Not allowed to point straight up
                    allowedDirections[1] = false;
                }
                // Is the one to my left pointing right?
                if (i > 0 && this.grid[j][i - 1].direction == 2) {
                    // Not allowed to point left
                    allowedDirections[0] = false;
                }
                var proposedDirection = 4; // not a valid direction, so the first test will fail
                while (allowedDirections[proposedDirection] == false) {
                    proposedDirection = Math.floor(Math.random() * 4.0);
                }
                this.grid[j][i].setDirection(proposedDirection);
            }
            ;
        }
    };
    // Returns ref to cell at particular grid location
    ArrowGrid.prototype.getCell = function (gridX, gridY) {
        return this.grid[gridY][gridX];
    };
    return ArrowGrid;
}());
exports.ArrowGrid = ArrowGrid;
},{"pixi.js":undefined}],3:[function(require,module,exports){
/// <reference path="../typings/index.d.ts" />
/// <reference path="grid.ts" />
/// <reference path="game.ts" />
"use strict";
var gameFile = require('./game'); // "requires game", ha
var PIXI = require('pixi.js');
var renderer = new PIXI.WebGLRenderer(1280, 720);
document.body.appendChild(renderer.view);
var cellDim = 50;
// -----------------------
// Global vars and basic setup
// -----------------------
// Graphical container
// create the root of the scene graph
var stage = new PIXI.Container();
var gameInstance;
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
},{"./game":1,"pixi.js":undefined}]},{},[3])(3)
});

//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvZ2FtZS50cyIsInNyYy9ncmlkLnRzIiwic3JjL2luZGV4LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOztBQ0FBLElBQU8sUUFBUSxXQUFXLFFBQVEsQ0FBQyxDQUFDO0FBQ3BDLElBQU8sSUFBSSxXQUFXLFNBQVMsQ0FBQyxDQUFDO0FBQ2pDLElBQU8sSUFBSSxXQUFXLFFBQVEsQ0FBQyxDQUFDO0FBRWhDOzs7Ozs7RUFNRTtBQUNGO0lBdUJFLHVCQUFZLElBQVcsRUFBRSxTQUF3QjtRQUMvQyxJQUFJLENBQUMsU0FBUyxHQUFHLFNBQVMsQ0FBQztRQUMzQixJQUFJLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQzFDLGFBQWEsQ0FBQyxPQUFPLEdBQUcsUUFBUSxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUM7UUFDbEQsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLEdBQUcsYUFBYSxDQUFDLE9BQU8sQ0FBQztRQUMxQyxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sR0FBRyxhQUFhLENBQUMsT0FBTyxDQUFDO1FBQzNDLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsR0FBRyxHQUFHLENBQUM7UUFDM0IsSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBQztRQUMzQixJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssR0FBRyxDQUFDLENBQUM7UUFDdEIsU0FBUyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7UUFFaEMsSUFBSSxDQUFDLFlBQVksR0FBRyxDQUFDLENBQUM7UUFDdEIsSUFBSSxDQUFDLFlBQVksR0FBRyxDQUFDLENBQUM7UUFDdEIsSUFBSSxDQUFDLFFBQVEsR0FBRyxLQUFLLENBQUM7UUFDdEIsSUFBSSxDQUFD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Q0FBZ0M7O0FBR2hDLElBQU8sUUFBUSxXQUFXLFFBQVEsQ0FBQyxDQUFDLENBQUMsc0JBQXNCO0FBQzNELElBQU8sSUFBSSxXQUFXLFNBQVMsQ0FBQyxDQUFDO0FBRWpDLElBQU0sUUFBUSxHQUFzQixJQUFJLElBQUksQ0FBQyxhQUFhLENBQUMsSUFBSSxFQUFFLEdBQUcsQ0FBQyxDQUFDO0FBQ3RFLFFBQVEsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQztBQUV6QyxJQUFJLE9BQU8sR0FBVSxFQUFFLENBQUM7QUFFeEIsMEJBQTBCO0FBQzFCLDhCQUE4QjtBQUM5QiwwQkFBMEI7QUFFMUIsc0JBQXNCO0FBRXRCLHFDQUFxQztBQUNyQyxJQUFJLEtBQUssR0FBRyxJQUFJLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQztBQUVqQyxJQUFJLFlBQTZCLENBQUM7QUFFbEMsT0FBTyxFQUFFLENBQUM7QUFFViwwQkFBMEI7QUFDMUIsdUJBQXVCO0FBQ3ZCLDBCQUEwQjtBQUUxQjtJQUNJLFlBQVksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyx1Q0FBdUM7QUFDdEUsQ0FBQztBQUVEO0lBQ0UsZUFBZTtJQUNmLE9BQU8sQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUM7SUFDcEIsWUFBWSxHQUFHLElBQUksUUFBUSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUMzQyxtREFBbUQ7SUFDbkQsV0FBVyxDQUFDLE1BQU0sRUFBRSxFQUFFLENBQUMsQ0FBQztJQUN4QixPQUFPLEVBQUUsQ0FBQztBQUNaLENBQUM7QUFFRDtJQUVJLHFCQUFxQixDQUFDLE9BQU8sQ0FBQyxDQUFDO0lBRS9CLDRCQUE0QjtJQUM1QixRQUFRLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDO0FBQzNCLENBQUMiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbigpe2Z1bmN0aW9uIHIoZSxuLHQpe2Z1bmN0aW9uIG8oaSxmKXtpZighbltpXSl7aWYoIWVbaV0pe3ZhciBjPVwiZnVuY3Rpb25cIj09dHlwZW9mIHJlcXVpcmUmJnJlcXVpcmU7aWYoIWYmJmMpcmV0dXJuIGMoaSwhMCk7aWYodSlyZXR1cm4gdShpLCEwKTt2YXIgYT1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK2krXCInXCIpO3Rocm93IGEuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixhfXZhciBwPW5baV09e2V4cG9ydHM6e319O2VbaV1bMF0uY2FsbChwLmV4cG9ydHMsZnVuY3Rpb24ocil7dmFyIG49ZVtpXVsxXVtyXTtyZXR1cm4gbyhufHxyKX0scCxwLmV4cG9ydHMscixlLG4sdCl9cmV0dXJuIG5baV0uZXhwb3J0c31mb3IodmFyIHU9XCJmdW5jdGlvblwiPT10eXBlb2YgcmVxdWlyZSYmcmVxdWlyZSxpPTA7aTx0Lmxlbmd0aDtpKyspbyh0W2ldKTtyZXR1cm4gb31yZXR1cm4gcn0pKCkiLCJpbXBvcnQgZ3JpZEZpbGUgPSByZXF1aXJlKCcuL2dyaWQnKTtcclxuaW1wb3J0IFBJWEkgPSByZXF1aXJlKCdwaXhpLmpzJyk7XHJcbmltcG9ydCBIT1dMID0gcmVxdWlyZSgnaG93bGVyJyk7XHJcblxyXG4vKlxyXG4gIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcbiAgUmVwcmVzZW50cyBhIGdhbWUgcGllY2UuIEEgcGllY2UgY2FuIG9jY3VweSBhIGNlbGwgYW5kIHRyYW5zaXRpb24gaW4gYVxyXG4gIHZpZGVvZ2FtZS15IG1hbm5lciBiZXR3ZWVuIGNlbGxzLiBJdCBhbHNvIGhhcyBhIHN0YXRlIG1hY2hpbmUgYW5kXHJcbiAgY2FuIHBlcmZvcm0gc2V2ZXJhbCBhbmltYXRpb24gc2VxdWVuY2VzLlxyXG4gIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcbiovXHJcbmV4cG9ydCBjbGFzcyBHcmlkQ2hhcmFjdGVyIHtcclxuICBjb250YWluZXI6UElYSS5Db250YWluZXI7XHJcbiAgc3ByaXRlOlBJWEkuU3ByaXRlO1xyXG4gIHN0YXRpYyBjZWxsRGltOm51bWJlcjsgLy8gRGltZW5zaW9ucyBvZiBhIGNlbGwgaW4gcGl4ZWxzXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAvLyAoY2hhbmdlcyBhZnRlciBib2FyZCByZXNpemUpXHJcblxyXG4gIGNlbGxJbmRleFJpZ2h0Om51bWJlcjsgLy8gYm9hcmQgY29vcmRpbmF0ZVxyXG4gIGNlbGxJbmRleERvd246bnVtYmVyO1xyXG4gIHhNb3ZlbWVudERpcjpudW1iZXI7IC8vIGRpcmVjdGlvbiBvZiBjdXJyZW50IG1vdmVtZW50LCAoLTEgPSBsZWZ0LCAxID0gcmlnaHQpXHJcbiAgeU1vdmVtZW50RGlyOm51bWJlcjsgLy8gZGlyZWN0aW9uIG9mIGN1cnJlbnQgbW92ZW1lbnQsICgtMSA9IHVwLCAxID0gZG93bilcclxuXHJcbiAgc2xpZGVWYWx1ZTpudW1iZXI7IC8vIGhvdyBmYXIgdGhlIHBpZWNlIGhhcyBzbGlkIGF3YXkgZnJvbSBjdXJyZW50IGNlbGxcclxuICAgICAgICAgICAgICAgICAgICAgLy8gMCB0byAxXHJcbiAgZWZmZWN0U2xpZGVyOm51bWJlcjsgLy8gVXNlZCBmb3IgdGhlIGFuaW1hdGlvbiBvZiBlZmZlY3RzXHJcbiAgcmVzdFRpbWVyOm51bWJlcjsgIC8vIHRoZSBwaWVjZSBcInJlc3RzXCIgZm9yIGEgYml0IGFmdGVyIGFycml2aW5nXHJcbiAgbW92ZVRpbWU6bnVtYmVyOyAvLyBob3cgbWFueSBzZWNvbmRzIGEgbW92ZSBvciByZXN0IHBlcmlvZCB0YWtlc1xyXG5cclxuICBvbkluaXRpYWxDZWxsOmJvb2xlYW47IC8vIHRydWUgaXMgcGllY2UgaXMgc3RpbGwgb24gZmlyc3QgY2VsbFxyXG4gIGlzTW92aW5nOmJvb2xlYW47IC8vIHRydWUgaWYgcGllY2UgaXMgdmlzdWFsbHkgbW92aW5nXHJcbiAgcGF1c2VkOmJvb2xlYW47IC8vIHRydWUgaWYgcGllY2UgaXMgaW4gYSBwYXVzZWQgc3RhdGUsIHNpbWlsYXIgdG8gZ2FtZSBjaGFyYWN0ZXJcclxuXHJcbiAgcHJpdmF0ZSBfc3RhdGU6c3RyaW5nO1xyXG5cclxuICBjb25zdHJ1Y3RvcihuYW1lOnN0cmluZywgY29udGFpbmVyOlBJWEkuQ29udGFpbmVyKSB7XHJcbiAgICB0aGlzLmNvbnRhaW5lciA9IGNvbnRhaW5lcjtcclxuICAgIHRoaXMuc3ByaXRlID0gUElYSS5TcHJpdGUuZnJvbUltYWdlKG5hbWUpO1xyXG4gICAgR3JpZENoYXJhY3Rlci5jZWxsRGltID0gZ3JpZEZpbGUuR3JpZENlbGwuY2VsbERpbTtcclxuICAgIHRoaXMuc3ByaXRlLndpZHRoID0gR3JpZENoYXJhY3Rlci5jZWxsRGltO1xyXG4gICAgdGhpcy5zcHJpdGUuaGVpZ2h0ID0gR3JpZENoYXJhY3Rlci5jZWxsRGltO1xyXG4gICAgdGhpcy5zcHJpdGUuYW5jaG9yLnggPSAwLjU7XHJcbiAgICB0aGlzLnNwcml0ZS5hbmNob3IueSA9IDAuNTtcclxuICAgIHRoaXMuc3ByaXRlLmFscGhhID0gMDtcclxuICAgIGNvbnRhaW5lci5hZGRDaGlsZCh0aGlzLnNwcml0ZSk7XHJcblxyXG4gICAgdGhpcy54TW92ZW1lbnREaXIgPSAwO1xyXG4gICAgdGhpcy55TW92ZW1lbnREaXIgPSAwO1xyXG4gICAgdGhpcy5pc01vdmluZyA9IGZhbHNlO1xyXG4gICAgdGhpcy5wYXVzZWQgPSBmYWxzZTtcclxuICAgIHRoaXMucmVzdFRpbWVyID0gMDtcclxuICAgIHRoaXMubW92ZVRpbWUgPSAxLjA7XHJcbiAgICB0aGlzLl9zdGF0ZSA9IFwiaW5hY3RpdmVcIjtcclxuICB9XHJcblxyXG4gIC8vIFByZXBhcmVzIHBpZWNlIGZvciBkZXN0cnVjdGlvblxyXG4gIGNsZWFudXAoKSB7XHJcbiAgICB0aGlzLmNvbnRhaW5lci5yZW1vdmVDaGlsZCh0aGlzLnNwcml0ZSk7XHJcbiAgICB0aGlzLnNwcml0ZS5kZXN0cm95KCk7XHJcbiAgfVxyXG5cclxuICAvLyBJbnN0YW50bHkgcG9zaXRpb25zIHRoZSBwaWVjZSBhdCBpdHMgc3RhcnQgcG9zaXRpb25cclxuICBzZXRQb3NpdGlvbihpOm51bWJlciwgajpudW1iZXIpIHtcclxuICAgIHRoaXMuc3ByaXRlLnggPSBHcmlkQ2hhcmFjdGVyLmNlbGxEaW0gKiAoaSArIDAuNSk7XHJcbiAgICB0aGlzLnNwcml0ZS55ID0gR3JpZENoYXJhY3Rlci5jZWxsRGltICogKGogKyAwLjUpO1xyXG4gICAgdGhpcy5zcHJpdGUud2lkdGggPSBHcmlkQ2hhcmFjdGVyLmNlbGxEaW07XHJcbiAgICB0aGlzLnNwcml0ZS5oZWlnaHQgPSBHcmlkQ2hhcmFjdGVyLmNlbGxEaW07XHJcbiAgICB0aGlzLnNwcml0ZS5hbHBoYSA9IDE7XHJcbiAgICB0aGlzLmNlbGxJbmRleERvd24gPSBqO1xyXG4gICAgdGhpcy5jZWxsSW5kZXhSaWdodCA9IGk7XHJcbiAgICB0aGlzLm9uSW5pdGlhbENlbGwgPSB0cnVlO1xyXG4gICAgdGhpcy5wYXVzZWQgPSBmYWxzZTtcclxuICAgIHRoaXMuaXNNb3ZpbmcgPSBmYWxzZTtcclxuICAgIHRoaXMuc2xpZGVWYWx1ZSA9IDA7XHJcbiAgICB0aGlzLnJlc3RUaW1lciA9IHRoaXMubW92ZVRpbWU7IC8vIGxldCBpdCByZXN0IGJlZm9yZSBzdGFydGluZyBtb3ZlXHJcbiAgICB0aGlzLl9zdGF0ZSA9IFwiYWN0aXZlXCI7XHJcbiAgfVxyXG5cclxuICAvLyBSZXR1cm5zIHRydWUgaWYgY2hhcmFjdGVyIGNhbiBiZSBpc3N1ZWQgYSBuZXcgbW92ZVxyXG4gIHJlYWR5VG9Nb3ZlKCkge1xyXG4gICAgaWYgKHRoaXMuX3N0YXRlICE9IFwiYWN0aXZlXCIpIHtcclxuICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuICghdGhpcy5pc01vdmluZyAmJiB0aGlzLnJlc3RUaW1lciA9PSAwKTtcclxuICB9XHJcblxyXG4gIC8vIFJldHVybnMgdHJ1ZSBpZiB0aGlzIGNoYXJhY3RlciBhbmQgdGhlIG90aGVyIGhhdmUgY2F1Z2h0IHVwIHRvIGVhY2ggb3RoZXJcclxuICB0ZXN0Q29sbGlzaW9uKG90aGVyOkdyaWRDaGFyYWN0ZXIpIHtcclxuICAgIGlmICh0aGlzLm9uSW5pdGlhbENlbGwgfHwgb3RoZXIub25Jbml0aWFsQ2VsbCB8fCB0aGlzLl9zdGF0ZSAhPSBcImFjdGl2ZVwiKSB7XHJcbiAgICAgIHJldHVybiBmYWxzZTtcclxuICAgIH1cclxuICAgIGlmICh0aGlzLmNlbGxJbmRleERvd24gPT0gb3RoZXIuY2VsbEluZGV4RG93biAmJlxyXG4gICAgICB0aGlzLmNlbGxJbmRleFJpZ2h0ID09IG90aGVyLmNlbGxJbmRleFJpZ2h0KSB7XHJcbiAgICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgIH1cclxuICAgIHJldHVybiBmYWxzZTtcclxuICB9XHJcblxyXG4gIC8vIFRlbGxzIHRoZSBwaWVjZSB0byBiZWdpbiBtb3ZpbmcgaW4gdGhlIGdpdmVuIGRpcmVjdGlvblxyXG4gIC8vIFNlZSBHcmlkQ2VsbCBmb3IgZGlyZWN0aW9uIHZhbHVlcy5cclxuICByZXF1ZXN0TmV3TW92ZShkaXJlY3Rpb24pIHtcclxuICAgIGlmICh0aGlzLl9zdGF0ZSAhPSBcImFjdGl2ZVwiKSB7XHJcbiAgICAgIHJldHVybjtcclxuICAgIH1cclxuICAgIGlmICh0aGlzLmlzTW92aW5nKSB7XHJcbiAgICAgIHJldHVybjsgLy8gY2FuJ3QgY2hhbmdlIHdoaWxlIGFscmVhZHkgbW92aW5nXHJcbiAgICB9XHJcbiAgICBpZiAoZGlyZWN0aW9uID09IDApIC8vIGxlZnRcclxuICAgIHtcclxuICAgICAgdGhpcy54TW92ZW1lbnREaXIgPSAtMS4wO1xyXG4gICAgICB0aGlzLnlNb3ZlbWVudERpciA9ICAwLjA7XHJcbiAgICB9XHJcbiAgICBlbHNlIGlmIChkaXJlY3Rpb24gPT0gMSkgLy8gdXBcclxuICAgIHtcclxuICAgICAgdGhpcy54TW92ZW1lbnREaXIgPSAgMC4wO1xyXG4gICAgICB0aGlzLnlNb3ZlbWVudERpciA9IC0xLjA7XHJcbiAgICB9XHJcbiAgICBlbHNlIGlmIChkaXJlY3Rpb24gPT0gMikgLy8gcmlnaHRcclxuICAgIHtcclxuICAgICAgdGhpcy54TW92ZW1lbnREaXIgPSAgMS4wO1xyXG4gICAgICB0aGlzLnlNb3ZlbWVudERpciA9ICAwLjA7XHJcbiAgICB9XHJcbiAgICBlbHNlICAvLyBkb3duXHJcbiAgICB7XHJcbiAgICAgIHRoaXMueE1vdmVtZW50RGlyID0gIDAuMDtcclxuICAgICAgdGhpcy55TW92ZW1lbnREaXIgPSAgMS4wO1xyXG4gICAgfVxyXG4gICAgdGhpcy5zbGlkZVZhbHVlID0gMDtcclxuICAgIHRoaXMuaXNNb3ZpbmcgPSB0cnVlO1xyXG4gIH1cclxuXHJcbiAgLy8gUHV0cyB0aGUgcGllY2UgaW4gYSBuZXcgYW5pbWF0aW9uIHN0YXRlXHJcbiAgLy8gKEkgd2FzIGdvaW5nIHRvIHVzZSBhIHR5cGVzY3JpcHQgYWNjZXNzb3IsIGJ1dCBub3Qgc3VwcG9ydGVkIGJ5IHRoaXMgY29tcGlsZXIpXHJcbiAgc2V0U3RhdGUoc3RhdGU6c3RyaW5nKSB7XHJcbiAgICBpZiAodGhpcy5fc3RhdGUgPT0gc3RhdGUgfHwgdGhpcy5fc3RhdGUgPT0gXCJpbmFjdGl2ZVwiKSB7XHJcbiAgICAgIC8vIE5vdGhpbmcgaGFwcGVucyBpZiB3ZSdyZSBhbHJlYWR5IGluIHJlcXVlc3RlZCBzdGF0ZSBvciBpZiBjaGFyYWN0ZXJcclxuICAgICAgLy8gaXMgaW5hY3RpdmVcclxuICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG4gICAgY29uc29sZS5sb2coXCJzdGF0ZSB0byBcIiArIHN0YXRlKTtcclxuICAgIHRoaXMuX3N0YXRlID0gc3RhdGU7XHJcbiAgICBpZiAoc3RhdGUgPT0gXCJmcm96ZW5cIikge1xyXG4gICAgICB0aGlzLmVmZmVjdFNsaWRlciA9IDA7XHJcbiAgICB9XHJcbiAgICBlbHNlIGlmIChzdGF0ZSA9PSBcImR5aW5nXCIpIHtcclxuICAgICAgdGhpcy5lZmZlY3RTbGlkZXIgPSAxO1xyXG4gICAgfVxyXG4gICAgZWxzZSBpZiAoc3RhdGUgPT0gXCJleHBsb2RlXCIpIHtcclxuICAgICAgdGhpcy5lZmZlY3RTbGlkZXIgPSAxO1xyXG4gICAgfVxyXG4gICAgZWxzZSBpZiAoc3RhdGUgPT0gXCJpbmFjdGl2ZVwiKSB7XHJcbiAgICAgIHRoaXMuc3ByaXRlLmFscGhhID0gMDtcclxuICAgICAgdGhpcy5pc01vdmluZyA9IGZhbHNlO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgLy8gQWNjZXNzb3JzIGFuZCBzZXR0ZXJzIGFyZSBnb29kIDopXHJcbiAgZ2V0U3RhdGUoKSB7XHJcbiAgICByZXR1cm4gdGhpcy5fc3RhdGU7XHJcbiAgfVxyXG5cclxuICAvLyBVcGRhdGUgZnVuY3Rpb24gY2FsbGVkIHBlcmlvZGljYWxseS4gZGVsdGFUIGlzIHRpbWUgaW4gc2Vjb25kcyBzaW5jZSBsYXN0XHJcbiAgLy8gY2FsbC5cclxuICB1cGRhdGUoZGVsdGFUKSB7XHJcbiAgICBpZiAodGhpcy5fc3RhdGUgPT0gXCJhY3RpdmVcIikge1xyXG4gICAgICB0aGlzLnNwcml0ZS54ID0gR3JpZENoYXJhY3Rlci5jZWxsRGltICogKHRoaXMuY2VsbEluZGV4UmlnaHQgKyAwLjUgKyB0aGlzLnhNb3ZlbWVudERpciAqIHRoaXMuc2xpZGVWYWx1ZSk7XHJcbiAgICAgIHRoaXMuc3ByaXRlLnkgPSBHcmlkQ2hhcmFjdGVyLmNlbGxEaW0gKiAodGhpcy5jZWxsSW5kZXhEb3duICsgMC41ICsgdGhpcy55TW92ZW1lbnREaXIgKiB0aGlzLnNsaWRlVmFsdWUpO1xyXG4gICAgICBpZiAodGhpcy5pc01vdmluZykge1xyXG4gICAgICAgIC8vIGl0IHRha2VzIG1vdmVUaW1lIHNlY29uZHMgdG8gbW92ZSBvbmUgc3F1YXJlXHJcbiAgICAgICAgdGhpcy5zbGlkZVZhbHVlID0gdGhpcy5zbGlkZVZhbHVlICsgZGVsdGFUIC8gdGhpcy5tb3ZlVGltZTtcclxuICAgICAgICBpZiAodGhpcy5zbGlkZVZhbHVlID4gMS4wKVxyXG4gICAgICAgIHtcclxuICAgICAgICAgIC8vIFdlJ3ZlIGFycml2ZWRcclxuICAgICAgICAgIHRoaXMuY2VsbEluZGV4UmlnaHQgPSB0aGlzLmNlbGxJbmRleFJpZ2h0ICsgdGhpcy54TW92ZW1lbnREaXI7XHJcbiAgICAgICAgICB0aGlzLmNlbGxJbmRleERvd24gPSB0aGlzLmNlbGxJbmRleERvd24gKyB0aGlzLnlNb3ZlbWVudERpcjtcclxuICAgICAgICAgIHRoaXMuc2xpZGVWYWx1ZSA9IDA7XHJcbiAgICAgICAgICB0aGlzLnhNb3ZlbWVudERpciA9IDAuMDtcclxuICAgICAgICAgIHRoaXMueU1vdmVtZW50RGlyID0gMC4wO1xyXG4gICAgICAgICAgdGhpcy5pc01vdmluZyA9IGZhbHNlO1xyXG4gICAgICAgICAgdGhpcy5vbkluaXRpYWxDZWxsID0gZmFsc2U7XHJcbiAgICAgICAgICB0aGlzLnJlc3RUaW1lciA9IHRoaXMubW92ZVRpbWU7XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICAgIGVsc2UgaWYgKHRoaXMucmVzdFRpbWVyID4gMClcclxuICAgICAge1xyXG4gICAgICAgIC8vIFBpZWNlIGlzIHJlc3RpbmcgYWZ0ZXIgY29tcGxldGluZyBtb3ZlXHJcbiAgICAgICAgdGhpcy5yZXN0VGltZXIgPSB0aGlzLnJlc3RUaW1lciAtIGRlbHRhVDtcclxuICAgICAgICBpZiAodGhpcy5yZXN0VGltZXIgPCAwKSB7XHJcbiAgICAgICAgICB0aGlzLnJlc3RUaW1lciA9IDA7XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICB9IC8vIGVuZCBpZiBhY3RpdmUgc3RhdGVcclxuICAgIGVsc2UgaWYgKHRoaXMuX3N0YXRlID09IFwiZnJvemVuXCIpIHtcclxuICAgICAgLy8gc2luZSB3YXZlIGFscGhhIGVmZmVjdFxyXG4gICAgICB0aGlzLnNwcml0ZS5hbHBoYSA9IDAuNSArIDAuNSAqIE1hdGguY29zKHRoaXMuZWZmZWN0U2xpZGVyKTtcclxuICAgICAgdGhpcy5lZmZlY3RTbGlkZXIgPSB0aGlzLmVmZmVjdFNsaWRlciArIGRlbHRhVCAqIDQ7XHJcbiAgICB9XHJcbiAgICBlbHNlIGlmICh0aGlzLl9zdGF0ZSA9PSBcImR5aW5nXCIpIHtcclxuICAgICAgLy8gZmFkZSBhbmQgc2hyaW5rIGVmZmVjdFxyXG4gICAgICB0aGlzLnNwcml0ZS5hbHBoYSA9IHRoaXMuZWZmZWN0U2xpZGVyO1xyXG4gICAgICB0aGlzLnNwcml0ZS53aWR0aCA9IEdyaWRDaGFyYWN0ZXIuY2VsbERpbSAqICgwLjUgKyB0aGlzLmVmZmVjdFNsaWRlciAvIDIpO1xyXG4gICAgICB0aGlzLnNwcml0ZS5oZWlnaHQgPSBHcmlkQ2hhcmFjdGVyLmNlbGxEaW0gKiAoMC41ICsgdGhpcy5lZmZlY3RTbGlkZXIgLyAyKTtcclxuICAgICAgdGhpcy5lZmZlY3RTbGlkZXIgPSB0aGlzLmVmZmVjdFNsaWRlciAtIGRlbHRhVCAvICh0aGlzLm1vdmVUaW1lICogNC4wKTtcclxuICAgICAgaWYgKHRoaXMuZWZmZWN0U2xpZGVyIDw9IDAuMCkge1xyXG4gICAgICAgIHRoaXMuc2V0U3RhdGUoXCJpbmFjdGl2ZVwiKTtcclxuICAgICAgfVxyXG4gICAgfVxyXG4gICAgZWxzZSBpZiAodGhpcy5fc3RhdGUgPT0gXCJleHBsb2RlXCIpIHtcclxuICAgICAgLy8gYnVyc3QgYW5kIGZhZGUgZWZmZWN0XHJcbiAgICAgIHRoaXMuc3ByaXRlLmFscGhhID0gdGhpcy5lZmZlY3RTbGlkZXI7XHJcbiAgICAgIHRoaXMuc3ByaXRlLndpZHRoID0gR3JpZENoYXJhY3Rlci5jZWxsRGltICogKDEuMCArICgzLjAgLSB0aGlzLmVmZmVjdFNsaWRlciAqIDMuMCkpO1xyXG4gICAgICB0aGlzLnNwcml0ZS5oZWlnaHQgPSBHcmlkQ2hhcmFjdGVyLmNlbGxEaW0gKiAoMS4wICsgKDMuMCAtIHRoaXMuZWZmZWN0U2xpZGVyICogMy4wKSk7XHJcbiAgICAgIHRoaXMuZWZmZWN0U2xpZGVyID0gdGhpcy5lZmZlY3RTbGlkZXIgLSBkZWx0YVQgLyAodGhpcy5tb3ZlVGltZSAqIDQuMCk7XHJcbiAgICAgIGlmICh0aGlzLmVmZmVjdFNsaWRlciA8PSAwLjApIHtcclxuICAgICAgICB0aGlzLmVmZmVjdFNsaWRlciA9IDE7IC8vIGtlZXAgZXhwbG9kaW5nIGZvcmV2ZXJcclxuICAgICAgfVxyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgLy8gUHV0cyB0aGlzIGNoYXJhY3RlciBpbnRvIG9yIG91dCBvZiBwYXVzZWQgc3RhdGVcclxuICBzZXRQYXVzZWQodmFsOmJvb2xlYW4pIHtcclxuICAgIGlmICh0aGlzLnBhdXNlZCA9PSB2YWwpIHtcclxuICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG5cclxuICAgIHRoaXMucGF1c2VkID0gdmFsO1xyXG4gICAgaWYgKHZhbCkge1xyXG4gICAgICB0aGlzLmVmZmVjdFNsaWRlciA9IDA7XHJcbiAgICB9XHJcbiAgICBlbHNlIHtcclxuICAgICAgdGhpcy5zcHJpdGUuYWxwaGEgPSAxO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgLy8gVXBkYXRlIGZ1bmN0aW9uIGNhbGxlZCB3aGlsZSBjaGFyYWN0ZXIgaXMgcGF1c2VkXHJcbiAgdXBkYXRlUGF1c2VkKGRlbHRhVCkge1xyXG4gICAgLy8gc2luZSB3YXZlIGFscGhhIGVmZmVjdFxyXG4gICAgdGhpcy5zcHJpdGUuYWxwaGEgPSAwLjUgKyAwLjUgKiBNYXRoLmNvcyh0aGlzLmVmZmVjdFNsaWRlcik7XHJcbiAgICB0aGlzLmVmZmVjdFNsaWRlciA9IHRoaXMuZWZmZWN0U2xpZGVyICsgZGVsdGFUICogNDtcclxuICB9XHJcbn1cclxuXHJcbi8qXHJcbiAgLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuICBSZXByZXNlbnRzIHRoZSBnYW1lIGF0IHRoZSBoaWdoZXN0IGxldmVsLiBNYW5hZ2VzIFVJIGZlYXR1cmVzLCBhbiBBcnJvd0dyaWRcclxuICBpbnN0YW5jZSwgYW5kIHRoZSBnYW1lIHBpZWNlcy5cclxuICAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG4qL1xyXG5leHBvcnQgY2xhc3MgVGhlR2FtZSB7XHJcbiAgc3RhZ2U6UElYSS5Db250YWluZXI7XHJcblxyXG4gIHRoZUdyaWQ6Z3JpZEZpbGUuQXJyb3dHcmlkO1xyXG4gIGJvYXJkU2l6ZTpudW1iZXI7IC8vIGluIGNlbGxzXHJcblxyXG4gIGNoZWNrZXJDaGFyYWN0ZXI6R3JpZENoYXJhY3RlcjtcclxuICBjaGVja01hcmtDaGFyYWN0ZXI6R3JpZENoYXJhY3RlcjtcclxuXHJcbiAgaW5mb1RleHQ6UElYSS5UZXh0O1xyXG4gIGNvdW50ZXJUZXh0OlBJWEkuVGV4dDtcclxuICByZXNldFRleHQ6UElYSS5UZXh0O1xyXG4gIHJlc2h1ZmZsZVRleHQ6UElYSS5UZXh0O1xyXG4gIHBhdXNlVGV4dDpQSVhJLlRleHQ7XHJcbiAgcmVzaXplVGV4dDpQSVhJLlRleHQ7XHJcblxyXG4gIG1pbnVzU3ByaXRlOlBJWEkuU3ByaXRlO1xyXG4gIHBsdXNTcHJpdGU6UElYSS5TcHJpdGU7XHJcblxyXG4gIGdhbWVTdGF0ZTpzdHJpbmc7IC8vIFwicmVhZHlcIiwgXCJpbiBwcm9ncmVzc1wiLCBvciBcImRvbmVcIlxyXG4gIHBhdXNlZDpib29sZWFuO1xyXG5cclxuICBzY29yZUNvdW50ZXI6bnVtYmVyO1xyXG5cclxuICAvLyBUaGUgZ2FtZSBzb3VuZHNcclxuICAvLyBzdHJvbmcgdHlwaW5nIGRvZXNuJ3Qgd29yayBvbiB0aGVzZSwgZm9yIHdoYXRldmVyIHJlYXNvblxyXG4gIHNvdW5kU3VjY2VzcztcclxuICBzb3VuZEFkdmFuY2U7XHJcbiAgc291bmRGYWlsdXJlO1xyXG4gIHNvdW5kTWVudUNob2ljZTtcclxuICBzb3VuZFJlc2l6ZTtcclxuICBzb3VuZFNodWZmbGU7XHJcbiAgc291bmRQYXVzZTtcclxuXHJcbiAgY29uc3RydWN0b3Ioc3RhZ2U6UElYSS5Db250YWluZXIpIHtcclxuICAgIHRoaXMuc3RhZ2UgPSBzdGFnZTtcclxuICAgIGxldCBib2FyZERpbXMgPSB7dzo1MDAsIGg6NTAwfSAvLyBpbiBwaXhlbHNcclxuXHJcbiAgICB0aGlzLnRoZUdyaWQgPSBudWxsO1xyXG4gICAgdGhpcy5ib2FyZFNpemUgPSAxNjtcclxuICAgIHRoaXMuX2NyZWF0ZUdyaWQoKTtcclxuXHJcbiAgICAvLyBVZ2gsIGl0IHRvb2sgbWUgYSBsb25nIHRpbWUgdG8gZ2V0IHRoaXMgd29ya2luZy4gVGhlIG1vZHVsZSBjb3VsZG4ndCBiZVxyXG4gICAgLy8gbmFtZWQgXCJIb3dsXCIsIG9yIHRoZSBicm93c2VyIHdvdWxkIHJlamVjdCBpdCAobm8gY29tcGlsZSBlcnJvciEpXHJcbiAgICB0aGlzLnNvdW5kU3VjY2VzcyA9IG5ldyBIT1dMLkhvd2woe3NyYzogJ3NvdW5kcy9zdWNjZXNzLndhdid9KTtcclxuICAgIHRoaXMuc291bmRBZHZhbmNlID0gbmV3IEhPV0wuSG93bCh7c3JjOiAnc291bmRzL2FkdmFuY2Uud2F2Jywgdm9sdW1lOjAuM30pO1xyXG4gICAgdGhpcy5zb3VuZEZhaWx1cmUgPSBuZXcgSE9XTC5Ib3dsKHtzcmM6ICdzb3VuZHMvZmFpbHVyZS53YXYnfSk7XHJcbiAgICB0aGlzLnNvdW5kTWVudUNob2ljZSA9IG5ldyBIT1dMLkhvd2woe3NyYzogJ3NvdW5kcy9tZW51LWNob2ljZS53YXYnfSk7XHJcbiAgICB0aGlzLnNvdW5kUmVzaXplID0gbmV3IEhPV0wuSG93bCh7c3JjOiAnc291bmRzL3Jlc2l6ZS53YXYnfSk7XHJcbiAgICB0aGlzLnNvdW5kU2h1ZmZsZSA9IG5ldyBIT1dMLkhvd2woe3NyYzogJ3NvdW5kcy9zaHVmZmxlLm1wMyd9KTtcclxuICAgIHRoaXMuc291bmRQYXVzZSA9IG5ldyBIT1dMLkhvd2woe3NyYzogJ3NvdW5kcy9wYXVzZS5tcDMnfSk7XHJcblxyXG4gICAgLy8gU2V0IHVwIGluZm8gdGV4dCBhbmQgc2NvcmUgY291bnRlclxyXG4gICAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG5cclxuICAgIC8vIFNvbWUgaGVscGVyIGRhdGEgZm9yIHBvc2l0aW9uaW5nIHRleHQgYW5kIG1lbnUgaXRlbXMgaW4gYSB2ZXJ0aWNhbFxyXG4gICAgLy8gXCJsYXlvdXRcIlxyXG4gICAgbGV0IHRleHRTbG90U2l6ZSA9IDUwO1xyXG4gICAgbGV0IGxheW91dFN0YXJ0UHQgPSB7eDowLCB5OjB9XHJcbiAgICBsYXlvdXRTdGFydFB0LnggPSB0aGlzLnRoZUdyaWQuY29udGFpbmVyLnggKyBib2FyZERpbXMudyArIHRleHRTbG90U2l6ZTtcclxuICAgIGxheW91dFN0YXJ0UHQueSA9IHRoaXMudGhlR3JpZC5jb250YWluZXIueTtcclxuICAgIGxldCBsYXlvdXRFbmRQdCA9IHt4OmxheW91dFN0YXJ0UHQueCwgeTpsYXlvdXRTdGFydFB0LnkgKyBib2FyZERpbXMuaH1cclxuXHJcbiAgICAvLyBjcmVhdGUgYSB0ZXh0IG9iamVjdCB3aXRoIGEgbmljZSBzdHJva2VcclxuICAgIHRoaXMuaW5mb1RleHQgPSBuZXcgUElYSS5UZXh0KCdQbGFjZSBwaWVjZSBvbiBib2FyZCcsIHsgZm9udDogJ2JvbGQgMzZweCBBcmlhbCcsIGZpbGw6ICcjZmZmZjAwJywgYWxpZ246ICdsZWZ0Jywgc3Ryb2tlOiAnIzAwMDBGRicsIHN0cm9rZVRoaWNrbmVzczogNCB9KTtcclxuICAgIHRoaXMuaW5mb1RleHQucG9zaXRpb24ueCA9IGxheW91dFN0YXJ0UHQueDtcclxuICAgIHRoaXMuaW5mb1RleHQucG9zaXRpb24ueSA9IGxheW91dFN0YXJ0UHQueTtcclxuICAgIHN0YWdlLmFkZENoaWxkKHRoaXMuaW5mb1RleHQpO1xyXG5cclxuICAgIHRoaXMuY291bnRlclRleHQgPSBuZXcgUElYSS5UZXh0KCdTY29yZTogMCcsIHsgZm9udDogJ2JvbGQgMjRweCBBcmlhbCcsIGZpbGw6ICcjZmYwMDAwJywgYWxpZ246ICdsZWZ0Jywgc3Ryb2tlOiAnIzc3MjIwMCcsIHN0cm9rZVRoaWNrbmVzczogNCB9KTtcclxuICAgIHRoaXMuY291bnRlclRleHQucG9zaXRpb24ueCA9IGxheW91dFN0YXJ0UHQueDtcclxuICAgIHRoaXMuY291bnRlclRleHQucG9zaXRpb24ueSA9IGxheW91dFN0YXJ0UHQueSArIHRleHRTbG90U2l6ZTtcclxuICAgIHN0YWdlLmFkZENoaWxkKHRoaXMuY291bnRlclRleHQpO1xyXG5cclxuICAgIC8vIFNldCB1cCBzZWxlY3RhYmxlIG1lbnUgaXRlbXNcclxuICAgIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuXHJcbiAgICBsZXQgbWFpblRleHREZXNjID0geyBmb250OiAnYm9sZCAzMHB4IEFyaWFsJywgZmlsbDogJyNmZjAwZmYnLCBhbGlnbjogJ2xlZnQnLCBzdHJva2U6ICcjMDAwMEZGJywgc3Ryb2tlVGhpY2tuZXNzOiA0IH07XHJcbiAgICBsZXQgY3VycmVudEdhbWU6VGhlR2FtZSA9IHRoaXM7XHJcbiAgICB0aGlzLnJlc2V0VGV4dCA9IG5ldyBQSVhJLlRleHQoJ1Jlc2V0JywgbWFpblRleHREZXNjKTtcclxuICAgIHRoaXMucmVzZXRUZXh0LnBvc2l0aW9uLnggPSBsYXlvdXRTdGFydFB0Lng7XHJcbiAgICB0aGlzLnJlc2V0VGV4dC5wb3NpdGlvbi55ID0gbGF5b3V0RW5kUHQueSAtIHRleHRTbG90U2l6ZSAqIDM7XHJcbiAgICBzdGFnZS5hZGRDaGlsZCh0aGlzLnJlc2V0VGV4dCk7XHJcbiAgICB0aGlzLnJlc2V0VGV4dC5idXR0b25Nb2RlID0gdHJ1ZTtcclxuICAgIHRoaXMucmVzZXRUZXh0LmludGVyYWN0aXZlID0gdHJ1ZTtcclxuICAgIHRoaXMucmVzZXRUZXh0Lm9uKCdtb3VzZWRvd24nLCBmdW5jdGlvbigpIHtcclxuICAgICAgY3VycmVudEdhbWUuaGFuZGxlUmVzZXRQcmVzc2VkKCk7XHJcbiAgICB9KTtcclxuICAgIHRoaXMucmVzZXRUZXh0LnZpc2libGUgPSBmYWxzZTtcclxuXHJcbiAgICB0aGlzLnJlc2h1ZmZsZVRleHQgPSBuZXcgUElYSS5UZXh0KCdSZXNodWZmbGUnLCBtYWluVGV4dERlc2MpO1xyXG4gICAgdGhpcy5yZXNodWZmbGVUZXh0LnBvc2l0aW9uLnggPSBsYXlvdXRTdGFydFB0Lng7XHJcbiAgICB0aGlzLnJlc2h1ZmZsZVRleHQucG9zaXRpb24ueSA9IGxheW91dEVuZFB0LnkgLSB0ZXh0U2xvdFNpemUgKiAyO1xyXG4gICAgc3RhZ2UuYWRkQ2hpbGQodGhpcy5yZXNodWZmbGVUZXh0KTtcclxuICAgIHRoaXMucmVzaHVmZmxlVGV4dC5idXR0b25Nb2RlID0gdHJ1ZTtcclxuICAgIHRoaXMucmVzaHVmZmxlVGV4dC5pbnRlcmFjdGl2ZSA9IHRydWU7XHJcbiAgICB0aGlzLnJlc2h1ZmZsZVRleHQub24oJ21vdXNlZG93bicsIGZ1bmN0aW9uKCkge1xyXG4gICAgICBjdXJyZW50R2FtZS5oYW5kbGVSZXNodWZmbGVQcmVzc2VkKCk7XHJcbiAgICB9KTtcclxuXHJcbiAgICB0aGlzLnBhdXNlVGV4dCA9IG5ldyBQSVhJLlRleHQoJ1BhdXNlJywgbWFpblRleHREZXNjKTtcclxuICAgIHRoaXMucGF1c2VUZXh0LnBvc2l0aW9uLnggPSBsYXlvdXRTdGFydFB0Lng7XHJcbiAgICB0aGlzLnBhdXNlVGV4dC5wb3NpdGlvbi55ID0gbGF5b3V0RW5kUHQueSAtIHRleHRTbG90U2l6ZTtcclxuICAgIHN0YWdlLmFkZENoaWxkKHRoaXMucGF1c2VUZXh0KTtcclxuICAgIHRoaXMucGF1c2VUZXh0LmJ1dHRvbk1vZGUgPSB0cnVlO1xyXG4gICAgdGhpcy5wYXVzZVRleHQuaW50ZXJhY3RpdmUgPSB0cnVlO1xyXG4gICAgdGhpcy5wYXVzZVRleHQub24oJ21vdXNlZG93bicsIGZ1bmN0aW9uKCkge1xyXG4gICAgICBjdXJyZW50R2FtZS5oYW5kbGVQYXVzZVByZXNzZWQoKTtcclxuICAgIH0pO1xyXG4gICAgdGhpcy5wYXVzZVRleHQudmlzaWJsZSA9IGZhbHNlO1xyXG5cclxuICAgIHRoaXMucmVzaXplVGV4dCA9IG5ldyBQSVhJLlRleHQoJ0JvYXJkIFNpemU6ICcgKyB0aGlzLmJvYXJkU2l6ZSwgbWFpblRleHREZXNjKTtcclxuICAgIHRoaXMucmVzaXplVGV4dC5wb3NpdGlvbi54ID0gbGF5b3V0U3RhcnRQdC54O1xyXG4gICAgdGhpcy5yZXNpemVUZXh0LnBvc2l0aW9uLnkgPSBsYXlvdXRFbmRQdC55IC0gdGV4dFNsb3RTaXplICogNDtcclxuICAgIHN0YWdlLmFkZENoaWxkKHRoaXMucmVzaXplVGV4dCk7XHJcbiAgICB0aGlzLnJlc2l6ZVRleHQudmlzaWJsZSA9IHRydWU7XHJcblxyXG4gICAgLy8gSGFuZHkgZmFjdG9yeSBmdW5jdGlvblxyXG4gICAgbGV0IG1ha2VCdXR0b24gPSBmdW5jdGlvbihmaWxlbmFtZTpzdHJpbmcpIHtcclxuICAgICAgbGV0IHNwcml0ZTpQSVhJLlNwcml0ZSA9IFBJWEkuU3ByaXRlLmZyb21JbWFnZShmaWxlbmFtZSk7XHJcbiAgICAgIHNwcml0ZS50aW50ID0gMHg4ODg4ODg7XHJcbiAgICAgIHNwcml0ZS53aWR0aCA9IHRleHRTbG90U2l6ZSAqIDAuODtcclxuICAgICAgc3ByaXRlLmhlaWdodCA9IHRleHRTbG90U2l6ZSAqIDAuODtcclxuICAgICAgc3RhZ2UuYWRkQ2hpbGQoc3ByaXRlKTtcclxuICAgICAgc3ByaXRlLmJ1dHRvbk1vZGUgPSB0cnVlO1xyXG4gICAgICBzcHJpdGUuaW50ZXJhY3RpdmUgPSB0cnVlO1xyXG4gICAgICBzcHJpdGUub24oJ21vdXNlb3ZlcicsIGZ1bmN0aW9uKCkge1xyXG4gICAgICAgIHRoaXMudGludCA9IDB4ZmZmZmZmO1xyXG4gICAgICB9KTtcclxuICAgICAgc3ByaXRlLm9uKCdtb3VzZW91dCcsIGZ1bmN0aW9uKCkge1xyXG4gICAgICAgIHRoaXMudGludCA9IDB4ODg4ODg4O1xyXG4gICAgICB9KTtcclxuICAgICAgc3ByaXRlLnZpc2libGUgPSB0cnVlO1xyXG4gICAgICByZXR1cm4gc3ByaXRlO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIEJ1dHRvbiBmb3IgY2hhbmdpbmcgYm9hcmQgc2l6ZVxyXG4gICAgdGhpcy5taW51c1Nwcml0ZSA9IG1ha2VCdXR0b24oJ2ltYWdlcy9taW51cy1pY29uLnBuZycpO1xyXG4gICAgdGhpcy5taW51c1Nwcml0ZS54ID0gdGhpcy5yZXNpemVUZXh0LnggKyB0aGlzLnJlc2l6ZVRleHQud2lkdGggKyAxMDtcclxuICAgIHRoaXMubWludXNTcHJpdGUueSA9IHRoaXMucmVzaXplVGV4dC55O1xyXG4gICAgdGhpcy5taW51c1Nwcml0ZS5vbignbW91c2Vkb3duJywgZnVuY3Rpb24oKSB7XHJcbiAgICAgIGN1cnJlbnRHYW1lLmhhbmRsZVJlc2l6ZVByZXNzZWQoLTEpO1xyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gQnV0dG9uIGZvciBjaGFuZ2luZyBib2FyZCBzaXplXHJcbiAgICB0aGlzLnBsdXNTcHJpdGUgPSBtYWtlQnV0dG9uKCdpbWFnZXMvcGx1cy1pY29uLnBuZycpO1xyXG4gICAgdGhpcy5wbHVzU3ByaXRlLnggPSB0aGlzLm1pbnVzU3ByaXRlLnggKyB0aGlzLm1pbnVzU3ByaXRlLndpZHRoICsgMTA7XHJcbiAgICB0aGlzLnBsdXNTcHJpdGUueSA9IHRoaXMubWludXNTcHJpdGUueTtcclxuICAgIHRoaXMucGx1c1Nwcml0ZS5vbignbW91c2Vkb3duJywgZnVuY3Rpb24oKSB7XHJcbiAgICAgIGN1cnJlbnRHYW1lLmhhbmRsZVJlc2l6ZVByZXNzZWQoMSk7XHJcbiAgICB9KTtcclxuXHJcbiAgICB0aGlzLmNoZWNrZXJDaGFyYWN0ZXIgPSBudWxsO1xyXG4gICAgdGhpcy5jaGVja01hcmtDaGFyYWN0ZXIgPSBudWxsO1xyXG4gICAgLy8gTWFrZSBzdXJlIGNoYXJhY3RlcnMgZXhpc3QgYnkgbm93XHJcbiAgICB0aGlzLl9jcmVhdGVDaGFyYWN0ZXJzKCk7XHJcblxyXG4gICAgdGhpcy5nYW1lU3RhdGUgPSBcInJlYWR5XCI7XHJcbiAgICB0aGlzLnBhdXNlZCA9IGZhbHNlO1xyXG4gICAgdGhpcy5zY29yZUNvdW50ZXIgPSAwO1xyXG4gIH1cclxuXHJcbiAgLy8gTWFpbiB1cGRhdGUgZnVuY3Rpb24uIGRlbHRhVCBpcyBzZWNvbmRzIGVsYXBzZWQgc2luY2UgbGFzdCBjYWxsLlxyXG4gIHVwZGF0ZShkZWx0YVQ6bnVtYmVyKSB7XHJcbiAgICBsZXQgY2hhcmFjdGVyczpHcmlkQ2hhcmFjdGVyW10gPSBbdGhpcy5jaGVja2VyQ2hhcmFjdGVyLCB0aGlzLmNoZWNrTWFya0NoYXJhY3Rlcl07XHJcblxyXG4gICAgaWYgKCF0aGlzLmNoZWNrZXJDaGFyYWN0ZXIpIHtcclxuICAgICAgLy8gbm8gY2hhcmFjdGVycyBleGlzdCB5ZXQsIG5vIHBvaW50IGluIHVwZGF0aW5nXHJcbiAgICAgIHJldHVybjtcclxuICAgIH1cclxuXHJcbiAgICBpZiAodGhpcy5wYXVzZWQpIHtcclxuICAgICAgZm9yIChsZXQgY2hhciBvZiBjaGFyYWN0ZXJzKSB7XHJcbiAgICAgICAgY2hhci51cGRhdGVQYXVzZWQoZGVsdGFUKTtcclxuICAgICAgfVxyXG4gICAgICByZXR1cm47XHJcbiAgICB9XHJcblxyXG4gICAgbGV0IGxlYXZpbmdHcmlkQ2hhcjpHcmlkQ2hhcmFjdGVyID0gbnVsbDsgLy8gdGhlIGNoYXIgbGVhdmluZyB0aGUgZ3JpZCwgaWYgYW55XHJcbiAgICAvLyBJdGVyYXRlIHRocm91Z2ggZ2FtZSBwaWVjZXMsIGNhbGwgdGhlaXIgdXBkYXRlIGZ1bmN0aW9ucywgc2VlIGlmXHJcbiAgICAvLyBhbnkgbXVzdCBiZSBpc3N1ZWQgbmV3IG1vdmUuXHJcbiAgICBmb3IgKGxldCBjaGFyIG9mIGNoYXJhY3RlcnMpIHtcclxuICAgICAgY2hhci51cGRhdGUoZGVsdGFUKTtcclxuICAgICAgaWYgKGNoYXIucmVhZHlUb01vdmUoKSkge1xyXG4gICAgICAgIC8vIEhhcyBjaGFyYWN0ZXIgZmFsbGVuIG9mZiBncmlkP1xyXG4gICAgICAgIGlmIChjaGFyLmNlbGxJbmRleERvd24gPCAwIHx8IGNoYXIuY2VsbEluZGV4RG93biA+PSB0aGlzLnRoZUdyaWQuZGltWSB8fFxyXG4gICAgICAgICAgY2hhci5jZWxsSW5kZXhSaWdodCA8IDAgfHwgY2hhci5jZWxsSW5kZXhSaWdodCA+PSB0aGlzLnRoZUdyaWQuZGltWCkge1xyXG4gICAgICAgICAgbGVhdmluZ0dyaWRDaGFyID0gY2hhcjtcclxuICAgICAgICB9XHJcbiAgICAgICAgZWxzZVxyXG4gICAgICAgIHtcclxuICAgICAgICAgIC8vIENoYXJhY3RlciBpcyBzdGlsbCBvbiBib2FyZFxyXG4gICAgICAgICAgbGV0IGNlbGw6Z3JpZEZpbGUuR3JpZENlbGwgPSB0aGlzLnRoZUdyaWQuZ2V0Q2VsbChjaGFyLmNlbGxJbmRleFJpZ2h0LCBjaGFyLmNlbGxJbmRleERvd24pO1xyXG4gICAgICAgICAgY2VsbC5zZXRWaXNpdGVkKHRydWUpO1xyXG4gICAgICAgICAgY2hhci5yZXF1ZXN0TmV3TW92ZShjZWxsLmRpcmVjdGlvbik7XHJcbiAgICAgICAgICBpZiAoY2hhciA9PSB0aGlzLmNoZWNrTWFya0NoYXJhY3Rlcikge1xyXG4gICAgICAgICAgICAvLyB0aGUgZmFzdGVyLW1vdmluZyBjaGFyYWN0ZXIgYWR2YW5jZXMsIHNvIGluY3JlbWVudCBzY29yZVxyXG4gICAgICAgICAgICB0aGlzLnNjb3JlQ291bnRlciA9IHRoaXMuc2NvcmVDb3VudGVyICsgMTtcclxuICAgICAgICAgICAgdGhpcy5jb3VudGVyVGV4dC50ZXh0ID0gJ1Njb3JlOiAnICsgdGhpcy5zY29yZUNvdW50ZXI7XHJcbiAgICAgICAgICAgIHRoaXMuc291bmRBZHZhbmNlLnBsYXkoKTtcclxuICAgICAgICAgIH1cclxuICAgICAgICAgIGlmIChjaGFyID09IHRoaXMuY2hlY2tlckNoYXJhY3Rlcikge1xyXG4gICAgICAgICAgICAvLyB0aGUgc2xvdy1tb3ZpbmcgY2hhcmFjdGVyIGFkdmFuY2VzXHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICB9IC8vIGVuZCBmb3JcclxuXHJcbiAgICBpZiAobGVhdmluZ0dyaWRDaGFyID09IHRoaXMuY2hlY2tlckNoYXJhY3Rlcikge1xyXG4gICAgICAvLyBzbG93ZXItbW92aW5nIHBpZWNlIGhhcyBsZWZ0IHRoZSBib2FyZFxyXG4gICAgICB0aGlzLmNoZWNrZXJDaGFyYWN0ZXIuc2V0U3RhdGUoXCJmcm96ZW5cIik7XHJcbiAgICB9XHJcbiAgICBpZiAobGVhdmluZ0dyaWRDaGFyID09IHRoaXMuY2hlY2tNYXJrQ2hhcmFjdGVyKSB7XHJcbiAgICAgIC8vIGZhc3Rlci1tb3ZpbmcgcGllY2UgaGFzIGxlZnQgdGhlIGJvYXJkXHJcbiAgICAgIHRoaXMuY2hlY2tNYXJrQ2hhcmFjdGVyLnNldFN0YXRlKFwiZHlpbmdcIik7XHJcbiAgICAgIHRoaXMuY2hlY2tlckNoYXJhY3Rlci5zZXRTdGF0ZShcImZyb3plblwiKTtcclxuICAgICAgdGhpcy5pbmZvVGV4dC50ZXh0ID0gXCJObyBMb29wXCI7XHJcbiAgICAgIHRoaXMuc291bmRGYWlsdXJlLnBsYXkoKTtcclxuICAgICAgdGhpcy5fc2V0R2FtZVN0YXRlKFwiZG9uZVwiKTtcclxuICAgIH1cclxuICAgIC8vIEFyZSBib3RoIHBpZWNlcyBvbiB0aGUgc2FtZSBzcXVhcmU/IElmIHNvLCB0aGUgZmFzdGVyLW1vdmluZyBvbmUgaGFzIGNhdWdodCB1cCB3aXRoXHJcbiAgICAvLyB0aGUgc2xvd2VyLlxyXG4gICAgZWxzZSBpZiAoY2hhcmFjdGVyc1swXS50ZXN0Q29sbGlzaW9uKGNoYXJhY3RlcnNbMV0pKSB7XHJcbiAgICAgICAgLy8gV2UndmUgY2F1Z2h0IHVwXHJcbiAgICAgICAgdGhpcy5jaGVja2VyQ2hhcmFjdGVyLnNldFN0YXRlKFwiZnJvemVuXCIpO1xyXG4gICAgICAgIHRoaXMuY2hlY2tNYXJrQ2hhcmFjdGVyLnNldFN0YXRlKFwiZXhwbG9kZVwiKTtcclxuICAgICAgICB0aGlzLmluZm9UZXh0LnRleHQgPSBcIkxvb3AgRGV0ZWN0ZWQhXCJcclxuICAgICAgICB0aGlzLl9zZXRHYW1lU3RhdGUoXCJkb25lXCIpO1xyXG4gICAgICAgIHRoaXMuc291bmRTdWNjZXNzLnBsYXkoKTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIC8vIENhbGxlZCB3aGVuIHVzZXIgY2xpY2tzIG9uIGFuIGFycm93IGNlbGxcclxuICBoYW5kbGVDZWxsUHJlc3MocGl4WDpudW1iZXIsIHBpeFk6bnVtYmVyKSB7XHJcbiAgICBsZXQgY2VsbFggPSBNYXRoLmZsb29yKHBpeFggLyBHcmlkQ2hhcmFjdGVyLmNlbGxEaW0pO1xyXG4gICAgbGV0IGNlbGxZID0gTWF0aC5mbG9vcihwaXhZIC8gR3JpZENoYXJhY3Rlci5jZWxsRGltKTtcclxuICAgIGNvbnNvbGUubG9nKFwiYnV0dG9uIGNlbGw6IFwiICsgY2VsbFggKyBcIixcIiArIGNlbGxZKTtcclxuICAgIGlmICh0aGlzLmNoZWNrZXJDaGFyYWN0ZXIuZ2V0U3RhdGUoKSA9PSBcImluYWN0aXZlXCIpIHtcclxuICAgICAgdGhpcy5jaGVja2VyQ2hhcmFjdGVyLnNldFBvc2l0aW9uKGNlbGxYLCBjZWxsWSk7XHJcbiAgICAgIHRoaXMuY2hlY2tNYXJrQ2hhcmFjdGVyLnNldFBvc2l0aW9uKGNlbGxYLCBjZWxsWSk7XHJcbiAgICAgIHRoaXMuc291bmRNZW51Q2hvaWNlLnBsYXkoKTtcclxuICAgICAgdGhpcy5fc2V0R2FtZVN0YXRlKFwiaW4gcHJvZ3Jlc3NcIik7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBoYW5kbGVDZWxsT3ZlcihwaXhYOm51bWJlciwgcGl4WTpudW1iZXIpIHtcclxuICAgIGxldCBjZWxsWCA9IE1hdGguZmxvb3IocGl4WCAvIEdyaWRDaGFyYWN0ZXIuY2VsbERpbSk7XHJcbiAgICBsZXQgY2VsbFkgPSBNYXRoLmZsb29yKHBpeFkgLyBHcmlkQ2hhcmFjdGVyLmNlbGxEaW0pO1xyXG4gICAgbGV0IGNlbGw6Z3JpZEZpbGUuR3JpZENlbGwgPSB0aGlzLnRoZUdyaWQuZ2V0Q2VsbChjZWxsWCwgY2VsbFkpO1xyXG4gICAgY2VsbC5zZXRIaWdobGlnaHQodHJ1ZSk7XHJcbiAgfVxyXG5cclxuICBoYW5kbGVDZWxsT3V0KHBpeFg6bnVtYmVyLCBwaXhZOm51bWJlcikge1xyXG4gICAgbGV0IGNlbGxYID0gTWF0aC5mbG9vcihwaXhYIC8gR3JpZENoYXJhY3Rlci5jZWxsRGltKTtcclxuICAgIGxldCBjZWxsWSA9IE1hdGguZmxvb3IocGl4WSAvIEdyaWRDaGFyYWN0ZXIuY2VsbERpbSk7XHJcbiAgICBsZXQgY2VsbDpncmlkRmlsZS5HcmlkQ2VsbCA9IHRoaXMudGhlR3JpZC5nZXRDZWxsKGNlbGxYLCBjZWxsWSk7XHJcbiAgICBjZWxsLnNldEhpZ2hsaWdodChmYWxzZSk7XHJcbiAgfVxyXG5cclxuICBoYW5kbGVSZXNldFByZXNzZWQoKSB7XHJcbiAgICB0aGlzLnRoZUdyaWQucmVzZXRBcnJvd3MoKTtcclxuICAgIHRoaXMuc291bmRNZW51Q2hvaWNlLnBsYXkoKTtcclxuICAgIHRoaXMuX3NldEdhbWVTdGF0ZShcInJlYWR5XCIpO1xyXG4gIH1cclxuXHJcbiAgaGFuZGxlUmVzaHVmZmxlUHJlc3NlZCgpIHtcclxuICAgIHRoaXMudGhlR3JpZC5yZXNodWZmbGVBcnJvd3MoKTtcclxuICAgIHRoaXMuc291bmRTaHVmZmxlLnBsYXkoKTtcclxuICAgIHRoaXMuX3NldEdhbWVTdGF0ZShcInJlYWR5XCIpO1xyXG4gIH1cclxuXHJcbiAgaGFuZGxlUGF1c2VQcmVzc2VkKCkge1xyXG4gICAgbGV0IHBhdXNlZFN0YXRlOmJvb2xlYW4gPSAhdGhpcy5wYXVzZWQ7XHJcblxyXG4gICAgaWYgKHBhdXNlZFN0YXRlKSB7XHJcbiAgICAgIHRoaXMucGF1c2VUZXh0LnRleHQgPSBcIlVucGF1c2VcIjtcclxuICAgIH1cclxuICAgIGVsc2Uge1xyXG4gICAgICB0aGlzLnBhdXNlVGV4dC50ZXh0ID0gXCJQYXVzZVwiO1xyXG4gICAgfVxyXG4gICAgdGhpcy5jaGVja2VyQ2hhcmFjdGVyLnNldFBhdXNlZChwYXVzZWRTdGF0ZSk7XHJcbiAgICB0aGlzLmNoZWNrTWFya0NoYXJhY3Rlci5zZXRQYXVzZWQocGF1c2VkU3RhdGUpO1xyXG4gICAgdGhpcy5zb3VuZFBhdXNlLnBsYXkoKTtcclxuICAgIHRoaXMucGF1c2VkID0gcGF1c2VkU3RhdGU7XHJcbiAgfVxyXG5cclxuICAvLyBDYWxsZWQgd2hlbiB1c2VyIHJlc2l6ZXMgdGhlIGdhbWUgYm9hcmQuIERlc3Ryb3lzIHRoZSBib2FyZCBhbmQgdGhlXHJcbiAgLy8gZ2FtZSBwaWVjZXMsIHRoZW4gcmVjcmVhdGVzIHRoZW0gYXQgbmV3IHNpemUuXHJcbiAgaGFuZGxlUmVzaXplUHJlc3NlZChkaXI6bnVtYmVyKSB7XHJcbiAgICBsZXQgb2xkU2l6ZTpudW1iZXIgPSB0aGlzLmJvYXJkU2l6ZTtcclxuICAgIHRoaXMuYm9hcmRTaXplID0gdGhpcy5ib2FyZFNpemUgKyBkaXI7XHJcbiAgICBpZiAodGhpcy5ib2FyZFNpemUgPCAyKSB7XHJcbiAgICAgIHRoaXMuYm9hcmRTaXplID0gMjtcclxuICAgIH1cclxuICAgIGVsc2UgaWYgKHRoaXMuYm9hcmRTaXplID4gMzIpIHtcclxuICAgICAgdGhpcy5ib2FyZFNpemUgPSAzMjtcclxuICAgIH1cclxuICAgIGlmIChvbGRTaXplID09IHRoaXMuYm9hcmRTaXplKSB7XHJcbiAgICAgIHJldHVybjtcclxuICAgIH1cclxuICAgIHRoaXMuc291bmRSZXNpemUucGxheSgpO1xyXG4gICAgdGhpcy5fZGVzdHJveUNoYXJhY3RlcnMoKTtcclxuICAgIHRoaXMuX2NyZWF0ZUdyaWQoKTtcclxuICAgIHRoaXMuX2NyZWF0ZUNoYXJhY3RlcnMoKTtcclxuICAgIHRoaXMucmVzaXplVGV4dC50ZXh0ID0gJ0JvYXJkIFNpemU6ICcgKyB0aGlzLmJvYXJkU2l6ZTtcclxuICAgIHRoaXMuX3NldEdhbWVTdGF0ZShcInJlYWR5XCIpO1xyXG4gIH1cclxuXHJcbiAgLy8gSGVscGVyIGZ1bmN0aW9uIHRvIGNyZWF0ZSB0aGUgQXJyb3dHcmlkXHJcbiAgcHJpdmF0ZSBfY3JlYXRlR3JpZCgpIHtcclxuICAgIGlmICh0aGlzLnRoZUdyaWQpIHtcclxuICAgICAgdGhpcy50aGVHcmlkLmNsZWFudXAodGhpcy5zdGFnZSk7XHJcbiAgICB9XHJcbiAgICBsZXQgYm9hcmREaW1zID0ge3c6NTAwLCBoOjUwMH0gLy8gaW4gcGl4ZWxzXHJcbiAgICAvLyBUaGUgZGltZW5zaW9ucyBvZiBhIGJvYXJkIGNlbGwgYW5kIGEgZ2FtZSBjaGFyYWN0ZXIgaW4gcGl4ZWxzIG11c3QgYmVcclxuICAgIC8vIHNldC5cclxuICAgIGdyaWRGaWxlLkdyaWRDZWxsLmNlbGxEaW0gPSBNYXRoLmZsb29yKGJvYXJkRGltcy53IC8gdGhpcy5ib2FyZFNpemUpO1xyXG4gICAgR3JpZENoYXJhY3Rlci5jZWxsRGltID0gZ3JpZEZpbGUuR3JpZENlbGwuY2VsbERpbTtcclxuICAgIHRoaXMudGhlR3JpZCA9IG5ldyBncmlkRmlsZS5BcnJvd0dyaWQodGhpcy5ib2FyZFNpemUsIHRoaXMuYm9hcmRTaXplLCB0aGlzLnN0YWdlKTtcclxuICAgIGxldCBnYW1lSW5zdGFuY2U6VGhlR2FtZSA9IHRoaXM7XHJcbiAgICAvLyBTZXQgdXAgaGFuZGxlcnMgc28gdGhhdCBjZWxscyBvbiBib2FyZCB3aWxsIGFjdCBhcyBtb3VzZSBidXR0b25zXHJcbiAgICBsZXQgb25CdXR0b25Eb3duID0gZnVuY3Rpb24oKSB7XHJcbiAgICAgIGdhbWVJbnN0YW5jZS5oYW5kbGVDZWxsUHJlc3ModGhpcy54LCB0aGlzLnkpO1xyXG4gICAgfVxyXG4gICAgbGV0IG9uQnV0dG9uT3ZlciA9IGZ1bmN0aW9uKCkge1xyXG4gICAgICBnYW1lSW5zdGFuY2UuaGFuZGxlQ2VsbE92ZXIodGhpcy54LCB0aGlzLnkpO1xyXG4gICAgfVxyXG4gICAgbGV0IG9uQnV0dG9uT3V0ID0gZnVuY3Rpb24oKSB7XHJcbiAgICAgIGdhbWVJbnN0YW5jZS5oYW5kbGVDZWxsT3V0KHRoaXMueCwgdGhpcy55KTtcclxuICAgIH1cclxuICAgIHRoaXMudGhlR3JpZC5zZXRNb3VzZUZ1bmN0aW9ucyhvbkJ1dHRvbkRvd24sIG9uQnV0dG9uT3Zlciwgb25CdXR0b25PdXQpO1xyXG4gIH1cclxuXHJcbiAgLy8gSGVscGVyIGZ1bmN0aW9uIHRvIGNyZWF0ZSB0aGUgZ2FtZSBjaGFyYWN0ZXJzXHJcbiAgcHJpdmF0ZSBfY3JlYXRlQ2hhcmFjdGVycygpIHtcclxuICAgIGlmICh0aGlzLmNoZWNrZXJDaGFyYWN0ZXIpIHtcclxuICAgICAgLy8gQWxyZWFkeSBleGlzdFxyXG4gICAgICByZXR1cm47XHJcbiAgICB9XHJcbiAgICBHcmlkQ2hhcmFjdGVyLmNlbGxEaW0gPSBncmlkRmlsZS5HcmlkQ2VsbC5jZWxsRGltO1xyXG4gICAgdGhpcy5jaGVja2VyQ2hhcmFjdGVyID0gbmV3IEdyaWRDaGFyYWN0ZXIoJ2ltYWdlcy9yZWQtY2hlY2tlci5wbmcnLCB0aGlzLnRoZUdyaWQuY29udGFpbmVyKTtcclxuICAgIHRoaXMuY2hlY2tlckNoYXJhY3Rlci5tb3ZlVGltZSA9IDAuNTtcclxuICAgIHRoaXMuY2hlY2tNYXJrQ2hhcmFjdGVyID0gbmV3IEdyaWRDaGFyYWN0ZXIoJ2ltYWdlcy9ncmVlbi1jaGVjay1tYXJrLnBuZycsIHRoaXMudGhlR3JpZC5jb250YWluZXIpO1xyXG4gICAgdGhpcy5jaGVja01hcmtDaGFyYWN0ZXIubW92ZVRpbWUgPSAwLjI1O1xyXG4gIH1cclxuXHJcbiAgLy8gSGVscGVyIGZ1bmN0aW9uIHRvIGRlc3Ryb3kgdGhlIGdhbWUgY2hhcmFjdGVycyAoc2hvdWxkIGJlIGRvbmUgYmVmb3JlIGdyaWQgZGVzdHJ1Y3Rpb24pXHJcbiAgcHJpdmF0ZSBfZGVzdHJveUNoYXJhY3RlcnMoKSB7XHJcbiAgICB0aGlzLmNoZWNrZXJDaGFyYWN0ZXIuY2xlYW51cCgpO1xyXG4gICAgdGhpcy5jaGVja2VyQ2hhcmFjdGVyID0gbnVsbDtcclxuICAgIHRoaXMuY2hlY2tNYXJrQ2hhcmFjdGVyLmNsZWFudXAoKTtcclxuICAgIHRoaXMuY2hlY2tNYXJrQ2hhcmFjdGVyID0gbnVsbDtcclxuICB9XHJcblxyXG4gIC8vIFB1dHMgdGhlIGdhbWUgaW50byBvbmUgb2YgaXRzIG92ZXJhbGwgc3RhdGVzLiBBZmZlY3RzIFVJLlxyXG4gIC8vICAgXCJyZWFkeVwiID0gcmVhZHkgdG8gcGxhY2UgYSBwaWVjZVxyXG4gIC8vICAgXCJpbiBwcm9ncmVzc1wiID0gZ2FtZSBpcyBiZWluZyBwbGFjZVxyXG4gIC8vICAgXCJkb25lXCIgPSBnYW1lIGhhcyByZWFjaGVkIGVuZCBzdGF0ZVxyXG4gIHByaXZhdGUgX3NldEdhbWVTdGF0ZShzdGF0ZTpzdHJpbmcpIHtcclxuICAgIGNvbnNvbGUubG9nKCdHYW1lIHN0YXRlIHRvOiAnICsgc3RhdGUpO1xyXG4gICAgaWYgKHN0YXRlID09IFwiaW4gcHJvZ3Jlc3NcIikge1xyXG4gICAgICB0aGlzLmluZm9UZXh0LnRleHQgPSBcIlRyYXZlbGluZy4uLlwiXHJcbiAgICAgIHRoaXMuZ2FtZVN0YXRlID0gXCJpbiBwcm9ncmVzc1wiO1xyXG4gICAgICB0aGlzLnJlc2V0VGV4dC52aXNpYmxlID0gZmFsc2U7XHJcbiAgICAgIHRoaXMucmVzaHVmZmxlVGV4dC52aXNpYmxlID0gZmFsc2U7XHJcbiAgICAgIHRoaXMucmVzaXplVGV4dC52aXNpYmxlID0gZmFsc2U7XHJcbiAgICAgIHRoaXMubWludXNTcHJpdGUudmlzaWJsZSA9IGZhbHNlO1xyXG4gICAgICB0aGlzLnBsdXNTcHJpdGUudmlzaWJsZSA9IGZhbHNlO1xyXG4gICAgICB0aGlzLnBhdXNlVGV4dC52aXNpYmxlID0gdHJ1ZTtcclxuICAgIH1cclxuICAgIGVsc2UgaWYgKHN0YXRlID09IFwicmVhZHlcIikge1xyXG4gICAgICB0aGlzLmNoZWNrZXJDaGFyYWN0ZXIuc2V0U3RhdGUoXCJpbmFjdGl2ZVwiKTtcclxuICAgICAgdGhpcy5jaGVja01hcmtDaGFyYWN0ZXIuc2V0U3RhdGUoXCJpbmFjdGl2ZVwiKTtcclxuICAgICAgdGhpcy5pbmZvVGV4dC50ZXh0ID0gXCJQbGFjZSBwaWVjZSBvbiBib2FyZFwiO1xyXG4gICAgICB0aGlzLnNjb3JlQ291bnRlciA9IDA7XHJcbiAgICAgIHRoaXMuY291bnRlclRleHQudGV4dCA9ICdTY29yZTogJyArIHRoaXMuc2NvcmVDb3VudGVyO1xyXG4gICAgfVxyXG4gICAgZWxzZSBpZiAoc3RhdGUgPT0gXCJkb25lXCIpIHtcclxuICAgICAgdGhpcy5yZXNldFRleHQudmlzaWJsZSA9IHRydWU7XHJcbiAgICAgIHRoaXMucmVzaHVmZmxlVGV4dC52aXNpYmxlID0gdHJ1ZTtcclxuICAgICAgdGhpcy5yZXNpemVUZXh0LnZpc2libGUgPSB0cnVlO1xyXG4gICAgICB0aGlzLm1pbnVzU3ByaXRlLnZpc2libGUgPSB0cnVlO1xyXG4gICAgICB0aGlzLnBsdXNTcHJpdGUudmlzaWJsZSA9IHRydWU7XHJcbiAgICAgIHRoaXMucGF1c2VUZXh0LnZpc2libGUgPSBmYWxzZTtcclxuICAgIH1cclxuICB9XHJcbn1cclxuIiwiaW1wb3J0IFBJWEkgPSByZXF1aXJlKCdwaXhpLmpzJyk7XHJcblxyXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG4vLyBDbGFzcyBkZWZpbml0aW9uc1xyXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG5cclxuLypcclxuICBSZXByZXNlbnRzIGEgY2VsbCBvbiB0aGUgZ2FtZSBib2FyZC4gQSBjZWxsIGNvbnRhaW5zIGFuIGFycm93IFNwcml0ZVxyXG4gIHdoaWNoIHBvaW50cyBpbiBvbmUgb2YgZm91ciBjYXJkaW5hbCBkaXJlY3Rpb25zLiBFYWNoIGNlbGwgYWN0cyBhc1xyXG4gIGEgYnV0dG9uIGFuZCBjYW4gYmUgY2xpY2tlZC5cclxuKi9cclxuZXhwb3J0IGNsYXNzIEdyaWRDZWxsIHtcclxuICBzcHJpdGU6UElYSS5TcHJpdGU7XHJcbiAgc3RhdGljIGNlbGxEaW06bnVtYmVyID0gNTA7IC8vIGRpbWVuc2lvbiBvZiBhIGNlbGwgaW4gcGl4ZWxzXHJcblxyXG4gIC8vIEFycm93J3MgZmFjaW5nIGRpcmVjdGlvbjogMD1sZWZ0LCAxPXVwLCAyPXJpZ2h0LCAzPWRvd25cclxuICBkaXJlY3Rpb246bnVtYmVyO1xyXG4gIGNlbGxYOm51bWJlcjsgLy8gY29vcmRpbmF0ZSBvbiB0aGUgZ2FtZSBib2FyZCwgZnJvbSBsZWZ0XHJcbiAgY2VsbFk6bnVtYmVyOyAvLyBjb29yZGluYXRlIG9uIHRoZSBnYW1lIGJvYXJkLCBmcm9tIHRvcFxyXG4gIHZpc2l0ZWQ6Ym9vbGVhbjsgLy8gaWYgdGhlIGNlbGwgaGFzIGJlZW4gdmlzaXRlZCBieSBnYW1lIHBpZWNlXHJcblxyXG4gIGNvbnN0cnVjdG9yKGk6bnVtYmVyLCBqOm51bWJlciwgY29udGFpbmVyOlBJWEkuQ29udGFpbmVyKSB7XHJcbiAgICB2YXIgYXJyb3cgPSBQSVhJLlNwcml0ZS5mcm9tSW1hZ2UoJ2ltYWdlcy9hcnJvdy1pY29uLnBuZycpO1xyXG4gICAgYXJyb3cueCA9IEdyaWRDZWxsLmNlbGxEaW0gKiAoaSArIDAuNSk7XHJcbiAgICBhcnJvdy55ID0gR3JpZENlbGwuY2VsbERpbSAqIChqICsgMC41KTtcclxuICAgIGFycm93LndpZHRoID0gR3JpZENlbGwuY2VsbERpbTtcclxuICAgIGFycm93LmhlaWdodCA9IEdyaWRDZWxsLmNlbGxEaW07XHJcbiAgICBhcnJvdy5hbmNob3IueCA9IDAuNTtcclxuICAgIGFycm93LmFuY2hvci55ID0gMC41O1xyXG4gICAgY29udGFpbmVyLmFkZENoaWxkKGFycm93KTtcclxuICAgIHRoaXMuY2VsbFggPSBpO1xyXG4gICAgdGhpcy5jZWxsWSA9IGo7XHJcbiAgICB0aGlzLnNwcml0ZSA9IGFycm93O1xyXG4gICAgdGhpcy5kaXJlY3Rpb24gPSAwO1xyXG4gICAgdGhpcy5zZXRWaXNpdGVkKGZhbHNlKTtcclxuICB9XHJcblxyXG4gIC8vIFNldCB1cCB0aGlzIGNlbGwgdG8gYWN0IGFzIGEgYnV0dG9uXHJcbiAgc2V0TW91c2VGdW5jdGlvbnMob25CdXR0b25Eb3duOigpPT52b2lkLCBvbkJ1dHRvbk92ZXI6KCk9PnZvaWQsIG9uQnV0dG9uT3V0OigpPT52b2lkKSB7XHJcbiAgICAgIHRoaXMuc3ByaXRlLmJ1dHRvbk1vZGUgPSB0cnVlO1xyXG4gICAgICB0aGlzLnNwcml0ZS5pbnRlcmFjdGl2ZSA9IHRydWU7XHJcbiAgICAgIHRoaXMuc3ByaXRlLm9uKCdtb3VzZWRvd24nLCBvbkJ1dHRvbkRvd24pO1xyXG4gICAgICB0aGlzLnNwcml0ZS5vbignbW91c2VvdmVyJywgb25CdXR0b25PdmVyKTtcclxuICAgICAgdGhpcy5zcHJpdGUub24oJ21vdXNlb3V0Jywgb25CdXR0b25PdXQpXHJcbiAgfVxyXG5cclxuICAvLyBTZXRzIHRoZSBkaXJlY3Rpb24gb2YgdGhlIGFycm93OiAwPWxlZnQsIDE9dXAsIDI9cmlnaHQsIDM9ZG93blxyXG4gIHNldERpcmVjdGlvbih2YWwpIHtcclxuICAgIGNvbnN0IHBpID0gMy4xNDE1OTI2NTtcclxuICAgIHRoaXMuc3ByaXRlLnJvdGF0aW9uID0gcGkgKiB2YWwgLyAyLjA7XHJcbiAgICB0aGlzLmRpcmVjdGlvbiA9IHZhbDtcclxuICB9XHJcblxyXG4gIC8vIFNldHMgaWYgdGhlIGNlbGwgaGFzIGJlZW4gdmlzaXRlZCBieSBhIGdhbWUgcGllY2VcclxuICBzZXRWaXNpdGVkKHZhbHVlOmJvb2xlYW4pIHtcclxuICAgIGlmICh2YWx1ZSkge1xyXG4gICAgICB0aGlzLnNwcml0ZS50aW50ID0gMHhmZmZmZmY7IC8vIG1ha2UgYnJpZ2h0ZXJcclxuICAgIH1cclxuICAgIGVsc2Uge1xyXG4gICAgICB0aGlzLnNwcml0ZS50aW50ID0gMHhmZjc3YWE7XHJcbiAgICB9XHJcbiAgICB0aGlzLnZpc2l0ZWQgPSB2YWx1ZTtcclxuICB9XHJcblxyXG4gIC8vIElmIHZhbHVlPT10cnVlLCB0ZW1wb3JhcmlseSBoaWdobGlnaHRzIHRoZSBjZWxsXHJcbiAgLy8gSWYgdmFsdWU9PWZhbHNlLCBpdCByZXZlcnRzIHRvIGl0cyBwcmV2aW91cyBjb2xvclxyXG4gIHNldEhpZ2hsaWdodCh2YWx1ZTpib29sZWFuKSB7XHJcbiAgICBsZXQgY3VycmVudFZhbHVlOmJvb2xlYW4gPSB0aGlzLnZpc2l0ZWQ7XHJcbiAgICBpZiAoIXZhbHVlKSB7XHJcbiAgICAgIHZhbHVlID0gY3VycmVudFZhbHVlO1xyXG4gICAgfVxyXG4gICAgdGhpcy5zZXRWaXNpdGVkKHZhbHVlKTtcclxuICAgIHRoaXMudmlzaXRlZCA9IGN1cnJlbnRWYWx1ZTtcclxuICB9XHJcbn1cclxuXHJcbi8qXHJcbiAgLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuICBSZXByZXNlbnRzIHRoZSBlbnRpcmUgZ2FtZSBib2FyZC4gQ29udGFpbnMgYSAyZCBhcnJheSBvZiBHcmljQ2VsbCBvYmplY3RzLlxyXG4gIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcbiovXHJcbmV4cG9ydCBjbGFzcyBBcnJvd0dyaWQge1xyXG4gIGNvbnRhaW5lcjpQSVhJLkNvbnRhaW5lcjtcclxuICBncmlkOkdyaWRDZWxsW11bXTtcclxuICBkaW1YOm51bWJlcjsgLy8gZGltZW5zaW9uIG9mIGdhbWUgYm9hcmQgaW4gY2VsbHNcclxuICBkaW1ZOm51bWJlcjtcclxuXHJcbiAgY29uc3RydWN0b3Iod2lkdGg6bnVtYmVyLCBoZWlnaHQ6bnVtYmVyLCBzdGFnZTpQSVhJLkNvbnRhaW5lcikge1xyXG4gICAgdGhpcy5jb250YWluZXIgPSBuZXcgUElYSS5Db250YWluZXIoKTtcclxuICAgIHN0YWdlLmFkZENoaWxkKHRoaXMuY29udGFpbmVyKTtcclxuICAgIHRoaXMuY29udGFpbmVyLnggPSAxMDA7XHJcbiAgICB0aGlzLmNvbnRhaW5lci55ID0gNjA7XHJcbiAgICB0aGlzLmRpbVggPSB3aWR0aDtcclxuICAgIHRoaXMuZGltWSA9IGhlaWdodDtcclxuICAgIHRoaXMuZ3JpZCA9IFtdO1xyXG4gICAgZm9yICh2YXIgaiA9IDA7IGogPCBoZWlnaHQ7IGorKykge1xyXG4gICAgICB0aGlzLmdyaWRbal0gPSBbXTtcclxuICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCB3aWR0aDsgaSsrKSB7XHJcbiAgICAgICAgbGV0IG5ld0NlbGw6R3JpZENlbGwgPSBuZXcgR3JpZENlbGwoaSwgaiwgdGhpcy5jb250YWluZXIpO1xyXG4gICAgICAgIHRoaXMuZ3JpZFtqXVtpXSA9IG5ld0NlbGw7XHJcbiAgICAgIH07XHJcbiAgICB9XHJcbiAgICB0aGlzLnJlc2h1ZmZsZUFycm93cygpO1xyXG4gIH1cclxuXHJcbiAgLy8gUHJlcGFyZXMgdGhlIGdyaWQgZm9yIHJlbW92YWxcclxuICBjbGVhbnVwKHN0YWdlOlBJWEkuQ29udGFpbmVyKSB7XHJcbiAgICBzdGFnZS5yZW1vdmVDaGlsZCh0aGlzLmNvbnRhaW5lcik7XHJcbiAgICB0aGlzLmNvbnRhaW5lci5kZXN0cm95KCk7XHJcbiAgfVxyXG5cclxuICAvLyBTZXRzIHVwIGVhY2ggY2VsbCB0byBhY3QgYXMgYSBidXR0b24uIFRoZSBnaXZlbiBmdW5jdGlvbnMgcmVzcG9uZCB0byB2YXJpb3VzXHJcbiAgLy8gbW91c2UgZXZlbnRzLlxyXG4gIHNldE1vdXNlRnVuY3Rpb25zKG9uQnV0dG9uRG93bjooKT0+dm9pZCwgb25CdXR0b25PdmVyOigpPT52b2lkLCBvbkJ1dHRvbk91dDooKT0+dm9pZCkge1xyXG4gICAgZm9yICh2YXIgaiA9IDA7IGogPCB0aGlzLmRpbVk7IGorKykge1xyXG4gICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMuZGltWDsgaSsrKSB7XHJcbiAgICAgICAgdGhpcy5ncmlkW2pdW2ldLnNldE1vdXNlRnVuY3Rpb25zKG9uQnV0dG9uRG93biwgb25CdXR0b25PdmVyLCBvbkJ1dHRvbk91dCk7XHJcbiAgICAgIH07XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICAvLyBNYXJrcyBhbGwgY2VsbHMgYXMgdW52aXNpdGVkXHJcbiAgcmVzZXRBcnJvd3MoKSB7XHJcbiAgICBmb3IgKHZhciBqID0gMDsgaiA8IHRoaXMuZGltWTsgaisrKSB7XHJcbiAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5kaW1YOyBpKyspIHtcclxuICAgICAgICB0aGlzLmdyaWRbal1baV0uc2V0VmlzaXRlZChmYWxzZSk7XHJcbiAgICAgIH07XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICAvLyBNYXJrcyBhbGwgY2VsbHMgYXMgdW52aXNpdGVkIGFuZCBjaGFuZ2VzIGFycm93IGRpcmVjdGlvbnNcclxuICByZXNodWZmbGVBcnJvd3MoKSB7XHJcbiAgICBmb3IgKHZhciBqID0gMDsgaiA8IHRoaXMuZGltWTsgaisrKSB7XHJcbiAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5kaW1YOyBpKyspIHtcclxuICAgICAgICB0aGlzLmdyaWRbal1baV0uc2V0VmlzaXRlZChmYWxzZSk7XHJcbiAgICAgICAgLy8gSXQncyBhIGxpdHRsZSBib3JpbmcgdG8gaGF2ZSB0d28gYXJyb3dzIHBvaW50aW5nIGF0IGVhY2ggb3RoZXIsIHNvIHByZXZlbnQgdGhhdFxyXG4gICAgICAgIGxldCBhbGxvd2VkRGlyZWN0aW9uczpib29sZWFuW10gPSBbdHJ1ZSwgdHJ1ZSwgdHJ1ZSwgdHJ1ZSwgZmFsc2VdO1xyXG4gICAgICAgIC8vIElzIHRoZSBvbmUgYWJvdmUgbWUgcG9pbnRpbmcgZG93bj9cclxuICAgICAgICBpZiAoaiA+IDAgJiYgdGhpcy5ncmlkW2otMV1baV0uZGlyZWN0aW9uID09IDMpIHtcclxuICAgICAgICAgIC8vIE5vdCBhbGxvd2VkIHRvIHBvaW50IHN0cmFpZ2h0IHVwXHJcbiAgICAgICAgICBhbGxvd2VkRGlyZWN0aW9uc1sxXSA9IGZhbHNlO1xyXG4gICAgICAgICAgLy9jb25zb2xlLmxvZyhcIkZvcmJpZGRlbiB1cCBhdCBcIiArIGkgKyBcIixcIiArIGopO1xyXG4gICAgICAgIH1cclxuICAgICAgICAvLyBJcyB0aGUgb25lIHRvIG15IGxlZnQgcG9pbnRpbmcgcmlnaHQ/XHJcbiAgICAgICAgaWYgKGkgPiAwICYmIHRoaXMuZ3JpZFtqXVtpLTFdLmRpcmVjdGlvbiA9PSAyKSB7XHJcbiAgICAgICAgICAvLyBOb3QgYWxsb3dlZCB0byBwb2ludCBsZWZ0XHJcbiAgICAgICAgICBhbGxvd2VkRGlyZWN0aW9uc1swXSA9IGZhbHNlO1xyXG4gICAgICAgICAgLy9jb25zb2xlLmxvZyhcIkZvcmJpZGRlbiBsZWZ0IGF0IFwiICsgaSArIFwiLFwiICsgaik7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGxldCBwcm9wb3NlZERpcmVjdGlvbjpudW1iZXIgPSA0OyAvLyBub3QgYSB2YWxpZCBkaXJlY3Rpb24sIHNvIHRoZSBmaXJzdCB0ZXN0IHdpbGwgZmFpbFxyXG4gICAgICAgIHdoaWxlIChhbGxvd2VkRGlyZWN0aW9uc1twcm9wb3NlZERpcmVjdGlvbl0gPT0gZmFsc2UpXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgcHJvcG9zZWREaXJlY3Rpb24gPSBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiA0LjApO1xyXG4gICAgICAgIH1cclxuICAgICAgICB0aGlzLmdyaWRbal1baV0uc2V0RGlyZWN0aW9uKHByb3Bvc2VkRGlyZWN0aW9uKTtcclxuICAgICAgfTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIC8vIFJldHVybnMgcmVmIHRvIGNlbGwgYXQgcGFydGljdWxhciBncmlkIGxvY2F0aW9uXHJcbiAgZ2V0Q2VsbChncmlkWDpudW1iZXIsIGdyaWRZOm51bWJlcikge1xyXG4gICAgcmV0dXJuIHRoaXMuZ3JpZFtncmlkWV1bZ3JpZFhdO1xyXG4gIH1cclxufVxyXG4iLCIvLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vdHlwaW5ncy9pbmRleC5kLnRzXCIgLz5cclxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cImdyaWQudHNcIiAvPlxyXG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiZ2FtZS50c1wiIC8+XHJcblxyXG5pbXBvcnQgZ3JpZEZpbGUgPSByZXF1aXJlKCcuL2dyaWQnKTtcclxuaW1wb3J0IGdhbWVGaWxlID0gcmVxdWlyZSgnLi9nYW1lJyk7IC8vIFwicmVxdWlyZXMgZ2FtZVwiLCBoYVxyXG5pbXBvcnQgUElYSSA9IHJlcXVpcmUoJ3BpeGkuanMnKTtcclxuaW1wb3J0IEhvd2xlciA9IHJlcXVpcmUoJ2hvd2xlcicpO1xyXG5jb25zdCByZW5kZXJlcjpQSVhJLldlYkdMUmVuZGVyZXIgPSBuZXcgUElYSS5XZWJHTFJlbmRlcmVyKDEyODAsIDcyMCk7XHJcbmRvY3VtZW50LmJvZHkuYXBwZW5kQ2hpbGQocmVuZGVyZXIudmlldyk7XHJcblxyXG5sZXQgY2VsbERpbTpudW1iZXIgPSA1MDtcclxuXHJcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcbi8vIEdsb2JhbCB2YXJzIGFuZCBiYXNpYyBzZXR1cFxyXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG5cclxuLy8gR3JhcGhpY2FsIGNvbnRhaW5lclxyXG5cclxuLy8gY3JlYXRlIHRoZSByb290IG9mIHRoZSBzY2VuZSBncmFwaFxyXG52YXIgc3RhZ2UgPSBuZXcgUElYSS5Db250YWluZXIoKTtcclxuXHJcbmxldCBnYW1lSW5zdGFuY2U6Z2FtZUZpbGUuVGhlR2FtZTtcclxuXHJcbmRvU2V0dXAoKTtcclxuXHJcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcbi8vIEZ1bmN0aW9uIGRlZmluaXRpb25zXHJcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcblxyXG5mdW5jdGlvbiB1cGRhdGUoKSB7XHJcbiAgICBnYW1lSW5zdGFuY2UudXBkYXRlKDAuMDEpOyAvLyBhZHZhbmNlIGNsb2NrIGJ5IDEvMTAwdGggb2YgYSBzZWNvbmRcclxufVxyXG5cclxuZnVuY3Rpb24gZG9TZXR1cCgpIHtcclxuICAvL2NyZWF0ZUdyaWQoKTtcclxuICBjb25zb2xlLmxvZyhcIlRlc3RcIik7XHJcbiAgZ2FtZUluc3RhbmNlID0gbmV3IGdhbWVGaWxlLlRoZUdhbWUoc3RhZ2UpO1xyXG4gIC8vIEEgZnVuY3Rpb24gdGhhdCB1cGRhdGVzIGEgaHVuZHJlZCB0aW1lcyBhIHNlY29uZFxyXG4gIHNldEludGVydmFsKHVwZGF0ZSwgMTApO1xyXG4gIGFuaW1hdGUoKTtcclxufVxyXG5cclxuZnVuY3Rpb24gYW5pbWF0ZSgpIHtcclxuXHJcbiAgICByZXF1ZXN0QW5pbWF0aW9uRnJhbWUoYW5pbWF0ZSk7XHJcblxyXG4gICAgLy8gcmVuZGVyIHRoZSByb290IGNvbnRhaW5lclxyXG4gICAgcmVuZGVyZXIucmVuZGVyKHN0YWdlKTtcclxufVxyXG4iXX0=
