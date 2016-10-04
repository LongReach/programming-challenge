(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.jiboProgrammingChallenge = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
"use strict";
var gridFile = require('./grid');
var PIXI = require('pixi.js');
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
        this.isOnGrid = true;
        this.paused = false;
        this.restTimer = 0;
        this.moveTime = 1.0;
        this._state = "inactive";
    }
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
        this.isOnGrid = true;
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
            this.isOnGrid = true;
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
        for (var _a = 0, characters_2 = characters; _a < characters_2.length; _a++) {
            var char = characters_2[_a];
            char.update(deltaT);
            if (char.readyToMove()) {
                // Has character fallen off grid?
                if (char.cellIndexDown < 0 || char.cellIndexDown >= this.theGrid.dimY ||
                    char.cellIndexRight < 0 || char.cellIndexRight >= this.theGrid.dimX) {
                    char.isOnGrid = false;
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
            this._setGameState("done");
        }
        else if (characters[0].testCollision(characters[1])) {
            // We've caught up
            this.checkerCharacter.setState("frozen");
            this.checkMarkCharacter.setState("explode");
            this.infoText.text = "Loop Detected!";
            this._setGameState("done");
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
        this._setGameState("ready");
    };
    TheGame.prototype.handleReshufflePressed = function () {
        this.theGrid.reshuffleArrows();
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
        this.paused = pausedState;
    };
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
},{"./grid":2,"pixi.js":undefined}],2:[function(require,module,exports){
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
    GridCell.prototype.setMouseFunctions = function (onButtonDown, onButtonOver, onButtonOut) {
        // onEvent functions are global functions (towards bottom of file)
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
    // If value==true, it reverts to its previous color
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
    ArrowGrid.prototype.cleanup = function (stage) {
        stage.removeChild(this.container);
        this.container.destroy();
    };
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvZ2FtZS50cyIsInNyYy9ncmlkLnRzIiwic3JjL2luZGV4LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOztBQ0FBLElBQU8sUUFBUSxXQUFXLFFBQVEsQ0FBQyxDQUFDO0FBQ3BDLElBQU8sSUFBSSxXQUFXLFNBQVMsQ0FBQyxDQUFDO0FBRWpDOzs7Ozs7RUFNRTtBQUNGO0lBdUJFLHVCQUFZLElBQVcsRUFBRSxTQUF3QjtRQUMvQyxJQUFJLENBQUMsU0FBUyxHQUFHLFNBQVMsQ0FBQztRQUMzQixJQUFJLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQzFDLGFBQWEsQ0FBQyxPQUFPLEdBQUcsUUFBUSxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUM7UUFDbEQsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLEdBQUcsYUFBYSxDQUFDLE9BQU8sQ0FBQztRQUMxQyxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sR0FBRyxhQUFhLENBQUMsT0FBTyxDQUFDO1FBQzNDLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsR0FBRyxHQUFHLENBQUM7UUFDM0IsSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBQztRQUMzQixJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssR0FBRyxDQUFDLENBQUM7UUFDdEIsU0FBUyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7UUFFaEMsSUFBSSxDQUFDLFlBQVksR0FBRyxDQUFDLENBQUM7UUFDdEIsSUFBSSxDQUFDLFlBQVksR0FBRyxDQUFDLENBQUM7UUFDdEIsSUFBSSxDQUFDLFFBQVEsR0FBRyxLQUFLLENBQUM7UUFDdEIsSUFBSSxDQUFDLFFBQVEsR0FBRyxJ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QUM7QUFFekMsSUFBSSxPQUFPLEdBQVUsRUFBRSxDQUFDO0FBRXhCLDBCQUEwQjtBQUMxQiw4QkFBOEI7QUFDOUIsMEJBQTBCO0FBRTFCLHNCQUFzQjtBQUV0QixxQ0FBcUM7QUFDckMsSUFBSSxLQUFLLEdBQUcsSUFBSSxJQUFJLENBQUMsU0FBUyxFQUFFLENBQUM7QUFFakMsSUFBSSxZQUE2QixDQUFDO0FBRWxDLE9BQU8sRUFBRSxDQUFDO0FBRVYsMEJBQTBCO0FBQzFCLHVCQUF1QjtBQUN2QiwwQkFBMEI7QUFFMUI7SUFDSSxZQUFZLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsdUNBQXVDO0FBQ3RFLENBQUM7QUFFRDtJQUNFLGVBQWU7SUFDZixPQUFPLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDO0lBQ3BCLFlBQVksR0FBRyxJQUFJLFFBQVEsQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDM0MsbURBQW1EO0lBQ25ELFdBQVcsQ0FBQyxNQUFNLEVBQUUsRUFBRSxDQUFDLENBQUM7SUFDeEIsT0FBTyxFQUFFLENBQUM7QUFDWixDQUFDO0FBRUQ7SUFFSSxxQkFBcUIsQ0FBQyxPQUFPLENBQUMsQ0FBQztJQUUvQiw0QkFBNEI7SUFDNUIsUUFBUSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQztBQUMzQixDQUFDIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsImltcG9ydCBncmlkRmlsZSA9IHJlcXVpcmUoJy4vZ3JpZCcpO1xyXG5pbXBvcnQgUElYSSA9IHJlcXVpcmUoJ3BpeGkuanMnKTtcclxuXHJcbi8qXHJcbiAgLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuICBSZXByZXNlbnRzIGEgZ2FtZSBwaWVjZS4gQSBwaWVjZSBjYW4gb2NjdXB5IGEgY2VsbCBhbmQgdHJhbnNpdGlvbiBpbiBhXHJcbiAgdmlkZW9nYW1lLXkgbWFubmVyIGJldHdlZW4gY2VsbHMuIEl0IGFsc28gaGFzIGEgc3RhdGUgbWFjaGluZSBhbmRcclxuICBjYW4gcGVyZm9ybSBzZXZlcmFsIGFuaW1hdGlvbiBzZXF1ZW5jZXMuXHJcbiAgLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuKi9cclxuZXhwb3J0IGNsYXNzIEdyaWRDaGFyYWN0ZXIge1xyXG4gIGNvbnRhaW5lcjpQSVhJLkNvbnRhaW5lcjtcclxuICBzcHJpdGU6UElYSS5TcHJpdGU7XHJcbiAgc3RhdGljIGNlbGxEaW06bnVtYmVyO1xyXG5cclxuICBjZWxsSW5kZXhSaWdodDpudW1iZXI7IC8vIGJvYXJkIGNvb3JkaW5hdGVcclxuICBjZWxsSW5kZXhEb3duOm51bWJlcjtcclxuICB4TW92ZW1lbnREaXI6bnVtYmVyOyAvLyBkaXJlY3Rpb24gb2YgY3VycmVudCBtb3ZlbWVudCwgKC0xID0gbGVmdCwgMSA9IHJpZ2h0KVxyXG4gIHlNb3ZlbWVudERpcjpudW1iZXI7IC8vIGRpcmVjdGlvbiBvZiBjdXJyZW50IG1vdmVtZW50LCAoLTEgPSB1cCwgMSA9IGRvd24pXHJcblxyXG4gIHNsaWRlVmFsdWU6bnVtYmVyOyAvLyBob3cgZmFyIHRoZSBwaWVjZSBoYXMgc2xpZCBhd2F5IGZyb20gY3VycmVudCBjZWxsXHJcbiAgICAgICAgICAgICAgICAgICAgIC8vIDAgdG8gMVxyXG4gIGVmZmVjdFNsaWRlcjpudW1iZXI7IC8vIFVzZWQgZm9yIHRoZSBhbmltYXRpb24gb2YgZWZmZWN0c1xyXG4gIHJlc3RUaW1lcjpudW1iZXI7ICAvLyB0aGUgcGllY2UgXCJyZXN0c1wiIGZvciBhIGJpdCBhZnRlciBhcnJpdmluZ1xyXG4gIG1vdmVUaW1lOm51bWJlcjsgLy8gaG93IG1hbnkgc2Vjb25kcyBhIG1vdmUgb3IgcmVzdCBwZXJpb2QgdGFrZXNcclxuXHJcbiAgb25Jbml0aWFsQ2VsbDpib29sZWFuO1xyXG4gIGlzTW92aW5nOmJvb2xlYW47XHJcbiAgaXNPbkdyaWQ6Ym9vbGVhbjsgLy8gZmFsc2UgaWYgcGllY2UgbW92ZXMgb2ZmIGJvYXJkXHJcbiAgcGF1c2VkOmJvb2xlYW47XHJcblxyXG4gIHByaXZhdGUgX3N0YXRlOnN0cmluZztcclxuXHJcbiAgY29uc3RydWN0b3IobmFtZTpzdHJpbmcsIGNvbnRhaW5lcjpQSVhJLkNvbnRhaW5lcikge1xyXG4gICAgdGhpcy5jb250YWluZXIgPSBjb250YWluZXI7XHJcbiAgICB0aGlzLnNwcml0ZSA9IFBJWEkuU3ByaXRlLmZyb21JbWFnZShuYW1lKTtcclxuICAgIEdyaWRDaGFyYWN0ZXIuY2VsbERpbSA9IGdyaWRGaWxlLkdyaWRDZWxsLmNlbGxEaW07XHJcbiAgICB0aGlzLnNwcml0ZS53aWR0aCA9IEdyaWRDaGFyYWN0ZXIuY2VsbERpbTtcclxuICAgIHRoaXMuc3ByaXRlLmhlaWdodCA9IEdyaWRDaGFyYWN0ZXIuY2VsbERpbTtcclxuICAgIHRoaXMuc3ByaXRlLmFuY2hvci54ID0gMC41O1xyXG4gICAgdGhpcy5zcHJpdGUuYW5jaG9yLnkgPSAwLjU7XHJcbiAgICB0aGlzLnNwcml0ZS5hbHBoYSA9IDA7XHJcbiAgICBjb250YWluZXIuYWRkQ2hpbGQodGhpcy5zcHJpdGUpO1xyXG5cclxuICAgIHRoaXMueE1vdmVtZW50RGlyID0gMDtcclxuICAgIHRoaXMueU1vdmVtZW50RGlyID0gMDtcclxuICAgIHRoaXMuaXNNb3ZpbmcgPSBmYWxzZTtcclxuICAgIHRoaXMuaXNPbkdyaWQgPSB0cnVlO1xyXG4gICAgdGhpcy5wYXVzZWQgPSBmYWxzZTtcclxuICAgIHRoaXMucmVzdFRpbWVyID0gMDtcclxuICAgIHRoaXMubW92ZVRpbWUgPSAxLjA7XHJcbiAgICB0aGlzLl9zdGF0ZSA9IFwiaW5hY3RpdmVcIjtcclxuICB9XHJcblxyXG4gIGNsZWFudXAoKSB7XHJcbiAgICB0aGlzLmNvbnRhaW5lci5yZW1vdmVDaGlsZCh0aGlzLnNwcml0ZSk7XHJcbiAgICB0aGlzLnNwcml0ZS5kZXN0cm95KCk7XHJcbiAgfVxyXG5cclxuICAvLyBJbnN0YW50bHkgcG9zaXRpb25zIHRoZSBwaWVjZSBhdCBpdHMgc3RhcnQgcG9zaXRpb25cclxuICBzZXRQb3NpdGlvbihpOm51bWJlciwgajpudW1iZXIpIHtcclxuICAgIHRoaXMuc3ByaXRlLnggPSBHcmlkQ2hhcmFjdGVyLmNlbGxEaW0gKiAoaSArIDAuNSk7XHJcbiAgICB0aGlzLnNwcml0ZS55ID0gR3JpZENoYXJhY3Rlci5jZWxsRGltICogKGogKyAwLjUpO1xyXG4gICAgdGhpcy5zcHJpdGUud2lkdGggPSBHcmlkQ2hhcmFjdGVyLmNlbGxEaW07XHJcbiAgICB0aGlzLnNwcml0ZS5oZWlnaHQgPSBHcmlkQ2hhcmFjdGVyLmNlbGxEaW07XHJcbiAgICB0aGlzLnNwcml0ZS5hbHBoYSA9IDE7XHJcbiAgICB0aGlzLmNlbGxJbmRleERvd24gPSBqO1xyXG4gICAgdGhpcy5jZWxsSW5kZXhSaWdodCA9IGk7XHJcbiAgICB0aGlzLm9uSW5pdGlhbENlbGwgPSB0cnVlO1xyXG4gICAgdGhpcy5wYXVzZWQgPSBmYWxzZTtcclxuICAgIHRoaXMuaXNNb3ZpbmcgPSBmYWxzZTtcclxuICAgIHRoaXMuaXNPbkdyaWQgPSB0cnVlO1xyXG4gICAgdGhpcy5zbGlkZVZhbHVlID0gMDtcclxuICAgIHRoaXMucmVzdFRpbWVyID0gdGhpcy5tb3ZlVGltZTsgLy8gbGV0IGl0IHJlc3QgYmVmb3JlIHN0YXJ0aW5nIG1vdmVcclxuICAgIHRoaXMuX3N0YXRlID0gXCJhY3RpdmVcIjtcclxuICB9XHJcblxyXG4gIC8vIFJldHVybnMgdHJ1ZSBpZiBjaGFyYWN0ZXIgY2FuIGJlIGlzc3VlZCBhIG5ldyBtb3ZlXHJcbiAgcmVhZHlUb01vdmUoKSB7XHJcbiAgICBpZiAodGhpcy5fc3RhdGUgIT0gXCJhY3RpdmVcIikge1xyXG4gICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gKCF0aGlzLmlzTW92aW5nICYmIHRoaXMucmVzdFRpbWVyID09IDApO1xyXG4gIH1cclxuXHJcbiAgLy8gUmV0dXJucyB0cnVlIGlmIHRoaXMgY2hhcmFjdGVyIGFuZCB0aGUgb3RoZXIgaGF2ZSBjYXVnaHQgdXAgdG8gZWFjaCBvdGhlclxyXG4gIHRlc3RDb2xsaXNpb24ob3RoZXI6R3JpZENoYXJhY3Rlcikge1xyXG4gICAgaWYgKHRoaXMub25Jbml0aWFsQ2VsbCB8fCBvdGhlci5vbkluaXRpYWxDZWxsIHx8IHRoaXMuX3N0YXRlICE9IFwiYWN0aXZlXCIpIHtcclxuICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgfVxyXG4gICAgaWYgKHRoaXMuY2VsbEluZGV4RG93biA9PSBvdGhlci5jZWxsSW5kZXhEb3duICYmXHJcbiAgICAgIHRoaXMuY2VsbEluZGV4UmlnaHQgPT0gb3RoZXIuY2VsbEluZGV4UmlnaHQpIHtcclxuICAgICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIGZhbHNlO1xyXG4gIH1cclxuXHJcbiAgLy8gVGVsbHMgdGhlIHBpZWNlIHRvIGJlZ2luIG1vdmluZyBpbiB0aGUgZ2l2ZW4gZGlyZWN0aW9uXHJcbiAgLy8gU2VlIEdyaWRDZWxsIGZvciBkaXJlY3Rpb24gdmFsdWVzLlxyXG4gIHJlcXVlc3ROZXdNb3ZlKGRpcmVjdGlvbikge1xyXG4gICAgaWYgKHRoaXMuX3N0YXRlICE9IFwiYWN0aXZlXCIpIHtcclxuICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG4gICAgaWYgKHRoaXMuaXNNb3ZpbmcpIHtcclxuICAgICAgcmV0dXJuOyAvLyBjYW4ndCBjaGFuZ2Ugd2hpbGUgYWxyZWFkeSBtb3ZpbmdcclxuICAgIH1cclxuICAgIGlmIChkaXJlY3Rpb24gPT0gMCkgLy8gbGVmdFxyXG4gICAge1xyXG4gICAgICB0aGlzLnhNb3ZlbWVudERpciA9IC0xLjA7XHJcbiAgICAgIHRoaXMueU1vdmVtZW50RGlyID0gIDAuMDtcclxuICAgIH1cclxuICAgIGVsc2UgaWYgKGRpcmVjdGlvbiA9PSAxKSAvLyB1cFxyXG4gICAge1xyXG4gICAgICB0aGlzLnhNb3ZlbWVudERpciA9ICAwLjA7XHJcbiAgICAgIHRoaXMueU1vdmVtZW50RGlyID0gLTEuMDtcclxuICAgIH1cclxuICAgIGVsc2UgaWYgKGRpcmVjdGlvbiA9PSAyKSAvLyByaWdodFxyXG4gICAge1xyXG4gICAgICB0aGlzLnhNb3ZlbWVudERpciA9ICAxLjA7XHJcbiAgICAgIHRoaXMueU1vdmVtZW50RGlyID0gIDAuMDtcclxuICAgIH1cclxuICAgIGVsc2UgIC8vIGRvd25cclxuICAgIHtcclxuICAgICAgdGhpcy54TW92ZW1lbnREaXIgPSAgMC4wO1xyXG4gICAgICB0aGlzLnlNb3ZlbWVudERpciA9ICAxLjA7XHJcbiAgICB9XHJcbiAgICB0aGlzLnNsaWRlVmFsdWUgPSAwO1xyXG4gICAgdGhpcy5pc01vdmluZyA9IHRydWU7XHJcbiAgfVxyXG5cclxuICAvLyBQdXRzIHRoZSBwaWVjZSBpbiBhIG5ldyBhbmltYXRpb24gc3RhdGVcclxuICAvLyAoSSB3YXMgZ29pbmcgdG8gdXNlIGEgdHlwZXNjcmlwdCBhY2Nlc3NvciwgYnV0IG5vdCBzdXBwb3J0ZWQgYnkgdGhpcyBjb21waWxlcilcclxuICBzZXRTdGF0ZShzdGF0ZTpzdHJpbmcpIHtcclxuICAgIGlmICh0aGlzLl9zdGF0ZSA9PSBzdGF0ZSB8fCB0aGlzLl9zdGF0ZSA9PSBcImluYWN0aXZlXCIpIHtcclxuICAgICAgLy8gTm90aGluZyBoYXBwZW5zIGlmIHdlJ3JlIGFscmVhZHkgaW4gcmVxdWVzdGVkIHN0YXRlIG9yIGlmIGNoYXJhY3RlclxyXG4gICAgICAvLyBpcyBpbmFjdGl2ZVxyXG4gICAgICByZXR1cm47XHJcbiAgICB9XHJcbiAgICBjb25zb2xlLmxvZyhcInN0YXRlIHRvIFwiICsgc3RhdGUpO1xyXG4gICAgdGhpcy5fc3RhdGUgPSBzdGF0ZTtcclxuICAgIGlmIChzdGF0ZSA9PSBcImZyb3plblwiKSB7XHJcbiAgICAgIHRoaXMuZWZmZWN0U2xpZGVyID0gMDtcclxuICAgIH1cclxuICAgIGVsc2UgaWYgKHN0YXRlID09IFwiZHlpbmdcIikge1xyXG4gICAgICB0aGlzLmVmZmVjdFNsaWRlciA9IDE7XHJcbiAgICB9XHJcbiAgICBlbHNlIGlmIChzdGF0ZSA9PSBcImV4cGxvZGVcIikge1xyXG4gICAgICB0aGlzLmVmZmVjdFNsaWRlciA9IDE7XHJcbiAgICB9XHJcbiAgICBlbHNlIGlmIChzdGF0ZSA9PSBcImluYWN0aXZlXCIpIHtcclxuICAgICAgdGhpcy5zcHJpdGUuYWxwaGEgPSAwO1xyXG4gICAgICB0aGlzLmlzTW92aW5nID0gZmFsc2U7XHJcbiAgICAgIHRoaXMuaXNPbkdyaWQgPSB0cnVlO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgLy8gQWNjZXNzb3JzIGFuZCBzZXR0ZXJzIGFyZSBnb29kIDopXHJcbiAgZ2V0U3RhdGUoKSB7XHJcbiAgICByZXR1cm4gdGhpcy5fc3RhdGU7XHJcbiAgfVxyXG5cclxuICAvLyBVcGRhdGUgZnVuY3Rpb24gY2FsbGVkIHBlcmlvZGljYWxseS4gZGVsdGFUIGlzIHRpbWUgaW4gc2Vjb25kcyBzaW5jZSBsYXN0XHJcbiAgLy8gY2FsbC5cclxuICB1cGRhdGUoZGVsdGFUKSB7XHJcbiAgICBpZiAodGhpcy5fc3RhdGUgPT0gXCJhY3RpdmVcIikge1xyXG4gICAgICB0aGlzLnNwcml0ZS54ID0gR3JpZENoYXJhY3Rlci5jZWxsRGltICogKHRoaXMuY2VsbEluZGV4UmlnaHQgKyAwLjUgKyB0aGlzLnhNb3ZlbWVudERpciAqIHRoaXMuc2xpZGVWYWx1ZSk7XHJcbiAgICAgIHRoaXMuc3ByaXRlLnkgPSBHcmlkQ2hhcmFjdGVyLmNlbGxEaW0gKiAodGhpcy5jZWxsSW5kZXhEb3duICsgMC41ICsgdGhpcy55TW92ZW1lbnREaXIgKiB0aGlzLnNsaWRlVmFsdWUpO1xyXG4gICAgICBpZiAodGhpcy5pc01vdmluZykge1xyXG4gICAgICAgIC8vIGl0IHRha2VzIG1vdmVUaW1lIHNlY29uZHMgdG8gbW92ZSBvbmUgc3F1YXJlXHJcbiAgICAgICAgdGhpcy5zbGlkZVZhbHVlID0gdGhpcy5zbGlkZVZhbHVlICsgZGVsdGFUIC8gdGhpcy5tb3ZlVGltZTtcclxuICAgICAgICBpZiAodGhpcy5zbGlkZVZhbHVlID4gMS4wKVxyXG4gICAgICAgIHtcclxuICAgICAgICAgIC8vIFdlJ3ZlIGFycml2ZWRcclxuICAgICAgICAgIHRoaXMuY2VsbEluZGV4UmlnaHQgPSB0aGlzLmNlbGxJbmRleFJpZ2h0ICsgdGhpcy54TW92ZW1lbnREaXI7XHJcbiAgICAgICAgICB0aGlzLmNlbGxJbmRleERvd24gPSB0aGlzLmNlbGxJbmRleERvd24gKyB0aGlzLnlNb3ZlbWVudERpcjtcclxuICAgICAgICAgIHRoaXMuc2xpZGVWYWx1ZSA9IDA7XHJcbiAgICAgICAgICB0aGlzLnhNb3ZlbWVudERpciA9IDAuMDtcclxuICAgICAgICAgIHRoaXMueU1vdmVtZW50RGlyID0gMC4wO1xyXG4gICAgICAgICAgdGhpcy5pc01vdmluZyA9IGZhbHNlO1xyXG4gICAgICAgICAgdGhpcy5vbkluaXRpYWxDZWxsID0gZmFsc2U7XHJcbiAgICAgICAgICB0aGlzLnJlc3RUaW1lciA9IHRoaXMubW92ZVRpbWU7XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICAgIGVsc2UgaWYgKHRoaXMucmVzdFRpbWVyID4gMClcclxuICAgICAge1xyXG4gICAgICAgIC8vIFBpZWNlIGlzIHJlc3RpbmcgYWZ0ZXIgY29tcGxldGluZyBtb3ZlXHJcbiAgICAgICAgdGhpcy5yZXN0VGltZXIgPSB0aGlzLnJlc3RUaW1lciAtIGRlbHRhVDtcclxuICAgICAgICBpZiAodGhpcy5yZXN0VGltZXIgPCAwKSB7XHJcbiAgICAgICAgICB0aGlzLnJlc3RUaW1lciA9IDA7XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICB9IC8vIGVuZCBpZiBhY3RpdmUgc3RhdGVcclxuICAgIGVsc2UgaWYgKHRoaXMuX3N0YXRlID09IFwiZnJvemVuXCIpIHtcclxuICAgICAgLy8gc2luZSB3YXZlIGFscGhhIGVmZmVjdFxyXG4gICAgICB0aGlzLnNwcml0ZS5hbHBoYSA9IDAuNSArIDAuNSAqIE1hdGguY29zKHRoaXMuZWZmZWN0U2xpZGVyKTtcclxuICAgICAgdGhpcy5lZmZlY3RTbGlkZXIgPSB0aGlzLmVmZmVjdFNsaWRlciArIGRlbHRhVCAqIDQ7XHJcbiAgICB9XHJcbiAgICBlbHNlIGlmICh0aGlzLl9zdGF0ZSA9PSBcImR5aW5nXCIpIHtcclxuICAgICAgLy8gZmFkZSBhbmQgc2hyaW5rIGVmZmVjdFxyXG4gICAgICB0aGlzLnNwcml0ZS5hbHBoYSA9IHRoaXMuZWZmZWN0U2xpZGVyO1xyXG4gICAgICB0aGlzLnNwcml0ZS53aWR0aCA9IEdyaWRDaGFyYWN0ZXIuY2VsbERpbSAqICgwLjUgKyB0aGlzLmVmZmVjdFNsaWRlciAvIDIpO1xyXG4gICAgICB0aGlzLnNwcml0ZS5oZWlnaHQgPSBHcmlkQ2hhcmFjdGVyLmNlbGxEaW0gKiAoMC41ICsgdGhpcy5lZmZlY3RTbGlkZXIgLyAyKTtcclxuICAgICAgdGhpcy5lZmZlY3RTbGlkZXIgPSB0aGlzLmVmZmVjdFNsaWRlciAtIGRlbHRhVCAvICh0aGlzLm1vdmVUaW1lICogNC4wKTtcclxuICAgICAgaWYgKHRoaXMuZWZmZWN0U2xpZGVyIDw9IDAuMCkge1xyXG4gICAgICAgIHRoaXMuc2V0U3RhdGUoXCJpbmFjdGl2ZVwiKTtcclxuICAgICAgfVxyXG4gICAgfVxyXG4gICAgZWxzZSBpZiAodGhpcy5fc3RhdGUgPT0gXCJleHBsb2RlXCIpIHtcclxuICAgICAgLy8gYnVyc3QgYW5kIGZhZGUgZWZmZWN0XHJcbiAgICAgIHRoaXMuc3ByaXRlLmFscGhhID0gdGhpcy5lZmZlY3RTbGlkZXI7XHJcbiAgICAgIHRoaXMuc3ByaXRlLndpZHRoID0gR3JpZENoYXJhY3Rlci5jZWxsRGltICogKDEuMCArICgzLjAgLSB0aGlzLmVmZmVjdFNsaWRlciAqIDMuMCkpO1xyXG4gICAgICB0aGlzLnNwcml0ZS5oZWlnaHQgPSBHcmlkQ2hhcmFjdGVyLmNlbGxEaW0gKiAoMS4wICsgKDMuMCAtIHRoaXMuZWZmZWN0U2xpZGVyICogMy4wKSk7XHJcbiAgICAgIHRoaXMuZWZmZWN0U2xpZGVyID0gdGhpcy5lZmZlY3RTbGlkZXIgLSBkZWx0YVQgLyAodGhpcy5tb3ZlVGltZSAqIDQuMCk7XHJcbiAgICAgIGlmICh0aGlzLmVmZmVjdFNsaWRlciA8PSAwLjApIHtcclxuICAgICAgICB0aGlzLmVmZmVjdFNsaWRlciA9IDE7IC8vIGtlZXAgZXhwbG9kaW5nIGZvcmV2ZXJcclxuICAgICAgfVxyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgLy8gUHV0cyB0aGlzIGNoYXJhY3RlciBpbnRvIG9yIG91dCBvZiBwYXVzZWQgc3RhdGVcclxuICBzZXRQYXVzZWQodmFsOmJvb2xlYW4pIHtcclxuICAgIGlmICh0aGlzLnBhdXNlZCA9PSB2YWwpIHtcclxuICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG5cclxuICAgIHRoaXMucGF1c2VkID0gdmFsO1xyXG4gICAgaWYgKHZhbCkge1xyXG4gICAgICB0aGlzLmVmZmVjdFNsaWRlciA9IDA7XHJcbiAgICB9XHJcbiAgICBlbHNlIHtcclxuICAgICAgdGhpcy5zcHJpdGUuYWxwaGEgPSAxO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgLy8gVXBkYXRlIGZ1bmN0aW9uIGNhbGxlZCB3aGlsZSBjaGFyYWN0ZXIgaXMgcGF1c2VkXHJcbiAgdXBkYXRlUGF1c2VkKGRlbHRhVCkge1xyXG4gICAgLy8gc2luZSB3YXZlIGFscGhhIGVmZmVjdFxyXG4gICAgdGhpcy5zcHJpdGUuYWxwaGEgPSAwLjUgKyAwLjUgKiBNYXRoLmNvcyh0aGlzLmVmZmVjdFNsaWRlcik7XHJcbiAgICB0aGlzLmVmZmVjdFNsaWRlciA9IHRoaXMuZWZmZWN0U2xpZGVyICsgZGVsdGFUICogNDtcclxuICB9XHJcbn1cclxuXHJcbi8qXHJcbiAgLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuICBSZXByZXNlbnRzIHRoZSBnYW1lIGF0IHRoZSBoaWdoZXN0IGxldmVsLiBNYW5hZ2VzIFVJIGZlYXR1cmVzLCBhbiBBcnJvd0dyaWRcclxuICBpbnN0YW5jZSwgYW5kIHRoZSBnYW1lIHBpZWNlcy5cclxuICAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG4qL1xyXG5leHBvcnQgY2xhc3MgVGhlR2FtZSB7XHJcbiAgc3RhZ2U6UElYSS5Db250YWluZXI7XHJcblxyXG4gIHRoZUdyaWQ6Z3JpZEZpbGUuQXJyb3dHcmlkO1xyXG4gIGJvYXJkU2l6ZTpudW1iZXI7IC8vIGluIGNlbGxzXHJcblxyXG4gIGNoZWNrZXJDaGFyYWN0ZXI6R3JpZENoYXJhY3RlcjtcclxuICBjaGVja01hcmtDaGFyYWN0ZXI6R3JpZENoYXJhY3RlcjtcclxuXHJcbiAgaW5mb1RleHQ6UElYSS5UZXh0O1xyXG4gIGNvdW50ZXJUZXh0OlBJWEkuVGV4dDtcclxuICByZXNldFRleHQ6UElYSS5UZXh0O1xyXG4gIHJlc2h1ZmZsZVRleHQ6UElYSS5UZXh0O1xyXG4gIHBhdXNlVGV4dDpQSVhJLlRleHQ7XHJcbiAgcmVzaXplVGV4dDpQSVhJLlRleHQ7XHJcblxyXG4gIG1pbnVzU3ByaXRlOlBJWEkuU3ByaXRlO1xyXG4gIHBsdXNTcHJpdGU6UElYSS5TcHJpdGU7XHJcblxyXG4gIGdhbWVTdGF0ZTpzdHJpbmc7IC8vIFwicmVhZHlcIiwgXCJpbiBwcm9ncmVzc1wiLCBvciBcImRvbmVcIlxyXG4gIHBhdXNlZDpib29sZWFuO1xyXG5cclxuICBzY29yZUNvdW50ZXI6bnVtYmVyO1xyXG5cclxuICBjb25zdHJ1Y3RvcihzdGFnZTpQSVhJLkNvbnRhaW5lcikge1xyXG4gICAgdGhpcy5zdGFnZSA9IHN0YWdlO1xyXG4gICAgbGV0IGJvYXJkRGltcyA9IHt3OjUwMCwgaDo1MDB9IC8vIGluIHBpeGVsc1xyXG5cclxuICAgIHRoaXMudGhlR3JpZCA9IG51bGw7XHJcbiAgICB0aGlzLmJvYXJkU2l6ZSA9IDE2O1xyXG4gICAgdGhpcy5fY3JlYXRlR3JpZCgpO1xyXG5cclxuICAgIC8vIFNldCB1cCBpbmZvIHRleHQgYW5kIHNjb3JlIGNvdW50ZXJcclxuICAgIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuXHJcbiAgICAvLyBTb21lIGhlbHBlciBkYXRhIGZvciBwb3NpdGlvbmluZyB0ZXh0IGFuZCBtZW51IGl0ZW1zIGluIGEgdmVydGljYWxcclxuICAgIC8vIFwibGF5b3V0XCJcclxuICAgIGxldCB0ZXh0U2xvdFNpemUgPSA1MDtcclxuICAgIGxldCBsYXlvdXRTdGFydFB0ID0ge3g6MCwgeTowfVxyXG4gICAgbGF5b3V0U3RhcnRQdC54ID0gdGhpcy50aGVHcmlkLmNvbnRhaW5lci54ICsgYm9hcmREaW1zLncgKyB0ZXh0U2xvdFNpemU7XHJcbiAgICBsYXlvdXRTdGFydFB0LnkgPSB0aGlzLnRoZUdyaWQuY29udGFpbmVyLnk7XHJcbiAgICBsZXQgbGF5b3V0RW5kUHQgPSB7eDpsYXlvdXRTdGFydFB0LngsIHk6bGF5b3V0U3RhcnRQdC55ICsgYm9hcmREaW1zLmh9XHJcblxyXG4gICAgLy8gY3JlYXRlIGEgdGV4dCBvYmplY3Qgd2l0aCBhIG5pY2Ugc3Ryb2tlXHJcbiAgICB0aGlzLmluZm9UZXh0ID0gbmV3IFBJWEkuVGV4dCgnUGxhY2UgcGllY2Ugb24gYm9hcmQnLCB7IGZvbnQ6ICdib2xkIDM2cHggQXJpYWwnLCBmaWxsOiAnI2ZmZmYwMCcsIGFsaWduOiAnbGVmdCcsIHN0cm9rZTogJyMwMDAwRkYnLCBzdHJva2VUaGlja25lc3M6IDQgfSk7XHJcbiAgICB0aGlzLmluZm9UZXh0LnBvc2l0aW9uLnggPSBsYXlvdXRTdGFydFB0Lng7XHJcbiAgICB0aGlzLmluZm9UZXh0LnBvc2l0aW9uLnkgPSBsYXlvdXRTdGFydFB0Lnk7XHJcbiAgICBzdGFnZS5hZGRDaGlsZCh0aGlzLmluZm9UZXh0KTtcclxuXHJcbiAgICB0aGlzLmNvdW50ZXJUZXh0ID0gbmV3IFBJWEkuVGV4dCgnU2NvcmU6IDAnLCB7IGZvbnQ6ICdib2xkIDI0cHggQXJpYWwnLCBmaWxsOiAnI2ZmMDAwMCcsIGFsaWduOiAnbGVmdCcsIHN0cm9rZTogJyM3NzIyMDAnLCBzdHJva2VUaGlja25lc3M6IDQgfSk7XHJcbiAgICB0aGlzLmNvdW50ZXJUZXh0LnBvc2l0aW9uLnggPSBsYXlvdXRTdGFydFB0Lng7XHJcbiAgICB0aGlzLmNvdW50ZXJUZXh0LnBvc2l0aW9uLnkgPSBsYXlvdXRTdGFydFB0LnkgKyB0ZXh0U2xvdFNpemU7XHJcbiAgICBzdGFnZS5hZGRDaGlsZCh0aGlzLmNvdW50ZXJUZXh0KTtcclxuXHJcbiAgICAvLyBTZXQgdXAgc2VsZWN0YWJsZSBtZW51IGl0ZW1zXHJcbiAgICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcblxyXG4gICAgbGV0IG1haW5UZXh0RGVzYyA9IHsgZm9udDogJ2JvbGQgMzBweCBBcmlhbCcsIGZpbGw6ICcjZmYwMGZmJywgYWxpZ246ICdsZWZ0Jywgc3Ryb2tlOiAnIzAwMDBGRicsIHN0cm9rZVRoaWNrbmVzczogNCB9O1xyXG4gICAgbGV0IGN1cnJlbnRHYW1lOlRoZUdhbWUgPSB0aGlzO1xyXG4gICAgdGhpcy5yZXNldFRleHQgPSBuZXcgUElYSS5UZXh0KCdSZXNldCcsIG1haW5UZXh0RGVzYyk7XHJcbiAgICB0aGlzLnJlc2V0VGV4dC5wb3NpdGlvbi54ID0gbGF5b3V0U3RhcnRQdC54O1xyXG4gICAgdGhpcy5yZXNldFRleHQucG9zaXRpb24ueSA9IGxheW91dEVuZFB0LnkgLSB0ZXh0U2xvdFNpemUgKiAzO1xyXG4gICAgc3RhZ2UuYWRkQ2hpbGQodGhpcy5yZXNldFRleHQpO1xyXG4gICAgdGhpcy5yZXNldFRleHQuYnV0dG9uTW9kZSA9IHRydWU7XHJcbiAgICB0aGlzLnJlc2V0VGV4dC5pbnRlcmFjdGl2ZSA9IHRydWU7XHJcbiAgICB0aGlzLnJlc2V0VGV4dC5vbignbW91c2Vkb3duJywgZnVuY3Rpb24oKSB7XHJcbiAgICAgIGN1cnJlbnRHYW1lLmhhbmRsZVJlc2V0UHJlc3NlZCgpO1xyXG4gICAgfSk7XHJcbiAgICB0aGlzLnJlc2V0VGV4dC52aXNpYmxlID0gZmFsc2U7XHJcblxyXG4gICAgdGhpcy5yZXNodWZmbGVUZXh0ID0gbmV3IFBJWEkuVGV4dCgnUmVzaHVmZmxlJywgbWFpblRleHREZXNjKTtcclxuICAgIHRoaXMucmVzaHVmZmxlVGV4dC5wb3NpdGlvbi54ID0gbGF5b3V0U3RhcnRQdC54O1xyXG4gICAgdGhpcy5yZXNodWZmbGVUZXh0LnBvc2l0aW9uLnkgPSBsYXlvdXRFbmRQdC55IC0gdGV4dFNsb3RTaXplICogMjtcclxuICAgIHN0YWdlLmFkZENoaWxkKHRoaXMucmVzaHVmZmxlVGV4dCk7XHJcbiAgICB0aGlzLnJlc2h1ZmZsZVRleHQuYnV0dG9uTW9kZSA9IHRydWU7XHJcbiAgICB0aGlzLnJlc2h1ZmZsZVRleHQuaW50ZXJhY3RpdmUgPSB0cnVlO1xyXG4gICAgdGhpcy5yZXNodWZmbGVUZXh0Lm9uKCdtb3VzZWRvd24nLCBmdW5jdGlvbigpIHtcclxuICAgICAgY3VycmVudEdhbWUuaGFuZGxlUmVzaHVmZmxlUHJlc3NlZCgpO1xyXG4gICAgfSk7XHJcblxyXG4gICAgdGhpcy5wYXVzZVRleHQgPSBuZXcgUElYSS5UZXh0KCdQYXVzZScsIG1haW5UZXh0RGVzYyk7XHJcbiAgICB0aGlzLnBhdXNlVGV4dC5wb3NpdGlvbi54ID0gbGF5b3V0U3RhcnRQdC54O1xyXG4gICAgdGhpcy5wYXVzZVRleHQucG9zaXRpb24ueSA9IGxheW91dEVuZFB0LnkgLSB0ZXh0U2xvdFNpemU7XHJcbiAgICBzdGFnZS5hZGRDaGlsZCh0aGlzLnBhdXNlVGV4dCk7XHJcbiAgICB0aGlzLnBhdXNlVGV4dC5idXR0b25Nb2RlID0gdHJ1ZTtcclxuICAgIHRoaXMucGF1c2VUZXh0LmludGVyYWN0aXZlID0gdHJ1ZTtcclxuICAgIHRoaXMucGF1c2VUZXh0Lm9uKCdtb3VzZWRvd24nLCBmdW5jdGlvbigpIHtcclxuICAgICAgY3VycmVudEdhbWUuaGFuZGxlUGF1c2VQcmVzc2VkKCk7XHJcbiAgICB9KTtcclxuICAgIHRoaXMucGF1c2VUZXh0LnZpc2libGUgPSBmYWxzZTtcclxuXHJcbiAgICB0aGlzLnJlc2l6ZVRleHQgPSBuZXcgUElYSS5UZXh0KCdCb2FyZCBTaXplOiAnICsgdGhpcy5ib2FyZFNpemUsIG1haW5UZXh0RGVzYyk7XHJcbiAgICB0aGlzLnJlc2l6ZVRleHQucG9zaXRpb24ueCA9IGxheW91dFN0YXJ0UHQueDtcclxuICAgIHRoaXMucmVzaXplVGV4dC5wb3NpdGlvbi55ID0gbGF5b3V0RW5kUHQueSAtIHRleHRTbG90U2l6ZSAqIDQ7XHJcbiAgICBzdGFnZS5hZGRDaGlsZCh0aGlzLnJlc2l6ZVRleHQpO1xyXG4gICAgdGhpcy5yZXNpemVUZXh0LnZpc2libGUgPSB0cnVlO1xyXG5cclxuICAgIC8vIEhhbmR5IGZhY3RvcnkgZnVuY3Rpb25cclxuICAgIGxldCBtYWtlQnV0dG9uID0gZnVuY3Rpb24oZmlsZW5hbWU6c3RyaW5nKSB7XHJcbiAgICAgIGxldCBzcHJpdGU6UElYSS5TcHJpdGUgPSBQSVhJLlNwcml0ZS5mcm9tSW1hZ2UoZmlsZW5hbWUpO1xyXG4gICAgICBzcHJpdGUudGludCA9IDB4ODg4ODg4O1xyXG4gICAgICBzcHJpdGUud2lkdGggPSB0ZXh0U2xvdFNpemUgKiAwLjg7XHJcbiAgICAgIHNwcml0ZS5oZWlnaHQgPSB0ZXh0U2xvdFNpemUgKiAwLjg7XHJcbiAgICAgIHN0YWdlLmFkZENoaWxkKHNwcml0ZSk7XHJcbiAgICAgIHNwcml0ZS5idXR0b25Nb2RlID0gdHJ1ZTtcclxuICAgICAgc3ByaXRlLmludGVyYWN0aXZlID0gdHJ1ZTtcclxuICAgICAgc3ByaXRlLm9uKCdtb3VzZW92ZXInLCBmdW5jdGlvbigpIHtcclxuICAgICAgICB0aGlzLnRpbnQgPSAweGZmZmZmZjtcclxuICAgICAgfSk7XHJcbiAgICAgIHNwcml0ZS5vbignbW91c2VvdXQnLCBmdW5jdGlvbigpIHtcclxuICAgICAgICB0aGlzLnRpbnQgPSAweDg4ODg4ODtcclxuICAgICAgfSk7XHJcbiAgICAgIHNwcml0ZS52aXNpYmxlID0gdHJ1ZTtcclxuICAgICAgcmV0dXJuIHNwcml0ZTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBCdXR0b24gZm9yIGNoYW5naW5nIGJvYXJkIHNpemVcclxuICAgIHRoaXMubWludXNTcHJpdGUgPSBtYWtlQnV0dG9uKCdpbWFnZXMvbWludXMtaWNvbi5wbmcnKTtcclxuICAgIHRoaXMubWludXNTcHJpdGUueCA9IHRoaXMucmVzaXplVGV4dC54ICsgdGhpcy5yZXNpemVUZXh0LndpZHRoICsgMTA7XHJcbiAgICB0aGlzLm1pbnVzU3ByaXRlLnkgPSB0aGlzLnJlc2l6ZVRleHQueTtcclxuICAgIHRoaXMubWludXNTcHJpdGUub24oJ21vdXNlZG93bicsIGZ1bmN0aW9uKCkge1xyXG4gICAgICBjdXJyZW50R2FtZS5oYW5kbGVSZXNpemVQcmVzc2VkKC0xKTtcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEJ1dHRvbiBmb3IgY2hhbmdpbmcgYm9hcmQgc2l6ZVxyXG4gICAgdGhpcy5wbHVzU3ByaXRlID0gbWFrZUJ1dHRvbignaW1hZ2VzL3BsdXMtaWNvbi5wbmcnKTtcclxuICAgIHRoaXMucGx1c1Nwcml0ZS54ID0gdGhpcy5taW51c1Nwcml0ZS54ICsgdGhpcy5taW51c1Nwcml0ZS53aWR0aCArIDEwO1xyXG4gICAgdGhpcy5wbHVzU3ByaXRlLnkgPSB0aGlzLm1pbnVzU3ByaXRlLnk7XHJcbiAgICB0aGlzLnBsdXNTcHJpdGUub24oJ21vdXNlZG93bicsIGZ1bmN0aW9uKCkge1xyXG4gICAgICBjdXJyZW50R2FtZS5oYW5kbGVSZXNpemVQcmVzc2VkKDEpO1xyXG4gICAgfSk7XHJcblxyXG4gICAgdGhpcy5jaGVja2VyQ2hhcmFjdGVyID0gbnVsbDtcclxuICAgIHRoaXMuY2hlY2tNYXJrQ2hhcmFjdGVyID0gbnVsbDtcclxuICAgIC8vIE1ha2Ugc3VyZSBjaGFyYWN0ZXJzIGV4aXN0IGJ5IG5vd1xyXG4gICAgdGhpcy5fY3JlYXRlQ2hhcmFjdGVycygpO1xyXG5cclxuICAgIHRoaXMuZ2FtZVN0YXRlID0gXCJyZWFkeVwiO1xyXG4gICAgdGhpcy5wYXVzZWQgPSBmYWxzZTtcclxuICAgIHRoaXMuc2NvcmVDb3VudGVyID0gMDtcclxuICB9XHJcblxyXG4gIC8vIE1haW4gdXBkYXRlIGZ1bmN0aW9uLiBkZWx0YVQgaXMgc2Vjb25kcyBlbGFwc2VkIHNpbmNlIGxhc3QgY2FsbC5cclxuICB1cGRhdGUoZGVsdGFUOm51bWJlcikge1xyXG4gICAgbGV0IGNoYXJhY3RlcnM6R3JpZENoYXJhY3RlcltdID0gW3RoaXMuY2hlY2tlckNoYXJhY3RlciwgdGhpcy5jaGVja01hcmtDaGFyYWN0ZXJdO1xyXG5cclxuICAgIGlmICghdGhpcy5jaGVja2VyQ2hhcmFjdGVyKSB7XHJcbiAgICAgIC8vIG5vIGNoYXJhY3RlcnMgZXhpc3QgeWV0LCBubyBwb2ludCBpbiB1cGRhdGluZ1xyXG4gICAgICByZXR1cm47XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKHRoaXMucGF1c2VkKSB7XHJcbiAgICAgIGZvciAobGV0IGNoYXIgb2YgY2hhcmFjdGVycykge1xyXG4gICAgICAgIGNoYXIudXBkYXRlUGF1c2VkKGRlbHRhVCk7XHJcbiAgICAgIH1cclxuICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG5cclxuICAgIGZvciAobGV0IGNoYXIgb2YgY2hhcmFjdGVycykge1xyXG4gICAgICBjaGFyLnVwZGF0ZShkZWx0YVQpO1xyXG4gICAgICBpZiAoY2hhci5yZWFkeVRvTW92ZSgpKSB7XHJcbiAgICAgICAgLy8gSGFzIGNoYXJhY3RlciBmYWxsZW4gb2ZmIGdyaWQ/XHJcbiAgICAgICAgaWYgKGNoYXIuY2VsbEluZGV4RG93biA8IDAgfHwgY2hhci5jZWxsSW5kZXhEb3duID49IHRoaXMudGhlR3JpZC5kaW1ZIHx8XHJcbiAgICAgICAgICBjaGFyLmNlbGxJbmRleFJpZ2h0IDwgMCB8fCBjaGFyLmNlbGxJbmRleFJpZ2h0ID49IHRoaXMudGhlR3JpZC5kaW1YKSB7XHJcbiAgICAgICAgICBjaGFyLmlzT25HcmlkID0gZmFsc2U7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGVsc2VcclxuICAgICAgICB7XHJcbiAgICAgICAgICAvLyBDaGFyYWN0ZXIgaXMgc3RpbGwgb24gYm9hcmRcclxuICAgICAgICAgIGxldCBjZWxsOmdyaWRGaWxlLkdyaWRDZWxsID0gdGhpcy50aGVHcmlkLmdldENlbGwoY2hhci5jZWxsSW5kZXhSaWdodCwgY2hhci5jZWxsSW5kZXhEb3duKTtcclxuICAgICAgICAgIGNlbGwuc2V0VmlzaXRlZCh0cnVlKTtcclxuICAgICAgICAgIGNoYXIucmVxdWVzdE5ld01vdmUoY2VsbC5kaXJlY3Rpb24pO1xyXG4gICAgICAgICAgaWYgKGNoYXIgPT0gdGhpcy5jaGVja01hcmtDaGFyYWN0ZXIpIHtcclxuICAgICAgICAgICAgLy8gdGhlIGZhc3Rlci1tb3ZpbmcgY2hhcmFjdGVyIGFkdmFuY2VzLCBzbyBpbmNyZW1lbnQgc2NvcmVcclxuICAgICAgICAgICAgdGhpcy5zY29yZUNvdW50ZXIgPSB0aGlzLnNjb3JlQ291bnRlciArIDE7XHJcbiAgICAgICAgICAgIHRoaXMuY291bnRlclRleHQudGV4dCA9ICdTY29yZTogJyArIHRoaXMuc2NvcmVDb3VudGVyO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgfSAvLyBlbmQgZm9yXHJcblxyXG4gICAgaWYgKCF0aGlzLmNoZWNrZXJDaGFyYWN0ZXIuaXNPbkdyaWQpIHtcclxuICAgICAgLy8gc2xvd2VyLW1vdmluZyBwaWVjZSBoYXMgbGVmdCB0aGUgYm9hcmRcclxuICAgICAgdGhpcy5jaGVja2VyQ2hhcmFjdGVyLnNldFN0YXRlKFwiZnJvemVuXCIpO1xyXG4gICAgfVxyXG4gICAgaWYgKCF0aGlzLmNoZWNrTWFya0NoYXJhY3Rlci5pc09uR3JpZCkge1xyXG4gICAgICAvLyBmYXN0ZXItbW92aW5nIHBpZWNlIGhhcyBsZWZ0IHRoZSBib2FyZFxyXG4gICAgICB0aGlzLmNoZWNrTWFya0NoYXJhY3Rlci5zZXRTdGF0ZShcImR5aW5nXCIpO1xyXG4gICAgICB0aGlzLmNoZWNrZXJDaGFyYWN0ZXIuc2V0U3RhdGUoXCJmcm96ZW5cIik7XHJcbiAgICAgIHRoaXMuaW5mb1RleHQudGV4dCA9IFwiTm8gTG9vcFwiO1xyXG4gICAgICB0aGlzLl9zZXRHYW1lU3RhdGUoXCJkb25lXCIpO1xyXG4gICAgfVxyXG4gICAgLy8gQXJlIGJvdGggcGllY2VzIG9uIHRoZSBzYW1lIHNxdWFyZT8gSWYgc28sIHRoZSBmYXN0ZXItbW92aW5nIG9uZSBoYXMgY2F1Z2h0IHVwIHdpdGhcclxuICAgIC8vIHRoZSBzbG93ZXIuXHJcbiAgICBlbHNlIGlmIChjaGFyYWN0ZXJzWzBdLnRlc3RDb2xsaXNpb24oY2hhcmFjdGVyc1sxXSkpIHtcclxuICAgICAgICAvLyBXZSd2ZSBjYXVnaHQgdXBcclxuICAgICAgICB0aGlzLmNoZWNrZXJDaGFyYWN0ZXIuc2V0U3RhdGUoXCJmcm96ZW5cIik7XHJcbiAgICAgICAgdGhpcy5jaGVja01hcmtDaGFyYWN0ZXIuc2V0U3RhdGUoXCJleHBsb2RlXCIpO1xyXG4gICAgICAgIHRoaXMuaW5mb1RleHQudGV4dCA9IFwiTG9vcCBEZXRlY3RlZCFcIlxyXG4gICAgICAgIHRoaXMuX3NldEdhbWVTdGF0ZShcImRvbmVcIik7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICAvLyBDYWxsZWQgd2hlbiB1c2VyIGNsaWNrcyBvbiBhbiBhcnJvdyBjZWxsXHJcbiAgaGFuZGxlQ2VsbFByZXNzKHBpeFg6bnVtYmVyLCBwaXhZOm51bWJlcikge1xyXG4gICAgbGV0IGNlbGxYID0gTWF0aC5mbG9vcihwaXhYIC8gR3JpZENoYXJhY3Rlci5jZWxsRGltKTtcclxuICAgIGxldCBjZWxsWSA9IE1hdGguZmxvb3IocGl4WSAvIEdyaWRDaGFyYWN0ZXIuY2VsbERpbSk7XHJcbiAgICBjb25zb2xlLmxvZyhcImJ1dHRvbiBjZWxsOiBcIiArIGNlbGxYICsgXCIsXCIgKyBjZWxsWSk7XHJcbiAgICBpZiAodGhpcy5jaGVja2VyQ2hhcmFjdGVyLmdldFN0YXRlKCkgPT0gXCJpbmFjdGl2ZVwiKSB7XHJcbiAgICAgIHRoaXMuY2hlY2tlckNoYXJhY3Rlci5zZXRQb3NpdGlvbihjZWxsWCwgY2VsbFkpO1xyXG4gICAgICB0aGlzLmNoZWNrTWFya0NoYXJhY3Rlci5zZXRQb3NpdGlvbihjZWxsWCwgY2VsbFkpO1xyXG4gICAgICB0aGlzLl9zZXRHYW1lU3RhdGUoXCJpbiBwcm9ncmVzc1wiKTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIGhhbmRsZUNlbGxPdmVyKHBpeFg6bnVtYmVyLCBwaXhZOm51bWJlcikge1xyXG4gICAgbGV0IGNlbGxYID0gTWF0aC5mbG9vcihwaXhYIC8gR3JpZENoYXJhY3Rlci5jZWxsRGltKTtcclxuICAgIGxldCBjZWxsWSA9IE1hdGguZmxvb3IocGl4WSAvIEdyaWRDaGFyYWN0ZXIuY2VsbERpbSk7XHJcbiAgICBsZXQgY2VsbDpncmlkRmlsZS5HcmlkQ2VsbCA9IHRoaXMudGhlR3JpZC5nZXRDZWxsKGNlbGxYLCBjZWxsWSk7XHJcbiAgICBjZWxsLnNldEhpZ2hsaWdodCh0cnVlKTtcclxuICB9XHJcblxyXG4gIGhhbmRsZUNlbGxPdXQocGl4WDpudW1iZXIsIHBpeFk6bnVtYmVyKSB7XHJcbiAgICBsZXQgY2VsbFggPSBNYXRoLmZsb29yKHBpeFggLyBHcmlkQ2hhcmFjdGVyLmNlbGxEaW0pO1xyXG4gICAgbGV0IGNlbGxZID0gTWF0aC5mbG9vcihwaXhZIC8gR3JpZENoYXJhY3Rlci5jZWxsRGltKTtcclxuICAgIGxldCBjZWxsOmdyaWRGaWxlLkdyaWRDZWxsID0gdGhpcy50aGVHcmlkLmdldENlbGwoY2VsbFgsIGNlbGxZKTtcclxuICAgIGNlbGwuc2V0SGlnaGxpZ2h0KGZhbHNlKTtcclxuICB9XHJcblxyXG4gIGhhbmRsZVJlc2V0UHJlc3NlZCgpIHtcclxuICAgIHRoaXMudGhlR3JpZC5yZXNldEFycm93cygpO1xyXG4gICAgdGhpcy5fc2V0R2FtZVN0YXRlKFwicmVhZHlcIik7XHJcbiAgfVxyXG5cclxuICBoYW5kbGVSZXNodWZmbGVQcmVzc2VkKCkge1xyXG4gICAgdGhpcy50aGVHcmlkLnJlc2h1ZmZsZUFycm93cygpO1xyXG4gICAgdGhpcy5fc2V0R2FtZVN0YXRlKFwicmVhZHlcIik7XHJcbiAgfVxyXG5cclxuICBoYW5kbGVQYXVzZVByZXNzZWQoKSB7XHJcbiAgICBsZXQgcGF1c2VkU3RhdGU6Ym9vbGVhbiA9ICF0aGlzLnBhdXNlZDtcclxuXHJcbiAgICBpZiAocGF1c2VkU3RhdGUpIHtcclxuICAgICAgdGhpcy5wYXVzZVRleHQudGV4dCA9IFwiVW5wYXVzZVwiO1xyXG4gICAgfVxyXG4gICAgZWxzZSB7XHJcbiAgICAgIHRoaXMucGF1c2VUZXh0LnRleHQgPSBcIlBhdXNlXCI7XHJcbiAgICB9XHJcbiAgICB0aGlzLmNoZWNrZXJDaGFyYWN0ZXIuc2V0UGF1c2VkKHBhdXNlZFN0YXRlKTtcclxuICAgIHRoaXMuY2hlY2tNYXJrQ2hhcmFjdGVyLnNldFBhdXNlZChwYXVzZWRTdGF0ZSk7XHJcbiAgICB0aGlzLnBhdXNlZCA9IHBhdXNlZFN0YXRlO1xyXG4gIH1cclxuXHJcbiAgaGFuZGxlUmVzaXplUHJlc3NlZChkaXI6bnVtYmVyKSB7XHJcbiAgICBsZXQgb2xkU2l6ZTpudW1iZXIgPSB0aGlzLmJvYXJkU2l6ZTtcclxuICAgIHRoaXMuYm9hcmRTaXplID0gdGhpcy5ib2FyZFNpemUgKyBkaXI7XHJcbiAgICBpZiAodGhpcy5ib2FyZFNpemUgPCAyKSB7XHJcbiAgICAgIHRoaXMuYm9hcmRTaXplID0gMjtcclxuICAgIH1cclxuICAgIGVsc2UgaWYgKHRoaXMuYm9hcmRTaXplID4gMzIpIHtcclxuICAgICAgdGhpcy5ib2FyZFNpemUgPSAzMjtcclxuICAgIH1cclxuICAgIGlmIChvbGRTaXplID09IHRoaXMuYm9hcmRTaXplKSB7XHJcbiAgICAgIHJldHVybjtcclxuICAgIH1cclxuICAgIHRoaXMuX2Rlc3Ryb3lDaGFyYWN0ZXJzKCk7XHJcbiAgICB0aGlzLl9jcmVhdGVHcmlkKCk7XHJcbiAgICB0aGlzLl9jcmVhdGVDaGFyYWN0ZXJzKCk7XHJcbiAgICB0aGlzLnJlc2l6ZVRleHQudGV4dCA9ICdCb2FyZCBTaXplOiAnICsgdGhpcy5ib2FyZFNpemU7XHJcbiAgICB0aGlzLl9zZXRHYW1lU3RhdGUoXCJyZWFkeVwiKTtcclxuICB9XHJcblxyXG4gIC8vIEhlbHBlciBmdW5jdGlvbiB0byBjcmVhdGUgdGhlIEFycm93R3JpZFxyXG4gIHByaXZhdGUgX2NyZWF0ZUdyaWQoKSB7XHJcbiAgICBpZiAodGhpcy50aGVHcmlkKSB7XHJcbiAgICAgIHRoaXMudGhlR3JpZC5jbGVhbnVwKHRoaXMuc3RhZ2UpO1xyXG4gICAgfVxyXG4gICAgbGV0IGJvYXJkRGltcyA9IHt3OjUwMCwgaDo1MDB9IC8vIGluIHBpeGVsc1xyXG4gICAgZ3JpZEZpbGUuR3JpZENlbGwuY2VsbERpbSA9IE1hdGguZmxvb3IoYm9hcmREaW1zLncgLyB0aGlzLmJvYXJkU2l6ZSk7XHJcbiAgICBHcmlkQ2hhcmFjdGVyLmNlbGxEaW0gPSBncmlkRmlsZS5HcmlkQ2VsbC5jZWxsRGltO1xyXG4gICAgdGhpcy50aGVHcmlkID0gbmV3IGdyaWRGaWxlLkFycm93R3JpZCh0aGlzLmJvYXJkU2l6ZSwgdGhpcy5ib2FyZFNpemUsIHRoaXMuc3RhZ2UpO1xyXG4gICAgbGV0IGdhbWVJbnN0YW5jZTpUaGVHYW1lID0gdGhpcztcclxuICAgIC8vIFNldCB1cCBoYW5kbGVycyBzbyB0aGF0IGNlbGxzIG9uIGJvYXJkIHdpbGwgYWN0IGFzIG1vdXNlIGJ1dHRvbnNcclxuICAgIGxldCBvbkJ1dHRvbkRvd24gPSBmdW5jdGlvbigpIHtcclxuICAgICAgZ2FtZUluc3RhbmNlLmhhbmRsZUNlbGxQcmVzcyh0aGlzLngsIHRoaXMueSk7XHJcbiAgICB9XHJcbiAgICBsZXQgb25CdXR0b25PdmVyID0gZnVuY3Rpb24oKSB7XHJcbiAgICAgIGdhbWVJbnN0YW5jZS5oYW5kbGVDZWxsT3Zlcih0aGlzLngsIHRoaXMueSk7XHJcbiAgICB9XHJcbiAgICBsZXQgb25CdXR0b25PdXQgPSBmdW5jdGlvbigpIHtcclxuICAgICAgZ2FtZUluc3RhbmNlLmhhbmRsZUNlbGxPdXQodGhpcy54LCB0aGlzLnkpO1xyXG4gICAgfVxyXG4gICAgdGhpcy50aGVHcmlkLnNldE1vdXNlRnVuY3Rpb25zKG9uQnV0dG9uRG93biwgb25CdXR0b25PdmVyLCBvbkJ1dHRvbk91dCk7XHJcbiAgfVxyXG5cclxuICAvLyBIZWxwZXIgZnVuY3Rpb24gdG8gY3JlYXRlIHRoZSBnYW1lIGNoYXJhY3RlcnNcclxuICBwcml2YXRlIF9jcmVhdGVDaGFyYWN0ZXJzKCkge1xyXG4gICAgaWYgKHRoaXMuY2hlY2tlckNoYXJhY3Rlcikge1xyXG4gICAgICAvLyBBbHJlYWR5IGV4aXN0XHJcbiAgICAgIHJldHVybjtcclxuICAgIH1cclxuICAgIEdyaWRDaGFyYWN0ZXIuY2VsbERpbSA9IGdyaWRGaWxlLkdyaWRDZWxsLmNlbGxEaW07XHJcbiAgICB0aGlzLmNoZWNrZXJDaGFyYWN0ZXIgPSBuZXcgR3JpZENoYXJhY3RlcignaW1hZ2VzL3JlZC1jaGVja2VyLnBuZycsIHRoaXMudGhlR3JpZC5jb250YWluZXIpO1xyXG4gICAgdGhpcy5jaGVja2VyQ2hhcmFjdGVyLm1vdmVUaW1lID0gMC41O1xyXG4gICAgdGhpcy5jaGVja01hcmtDaGFyYWN0ZXIgPSBuZXcgR3JpZENoYXJhY3RlcignaW1hZ2VzL2dyZWVuLWNoZWNrLW1hcmsucG5nJywgdGhpcy50aGVHcmlkLmNvbnRhaW5lcik7XHJcbiAgICB0aGlzLmNoZWNrTWFya0NoYXJhY3Rlci5tb3ZlVGltZSA9IDAuMjU7XHJcbiAgfVxyXG5cclxuICAvLyBIZWxwZXIgZnVuY3Rpb24gdG8gZGVzdHJveSB0aGUgZ2FtZSBjaGFyYWN0ZXJzIChzaG91bGQgYmUgZG9uZSBiZWZvcmUgZ3JpZCBkZXN0cnVjdGlvbilcclxuICBwcml2YXRlIF9kZXN0cm95Q2hhcmFjdGVycygpIHtcclxuICAgIHRoaXMuY2hlY2tlckNoYXJhY3Rlci5jbGVhbnVwKCk7XHJcbiAgICB0aGlzLmNoZWNrZXJDaGFyYWN0ZXIgPSBudWxsO1xyXG4gICAgdGhpcy5jaGVja01hcmtDaGFyYWN0ZXIuY2xlYW51cCgpO1xyXG4gICAgdGhpcy5jaGVja01hcmtDaGFyYWN0ZXIgPSBudWxsO1xyXG4gIH1cclxuXHJcbiAgLy8gUHV0cyB0aGUgZ2FtZSBpbnRvIG9uZSBvZiBpdHMgb3ZlcmFsbCBzdGF0ZXMuIEFmZmVjdHMgVUkuXHJcbiAgLy8gICBcInJlYWR5XCIgPSByZWFkeSB0byBwbGFjZSBhIHBpZWNlXHJcbiAgLy8gICBcImluIHByb2dyZXNzXCIgPSBnYW1lIGlzIGJlaW5nIHBsYWNlXHJcbiAgLy8gICBcImRvbmVcIiA9IGdhbWUgaGFzIHJlYWNoZWQgZW5kIHN0YXRlXHJcbiAgcHJpdmF0ZSBfc2V0R2FtZVN0YXRlKHN0YXRlOnN0cmluZykge1xyXG4gICAgY29uc29sZS5sb2coJ0dhbWUgc3RhdGUgdG86ICcgKyBzdGF0ZSk7XHJcbiAgICBpZiAoc3RhdGUgPT0gXCJpbiBwcm9ncmVzc1wiKSB7XHJcbiAgICAgIHRoaXMuaW5mb1RleHQudGV4dCA9IFwiVHJhdmVsaW5nLi4uXCJcclxuICAgICAgdGhpcy5nYW1lU3RhdGUgPSBcImluIHByb2dyZXNzXCI7XHJcbiAgICAgIHRoaXMucmVzZXRUZXh0LnZpc2libGUgPSBmYWxzZTtcclxuICAgICAgdGhpcy5yZXNodWZmbGVUZXh0LnZpc2libGUgPSBmYWxzZTtcclxuICAgICAgdGhpcy5yZXNpemVUZXh0LnZpc2libGUgPSBmYWxzZTtcclxuICAgICAgdGhpcy5taW51c1Nwcml0ZS52aXNpYmxlID0gZmFsc2U7XHJcbiAgICAgIHRoaXMucGx1c1Nwcml0ZS52aXNpYmxlID0gZmFsc2U7XHJcbiAgICAgIHRoaXMucGF1c2VUZXh0LnZpc2libGUgPSB0cnVlO1xyXG4gICAgfVxyXG4gICAgZWxzZSBpZiAoc3RhdGUgPT0gXCJyZWFkeVwiKSB7XHJcbiAgICAgIHRoaXMuY2hlY2tlckNoYXJhY3Rlci5zZXRTdGF0ZShcImluYWN0aXZlXCIpO1xyXG4gICAgICB0aGlzLmNoZWNrTWFya0NoYXJhY3Rlci5zZXRTdGF0ZShcImluYWN0aXZlXCIpO1xyXG4gICAgICB0aGlzLmluZm9UZXh0LnRleHQgPSBcIlBsYWNlIHBpZWNlIG9uIGJvYXJkXCI7XHJcbiAgICAgIHRoaXMuc2NvcmVDb3VudGVyID0gMDtcclxuICAgICAgdGhpcy5jb3VudGVyVGV4dC50ZXh0ID0gJ1Njb3JlOiAnICsgdGhpcy5zY29yZUNvdW50ZXI7XHJcbiAgICB9XHJcbiAgICBlbHNlIGlmIChzdGF0ZSA9PSBcImRvbmVcIikge1xyXG4gICAgICB0aGlzLnJlc2V0VGV4dC52aXNpYmxlID0gdHJ1ZTtcclxuICAgICAgdGhpcy5yZXNodWZmbGVUZXh0LnZpc2libGUgPSB0cnVlO1xyXG4gICAgICB0aGlzLnJlc2l6ZVRleHQudmlzaWJsZSA9IHRydWU7XHJcbiAgICAgIHRoaXMubWludXNTcHJpdGUudmlzaWJsZSA9IHRydWU7XHJcbiAgICAgIHRoaXMucGx1c1Nwcml0ZS52aXNpYmxlID0gdHJ1ZTtcclxuICAgICAgdGhpcy5wYXVzZVRleHQudmlzaWJsZSA9IGZhbHNlO1xyXG4gICAgfVxyXG4gIH1cclxufVxyXG4iLCJpbXBvcnQgUElYSSA9IHJlcXVpcmUoJ3BpeGkuanMnKTtcclxuXHJcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcbi8vIENsYXNzIGRlZmluaXRpb25zXHJcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcblxyXG4vKlxyXG4gIFJlcHJlc2VudHMgYSBjZWxsIG9uIHRoZSBnYW1lIGJvYXJkLiBBIGNlbGwgY29udGFpbnMgYW4gYXJyb3cgU3ByaXRlXHJcbiAgd2hpY2ggcG9pbnRzIGluIG9uZSBvZiBmb3VyIGNhcmRpbmFsIGRpcmVjdGlvbnMuIEVhY2ggY2VsbCBhY3RzIGFzXHJcbiAgYSBidXR0b24gYW5kIGNhbiBiZSBjbGlja2VkLlxyXG4qL1xyXG5leHBvcnQgY2xhc3MgR3JpZENlbGwge1xyXG4gIHNwcml0ZTpQSVhJLlNwcml0ZTtcclxuICBzdGF0aWMgY2VsbERpbTpudW1iZXIgPSA1MDsgLy8gZGltZW5zaW9uIG9mIGEgY2VsbCBpbiBwaXhlbHNcclxuXHJcbiAgLy8gQXJyb3cncyBmYWNpbmcgZGlyZWN0aW9uOiAwPWxlZnQsIDE9dXAsIDI9cmlnaHQsIDM9ZG93blxyXG4gIGRpcmVjdGlvbjpudW1iZXI7XHJcbiAgY2VsbFg6bnVtYmVyOyAvLyBjb29yZGluYXRlIG9uIHRoZSBnYW1lIGJvYXJkLCBmcm9tIGxlZnRcclxuICBjZWxsWTpudW1iZXI7IC8vIGNvb3JkaW5hdGUgb24gdGhlIGdhbWUgYm9hcmQsIGZyb20gdG9wXHJcbiAgdmlzaXRlZDpib29sZWFuOyAvLyBpZiB0aGUgY2VsbCBoYXMgYmVlbiB2aXNpdGVkIGJ5IGdhbWUgcGllY2VcclxuXHJcbiAgY29uc3RydWN0b3IoaTpudW1iZXIsIGo6bnVtYmVyLCBjb250YWluZXI6UElYSS5Db250YWluZXIpIHtcclxuICAgIHZhciBhcnJvdyA9IFBJWEkuU3ByaXRlLmZyb21JbWFnZSgnaW1hZ2VzL2Fycm93LWljb24ucG5nJyk7XHJcbiAgICBhcnJvdy54ID0gR3JpZENlbGwuY2VsbERpbSAqIChpICsgMC41KTtcclxuICAgIGFycm93LnkgPSBHcmlkQ2VsbC5jZWxsRGltICogKGogKyAwLjUpO1xyXG4gICAgYXJyb3cud2lkdGggPSBHcmlkQ2VsbC5jZWxsRGltO1xyXG4gICAgYXJyb3cuaGVpZ2h0ID0gR3JpZENlbGwuY2VsbERpbTtcclxuICAgIGFycm93LmFuY2hvci54ID0gMC41O1xyXG4gICAgYXJyb3cuYW5jaG9yLnkgPSAwLjU7XHJcbiAgICBjb250YWluZXIuYWRkQ2hpbGQoYXJyb3cpO1xyXG4gICAgdGhpcy5jZWxsWCA9IGk7XHJcbiAgICB0aGlzLmNlbGxZID0gajtcclxuICAgIHRoaXMuc3ByaXRlID0gYXJyb3c7XHJcbiAgICB0aGlzLmRpcmVjdGlvbiA9IDA7XHJcbiAgICB0aGlzLnNldFZpc2l0ZWQoZmFsc2UpO1xyXG4gIH1cclxuXHJcbiAgc2V0TW91c2VGdW5jdGlvbnMob25CdXR0b25Eb3duOigpPT52b2lkLCBvbkJ1dHRvbk92ZXI6KCk9PnZvaWQsIG9uQnV0dG9uT3V0OigpPT52b2lkKSB7XHJcbiAgICAgIC8vIG9uRXZlbnQgZnVuY3Rpb25zIGFyZSBnbG9iYWwgZnVuY3Rpb25zICh0b3dhcmRzIGJvdHRvbSBvZiBmaWxlKVxyXG4gICAgICB0aGlzLnNwcml0ZS5idXR0b25Nb2RlID0gdHJ1ZTtcclxuICAgICAgdGhpcy5zcHJpdGUuaW50ZXJhY3RpdmUgPSB0cnVlO1xyXG4gICAgICB0aGlzLnNwcml0ZS5vbignbW91c2Vkb3duJywgb25CdXR0b25Eb3duKTtcclxuICAgICAgdGhpcy5zcHJpdGUub24oJ21vdXNlb3ZlcicsIG9uQnV0dG9uT3Zlcik7XHJcbiAgICAgIHRoaXMuc3ByaXRlLm9uKCdtb3VzZW91dCcsIG9uQnV0dG9uT3V0KVxyXG4gIH1cclxuXHJcbiAgLy8gU2V0cyB0aGUgZGlyZWN0aW9uIG9mIHRoZSBhcnJvdzogMD1sZWZ0LCAxPXVwLCAyPXJpZ2h0LCAzPWRvd25cclxuICBzZXREaXJlY3Rpb24odmFsKSB7XHJcbiAgICBjb25zdCBwaSA9IDMuMTQxNTkyNjU7XHJcbiAgICB0aGlzLnNwcml0ZS5yb3RhdGlvbiA9IHBpICogdmFsIC8gMi4wO1xyXG4gICAgdGhpcy5kaXJlY3Rpb24gPSB2YWw7XHJcbiAgfVxyXG5cclxuICAvLyBTZXRzIGlmIHRoZSBjZWxsIGhhcyBiZWVuIHZpc2l0ZWQgYnkgYSBnYW1lIHBpZWNlXHJcbiAgc2V0VmlzaXRlZCh2YWx1ZTpib29sZWFuKSB7XHJcbiAgICBpZiAodmFsdWUpIHtcclxuICAgICAgdGhpcy5zcHJpdGUudGludCA9IDB4ZmZmZmZmOyAvLyBtYWtlIGJyaWdodGVyXHJcbiAgICB9XHJcbiAgICBlbHNlIHtcclxuICAgICAgdGhpcy5zcHJpdGUudGludCA9IDB4ZmY3N2FhO1xyXG4gICAgfVxyXG4gICAgdGhpcy52aXNpdGVkID0gdmFsdWU7XHJcbiAgfVxyXG5cclxuICAvLyBJZiB2YWx1ZT09dHJ1ZSwgdGVtcG9yYXJpbHkgaGlnaGxpZ2h0cyB0aGUgY2VsbFxyXG4gIC8vIElmIHZhbHVlPT10cnVlLCBpdCByZXZlcnRzIHRvIGl0cyBwcmV2aW91cyBjb2xvclxyXG4gIHNldEhpZ2hsaWdodCh2YWx1ZTpib29sZWFuKSB7XHJcbiAgICBsZXQgY3VycmVudFZhbHVlOmJvb2xlYW4gPSB0aGlzLnZpc2l0ZWQ7XHJcbiAgICBpZiAoIXZhbHVlKSB7XHJcbiAgICAgIHZhbHVlID0gY3VycmVudFZhbHVlO1xyXG4gICAgfVxyXG4gICAgdGhpcy5zZXRWaXNpdGVkKHZhbHVlKTtcclxuICAgIHRoaXMudmlzaXRlZCA9IGN1cnJlbnRWYWx1ZTtcclxuICB9XHJcbn1cclxuXHJcbi8qXHJcbiAgLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuICBSZXByZXNlbnRzIHRoZSBlbnRpcmUgZ2FtZSBib2FyZC4gQ29udGFpbnMgYSAyZCBhcnJheSBvZiBHcmljQ2VsbCBvYmplY3RzLlxyXG4gIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcbiovXHJcbmV4cG9ydCBjbGFzcyBBcnJvd0dyaWQge1xyXG4gIGNvbnRhaW5lcjpQSVhJLkNvbnRhaW5lcjtcclxuICBncmlkOkdyaWRDZWxsW11bXTtcclxuICBkaW1YOm51bWJlcjsgLy8gZGltZW5zaW9uIG9mIGdhbWUgYm9hcmQgaW4gY2VsbHNcclxuICBkaW1ZOm51bWJlcjtcclxuXHJcbiAgY29uc3RydWN0b3Iod2lkdGg6bnVtYmVyLCBoZWlnaHQ6bnVtYmVyLCBzdGFnZTpQSVhJLkNvbnRhaW5lcikge1xyXG4gICAgdGhpcy5jb250YWluZXIgPSBuZXcgUElYSS5Db250YWluZXIoKTtcclxuICAgIHN0YWdlLmFkZENoaWxkKHRoaXMuY29udGFpbmVyKTtcclxuICAgIHRoaXMuY29udGFpbmVyLnggPSAxMDA7XHJcbiAgICB0aGlzLmNvbnRhaW5lci55ID0gNjA7XHJcbiAgICB0aGlzLmRpbVggPSB3aWR0aDtcclxuICAgIHRoaXMuZGltWSA9IGhlaWdodDtcclxuICAgIHRoaXMuZ3JpZCA9IFtdO1xyXG4gICAgZm9yICh2YXIgaiA9IDA7IGogPCBoZWlnaHQ7IGorKykge1xyXG4gICAgICB0aGlzLmdyaWRbal0gPSBbXTtcclxuICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCB3aWR0aDsgaSsrKSB7XHJcbiAgICAgICAgbGV0IG5ld0NlbGw6R3JpZENlbGwgPSBuZXcgR3JpZENlbGwoaSwgaiwgdGhpcy5jb250YWluZXIpO1xyXG4gICAgICAgIHRoaXMuZ3JpZFtqXVtpXSA9IG5ld0NlbGw7XHJcbiAgICAgIH07XHJcbiAgICB9XHJcbiAgICB0aGlzLnJlc2h1ZmZsZUFycm93cygpO1xyXG4gIH1cclxuXHJcbiAgY2xlYW51cChzdGFnZTpQSVhJLkNvbnRhaW5lcikge1xyXG4gICAgc3RhZ2UucmVtb3ZlQ2hpbGQodGhpcy5jb250YWluZXIpO1xyXG4gICAgdGhpcy5jb250YWluZXIuZGVzdHJveSgpO1xyXG4gIH1cclxuXHJcbiAgc2V0TW91c2VGdW5jdGlvbnMob25CdXR0b25Eb3duOigpPT52b2lkLCBvbkJ1dHRvbk92ZXI6KCk9PnZvaWQsIG9uQnV0dG9uT3V0OigpPT52b2lkKSB7XHJcbiAgICBmb3IgKHZhciBqID0gMDsgaiA8IHRoaXMuZGltWTsgaisrKSB7XHJcbiAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5kaW1YOyBpKyspIHtcclxuICAgICAgICB0aGlzLmdyaWRbal1baV0uc2V0TW91c2VGdW5jdGlvbnMob25CdXR0b25Eb3duLCBvbkJ1dHRvbk92ZXIsIG9uQnV0dG9uT3V0KTtcclxuICAgICAgfTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIC8vIE1hcmtzIGFsbCBjZWxscyBhcyB1bnZpc2l0ZWRcclxuICByZXNldEFycm93cygpIHtcclxuICAgIGZvciAodmFyIGogPSAwOyBqIDwgdGhpcy5kaW1ZOyBqKyspIHtcclxuICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLmRpbVg7IGkrKykge1xyXG4gICAgICAgIHRoaXMuZ3JpZFtqXVtpXS5zZXRWaXNpdGVkKGZhbHNlKTtcclxuICAgICAgfTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIC8vIE1hcmtzIGFsbCBjZWxscyBhcyB1bnZpc2l0ZWQgYW5kIGNoYW5nZXMgYXJyb3cgZGlyZWN0aW9uc1xyXG4gIHJlc2h1ZmZsZUFycm93cygpIHtcclxuICAgIGZvciAodmFyIGogPSAwOyBqIDwgdGhpcy5kaW1ZOyBqKyspIHtcclxuICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLmRpbVg7IGkrKykge1xyXG4gICAgICAgIHRoaXMuZ3JpZFtqXVtpXS5zZXRWaXNpdGVkKGZhbHNlKTtcclxuICAgICAgICAvLyBJdCdzIGEgbGl0dGxlIGJvcmluZyB0byBoYXZlIHR3byBhcnJvd3MgcG9pbnRpbmcgYXQgZWFjaCBvdGhlciwgc28gcHJldmVudCB0aGF0XHJcbiAgICAgICAgbGV0IGFsbG93ZWREaXJlY3Rpb25zOmJvb2xlYW5bXSA9IFt0cnVlLCB0cnVlLCB0cnVlLCB0cnVlLCBmYWxzZV07XHJcbiAgICAgICAgLy8gSXMgdGhlIG9uZSBhYm92ZSBtZSBwb2ludGluZyBkb3duP1xyXG4gICAgICAgIGlmIChqID4gMCAmJiB0aGlzLmdyaWRbai0xXVtpXS5kaXJlY3Rpb24gPT0gMykge1xyXG4gICAgICAgICAgLy8gTm90IGFsbG93ZWQgdG8gcG9pbnQgc3RyYWlnaHQgdXBcclxuICAgICAgICAgIGFsbG93ZWREaXJlY3Rpb25zWzFdID0gZmFsc2U7XHJcbiAgICAgICAgICAvL2NvbnNvbGUubG9nKFwiRm9yYmlkZGVuIHVwIGF0IFwiICsgaSArIFwiLFwiICsgaik7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIC8vIElzIHRoZSBvbmUgdG8gbXkgbGVmdCBwb2ludGluZyByaWdodD9cclxuICAgICAgICBpZiAoaSA+IDAgJiYgdGhpcy5ncmlkW2pdW2ktMV0uZGlyZWN0aW9uID09IDIpIHtcclxuICAgICAgICAgIC8vIE5vdCBhbGxvd2VkIHRvIHBvaW50IGxlZnRcclxuICAgICAgICAgIGFsbG93ZWREaXJlY3Rpb25zWzBdID0gZmFsc2U7XHJcbiAgICAgICAgICAvL2NvbnNvbGUubG9nKFwiRm9yYmlkZGVuIGxlZnQgYXQgXCIgKyBpICsgXCIsXCIgKyBqKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgbGV0IHByb3Bvc2VkRGlyZWN0aW9uOm51bWJlciA9IDQ7IC8vIG5vdCBhIHZhbGlkIGRpcmVjdGlvbiwgc28gdGhlIGZpcnN0IHRlc3Qgd2lsbCBmYWlsXHJcbiAgICAgICAgd2hpbGUgKGFsbG93ZWREaXJlY3Rpb25zW3Byb3Bvc2VkRGlyZWN0aW9uXSA9PSBmYWxzZSlcclxuICAgICAgICB7XHJcbiAgICAgICAgICBwcm9wb3NlZERpcmVjdGlvbiA9IE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIDQuMCk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHRoaXMuZ3JpZFtqXVtpXS5zZXREaXJlY3Rpb24ocHJvcG9zZWREaXJlY3Rpb24pO1xyXG4gICAgICB9O1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgLy8gUmV0dXJucyByZWYgdG8gY2VsbCBhdCBwYXJ0aWN1bGFyIGdyaWQgbG9jYXRpb25cclxuICBnZXRDZWxsKGdyaWRYOm51bWJlciwgZ3JpZFk6bnVtYmVyKSB7XHJcbiAgICByZXR1cm4gdGhpcy5ncmlkW2dyaWRZXVtncmlkWF07XHJcbiAgfVxyXG59XHJcbiIsIi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi90eXBpbmdzL2luZGV4LmQudHNcIiAvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cImdyaWQudHNcIiAvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cImdhbWUudHNcIiAvPlxuXG5pbXBvcnQgZ3JpZEZpbGUgPSByZXF1aXJlKCcuL2dyaWQnKTtcbmltcG9ydCBnYW1lRmlsZSA9IHJlcXVpcmUoJy4vZ2FtZScpOyAvLyBcInJlcXVpcmVzIGdhbWVcIiwgaGFcbmltcG9ydCBQSVhJID0gcmVxdWlyZSgncGl4aS5qcycpO1xuY29uc3QgcmVuZGVyZXI6UElYSS5XZWJHTFJlbmRlcmVyID0gbmV3IFBJWEkuV2ViR0xSZW5kZXJlcigxMjgwLCA3MjApO1xuZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZChyZW5kZXJlci52aWV3KTtcblxubGV0IGNlbGxEaW06bnVtYmVyID0gNTA7XG5cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLyBHbG9iYWwgdmFycyBhbmQgYmFzaWMgc2V0dXBcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbi8vIEdyYXBoaWNhbCBjb250YWluZXJcblxuLy8gY3JlYXRlIHRoZSByb290IG9mIHRoZSBzY2VuZSBncmFwaFxudmFyIHN0YWdlID0gbmV3IFBJWEkuQ29udGFpbmVyKCk7XG5cbmxldCBnYW1lSW5zdGFuY2U6Z2FtZUZpbGUuVGhlR2FtZTtcblxuZG9TZXR1cCgpO1xuXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLy8gRnVuY3Rpb24gZGVmaW5pdGlvbnNcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbmZ1bmN0aW9uIHVwZGF0ZSgpIHtcbiAgICBnYW1lSW5zdGFuY2UudXBkYXRlKDAuMDEpOyAvLyBhZHZhbmNlIGNsb2NrIGJ5IDEvMTAwdGggb2YgYSBzZWNvbmRcbn1cblxuZnVuY3Rpb24gZG9TZXR1cCgpIHtcbiAgLy9jcmVhdGVHcmlkKCk7XG4gIGNvbnNvbGUubG9nKFwiVGVzdFwiKTtcbiAgZ2FtZUluc3RhbmNlID0gbmV3IGdhbWVGaWxlLlRoZUdhbWUoc3RhZ2UpO1xuICAvLyBBIGZ1bmN0aW9uIHRoYXQgdXBkYXRlcyBhIGh1bmRyZWQgdGltZXMgYSBzZWNvbmRcbiAgc2V0SW50ZXJ2YWwodXBkYXRlLCAxMCk7XG4gIGFuaW1hdGUoKTtcbn1cblxuZnVuY3Rpb24gYW5pbWF0ZSgpIHtcblxuICAgIHJlcXVlc3RBbmltYXRpb25GcmFtZShhbmltYXRlKTtcblxuICAgIC8vIHJlbmRlciB0aGUgcm9vdCBjb250YWluZXJcbiAgICByZW5kZXJlci5yZW5kZXIoc3RhZ2UpO1xufVxuIl19
