(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.jiboProgrammingChallenge = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvZ2FtZS50cyIsInNyYy9ncmlkLnRzIiwic3JjL2luZGV4LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOztBQ0FBLElBQU8sUUFBUSxXQUFXLFFBQVEsQ0FBQyxDQUFDO0FBQ3BDLElBQU8sSUFBSSxXQUFXLFNBQVMsQ0FBQyxDQUFDO0FBQ2pDLElBQU8sSUFBSSxXQUFXLFFBQVEsQ0FBQyxDQUFDO0FBRWhDOzs7Ozs7RUFNRTtBQUNGO0lBdUJFLHVCQUFZLElBQVcsRUFBRSxTQUF3QjtRQUMvQyxJQUFJLENBQUMsU0FBUyxHQUFHLFNBQVMsQ0FBQztRQUMzQixJQUFJLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQzFDLGFBQWEsQ0FBQyxPQUFPLEdBQUcsUUFBUSxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUM7UUFDbEQsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLEdBQUcsYUFBYSxDQUFDLE9BQU8sQ0FBQztRQUMxQyxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sR0FBRyxhQUFhLENBQUMsT0FBTyxDQUFDO1FBQzNDLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsR0FBRyxHQUFHLENBQUM7UUFDM0IsSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBQztRQUMzQixJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssR0FBRyxDQUFDLENBQUM7UUFDdEIsU0FBUyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7UUFFaEMsSUFBSSxDQUFDLFlBQVksR0FBRyxDQUFDLENBQUM7UUFDdEIsSUFBSSxDQUFDLFlBQVksR0FBRyxDQUFDLENBQUM7UUFDdEIsSUFBSSxDQUFDLFFBQVEsR0FBRyxL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IihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiaW1wb3J0IGdyaWRGaWxlID0gcmVxdWlyZSgnLi9ncmlkJyk7XHJcbmltcG9ydCBQSVhJID0gcmVxdWlyZSgncGl4aS5qcycpO1xyXG5pbXBvcnQgSE9XTCA9IHJlcXVpcmUoJ2hvd2xlcicpO1xyXG5cclxuLypcclxuICAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG4gIFJlcHJlc2VudHMgYSBnYW1lIHBpZWNlLiBBIHBpZWNlIGNhbiBvY2N1cHkgYSBjZWxsIGFuZCB0cmFuc2l0aW9uIGluIGFcclxuICB2aWRlb2dhbWUteSBtYW5uZXIgYmV0d2VlbiBjZWxscy4gSXQgYWxzbyBoYXMgYSBzdGF0ZSBtYWNoaW5lIGFuZFxyXG4gIGNhbiBwZXJmb3JtIHNldmVyYWwgYW5pbWF0aW9uIHNlcXVlbmNlcy5cclxuICAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG4qL1xyXG5leHBvcnQgY2xhc3MgR3JpZENoYXJhY3RlciB7XHJcbiAgY29udGFpbmVyOlBJWEkuQ29udGFpbmVyO1xyXG4gIHNwcml0ZTpQSVhJLlNwcml0ZTtcclxuICBzdGF0aWMgY2VsbERpbTpudW1iZXI7IC8vIERpbWVuc2lvbnMgb2YgYSBjZWxsIGluIHBpeGVsc1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgLy8gKGNoYW5nZXMgYWZ0ZXIgYm9hcmQgcmVzaXplKVxyXG5cclxuICBjZWxsSW5kZXhSaWdodDpudW1iZXI7IC8vIGJvYXJkIGNvb3JkaW5hdGVcclxuICBjZWxsSW5kZXhEb3duOm51bWJlcjtcclxuICB4TW92ZW1lbnREaXI6bnVtYmVyOyAvLyBkaXJlY3Rpb24gb2YgY3VycmVudCBtb3ZlbWVudCwgKC0xID0gbGVmdCwgMSA9IHJpZ2h0KVxyXG4gIHlNb3ZlbWVudERpcjpudW1iZXI7IC8vIGRpcmVjdGlvbiBvZiBjdXJyZW50IG1vdmVtZW50LCAoLTEgPSB1cCwgMSA9IGRvd24pXHJcblxyXG4gIHNsaWRlVmFsdWU6bnVtYmVyOyAvLyBob3cgZmFyIHRoZSBwaWVjZSBoYXMgc2xpZCBhd2F5IGZyb20gY3VycmVudCBjZWxsXHJcbiAgICAgICAgICAgICAgICAgICAgIC8vIDAgdG8gMVxyXG4gIGVmZmVjdFNsaWRlcjpudW1iZXI7IC8vIFVzZWQgZm9yIHRoZSBhbmltYXRpb24gb2YgZWZmZWN0c1xyXG4gIHJlc3RUaW1lcjpudW1iZXI7ICAvLyB0aGUgcGllY2UgXCJyZXN0c1wiIGZvciBhIGJpdCBhZnRlciBhcnJpdmluZ1xyXG4gIG1vdmVUaW1lOm51bWJlcjsgLy8gaG93IG1hbnkgc2Vjb25kcyBhIG1vdmUgb3IgcmVzdCBwZXJpb2QgdGFrZXNcclxuXHJcbiAgb25Jbml0aWFsQ2VsbDpib29sZWFuOyAvLyB0cnVlIGlzIHBpZWNlIGlzIHN0aWxsIG9uIGZpcnN0IGNlbGxcclxuICBpc01vdmluZzpib29sZWFuOyAvLyB0cnVlIGlmIHBpZWNlIGlzIHZpc3VhbGx5IG1vdmluZ1xyXG4gIHBhdXNlZDpib29sZWFuOyAvLyB0cnVlIGlmIHBpZWNlIGlzIGluIGEgcGF1c2VkIHN0YXRlLCBzaW1pbGFyIHRvIGdhbWUgY2hhcmFjdGVyXHJcblxyXG4gIHByaXZhdGUgX3N0YXRlOnN0cmluZztcclxuXHJcbiAgY29uc3RydWN0b3IobmFtZTpzdHJpbmcsIGNvbnRhaW5lcjpQSVhJLkNvbnRhaW5lcikge1xyXG4gICAgdGhpcy5jb250YWluZXIgPSBjb250YWluZXI7XHJcbiAgICB0aGlzLnNwcml0ZSA9IFBJWEkuU3ByaXRlLmZyb21JbWFnZShuYW1lKTtcclxuICAgIEdyaWRDaGFyYWN0ZXIuY2VsbERpbSA9IGdyaWRGaWxlLkdyaWRDZWxsLmNlbGxEaW07XHJcbiAgICB0aGlzLnNwcml0ZS53aWR0aCA9IEdyaWRDaGFyYWN0ZXIuY2VsbERpbTtcclxuICAgIHRoaXMuc3ByaXRlLmhlaWdodCA9IEdyaWRDaGFyYWN0ZXIuY2VsbERpbTtcclxuICAgIHRoaXMuc3ByaXRlLmFuY2hvci54ID0gMC41O1xyXG4gICAgdGhpcy5zcHJpdGUuYW5jaG9yLnkgPSAwLjU7XHJcbiAgICB0aGlzLnNwcml0ZS5hbHBoYSA9IDA7XHJcbiAgICBjb250YWluZXIuYWRkQ2hpbGQodGhpcy5zcHJpdGUpO1xyXG5cclxuICAgIHRoaXMueE1vdmVtZW50RGlyID0gMDtcclxuICAgIHRoaXMueU1vdmVtZW50RGlyID0gMDtcclxuICAgIHRoaXMuaXNNb3ZpbmcgPSBmYWxzZTtcclxuICAgIHRoaXMucGF1c2VkID0gZmFsc2U7XHJcbiAgICB0aGlzLnJlc3RUaW1lciA9IDA7XHJcbiAgICB0aGlzLm1vdmVUaW1lID0gMS4wO1xyXG4gICAgdGhpcy5fc3RhdGUgPSBcImluYWN0aXZlXCI7XHJcbiAgfVxyXG5cclxuICAvLyBQcmVwYXJlcyBwaWVjZSBmb3IgZGVzdHJ1Y3Rpb25cclxuICBjbGVhbnVwKCkge1xyXG4gICAgdGhpcy5jb250YWluZXIucmVtb3ZlQ2hpbGQodGhpcy5zcHJpdGUpO1xyXG4gICAgdGhpcy5zcHJpdGUuZGVzdHJveSgpO1xyXG4gIH1cclxuXHJcbiAgLy8gSW5zdGFudGx5IHBvc2l0aW9ucyB0aGUgcGllY2UgYXQgaXRzIHN0YXJ0IHBvc2l0aW9uXHJcbiAgc2V0UG9zaXRpb24oaTpudW1iZXIsIGo6bnVtYmVyKSB7XHJcbiAgICB0aGlzLnNwcml0ZS54ID0gR3JpZENoYXJhY3Rlci5jZWxsRGltICogKGkgKyAwLjUpO1xyXG4gICAgdGhpcy5zcHJpdGUueSA9IEdyaWRDaGFyYWN0ZXIuY2VsbERpbSAqIChqICsgMC41KTtcclxuICAgIHRoaXMuc3ByaXRlLndpZHRoID0gR3JpZENoYXJhY3Rlci5jZWxsRGltO1xyXG4gICAgdGhpcy5zcHJpdGUuaGVpZ2h0ID0gR3JpZENoYXJhY3Rlci5jZWxsRGltO1xyXG4gICAgdGhpcy5zcHJpdGUuYWxwaGEgPSAxO1xyXG4gICAgdGhpcy5jZWxsSW5kZXhEb3duID0gajtcclxuICAgIHRoaXMuY2VsbEluZGV4UmlnaHQgPSBpO1xyXG4gICAgdGhpcy5vbkluaXRpYWxDZWxsID0gdHJ1ZTtcclxuICAgIHRoaXMucGF1c2VkID0gZmFsc2U7XHJcbiAgICB0aGlzLmlzTW92aW5nID0gZmFsc2U7XHJcbiAgICB0aGlzLnNsaWRlVmFsdWUgPSAwO1xyXG4gICAgdGhpcy5yZXN0VGltZXIgPSB0aGlzLm1vdmVUaW1lOyAvLyBsZXQgaXQgcmVzdCBiZWZvcmUgc3RhcnRpbmcgbW92ZVxyXG4gICAgdGhpcy5fc3RhdGUgPSBcImFjdGl2ZVwiO1xyXG4gIH1cclxuXHJcbiAgLy8gUmV0dXJucyB0cnVlIGlmIGNoYXJhY3RlciBjYW4gYmUgaXNzdWVkIGEgbmV3IG1vdmVcclxuICByZWFkeVRvTW92ZSgpIHtcclxuICAgIGlmICh0aGlzLl9zdGF0ZSAhPSBcImFjdGl2ZVwiKSB7XHJcbiAgICAgIHJldHVybiBmYWxzZTtcclxuICAgIH1cclxuICAgIHJldHVybiAoIXRoaXMuaXNNb3ZpbmcgJiYgdGhpcy5yZXN0VGltZXIgPT0gMCk7XHJcbiAgfVxyXG5cclxuICAvLyBSZXR1cm5zIHRydWUgaWYgdGhpcyBjaGFyYWN0ZXIgYW5kIHRoZSBvdGhlciBoYXZlIGNhdWdodCB1cCB0byBlYWNoIG90aGVyXHJcbiAgdGVzdENvbGxpc2lvbihvdGhlcjpHcmlkQ2hhcmFjdGVyKSB7XHJcbiAgICBpZiAodGhpcy5vbkluaXRpYWxDZWxsIHx8IG90aGVyLm9uSW5pdGlhbENlbGwgfHwgdGhpcy5fc3RhdGUgIT0gXCJhY3RpdmVcIikge1xyXG4gICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICB9XHJcbiAgICBpZiAodGhpcy5jZWxsSW5kZXhEb3duID09IG90aGVyLmNlbGxJbmRleERvd24gJiZcclxuICAgICAgdGhpcy5jZWxsSW5kZXhSaWdodCA9PSBvdGhlci5jZWxsSW5kZXhSaWdodCkge1xyXG4gICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gZmFsc2U7XHJcbiAgfVxyXG5cclxuICAvLyBUZWxscyB0aGUgcGllY2UgdG8gYmVnaW4gbW92aW5nIGluIHRoZSBnaXZlbiBkaXJlY3Rpb25cclxuICAvLyBTZWUgR3JpZENlbGwgZm9yIGRpcmVjdGlvbiB2YWx1ZXMuXHJcbiAgcmVxdWVzdE5ld01vdmUoZGlyZWN0aW9uKSB7XHJcbiAgICBpZiAodGhpcy5fc3RhdGUgIT0gXCJhY3RpdmVcIikge1xyXG4gICAgICByZXR1cm47XHJcbiAgICB9XHJcbiAgICBpZiAodGhpcy5pc01vdmluZykge1xyXG4gICAgICByZXR1cm47IC8vIGNhbid0IGNoYW5nZSB3aGlsZSBhbHJlYWR5IG1vdmluZ1xyXG4gICAgfVxyXG4gICAgaWYgKGRpcmVjdGlvbiA9PSAwKSAvLyBsZWZ0XHJcbiAgICB7XHJcbiAgICAgIHRoaXMueE1vdmVtZW50RGlyID0gLTEuMDtcclxuICAgICAgdGhpcy55TW92ZW1lbnREaXIgPSAgMC4wO1xyXG4gICAgfVxyXG4gICAgZWxzZSBpZiAoZGlyZWN0aW9uID09IDEpIC8vIHVwXHJcbiAgICB7XHJcbiAgICAgIHRoaXMueE1vdmVtZW50RGlyID0gIDAuMDtcclxuICAgICAgdGhpcy55TW92ZW1lbnREaXIgPSAtMS4wO1xyXG4gICAgfVxyXG4gICAgZWxzZSBpZiAoZGlyZWN0aW9uID09IDIpIC8vIHJpZ2h0XHJcbiAgICB7XHJcbiAgICAgIHRoaXMueE1vdmVtZW50RGlyID0gIDEuMDtcclxuICAgICAgdGhpcy55TW92ZW1lbnREaXIgPSAgMC4wO1xyXG4gICAgfVxyXG4gICAgZWxzZSAgLy8gZG93blxyXG4gICAge1xyXG4gICAgICB0aGlzLnhNb3ZlbWVudERpciA9ICAwLjA7XHJcbiAgICAgIHRoaXMueU1vdmVtZW50RGlyID0gIDEuMDtcclxuICAgIH1cclxuICAgIHRoaXMuc2xpZGVWYWx1ZSA9IDA7XHJcbiAgICB0aGlzLmlzTW92aW5nID0gdHJ1ZTtcclxuICB9XHJcblxyXG4gIC8vIFB1dHMgdGhlIHBpZWNlIGluIGEgbmV3IGFuaW1hdGlvbiBzdGF0ZVxyXG4gIC8vIChJIHdhcyBnb2luZyB0byB1c2UgYSB0eXBlc2NyaXB0IGFjY2Vzc29yLCBidXQgbm90IHN1cHBvcnRlZCBieSB0aGlzIGNvbXBpbGVyKVxyXG4gIHNldFN0YXRlKHN0YXRlOnN0cmluZykge1xyXG4gICAgaWYgKHRoaXMuX3N0YXRlID09IHN0YXRlIHx8IHRoaXMuX3N0YXRlID09IFwiaW5hY3RpdmVcIikge1xyXG4gICAgICAvLyBOb3RoaW5nIGhhcHBlbnMgaWYgd2UncmUgYWxyZWFkeSBpbiByZXF1ZXN0ZWQgc3RhdGUgb3IgaWYgY2hhcmFjdGVyXHJcbiAgICAgIC8vIGlzIGluYWN0aXZlXHJcbiAgICAgIHJldHVybjtcclxuICAgIH1cclxuICAgIGNvbnNvbGUubG9nKFwic3RhdGUgdG8gXCIgKyBzdGF0ZSk7XHJcbiAgICB0aGlzLl9zdGF0ZSA9IHN0YXRlO1xyXG4gICAgaWYgKHN0YXRlID09IFwiZnJvemVuXCIpIHtcclxuICAgICAgdGhpcy5lZmZlY3RTbGlkZXIgPSAwO1xyXG4gICAgfVxyXG4gICAgZWxzZSBpZiAoc3RhdGUgPT0gXCJkeWluZ1wiKSB7XHJcbiAgICAgIHRoaXMuZWZmZWN0U2xpZGVyID0gMTtcclxuICAgIH1cclxuICAgIGVsc2UgaWYgKHN0YXRlID09IFwiZXhwbG9kZVwiKSB7XHJcbiAgICAgIHRoaXMuZWZmZWN0U2xpZGVyID0gMTtcclxuICAgIH1cclxuICAgIGVsc2UgaWYgKHN0YXRlID09IFwiaW5hY3RpdmVcIikge1xyXG4gICAgICB0aGlzLnNwcml0ZS5hbHBoYSA9IDA7XHJcbiAgICAgIHRoaXMuaXNNb3ZpbmcgPSBmYWxzZTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIC8vIEFjY2Vzc29ycyBhbmQgc2V0dGVycyBhcmUgZ29vZCA6KVxyXG4gIGdldFN0YXRlKCkge1xyXG4gICAgcmV0dXJuIHRoaXMuX3N0YXRlO1xyXG4gIH1cclxuXHJcbiAgLy8gVXBkYXRlIGZ1bmN0aW9uIGNhbGxlZCBwZXJpb2RpY2FsbHkuIGRlbHRhVCBpcyB0aW1lIGluIHNlY29uZHMgc2luY2UgbGFzdFxyXG4gIC8vIGNhbGwuXHJcbiAgdXBkYXRlKGRlbHRhVCkge1xyXG4gICAgaWYgKHRoaXMuX3N0YXRlID09IFwiYWN0aXZlXCIpIHtcclxuICAgICAgdGhpcy5zcHJpdGUueCA9IEdyaWRDaGFyYWN0ZXIuY2VsbERpbSAqICh0aGlzLmNlbGxJbmRleFJpZ2h0ICsgMC41ICsgdGhpcy54TW92ZW1lbnREaXIgKiB0aGlzLnNsaWRlVmFsdWUpO1xyXG4gICAgICB0aGlzLnNwcml0ZS55ID0gR3JpZENoYXJhY3Rlci5jZWxsRGltICogKHRoaXMuY2VsbEluZGV4RG93biArIDAuNSArIHRoaXMueU1vdmVtZW50RGlyICogdGhpcy5zbGlkZVZhbHVlKTtcclxuICAgICAgaWYgKHRoaXMuaXNNb3ZpbmcpIHtcclxuICAgICAgICAvLyBpdCB0YWtlcyBtb3ZlVGltZSBzZWNvbmRzIHRvIG1vdmUgb25lIHNxdWFyZVxyXG4gICAgICAgIHRoaXMuc2xpZGVWYWx1ZSA9IHRoaXMuc2xpZGVWYWx1ZSArIGRlbHRhVCAvIHRoaXMubW92ZVRpbWU7XHJcbiAgICAgICAgaWYgKHRoaXMuc2xpZGVWYWx1ZSA+IDEuMClcclxuICAgICAgICB7XHJcbiAgICAgICAgICAvLyBXZSd2ZSBhcnJpdmVkXHJcbiAgICAgICAgICB0aGlzLmNlbGxJbmRleFJpZ2h0ID0gdGhpcy5jZWxsSW5kZXhSaWdodCArIHRoaXMueE1vdmVtZW50RGlyO1xyXG4gICAgICAgICAgdGhpcy5jZWxsSW5kZXhEb3duID0gdGhpcy5jZWxsSW5kZXhEb3duICsgdGhpcy55TW92ZW1lbnREaXI7XHJcbiAgICAgICAgICB0aGlzLnNsaWRlVmFsdWUgPSAwO1xyXG4gICAgICAgICAgdGhpcy54TW92ZW1lbnREaXIgPSAwLjA7XHJcbiAgICAgICAgICB0aGlzLnlNb3ZlbWVudERpciA9IDAuMDtcclxuICAgICAgICAgIHRoaXMuaXNNb3ZpbmcgPSBmYWxzZTtcclxuICAgICAgICAgIHRoaXMub25Jbml0aWFsQ2VsbCA9IGZhbHNlO1xyXG4gICAgICAgICAgdGhpcy5yZXN0VGltZXIgPSB0aGlzLm1vdmVUaW1lO1xyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgICBlbHNlIGlmICh0aGlzLnJlc3RUaW1lciA+IDApXHJcbiAgICAgIHtcclxuICAgICAgICAvLyBQaWVjZSBpcyByZXN0aW5nIGFmdGVyIGNvbXBsZXRpbmcgbW92ZVxyXG4gICAgICAgIHRoaXMucmVzdFRpbWVyID0gdGhpcy5yZXN0VGltZXIgLSBkZWx0YVQ7XHJcbiAgICAgICAgaWYgKHRoaXMucmVzdFRpbWVyIDwgMCkge1xyXG4gICAgICAgICAgdGhpcy5yZXN0VGltZXIgPSAwO1xyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgfSAvLyBlbmQgaWYgYWN0aXZlIHN0YXRlXHJcbiAgICBlbHNlIGlmICh0aGlzLl9zdGF0ZSA9PSBcImZyb3plblwiKSB7XHJcbiAgICAgIC8vIHNpbmUgd2F2ZSBhbHBoYSBlZmZlY3RcclxuICAgICAgdGhpcy5zcHJpdGUuYWxwaGEgPSAwLjUgKyAwLjUgKiBNYXRoLmNvcyh0aGlzLmVmZmVjdFNsaWRlcik7XHJcbiAgICAgIHRoaXMuZWZmZWN0U2xpZGVyID0gdGhpcy5lZmZlY3RTbGlkZXIgKyBkZWx0YVQgKiA0O1xyXG4gICAgfVxyXG4gICAgZWxzZSBpZiAodGhpcy5fc3RhdGUgPT0gXCJkeWluZ1wiKSB7XHJcbiAgICAgIC8vIGZhZGUgYW5kIHNocmluayBlZmZlY3RcclxuICAgICAgdGhpcy5zcHJpdGUuYWxwaGEgPSB0aGlzLmVmZmVjdFNsaWRlcjtcclxuICAgICAgdGhpcy5zcHJpdGUud2lkdGggPSBHcmlkQ2hhcmFjdGVyLmNlbGxEaW0gKiAoMC41ICsgdGhpcy5lZmZlY3RTbGlkZXIgLyAyKTtcclxuICAgICAgdGhpcy5zcHJpdGUuaGVpZ2h0ID0gR3JpZENoYXJhY3Rlci5jZWxsRGltICogKDAuNSArIHRoaXMuZWZmZWN0U2xpZGVyIC8gMik7XHJcbiAgICAgIHRoaXMuZWZmZWN0U2xpZGVyID0gdGhpcy5lZmZlY3RTbGlkZXIgLSBkZWx0YVQgLyAodGhpcy5tb3ZlVGltZSAqIDQuMCk7XHJcbiAgICAgIGlmICh0aGlzLmVmZmVjdFNsaWRlciA8PSAwLjApIHtcclxuICAgICAgICB0aGlzLnNldFN0YXRlKFwiaW5hY3RpdmVcIik7XHJcbiAgICAgIH1cclxuICAgIH1cclxuICAgIGVsc2UgaWYgKHRoaXMuX3N0YXRlID09IFwiZXhwbG9kZVwiKSB7XHJcbiAgICAgIC8vIGJ1cnN0IGFuZCBmYWRlIGVmZmVjdFxyXG4gICAgICB0aGlzLnNwcml0ZS5hbHBoYSA9IHRoaXMuZWZmZWN0U2xpZGVyO1xyXG4gICAgICB0aGlzLnNwcml0ZS53aWR0aCA9IEdyaWRDaGFyYWN0ZXIuY2VsbERpbSAqICgxLjAgKyAoMy4wIC0gdGhpcy5lZmZlY3RTbGlkZXIgKiAzLjApKTtcclxuICAgICAgdGhpcy5zcHJpdGUuaGVpZ2h0ID0gR3JpZENoYXJhY3Rlci5jZWxsRGltICogKDEuMCArICgzLjAgLSB0aGlzLmVmZmVjdFNsaWRlciAqIDMuMCkpO1xyXG4gICAgICB0aGlzLmVmZmVjdFNsaWRlciA9IHRoaXMuZWZmZWN0U2xpZGVyIC0gZGVsdGFUIC8gKHRoaXMubW92ZVRpbWUgKiA0LjApO1xyXG4gICAgICBpZiAodGhpcy5lZmZlY3RTbGlkZXIgPD0gMC4wKSB7XHJcbiAgICAgICAgdGhpcy5lZmZlY3RTbGlkZXIgPSAxOyAvLyBrZWVwIGV4cGxvZGluZyBmb3JldmVyXHJcbiAgICAgIH1cclxuICAgIH1cclxuICB9XHJcblxyXG4gIC8vIFB1dHMgdGhpcyBjaGFyYWN0ZXIgaW50byBvciBvdXQgb2YgcGF1c2VkIHN0YXRlXHJcbiAgc2V0UGF1c2VkKHZhbDpib29sZWFuKSB7XHJcbiAgICBpZiAodGhpcy5wYXVzZWQgPT0gdmFsKSB7XHJcbiAgICAgIHJldHVybjtcclxuICAgIH1cclxuXHJcbiAgICB0aGlzLnBhdXNlZCA9IHZhbDtcclxuICAgIGlmICh2YWwpIHtcclxuICAgICAgdGhpcy5lZmZlY3RTbGlkZXIgPSAwO1xyXG4gICAgfVxyXG4gICAgZWxzZSB7XHJcbiAgICAgIHRoaXMuc3ByaXRlLmFscGhhID0gMTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIC8vIFVwZGF0ZSBmdW5jdGlvbiBjYWxsZWQgd2hpbGUgY2hhcmFjdGVyIGlzIHBhdXNlZFxyXG4gIHVwZGF0ZVBhdXNlZChkZWx0YVQpIHtcclxuICAgIC8vIHNpbmUgd2F2ZSBhbHBoYSBlZmZlY3RcclxuICAgIHRoaXMuc3ByaXRlLmFscGhhID0gMC41ICsgMC41ICogTWF0aC5jb3ModGhpcy5lZmZlY3RTbGlkZXIpO1xyXG4gICAgdGhpcy5lZmZlY3RTbGlkZXIgPSB0aGlzLmVmZmVjdFNsaWRlciArIGRlbHRhVCAqIDQ7XHJcbiAgfVxyXG59XHJcblxyXG4vKlxyXG4gIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcbiAgUmVwcmVzZW50cyB0aGUgZ2FtZSBhdCB0aGUgaGlnaGVzdCBsZXZlbC4gTWFuYWdlcyBVSSBmZWF0dXJlcywgYW4gQXJyb3dHcmlkXHJcbiAgaW5zdGFuY2UsIGFuZCB0aGUgZ2FtZSBwaWVjZXMuXHJcbiAgLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuKi9cclxuZXhwb3J0IGNsYXNzIFRoZUdhbWUge1xyXG4gIHN0YWdlOlBJWEkuQ29udGFpbmVyO1xyXG5cclxuICB0aGVHcmlkOmdyaWRGaWxlLkFycm93R3JpZDtcclxuICBib2FyZFNpemU6bnVtYmVyOyAvLyBpbiBjZWxsc1xyXG5cclxuICBjaGVja2VyQ2hhcmFjdGVyOkdyaWRDaGFyYWN0ZXI7XHJcbiAgY2hlY2tNYXJrQ2hhcmFjdGVyOkdyaWRDaGFyYWN0ZXI7XHJcblxyXG4gIGluZm9UZXh0OlBJWEkuVGV4dDtcclxuICBjb3VudGVyVGV4dDpQSVhJLlRleHQ7XHJcbiAgcmVzZXRUZXh0OlBJWEkuVGV4dDtcclxuICByZXNodWZmbGVUZXh0OlBJWEkuVGV4dDtcclxuICBwYXVzZVRleHQ6UElYSS5UZXh0O1xyXG4gIHJlc2l6ZVRleHQ6UElYSS5UZXh0O1xyXG5cclxuICBtaW51c1Nwcml0ZTpQSVhJLlNwcml0ZTtcclxuICBwbHVzU3ByaXRlOlBJWEkuU3ByaXRlO1xyXG5cclxuICBnYW1lU3RhdGU6c3RyaW5nOyAvLyBcInJlYWR5XCIsIFwiaW4gcHJvZ3Jlc3NcIiwgb3IgXCJkb25lXCJcclxuICBwYXVzZWQ6Ym9vbGVhbjtcclxuXHJcbiAgc2NvcmVDb3VudGVyOm51bWJlcjtcclxuXHJcbiAgLy8gVGhlIGdhbWUgc291bmRzXHJcbiAgLy8gc3Ryb25nIHR5cGluZyBkb2Vzbid0IHdvcmsgb24gdGhlc2UsIGZvciB3aGF0ZXZlciByZWFzb25cclxuICBzb3VuZFN1Y2Nlc3M7XHJcbiAgc291bmRBZHZhbmNlO1xyXG4gIHNvdW5kRmFpbHVyZTtcclxuICBzb3VuZE1lbnVDaG9pY2U7XHJcbiAgc291bmRSZXNpemU7XHJcbiAgc291bmRTaHVmZmxlO1xyXG4gIHNvdW5kUGF1c2U7XHJcblxyXG4gIGNvbnN0cnVjdG9yKHN0YWdlOlBJWEkuQ29udGFpbmVyKSB7XHJcbiAgICB0aGlzLnN0YWdlID0gc3RhZ2U7XHJcbiAgICBsZXQgYm9hcmREaW1zID0ge3c6NTAwLCBoOjUwMH0gLy8gaW4gcGl4ZWxzXHJcblxyXG4gICAgdGhpcy50aGVHcmlkID0gbnVsbDtcclxuICAgIHRoaXMuYm9hcmRTaXplID0gMTY7XHJcbiAgICB0aGlzLl9jcmVhdGVHcmlkKCk7XHJcblxyXG4gICAgLy8gVWdoLCBpdCB0b29rIG1lIGEgbG9uZyB0aW1lIHRvIGdldCB0aGlzIHdvcmtpbmcuIFRoZSBtb2R1bGUgY291bGRuJ3QgYmVcclxuICAgIC8vIG5hbWVkIFwiSG93bFwiLCBvciB0aGUgYnJvd3NlciB3b3VsZCByZWplY3QgaXQgKG5vIGNvbXBpbGUgZXJyb3IhKVxyXG4gICAgdGhpcy5zb3VuZFN1Y2Nlc3MgPSBuZXcgSE9XTC5Ib3dsKHtzcmM6ICdzb3VuZHMvc3VjY2Vzcy53YXYnfSk7XHJcbiAgICB0aGlzLnNvdW5kQWR2YW5jZSA9IG5ldyBIT1dMLkhvd2woe3NyYzogJ3NvdW5kcy9hZHZhbmNlLndhdicsIHZvbHVtZTowLjN9KTtcclxuICAgIHRoaXMuc291bmRGYWlsdXJlID0gbmV3IEhPV0wuSG93bCh7c3JjOiAnc291bmRzL2ZhaWx1cmUud2F2J30pO1xyXG4gICAgdGhpcy5zb3VuZE1lbnVDaG9pY2UgPSBuZXcgSE9XTC5Ib3dsKHtzcmM6ICdzb3VuZHMvbWVudS1jaG9pY2Uud2F2J30pO1xyXG4gICAgdGhpcy5zb3VuZFJlc2l6ZSA9IG5ldyBIT1dMLkhvd2woe3NyYzogJ3NvdW5kcy9yZXNpemUud2F2J30pO1xyXG4gICAgdGhpcy5zb3VuZFNodWZmbGUgPSBuZXcgSE9XTC5Ib3dsKHtzcmM6ICdzb3VuZHMvc2h1ZmZsZS5tcDMnfSk7XHJcbiAgICB0aGlzLnNvdW5kUGF1c2UgPSBuZXcgSE9XTC5Ib3dsKHtzcmM6ICdzb3VuZHMvcGF1c2UubXAzJ30pO1xyXG5cclxuICAgIC8vIFNldCB1cCBpbmZvIHRleHQgYW5kIHNjb3JlIGNvdW50ZXJcclxuICAgIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuXHJcbiAgICAvLyBTb21lIGhlbHBlciBkYXRhIGZvciBwb3NpdGlvbmluZyB0ZXh0IGFuZCBtZW51IGl0ZW1zIGluIGEgdmVydGljYWxcclxuICAgIC8vIFwibGF5b3V0XCJcclxuICAgIGxldCB0ZXh0U2xvdFNpemUgPSA1MDtcclxuICAgIGxldCBsYXlvdXRTdGFydFB0ID0ge3g6MCwgeTowfVxyXG4gICAgbGF5b3V0U3RhcnRQdC54ID0gdGhpcy50aGVHcmlkLmNvbnRhaW5lci54ICsgYm9hcmREaW1zLncgKyB0ZXh0U2xvdFNpemU7XHJcbiAgICBsYXlvdXRTdGFydFB0LnkgPSB0aGlzLnRoZUdyaWQuY29udGFpbmVyLnk7XHJcbiAgICBsZXQgbGF5b3V0RW5kUHQgPSB7eDpsYXlvdXRTdGFydFB0LngsIHk6bGF5b3V0U3RhcnRQdC55ICsgYm9hcmREaW1zLmh9XHJcblxyXG4gICAgLy8gY3JlYXRlIGEgdGV4dCBvYmplY3Qgd2l0aCBhIG5pY2Ugc3Ryb2tlXHJcbiAgICB0aGlzLmluZm9UZXh0ID0gbmV3IFBJWEkuVGV4dCgnUGxhY2UgcGllY2Ugb24gYm9hcmQnLCB7IGZvbnQ6ICdib2xkIDM2cHggQXJpYWwnLCBmaWxsOiAnI2ZmZmYwMCcsIGFsaWduOiAnbGVmdCcsIHN0cm9rZTogJyMwMDAwRkYnLCBzdHJva2VUaGlja25lc3M6IDQgfSk7XHJcbiAgICB0aGlzLmluZm9UZXh0LnBvc2l0aW9uLnggPSBsYXlvdXRTdGFydFB0Lng7XHJcbiAgICB0aGlzLmluZm9UZXh0LnBvc2l0aW9uLnkgPSBsYXlvdXRTdGFydFB0Lnk7XHJcbiAgICBzdGFnZS5hZGRDaGlsZCh0aGlzLmluZm9UZXh0KTtcclxuXHJcbiAgICB0aGlzLmNvdW50ZXJUZXh0ID0gbmV3IFBJWEkuVGV4dCgnU2NvcmU6IDAnLCB7IGZvbnQ6ICdib2xkIDI0cHggQXJpYWwnLCBmaWxsOiAnI2ZmMDAwMCcsIGFsaWduOiAnbGVmdCcsIHN0cm9rZTogJyM3NzIyMDAnLCBzdHJva2VUaGlja25lc3M6IDQgfSk7XHJcbiAgICB0aGlzLmNvdW50ZXJUZXh0LnBvc2l0aW9uLnggPSBsYXlvdXRTdGFydFB0Lng7XHJcbiAgICB0aGlzLmNvdW50ZXJUZXh0LnBvc2l0aW9uLnkgPSBsYXlvdXRTdGFydFB0LnkgKyB0ZXh0U2xvdFNpemU7XHJcbiAgICBzdGFnZS5hZGRDaGlsZCh0aGlzLmNvdW50ZXJUZXh0KTtcclxuXHJcbiAgICAvLyBTZXQgdXAgc2VsZWN0YWJsZSBtZW51IGl0ZW1zXHJcbiAgICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcblxyXG4gICAgbGV0IG1haW5UZXh0RGVzYyA9IHsgZm9udDogJ2JvbGQgMzBweCBBcmlhbCcsIGZpbGw6ICcjZmYwMGZmJywgYWxpZ246ICdsZWZ0Jywgc3Ryb2tlOiAnIzAwMDBGRicsIHN0cm9rZVRoaWNrbmVzczogNCB9O1xyXG4gICAgbGV0IGN1cnJlbnRHYW1lOlRoZUdhbWUgPSB0aGlzO1xyXG4gICAgdGhpcy5yZXNldFRleHQgPSBuZXcgUElYSS5UZXh0KCdSZXNldCcsIG1haW5UZXh0RGVzYyk7XHJcbiAgICB0aGlzLnJlc2V0VGV4dC5wb3NpdGlvbi54ID0gbGF5b3V0U3RhcnRQdC54O1xyXG4gICAgdGhpcy5yZXNldFRleHQucG9zaXRpb24ueSA9IGxheW91dEVuZFB0LnkgLSB0ZXh0U2xvdFNpemUgKiAzO1xyXG4gICAgc3RhZ2UuYWRkQ2hpbGQodGhpcy5yZXNldFRleHQpO1xyXG4gICAgdGhpcy5yZXNldFRleHQuYnV0dG9uTW9kZSA9IHRydWU7XHJcbiAgICB0aGlzLnJlc2V0VGV4dC5pbnRlcmFjdGl2ZSA9IHRydWU7XHJcbiAgICB0aGlzLnJlc2V0VGV4dC5vbignbW91c2Vkb3duJywgZnVuY3Rpb24oKSB7XHJcbiAgICAgIGN1cnJlbnRHYW1lLmhhbmRsZVJlc2V0UHJlc3NlZCgpO1xyXG4gICAgfSk7XHJcbiAgICB0aGlzLnJlc2V0VGV4dC52aXNpYmxlID0gZmFsc2U7XHJcblxyXG4gICAgdGhpcy5yZXNodWZmbGVUZXh0ID0gbmV3IFBJWEkuVGV4dCgnUmVzaHVmZmxlJywgbWFpblRleHREZXNjKTtcclxuICAgIHRoaXMucmVzaHVmZmxlVGV4dC5wb3NpdGlvbi54ID0gbGF5b3V0U3RhcnRQdC54O1xyXG4gICAgdGhpcy5yZXNodWZmbGVUZXh0LnBvc2l0aW9uLnkgPSBsYXlvdXRFbmRQdC55IC0gdGV4dFNsb3RTaXplICogMjtcclxuICAgIHN0YWdlLmFkZENoaWxkKHRoaXMucmVzaHVmZmxlVGV4dCk7XHJcbiAgICB0aGlzLnJlc2h1ZmZsZVRleHQuYnV0dG9uTW9kZSA9IHRydWU7XHJcbiAgICB0aGlzLnJlc2h1ZmZsZVRleHQuaW50ZXJhY3RpdmUgPSB0cnVlO1xyXG4gICAgdGhpcy5yZXNodWZmbGVUZXh0Lm9uKCdtb3VzZWRvd24nLCBmdW5jdGlvbigpIHtcclxuICAgICAgY3VycmVudEdhbWUuaGFuZGxlUmVzaHVmZmxlUHJlc3NlZCgpO1xyXG4gICAgfSk7XHJcblxyXG4gICAgdGhpcy5wYXVzZVRleHQgPSBuZXcgUElYSS5UZXh0KCdQYXVzZScsIG1haW5UZXh0RGVzYyk7XHJcbiAgICB0aGlzLnBhdXNlVGV4dC5wb3NpdGlvbi54ID0gbGF5b3V0U3RhcnRQdC54O1xyXG4gICAgdGhpcy5wYXVzZVRleHQucG9zaXRpb24ueSA9IGxheW91dEVuZFB0LnkgLSB0ZXh0U2xvdFNpemU7XHJcbiAgICBzdGFnZS5hZGRDaGlsZCh0aGlzLnBhdXNlVGV4dCk7XHJcbiAgICB0aGlzLnBhdXNlVGV4dC5idXR0b25Nb2RlID0gdHJ1ZTtcclxuICAgIHRoaXMucGF1c2VUZXh0LmludGVyYWN0aXZlID0gdHJ1ZTtcclxuICAgIHRoaXMucGF1c2VUZXh0Lm9uKCdtb3VzZWRvd24nLCBmdW5jdGlvbigpIHtcclxuICAgICAgY3VycmVudEdhbWUuaGFuZGxlUGF1c2VQcmVzc2VkKCk7XHJcbiAgICB9KTtcclxuICAgIHRoaXMucGF1c2VUZXh0LnZpc2libGUgPSBmYWxzZTtcclxuXHJcbiAgICB0aGlzLnJlc2l6ZVRleHQgPSBuZXcgUElYSS5UZXh0KCdCb2FyZCBTaXplOiAnICsgdGhpcy5ib2FyZFNpemUsIG1haW5UZXh0RGVzYyk7XHJcbiAgICB0aGlzLnJlc2l6ZVRleHQucG9zaXRpb24ueCA9IGxheW91dFN0YXJ0UHQueDtcclxuICAgIHRoaXMucmVzaXplVGV4dC5wb3NpdGlvbi55ID0gbGF5b3V0RW5kUHQueSAtIHRleHRTbG90U2l6ZSAqIDQ7XHJcbiAgICBzdGFnZS5hZGRDaGlsZCh0aGlzLnJlc2l6ZVRleHQpO1xyXG4gICAgdGhpcy5yZXNpemVUZXh0LnZpc2libGUgPSB0cnVlO1xyXG5cclxuICAgIC8vIEhhbmR5IGZhY3RvcnkgZnVuY3Rpb25cclxuICAgIGxldCBtYWtlQnV0dG9uID0gZnVuY3Rpb24oZmlsZW5hbWU6c3RyaW5nKSB7XHJcbiAgICAgIGxldCBzcHJpdGU6UElYSS5TcHJpdGUgPSBQSVhJLlNwcml0ZS5mcm9tSW1hZ2UoZmlsZW5hbWUpO1xyXG4gICAgICBzcHJpdGUudGludCA9IDB4ODg4ODg4O1xyXG4gICAgICBzcHJpdGUud2lkdGggPSB0ZXh0U2xvdFNpemUgKiAwLjg7XHJcbiAgICAgIHNwcml0ZS5oZWlnaHQgPSB0ZXh0U2xvdFNpemUgKiAwLjg7XHJcbiAgICAgIHN0YWdlLmFkZENoaWxkKHNwcml0ZSk7XHJcbiAgICAgIHNwcml0ZS5idXR0b25Nb2RlID0gdHJ1ZTtcclxuICAgICAgc3ByaXRlLmludGVyYWN0aXZlID0gdHJ1ZTtcclxuICAgICAgc3ByaXRlLm9uKCdtb3VzZW92ZXInLCBmdW5jdGlvbigpIHtcclxuICAgICAgICB0aGlzLnRpbnQgPSAweGZmZmZmZjtcclxuICAgICAgfSk7XHJcbiAgICAgIHNwcml0ZS5vbignbW91c2VvdXQnLCBmdW5jdGlvbigpIHtcclxuICAgICAgICB0aGlzLnRpbnQgPSAweDg4ODg4ODtcclxuICAgICAgfSk7XHJcbiAgICAgIHNwcml0ZS52aXNpYmxlID0gdHJ1ZTtcclxuICAgICAgcmV0dXJuIHNwcml0ZTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBCdXR0b24gZm9yIGNoYW5naW5nIGJvYXJkIHNpemVcclxuICAgIHRoaXMubWludXNTcHJpdGUgPSBtYWtlQnV0dG9uKCdpbWFnZXMvbWludXMtaWNvbi5wbmcnKTtcclxuICAgIHRoaXMubWludXNTcHJpdGUueCA9IHRoaXMucmVzaXplVGV4dC54ICsgdGhpcy5yZXNpemVUZXh0LndpZHRoICsgMTA7XHJcbiAgICB0aGlzLm1pbnVzU3ByaXRlLnkgPSB0aGlzLnJlc2l6ZVRleHQueTtcclxuICAgIHRoaXMubWludXNTcHJpdGUub24oJ21vdXNlZG93bicsIGZ1bmN0aW9uKCkge1xyXG4gICAgICBjdXJyZW50R2FtZS5oYW5kbGVSZXNpemVQcmVzc2VkKC0xKTtcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEJ1dHRvbiBmb3IgY2hhbmdpbmcgYm9hcmQgc2l6ZVxyXG4gICAgdGhpcy5wbHVzU3ByaXRlID0gbWFrZUJ1dHRvbignaW1hZ2VzL3BsdXMtaWNvbi5wbmcnKTtcclxuICAgIHRoaXMucGx1c1Nwcml0ZS54ID0gdGhpcy5taW51c1Nwcml0ZS54ICsgdGhpcy5taW51c1Nwcml0ZS53aWR0aCArIDEwO1xyXG4gICAgdGhpcy5wbHVzU3ByaXRlLnkgPSB0aGlzLm1pbnVzU3ByaXRlLnk7XHJcbiAgICB0aGlzLnBsdXNTcHJpdGUub24oJ21vdXNlZG93bicsIGZ1bmN0aW9uKCkge1xyXG4gICAgICBjdXJyZW50R2FtZS5oYW5kbGVSZXNpemVQcmVzc2VkKDEpO1xyXG4gICAgfSk7XHJcblxyXG4gICAgdGhpcy5jaGVja2VyQ2hhcmFjdGVyID0gbnVsbDtcclxuICAgIHRoaXMuY2hlY2tNYXJrQ2hhcmFjdGVyID0gbnVsbDtcclxuICAgIC8vIE1ha2Ugc3VyZSBjaGFyYWN0ZXJzIGV4aXN0IGJ5IG5vd1xyXG4gICAgdGhpcy5fY3JlYXRlQ2hhcmFjdGVycygpO1xyXG5cclxuICAgIHRoaXMuZ2FtZVN0YXRlID0gXCJyZWFkeVwiO1xyXG4gICAgdGhpcy5wYXVzZWQgPSBmYWxzZTtcclxuICAgIHRoaXMuc2NvcmVDb3VudGVyID0gMDtcclxuICB9XHJcblxyXG4gIC8vIE1haW4gdXBkYXRlIGZ1bmN0aW9uLiBkZWx0YVQgaXMgc2Vjb25kcyBlbGFwc2VkIHNpbmNlIGxhc3QgY2FsbC5cclxuICB1cGRhdGUoZGVsdGFUOm51bWJlcikge1xyXG4gICAgbGV0IGNoYXJhY3RlcnM6R3JpZENoYXJhY3RlcltdID0gW3RoaXMuY2hlY2tlckNoYXJhY3RlciwgdGhpcy5jaGVja01hcmtDaGFyYWN0ZXJdO1xyXG5cclxuICAgIGlmICghdGhpcy5jaGVja2VyQ2hhcmFjdGVyKSB7XHJcbiAgICAgIC8vIG5vIGNoYXJhY3RlcnMgZXhpc3QgeWV0LCBubyBwb2ludCBpbiB1cGRhdGluZ1xyXG4gICAgICByZXR1cm47XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKHRoaXMucGF1c2VkKSB7XHJcbiAgICAgIGZvciAobGV0IGNoYXIgb2YgY2hhcmFjdGVycykge1xyXG4gICAgICAgIGNoYXIudXBkYXRlUGF1c2VkKGRlbHRhVCk7XHJcbiAgICAgIH1cclxuICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG5cclxuICAgIGxldCBsZWF2aW5nR3JpZENoYXI6R3JpZENoYXJhY3RlciA9IG51bGw7IC8vIHRoZSBjaGFyIGxlYXZpbmcgdGhlIGdyaWQsIGlmIGFueVxyXG4gICAgLy8gSXRlcmF0ZSB0aHJvdWdoIGdhbWUgcGllY2VzLCBjYWxsIHRoZWlyIHVwZGF0ZSBmdW5jdGlvbnMsIHNlZSBpZlxyXG4gICAgLy8gYW55IG11c3QgYmUgaXNzdWVkIG5ldyBtb3ZlLlxyXG4gICAgZm9yIChsZXQgY2hhciBvZiBjaGFyYWN0ZXJzKSB7XHJcbiAgICAgIGNoYXIudXBkYXRlKGRlbHRhVCk7XHJcbiAgICAgIGlmIChjaGFyLnJlYWR5VG9Nb3ZlKCkpIHtcclxuICAgICAgICAvLyBIYXMgY2hhcmFjdGVyIGZhbGxlbiBvZmYgZ3JpZD9cclxuICAgICAgICBpZiAoY2hhci5jZWxsSW5kZXhEb3duIDwgMCB8fCBjaGFyLmNlbGxJbmRleERvd24gPj0gdGhpcy50aGVHcmlkLmRpbVkgfHxcclxuICAgICAgICAgIGNoYXIuY2VsbEluZGV4UmlnaHQgPCAwIHx8IGNoYXIuY2VsbEluZGV4UmlnaHQgPj0gdGhpcy50aGVHcmlkLmRpbVgpIHtcclxuICAgICAgICAgIGxlYXZpbmdHcmlkQ2hhciA9IGNoYXI7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGVsc2VcclxuICAgICAgICB7XHJcbiAgICAgICAgICAvLyBDaGFyYWN0ZXIgaXMgc3RpbGwgb24gYm9hcmRcclxuICAgICAgICAgIGxldCBjZWxsOmdyaWRGaWxlLkdyaWRDZWxsID0gdGhpcy50aGVHcmlkLmdldENlbGwoY2hhci5jZWxsSW5kZXhSaWdodCwgY2hhci5jZWxsSW5kZXhEb3duKTtcclxuICAgICAgICAgIGNlbGwuc2V0VmlzaXRlZCh0cnVlKTtcclxuICAgICAgICAgIGNoYXIucmVxdWVzdE5ld01vdmUoY2VsbC5kaXJlY3Rpb24pO1xyXG4gICAgICAgICAgaWYgKGNoYXIgPT0gdGhpcy5jaGVja01hcmtDaGFyYWN0ZXIpIHtcclxuICAgICAgICAgICAgLy8gdGhlIGZhc3Rlci1tb3ZpbmcgY2hhcmFjdGVyIGFkdmFuY2VzLCBzbyBpbmNyZW1lbnQgc2NvcmVcclxuICAgICAgICAgICAgdGhpcy5zY29yZUNvdW50ZXIgPSB0aGlzLnNjb3JlQ291bnRlciArIDE7XHJcbiAgICAgICAgICAgIHRoaXMuY291bnRlclRleHQudGV4dCA9ICdTY29yZTogJyArIHRoaXMuc2NvcmVDb3VudGVyO1xyXG4gICAgICAgICAgICB0aGlzLnNvdW5kQWR2YW5jZS5wbGF5KCk7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICBpZiAoY2hhciA9PSB0aGlzLmNoZWNrZXJDaGFyYWN0ZXIpIHtcclxuICAgICAgICAgICAgLy8gdGhlIHNsb3ctbW92aW5nIGNoYXJhY3RlciBhZHZhbmNlc1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgfSAvLyBlbmQgZm9yXHJcblxyXG4gICAgaWYgKGxlYXZpbmdHcmlkQ2hhciA9PSB0aGlzLmNoZWNrZXJDaGFyYWN0ZXIpIHtcclxuICAgICAgLy8gc2xvd2VyLW1vdmluZyBwaWVjZSBoYXMgbGVmdCB0aGUgYm9hcmRcclxuICAgICAgdGhpcy5jaGVja2VyQ2hhcmFjdGVyLnNldFN0YXRlKFwiZnJvemVuXCIpO1xyXG4gICAgfVxyXG4gICAgaWYgKGxlYXZpbmdHcmlkQ2hhciA9PSB0aGlzLmNoZWNrTWFya0NoYXJhY3Rlcikge1xyXG4gICAgICAvLyBmYXN0ZXItbW92aW5nIHBpZWNlIGhhcyBsZWZ0IHRoZSBib2FyZFxyXG4gICAgICB0aGlzLmNoZWNrTWFya0NoYXJhY3Rlci5zZXRTdGF0ZShcImR5aW5nXCIpO1xyXG4gICAgICB0aGlzLmNoZWNrZXJDaGFyYWN0ZXIuc2V0U3RhdGUoXCJmcm96ZW5cIik7XHJcbiAgICAgIHRoaXMuaW5mb1RleHQudGV4dCA9IFwiTm8gTG9vcFwiO1xyXG4gICAgICB0aGlzLnNvdW5kRmFpbHVyZS5wbGF5KCk7XHJcbiAgICAgIHRoaXMuX3NldEdhbWVTdGF0ZShcImRvbmVcIik7XHJcbiAgICB9XHJcbiAgICAvLyBBcmUgYm90aCBwaWVjZXMgb24gdGhlIHNhbWUgc3F1YXJlPyBJZiBzbywgdGhlIGZhc3Rlci1tb3Zpbmcgb25lIGhhcyBjYXVnaHQgdXAgd2l0aFxyXG4gICAgLy8gdGhlIHNsb3dlci5cclxuICAgIGVsc2UgaWYgKGNoYXJhY3RlcnNbMF0udGVzdENvbGxpc2lvbihjaGFyYWN0ZXJzWzFdKSkge1xyXG4gICAgICAgIC8vIFdlJ3ZlIGNhdWdodCB1cFxyXG4gICAgICAgIHRoaXMuY2hlY2tlckNoYXJhY3Rlci5zZXRTdGF0ZShcImZyb3plblwiKTtcclxuICAgICAgICB0aGlzLmNoZWNrTWFya0NoYXJhY3Rlci5zZXRTdGF0ZShcImV4cGxvZGVcIik7XHJcbiAgICAgICAgdGhpcy5pbmZvVGV4dC50ZXh0ID0gXCJMb29wIERldGVjdGVkIVwiXHJcbiAgICAgICAgdGhpcy5fc2V0R2FtZVN0YXRlKFwiZG9uZVwiKTtcclxuICAgICAgICB0aGlzLnNvdW5kU3VjY2Vzcy5wbGF5KCk7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICAvLyBDYWxsZWQgd2hlbiB1c2VyIGNsaWNrcyBvbiBhbiBhcnJvdyBjZWxsXHJcbiAgaGFuZGxlQ2VsbFByZXNzKHBpeFg6bnVtYmVyLCBwaXhZOm51bWJlcikge1xyXG4gICAgbGV0IGNlbGxYID0gTWF0aC5mbG9vcihwaXhYIC8gR3JpZENoYXJhY3Rlci5jZWxsRGltKTtcclxuICAgIGxldCBjZWxsWSA9IE1hdGguZmxvb3IocGl4WSAvIEdyaWRDaGFyYWN0ZXIuY2VsbERpbSk7XHJcbiAgICBjb25zb2xlLmxvZyhcImJ1dHRvbiBjZWxsOiBcIiArIGNlbGxYICsgXCIsXCIgKyBjZWxsWSk7XHJcbiAgICBpZiAodGhpcy5jaGVja2VyQ2hhcmFjdGVyLmdldFN0YXRlKCkgPT0gXCJpbmFjdGl2ZVwiKSB7XHJcbiAgICAgIHRoaXMuY2hlY2tlckNoYXJhY3Rlci5zZXRQb3NpdGlvbihjZWxsWCwgY2VsbFkpO1xyXG4gICAgICB0aGlzLmNoZWNrTWFya0NoYXJhY3Rlci5zZXRQb3NpdGlvbihjZWxsWCwgY2VsbFkpO1xyXG4gICAgICB0aGlzLnNvdW5kTWVudUNob2ljZS5wbGF5KCk7XHJcbiAgICAgIHRoaXMuX3NldEdhbWVTdGF0ZShcImluIHByb2dyZXNzXCIpO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgaGFuZGxlQ2VsbE92ZXIocGl4WDpudW1iZXIsIHBpeFk6bnVtYmVyKSB7XHJcbiAgICBsZXQgY2VsbFggPSBNYXRoLmZsb29yKHBpeFggLyBHcmlkQ2hhcmFjdGVyLmNlbGxEaW0pO1xyXG4gICAgbGV0IGNlbGxZID0gTWF0aC5mbG9vcihwaXhZIC8gR3JpZENoYXJhY3Rlci5jZWxsRGltKTtcclxuICAgIGxldCBjZWxsOmdyaWRGaWxlLkdyaWRDZWxsID0gdGhpcy50aGVHcmlkLmdldENlbGwoY2VsbFgsIGNlbGxZKTtcclxuICAgIGNlbGwuc2V0SGlnaGxpZ2h0KHRydWUpO1xyXG4gIH1cclxuXHJcbiAgaGFuZGxlQ2VsbE91dChwaXhYOm51bWJlciwgcGl4WTpudW1iZXIpIHtcclxuICAgIGxldCBjZWxsWCA9IE1hdGguZmxvb3IocGl4WCAvIEdyaWRDaGFyYWN0ZXIuY2VsbERpbSk7XHJcbiAgICBsZXQgY2VsbFkgPSBNYXRoLmZsb29yKHBpeFkgLyBHcmlkQ2hhcmFjdGVyLmNlbGxEaW0pO1xyXG4gICAgbGV0IGNlbGw6Z3JpZEZpbGUuR3JpZENlbGwgPSB0aGlzLnRoZUdyaWQuZ2V0Q2VsbChjZWxsWCwgY2VsbFkpO1xyXG4gICAgY2VsbC5zZXRIaWdobGlnaHQoZmFsc2UpO1xyXG4gIH1cclxuXHJcbiAgaGFuZGxlUmVzZXRQcmVzc2VkKCkge1xyXG4gICAgdGhpcy50aGVHcmlkLnJlc2V0QXJyb3dzKCk7XHJcbiAgICB0aGlzLnNvdW5kTWVudUNob2ljZS5wbGF5KCk7XHJcbiAgICB0aGlzLl9zZXRHYW1lU3RhdGUoXCJyZWFkeVwiKTtcclxuICB9XHJcblxyXG4gIGhhbmRsZVJlc2h1ZmZsZVByZXNzZWQoKSB7XHJcbiAgICB0aGlzLnRoZUdyaWQucmVzaHVmZmxlQXJyb3dzKCk7XHJcbiAgICB0aGlzLnNvdW5kU2h1ZmZsZS5wbGF5KCk7XHJcbiAgICB0aGlzLl9zZXRHYW1lU3RhdGUoXCJyZWFkeVwiKTtcclxuICB9XHJcblxyXG4gIGhhbmRsZVBhdXNlUHJlc3NlZCgpIHtcclxuICAgIGxldCBwYXVzZWRTdGF0ZTpib29sZWFuID0gIXRoaXMucGF1c2VkO1xyXG5cclxuICAgIGlmIChwYXVzZWRTdGF0ZSkge1xyXG4gICAgICB0aGlzLnBhdXNlVGV4dC50ZXh0ID0gXCJVbnBhdXNlXCI7XHJcbiAgICB9XHJcbiAgICBlbHNlIHtcclxuICAgICAgdGhpcy5wYXVzZVRleHQudGV4dCA9IFwiUGF1c2VcIjtcclxuICAgIH1cclxuICAgIHRoaXMuY2hlY2tlckNoYXJhY3Rlci5zZXRQYXVzZWQocGF1c2VkU3RhdGUpO1xyXG4gICAgdGhpcy5jaGVja01hcmtDaGFyYWN0ZXIuc2V0UGF1c2VkKHBhdXNlZFN0YXRlKTtcclxuICAgIHRoaXMuc291bmRQYXVzZS5wbGF5KCk7XHJcbiAgICB0aGlzLnBhdXNlZCA9IHBhdXNlZFN0YXRlO1xyXG4gIH1cclxuXHJcbiAgLy8gQ2FsbGVkIHdoZW4gdXNlciByZXNpemVzIHRoZSBnYW1lIGJvYXJkLiBEZXN0cm95cyB0aGUgYm9hcmQgYW5kIHRoZVxyXG4gIC8vIGdhbWUgcGllY2VzLCB0aGVuIHJlY3JlYXRlcyB0aGVtIGF0IG5ldyBzaXplLlxyXG4gIGhhbmRsZVJlc2l6ZVByZXNzZWQoZGlyOm51bWJlcikge1xyXG4gICAgbGV0IG9sZFNpemU6bnVtYmVyID0gdGhpcy5ib2FyZFNpemU7XHJcbiAgICB0aGlzLmJvYXJkU2l6ZSA9IHRoaXMuYm9hcmRTaXplICsgZGlyO1xyXG4gICAgaWYgKHRoaXMuYm9hcmRTaXplIDwgMikge1xyXG4gICAgICB0aGlzLmJvYXJkU2l6ZSA9IDI7XHJcbiAgICB9XHJcbiAgICBlbHNlIGlmICh0aGlzLmJvYXJkU2l6ZSA+IDMyKSB7XHJcbiAgICAgIHRoaXMuYm9hcmRTaXplID0gMzI7XHJcbiAgICB9XHJcbiAgICBpZiAob2xkU2l6ZSA9PSB0aGlzLmJvYXJkU2l6ZSkge1xyXG4gICAgICByZXR1cm47XHJcbiAgICB9XHJcbiAgICB0aGlzLnNvdW5kUmVzaXplLnBsYXkoKTtcclxuICAgIHRoaXMuX2Rlc3Ryb3lDaGFyYWN0ZXJzKCk7XHJcbiAgICB0aGlzLl9jcmVhdGVHcmlkKCk7XHJcbiAgICB0aGlzLl9jcmVhdGVDaGFyYWN0ZXJzKCk7XHJcbiAgICB0aGlzLnJlc2l6ZVRleHQudGV4dCA9ICdCb2FyZCBTaXplOiAnICsgdGhpcy5ib2FyZFNpemU7XHJcbiAgICB0aGlzLl9zZXRHYW1lU3RhdGUoXCJyZWFkeVwiKTtcclxuICB9XHJcblxyXG4gIC8vIEhlbHBlciBmdW5jdGlvbiB0byBjcmVhdGUgdGhlIEFycm93R3JpZFxyXG4gIHByaXZhdGUgX2NyZWF0ZUdyaWQoKSB7XHJcbiAgICBpZiAodGhpcy50aGVHcmlkKSB7XHJcbiAgICAgIHRoaXMudGhlR3JpZC5jbGVhbnVwKHRoaXMuc3RhZ2UpO1xyXG4gICAgfVxyXG4gICAgbGV0IGJvYXJkRGltcyA9IHt3OjUwMCwgaDo1MDB9IC8vIGluIHBpeGVsc1xyXG4gICAgLy8gVGhlIGRpbWVuc2lvbnMgb2YgYSBib2FyZCBjZWxsIGFuZCBhIGdhbWUgY2hhcmFjdGVyIGluIHBpeGVscyBtdXN0IGJlXHJcbiAgICAvLyBzZXQuXHJcbiAgICBncmlkRmlsZS5HcmlkQ2VsbC5jZWxsRGltID0gTWF0aC5mbG9vcihib2FyZERpbXMudyAvIHRoaXMuYm9hcmRTaXplKTtcclxuICAgIEdyaWRDaGFyYWN0ZXIuY2VsbERpbSA9IGdyaWRGaWxlLkdyaWRDZWxsLmNlbGxEaW07XHJcbiAgICB0aGlzLnRoZUdyaWQgPSBuZXcgZ3JpZEZpbGUuQXJyb3dHcmlkKHRoaXMuYm9hcmRTaXplLCB0aGlzLmJvYXJkU2l6ZSwgdGhpcy5zdGFnZSk7XHJcbiAgICBsZXQgZ2FtZUluc3RhbmNlOlRoZUdhbWUgPSB0aGlzO1xyXG4gICAgLy8gU2V0IHVwIGhhbmRsZXJzIHNvIHRoYXQgY2VsbHMgb24gYm9hcmQgd2lsbCBhY3QgYXMgbW91c2UgYnV0dG9uc1xyXG4gICAgbGV0IG9uQnV0dG9uRG93biA9IGZ1bmN0aW9uKCkge1xyXG4gICAgICBnYW1lSW5zdGFuY2UuaGFuZGxlQ2VsbFByZXNzKHRoaXMueCwgdGhpcy55KTtcclxuICAgIH1cclxuICAgIGxldCBvbkJ1dHRvbk92ZXIgPSBmdW5jdGlvbigpIHtcclxuICAgICAgZ2FtZUluc3RhbmNlLmhhbmRsZUNlbGxPdmVyKHRoaXMueCwgdGhpcy55KTtcclxuICAgIH1cclxuICAgIGxldCBvbkJ1dHRvbk91dCA9IGZ1bmN0aW9uKCkge1xyXG4gICAgICBnYW1lSW5zdGFuY2UuaGFuZGxlQ2VsbE91dCh0aGlzLngsIHRoaXMueSk7XHJcbiAgICB9XHJcbiAgICB0aGlzLnRoZUdyaWQuc2V0TW91c2VGdW5jdGlvbnMob25CdXR0b25Eb3duLCBvbkJ1dHRvbk92ZXIsIG9uQnV0dG9uT3V0KTtcclxuICB9XHJcblxyXG4gIC8vIEhlbHBlciBmdW5jdGlvbiB0byBjcmVhdGUgdGhlIGdhbWUgY2hhcmFjdGVyc1xyXG4gIHByaXZhdGUgX2NyZWF0ZUNoYXJhY3RlcnMoKSB7XHJcbiAgICBpZiAodGhpcy5jaGVja2VyQ2hhcmFjdGVyKSB7XHJcbiAgICAgIC8vIEFscmVhZHkgZXhpc3RcclxuICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG4gICAgR3JpZENoYXJhY3Rlci5jZWxsRGltID0gZ3JpZEZpbGUuR3JpZENlbGwuY2VsbERpbTtcclxuICAgIHRoaXMuY2hlY2tlckNoYXJhY3RlciA9IG5ldyBHcmlkQ2hhcmFjdGVyKCdpbWFnZXMvcmVkLWNoZWNrZXIucG5nJywgdGhpcy50aGVHcmlkLmNvbnRhaW5lcik7XHJcbiAgICB0aGlzLmNoZWNrZXJDaGFyYWN0ZXIubW92ZVRpbWUgPSAwLjU7XHJcbiAgICB0aGlzLmNoZWNrTWFya0NoYXJhY3RlciA9IG5ldyBHcmlkQ2hhcmFjdGVyKCdpbWFnZXMvZ3JlZW4tY2hlY2stbWFyay5wbmcnLCB0aGlzLnRoZUdyaWQuY29udGFpbmVyKTtcclxuICAgIHRoaXMuY2hlY2tNYXJrQ2hhcmFjdGVyLm1vdmVUaW1lID0gMC4yNTtcclxuICB9XHJcblxyXG4gIC8vIEhlbHBlciBmdW5jdGlvbiB0byBkZXN0cm95IHRoZSBnYW1lIGNoYXJhY3RlcnMgKHNob3VsZCBiZSBkb25lIGJlZm9yZSBncmlkIGRlc3RydWN0aW9uKVxyXG4gIHByaXZhdGUgX2Rlc3Ryb3lDaGFyYWN0ZXJzKCkge1xyXG4gICAgdGhpcy5jaGVja2VyQ2hhcmFjdGVyLmNsZWFudXAoKTtcclxuICAgIHRoaXMuY2hlY2tlckNoYXJhY3RlciA9IG51bGw7XHJcbiAgICB0aGlzLmNoZWNrTWFya0NoYXJhY3Rlci5jbGVhbnVwKCk7XHJcbiAgICB0aGlzLmNoZWNrTWFya0NoYXJhY3RlciA9IG51bGw7XHJcbiAgfVxyXG5cclxuICAvLyBQdXRzIHRoZSBnYW1lIGludG8gb25lIG9mIGl0cyBvdmVyYWxsIHN0YXRlcy4gQWZmZWN0cyBVSS5cclxuICAvLyAgIFwicmVhZHlcIiA9IHJlYWR5IHRvIHBsYWNlIGEgcGllY2VcclxuICAvLyAgIFwiaW4gcHJvZ3Jlc3NcIiA9IGdhbWUgaXMgYmVpbmcgcGxhY2VcclxuICAvLyAgIFwiZG9uZVwiID0gZ2FtZSBoYXMgcmVhY2hlZCBlbmQgc3RhdGVcclxuICBwcml2YXRlIF9zZXRHYW1lU3RhdGUoc3RhdGU6c3RyaW5nKSB7XHJcbiAgICBjb25zb2xlLmxvZygnR2FtZSBzdGF0ZSB0bzogJyArIHN0YXRlKTtcclxuICAgIGlmIChzdGF0ZSA9PSBcImluIHByb2dyZXNzXCIpIHtcclxuICAgICAgdGhpcy5pbmZvVGV4dC50ZXh0ID0gXCJUcmF2ZWxpbmcuLi5cIlxyXG4gICAgICB0aGlzLmdhbWVTdGF0ZSA9IFwiaW4gcHJvZ3Jlc3NcIjtcclxuICAgICAgdGhpcy5yZXNldFRleHQudmlzaWJsZSA9IGZhbHNlO1xyXG4gICAgICB0aGlzLnJlc2h1ZmZsZVRleHQudmlzaWJsZSA9IGZhbHNlO1xyXG4gICAgICB0aGlzLnJlc2l6ZVRleHQudmlzaWJsZSA9IGZhbHNlO1xyXG4gICAgICB0aGlzLm1pbnVzU3ByaXRlLnZpc2libGUgPSBmYWxzZTtcclxuICAgICAgdGhpcy5wbHVzU3ByaXRlLnZpc2libGUgPSBmYWxzZTtcclxuICAgICAgdGhpcy5wYXVzZVRleHQudmlzaWJsZSA9IHRydWU7XHJcbiAgICB9XHJcbiAgICBlbHNlIGlmIChzdGF0ZSA9PSBcInJlYWR5XCIpIHtcclxuICAgICAgdGhpcy5jaGVja2VyQ2hhcmFjdGVyLnNldFN0YXRlKFwiaW5hY3RpdmVcIik7XHJcbiAgICAgIHRoaXMuY2hlY2tNYXJrQ2hhcmFjdGVyLnNldFN0YXRlKFwiaW5hY3RpdmVcIik7XHJcbiAgICAgIHRoaXMuaW5mb1RleHQudGV4dCA9IFwiUGxhY2UgcGllY2Ugb24gYm9hcmRcIjtcclxuICAgICAgdGhpcy5zY29yZUNvdW50ZXIgPSAwO1xyXG4gICAgICB0aGlzLmNvdW50ZXJUZXh0LnRleHQgPSAnU2NvcmU6ICcgKyB0aGlzLnNjb3JlQ291bnRlcjtcclxuICAgIH1cclxuICAgIGVsc2UgaWYgKHN0YXRlID09IFwiZG9uZVwiKSB7XHJcbiAgICAgIHRoaXMucmVzZXRUZXh0LnZpc2libGUgPSB0cnVlO1xyXG4gICAgICB0aGlzLnJlc2h1ZmZsZVRleHQudmlzaWJsZSA9IHRydWU7XHJcbiAgICAgIHRoaXMucmVzaXplVGV4dC52aXNpYmxlID0gdHJ1ZTtcclxuICAgICAgdGhpcy5taW51c1Nwcml0ZS52aXNpYmxlID0gdHJ1ZTtcclxuICAgICAgdGhpcy5wbHVzU3ByaXRlLnZpc2libGUgPSB0cnVlO1xyXG4gICAgICB0aGlzLnBhdXNlVGV4dC52aXNpYmxlID0gZmFsc2U7XHJcbiAgICB9XHJcbiAgfVxyXG59XHJcbiIsImltcG9ydCBQSVhJID0gcmVxdWlyZSgncGl4aS5qcycpO1xyXG5cclxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuLy8gQ2xhc3MgZGVmaW5pdGlvbnNcclxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuXHJcbi8qXHJcbiAgUmVwcmVzZW50cyBhIGNlbGwgb24gdGhlIGdhbWUgYm9hcmQuIEEgY2VsbCBjb250YWlucyBhbiBhcnJvdyBTcHJpdGVcclxuICB3aGljaCBwb2ludHMgaW4gb25lIG9mIGZvdXIgY2FyZGluYWwgZGlyZWN0aW9ucy4gRWFjaCBjZWxsIGFjdHMgYXNcclxuICBhIGJ1dHRvbiBhbmQgY2FuIGJlIGNsaWNrZWQuXHJcbiovXHJcbmV4cG9ydCBjbGFzcyBHcmlkQ2VsbCB7XHJcbiAgc3ByaXRlOlBJWEkuU3ByaXRlO1xyXG4gIHN0YXRpYyBjZWxsRGltOm51bWJlciA9IDUwOyAvLyBkaW1lbnNpb24gb2YgYSBjZWxsIGluIHBpeGVsc1xyXG5cclxuICAvLyBBcnJvdydzIGZhY2luZyBkaXJlY3Rpb246IDA9bGVmdCwgMT11cCwgMj1yaWdodCwgMz1kb3duXHJcbiAgZGlyZWN0aW9uOm51bWJlcjtcclxuICBjZWxsWDpudW1iZXI7IC8vIGNvb3JkaW5hdGUgb24gdGhlIGdhbWUgYm9hcmQsIGZyb20gbGVmdFxyXG4gIGNlbGxZOm51bWJlcjsgLy8gY29vcmRpbmF0ZSBvbiB0aGUgZ2FtZSBib2FyZCwgZnJvbSB0b3BcclxuICB2aXNpdGVkOmJvb2xlYW47IC8vIGlmIHRoZSBjZWxsIGhhcyBiZWVuIHZpc2l0ZWQgYnkgZ2FtZSBwaWVjZVxyXG5cclxuICBjb25zdHJ1Y3RvcihpOm51bWJlciwgajpudW1iZXIsIGNvbnRhaW5lcjpQSVhJLkNvbnRhaW5lcikge1xyXG4gICAgdmFyIGFycm93ID0gUElYSS5TcHJpdGUuZnJvbUltYWdlKCdpbWFnZXMvYXJyb3ctaWNvbi5wbmcnKTtcclxuICAgIGFycm93LnggPSBHcmlkQ2VsbC5jZWxsRGltICogKGkgKyAwLjUpO1xyXG4gICAgYXJyb3cueSA9IEdyaWRDZWxsLmNlbGxEaW0gKiAoaiArIDAuNSk7XHJcbiAgICBhcnJvdy53aWR0aCA9IEdyaWRDZWxsLmNlbGxEaW07XHJcbiAgICBhcnJvdy5oZWlnaHQgPSBHcmlkQ2VsbC5jZWxsRGltO1xyXG4gICAgYXJyb3cuYW5jaG9yLnggPSAwLjU7XHJcbiAgICBhcnJvdy5hbmNob3IueSA9IDAuNTtcclxuICAgIGNvbnRhaW5lci5hZGRDaGlsZChhcnJvdyk7XHJcbiAgICB0aGlzLmNlbGxYID0gaTtcclxuICAgIHRoaXMuY2VsbFkgPSBqO1xyXG4gICAgdGhpcy5zcHJpdGUgPSBhcnJvdztcclxuICAgIHRoaXMuZGlyZWN0aW9uID0gMDtcclxuICAgIHRoaXMuc2V0VmlzaXRlZChmYWxzZSk7XHJcbiAgfVxyXG5cclxuICAvLyBTZXQgdXAgdGhpcyBjZWxsIHRvIGFjdCBhcyBhIGJ1dHRvblxyXG4gIHNldE1vdXNlRnVuY3Rpb25zKG9uQnV0dG9uRG93bjooKT0+dm9pZCwgb25CdXR0b25PdmVyOigpPT52b2lkLCBvbkJ1dHRvbk91dDooKT0+dm9pZCkge1xyXG4gICAgICB0aGlzLnNwcml0ZS5idXR0b25Nb2RlID0gdHJ1ZTtcclxuICAgICAgdGhpcy5zcHJpdGUuaW50ZXJhY3RpdmUgPSB0cnVlO1xyXG4gICAgICB0aGlzLnNwcml0ZS5vbignbW91c2Vkb3duJywgb25CdXR0b25Eb3duKTtcclxuICAgICAgdGhpcy5zcHJpdGUub24oJ21vdXNlb3ZlcicsIG9uQnV0dG9uT3Zlcik7XHJcbiAgICAgIHRoaXMuc3ByaXRlLm9uKCdtb3VzZW91dCcsIG9uQnV0dG9uT3V0KVxyXG4gIH1cclxuXHJcbiAgLy8gU2V0cyB0aGUgZGlyZWN0aW9uIG9mIHRoZSBhcnJvdzogMD1sZWZ0LCAxPXVwLCAyPXJpZ2h0LCAzPWRvd25cclxuICBzZXREaXJlY3Rpb24odmFsKSB7XHJcbiAgICBjb25zdCBwaSA9IDMuMTQxNTkyNjU7XHJcbiAgICB0aGlzLnNwcml0ZS5yb3RhdGlvbiA9IHBpICogdmFsIC8gMi4wO1xyXG4gICAgdGhpcy5kaXJlY3Rpb24gPSB2YWw7XHJcbiAgfVxyXG5cclxuICAvLyBTZXRzIGlmIHRoZSBjZWxsIGhhcyBiZWVuIHZpc2l0ZWQgYnkgYSBnYW1lIHBpZWNlXHJcbiAgc2V0VmlzaXRlZCh2YWx1ZTpib29sZWFuKSB7XHJcbiAgICBpZiAodmFsdWUpIHtcclxuICAgICAgdGhpcy5zcHJpdGUudGludCA9IDB4ZmZmZmZmOyAvLyBtYWtlIGJyaWdodGVyXHJcbiAgICB9XHJcbiAgICBlbHNlIHtcclxuICAgICAgdGhpcy5zcHJpdGUudGludCA9IDB4ZmY3N2FhO1xyXG4gICAgfVxyXG4gICAgdGhpcy52aXNpdGVkID0gdmFsdWU7XHJcbiAgfVxyXG5cclxuICAvLyBJZiB2YWx1ZT09dHJ1ZSwgdGVtcG9yYXJpbHkgaGlnaGxpZ2h0cyB0aGUgY2VsbFxyXG4gIC8vIElmIHZhbHVlPT1mYWxzZSwgaXQgcmV2ZXJ0cyB0byBpdHMgcHJldmlvdXMgY29sb3JcclxuICBzZXRIaWdobGlnaHQodmFsdWU6Ym9vbGVhbikge1xyXG4gICAgbGV0IGN1cnJlbnRWYWx1ZTpib29sZWFuID0gdGhpcy52aXNpdGVkO1xyXG4gICAgaWYgKCF2YWx1ZSkge1xyXG4gICAgICB2YWx1ZSA9IGN1cnJlbnRWYWx1ZTtcclxuICAgIH1cclxuICAgIHRoaXMuc2V0VmlzaXRlZCh2YWx1ZSk7XHJcbiAgICB0aGlzLnZpc2l0ZWQgPSBjdXJyZW50VmFsdWU7XHJcbiAgfVxyXG59XHJcblxyXG4vKlxyXG4gIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcbiAgUmVwcmVzZW50cyB0aGUgZW50aXJlIGdhbWUgYm9hcmQuIENvbnRhaW5zIGEgMmQgYXJyYXkgb2YgR3JpY0NlbGwgb2JqZWN0cy5cclxuICAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG4qL1xyXG5leHBvcnQgY2xhc3MgQXJyb3dHcmlkIHtcclxuICBjb250YWluZXI6UElYSS5Db250YWluZXI7XHJcbiAgZ3JpZDpHcmlkQ2VsbFtdW107XHJcbiAgZGltWDpudW1iZXI7IC8vIGRpbWVuc2lvbiBvZiBnYW1lIGJvYXJkIGluIGNlbGxzXHJcbiAgZGltWTpudW1iZXI7XHJcblxyXG4gIGNvbnN0cnVjdG9yKHdpZHRoOm51bWJlciwgaGVpZ2h0Om51bWJlciwgc3RhZ2U6UElYSS5Db250YWluZXIpIHtcclxuICAgIHRoaXMuY29udGFpbmVyID0gbmV3IFBJWEkuQ29udGFpbmVyKCk7XHJcbiAgICBzdGFnZS5hZGRDaGlsZCh0aGlzLmNvbnRhaW5lcik7XHJcbiAgICB0aGlzLmNvbnRhaW5lci54ID0gMTAwO1xyXG4gICAgdGhpcy5jb250YWluZXIueSA9IDYwO1xyXG4gICAgdGhpcy5kaW1YID0gd2lkdGg7XHJcbiAgICB0aGlzLmRpbVkgPSBoZWlnaHQ7XHJcbiAgICB0aGlzLmdyaWQgPSBbXTtcclxuICAgIGZvciAodmFyIGogPSAwOyBqIDwgaGVpZ2h0OyBqKyspIHtcclxuICAgICAgdGhpcy5ncmlkW2pdID0gW107XHJcbiAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgd2lkdGg7IGkrKykge1xyXG4gICAgICAgIGxldCBuZXdDZWxsOkdyaWRDZWxsID0gbmV3IEdyaWRDZWxsKGksIGosIHRoaXMuY29udGFpbmVyKTtcclxuICAgICAgICB0aGlzLmdyaWRbal1baV0gPSBuZXdDZWxsO1xyXG4gICAgICB9O1xyXG4gICAgfVxyXG4gICAgdGhpcy5yZXNodWZmbGVBcnJvd3MoKTtcclxuICB9XHJcblxyXG4gIC8vIFByZXBhcmVzIHRoZSBncmlkIGZvciByZW1vdmFsXHJcbiAgY2xlYW51cChzdGFnZTpQSVhJLkNvbnRhaW5lcikge1xyXG4gICAgc3RhZ2UucmVtb3ZlQ2hpbGQodGhpcy5jb250YWluZXIpO1xyXG4gICAgdGhpcy5jb250YWluZXIuZGVzdHJveSgpO1xyXG4gIH1cclxuXHJcbiAgLy8gU2V0cyB1cCBlYWNoIGNlbGwgdG8gYWN0IGFzIGEgYnV0dG9uLiBUaGUgZ2l2ZW4gZnVuY3Rpb25zIHJlc3BvbmQgdG8gdmFyaW91c1xyXG4gIC8vIG1vdXNlIGV2ZW50cy5cclxuICBzZXRNb3VzZUZ1bmN0aW9ucyhvbkJ1dHRvbkRvd246KCk9PnZvaWQsIG9uQnV0dG9uT3ZlcjooKT0+dm9pZCwgb25CdXR0b25PdXQ6KCk9PnZvaWQpIHtcclxuICAgIGZvciAodmFyIGogPSAwOyBqIDwgdGhpcy5kaW1ZOyBqKyspIHtcclxuICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLmRpbVg7IGkrKykge1xyXG4gICAgICAgIHRoaXMuZ3JpZFtqXVtpXS5zZXRNb3VzZUZ1bmN0aW9ucyhvbkJ1dHRvbkRvd24sIG9uQnV0dG9uT3Zlciwgb25CdXR0b25PdXQpO1xyXG4gICAgICB9O1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgLy8gTWFya3MgYWxsIGNlbGxzIGFzIHVudmlzaXRlZFxyXG4gIHJlc2V0QXJyb3dzKCkge1xyXG4gICAgZm9yICh2YXIgaiA9IDA7IGogPCB0aGlzLmRpbVk7IGorKykge1xyXG4gICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMuZGltWDsgaSsrKSB7XHJcbiAgICAgICAgdGhpcy5ncmlkW2pdW2ldLnNldFZpc2l0ZWQoZmFsc2UpO1xyXG4gICAgICB9O1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgLy8gTWFya3MgYWxsIGNlbGxzIGFzIHVudmlzaXRlZCBhbmQgY2hhbmdlcyBhcnJvdyBkaXJlY3Rpb25zXHJcbiAgcmVzaHVmZmxlQXJyb3dzKCkge1xyXG4gICAgZm9yICh2YXIgaiA9IDA7IGogPCB0aGlzLmRpbVk7IGorKykge1xyXG4gICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMuZGltWDsgaSsrKSB7XHJcbiAgICAgICAgdGhpcy5ncmlkW2pdW2ldLnNldFZpc2l0ZWQoZmFsc2UpO1xyXG4gICAgICAgIC8vIEl0J3MgYSBsaXR0bGUgYm9yaW5nIHRvIGhhdmUgdHdvIGFycm93cyBwb2ludGluZyBhdCBlYWNoIG90aGVyLCBzbyBwcmV2ZW50IHRoYXRcclxuICAgICAgICBsZXQgYWxsb3dlZERpcmVjdGlvbnM6Ym9vbGVhbltdID0gW3RydWUsIHRydWUsIHRydWUsIHRydWUsIGZhbHNlXTtcclxuICAgICAgICAvLyBJcyB0aGUgb25lIGFib3ZlIG1lIHBvaW50aW5nIGRvd24/XHJcbiAgICAgICAgaWYgKGogPiAwICYmIHRoaXMuZ3JpZFtqLTFdW2ldLmRpcmVjdGlvbiA9PSAzKSB7XHJcbiAgICAgICAgICAvLyBOb3QgYWxsb3dlZCB0byBwb2ludCBzdHJhaWdodCB1cFxyXG4gICAgICAgICAgYWxsb3dlZERpcmVjdGlvbnNbMV0gPSBmYWxzZTtcclxuICAgICAgICAgIC8vY29uc29sZS5sb2coXCJGb3JiaWRkZW4gdXAgYXQgXCIgKyBpICsgXCIsXCIgKyBqKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgLy8gSXMgdGhlIG9uZSB0byBteSBsZWZ0IHBvaW50aW5nIHJpZ2h0P1xyXG4gICAgICAgIGlmIChpID4gMCAmJiB0aGlzLmdyaWRbal1baS0xXS5kaXJlY3Rpb24gPT0gMikge1xyXG4gICAgICAgICAgLy8gTm90IGFsbG93ZWQgdG8gcG9pbnQgbGVmdFxyXG4gICAgICAgICAgYWxsb3dlZERpcmVjdGlvbnNbMF0gPSBmYWxzZTtcclxuICAgICAgICAgIC8vY29uc29sZS5sb2coXCJGb3JiaWRkZW4gbGVmdCBhdCBcIiArIGkgKyBcIixcIiArIGopO1xyXG4gICAgICAgIH1cclxuICAgICAgICBsZXQgcHJvcG9zZWREaXJlY3Rpb246bnVtYmVyID0gNDsgLy8gbm90IGEgdmFsaWQgZGlyZWN0aW9uLCBzbyB0aGUgZmlyc3QgdGVzdCB3aWxsIGZhaWxcclxuICAgICAgICB3aGlsZSAoYWxsb3dlZERpcmVjdGlvbnNbcHJvcG9zZWREaXJlY3Rpb25dID09IGZhbHNlKVxyXG4gICAgICAgIHtcclxuICAgICAgICAgIHByb3Bvc2VkRGlyZWN0aW9uID0gTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogNC4wKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgdGhpcy5ncmlkW2pdW2ldLnNldERpcmVjdGlvbihwcm9wb3NlZERpcmVjdGlvbik7XHJcbiAgICAgIH07XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICAvLyBSZXR1cm5zIHJlZiB0byBjZWxsIGF0IHBhcnRpY3VsYXIgZ3JpZCBsb2NhdGlvblxyXG4gIGdldENlbGwoZ3JpZFg6bnVtYmVyLCBncmlkWTpudW1iZXIpIHtcclxuICAgIHJldHVybiB0aGlzLmdyaWRbZ3JpZFldW2dyaWRYXTtcclxuICB9XHJcbn1cclxuIiwiLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uL3R5cGluZ3MvaW5kZXguZC50c1wiIC8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiZ3JpZC50c1wiIC8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiZ2FtZS50c1wiIC8+XG5cbmltcG9ydCBncmlkRmlsZSA9IHJlcXVpcmUoJy4vZ3JpZCcpO1xuaW1wb3J0IGdhbWVGaWxlID0gcmVxdWlyZSgnLi9nYW1lJyk7IC8vIFwicmVxdWlyZXMgZ2FtZVwiLCBoYVxuaW1wb3J0IFBJWEkgPSByZXF1aXJlKCdwaXhpLmpzJyk7XG5pbXBvcnQgSG93bGVyID0gcmVxdWlyZSgnaG93bGVyJyk7XG5jb25zdCByZW5kZXJlcjpQSVhJLldlYkdMUmVuZGVyZXIgPSBuZXcgUElYSS5XZWJHTFJlbmRlcmVyKDEyODAsIDcyMCk7XG5kb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKHJlbmRlcmVyLnZpZXcpO1xuXG5sZXQgY2VsbERpbTpudW1iZXIgPSA1MDtcblxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8vIEdsb2JhbCB2YXJzIGFuZCBiYXNpYyBzZXR1cFxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuLy8gR3JhcGhpY2FsIGNvbnRhaW5lclxuXG4vLyBjcmVhdGUgdGhlIHJvb3Qgb2YgdGhlIHNjZW5lIGdyYXBoXG52YXIgc3RhZ2UgPSBuZXcgUElYSS5Db250YWluZXIoKTtcblxubGV0IGdhbWVJbnN0YW5jZTpnYW1lRmlsZS5UaGVHYW1lO1xuXG5kb1NldHVwKCk7XG5cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLyBGdW5jdGlvbiBkZWZpbml0aW9uc1xuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuZnVuY3Rpb24gdXBkYXRlKCkge1xuICAgIGdhbWVJbnN0YW5jZS51cGRhdGUoMC4wMSk7IC8vIGFkdmFuY2UgY2xvY2sgYnkgMS8xMDB0aCBvZiBhIHNlY29uZFxufVxuXG5mdW5jdGlvbiBkb1NldHVwKCkge1xuICAvL2NyZWF0ZUdyaWQoKTtcbiAgY29uc29sZS5sb2coXCJUZXN0XCIpO1xuICBnYW1lSW5zdGFuY2UgPSBuZXcgZ2FtZUZpbGUuVGhlR2FtZShzdGFnZSk7XG4gIC8vIEEgZnVuY3Rpb24gdGhhdCB1cGRhdGVzIGEgaHVuZHJlZCB0aW1lcyBhIHNlY29uZFxuICBzZXRJbnRlcnZhbCh1cGRhdGUsIDEwKTtcbiAgYW5pbWF0ZSgpO1xufVxuXG5mdW5jdGlvbiBhbmltYXRlKCkge1xuXG4gICAgcmVxdWVzdEFuaW1hdGlvbkZyYW1lKGFuaW1hdGUpO1xuXG4gICAgLy8gcmVuZGVyIHRoZSByb290IGNvbnRhaW5lclxuICAgIHJlbmRlcmVyLnJlbmRlcihzdGFnZSk7XG59XG4iXX0=
