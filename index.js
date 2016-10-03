(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.jiboProgrammingChallenge = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
"use strict";
var PIXI = require('pixi.js');
var cellDim = 50;
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
},{"pixi.js":undefined}],2:[function(require,module,exports){
/// <reference path="../typings/index.d.ts" />
/// <reference path="grid.ts" />
"use strict";
var gridFile = require('./grid');
var PIXI = require('pixi.js');
var renderer = new PIXI.WebGLRenderer(1280, 720);
document.body.appendChild(renderer.view);
var cellDim = 50;
/*
  --------------------------------------------
  Represents a game piece. A piece can occupy a cell and transition in a
  videogame-y manner between cells. It also has a state machine and
  can perform several animation sequences.
  --------------------------------------------
*/
var GridCharacter = (function () {
    function GridCharacter(name, container) {
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
    GridCharacter.prototype.setPosition = function (i, j) {
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
            this.sprite.x = cellDim * (this.cellIndexRight + 0.5 + this.xMovementDir * this.slideValue);
            this.sprite.y = cellDim * (this.cellIndexDown + 0.5 + this.yMovementDir * this.slideValue);
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
/*
  --------------------------------------------
  Represents the game at the highest level. Manages UI features, an ArrowGrid
  instance, and the game pieces.
  --------------------------------------------
*/
var TheGame = (function () {
    function TheGame() {
        this.theGrid = new gridFile.ArrowGrid(10, 10, stage);
        this.theGrid.setMouseFunctions(onButtonDown, onButtonOver, onButtonOut);
        // create a text object with a nice stroke
        this.infoText = new PIXI.Text('Place piece on board', { font: 'bold 36px Arial', fill: '#ffff00', align: 'left', stroke: '#0000FF', strokeThickness: 4 });
        this.infoText.position.x = this.theGrid.container.x + cellDim * (this.theGrid.dimX + 1);
        this.infoText.position.y = this.theGrid.container.y + cellDim;
        stage.addChild(this.infoText);
        var currentGame = this;
        this.resetText = new PIXI.Text('Reset', { font: 'bold 30px Arial', fill: '#0000ff', align: 'left', stroke: '#FF00FF', strokeThickness: 4 });
        this.resetText.position.x = this.theGrid.container.x + cellDim * (this.theGrid.dimX + 1);
        this.resetText.position.y = this.theGrid.container.y + cellDim * (this.theGrid.dimY - 3);
        stage.addChild(this.resetText);
        this.resetText.buttonMode = true;
        this.resetText.interactive = true;
        this.resetText.on('mousedown', function () {
            currentGame.handleResetPressed();
        });
        this.resetText.visible = false;
        this.reshuffleText = new PIXI.Text('Reshuffle', { font: 'bold 30px Arial', fill: '#0000ff', align: 'left', stroke: '#FF00FF', strokeThickness: 4 });
        this.reshuffleText.position.x = this.theGrid.container.x + cellDim * (this.theGrid.dimX + 1);
        this.reshuffleText.position.y = this.theGrid.container.y + cellDim * (this.theGrid.dimY - 2);
        stage.addChild(this.reshuffleText);
        this.reshuffleText.buttonMode = true;
        this.reshuffleText.interactive = true;
        this.reshuffleText.on('mousedown', function () {
            currentGame.handleReshufflePressed();
        });
        this.pauseText = new PIXI.Text('Pause', { font: 'bold 30px Arial', fill: '#0000ff', align: 'left', stroke: '#FF00FF', strokeThickness: 4 });
        this.pauseText.position.x = this.theGrid.container.x + cellDim * (this.theGrid.dimX + 1);
        this.pauseText.position.y = this.theGrid.container.y + cellDim * (this.theGrid.dimY - 1);
        stage.addChild(this.pauseText);
        this.pauseText.buttonMode = true;
        this.pauseText.interactive = true;
        this.pauseText.on('mousedown', function () {
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
    }
    // Main update function. deltaT is seconds elapsed since last call.
    TheGame.prototype.update = function (deltaT) {
        var characters = [this.checkerCharacter, this.checkMarkCharacter];
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
        else if (characters[0].testCollision(characters[1])) {
            // We've caught up
            this.checkerCharacter.setState("frozen");
            this.checkMarkCharacter.setState("explode");
            this.infoText.text = "Loop Detected!";
            this.gameState = "done";
            this.resetText.visible = true;
            this.reshuffleText.visible = true;
            this.pauseText.visible = false;
        }
    };
    // Called when user clicks on an arrow cell
    TheGame.prototype.handleCellPress = function (pixX, pixY) {
        var cellX = Math.floor(pixX / cellDim);
        var cellY = Math.floor(pixY / cellDim);
        console.log("button cell: " + cellX + "," + cellY);
        if (this.checkerCharacter.getState() == "inactive") {
            this.checkerCharacter.setPosition(cellX, cellY);
            this.checkMarkCharacter.setPosition(cellX, cellY);
            this.infoText.text = "Traveling...";
            this.gameState = "in progress";
            this.resetText.visible = false;
            this.reshuffleText.visible = false;
            this.pauseText.visible = true;
        }
    };
    TheGame.prototype.handleCellOver = function (pixX, pixY) {
        var cellX = Math.floor(pixX / cellDim);
        var cellY = Math.floor(pixY / cellDim);
        var cell = this.theGrid.getCell(cellX, cellY);
        cell.setHighlight(true);
    };
    TheGame.prototype.handleCellOut = function (pixX, pixY) {
        var cellX = Math.floor(pixX / cellDim);
        var cellY = Math.floor(pixY / cellDim);
        var cell = this.theGrid.getCell(cellX, cellY);
        cell.setHighlight(false);
    };
    TheGame.prototype.handleResetPressed = function () {
        this.theGrid.resetArrows();
        this.checkerCharacter.setState("inactive");
        this.checkMarkCharacter.setState("inactive");
        this.infoText.text = "Place piece on board";
        this.gameState = "ready";
    };
    TheGame.prototype.handleReshufflePressed = function () {
        this.theGrid.reshuffleArrows();
        this.checkerCharacter.setState("inactive");
        this.checkMarkCharacter.setState("inactive");
        this.infoText.text = "Place piece on board";
        this.gameState = "ready";
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
    return TheGame;
}());
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
// There's probably a less awkward way to do these button functions, but outta time.
// They respond to interactions with individual arrows and pass the call on to
// the arrow grid.
function onButtonDown() {
    gameInstance.handleCellPress(this.x, this.y);
}
function onButtonOver() {
    gameInstance.handleCellOver(this.x, this.y);
}
function onButtonOut() {
    gameInstance.handleCellOut(this.x, this.y);
}
function update() {
    gameInstance.update(0.01); // advance clock by 1/100th of a second
}
function doSetup() {
    //createGrid();
    console.log("Test");
    gameInstance = new TheGame();
    // A function that updates a hundred times a second
    setInterval(update, 10);
    animate();
}
function animate() {
    requestAnimationFrame(animate);
    // render the root container
    renderer.render(stage);
}
},{"./grid":1,"pixi.js":undefined}]},{},[2])(2)
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvZ3JpZC50cyIsInNyYy9pbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7QUNBQSxJQUFPLElBQUksV0FBVyxTQUFTLENBQUMsQ0FBQztBQUVqQyxJQUFJLE9BQU8sR0FBVSxFQUFFLENBQUM7QUFFeEIsMEJBQTBCO0FBQzFCLG9CQUFvQjtBQUNwQiwwQkFBMEI7QUFFMUI7Ozs7RUFJRTtBQUNGO0lBUUUsa0JBQVksQ0FBUSxFQUFFLENBQVEsRUFBRSxTQUF3QjtRQUN0RCxJQUFJLEtBQUssR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDO1FBQzNELEtBQUssQ0FBQyxDQUFDLEdBQUcsT0FBTyxHQUFHLENBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDO1FBQzlCLEtBQUssQ0FBQyxDQUFDLEdBQUcsT0FBTyxHQUFHLENBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDO1FBQzlCLEtBQUssQ0FBQyxLQUFLLEdBQUcsT0FBTyxDQUFDO1FBQ3RCLEtBQUssQ0FBQyxNQUFNLEdBQUcsT0FBTyxDQUFDO1FBQ3ZCLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBQztRQUNyQixLQUFLLENBQUMsTUFBTSxDQUFDLENBQUMsR0FBRyxHQUFHLENBQUM7UUFDckIsU0FBUyxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUMxQixJQUFJLENBQUMsS0FBSyxHQUFHLENBQUMsQ0FBQztRQUNmLElBQUksQ0FBQyxLQUFLLEdBQUcsQ0FBQyxDQUFDO1FBQ2YsSUFBSSxDQUFDLE1BQU0sR0FBRyxLQUFLLENBQUM7UUFDcEIsSUFBSSxDQUFDLFNBQVMsR0FBRyxDQUFDLENBQUM7UUFDbkIsSUFBSSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUN6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SSxDQUFDLFNBQVMsRUFBRSxDQUFDO0FBRWpDLElBQUksWUFBb0IsQ0FBQztBQUV6QixPQUFPLEVBQUUsQ0FBQztBQUVWLDBCQUEwQjtBQUMxQix1QkFBdUI7QUFDdkIsMEJBQTBCO0FBRTFCLG9GQUFvRjtBQUNwRiw4RUFBOEU7QUFDOUUsa0JBQWtCO0FBRWxCO0lBRUUsWUFBWSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUMvQyxDQUFDO0FBRUQ7SUFFRSxZQUFZLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQzlDLENBQUM7QUFFRDtJQUVFLFlBQVksQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDN0MsQ0FBQztBQUVEO0lBQ0ksWUFBWSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLHVDQUF1QztBQUN0RSxDQUFDO0FBRUQ7SUFDRSxlQUFlO0lBQ2YsT0FBTyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQztJQUNwQixZQUFZLEdBQUcsSUFBSSxPQUFPLEVBQUUsQ0FBQztJQUM3QixtREFBbUQ7SUFDbkQsV0FBVyxDQUFDLE1BQU0sRUFBRSxFQUFFLENBQUMsQ0FBQztJQUN4QixPQUFPLEVBQUUsQ0FBQztBQUNaLENBQUM7QUFFRDtJQUVJLHFCQUFxQixDQUFDLE9BQU8sQ0FBQyxDQUFDO0lBRS9CLDRCQUE0QjtJQUM1QixRQUFRLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDO0FBQzNCLENBQUMiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiaW1wb3J0IFBJWEkgPSByZXF1aXJlKCdwaXhpLmpzJyk7XHJcblxyXG5sZXQgY2VsbERpbTpudW1iZXIgPSA1MDtcclxuXHJcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcbi8vIENsYXNzIGRlZmluaXRpb25zXHJcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcblxyXG4vKlxyXG4gIFJlcHJlc2VudHMgYSBjZWxsIG9uIHRoZSBnYW1lIGJvYXJkLiBBIGNlbGwgY29udGFpbnMgYW4gYXJyb3cgU3ByaXRlXHJcbiAgd2hpY2ggcG9pbnRzIGluIG9uZSBvZiBmb3VyIGNhcmRpbmFsIGRpcmVjdGlvbnMuIEVhY2ggY2VsbCBhY3RzIGFzXHJcbiAgYSBidXR0b24gYW5kIGNhbiBiZSBjbGlja2VkLlxyXG4qL1xyXG5leHBvcnQgY2xhc3MgR3JpZENlbGwge1xyXG4gIHNwcml0ZTpQSVhJLlNwcml0ZTtcclxuICAvLyBBcnJvdydzIGZhY2luZyBkaXJlY3Rpb246IDA9bGVmdCwgMT11cCwgMj1yaWdodCwgMz1kb3duXHJcbiAgZGlyZWN0aW9uOm51bWJlcjtcclxuICBjZWxsWDpudW1iZXI7IC8vIGNvb3JkaW5hdGUgb24gdGhlIGdhbWUgYm9hcmQsIGZyb20gbGVmdFxyXG4gIGNlbGxZOm51bWJlcjsgLy8gY29vcmRpbmF0ZSBvbiB0aGUgZ2FtZSBib2FyZCwgZnJvbSB0b3BcclxuICB2aXNpdGVkOmJvb2xlYW47IC8vIGlmIHRoZSBjZWxsIGhhcyBiZWVuIHZpc2l0ZWQgYnkgZ2FtZSBwaWVjZVxyXG5cclxuICBjb25zdHJ1Y3RvcihpOm51bWJlciwgajpudW1iZXIsIGNvbnRhaW5lcjpQSVhJLkNvbnRhaW5lcikge1xyXG4gICAgdmFyIGFycm93ID0gUElYSS5TcHJpdGUuZnJvbUltYWdlKCdpbWFnZXMvYXJyb3ctaWNvbi5wbmcnKTtcclxuICAgIGFycm93LnggPSBjZWxsRGltICogKGkgKyAwLjUpO1xyXG4gICAgYXJyb3cueSA9IGNlbGxEaW0gKiAoaiArIDAuNSk7XHJcbiAgICBhcnJvdy53aWR0aCA9IGNlbGxEaW07XHJcbiAgICBhcnJvdy5oZWlnaHQgPSBjZWxsRGltO1xyXG4gICAgYXJyb3cuYW5jaG9yLnggPSAwLjU7XHJcbiAgICBhcnJvdy5hbmNob3IueSA9IDAuNTtcclxuICAgIGNvbnRhaW5lci5hZGRDaGlsZChhcnJvdyk7XHJcbiAgICB0aGlzLmNlbGxYID0gaTtcclxuICAgIHRoaXMuY2VsbFkgPSBqO1xyXG4gICAgdGhpcy5zcHJpdGUgPSBhcnJvdztcclxuICAgIHRoaXMuZGlyZWN0aW9uID0gMDtcclxuICAgIHRoaXMuc2V0VmlzaXRlZChmYWxzZSk7XHJcbiAgfVxyXG5cclxuICBzZXRNb3VzZUZ1bmN0aW9ucyhvbkJ1dHRvbkRvd246KCk9PnZvaWQsIG9uQnV0dG9uT3ZlcjooKT0+dm9pZCwgb25CdXR0b25PdXQ6KCk9PnZvaWQpIHtcclxuICAgICAgLy8gb25FdmVudCBmdW5jdGlvbnMgYXJlIGdsb2JhbCBmdW5jdGlvbnMgKHRvd2FyZHMgYm90dG9tIG9mIGZpbGUpXHJcbiAgICAgIHRoaXMuc3ByaXRlLmJ1dHRvbk1vZGUgPSB0cnVlO1xyXG4gICAgICB0aGlzLnNwcml0ZS5pbnRlcmFjdGl2ZSA9IHRydWU7XHJcbiAgICAgIHRoaXMuc3ByaXRlLm9uKCdtb3VzZWRvd24nLCBvbkJ1dHRvbkRvd24pO1xyXG4gICAgICB0aGlzLnNwcml0ZS5vbignbW91c2VvdmVyJywgb25CdXR0b25PdmVyKTtcclxuICAgICAgdGhpcy5zcHJpdGUub24oJ21vdXNlb3V0Jywgb25CdXR0b25PdXQpXHJcbiAgfVxyXG5cclxuICAvLyBTZXRzIHRoZSBkaXJlY3Rpb24gb2YgdGhlIGFycm93OiAwPWxlZnQsIDE9dXAsIDI9cmlnaHQsIDM9ZG93blxyXG4gIHNldERpcmVjdGlvbih2YWwpIHtcclxuICAgIGNvbnN0IHBpID0gMy4xNDE1OTI2NTtcclxuICAgIHRoaXMuc3ByaXRlLnJvdGF0aW9uID0gcGkgKiB2YWwgLyAyLjA7XHJcbiAgICB0aGlzLmRpcmVjdGlvbiA9IHZhbDtcclxuICB9XHJcblxyXG4gIC8vIFNldHMgaWYgdGhlIGNlbGwgaGFzIGJlZW4gdmlzaXRlZCBieSBhIGdhbWUgcGllY2VcclxuICBzZXRWaXNpdGVkKHZhbHVlOmJvb2xlYW4pIHtcclxuICAgIGlmICh2YWx1ZSkge1xyXG4gICAgICB0aGlzLnNwcml0ZS50aW50ID0gMHhmZmZmZmY7IC8vIG1ha2UgYnJpZ2h0ZXJcclxuICAgIH1cclxuICAgIGVsc2Uge1xyXG4gICAgICB0aGlzLnNwcml0ZS50aW50ID0gMHhmZjc3YWE7XHJcbiAgICB9XHJcbiAgICB0aGlzLnZpc2l0ZWQgPSB2YWx1ZTtcclxuICB9XHJcblxyXG4gIC8vIElmIHZhbHVlPT10cnVlLCB0ZW1wb3JhcmlseSBoaWdobGlnaHRzIHRoZSBjZWxsXHJcbiAgLy8gSWYgdmFsdWU9PXRydWUsIGl0IHJldmVydHMgdG8gaXRzIHByZXZpb3VzIGNvbG9yXHJcbiAgc2V0SGlnaGxpZ2h0KHZhbHVlOmJvb2xlYW4pIHtcclxuICAgIGxldCBjdXJyZW50VmFsdWU6Ym9vbGVhbiA9IHRoaXMudmlzaXRlZDtcclxuICAgIGlmICghdmFsdWUpIHtcclxuICAgICAgdmFsdWUgPSBjdXJyZW50VmFsdWU7XHJcbiAgICB9XHJcbiAgICB0aGlzLnNldFZpc2l0ZWQodmFsdWUpO1xyXG4gICAgdGhpcy52aXNpdGVkID0gY3VycmVudFZhbHVlO1xyXG4gIH1cclxufVxyXG5cclxuLypcclxuICAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG4gIFJlcHJlc2VudHMgdGhlIGVudGlyZSBnYW1lIGJvYXJkLiBDb250YWlucyBhIDJkIGFycmF5IG9mIEdyaWNDZWxsIG9iamVjdHMuXHJcbiAgLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuKi9cclxuZXhwb3J0IGNsYXNzIEFycm93R3JpZCB7XHJcbiAgY29udGFpbmVyOlBJWEkuQ29udGFpbmVyO1xyXG4gIGdyaWQ6R3JpZENlbGxbXVtdO1xyXG4gIGRpbVg6bnVtYmVyOyAvLyBkaW1lbnNpb24gb2YgZ2FtZSBib2FyZCBpbiBjZWxsc1xyXG4gIGRpbVk6bnVtYmVyO1xyXG5cclxuICBjb25zdHJ1Y3Rvcih3aWR0aDpudW1iZXIsIGhlaWdodDpudW1iZXIsIHN0YWdlOlBJWEkuQ29udGFpbmVyKSB7XHJcbiAgICB0aGlzLmNvbnRhaW5lciA9IG5ldyBQSVhJLkNvbnRhaW5lcigpO1xyXG4gICAgc3RhZ2UuYWRkQ2hpbGQodGhpcy5jb250YWluZXIpO1xyXG4gICAgdGhpcy5jb250YWluZXIueCA9IDEwMDtcclxuICAgIHRoaXMuY29udGFpbmVyLnkgPSA2MDtcclxuICAgIHRoaXMuZGltWCA9IHdpZHRoO1xyXG4gICAgdGhpcy5kaW1ZID0gaGVpZ2h0O1xyXG4gICAgdGhpcy5ncmlkID0gW107XHJcbiAgICBmb3IgKHZhciBqID0gMDsgaiA8IGhlaWdodDsgaisrKSB7XHJcbiAgICAgIHRoaXMuZ3JpZFtqXSA9IFtdO1xyXG4gICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHdpZHRoOyBpKyspIHtcclxuICAgICAgICBsZXQgbmV3Q2VsbDpHcmlkQ2VsbCA9IG5ldyBHcmlkQ2VsbChpLCBqLCB0aGlzLmNvbnRhaW5lcik7XHJcbiAgICAgICAgdGhpcy5ncmlkW2pdW2ldID0gbmV3Q2VsbDtcclxuICAgICAgfTtcclxuICAgIH1cclxuICAgIHRoaXMucmVzaHVmZmxlQXJyb3dzKCk7XHJcbiAgfVxyXG5cclxuICBzZXRNb3VzZUZ1bmN0aW9ucyhvbkJ1dHRvbkRvd246KCk9PnZvaWQsIG9uQnV0dG9uT3ZlcjooKT0+dm9pZCwgb25CdXR0b25PdXQ6KCk9PnZvaWQpIHtcclxuICAgIGZvciAodmFyIGogPSAwOyBqIDwgdGhpcy5kaW1ZOyBqKyspIHtcclxuICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLmRpbVg7IGkrKykge1xyXG4gICAgICAgIHRoaXMuZ3JpZFtqXVtpXS5zZXRNb3VzZUZ1bmN0aW9ucyhvbkJ1dHRvbkRvd24sIG9uQnV0dG9uT3Zlciwgb25CdXR0b25PdXQpO1xyXG4gICAgICB9O1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgLy8gTWFya3MgYWxsIGNlbGxzIGFzIHVudmlzaXRlZFxyXG4gIHJlc2V0QXJyb3dzKCkge1xyXG4gICAgZm9yICh2YXIgaiA9IDA7IGogPCB0aGlzLmRpbVk7IGorKykge1xyXG4gICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMuZGltWDsgaSsrKSB7XHJcbiAgICAgICAgdGhpcy5ncmlkW2pdW2ldLnNldFZpc2l0ZWQoZmFsc2UpO1xyXG4gICAgICB9O1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgLy8gTWFya3MgYWxsIGNlbGxzIGFzIHVudmlzaXRlZCBhbmQgY2hhbmdlcyBhcnJvdyBkaXJlY3Rpb25zXHJcbiAgcmVzaHVmZmxlQXJyb3dzKCkge1xyXG4gICAgZm9yICh2YXIgaiA9IDA7IGogPCB0aGlzLmRpbVk7IGorKykge1xyXG4gICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMuZGltWDsgaSsrKSB7XHJcbiAgICAgICAgdGhpcy5ncmlkW2pdW2ldLnNldFZpc2l0ZWQoZmFsc2UpO1xyXG4gICAgICAgIC8vIEl0J3MgYSBsaXR0bGUgYm9yaW5nIHRvIGhhdmUgdHdvIGFycm93cyBwb2ludGluZyBhdCBlYWNoIG90aGVyLCBzbyBwcmV2ZW50IHRoYXRcclxuICAgICAgICBsZXQgYWxsb3dlZERpcmVjdGlvbnM6Ym9vbGVhbltdID0gW3RydWUsIHRydWUsIHRydWUsIHRydWUsIGZhbHNlXTtcclxuICAgICAgICAvLyBJcyB0aGUgb25lIGFib3ZlIG1lIHBvaW50aW5nIGRvd24/XHJcbiAgICAgICAgaWYgKGogPiAwICYmIHRoaXMuZ3JpZFtqLTFdW2ldLmRpcmVjdGlvbiA9PSAzKSB7XHJcbiAgICAgICAgICAvLyBOb3QgYWxsb3dlZCB0byBwb2ludCBzdHJhaWdodCB1cFxyXG4gICAgICAgICAgYWxsb3dlZERpcmVjdGlvbnNbMV0gPSBmYWxzZTtcclxuICAgICAgICAgIC8vY29uc29sZS5sb2coXCJGb3JiaWRkZW4gdXAgYXQgXCIgKyBpICsgXCIsXCIgKyBqKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgLy8gSXMgdGhlIG9uZSB0byBteSBsZWZ0IHBvaW50aW5nIHJpZ2h0P1xyXG4gICAgICAgIGlmIChpID4gMCAmJiB0aGlzLmdyaWRbal1baS0xXS5kaXJlY3Rpb24gPT0gMikge1xyXG4gICAgICAgICAgLy8gTm90IGFsbG93ZWQgdG8gcG9pbnQgbGVmdFxyXG4gICAgICAgICAgYWxsb3dlZERpcmVjdGlvbnNbMF0gPSBmYWxzZTtcclxuICAgICAgICAgIC8vY29uc29sZS5sb2coXCJGb3JiaWRkZW4gbGVmdCBhdCBcIiArIGkgKyBcIixcIiArIGopO1xyXG4gICAgICAgIH1cclxuICAgICAgICBsZXQgcHJvcG9zZWREaXJlY3Rpb246bnVtYmVyID0gNDsgLy8gbm90IGEgdmFsaWQgZGlyZWN0aW9uLCBzbyB0aGUgZmlyc3QgdGVzdCB3aWxsIGZhaWxcclxuICAgICAgICB3aGlsZSAoYWxsb3dlZERpcmVjdGlvbnNbcHJvcG9zZWREaXJlY3Rpb25dID09IGZhbHNlKVxyXG4gICAgICAgIHtcclxuICAgICAgICAgIHByb3Bvc2VkRGlyZWN0aW9uID0gTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogNC4wKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgdGhpcy5ncmlkW2pdW2ldLnNldERpcmVjdGlvbihwcm9wb3NlZERpcmVjdGlvbik7XHJcbiAgICAgIH07XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICAvLyBSZXR1cm5zIHJlZiB0byBjZWxsIGF0IHBhcnRpY3VsYXIgZ3JpZCBsb2NhdGlvblxyXG4gIGdldENlbGwoZ3JpZFg6bnVtYmVyLCBncmlkWTpudW1iZXIpIHtcclxuICAgIHJldHVybiB0aGlzLmdyaWRbZ3JpZFldW2dyaWRYXTtcclxuICB9XHJcbn1cclxuIiwiLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uL3R5cGluZ3MvaW5kZXguZC50c1wiIC8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiZ3JpZC50c1wiIC8+XG5cbmltcG9ydCBncmlkRmlsZSA9IHJlcXVpcmUoJy4vZ3JpZCcpO1xuaW1wb3J0IFBJWEkgPSByZXF1aXJlKCdwaXhpLmpzJyk7XG5jb25zdCByZW5kZXJlcjpQSVhJLldlYkdMUmVuZGVyZXIgPSBuZXcgUElYSS5XZWJHTFJlbmRlcmVyKDEyODAsIDcyMCk7XG5kb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKHJlbmRlcmVyLnZpZXcpO1xuXG5sZXQgY2VsbERpbTpudW1iZXIgPSA1MDtcblxuLypcbiAgLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgUmVwcmVzZW50cyBhIGdhbWUgcGllY2UuIEEgcGllY2UgY2FuIG9jY3VweSBhIGNlbGwgYW5kIHRyYW5zaXRpb24gaW4gYVxuICB2aWRlb2dhbWUteSBtYW5uZXIgYmV0d2VlbiBjZWxscy4gSXQgYWxzbyBoYXMgYSBzdGF0ZSBtYWNoaW5lIGFuZFxuICBjYW4gcGVyZm9ybSBzZXZlcmFsIGFuaW1hdGlvbiBzZXF1ZW5jZXMuXG4gIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4qL1xuY2xhc3MgR3JpZENoYXJhY3RlciB7XG4gIHNwcml0ZTpQSVhJLlNwcml0ZTtcbiAgY2VsbEluZGV4UmlnaHQ6bnVtYmVyOyAvLyBib2FyZCBjb29yZGluYXRlXG4gIGNlbGxJbmRleERvd246bnVtYmVyO1xuICB4TW92ZW1lbnREaXI6bnVtYmVyOyAvLyBkaXJlY3Rpb24gb2YgY3VycmVudCBtb3ZlbWVudCwgKC0xID0gbGVmdCwgMSA9IHJpZ2h0KVxuICB5TW92ZW1lbnREaXI6bnVtYmVyOyAvLyBkaXJlY3Rpb24gb2YgY3VycmVudCBtb3ZlbWVudCwgKC0xID0gdXAsIDEgPSBkb3duKVxuXG4gIHNsaWRlVmFsdWU6bnVtYmVyOyAvLyBob3cgZmFyIHRoZSBwaWVjZSBoYXMgc2xpZCBhd2F5IGZyb20gY3VycmVudCBjZWxsXG4gICAgICAgICAgICAgICAgICAgICAvLyAwIHRvIDFcbiAgZWZmZWN0U2xpZGVyOm51bWJlcjsgLy8gVXNlZCBmb3IgdGhlIGFuaW1hdGlvbiBvZiBlZmZlY3RzXG4gIHJlc3RUaW1lcjpudW1iZXI7ICAvLyB0aGUgcGllY2UgXCJyZXN0c1wiIGZvciBhIGJpdCBhZnRlciBhcnJpdmluZ1xuICBtb3ZlVGltZTpudW1iZXI7IC8vIGhvdyBtYW55IHNlY29uZHMgYSBtb3ZlIG9yIHJlc3QgcGVyaW9kIHRha2VzXG5cbiAgb25Jbml0aWFsQ2VsbDpib29sZWFuO1xuICBpc01vdmluZzpib29sZWFuO1xuICBpc09uR3JpZDpib29sZWFuOyAvLyBmYWxzZSBpZiBwaWVjZSBtb3ZlcyBvZmYgYm9hcmRcbiAgcGF1c2VkOmJvb2xlYW47XG5cbiAgcHJpdmF0ZSBfc3RhdGU6c3RyaW5nO1xuXG4gIGNvbnN0cnVjdG9yKG5hbWU6c3RyaW5nLCBjb250YWluZXI6UElYSS5Db250YWluZXIpIHtcbiAgICB0aGlzLnNwcml0ZSA9IFBJWEkuU3ByaXRlLmZyb21JbWFnZShuYW1lKTtcbiAgICB0aGlzLnNwcml0ZS53aWR0aCA9IGNlbGxEaW07XG4gICAgdGhpcy5zcHJpdGUuaGVpZ2h0ID0gY2VsbERpbTtcbiAgICB0aGlzLnNwcml0ZS5hbmNob3IueCA9IDAuNTtcbiAgICB0aGlzLnNwcml0ZS5hbmNob3IueSA9IDAuNTtcbiAgICB0aGlzLnNwcml0ZS5hbHBoYSA9IDA7XG4gICAgY29udGFpbmVyLmFkZENoaWxkKHRoaXMuc3ByaXRlKTtcblxuICAgIHRoaXMueE1vdmVtZW50RGlyID0gMDtcbiAgICB0aGlzLnlNb3ZlbWVudERpciA9IDA7XG4gICAgdGhpcy5pc01vdmluZyA9IGZhbHNlO1xuICAgIHRoaXMuaXNPbkdyaWQgPSB0cnVlO1xuICAgIHRoaXMucGF1c2VkID0gZmFsc2U7XG4gICAgdGhpcy5yZXN0VGltZXIgPSAwO1xuICAgIHRoaXMubW92ZVRpbWUgPSAxLjA7XG4gICAgdGhpcy5fc3RhdGUgPSBcImluYWN0aXZlXCI7XG4gIH1cblxuICAvLyBJbnN0YW50bHkgcG9zaXRpb25zIHRoZSBwaWVjZSBhdCBpdHMgc3RhcnQgcG9zaXRpb25cbiAgc2V0UG9zaXRpb24oaTpudW1iZXIsIGo6bnVtYmVyKSB7XG4gICAgdGhpcy5zcHJpdGUueCA9IGNlbGxEaW0gKiAoaSArIDAuNSk7XG4gICAgdGhpcy5zcHJpdGUueSA9IGNlbGxEaW0gKiAoaiArIDAuNSk7XG4gICAgdGhpcy5zcHJpdGUud2lkdGggPSBjZWxsRGltO1xuICAgIHRoaXMuc3ByaXRlLmhlaWdodCA9IGNlbGxEaW07XG4gICAgdGhpcy5zcHJpdGUuYWxwaGEgPSAxO1xuICAgIHRoaXMuY2VsbEluZGV4RG93biA9IGo7XG4gICAgdGhpcy5jZWxsSW5kZXhSaWdodCA9IGk7XG4gICAgdGhpcy5vbkluaXRpYWxDZWxsID0gdHJ1ZTtcbiAgICB0aGlzLnBhdXNlZCA9IGZhbHNlO1xuICAgIHRoaXMuaXNNb3ZpbmcgPSBmYWxzZTtcbiAgICB0aGlzLmlzT25HcmlkID0gdHJ1ZTtcbiAgICB0aGlzLnNsaWRlVmFsdWUgPSAwO1xuICAgIHRoaXMucmVzdFRpbWVyID0gdGhpcy5tb3ZlVGltZTsgLy8gbGV0IGl0IHJlc3QgYmVmb3JlIHN0YXJ0aW5nIG1vdmVcbiAgICB0aGlzLl9zdGF0ZSA9IFwiYWN0aXZlXCI7XG4gIH1cblxuICAvLyBSZXR1cm5zIHRydWUgaWYgY2hhcmFjdGVyIGNhbiBiZSBpc3N1ZWQgYSBuZXcgbW92ZVxuICByZWFkeVRvTW92ZSgpIHtcbiAgICBpZiAodGhpcy5fc3RhdGUgIT0gXCJhY3RpdmVcIikge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICByZXR1cm4gKCF0aGlzLmlzTW92aW5nICYmIHRoaXMucmVzdFRpbWVyID09IDApO1xuICB9XG5cbiAgLy8gUmV0dXJucyB0cnVlIGlmIHRoaXMgY2hhcmFjdGVyIGFuZCB0aGUgb3RoZXIgaGF2ZSBjYXVnaHQgdXAgdG8gZWFjaCBvdGhlclxuICB0ZXN0Q29sbGlzaW9uKG90aGVyOkdyaWRDaGFyYWN0ZXIpIHtcbiAgICBpZiAodGhpcy5vbkluaXRpYWxDZWxsIHx8IG90aGVyLm9uSW5pdGlhbENlbGwgfHwgdGhpcy5fc3RhdGUgIT0gXCJhY3RpdmVcIikge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICBpZiAodGhpcy5jZWxsSW5kZXhEb3duID09IG90aGVyLmNlbGxJbmRleERvd24gJiZcbiAgICAgIHRoaXMuY2VsbEluZGV4UmlnaHQgPT0gb3RoZXIuY2VsbEluZGV4UmlnaHQpIHtcbiAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgLy8gVGVsbHMgdGhlIHBpZWNlIHRvIGJlZ2luIG1vdmluZyBpbiB0aGUgZ2l2ZW4gZGlyZWN0aW9uXG4gIC8vIFNlZSBHcmlkQ2VsbCBmb3IgZGlyZWN0aW9uIHZhbHVlcy5cbiAgcmVxdWVzdE5ld01vdmUoZGlyZWN0aW9uKSB7XG4gICAgaWYgKHRoaXMuX3N0YXRlICE9IFwiYWN0aXZlXCIpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgaWYgKHRoaXMuaXNNb3ZpbmcpIHtcbiAgICAgIHJldHVybjsgLy8gY2FuJ3QgY2hhbmdlIHdoaWxlIGFscmVhZHkgbW92aW5nXG4gICAgfVxuICAgIGlmIChkaXJlY3Rpb24gPT0gMCkgLy8gbGVmdFxuICAgIHtcbiAgICAgIHRoaXMueE1vdmVtZW50RGlyID0gLTEuMDtcbiAgICAgIHRoaXMueU1vdmVtZW50RGlyID0gIDAuMDtcbiAgICB9XG4gICAgZWxzZSBpZiAoZGlyZWN0aW9uID09IDEpIC8vIHVwXG4gICAge1xuICAgICAgdGhpcy54TW92ZW1lbnREaXIgPSAgMC4wO1xuICAgICAgdGhpcy55TW92ZW1lbnREaXIgPSAtMS4wO1xuICAgIH1cbiAgICBlbHNlIGlmIChkaXJlY3Rpb24gPT0gMikgLy8gcmlnaHRcbiAgICB7XG4gICAgICB0aGlzLnhNb3ZlbWVudERpciA9ICAxLjA7XG4gICAgICB0aGlzLnlNb3ZlbWVudERpciA9ICAwLjA7XG4gICAgfVxuICAgIGVsc2UgIC8vIGRvd25cbiAgICB7XG4gICAgICB0aGlzLnhNb3ZlbWVudERpciA9ICAwLjA7XG4gICAgICB0aGlzLnlNb3ZlbWVudERpciA9ICAxLjA7XG4gICAgfVxuICAgIHRoaXMuc2xpZGVWYWx1ZSA9IDA7XG4gICAgdGhpcy5pc01vdmluZyA9IHRydWU7XG4gIH1cblxuICAvLyBQdXRzIHRoZSBwaWVjZSBpbiBhIG5ldyBhbmltYXRpb24gc3RhdGVcbiAgLy8gKEkgd2FzIGdvaW5nIHRvIHVzZSBhIHR5cGVzY3JpcHQgYWNjZXNzb3IsIGJ1dCBub3Qgc3VwcG9ydGVkIGJ5IHRoaXMgY29tcGlsZXIpXG4gIHNldFN0YXRlKHN0YXRlOnN0cmluZykge1xuICAgIGlmICh0aGlzLl9zdGF0ZSA9PSBzdGF0ZSB8fCB0aGlzLl9zdGF0ZSA9PSBcImluYWN0aXZlXCIpIHtcbiAgICAgIC8vIE5vdGhpbmcgaGFwcGVucyBpZiB3ZSdyZSBhbHJlYWR5IGluIHJlcXVlc3RlZCBzdGF0ZSBvciBpZiBjaGFyYWN0ZXJcbiAgICAgIC8vIGlzIGluYWN0aXZlXG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGNvbnNvbGUubG9nKFwic3RhdGUgdG8gXCIgKyBzdGF0ZSk7XG4gICAgdGhpcy5fc3RhdGUgPSBzdGF0ZTtcbiAgICBpZiAoc3RhdGUgPT0gXCJmcm96ZW5cIikge1xuICAgICAgdGhpcy5lZmZlY3RTbGlkZXIgPSAwO1xuICAgIH1cbiAgICBlbHNlIGlmIChzdGF0ZSA9PSBcImR5aW5nXCIpIHtcbiAgICAgIHRoaXMuZWZmZWN0U2xpZGVyID0gMTtcbiAgICB9XG4gICAgZWxzZSBpZiAoc3RhdGUgPT0gXCJleHBsb2RlXCIpIHtcbiAgICAgIHRoaXMuZWZmZWN0U2xpZGVyID0gMTtcbiAgICB9XG4gICAgZWxzZSBpZiAoc3RhdGUgPT0gXCJpbmFjdGl2ZVwiKSB7XG4gICAgICB0aGlzLnNwcml0ZS5hbHBoYSA9IDA7XG4gICAgICB0aGlzLmlzTW92aW5nID0gZmFsc2U7XG4gICAgICB0aGlzLmlzT25HcmlkID0gdHJ1ZTtcbiAgICB9XG4gIH1cblxuICAvLyBBY2Nlc3NvcnMgYW5kIHNldHRlcnMgYXJlIGdvb2QgOilcbiAgZ2V0U3RhdGUoKSB7XG4gICAgcmV0dXJuIHRoaXMuX3N0YXRlO1xuICB9XG5cbiAgLy8gVXBkYXRlIGZ1bmN0aW9uIGNhbGxlZCBwZXJpb2RpY2FsbHkuIGRlbHRhVCBpcyB0aW1lIGluIHNlY29uZHMgc2luY2UgbGFzdFxuICAvLyBjYWxsLlxuICB1cGRhdGUoZGVsdGFUKSB7XG4gICAgaWYgKHRoaXMuX3N0YXRlID09IFwiYWN0aXZlXCIpIHtcbiAgICAgIHRoaXMuc3ByaXRlLnggPSBjZWxsRGltICogKHRoaXMuY2VsbEluZGV4UmlnaHQgKyAwLjUgKyB0aGlzLnhNb3ZlbWVudERpciAqIHRoaXMuc2xpZGVWYWx1ZSk7XG4gICAgICB0aGlzLnNwcml0ZS55ID0gY2VsbERpbSAqICh0aGlzLmNlbGxJbmRleERvd24gKyAwLjUgKyB0aGlzLnlNb3ZlbWVudERpciAqIHRoaXMuc2xpZGVWYWx1ZSk7XG4gICAgICBpZiAodGhpcy5pc01vdmluZykge1xuICAgICAgICAvLyBpdCB0YWtlcyBtb3ZlVGltZSBzZWNvbmRzIHRvIG1vdmUgb25lIHNxdWFyZVxuICAgICAgICB0aGlzLnNsaWRlVmFsdWUgPSB0aGlzLnNsaWRlVmFsdWUgKyBkZWx0YVQgLyB0aGlzLm1vdmVUaW1lO1xuICAgICAgICBpZiAodGhpcy5zbGlkZVZhbHVlID4gMS4wKVxuICAgICAgICB7XG4gICAgICAgICAgLy8gV2UndmUgYXJyaXZlZFxuICAgICAgICAgIHRoaXMuY2VsbEluZGV4UmlnaHQgPSB0aGlzLmNlbGxJbmRleFJpZ2h0ICsgdGhpcy54TW92ZW1lbnREaXI7XG4gICAgICAgICAgdGhpcy5jZWxsSW5kZXhEb3duID0gdGhpcy5jZWxsSW5kZXhEb3duICsgdGhpcy55TW92ZW1lbnREaXI7XG4gICAgICAgICAgdGhpcy5zbGlkZVZhbHVlID0gMDtcbiAgICAgICAgICB0aGlzLnhNb3ZlbWVudERpciA9IDAuMDtcbiAgICAgICAgICB0aGlzLnlNb3ZlbWVudERpciA9IDAuMDtcbiAgICAgICAgICB0aGlzLmlzTW92aW5nID0gZmFsc2U7XG4gICAgICAgICAgdGhpcy5vbkluaXRpYWxDZWxsID0gZmFsc2U7XG4gICAgICAgICAgdGhpcy5yZXN0VGltZXIgPSB0aGlzLm1vdmVUaW1lO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBlbHNlIGlmICh0aGlzLnJlc3RUaW1lciA+IDApXG4gICAgICB7XG4gICAgICAgIC8vIFBpZWNlIGlzIHJlc3RpbmcgYWZ0ZXIgY29tcGxldGluZyBtb3ZlXG4gICAgICAgIHRoaXMucmVzdFRpbWVyID0gdGhpcy5yZXN0VGltZXIgLSBkZWx0YVQ7XG4gICAgICAgIGlmICh0aGlzLnJlc3RUaW1lciA8IDApIHtcbiAgICAgICAgICB0aGlzLnJlc3RUaW1lciA9IDA7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9IC8vIGVuZCBpZiBhY3RpdmUgc3RhdGVcbiAgICBlbHNlIGlmICh0aGlzLl9zdGF0ZSA9PSBcImZyb3plblwiKSB7XG4gICAgICAvLyBzaW5lIHdhdmUgYWxwaGEgZWZmZWN0XG4gICAgICB0aGlzLnNwcml0ZS5hbHBoYSA9IDAuNSArIDAuNSAqIE1hdGguY29zKHRoaXMuZWZmZWN0U2xpZGVyKTtcbiAgICAgIHRoaXMuZWZmZWN0U2xpZGVyID0gdGhpcy5lZmZlY3RTbGlkZXIgKyBkZWx0YVQgKiA0O1xuICAgIH1cbiAgICBlbHNlIGlmICh0aGlzLl9zdGF0ZSA9PSBcImR5aW5nXCIpIHtcbiAgICAgIC8vIGZhZGUgYW5kIHNocmluayBlZmZlY3RcbiAgICAgIHRoaXMuc3ByaXRlLmFscGhhID0gdGhpcy5lZmZlY3RTbGlkZXI7XG4gICAgICB0aGlzLnNwcml0ZS53aWR0aCA9IGNlbGxEaW0gKiAoMC41ICsgdGhpcy5lZmZlY3RTbGlkZXIgLyAyKTtcbiAgICAgIHRoaXMuc3ByaXRlLmhlaWdodCA9IGNlbGxEaW0gKiAoMC41ICsgdGhpcy5lZmZlY3RTbGlkZXIgLyAyKTtcbiAgICAgIHRoaXMuZWZmZWN0U2xpZGVyID0gdGhpcy5lZmZlY3RTbGlkZXIgLSBkZWx0YVQgLyAodGhpcy5tb3ZlVGltZSAqIDQuMCk7XG4gICAgICBpZiAodGhpcy5lZmZlY3RTbGlkZXIgPD0gMC4wKSB7XG4gICAgICAgIHRoaXMuc2V0U3RhdGUoXCJpbmFjdGl2ZVwiKTtcbiAgICAgIH1cbiAgICB9XG4gICAgZWxzZSBpZiAodGhpcy5fc3RhdGUgPT0gXCJleHBsb2RlXCIpIHtcbiAgICAgIC8vIGJ1cnN0IGFuZCBmYWRlIGVmZmVjdFxuICAgICAgdGhpcy5zcHJpdGUuYWxwaGEgPSB0aGlzLmVmZmVjdFNsaWRlcjtcbiAgICAgIHRoaXMuc3ByaXRlLndpZHRoID0gY2VsbERpbSAqICgxLjAgKyAoMy4wIC0gdGhpcy5lZmZlY3RTbGlkZXIgKiAzLjApKTtcbiAgICAgIHRoaXMuc3ByaXRlLmhlaWdodCA9IGNlbGxEaW0gKiAoMS4wICsgKDMuMCAtIHRoaXMuZWZmZWN0U2xpZGVyICogMy4wKSk7XG4gICAgICB0aGlzLmVmZmVjdFNsaWRlciA9IHRoaXMuZWZmZWN0U2xpZGVyIC0gZGVsdGFUIC8gKHRoaXMubW92ZVRpbWUgKiA0LjApO1xuICAgICAgaWYgKHRoaXMuZWZmZWN0U2xpZGVyIDw9IDAuMCkge1xuICAgICAgICB0aGlzLmVmZmVjdFNsaWRlciA9IDE7IC8vIGtlZXAgZXhwbG9kaW5nIGZvcmV2ZXJcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvLyBQdXRzIHRoaXMgY2hhcmFjdGVyIGludG8gb3Igb3V0IG9mIHBhdXNlZCBzdGF0ZVxuICBzZXRQYXVzZWQodmFsOmJvb2xlYW4pIHtcbiAgICBpZiAodGhpcy5wYXVzZWQgPT0gdmFsKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdGhpcy5wYXVzZWQgPSB2YWw7XG4gICAgaWYgKHZhbCkge1xuICAgICAgdGhpcy5lZmZlY3RTbGlkZXIgPSAwO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgIHRoaXMuc3ByaXRlLmFscGhhID0gMTtcbiAgICB9XG4gIH1cblxuICAvLyBVcGRhdGUgZnVuY3Rpb24gY2FsbGVkIHdoaWxlIGNoYXJhY3RlciBpcyBwYXVzZWRcbiAgdXBkYXRlUGF1c2VkKGRlbHRhVCkge1xuICAgIC8vIHNpbmUgd2F2ZSBhbHBoYSBlZmZlY3RcbiAgICB0aGlzLnNwcml0ZS5hbHBoYSA9IDAuNSArIDAuNSAqIE1hdGguY29zKHRoaXMuZWZmZWN0U2xpZGVyKTtcbiAgICB0aGlzLmVmZmVjdFNsaWRlciA9IHRoaXMuZWZmZWN0U2xpZGVyICsgZGVsdGFUICogNDtcbiAgfVxufVxuXG4vKlxuICAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICBSZXByZXNlbnRzIHRoZSBnYW1lIGF0IHRoZSBoaWdoZXN0IGxldmVsLiBNYW5hZ2VzIFVJIGZlYXR1cmVzLCBhbiBBcnJvd0dyaWRcbiAgaW5zdGFuY2UsIGFuZCB0aGUgZ2FtZSBwaWVjZXMuXG4gIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4qL1xuY2xhc3MgVGhlR2FtZSB7XG4gIHRoZUdyaWQ6Z3JpZEZpbGUuQXJyb3dHcmlkO1xuXG4gIGNoZWNrZXJDaGFyYWN0ZXI6R3JpZENoYXJhY3RlcjtcbiAgY2hlY2tNYXJrQ2hhcmFjdGVyOkdyaWRDaGFyYWN0ZXI7XG5cbiAgaW5mb1RleHQ6UElYSS5UZXh0O1xuICByZXNldFRleHQ6UElYSS5UZXh0O1xuICByZXNodWZmbGVUZXh0OlBJWEkuVGV4dDtcbiAgcGF1c2VUZXh0OlBJWEkuVGV4dDtcblxuICBnYW1lU3RhdGU6c3RyaW5nOyAvLyBcInJlYWR5XCIsIFwiaW4gcHJvZ3Jlc3NcIiwgb3IgXCJkb25lXCJcbiAgcGF1c2VkOmJvb2xlYW47XG5cbiAgY29uc3RydWN0b3IoKSB7XG4gICAgdGhpcy50aGVHcmlkID0gbmV3IGdyaWRGaWxlLkFycm93R3JpZCgxMCwgMTAsIHN0YWdlKTtcbiAgICB0aGlzLnRoZUdyaWQuc2V0TW91c2VGdW5jdGlvbnMob25CdXR0b25Eb3duLCBvbkJ1dHRvbk92ZXIsIG9uQnV0dG9uT3V0KTtcblxuICAgIC8vIGNyZWF0ZSBhIHRleHQgb2JqZWN0IHdpdGggYSBuaWNlIHN0cm9rZVxuICAgIHRoaXMuaW5mb1RleHQgPSBuZXcgUElYSS5UZXh0KCdQbGFjZSBwaWVjZSBvbiBib2FyZCcsIHsgZm9udDogJ2JvbGQgMzZweCBBcmlhbCcsIGZpbGw6ICcjZmZmZjAwJywgYWxpZ246ICdsZWZ0Jywgc3Ryb2tlOiAnIzAwMDBGRicsIHN0cm9rZVRoaWNrbmVzczogNCB9KTtcbiAgICB0aGlzLmluZm9UZXh0LnBvc2l0aW9uLnggPSB0aGlzLnRoZUdyaWQuY29udGFpbmVyLnggKyBjZWxsRGltICogKHRoaXMudGhlR3JpZC5kaW1YICsgMSk7XG4gICAgdGhpcy5pbmZvVGV4dC5wb3NpdGlvbi55ID0gdGhpcy50aGVHcmlkLmNvbnRhaW5lci55ICsgY2VsbERpbTtcbiAgICBzdGFnZS5hZGRDaGlsZCh0aGlzLmluZm9UZXh0KTtcblxuICAgIGxldCBjdXJyZW50R2FtZTpUaGVHYW1lID0gdGhpcztcbiAgICB0aGlzLnJlc2V0VGV4dCA9IG5ldyBQSVhJLlRleHQoJ1Jlc2V0JywgeyBmb250OiAnYm9sZCAzMHB4IEFyaWFsJywgZmlsbDogJyMwMDAwZmYnLCBhbGlnbjogJ2xlZnQnLCBzdHJva2U6ICcjRkYwMEZGJywgc3Ryb2tlVGhpY2tuZXNzOiA0IH0pO1xuICAgIHRoaXMucmVzZXRUZXh0LnBvc2l0aW9uLnggPSB0aGlzLnRoZUdyaWQuY29udGFpbmVyLnggKyBjZWxsRGltICogKHRoaXMudGhlR3JpZC5kaW1YICsgMSk7XG4gICAgdGhpcy5yZXNldFRleHQucG9zaXRpb24ueSA9IHRoaXMudGhlR3JpZC5jb250YWluZXIueSArIGNlbGxEaW0gKiAodGhpcy50aGVHcmlkLmRpbVkgLSAzKTtcbiAgICBzdGFnZS5hZGRDaGlsZCh0aGlzLnJlc2V0VGV4dCk7XG4gICAgdGhpcy5yZXNldFRleHQuYnV0dG9uTW9kZSA9IHRydWU7XG4gICAgdGhpcy5yZXNldFRleHQuaW50ZXJhY3RpdmUgPSB0cnVlO1xuICAgIHRoaXMucmVzZXRUZXh0Lm9uKCdtb3VzZWRvd24nLCBmdW5jdGlvbigpIHtcbiAgICAgIGN1cnJlbnRHYW1lLmhhbmRsZVJlc2V0UHJlc3NlZCgpO1xuICAgIH0pO1xuICAgIHRoaXMucmVzZXRUZXh0LnZpc2libGUgPSBmYWxzZTtcblxuICAgIHRoaXMucmVzaHVmZmxlVGV4dCA9IG5ldyBQSVhJLlRleHQoJ1Jlc2h1ZmZsZScsIHsgZm9udDogJ2JvbGQgMzBweCBBcmlhbCcsIGZpbGw6ICcjMDAwMGZmJywgYWxpZ246ICdsZWZ0Jywgc3Ryb2tlOiAnI0ZGMDBGRicsIHN0cm9rZVRoaWNrbmVzczogNCB9KTtcbiAgICB0aGlzLnJlc2h1ZmZsZVRleHQucG9zaXRpb24ueCA9IHRoaXMudGhlR3JpZC5jb250YWluZXIueCArIGNlbGxEaW0gKiAodGhpcy50aGVHcmlkLmRpbVggKyAxKTtcbiAgICB0aGlzLnJlc2h1ZmZsZVRleHQucG9zaXRpb24ueSA9IHRoaXMudGhlR3JpZC5jb250YWluZXIueSArIGNlbGxEaW0gKiAodGhpcy50aGVHcmlkLmRpbVkgLSAyKTtcbiAgICBzdGFnZS5hZGRDaGlsZCh0aGlzLnJlc2h1ZmZsZVRleHQpO1xuICAgIHRoaXMucmVzaHVmZmxlVGV4dC5idXR0b25Nb2RlID0gdHJ1ZTtcbiAgICB0aGlzLnJlc2h1ZmZsZVRleHQuaW50ZXJhY3RpdmUgPSB0cnVlO1xuICAgIHRoaXMucmVzaHVmZmxlVGV4dC5vbignbW91c2Vkb3duJywgZnVuY3Rpb24oKSB7XG4gICAgICBjdXJyZW50R2FtZS5oYW5kbGVSZXNodWZmbGVQcmVzc2VkKCk7XG4gICAgfSk7XG5cbiAgICB0aGlzLnBhdXNlVGV4dCA9IG5ldyBQSVhJLlRleHQoJ1BhdXNlJywgeyBmb250OiAnYm9sZCAzMHB4IEFyaWFsJywgZmlsbDogJyMwMDAwZmYnLCBhbGlnbjogJ2xlZnQnLCBzdHJva2U6ICcjRkYwMEZGJywgc3Ryb2tlVGhpY2tuZXNzOiA0IH0pO1xuICAgIHRoaXMucGF1c2VUZXh0LnBvc2l0aW9uLnggPSB0aGlzLnRoZUdyaWQuY29udGFpbmVyLnggKyBjZWxsRGltICogKHRoaXMudGhlR3JpZC5kaW1YICsgMSk7XG4gICAgdGhpcy5wYXVzZVRleHQucG9zaXRpb24ueSA9IHRoaXMudGhlR3JpZC5jb250YWluZXIueSArIGNlbGxEaW0gKiAodGhpcy50aGVHcmlkLmRpbVkgLSAxKTtcbiAgICBzdGFnZS5hZGRDaGlsZCh0aGlzLnBhdXNlVGV4dCk7XG4gICAgdGhpcy5wYXVzZVRleHQuYnV0dG9uTW9kZSA9IHRydWU7XG4gICAgdGhpcy5wYXVzZVRleHQuaW50ZXJhY3RpdmUgPSB0cnVlO1xuICAgIHRoaXMucGF1c2VUZXh0Lm9uKCdtb3VzZWRvd24nLCBmdW5jdGlvbigpIHtcbiAgICAgIGN1cnJlbnRHYW1lLmhhbmRsZVBhdXNlUHJlc3NlZCgpO1xuICAgIH0pO1xuICAgIHRoaXMucGF1c2VUZXh0LnZpc2libGUgPSBmYWxzZTtcblxuICAgIC8vIEluaXRpYWxpemUgY2hhcmFjdGVyc1xuICAgIHRoaXMuY2hlY2tlckNoYXJhY3RlciA9IG5ldyBHcmlkQ2hhcmFjdGVyKCdpbWFnZXMvcmVkLWNoZWNrZXIucG5nJywgdGhpcy50aGVHcmlkLmNvbnRhaW5lcik7XG4gICAgdGhpcy5jaGVja2VyQ2hhcmFjdGVyLm1vdmVUaW1lID0gMC41O1xuICAgIHRoaXMuY2hlY2tNYXJrQ2hhcmFjdGVyID0gbmV3IEdyaWRDaGFyYWN0ZXIoJ2ltYWdlcy9ncmVlbi1jaGVjay1tYXJrLnBuZycsIHRoaXMudGhlR3JpZC5jb250YWluZXIpO1xuICAgIHRoaXMuY2hlY2tNYXJrQ2hhcmFjdGVyLm1vdmVUaW1lID0gMC4yNTtcblxuICAgIHRoaXMuZ2FtZVN0YXRlID0gXCJyZWFkeVwiO1xuICAgIHRoaXMucGF1c2VkID0gZmFsc2U7XG4gIH1cblxuICAvLyBNYWluIHVwZGF0ZSBmdW5jdGlvbi4gZGVsdGFUIGlzIHNlY29uZHMgZWxhcHNlZCBzaW5jZSBsYXN0IGNhbGwuXG4gIHVwZGF0ZShkZWx0YVQ6bnVtYmVyKSB7XG4gICAgbGV0IGNoYXJhY3RlcnM6R3JpZENoYXJhY3RlcltdID0gW3RoaXMuY2hlY2tlckNoYXJhY3RlciwgdGhpcy5jaGVja01hcmtDaGFyYWN0ZXJdO1xuXG4gICAgaWYgKHRoaXMucGF1c2VkKSB7XG4gICAgICBmb3IgKGxldCBjaGFyIG9mIGNoYXJhY3RlcnMpIHtcbiAgICAgICAgY2hhci51cGRhdGVQYXVzZWQoZGVsdGFUKTtcbiAgICAgIH1cbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBmb3IgKGxldCBjaGFyIG9mIGNoYXJhY3RlcnMpIHtcbiAgICAgIGNoYXIudXBkYXRlKGRlbHRhVCk7XG4gICAgICBpZiAoY2hhci5yZWFkeVRvTW92ZSgpKSB7XG4gICAgICAgIC8vIEhhcyBjaGFyYWN0ZXIgZmFsbGVuIG9mZiBncmlkP1xuICAgICAgICBpZiAoY2hhci5jZWxsSW5kZXhEb3duIDwgMCB8fCBjaGFyLmNlbGxJbmRleERvd24gPj0gdGhpcy50aGVHcmlkLmRpbVkgfHxcbiAgICAgICAgICBjaGFyLmNlbGxJbmRleFJpZ2h0IDwgMCB8fCBjaGFyLmNlbGxJbmRleFJpZ2h0ID49IHRoaXMudGhlR3JpZC5kaW1YKSB7XG4gICAgICAgICAgY2hhci5pc09uR3JpZCA9IGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIGVsc2VcbiAgICAgICAge1xuICAgICAgICAgIC8vIENoYXJhY3RlciBpcyBzdGlsbCBvbiBib2FyZFxuICAgICAgICAgIGxldCBjZWxsOmdyaWRGaWxlLkdyaWRDZWxsID0gdGhpcy50aGVHcmlkLmdldENlbGwoY2hhci5jZWxsSW5kZXhSaWdodCwgY2hhci5jZWxsSW5kZXhEb3duKTtcbiAgICAgICAgICBjZWxsLnNldFZpc2l0ZWQodHJ1ZSk7XG4gICAgICAgICAgY2hhci5yZXF1ZXN0TmV3TW92ZShjZWxsLmRpcmVjdGlvbik7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9IC8vIGVuZCBmb3JcblxuICAgIGlmICghdGhpcy5jaGVja2VyQ2hhcmFjdGVyLmlzT25HcmlkKSB7XG4gICAgICAvLyBzbG93ZXItbW92aW5nIHBpZWNlIGhhcyBsZWZ0IHRoZSBib2FyZFxuICAgICAgdGhpcy5jaGVja2VyQ2hhcmFjdGVyLnNldFN0YXRlKFwiZnJvemVuXCIpO1xuICAgIH1cbiAgICBpZiAoIXRoaXMuY2hlY2tNYXJrQ2hhcmFjdGVyLmlzT25HcmlkKSB7XG4gICAgICAvLyBmYXN0ZXItbW92aW5nIHBpZWNlIGhhcyBsZWZ0IHRoZSBib2FyZFxuICAgICAgdGhpcy5jaGVja01hcmtDaGFyYWN0ZXIuc2V0U3RhdGUoXCJkeWluZ1wiKTtcbiAgICAgIHRoaXMuY2hlY2tlckNoYXJhY3Rlci5zZXRTdGF0ZShcImZyb3plblwiKTtcbiAgICAgIHRoaXMuaW5mb1RleHQudGV4dCA9IFwiTm8gTG9vcFwiO1xuICAgICAgdGhpcy5nYW1lU3RhdGUgPSBcImRvbmVcIjtcbiAgICAgIHRoaXMucmVzZXRUZXh0LnZpc2libGUgPSB0cnVlO1xuICAgICAgdGhpcy5yZXNodWZmbGVUZXh0LnZpc2libGUgPSB0cnVlO1xuICAgICAgdGhpcy5wYXVzZVRleHQudmlzaWJsZSA9IGZhbHNlO1xuICAgIH1cbiAgICAvLyBBcmUgYm90aCBwaWVjZXMgb24gdGhlIHNhbWUgc3F1YXJlPyBJZiBzbywgdGhlIGZhc3Rlci1tb3Zpbmcgb25lIGhhcyBjYXVnaHQgdXAgd2l0aFxuICAgIC8vIHRoZSBzbG93ZXIuXG4gICAgZWxzZSBpZiAoY2hhcmFjdGVyc1swXS50ZXN0Q29sbGlzaW9uKGNoYXJhY3RlcnNbMV0pKSB7XG4gICAgICAgIC8vIFdlJ3ZlIGNhdWdodCB1cFxuICAgICAgICB0aGlzLmNoZWNrZXJDaGFyYWN0ZXIuc2V0U3RhdGUoXCJmcm96ZW5cIik7XG4gICAgICAgIHRoaXMuY2hlY2tNYXJrQ2hhcmFjdGVyLnNldFN0YXRlKFwiZXhwbG9kZVwiKTtcbiAgICAgICAgdGhpcy5pbmZvVGV4dC50ZXh0ID0gXCJMb29wIERldGVjdGVkIVwiXG4gICAgICAgIHRoaXMuZ2FtZVN0YXRlID0gXCJkb25lXCI7XG4gICAgICAgIHRoaXMucmVzZXRUZXh0LnZpc2libGUgPSB0cnVlO1xuICAgICAgICB0aGlzLnJlc2h1ZmZsZVRleHQudmlzaWJsZSA9IHRydWU7XG4gICAgICAgIHRoaXMucGF1c2VUZXh0LnZpc2libGUgPSBmYWxzZTtcbiAgICB9XG4gIH1cblxuICAvLyBDYWxsZWQgd2hlbiB1c2VyIGNsaWNrcyBvbiBhbiBhcnJvdyBjZWxsXG4gIGhhbmRsZUNlbGxQcmVzcyhwaXhYOm51bWJlciwgcGl4WTpudW1iZXIpIHtcbiAgICBsZXQgY2VsbFggPSBNYXRoLmZsb29yKHBpeFggLyBjZWxsRGltKTtcbiAgICBsZXQgY2VsbFkgPSBNYXRoLmZsb29yKHBpeFkgLyBjZWxsRGltKTtcbiAgICBjb25zb2xlLmxvZyhcImJ1dHRvbiBjZWxsOiBcIiArIGNlbGxYICsgXCIsXCIgKyBjZWxsWSk7XG4gICAgaWYgKHRoaXMuY2hlY2tlckNoYXJhY3Rlci5nZXRTdGF0ZSgpID09IFwiaW5hY3RpdmVcIikge1xuICAgICAgdGhpcy5jaGVja2VyQ2hhcmFjdGVyLnNldFBvc2l0aW9uKGNlbGxYLCBjZWxsWSk7XG4gICAgICB0aGlzLmNoZWNrTWFya0NoYXJhY3Rlci5zZXRQb3NpdGlvbihjZWxsWCwgY2VsbFkpO1xuICAgICAgdGhpcy5pbmZvVGV4dC50ZXh0ID0gXCJUcmF2ZWxpbmcuLi5cIlxuICAgICAgdGhpcy5nYW1lU3RhdGUgPSBcImluIHByb2dyZXNzXCI7XG4gICAgICB0aGlzLnJlc2V0VGV4dC52aXNpYmxlID0gZmFsc2U7XG4gICAgICB0aGlzLnJlc2h1ZmZsZVRleHQudmlzaWJsZSA9IGZhbHNlO1xuICAgICAgdGhpcy5wYXVzZVRleHQudmlzaWJsZSA9IHRydWU7XG4gICAgfVxuICB9XG5cbiAgaGFuZGxlQ2VsbE92ZXIocGl4WDpudW1iZXIsIHBpeFk6bnVtYmVyKSB7XG4gICAgbGV0IGNlbGxYID0gTWF0aC5mbG9vcihwaXhYIC8gY2VsbERpbSk7XG4gICAgbGV0IGNlbGxZID0gTWF0aC5mbG9vcihwaXhZIC8gY2VsbERpbSk7XG4gICAgbGV0IGNlbGw6Z3JpZEZpbGUuR3JpZENlbGwgPSB0aGlzLnRoZUdyaWQuZ2V0Q2VsbChjZWxsWCwgY2VsbFkpO1xuICAgIGNlbGwuc2V0SGlnaGxpZ2h0KHRydWUpO1xuICB9XG5cbiAgaGFuZGxlQ2VsbE91dChwaXhYOm51bWJlciwgcGl4WTpudW1iZXIpIHtcbiAgICBsZXQgY2VsbFggPSBNYXRoLmZsb29yKHBpeFggLyBjZWxsRGltKTtcbiAgICBsZXQgY2VsbFkgPSBNYXRoLmZsb29yKHBpeFkgLyBjZWxsRGltKTtcbiAgICBsZXQgY2VsbDpncmlkRmlsZS5HcmlkQ2VsbCA9IHRoaXMudGhlR3JpZC5nZXRDZWxsKGNlbGxYLCBjZWxsWSk7XG4gICAgY2VsbC5zZXRIaWdobGlnaHQoZmFsc2UpO1xuICB9XG5cbiAgaGFuZGxlUmVzZXRQcmVzc2VkKCkge1xuICAgIHRoaXMudGhlR3JpZC5yZXNldEFycm93cygpO1xuICAgIHRoaXMuY2hlY2tlckNoYXJhY3Rlci5zZXRTdGF0ZShcImluYWN0aXZlXCIpO1xuICAgIHRoaXMuY2hlY2tNYXJrQ2hhcmFjdGVyLnNldFN0YXRlKFwiaW5hY3RpdmVcIik7XG4gICAgdGhpcy5pbmZvVGV4dC50ZXh0ID0gXCJQbGFjZSBwaWVjZSBvbiBib2FyZFwiO1xuICAgIHRoaXMuZ2FtZVN0YXRlID0gXCJyZWFkeVwiO1xuICB9XG5cbiAgaGFuZGxlUmVzaHVmZmxlUHJlc3NlZCgpIHtcbiAgICB0aGlzLnRoZUdyaWQucmVzaHVmZmxlQXJyb3dzKCk7XG4gICAgdGhpcy5jaGVja2VyQ2hhcmFjdGVyLnNldFN0YXRlKFwiaW5hY3RpdmVcIik7XG4gICAgdGhpcy5jaGVja01hcmtDaGFyYWN0ZXIuc2V0U3RhdGUoXCJpbmFjdGl2ZVwiKTtcbiAgICB0aGlzLmluZm9UZXh0LnRleHQgPSBcIlBsYWNlIHBpZWNlIG9uIGJvYXJkXCI7XG4gICAgdGhpcy5nYW1lU3RhdGUgPSBcInJlYWR5XCI7XG4gIH1cblxuICBoYW5kbGVQYXVzZVByZXNzZWQoKSB7XG4gICAgbGV0IHBhdXNlZFN0YXRlOmJvb2xlYW4gPSAhdGhpcy5wYXVzZWQ7XG5cbiAgICBpZiAocGF1c2VkU3RhdGUpIHtcbiAgICAgIHRoaXMucGF1c2VUZXh0LnRleHQgPSBcIlVucGF1c2VcIjtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICB0aGlzLnBhdXNlVGV4dC50ZXh0ID0gXCJQYXVzZVwiO1xuICAgIH1cbiAgICB0aGlzLmNoZWNrZXJDaGFyYWN0ZXIuc2V0UGF1c2VkKHBhdXNlZFN0YXRlKTtcbiAgICB0aGlzLmNoZWNrTWFya0NoYXJhY3Rlci5zZXRQYXVzZWQocGF1c2VkU3RhdGUpO1xuICAgIHRoaXMucGF1c2VkID0gcGF1c2VkU3RhdGU7XG4gIH1cbn1cblxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8vIEdsb2JhbCB2YXJzIGFuZCBiYXNpYyBzZXR1cFxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuLy8gR3JhcGhpY2FsIGNvbnRhaW5lclxuXG4vLyBjcmVhdGUgdGhlIHJvb3Qgb2YgdGhlIHNjZW5lIGdyYXBoXG52YXIgc3RhZ2UgPSBuZXcgUElYSS5Db250YWluZXIoKTtcblxubGV0IGdhbWVJbnN0YW5jZTpUaGVHYW1lO1xuXG5kb1NldHVwKCk7XG5cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLyBGdW5jdGlvbiBkZWZpbml0aW9uc1xuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuLy8gVGhlcmUncyBwcm9iYWJseSBhIGxlc3MgYXdrd2FyZCB3YXkgdG8gZG8gdGhlc2UgYnV0dG9uIGZ1bmN0aW9ucywgYnV0IG91dHRhIHRpbWUuXG4vLyBUaGV5IHJlc3BvbmQgdG8gaW50ZXJhY3Rpb25zIHdpdGggaW5kaXZpZHVhbCBhcnJvd3MgYW5kIHBhc3MgdGhlIGNhbGwgb24gdG9cbi8vIHRoZSBhcnJvdyBncmlkLlxuXG5mdW5jdGlvbiBvbkJ1dHRvbkRvd24oKVxue1xuICBnYW1lSW5zdGFuY2UuaGFuZGxlQ2VsbFByZXNzKHRoaXMueCwgdGhpcy55KTtcbn1cblxuZnVuY3Rpb24gb25CdXR0b25PdmVyKClcbntcbiAgZ2FtZUluc3RhbmNlLmhhbmRsZUNlbGxPdmVyKHRoaXMueCwgdGhpcy55KTtcbn1cblxuZnVuY3Rpb24gb25CdXR0b25PdXQoKVxue1xuICBnYW1lSW5zdGFuY2UuaGFuZGxlQ2VsbE91dCh0aGlzLngsIHRoaXMueSk7XG59XG5cbmZ1bmN0aW9uIHVwZGF0ZSgpIHtcbiAgICBnYW1lSW5zdGFuY2UudXBkYXRlKDAuMDEpOyAvLyBhZHZhbmNlIGNsb2NrIGJ5IDEvMTAwdGggb2YgYSBzZWNvbmRcbn1cblxuZnVuY3Rpb24gZG9TZXR1cCgpIHtcbiAgLy9jcmVhdGVHcmlkKCk7XG4gIGNvbnNvbGUubG9nKFwiVGVzdFwiKTtcbiAgZ2FtZUluc3RhbmNlID0gbmV3IFRoZUdhbWUoKTtcbiAgLy8gQSBmdW5jdGlvbiB0aGF0IHVwZGF0ZXMgYSBodW5kcmVkIHRpbWVzIGEgc2Vjb25kXG4gIHNldEludGVydmFsKHVwZGF0ZSwgMTApO1xuICBhbmltYXRlKCk7XG59XG5cbmZ1bmN0aW9uIGFuaW1hdGUoKSB7XG5cbiAgICByZXF1ZXN0QW5pbWF0aW9uRnJhbWUoYW5pbWF0ZSk7XG5cbiAgICAvLyByZW5kZXIgdGhlIHJvb3QgY29udGFpbmVyXG4gICAgcmVuZGVyZXIucmVuZGVyKHN0YWdlKTtcbn1cbiJdfQ==
