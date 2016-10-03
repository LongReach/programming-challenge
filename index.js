(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.jiboProgrammingChallenge = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
/// <reference path="../typings/index.d.ts" />
"use strict";
var PIXI = require('pixi.js');
var renderer = new PIXI.WebGLRenderer(1280, 720);
document.body.appendChild(renderer.view);
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
        // onEvent functions are global functions (towards bottom of file)
        arrow.buttonMode = true;
        arrow.interactive = true;
        arrow.on('mousedown', onButtonDown);
        arrow.on('mouseover', onButtonOver);
        arrow.on('mouseout', onButtonOut);
    }
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
/*
  --------------------------------------------
  Represents the entire game board. Contains a 2d array of GricCell objects.
  --------------------------------------------
*/
var ArrowGrid = (function () {
    function ArrowGrid(width, height) {
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
        this.theGrid = new ArrowGrid(10, 10);
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
// Array and dimensions for the grid
var cellDim = 50;
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
},{"pixi.js":undefined}]},{},[1])(1)
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQSw4Q0FBOEM7O0FBRTlDLElBQU8sSUFBSSxXQUFXLFNBQVMsQ0FBQyxDQUFDO0FBQ2pDLElBQU0sUUFBUSxHQUFzQixJQUFJLElBQUksQ0FBQyxhQUFhLENBQUMsSUFBSSxFQUFFLEdBQUcsQ0FBQyxDQUFDO0FBQ3RFLFFBQVEsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQztBQUV6QywwQkFBMEI7QUFDMUIsb0JBQW9CO0FBQ3BCLDBCQUEwQjtBQUUxQjs7OztFQUlFO0FBQ0Y7SUFRRSxrQkFBWSxDQUFRLEVBQUUsQ0FBUSxFQUFFLFNBQXdCO1FBQ3RELElBQUksS0FBSyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLHVCQUF1QixDQUFDLENBQUM7UUFDM0QsS0FBSyxDQUFDLENBQUMsR0FBRyxPQUFPLEdBQUcsQ0FBQyxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUM7UUFDOUIsS0FBSyxDQUFDLENBQUMsR0FBRyxPQUFPLEdBQUcsQ0FBQyxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUM7UUFDOUIsS0FBSyxDQUFDLEtBQUssR0FBRyxPQUFPLENBQUM7UUFDdEIsS0FBSyxDQUFDLE1BQU0sR0FBRyxPQUFPLENBQUM7UUFDdkIsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDLEdBQUcsR0FBRyxDQUFDO1FBQ3JCLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBQztRQUNyQixTQUFTLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQzFCLElBQUksQ0FBQyxLQUFLLEdBQUcsQ0FBQyxDQUFDO1FBQ2YsSUFBSSxDQUFDLEtBQUssR0FBRyxDQUFDLENBQUM7UUFDZixJQUFJLENBQUMsTUFBTSxHQUFHLEtBQUssQ0FBQztRQUNwQixJQUFJLENBQUMsU0FBUyxHQUFHLENBQUMsQ0FBQztRQUNuQixJQUFJLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBRXZCLGtFQUFrRTtRQUNsRSxLQUFLLENBQUMsVUFBVSxHQUFHLElBQUksQ0FBQztRQUN4QixLQUFLLENBQUMsV0FBVyxHQUFHLElBQUksQ0FBQztRQUN6QixLQUFLLENBQUMsRUFBRSxDQUFDLFdBQVcsRUFBRSxZQUFZLENBQUMsQ0FBQztRQUNwQyxLQUFLLENBQUMsRUFBRSxDQUFDLFdBQVcsRUFBRSxZQUFZLENBQUMsQ0FBQztRQUNwQyxLQUFLLENBQUMsRUFBRSxDQUFDLFVBQVUsRUFBRSxXQUFXLENBQUMsQ0FBQTtJQUNuQyxDQUFDO0lBRUQsaUVBQWlFO0lBQ2pFLCtCQUFZLEdBQVosVUFBYSxHQUFHO1FBQ2QsSUFBTSxFQUFFLEdBQUcsVUFBVSxDQUFDO1FBQ3RCLElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUSxHQUFHLEVBQUUsR0FBRyxHQUFHLEdBQUcsR0FBRyxDQUFDO1FBQ3RDLElBQUksQ0FBQyxTQUFTLEdBQUcsR0FBRyxDQUFDO0lBQ3ZCLENBQUM7SUFFRCxvREFBb0Q7SUFDcEQsNkJBQVUsR0FBVixVQUFXLEtBQWE7UUFDdEIsRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztZQUNWLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxHQUFHLFFBQVEsQ0FBQyxDQUFDLGdCQUFnQjtRQUMvQyxDQUFDO1FBQ0QsSUFBSSxDQUFDLENBQUM7WUFDSixJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksR0FBRyxRQUFRLENBQUM7UUFDOUIsQ0FBQztRQUNELElBQUksQ0FBQyxPQUFPLEdBQUcsS0FBSyxDQUFDO0lBQ3ZCLENBQUM7SUFFRCxrREFBa0Q7SUFDbEQsbURBQW1EO0lBQ25ELCtCQUFZLEdBQVosVUFBYSxLQUFhO1FBQ3hCLElBQUksWUFBWSxHQUFXLElBQUksQ0FBQyxPQUFPLENBQUM7UUFDeEMsRUFBRSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO1lBQ1gsS0FBSyxHQUFHLFlBQVksQ0FBQztRQUN2QixDQUFDO1FBQ0QsSUFBSSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUN2QixJQUFJLENBQUMsT0FBTyxHQUFHLFlBQVksQ0FBQztJQUM5QixDQUFDO0lBQ0gsZUFBQztBQUFELENBM0RBLEFBMkRDLElBQUE7QUFFRDs7OztFQUlFO0FBQ0Y7SUFNRSxtQkFBWSxLQUFZLEVBQUUsTUFBYTtRQUNyQyxJQUFJLENBQUMsU0FBUyxHQUFHLElBQUksSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDO1FBQ3RDLEtBQUssQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBQy9CLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBQztRQUN2QixJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsR0FBRyxFQUFFLENBQUM7UUFDdEIsSUFBSSxDQUFDLElBQUksR0FBRyxLQUFLLENBQUM7UUFDbEIsSUFBSSxDQUFDLElBQUksR0FBRyxNQUFNLENBQUM7UUFDbkIsSUFBSSxDQUFDLElBQUksR0FBRyxFQUFFLENBQUM7UUFDZixHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQ2hDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEdBQUcsRUFBRSxDQUFDO1lBQ2xCLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsS0FBSyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7Z0JBQy9CLElBQUksT0FBTyxHQUFZLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDO2dCQUMxRCxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLE9BQU8sQ0FBQztZQUM1QixDQUFDO1lBQUEsQ0FBQztRQUNKLENBQUM7UUFDRCxJQUFJLENBQUMsZUFBZSxFQUFFLENBQUM7SUFDekIsQ0FBQztJQUVELCtCQUErQjtJQUMvQiwrQkFBVyxHQUFYO1FBQ0UsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDbkMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7Z0JBQ25DLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxDQUFDO1lBQ3BDLENBQUM7WUFBQSxDQUFDO1FBQ0osQ0FBQztJQUNILENBQUM7SUFFRCw0REFBNEQ7SUFDNUQsbUNBQWUsR0FBZjtRQUNFLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQ25DLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO2dCQUNuQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsQ0FBQztnQkFDbEMsa0ZBQWtGO2dCQUNsRixJQUFJLGlCQUFpQixHQUFhLENBQUMsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLEtBQUssQ0FBQyxDQUFDO2dCQUNsRSxxQ0FBcUM7Z0JBQ3JDLEVBQUUsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7b0JBQzlDLG1DQUFtQztvQkFDbkMsaUJBQWlCLENBQUMsQ0FBQyxDQUFDLEdBQUcsS0FBSyxDQUFDO2dCQUUvQixDQUFDO2dCQUNELHdDQUF3QztnQkFDeEMsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztvQkFDOUMsNEJBQTRCO29CQUM1QixpQkFBaUIsQ0FBQyxDQUFDLENBQUMsR0FBRyxLQUFLLENBQUM7Z0JBRS9CLENBQUM7Z0JBQ0QsSUFBSSxpQkFBaUIsR0FBVSxDQUFDLENBQUMsQ0FBQyxxREFBcUQ7Z0JBQ3ZGLE9BQU8saUJBQWlCLENBQUMsaUJBQWlCLENBQUMsSUFBSSxLQUFLLEVBQ3BELENBQUM7b0JBQ0MsaUJBQWlCLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLEdBQUcsR0FBRyxDQUFDLENBQUM7Z0JBQ3RELENBQUM7Z0JBQ0QsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxZQUFZLENBQUMsaUJBQWlCLENBQUMsQ0FBQztZQUNsRCxDQUFDO1lBQUEsQ0FBQztRQUNKLENBQUM7SUFDSCxDQUFDO0lBRUQsa0RBQWtEO0lBQ2xELDJCQUFPLEdBQVAsVUFBUSxLQUFZLEVBQUUsS0FBWTtRQUNoQyxNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUNqQyxDQUFDO0lBQ0gsZ0JBQUM7QUFBRCxDQWxFQSxBQWtFQyxJQUFBO0FBRUQ7Ozs7OztFQU1FO0FBQ0Y7SUFvQkUsdUJBQVksSUFBVyxFQUFFLFNBQXdCO1FBQy9DLElBQUksQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDMUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLEdBQUcsT0FBTyxDQUFDO1FBQzVCLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxHQUFHLE9BQU8sQ0FBQztRQUM3QixJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEdBQUcsR0FBRyxDQUFDO1FBQzNCLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsR0FBRyxHQUFHLENBQUM7UUFDM0IsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLEdBQUcsQ0FBQyxDQUFDO1FBQ3RCLFNBQVMsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBRWhDLElBQUksQ0FBQyxZQUFZLEdBQUcsQ0FBQyxDQUFDO1FBQ3RCLElBQUksQ0FBQyxZQUFZLEdBQUcsQ0FBQyxDQUFDO1FBQ3RCLElBQUksQ0FBQyxRQUFRLEdBQUcsS0FBSyxDQUFDO1FBQ3RCLElBQUksQ0FBQyxRQUFRLEdBQUcsSUFBSSxDQUFDO1FBQ3JCLElBQUksQ0FBQyxNQUFNLEdBQUcsS0FBSyxDQUFDO1FBQ3BCLElBQUksQ0FBQyxTQUFTLEdBQUcsQ0FBQyxDQUFDO1FBQ25CLElBQUksQ0FBQyxRQUFRLEdBQUcsR0FBRyxDQUFDO1FBQ3BCLElBQUksQ0FBQyxNQUFNLEdBQUcsVUFBVSxDQUFDO0lBQzNCLENBQUM7SUFFRCxzREFBc0Q7SUFDdEQsbUNBQVcsR0FBWCxVQUFZLENBQVEsRUFBRSxDQUFRO1FBQzVCLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxHQUFHLE9BQU8sR0FBRyxDQUFDLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQztRQUNwQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsR0FBRyxPQUFPLEdBQUcsQ0FBQyxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUM7UUFDcEMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLEdBQUcsT0FBTyxDQUFDO1FBQzVCLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxHQUFHLE9BQU8sQ0FBQztRQUM3QixJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssR0FBRyxDQUFDLENBQUM7UUFDdEIsSUFBSSxDQUFDLGFBQWEsR0FBRyxDQUFDLENBQUM7UUFDdkIsSUFBSSxDQUFDLGNBQWMsR0FBRyxDQUFDLENBQUM7UUFDeEIsSUFBSSxDQUFDLGFBQWEsR0FBRyxJQUFJLENBQUM7UUFDMUIsSUFBSSxDQUFDLE1BQU0sR0FBRyxLQUFLLENBQUM7UUFDcEIsSUFBSSxDQUFDLFFBQVEsR0FBRyxLQUFLLENBQUM7UUFDdEIsSUFBSSxDQUFDLFFBQVEsR0FBRyxJQUFJLENBQUM7UUFDckIsSUFBSSxDQUFDLFVBQVUsR0FBRyxDQUFDLENBQUM7UUFDcEIsSUFBSSxDQUFDLFNBQVMsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsbUNBQW1DO1FBQ25FLElBQUksQ0FBQyxNQUFNLEdBQUcsUUFBUSxDQUFDO0lBQ3pCLENBQUM7SUFFRCxxREFBcUQ7SUFDckQsbUNBQVcsR0FBWDtRQUNFLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxNQUFNLElBQUksUUFBUSxDQUFDLENBQUMsQ0FBQztZQUM1QixNQUFNLENBQUMsS0FBSyxDQUFDO1FBQ2YsQ0FBQztRQUNELE1BQU0sQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLFFBQVEsSUFBSSxJQUFJLENBQUMsU0FBUyxJQUFJLENBQUMsQ0FBQyxDQUFDO0lBQ2pELENBQUM7SUFFRCw0RUFBNEU7SUFDNUUscUNBQWEsR0FBYixVQUFjLEtBQW1CO1FBQy9CLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxhQUFhLElBQUksS0FBSyxDQUFDLGFBQWEsSUFBSSxJQUFJLENBQUMsTUFBTSxJQUFJLFFBQVEsQ0FBQyxDQUFDLENBQUM7WUFDekUsTUFBTSxDQUFDLEtBQUssQ0FBQztRQUNmLENBQUM7UUFDRCxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsYUFBYSxJQUFJLEtBQUssQ0FBQyxhQUFhO1lBQzNDLElBQUksQ0FBQyxjQUFjLElBQUksS0FBSyxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUM7WUFDMUMsTUFBTSxDQUFDLElBQUksQ0FBQztRQUNsQixDQUFDO1FBQ0QsTUFBTSxDQUFDLEtBQUssQ0FBQztJQUNmLENBQUM7SUFFRCx5REFBeUQ7SUFDekQscUNBQXFDO0lBQ3JDLHNDQUFjLEdBQWQsVUFBZSxTQUFTO1FBQ3RCLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxNQUFNLElBQUksUUFBUSxDQUFDLENBQUMsQ0FBQztZQUM1QixNQUFNLENBQUM7UUFDVCxDQUFDO1FBQ0QsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUM7WUFDbEIsTUFBTSxDQUFDLENBQUMsb0NBQW9DO1FBQzlDLENBQUM7UUFDRCxFQUFFLENBQUMsQ0FBQyxTQUFTLElBQUksQ0FBQyxDQUFDLENBQ25CLENBQUM7WUFDQyxJQUFJLENBQUMsWUFBWSxHQUFHLENBQUMsR0FBRyxDQUFDO1lBQ3pCLElBQUksQ0FBQyxZQUFZLEdBQUksR0FBRyxDQUFDO1FBQzNCLENBQUM7UUFDRCxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsU0FBUyxJQUFJLENBQUMsQ0FBQyxDQUN4QixDQUFDO1lBQ0MsSUFBSSxDQUFDLFlBQVksR0FBSSxHQUFHLENBQUM7WUFDekIsSUFBSSxDQUFDLFlBQVksR0FBRyxDQUFDLEdBQUcsQ0FBQztRQUMzQixDQUFDO1FBQ0QsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLFNBQVMsSUFBSSxDQUFDLENBQUMsQ0FDeEIsQ0FBQztZQUNDLElBQUksQ0FBQyxZQUFZLEdBQUksR0FBRyxDQUFDO1lBQ3pCLElBQUksQ0FBQyxZQUFZLEdBQUksR0FBRyxDQUFDO1FBQzNCLENBQUM7UUFDRCxJQUFJLENBQ0osQ0FBQztZQUNDLElBQUksQ0FBQyxZQUFZLEdBQUksR0FBRyxDQUFDO1lBQ3pCLElBQUksQ0FBQyxZQUFZLEdBQUksR0FBRyxDQUFDO1FBQzNCLENBQUM7UUFDRCxJQUFJLENBQUMsVUFBVSxHQUFHLENBQUMsQ0FBQztRQUNwQixJQUFJLENBQUMsUUFBUSxHQUFHLElBQUksQ0FBQztJQUN2QixDQUFDO0lBRUQsMENBQTBDO0lBQzFDLGlGQUFpRjtJQUNqRixnQ0FBUSxHQUFSLFVBQVMsS0FBWTtRQUNuQixFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsTUFBTSxJQUFJLEtBQUssSUFBSSxJQUFJLENBQUMsTUFBTSxJQUFJLFVBQVUsQ0FBQyxDQUFDLENBQUM7WUFDdEQsc0VBQXNFO1lBQ3RFLGNBQWM7WUFDZCxNQUFNLENBQUM7UUFDVCxDQUFDO1FBQ0QsT0FBTyxDQUFDLEdBQUcsQ0FBQyxXQUFXLEdBQUcsS0FBSyxDQUFDLENBQUM7UUFDakMsSUFBSSxDQUFDLE1BQU0sR0FBRyxLQUFLLENBQUM7UUFDcEIsRUFBRSxDQUFDLENBQUMsS0FBSyxJQUFJLFFBQVEsQ0FBQyxDQUFDLENBQUM7WUFDdEIsSUFBSSxDQUFDLFlBQVksR0FBRyxDQUFDLENBQUM7UUFDeEIsQ0FBQztRQUNELElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxLQUFLLElBQUksT0FBTyxDQUFDLENBQUMsQ0FBQztZQUMxQixJQUFJLENBQUMsWUFBWSxHQUFHLENBQUMsQ0FBQztRQUN4QixDQUFDO1FBQ0QsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEtBQUssSUFBSSxTQUFTLENBQUMsQ0FBQyxDQUFDO1lBQzVCLElBQUksQ0FBQyxZQUFZLEdBQUcsQ0FBQyxDQUFDO1FBQ3hCLENBQUM7UUFDRCxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsS0FBSyxJQUFJLFVBQVUsQ0FBQyxDQUFDLENBQUM7WUFDN0IsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLEdBQUcsQ0FBQyxDQUFDO1lBQ3RCLElBQUksQ0FBQyxRQUFRLEdBQUcsS0FBSyxDQUFDO1lBQ3RCLElBQUksQ0FBQyxRQUFRLEdBQUcsSUFBSSxDQUFDO1FBQ3ZCLENBQUM7SUFDSCxDQUFDO0lBRUQsb0NBQW9DO0lBQ3BDLGdDQUFRLEdBQVI7UUFDRSxNQUFNLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQztJQUNyQixDQUFDO0lBRUQsNEVBQTRFO0lBQzVFLFFBQVE7SUFDUiw4QkFBTSxHQUFOLFVBQU8sTUFBTTtRQUNYLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxNQUFNLElBQUksUUFBUSxDQUFDLENBQUMsQ0FBQztZQUM1QixJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsR0FBRyxPQUFPLEdBQUcsQ0FBQyxJQUFJLENBQUMsY0FBYyxHQUFHLEdBQUcsR0FBRyxJQUFJLENBQUMsWUFBWSxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQztZQUM1RixJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsR0FBRyxPQUFPLEdBQUcsQ0FBQyxJQUFJLENBQUMsYUFBYSxHQUFHLEdBQUcsR0FBRyxJQUFJLENBQUMsWUFBWSxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQztZQUMzRixFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQztnQkFDbEIsK0NBQStDO2dCQUMvQyxJQUFJLENBQUMsVUFBVSxHQUFHLElBQUksQ0FBQyxVQUFVLEdBQUcsTUFBTSxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUM7Z0JBQzNELEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxVQUFVLEdBQUcsR0FBRyxDQUFDLENBQzFCLENBQUM7b0JBQ0MsZ0JBQWdCO29CQUNoQixJQUFJLENBQUMsY0FBYyxHQUFHLElBQUksQ0FBQyxjQUFjLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQztvQkFDOUQsSUFBSSxDQUFDLGFBQWEsR0FBRyxJQUFJLENBQUMsYUFBYSxHQUFHLElBQUksQ0FBQyxZQUFZLENBQUM7b0JBQzVELElBQUksQ0FBQyxVQUFVLEdBQUcsQ0FBQyxDQUFDO29CQUNwQixJQUFJLENBQUMsWUFBWSxHQUFHLEdBQUcsQ0FBQztvQkFDeEIsSUFBSSxDQUFDLFlBQVksR0FBRyxHQUFHLENBQUM7b0JBQ3hCLElBQUksQ0FBQyxRQUFRLEdBQUcsS0FBSyxDQUFDO29CQUN0QixJQUFJLENBQUMsYUFBYSxHQUFHLEtBQUssQ0FBQztvQkFDM0IsSUFBSSxDQUFDLFNBQVMsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDO2dCQUNqQyxDQUFDO1lBQ0gsQ0FBQztZQUNELElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsU0FBUyxHQUFHLENBQUMsQ0FBQyxDQUM1QixDQUFDO2dCQUNDLHlDQUF5QztnQkFDekMsSUFBSSxDQUFDLFNBQVMsR0FBRyxJQUFJLENBQUMsU0FBUyxHQUFHLE1BQU0sQ0FBQztnQkFDekMsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLFNBQVMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO29CQUN2QixJQUFJLENBQUMsU0FBUyxHQUFHLENBQUMsQ0FBQztnQkFDckIsQ0FBQztZQUNILENBQUM7UUFDSCxDQUFDLENBQUMsc0JBQXNCO1FBQ3hCLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsTUFBTSxJQUFJLFFBQVEsQ0FBQyxDQUFDLENBQUM7WUFDakMseUJBQXlCO1lBQ3pCLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUM7WUFDNUQsSUFBSSxDQUFDLFlBQVksR0FBRyxJQUFJLENBQUMsWUFBWSxHQUFHLE1BQU0sR0FBRyxDQUFDLENBQUM7UUFDckQsQ0FBQztRQUNELElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsTUFBTSxJQUFJLE9BQU8sQ0FBQyxDQUFDLENBQUM7WUFDaEMseUJBQXlCO1lBQ3pCLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQyxZQUFZLENBQUM7WUFDdEMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLEdBQUcsT0FBTyxHQUFHLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxZQUFZLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDNUQsSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLEdBQUcsT0FBTyxHQUFHLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxZQUFZLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDN0QsSUFBSSxDQUFDLFlBQVksR0FBRyxJQUFJLENBQUMsWUFBWSxHQUFHLE1BQU0sR0FBRyxDQUFDLElBQUksQ0FBQyxRQUFRLEdBQUcsR0FBRyxDQUFDLENBQUM7WUFDdkUsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLFlBQVksSUFBSSxHQUFHLENBQUMsQ0FBQyxDQUFDO2dCQUM3QixJQUFJLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxDQUFDO1lBQzVCLENBQUM7UUFDSCxDQUFDO1FBQ0QsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxNQUFNLElBQUksU0FBUyxDQUFDLENBQUMsQ0FBQztZQUNsQyx3QkFBd0I7WUFDeEIsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQztZQUN0QyxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssR0FBRyxPQUFPLEdBQUcsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDLFlBQVksR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFDO1lBQ3RFLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxHQUFHLE9BQU8sR0FBRyxDQUFDLEdBQUcsR0FBRyxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsWUFBWSxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDdkUsSUFBSSxDQUFDLFlBQVksR0FBRyxJQUFJLENBQUMsWUFBWSxHQUFHLE1BQU0sR0FBRyxDQUFDLElBQUksQ0FBQyxRQUFRLEdBQUcsR0FBRyxDQUFDLENBQUM7WUFDdkUsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLFlBQVksSUFBSSxHQUFHLENBQUMsQ0FBQyxDQUFDO2dCQUM3QixJQUFJLENBQUMsWUFBWSxHQUFHLENBQUMsQ0FBQyxDQUFDLHlCQUF5QjtZQUNsRCxDQUFDO1FBQ0gsQ0FBQztJQUNILENBQUM7SUFFRCxrREFBa0Q7SUFDbEQsaUNBQVMsR0FBVCxVQUFVLEdBQVc7UUFDbkIsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLE1BQU0sSUFBSSxHQUFHLENBQUMsQ0FBQyxDQUFDO1lBQ3ZCLE1BQU0sQ0FBQztRQUNULENBQUM7UUFFRCxJQUFJLENBQUMsTUFBTSxHQUFHLEdBQUcsQ0FBQztRQUNsQixFQUFFLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO1lBQ1IsSUFBSSxDQUFDLFlBQVksR0FBRyxDQUFDLENBQUM7UUFDeEIsQ0FBQztRQUNELElBQUksQ0FBQyxDQUFDO1lBQ0osSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLEdBQUcsQ0FBQyxDQUFDO1FBQ3hCLENBQUM7SUFDSCxDQUFDO0lBRUQsbURBQW1EO0lBQ25ELG9DQUFZLEdBQVosVUFBYSxNQUFNO1FBQ2pCLHlCQUF5QjtRQUN6QixJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFDO1FBQzVELElBQUksQ0FBQyxZQUFZLEdBQUcsSUFBSSxDQUFDLFlBQVksR0FBRyxNQUFNLEdBQUcsQ0FBQyxDQUFDO0lBQ3JELENBQUM7SUFDSCxvQkFBQztBQUFELENBNU5BLEFBNE5DLElBQUE7QUFFRDs7Ozs7RUFLRTtBQUNGO0lBY0U7UUFDRSxJQUFJLENBQUMsT0FBTyxHQUFHLElBQUksU0FBUyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQztRQUVyQywwQ0FBMEM7UUFDMUMsSUFBSSxDQUFDLFFBQVEsR0FBRyxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsc0JBQXNCLEVBQUUsRUFBRSxJQUFJLEVBQUUsaUJBQWlCLEVBQUUsSUFBSSxFQUFFLFNBQVMsRUFBRSxLQUFLLEVBQUUsTUFBTSxFQUFFLE1BQU0sRUFBRSxTQUFTLEVBQUUsZUFBZSxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDMUosSUFBSSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLENBQUMsR0FBRyxPQUFPLEdBQUcsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksR0FBRyxDQUFDLENBQUMsQ0FBQztRQUN4RixJQUFJLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQyxHQUFHLE9BQU8sQ0FBQztRQUM5RCxLQUFLLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUU5QixJQUFJLFdBQVcsR0FBVyxJQUFJLENBQUM7UUFDL0IsSUFBSSxDQUFDLFNBQVMsR0FBRyxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLEVBQUUsSUFBSSxFQUFFLGlCQUFpQixFQUFFLElBQUksRUFBRSxTQUFTLEVBQUUsS0FBSyxFQUFFLE1BQU0sRUFBRSxNQUFNLEVBQUUsU0FBUyxFQUFFLGVBQWUsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBQzVJLElBQUksQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUFDLEdBQUcsT0FBTyxHQUFHLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLEdBQUcsQ0FBQyxDQUFDLENBQUM7UUFDekYsSUFBSSxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLENBQUMsR0FBRyxPQUFPLEdBQUcsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksR0FBRyxDQUFDLENBQUMsQ0FBQztRQUN6RixLQUFLLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUMvQixJQUFJLENBQUMsU0FBUyxDQUFDLFVBQVUsR0FBRyxJQUFJLENBQUM7UUFDakMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxXQUFXLEdBQUcsSUFBSSxDQUFDO1FBQ2xDLElBQUksQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDLFdBQVcsRUFBRTtZQUM3QixXQUFXLENBQUMsa0JBQWtCLEVBQUUsQ0FBQztRQUNuQyxDQUFDLENBQUMsQ0FBQztRQUNILElBQUksQ0FBQyxTQUFTLENBQUMsT0FBTyxHQUFHLEtBQUssQ0FBQztRQUUvQixJQUFJLENBQUMsYUFBYSxHQUFHLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxXQUFXLEVBQUUsRUFBRSxJQUFJLEVBQUUsaUJBQWlCLEVBQUUsSUFBSSxFQUFFLFNBQVMsRUFBRSxLQUFLLEVBQUUsTUFBTSxFQUFFLE1BQU0sRUFBRSxTQUFTLEVBQUUsZUFBZSxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDcEosSUFBSSxDQUFDLGFBQWEsQ0FBQyxRQUFRLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLENBQUMsR0FBRyxPQUFPLEdBQUcsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksR0FBRyxDQUFDLENBQUMsQ0FBQztRQUM3RixJQUFJLENBQUMsYUFBYSxDQUFDLFFBQVEsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQyxHQUFHLE9BQU8sR0FBRyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxHQUFHLENBQUMsQ0FBQyxDQUFDO1FBQzdGLEtBQUssQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxDQUFDO1FBQ25DLElBQUksQ0FBQyxhQUFhLENBQUMsVUFBVSxHQUFHLElBQUksQ0FBQztRQUNyQyxJQUFJLENBQUMsYUFBYSxDQUFDLFdBQVcsR0FBRyxJQUFJLENBQUM7UUFDdEMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxFQUFFLENBQUMsV0FBVyxFQUFFO1lBQ2pDLFdBQVcsQ0FBQyxzQkFBc0IsRUFBRSxDQUFDO1FBQ3ZDLENBQUMsQ0FBQyxDQUFDO1FBRUgsSUFBSSxDQUFDLFNBQVMsR0FBRyxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLEVBQUUsSUFBSSxFQUFFLGlCQUFpQixFQUFFLElBQUksRUFBRSxTQUFTLEVBQUUsS0FBSyxFQUFFLE1BQU0sRUFBRSxNQUFNLEVBQUUsU0FBUyxFQUFFLGVBQWUsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBQzVJLElBQUksQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUFDLEdBQUcsT0FBTyxHQUFHLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLEdBQUcsQ0FBQyxDQUFDLENBQUM7UUFDekYsSUFBSSxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLENBQUMsR0FBRyxPQUFPLEdBQUcsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksR0FBRyxDQUFDLENBQUMsQ0FBQztRQUN6RixLQUFLLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUMvQixJQUFJLENBQUMsU0FBUyxDQUFDLFVBQVUsR0FBRyxJQUFJLENBQUM7UUFDakMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxXQUFXLEdBQUcsSUFBSSxDQUFDO1FBQ2xDLElBQUksQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDLFdBQVcsRUFBRTtZQUM3QixXQUFXLENBQUMsa0JBQWtCLEVBQUUsQ0FBQztRQUNuQyxDQUFDLENBQUMsQ0FBQztRQUNILElBQUksQ0FBQyxTQUFTLENBQUMsT0FBTyxHQUFHLEtBQUssQ0FBQztRQUUvQix3QkFBd0I7UUFDeEIsSUFBSSxDQUFDLGdCQUFnQixHQUFHLElBQUksYUFBYSxDQUFDLHdCQUF3QixFQUFFLElBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLENBQUM7UUFDNUYsSUFBSSxDQUFDLGdCQUFnQixDQUFDLFFBQVEsR0FBRyxHQUFHLENBQUM7UUFDckMsSUFBSSxDQUFDLGtCQUFrQixHQUFHLElBQUksYUFBYSxDQUFDLDZCQUE2QixFQUFFLElBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLENBQUM7UUFDbkcsSUFBSSxDQUFDLGtCQUFrQixDQUFDLFFBQVEsR0FBRyxJQUFJLENBQUM7UUFFeEMsSUFBSSxDQUFDLFNBQVMsR0FBRyxPQUFPLENBQUM7UUFDekIsSUFBSSxDQUFDLE1BQU0sR0FBRyxLQUFLLENBQUM7SUFDdEIsQ0FBQztJQUVELG1FQUFtRTtJQUNuRSx3QkFBTSxHQUFOLFVBQU8sTUFBYTtRQUNsQixJQUFJLFVBQVUsR0FBbUIsQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLEVBQUUsSUFBSSxDQUFDLGtCQUFrQixDQUFDLENBQUM7UUFFbEYsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7WUFDaEIsR0FBRyxDQUFDLENBQWEsVUFBVSxFQUFWLHlCQUFVLEVBQVYsd0JBQVUsRUFBVixJQUFVLENBQUM7Z0JBQXZCLElBQUksSUFBSSxtQkFBQTtnQkFDWCxJQUFJLENBQUMsWUFBWSxDQUFDLE1BQU0sQ0FBQyxDQUFDO2FBQzNCO1lBQ0QsTUFBTSxDQUFDO1FBQ1QsQ0FBQztRQUVELEdBQUcsQ0FBQyxDQUFhLFVBQVUsRUFBVix5QkFBVSxFQUFWLHdCQUFVLEVBQVYsSUFBVSxDQUFDO1lBQXZCLElBQUksSUFBSSxtQkFBQTtZQUNYLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUM7WUFDcEIsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDLENBQUMsQ0FBQztnQkFDdkIsaUNBQWlDO2dCQUNqQyxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsYUFBYSxHQUFHLENBQUMsSUFBSSxJQUFJLENBQUMsYUFBYSxJQUFJLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSTtvQkFDbkUsSUFBSSxDQUFDLGNBQWMsR0FBRyxDQUFDLElBQUksSUFBSSxDQUFDLGNBQWMsSUFBSSxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7b0JBQ3RFLElBQUksQ0FBQyxRQUFRLEdBQUcsS0FBSyxDQUFDO2dCQUN4QixDQUFDO2dCQUNELElBQUksQ0FDSixDQUFDO29CQUNDLDhCQUE4QjtvQkFDOUIsSUFBSSxJQUFJLEdBQVksSUFBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLGNBQWMsRUFBRSxJQUFJLENBQUMsYUFBYSxDQUFDLENBQUM7b0JBQ2xGLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUM7b0JBQ3RCLElBQUksQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDO2dCQUN0QyxDQUFDO1lBQ0gsQ0FBQztTQUNGLENBQUMsVUFBVTtRQUVaLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUM7WUFDcEMseUNBQXlDO1lBQ3pDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDM0MsQ0FBQztRQUNELEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLGtCQUFrQixDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUM7WUFDdEMseUNBQXlDO1lBQ3pDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUM7WUFDMUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsQ0FBQztZQUN6QyxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksR0FBRyxTQUFTLENBQUM7WUFDL0IsSUFBSSxDQUFDLFNBQVMsR0FBRyxNQUFNLENBQUM7WUFDeEIsSUFBSSxDQUFDLFNBQVMsQ0FBQyxPQUFPLEdBQUcsSUFBSSxDQUFDO1lBQzlCLElBQUksQ0FBQyxhQUFhLENBQUMsT0FBTyxHQUFHLElBQUksQ0FBQztZQUNsQyxJQUFJLENBQUMsU0FBUyxDQUFDLE9BQU8sR0FBRyxLQUFLLENBQUM7UUFDakMsQ0FBQztRQUdELElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUNsRCxrQkFBa0I7WUFDbEIsSUFBSSxDQUFDLGdCQUFnQixDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsQ0FBQztZQUN6QyxJQUFJLENBQUMsa0JBQWtCLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxDQUFDO1lBQzVDLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxHQUFHLGdCQUFnQixDQUFBO1lBQ3JDLElBQUksQ0FBQyxTQUFTLEdBQUcsTUFBTSxDQUFDO1lBQ3hCLElBQUksQ0FBQyxTQUFTLENBQUMsT0FBTyxHQUFHLElBQUksQ0FBQztZQUM5QixJQUFJLENBQUMsYUFBYSxDQUFDLE9BQU8sR0FBRyxJQUFJLENBQUM7WUFDbEMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxPQUFPLEdBQUcsS0FBSyxDQUFDO1FBQ25DLENBQUM7SUFDSCxDQUFDO0lBRUQsMkNBQTJDO0lBQzNDLGlDQUFlLEdBQWYsVUFBZ0IsSUFBVyxFQUFFLElBQVc7UUFDdEMsSUFBSSxLQUFLLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLEdBQUcsT0FBTyxDQUFDLENBQUM7UUFDdkMsSUFBSSxLQUFLLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLEdBQUcsT0FBTyxDQUFDLENBQUM7UUFDdkMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxlQUFlLEdBQUcsS0FBSyxHQUFHLEdBQUcsR0FBRyxLQUFLLENBQUMsQ0FBQztRQUNuRCxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsUUFBUSxFQUFFLElBQUksVUFBVSxDQUFDLENBQUMsQ0FBQztZQUNuRCxJQUFJLENBQUMsZ0JBQWdCLENBQUMsV0FBVyxDQUFDLEtBQUssRUFBRSxLQUFLLENBQUMsQ0FBQztZQUNoRCxJQUFJLENBQUMsa0JBQWtCLENBQUMsV0FBVyxDQUFDLEtBQUssRUFBRSxLQUFLLENBQUMsQ0FBQztZQUNsRCxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksR0FBRyxjQUFjLENBQUE7WUFDbkMsSUFBSSxDQUFDLFNBQVMsR0FBRyxhQUFhLENBQUM7WUFDL0IsSUFBSSxDQUFDLFNBQVMsQ0FBQyxPQUFPLEdBQUcsS0FBSyxDQUFDO1lBQy9CLElBQUksQ0FBQyxhQUFhLENBQUMsT0FBTyxHQUFHLEtBQUssQ0FBQztZQUNuQyxJQUFJLENBQUMsU0FBUyxDQUFDLE9BQU8sR0FBRyxJQUFJLENBQUM7UUFDaEMsQ0FBQztJQUNILENBQUM7SUFFRCxnQ0FBYyxHQUFkLFVBQWUsSUFBVyxFQUFFLElBQVc7UUFDckMsSUFBSSxLQUFLLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLEdBQUcsT0FBTyxDQUFDLENBQUM7UUFDdkMsSUFBSSxLQUFLLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLEdBQUcsT0FBTyxDQUFDLENBQUM7UUFDdkMsSUFBSSxJQUFJLEdBQVksSUFBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQ3ZELElBQUksQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDMUIsQ0FBQztJQUVELCtCQUFhLEdBQWIsVUFBYyxJQUFXLEVBQUUsSUFBVztRQUNwQyxJQUFJLEtBQUssR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksR0FBRyxPQUFPLENBQUMsQ0FBQztRQUN2QyxJQUFJLEtBQUssR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksR0FBRyxPQUFPLENBQUMsQ0FBQztRQUN2QyxJQUFJLElBQUksR0FBWSxJQUFJLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDdkQsSUFBSSxDQUFDLFlBQVksQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUMzQixDQUFDO0lBRUQsb0NBQWtCLEdBQWxCO1FBQ0UsSUFBSSxDQUFDLE9BQU8sQ0FBQyxXQUFXLEVBQUUsQ0FBQztRQUMzQixJQUFJLENBQUMsZ0JBQWdCLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxDQUFDO1FBQzNDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLENBQUM7UUFDN0MsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLEdBQUcsc0JBQXNCLENBQUM7UUFDNUMsSUFBSSxDQUFDLFNBQVMsR0FBRyxPQUFPLENBQUM7SUFDM0IsQ0FBQztJQUVELHdDQUFzQixHQUF0QjtRQUNFLElBQUksQ0FBQyxPQUFPLENBQUMsZUFBZSxFQUFFLENBQUM7UUFDL0IsSUFBSSxDQUFDLGdCQUFnQixDQUFDLFFBQVEsQ0FBQyxVQUFVLENBQUMsQ0FBQztRQUMzQyxJQUFJLENBQUMsa0JBQWtCLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxDQUFDO1FBQzdDLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxHQUFHLHNCQUFzQixDQUFDO1FBQzVDLElBQUksQ0FBQyxTQUFTLEdBQUcsT0FBTyxDQUFDO0lBQzNCLENBQUM7SUFFRCxvQ0FBa0IsR0FBbEI7UUFDRSxJQUFJLFdBQVcsR0FBVyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUM7UUFFdkMsRUFBRSxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQztZQUNoQixJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksR0FBRyxTQUFTLENBQUM7UUFDbEMsQ0FBQztRQUNELElBQUksQ0FBQyxDQUFDO1lBQ0osSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLEdBQUcsT0FBTyxDQUFDO1FBQ2hDLENBQUM7UUFDRCxJQUFJLENBQUMsZ0JBQWdCLENBQUMsU0FBUyxDQUFDLFdBQVcsQ0FBQyxDQUFDO1FBQzdDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxTQUFTLENBQUMsV0FBVyxDQUFDLENBQUM7UUFDL0MsSUFBSSxDQUFDLE1BQU0sR0FBRyxXQUFXLENBQUM7SUFDNUIsQ0FBQztJQUNILGNBQUM7QUFBRCxDQXRMQSxBQXNMQyxJQUFBO0FBRUQsMEJBQTBCO0FBQzFCLDhCQUE4QjtBQUM5QiwwQkFBMEI7QUFFMUIsc0JBQXNCO0FBRXRCLHFDQUFxQztBQUNyQyxJQUFJLEtBQUssR0FBRyxJQUFJLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQztBQUVqQyxvQ0FBb0M7QUFDcEMsSUFBSSxPQUFPLEdBQVUsRUFBRSxDQUFDO0FBRXhCLElBQUksWUFBb0IsQ0FBQztBQUV6QixPQUFPLEVBQUUsQ0FBQztBQUVWLDBCQUEwQjtBQUMxQix1QkFBdUI7QUFDdkIsMEJBQTBCO0FBRTFCLG9GQUFvRjtBQUNwRiw4RUFBOEU7QUFDOUUsa0JBQWtCO0FBRWxCO0lBRUUsWUFBWSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUMvQyxDQUFDO0FBRUQ7SUFFRSxZQUFZLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQzlDLENBQUM7QUFFRDtJQUVFLFlBQVksQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDN0MsQ0FBQztBQUVEO0lBQ0ksWUFBWSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLHVDQUF1QztBQUN0RSxDQUFDO0FBRUQ7SUFDRSxlQUFlO0lBQ2YsT0FBTyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQztJQUNwQixZQUFZLEdBQUcsSUFBSSxPQUFPLEVBQUUsQ0FBQztJQUM3QixtREFBbUQ7SUFDbkQsV0FBVyxDQUFDLE1BQU0sRUFBRSxFQUFFLENBQUMsQ0FBQztJQUN4QixPQUFPLEVBQUUsQ0FBQztBQUNaLENBQUM7QUFFRDtJQUVJLHFCQUFxQixDQUFDLE9BQU8sQ0FBQyxDQUFDO0lBRS9CLDRCQUE0QjtJQUM1QixRQUFRLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDO0FBQzNCLENBQUMiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uL3R5cGluZ3MvaW5kZXguZC50c1wiIC8+XG5cbmltcG9ydCBQSVhJID0gcmVxdWlyZSgncGl4aS5qcycpO1xuY29uc3QgcmVuZGVyZXI6UElYSS5XZWJHTFJlbmRlcmVyID0gbmV3IFBJWEkuV2ViR0xSZW5kZXJlcigxMjgwLCA3MjApO1xuZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZChyZW5kZXJlci52aWV3KTtcblxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8vIENsYXNzIGRlZmluaXRpb25zXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4vKlxuICBSZXByZXNlbnRzIGEgY2VsbCBvbiB0aGUgZ2FtZSBib2FyZC4gQSBjZWxsIGNvbnRhaW5zIGFuIGFycm93IFNwcml0ZVxuICB3aGljaCBwb2ludHMgaW4gb25lIG9mIGZvdXIgY2FyZGluYWwgZGlyZWN0aW9ucy4gRWFjaCBjZWxsIGFjdHMgYXNcbiAgYSBidXR0b24gYW5kIGNhbiBiZSBjbGlja2VkLlxuKi9cbmNsYXNzIEdyaWRDZWxsIHtcbiAgc3ByaXRlOlBJWEkuU3ByaXRlO1xuICAvLyBBcnJvdydzIGZhY2luZyBkaXJlY3Rpb246IDA9bGVmdCwgMT11cCwgMj1yaWdodCwgMz1kb3duXG4gIGRpcmVjdGlvbjpudW1iZXI7XG4gIGNlbGxYOm51bWJlcjsgLy8gY29vcmRpbmF0ZSBvbiB0aGUgZ2FtZSBib2FyZCwgZnJvbSBsZWZ0XG4gIGNlbGxZOm51bWJlcjsgLy8gY29vcmRpbmF0ZSBvbiB0aGUgZ2FtZSBib2FyZCwgZnJvbSB0b3BcbiAgdmlzaXRlZDpib29sZWFuOyAvLyBpZiB0aGUgY2VsbCBoYXMgYmVlbiB2aXNpdGVkIGJ5IGdhbWUgcGllY2VcblxuICBjb25zdHJ1Y3RvcihpOm51bWJlciwgajpudW1iZXIsIGNvbnRhaW5lcjpQSVhJLkNvbnRhaW5lcikge1xuICAgIHZhciBhcnJvdyA9IFBJWEkuU3ByaXRlLmZyb21JbWFnZSgnaW1hZ2VzL2Fycm93LWljb24ucG5nJyk7XG4gICAgYXJyb3cueCA9IGNlbGxEaW0gKiAoaSArIDAuNSk7XG4gICAgYXJyb3cueSA9IGNlbGxEaW0gKiAoaiArIDAuNSk7XG4gICAgYXJyb3cud2lkdGggPSBjZWxsRGltO1xuICAgIGFycm93LmhlaWdodCA9IGNlbGxEaW07XG4gICAgYXJyb3cuYW5jaG9yLnggPSAwLjU7XG4gICAgYXJyb3cuYW5jaG9yLnkgPSAwLjU7XG4gICAgY29udGFpbmVyLmFkZENoaWxkKGFycm93KTtcbiAgICB0aGlzLmNlbGxYID0gaTtcbiAgICB0aGlzLmNlbGxZID0gajtcbiAgICB0aGlzLnNwcml0ZSA9IGFycm93O1xuICAgIHRoaXMuZGlyZWN0aW9uID0gMDtcbiAgICB0aGlzLnNldFZpc2l0ZWQoZmFsc2UpO1xuXG4gICAgLy8gb25FdmVudCBmdW5jdGlvbnMgYXJlIGdsb2JhbCBmdW5jdGlvbnMgKHRvd2FyZHMgYm90dG9tIG9mIGZpbGUpXG4gICAgYXJyb3cuYnV0dG9uTW9kZSA9IHRydWU7XG4gICAgYXJyb3cuaW50ZXJhY3RpdmUgPSB0cnVlO1xuICAgIGFycm93Lm9uKCdtb3VzZWRvd24nLCBvbkJ1dHRvbkRvd24pO1xuICAgIGFycm93Lm9uKCdtb3VzZW92ZXInLCBvbkJ1dHRvbk92ZXIpO1xuICAgIGFycm93Lm9uKCdtb3VzZW91dCcsIG9uQnV0dG9uT3V0KVxuICB9XG5cbiAgLy8gU2V0cyB0aGUgZGlyZWN0aW9uIG9mIHRoZSBhcnJvdzogMD1sZWZ0LCAxPXVwLCAyPXJpZ2h0LCAzPWRvd25cbiAgc2V0RGlyZWN0aW9uKHZhbCkge1xuICAgIGNvbnN0IHBpID0gMy4xNDE1OTI2NTtcbiAgICB0aGlzLnNwcml0ZS5yb3RhdGlvbiA9IHBpICogdmFsIC8gMi4wO1xuICAgIHRoaXMuZGlyZWN0aW9uID0gdmFsO1xuICB9XG5cbiAgLy8gU2V0cyBpZiB0aGUgY2VsbCBoYXMgYmVlbiB2aXNpdGVkIGJ5IGEgZ2FtZSBwaWVjZVxuICBzZXRWaXNpdGVkKHZhbHVlOmJvb2xlYW4pIHtcbiAgICBpZiAodmFsdWUpIHtcbiAgICAgIHRoaXMuc3ByaXRlLnRpbnQgPSAweGZmZmZmZjsgLy8gbWFrZSBicmlnaHRlclxuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgIHRoaXMuc3ByaXRlLnRpbnQgPSAweGZmNzdhYTtcbiAgICB9XG4gICAgdGhpcy52aXNpdGVkID0gdmFsdWU7XG4gIH1cblxuICAvLyBJZiB2YWx1ZT09dHJ1ZSwgdGVtcG9yYXJpbHkgaGlnaGxpZ2h0cyB0aGUgY2VsbFxuICAvLyBJZiB2YWx1ZT09dHJ1ZSwgaXQgcmV2ZXJ0cyB0byBpdHMgcHJldmlvdXMgY29sb3JcbiAgc2V0SGlnaGxpZ2h0KHZhbHVlOmJvb2xlYW4pIHtcbiAgICBsZXQgY3VycmVudFZhbHVlOmJvb2xlYW4gPSB0aGlzLnZpc2l0ZWQ7XG4gICAgaWYgKCF2YWx1ZSkge1xuICAgICAgdmFsdWUgPSBjdXJyZW50VmFsdWU7XG4gICAgfVxuICAgIHRoaXMuc2V0VmlzaXRlZCh2YWx1ZSk7XG4gICAgdGhpcy52aXNpdGVkID0gY3VycmVudFZhbHVlO1xuICB9XG59XG5cbi8qXG4gIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIFJlcHJlc2VudHMgdGhlIGVudGlyZSBnYW1lIGJvYXJkLiBDb250YWlucyBhIDJkIGFycmF5IG9mIEdyaWNDZWxsIG9iamVjdHMuXG4gIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4qL1xuY2xhc3MgQXJyb3dHcmlkIHtcbiAgY29udGFpbmVyOlBJWEkuQ29udGFpbmVyO1xuICBncmlkOkdyaWRDZWxsW11bXTtcbiAgZGltWDpudW1iZXI7IC8vIGRpbWVuc2lvbiBvZiBnYW1lIGJvYXJkIGluIGNlbGxzXG4gIGRpbVk6bnVtYmVyO1xuXG4gIGNvbnN0cnVjdG9yKHdpZHRoOm51bWJlciwgaGVpZ2h0Om51bWJlcikge1xuICAgIHRoaXMuY29udGFpbmVyID0gbmV3IFBJWEkuQ29udGFpbmVyKCk7XG4gICAgc3RhZ2UuYWRkQ2hpbGQodGhpcy5jb250YWluZXIpO1xuICAgIHRoaXMuY29udGFpbmVyLnggPSAxMDA7XG4gICAgdGhpcy5jb250YWluZXIueSA9IDYwO1xuICAgIHRoaXMuZGltWCA9IHdpZHRoO1xuICAgIHRoaXMuZGltWSA9IGhlaWdodDtcbiAgICB0aGlzLmdyaWQgPSBbXTtcbiAgICBmb3IgKHZhciBqID0gMDsgaiA8IGhlaWdodDsgaisrKSB7XG4gICAgICB0aGlzLmdyaWRbal0gPSBbXTtcbiAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgd2lkdGg7IGkrKykge1xuICAgICAgICBsZXQgbmV3Q2VsbDpHcmlkQ2VsbCA9IG5ldyBHcmlkQ2VsbChpLCBqLCB0aGlzLmNvbnRhaW5lcik7XG4gICAgICAgIHRoaXMuZ3JpZFtqXVtpXSA9IG5ld0NlbGw7XG4gICAgICB9O1xuICAgIH1cbiAgICB0aGlzLnJlc2h1ZmZsZUFycm93cygpO1xuICB9XG5cbiAgLy8gTWFya3MgYWxsIGNlbGxzIGFzIHVudmlzaXRlZFxuICByZXNldEFycm93cygpIHtcbiAgICBmb3IgKHZhciBqID0gMDsgaiA8IHRoaXMuZGltWTsgaisrKSB7XG4gICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMuZGltWDsgaSsrKSB7XG4gICAgICAgIHRoaXMuZ3JpZFtqXVtpXS5zZXRWaXNpdGVkKGZhbHNlKTtcbiAgICAgIH07XG4gICAgfVxuICB9XG5cbiAgLy8gTWFya3MgYWxsIGNlbGxzIGFzIHVudmlzaXRlZCBhbmQgY2hhbmdlcyBhcnJvdyBkaXJlY3Rpb25zXG4gIHJlc2h1ZmZsZUFycm93cygpIHtcbiAgICBmb3IgKHZhciBqID0gMDsgaiA8IHRoaXMuZGltWTsgaisrKSB7XG4gICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMuZGltWDsgaSsrKSB7XG4gICAgICAgIHRoaXMuZ3JpZFtqXVtpXS5zZXRWaXNpdGVkKGZhbHNlKTtcbiAgICAgICAgLy8gSXQncyBhIGxpdHRsZSBib3JpbmcgdG8gaGF2ZSB0d28gYXJyb3dzIHBvaW50aW5nIGF0IGVhY2ggb3RoZXIsIHNvIHByZXZlbnQgdGhhdFxuICAgICAgICBsZXQgYWxsb3dlZERpcmVjdGlvbnM6Ym9vbGVhbltdID0gW3RydWUsIHRydWUsIHRydWUsIHRydWUsIGZhbHNlXTtcbiAgICAgICAgLy8gSXMgdGhlIG9uZSBhYm92ZSBtZSBwb2ludGluZyBkb3duP1xuICAgICAgICBpZiAoaiA+IDAgJiYgdGhpcy5ncmlkW2otMV1baV0uZGlyZWN0aW9uID09IDMpIHtcbiAgICAgICAgICAvLyBOb3QgYWxsb3dlZCB0byBwb2ludCBzdHJhaWdodCB1cFxuICAgICAgICAgIGFsbG93ZWREaXJlY3Rpb25zWzFdID0gZmFsc2U7XG4gICAgICAgICAgLy9jb25zb2xlLmxvZyhcIkZvcmJpZGRlbiB1cCBhdCBcIiArIGkgKyBcIixcIiArIGopO1xuICAgICAgICB9XG4gICAgICAgIC8vIElzIHRoZSBvbmUgdG8gbXkgbGVmdCBwb2ludGluZyByaWdodD9cbiAgICAgICAgaWYgKGkgPiAwICYmIHRoaXMuZ3JpZFtqXVtpLTFdLmRpcmVjdGlvbiA9PSAyKSB7XG4gICAgICAgICAgLy8gTm90IGFsbG93ZWQgdG8gcG9pbnQgbGVmdFxuICAgICAgICAgIGFsbG93ZWREaXJlY3Rpb25zWzBdID0gZmFsc2U7XG4gICAgICAgICAgLy9jb25zb2xlLmxvZyhcIkZvcmJpZGRlbiBsZWZ0IGF0IFwiICsgaSArIFwiLFwiICsgaik7XG4gICAgICAgIH1cbiAgICAgICAgbGV0IHByb3Bvc2VkRGlyZWN0aW9uOm51bWJlciA9IDQ7IC8vIG5vdCBhIHZhbGlkIGRpcmVjdGlvbiwgc28gdGhlIGZpcnN0IHRlc3Qgd2lsbCBmYWlsXG4gICAgICAgIHdoaWxlIChhbGxvd2VkRGlyZWN0aW9uc1twcm9wb3NlZERpcmVjdGlvbl0gPT0gZmFsc2UpXG4gICAgICAgIHtcbiAgICAgICAgICBwcm9wb3NlZERpcmVjdGlvbiA9IE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIDQuMCk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5ncmlkW2pdW2ldLnNldERpcmVjdGlvbihwcm9wb3NlZERpcmVjdGlvbik7XG4gICAgICB9O1xuICAgIH1cbiAgfVxuXG4gIC8vIFJldHVybnMgcmVmIHRvIGNlbGwgYXQgcGFydGljdWxhciBncmlkIGxvY2F0aW9uXG4gIGdldENlbGwoZ3JpZFg6bnVtYmVyLCBncmlkWTpudW1iZXIpIHtcbiAgICByZXR1cm4gdGhpcy5ncmlkW2dyaWRZXVtncmlkWF07XG4gIH1cbn1cblxuLypcbiAgLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgUmVwcmVzZW50cyBhIGdhbWUgcGllY2UuIEEgcGllY2UgY2FuIG9jY3VweSBhIGNlbGwgYW5kIHRyYW5zaXRpb24gaW4gYVxuICB2aWRlb2dhbWUteSBtYW5uZXIgYmV0d2VlbiBjZWxscy4gSXQgYWxzbyBoYXMgYSBzdGF0ZSBtYWNoaW5lIGFuZFxuICBjYW4gcGVyZm9ybSBzZXZlcmFsIGFuaW1hdGlvbiBzZXF1ZW5jZXMuXG4gIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4qL1xuY2xhc3MgR3JpZENoYXJhY3RlciB7XG4gIHNwcml0ZTpQSVhJLlNwcml0ZTtcbiAgY2VsbEluZGV4UmlnaHQ6bnVtYmVyOyAvLyBib2FyZCBjb29yZGluYXRlXG4gIGNlbGxJbmRleERvd246bnVtYmVyO1xuICB4TW92ZW1lbnREaXI6bnVtYmVyOyAvLyBkaXJlY3Rpb24gb2YgY3VycmVudCBtb3ZlbWVudCwgKC0xID0gbGVmdCwgMSA9IHJpZ2h0KVxuICB5TW92ZW1lbnREaXI6bnVtYmVyOyAvLyBkaXJlY3Rpb24gb2YgY3VycmVudCBtb3ZlbWVudCwgKC0xID0gdXAsIDEgPSBkb3duKVxuXG4gIHNsaWRlVmFsdWU6bnVtYmVyOyAvLyBob3cgZmFyIHRoZSBwaWVjZSBoYXMgc2xpZCBhd2F5IGZyb20gY3VycmVudCBjZWxsXG4gICAgICAgICAgICAgICAgICAgICAvLyAwIHRvIDFcbiAgZWZmZWN0U2xpZGVyOm51bWJlcjsgLy8gVXNlZCBmb3IgdGhlIGFuaW1hdGlvbiBvZiBlZmZlY3RzXG4gIHJlc3RUaW1lcjpudW1iZXI7ICAvLyB0aGUgcGllY2UgXCJyZXN0c1wiIGZvciBhIGJpdCBhZnRlciBhcnJpdmluZ1xuICBtb3ZlVGltZTpudW1iZXI7IC8vIGhvdyBtYW55IHNlY29uZHMgYSBtb3ZlIG9yIHJlc3QgcGVyaW9kIHRha2VzXG5cbiAgb25Jbml0aWFsQ2VsbDpib29sZWFuO1xuICBpc01vdmluZzpib29sZWFuO1xuICBpc09uR3JpZDpib29sZWFuOyAvLyBmYWxzZSBpZiBwaWVjZSBtb3ZlcyBvZmYgYm9hcmRcbiAgcGF1c2VkOmJvb2xlYW47XG5cbiAgcHJpdmF0ZSBfc3RhdGU6c3RyaW5nO1xuXG4gIGNvbnN0cnVjdG9yKG5hbWU6c3RyaW5nLCBjb250YWluZXI6UElYSS5Db250YWluZXIpIHtcbiAgICB0aGlzLnNwcml0ZSA9IFBJWEkuU3ByaXRlLmZyb21JbWFnZShuYW1lKTtcbiAgICB0aGlzLnNwcml0ZS53aWR0aCA9IGNlbGxEaW07XG4gICAgdGhpcy5zcHJpdGUuaGVpZ2h0ID0gY2VsbERpbTtcbiAgICB0aGlzLnNwcml0ZS5hbmNob3IueCA9IDAuNTtcbiAgICB0aGlzLnNwcml0ZS5hbmNob3IueSA9IDAuNTtcbiAgICB0aGlzLnNwcml0ZS5hbHBoYSA9IDA7XG4gICAgY29udGFpbmVyLmFkZENoaWxkKHRoaXMuc3ByaXRlKTtcblxuICAgIHRoaXMueE1vdmVtZW50RGlyID0gMDtcbiAgICB0aGlzLnlNb3ZlbWVudERpciA9IDA7XG4gICAgdGhpcy5pc01vdmluZyA9IGZhbHNlO1xuICAgIHRoaXMuaXNPbkdyaWQgPSB0cnVlO1xuICAgIHRoaXMucGF1c2VkID0gZmFsc2U7XG4gICAgdGhpcy5yZXN0VGltZXIgPSAwO1xuICAgIHRoaXMubW92ZVRpbWUgPSAxLjA7XG4gICAgdGhpcy5fc3RhdGUgPSBcImluYWN0aXZlXCI7XG4gIH1cblxuICAvLyBJbnN0YW50bHkgcG9zaXRpb25zIHRoZSBwaWVjZSBhdCBpdHMgc3RhcnQgcG9zaXRpb25cbiAgc2V0UG9zaXRpb24oaTpudW1iZXIsIGo6bnVtYmVyKSB7XG4gICAgdGhpcy5zcHJpdGUueCA9IGNlbGxEaW0gKiAoaSArIDAuNSk7XG4gICAgdGhpcy5zcHJpdGUueSA9IGNlbGxEaW0gKiAoaiArIDAuNSk7XG4gICAgdGhpcy5zcHJpdGUud2lkdGggPSBjZWxsRGltO1xuICAgIHRoaXMuc3ByaXRlLmhlaWdodCA9IGNlbGxEaW07XG4gICAgdGhpcy5zcHJpdGUuYWxwaGEgPSAxO1xuICAgIHRoaXMuY2VsbEluZGV4RG93biA9IGo7XG4gICAgdGhpcy5jZWxsSW5kZXhSaWdodCA9IGk7XG4gICAgdGhpcy5vbkluaXRpYWxDZWxsID0gdHJ1ZTtcbiAgICB0aGlzLnBhdXNlZCA9IGZhbHNlO1xuICAgIHRoaXMuaXNNb3ZpbmcgPSBmYWxzZTtcbiAgICB0aGlzLmlzT25HcmlkID0gdHJ1ZTtcbiAgICB0aGlzLnNsaWRlVmFsdWUgPSAwO1xuICAgIHRoaXMucmVzdFRpbWVyID0gdGhpcy5tb3ZlVGltZTsgLy8gbGV0IGl0IHJlc3QgYmVmb3JlIHN0YXJ0aW5nIG1vdmVcbiAgICB0aGlzLl9zdGF0ZSA9IFwiYWN0aXZlXCI7XG4gIH1cblxuICAvLyBSZXR1cm5zIHRydWUgaWYgY2hhcmFjdGVyIGNhbiBiZSBpc3N1ZWQgYSBuZXcgbW92ZVxuICByZWFkeVRvTW92ZSgpIHtcbiAgICBpZiAodGhpcy5fc3RhdGUgIT0gXCJhY3RpdmVcIikge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICByZXR1cm4gKCF0aGlzLmlzTW92aW5nICYmIHRoaXMucmVzdFRpbWVyID09IDApO1xuICB9XG5cbiAgLy8gUmV0dXJucyB0cnVlIGlmIHRoaXMgY2hhcmFjdGVyIGFuZCB0aGUgb3RoZXIgaGF2ZSBjYXVnaHQgdXAgdG8gZWFjaCBvdGhlclxuICB0ZXN0Q29sbGlzaW9uKG90aGVyOkdyaWRDaGFyYWN0ZXIpIHtcbiAgICBpZiAodGhpcy5vbkluaXRpYWxDZWxsIHx8IG90aGVyLm9uSW5pdGlhbENlbGwgfHwgdGhpcy5fc3RhdGUgIT0gXCJhY3RpdmVcIikge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICBpZiAodGhpcy5jZWxsSW5kZXhEb3duID09IG90aGVyLmNlbGxJbmRleERvd24gJiZcbiAgICAgIHRoaXMuY2VsbEluZGV4UmlnaHQgPT0gb3RoZXIuY2VsbEluZGV4UmlnaHQpIHtcbiAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgLy8gVGVsbHMgdGhlIHBpZWNlIHRvIGJlZ2luIG1vdmluZyBpbiB0aGUgZ2l2ZW4gZGlyZWN0aW9uXG4gIC8vIFNlZSBHcmlkQ2VsbCBmb3IgZGlyZWN0aW9uIHZhbHVlcy5cbiAgcmVxdWVzdE5ld01vdmUoZGlyZWN0aW9uKSB7XG4gICAgaWYgKHRoaXMuX3N0YXRlICE9IFwiYWN0aXZlXCIpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgaWYgKHRoaXMuaXNNb3ZpbmcpIHtcbiAgICAgIHJldHVybjsgLy8gY2FuJ3QgY2hhbmdlIHdoaWxlIGFscmVhZHkgbW92aW5nXG4gICAgfVxuICAgIGlmIChkaXJlY3Rpb24gPT0gMCkgLy8gbGVmdFxuICAgIHtcbiAgICAgIHRoaXMueE1vdmVtZW50RGlyID0gLTEuMDtcbiAgICAgIHRoaXMueU1vdmVtZW50RGlyID0gIDAuMDtcbiAgICB9XG4gICAgZWxzZSBpZiAoZGlyZWN0aW9uID09IDEpIC8vIHVwXG4gICAge1xuICAgICAgdGhpcy54TW92ZW1lbnREaXIgPSAgMC4wO1xuICAgICAgdGhpcy55TW92ZW1lbnREaXIgPSAtMS4wO1xuICAgIH1cbiAgICBlbHNlIGlmIChkaXJlY3Rpb24gPT0gMikgLy8gcmlnaHRcbiAgICB7XG4gICAgICB0aGlzLnhNb3ZlbWVudERpciA9ICAxLjA7XG4gICAgICB0aGlzLnlNb3ZlbWVudERpciA9ICAwLjA7XG4gICAgfVxuICAgIGVsc2UgIC8vIGRvd25cbiAgICB7XG4gICAgICB0aGlzLnhNb3ZlbWVudERpciA9ICAwLjA7XG4gICAgICB0aGlzLnlNb3ZlbWVudERpciA9ICAxLjA7XG4gICAgfVxuICAgIHRoaXMuc2xpZGVWYWx1ZSA9IDA7XG4gICAgdGhpcy5pc01vdmluZyA9IHRydWU7XG4gIH1cblxuICAvLyBQdXRzIHRoZSBwaWVjZSBpbiBhIG5ldyBhbmltYXRpb24gc3RhdGVcbiAgLy8gKEkgd2FzIGdvaW5nIHRvIHVzZSBhIHR5cGVzY3JpcHQgYWNjZXNzb3IsIGJ1dCBub3Qgc3VwcG9ydGVkIGJ5IHRoaXMgY29tcGlsZXIpXG4gIHNldFN0YXRlKHN0YXRlOnN0cmluZykge1xuICAgIGlmICh0aGlzLl9zdGF0ZSA9PSBzdGF0ZSB8fCB0aGlzLl9zdGF0ZSA9PSBcImluYWN0aXZlXCIpIHtcbiAgICAgIC8vIE5vdGhpbmcgaGFwcGVucyBpZiB3ZSdyZSBhbHJlYWR5IGluIHJlcXVlc3RlZCBzdGF0ZSBvciBpZiBjaGFyYWN0ZXJcbiAgICAgIC8vIGlzIGluYWN0aXZlXG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGNvbnNvbGUubG9nKFwic3RhdGUgdG8gXCIgKyBzdGF0ZSk7XG4gICAgdGhpcy5fc3RhdGUgPSBzdGF0ZTtcbiAgICBpZiAoc3RhdGUgPT0gXCJmcm96ZW5cIikge1xuICAgICAgdGhpcy5lZmZlY3RTbGlkZXIgPSAwO1xuICAgIH1cbiAgICBlbHNlIGlmIChzdGF0ZSA9PSBcImR5aW5nXCIpIHtcbiAgICAgIHRoaXMuZWZmZWN0U2xpZGVyID0gMTtcbiAgICB9XG4gICAgZWxzZSBpZiAoc3RhdGUgPT0gXCJleHBsb2RlXCIpIHtcbiAgICAgIHRoaXMuZWZmZWN0U2xpZGVyID0gMTtcbiAgICB9XG4gICAgZWxzZSBpZiAoc3RhdGUgPT0gXCJpbmFjdGl2ZVwiKSB7XG4gICAgICB0aGlzLnNwcml0ZS5hbHBoYSA9IDA7XG4gICAgICB0aGlzLmlzTW92aW5nID0gZmFsc2U7XG4gICAgICB0aGlzLmlzT25HcmlkID0gdHJ1ZTtcbiAgICB9XG4gIH1cblxuICAvLyBBY2Nlc3NvcnMgYW5kIHNldHRlcnMgYXJlIGdvb2QgOilcbiAgZ2V0U3RhdGUoKSB7XG4gICAgcmV0dXJuIHRoaXMuX3N0YXRlO1xuICB9XG5cbiAgLy8gVXBkYXRlIGZ1bmN0aW9uIGNhbGxlZCBwZXJpb2RpY2FsbHkuIGRlbHRhVCBpcyB0aW1lIGluIHNlY29uZHMgc2luY2UgbGFzdFxuICAvLyBjYWxsLlxuICB1cGRhdGUoZGVsdGFUKSB7XG4gICAgaWYgKHRoaXMuX3N0YXRlID09IFwiYWN0aXZlXCIpIHtcbiAgICAgIHRoaXMuc3ByaXRlLnggPSBjZWxsRGltICogKHRoaXMuY2VsbEluZGV4UmlnaHQgKyAwLjUgKyB0aGlzLnhNb3ZlbWVudERpciAqIHRoaXMuc2xpZGVWYWx1ZSk7XG4gICAgICB0aGlzLnNwcml0ZS55ID0gY2VsbERpbSAqICh0aGlzLmNlbGxJbmRleERvd24gKyAwLjUgKyB0aGlzLnlNb3ZlbWVudERpciAqIHRoaXMuc2xpZGVWYWx1ZSk7XG4gICAgICBpZiAodGhpcy5pc01vdmluZykge1xuICAgICAgICAvLyBpdCB0YWtlcyBtb3ZlVGltZSBzZWNvbmRzIHRvIG1vdmUgb25lIHNxdWFyZVxuICAgICAgICB0aGlzLnNsaWRlVmFsdWUgPSB0aGlzLnNsaWRlVmFsdWUgKyBkZWx0YVQgLyB0aGlzLm1vdmVUaW1lO1xuICAgICAgICBpZiAodGhpcy5zbGlkZVZhbHVlID4gMS4wKVxuICAgICAgICB7XG4gICAgICAgICAgLy8gV2UndmUgYXJyaXZlZFxuICAgICAgICAgIHRoaXMuY2VsbEluZGV4UmlnaHQgPSB0aGlzLmNlbGxJbmRleFJpZ2h0ICsgdGhpcy54TW92ZW1lbnREaXI7XG4gICAgICAgICAgdGhpcy5jZWxsSW5kZXhEb3duID0gdGhpcy5jZWxsSW5kZXhEb3duICsgdGhpcy55TW92ZW1lbnREaXI7XG4gICAgICAgICAgdGhpcy5zbGlkZVZhbHVlID0gMDtcbiAgICAgICAgICB0aGlzLnhNb3ZlbWVudERpciA9IDAuMDtcbiAgICAgICAgICB0aGlzLnlNb3ZlbWVudERpciA9IDAuMDtcbiAgICAgICAgICB0aGlzLmlzTW92aW5nID0gZmFsc2U7XG4gICAgICAgICAgdGhpcy5vbkluaXRpYWxDZWxsID0gZmFsc2U7XG4gICAgICAgICAgdGhpcy5yZXN0VGltZXIgPSB0aGlzLm1vdmVUaW1lO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBlbHNlIGlmICh0aGlzLnJlc3RUaW1lciA+IDApXG4gICAgICB7XG4gICAgICAgIC8vIFBpZWNlIGlzIHJlc3RpbmcgYWZ0ZXIgY29tcGxldGluZyBtb3ZlXG4gICAgICAgIHRoaXMucmVzdFRpbWVyID0gdGhpcy5yZXN0VGltZXIgLSBkZWx0YVQ7XG4gICAgICAgIGlmICh0aGlzLnJlc3RUaW1lciA8IDApIHtcbiAgICAgICAgICB0aGlzLnJlc3RUaW1lciA9IDA7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9IC8vIGVuZCBpZiBhY3RpdmUgc3RhdGVcbiAgICBlbHNlIGlmICh0aGlzLl9zdGF0ZSA9PSBcImZyb3plblwiKSB7XG4gICAgICAvLyBzaW5lIHdhdmUgYWxwaGEgZWZmZWN0XG4gICAgICB0aGlzLnNwcml0ZS5hbHBoYSA9IDAuNSArIDAuNSAqIE1hdGguY29zKHRoaXMuZWZmZWN0U2xpZGVyKTtcbiAgICAgIHRoaXMuZWZmZWN0U2xpZGVyID0gdGhpcy5lZmZlY3RTbGlkZXIgKyBkZWx0YVQgKiA0O1xuICAgIH1cbiAgICBlbHNlIGlmICh0aGlzLl9zdGF0ZSA9PSBcImR5aW5nXCIpIHtcbiAgICAgIC8vIGZhZGUgYW5kIHNocmluayBlZmZlY3RcbiAgICAgIHRoaXMuc3ByaXRlLmFscGhhID0gdGhpcy5lZmZlY3RTbGlkZXI7XG4gICAgICB0aGlzLnNwcml0ZS53aWR0aCA9IGNlbGxEaW0gKiAoMC41ICsgdGhpcy5lZmZlY3RTbGlkZXIgLyAyKTtcbiAgICAgIHRoaXMuc3ByaXRlLmhlaWdodCA9IGNlbGxEaW0gKiAoMC41ICsgdGhpcy5lZmZlY3RTbGlkZXIgLyAyKTtcbiAgICAgIHRoaXMuZWZmZWN0U2xpZGVyID0gdGhpcy5lZmZlY3RTbGlkZXIgLSBkZWx0YVQgLyAodGhpcy5tb3ZlVGltZSAqIDQuMCk7XG4gICAgICBpZiAodGhpcy5lZmZlY3RTbGlkZXIgPD0gMC4wKSB7XG4gICAgICAgIHRoaXMuc2V0U3RhdGUoXCJpbmFjdGl2ZVwiKTtcbiAgICAgIH1cbiAgICB9XG4gICAgZWxzZSBpZiAodGhpcy5fc3RhdGUgPT0gXCJleHBsb2RlXCIpIHtcbiAgICAgIC8vIGJ1cnN0IGFuZCBmYWRlIGVmZmVjdFxuICAgICAgdGhpcy5zcHJpdGUuYWxwaGEgPSB0aGlzLmVmZmVjdFNsaWRlcjtcbiAgICAgIHRoaXMuc3ByaXRlLndpZHRoID0gY2VsbERpbSAqICgxLjAgKyAoMy4wIC0gdGhpcy5lZmZlY3RTbGlkZXIgKiAzLjApKTtcbiAgICAgIHRoaXMuc3ByaXRlLmhlaWdodCA9IGNlbGxEaW0gKiAoMS4wICsgKDMuMCAtIHRoaXMuZWZmZWN0U2xpZGVyICogMy4wKSk7XG4gICAgICB0aGlzLmVmZmVjdFNsaWRlciA9IHRoaXMuZWZmZWN0U2xpZGVyIC0gZGVsdGFUIC8gKHRoaXMubW92ZVRpbWUgKiA0LjApO1xuICAgICAgaWYgKHRoaXMuZWZmZWN0U2xpZGVyIDw9IDAuMCkge1xuICAgICAgICB0aGlzLmVmZmVjdFNsaWRlciA9IDE7IC8vIGtlZXAgZXhwbG9kaW5nIGZvcmV2ZXJcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvLyBQdXRzIHRoaXMgY2hhcmFjdGVyIGludG8gb3Igb3V0IG9mIHBhdXNlZCBzdGF0ZVxuICBzZXRQYXVzZWQodmFsOmJvb2xlYW4pIHtcbiAgICBpZiAodGhpcy5wYXVzZWQgPT0gdmFsKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdGhpcy5wYXVzZWQgPSB2YWw7XG4gICAgaWYgKHZhbCkge1xuICAgICAgdGhpcy5lZmZlY3RTbGlkZXIgPSAwO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgIHRoaXMuc3ByaXRlLmFscGhhID0gMTtcbiAgICB9XG4gIH1cblxuICAvLyBVcGRhdGUgZnVuY3Rpb24gY2FsbGVkIHdoaWxlIGNoYXJhY3RlciBpcyBwYXVzZWRcbiAgdXBkYXRlUGF1c2VkKGRlbHRhVCkge1xuICAgIC8vIHNpbmUgd2F2ZSBhbHBoYSBlZmZlY3RcbiAgICB0aGlzLnNwcml0ZS5hbHBoYSA9IDAuNSArIDAuNSAqIE1hdGguY29zKHRoaXMuZWZmZWN0U2xpZGVyKTtcbiAgICB0aGlzLmVmZmVjdFNsaWRlciA9IHRoaXMuZWZmZWN0U2xpZGVyICsgZGVsdGFUICogNDtcbiAgfVxufVxuXG4vKlxuICAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICBSZXByZXNlbnRzIHRoZSBnYW1lIGF0IHRoZSBoaWdoZXN0IGxldmVsLiBNYW5hZ2VzIFVJIGZlYXR1cmVzLCBhbiBBcnJvd0dyaWRcbiAgaW5zdGFuY2UsIGFuZCB0aGUgZ2FtZSBwaWVjZXMuXG4gIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4qL1xuY2xhc3MgVGhlR2FtZSB7XG4gIHRoZUdyaWQ6QXJyb3dHcmlkO1xuXG4gIGNoZWNrZXJDaGFyYWN0ZXI6R3JpZENoYXJhY3RlcjtcbiAgY2hlY2tNYXJrQ2hhcmFjdGVyOkdyaWRDaGFyYWN0ZXI7XG5cbiAgaW5mb1RleHQ6UElYSS5UZXh0O1xuICByZXNldFRleHQ6UElYSS5UZXh0O1xuICByZXNodWZmbGVUZXh0OlBJWEkuVGV4dDtcbiAgcGF1c2VUZXh0OlBJWEkuVGV4dDtcblxuICBnYW1lU3RhdGU6c3RyaW5nOyAvLyBcInJlYWR5XCIsIFwiaW4gcHJvZ3Jlc3NcIiwgb3IgXCJkb25lXCJcbiAgcGF1c2VkOmJvb2xlYW47XG5cbiAgY29uc3RydWN0b3IoKSB7XG4gICAgdGhpcy50aGVHcmlkID0gbmV3IEFycm93R3JpZCgxMCwgMTApO1xuXG4gICAgLy8gY3JlYXRlIGEgdGV4dCBvYmplY3Qgd2l0aCBhIG5pY2Ugc3Ryb2tlXG4gICAgdGhpcy5pbmZvVGV4dCA9IG5ldyBQSVhJLlRleHQoJ1BsYWNlIHBpZWNlIG9uIGJvYXJkJywgeyBmb250OiAnYm9sZCAzNnB4IEFyaWFsJywgZmlsbDogJyNmZmZmMDAnLCBhbGlnbjogJ2xlZnQnLCBzdHJva2U6ICcjMDAwMEZGJywgc3Ryb2tlVGhpY2tuZXNzOiA0IH0pO1xuICAgIHRoaXMuaW5mb1RleHQucG9zaXRpb24ueCA9IHRoaXMudGhlR3JpZC5jb250YWluZXIueCArIGNlbGxEaW0gKiAodGhpcy50aGVHcmlkLmRpbVggKyAxKTtcbiAgICB0aGlzLmluZm9UZXh0LnBvc2l0aW9uLnkgPSB0aGlzLnRoZUdyaWQuY29udGFpbmVyLnkgKyBjZWxsRGltO1xuICAgIHN0YWdlLmFkZENoaWxkKHRoaXMuaW5mb1RleHQpO1xuXG4gICAgbGV0IGN1cnJlbnRHYW1lOlRoZUdhbWUgPSB0aGlzO1xuICAgIHRoaXMucmVzZXRUZXh0ID0gbmV3IFBJWEkuVGV4dCgnUmVzZXQnLCB7IGZvbnQ6ICdib2xkIDMwcHggQXJpYWwnLCBmaWxsOiAnIzAwMDBmZicsIGFsaWduOiAnbGVmdCcsIHN0cm9rZTogJyNGRjAwRkYnLCBzdHJva2VUaGlja25lc3M6IDQgfSk7XG4gICAgdGhpcy5yZXNldFRleHQucG9zaXRpb24ueCA9IHRoaXMudGhlR3JpZC5jb250YWluZXIueCArIGNlbGxEaW0gKiAodGhpcy50aGVHcmlkLmRpbVggKyAxKTtcbiAgICB0aGlzLnJlc2V0VGV4dC5wb3NpdGlvbi55ID0gdGhpcy50aGVHcmlkLmNvbnRhaW5lci55ICsgY2VsbERpbSAqICh0aGlzLnRoZUdyaWQuZGltWSAtIDMpO1xuICAgIHN0YWdlLmFkZENoaWxkKHRoaXMucmVzZXRUZXh0KTtcbiAgICB0aGlzLnJlc2V0VGV4dC5idXR0b25Nb2RlID0gdHJ1ZTtcbiAgICB0aGlzLnJlc2V0VGV4dC5pbnRlcmFjdGl2ZSA9IHRydWU7XG4gICAgdGhpcy5yZXNldFRleHQub24oJ21vdXNlZG93bicsIGZ1bmN0aW9uKCkge1xuICAgICAgY3VycmVudEdhbWUuaGFuZGxlUmVzZXRQcmVzc2VkKCk7XG4gICAgfSk7XG4gICAgdGhpcy5yZXNldFRleHQudmlzaWJsZSA9IGZhbHNlO1xuXG4gICAgdGhpcy5yZXNodWZmbGVUZXh0ID0gbmV3IFBJWEkuVGV4dCgnUmVzaHVmZmxlJywgeyBmb250OiAnYm9sZCAzMHB4IEFyaWFsJywgZmlsbDogJyMwMDAwZmYnLCBhbGlnbjogJ2xlZnQnLCBzdHJva2U6ICcjRkYwMEZGJywgc3Ryb2tlVGhpY2tuZXNzOiA0IH0pO1xuICAgIHRoaXMucmVzaHVmZmxlVGV4dC5wb3NpdGlvbi54ID0gdGhpcy50aGVHcmlkLmNvbnRhaW5lci54ICsgY2VsbERpbSAqICh0aGlzLnRoZUdyaWQuZGltWCArIDEpO1xuICAgIHRoaXMucmVzaHVmZmxlVGV4dC5wb3NpdGlvbi55ID0gdGhpcy50aGVHcmlkLmNvbnRhaW5lci55ICsgY2VsbERpbSAqICh0aGlzLnRoZUdyaWQuZGltWSAtIDIpO1xuICAgIHN0YWdlLmFkZENoaWxkKHRoaXMucmVzaHVmZmxlVGV4dCk7XG4gICAgdGhpcy5yZXNodWZmbGVUZXh0LmJ1dHRvbk1vZGUgPSB0cnVlO1xuICAgIHRoaXMucmVzaHVmZmxlVGV4dC5pbnRlcmFjdGl2ZSA9IHRydWU7XG4gICAgdGhpcy5yZXNodWZmbGVUZXh0Lm9uKCdtb3VzZWRvd24nLCBmdW5jdGlvbigpIHtcbiAgICAgIGN1cnJlbnRHYW1lLmhhbmRsZVJlc2h1ZmZsZVByZXNzZWQoKTtcbiAgICB9KTtcblxuICAgIHRoaXMucGF1c2VUZXh0ID0gbmV3IFBJWEkuVGV4dCgnUGF1c2UnLCB7IGZvbnQ6ICdib2xkIDMwcHggQXJpYWwnLCBmaWxsOiAnIzAwMDBmZicsIGFsaWduOiAnbGVmdCcsIHN0cm9rZTogJyNGRjAwRkYnLCBzdHJva2VUaGlja25lc3M6IDQgfSk7XG4gICAgdGhpcy5wYXVzZVRleHQucG9zaXRpb24ueCA9IHRoaXMudGhlR3JpZC5jb250YWluZXIueCArIGNlbGxEaW0gKiAodGhpcy50aGVHcmlkLmRpbVggKyAxKTtcbiAgICB0aGlzLnBhdXNlVGV4dC5wb3NpdGlvbi55ID0gdGhpcy50aGVHcmlkLmNvbnRhaW5lci55ICsgY2VsbERpbSAqICh0aGlzLnRoZUdyaWQuZGltWSAtIDEpO1xuICAgIHN0YWdlLmFkZENoaWxkKHRoaXMucGF1c2VUZXh0KTtcbiAgICB0aGlzLnBhdXNlVGV4dC5idXR0b25Nb2RlID0gdHJ1ZTtcbiAgICB0aGlzLnBhdXNlVGV4dC5pbnRlcmFjdGl2ZSA9IHRydWU7XG4gICAgdGhpcy5wYXVzZVRleHQub24oJ21vdXNlZG93bicsIGZ1bmN0aW9uKCkge1xuICAgICAgY3VycmVudEdhbWUuaGFuZGxlUGF1c2VQcmVzc2VkKCk7XG4gICAgfSk7XG4gICAgdGhpcy5wYXVzZVRleHQudmlzaWJsZSA9IGZhbHNlO1xuXG4gICAgLy8gSW5pdGlhbGl6ZSBjaGFyYWN0ZXJzXG4gICAgdGhpcy5jaGVja2VyQ2hhcmFjdGVyID0gbmV3IEdyaWRDaGFyYWN0ZXIoJ2ltYWdlcy9yZWQtY2hlY2tlci5wbmcnLCB0aGlzLnRoZUdyaWQuY29udGFpbmVyKTtcbiAgICB0aGlzLmNoZWNrZXJDaGFyYWN0ZXIubW92ZVRpbWUgPSAwLjU7XG4gICAgdGhpcy5jaGVja01hcmtDaGFyYWN0ZXIgPSBuZXcgR3JpZENoYXJhY3RlcignaW1hZ2VzL2dyZWVuLWNoZWNrLW1hcmsucG5nJywgdGhpcy50aGVHcmlkLmNvbnRhaW5lcik7XG4gICAgdGhpcy5jaGVja01hcmtDaGFyYWN0ZXIubW92ZVRpbWUgPSAwLjI1O1xuXG4gICAgdGhpcy5nYW1lU3RhdGUgPSBcInJlYWR5XCI7XG4gICAgdGhpcy5wYXVzZWQgPSBmYWxzZTtcbiAgfVxuXG4gIC8vIE1haW4gdXBkYXRlIGZ1bmN0aW9uLiBkZWx0YVQgaXMgc2Vjb25kcyBlbGFwc2VkIHNpbmNlIGxhc3QgY2FsbC5cbiAgdXBkYXRlKGRlbHRhVDpudW1iZXIpIHtcbiAgICBsZXQgY2hhcmFjdGVyczpHcmlkQ2hhcmFjdGVyW10gPSBbdGhpcy5jaGVja2VyQ2hhcmFjdGVyLCB0aGlzLmNoZWNrTWFya0NoYXJhY3Rlcl07XG5cbiAgICBpZiAodGhpcy5wYXVzZWQpIHtcbiAgICAgIGZvciAobGV0IGNoYXIgb2YgY2hhcmFjdGVycykge1xuICAgICAgICBjaGFyLnVwZGF0ZVBhdXNlZChkZWx0YVQpO1xuICAgICAgfVxuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGZvciAobGV0IGNoYXIgb2YgY2hhcmFjdGVycykge1xuICAgICAgY2hhci51cGRhdGUoZGVsdGFUKTtcbiAgICAgIGlmIChjaGFyLnJlYWR5VG9Nb3ZlKCkpIHtcbiAgICAgICAgLy8gSGFzIGNoYXJhY3RlciBmYWxsZW4gb2ZmIGdyaWQ/XG4gICAgICAgIGlmIChjaGFyLmNlbGxJbmRleERvd24gPCAwIHx8IGNoYXIuY2VsbEluZGV4RG93biA+PSB0aGlzLnRoZUdyaWQuZGltWSB8fFxuICAgICAgICAgIGNoYXIuY2VsbEluZGV4UmlnaHQgPCAwIHx8IGNoYXIuY2VsbEluZGV4UmlnaHQgPj0gdGhpcy50aGVHcmlkLmRpbVgpIHtcbiAgICAgICAgICBjaGFyLmlzT25HcmlkID0gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZVxuICAgICAgICB7XG4gICAgICAgICAgLy8gQ2hhcmFjdGVyIGlzIHN0aWxsIG9uIGJvYXJkXG4gICAgICAgICAgbGV0IGNlbGw6R3JpZENlbGwgPSB0aGlzLnRoZUdyaWQuZ2V0Q2VsbChjaGFyLmNlbGxJbmRleFJpZ2h0LCBjaGFyLmNlbGxJbmRleERvd24pO1xuICAgICAgICAgIGNlbGwuc2V0VmlzaXRlZCh0cnVlKTtcbiAgICAgICAgICBjaGFyLnJlcXVlc3ROZXdNb3ZlKGNlbGwuZGlyZWN0aW9uKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0gLy8gZW5kIGZvclxuXG4gICAgaWYgKCF0aGlzLmNoZWNrZXJDaGFyYWN0ZXIuaXNPbkdyaWQpIHtcbiAgICAgIC8vIHNsb3dlci1tb3ZpbmcgcGllY2UgaGFzIGxlZnQgdGhlIGJvYXJkXG4gICAgICB0aGlzLmNoZWNrZXJDaGFyYWN0ZXIuc2V0U3RhdGUoXCJmcm96ZW5cIik7XG4gICAgfVxuICAgIGlmICghdGhpcy5jaGVja01hcmtDaGFyYWN0ZXIuaXNPbkdyaWQpIHtcbiAgICAgIC8vIGZhc3Rlci1tb3ZpbmcgcGllY2UgaGFzIGxlZnQgdGhlIGJvYXJkXG4gICAgICB0aGlzLmNoZWNrTWFya0NoYXJhY3Rlci5zZXRTdGF0ZShcImR5aW5nXCIpO1xuICAgICAgdGhpcy5jaGVja2VyQ2hhcmFjdGVyLnNldFN0YXRlKFwiZnJvemVuXCIpO1xuICAgICAgdGhpcy5pbmZvVGV4dC50ZXh0ID0gXCJObyBMb29wXCI7XG4gICAgICB0aGlzLmdhbWVTdGF0ZSA9IFwiZG9uZVwiO1xuICAgICAgdGhpcy5yZXNldFRleHQudmlzaWJsZSA9IHRydWU7XG4gICAgICB0aGlzLnJlc2h1ZmZsZVRleHQudmlzaWJsZSA9IHRydWU7XG4gICAgICB0aGlzLnBhdXNlVGV4dC52aXNpYmxlID0gZmFsc2U7XG4gICAgfVxuICAgIC8vIEFyZSBib3RoIHBpZWNlcyBvbiB0aGUgc2FtZSBzcXVhcmU/IElmIHNvLCB0aGUgZmFzdGVyLW1vdmluZyBvbmUgaGFzIGNhdWdodCB1cCB3aXRoXG4gICAgLy8gdGhlIHNsb3dlci5cbiAgICBlbHNlIGlmIChjaGFyYWN0ZXJzWzBdLnRlc3RDb2xsaXNpb24oY2hhcmFjdGVyc1sxXSkpIHtcbiAgICAgICAgLy8gV2UndmUgY2F1Z2h0IHVwXG4gICAgICAgIHRoaXMuY2hlY2tlckNoYXJhY3Rlci5zZXRTdGF0ZShcImZyb3plblwiKTtcbiAgICAgICAgdGhpcy5jaGVja01hcmtDaGFyYWN0ZXIuc2V0U3RhdGUoXCJleHBsb2RlXCIpO1xuICAgICAgICB0aGlzLmluZm9UZXh0LnRleHQgPSBcIkxvb3AgRGV0ZWN0ZWQhXCJcbiAgICAgICAgdGhpcy5nYW1lU3RhdGUgPSBcImRvbmVcIjtcbiAgICAgICAgdGhpcy5yZXNldFRleHQudmlzaWJsZSA9IHRydWU7XG4gICAgICAgIHRoaXMucmVzaHVmZmxlVGV4dC52aXNpYmxlID0gdHJ1ZTtcbiAgICAgICAgdGhpcy5wYXVzZVRleHQudmlzaWJsZSA9IGZhbHNlO1xuICAgIH1cbiAgfVxuXG4gIC8vIENhbGxlZCB3aGVuIHVzZXIgY2xpY2tzIG9uIGFuIGFycm93IGNlbGxcbiAgaGFuZGxlQ2VsbFByZXNzKHBpeFg6bnVtYmVyLCBwaXhZOm51bWJlcikge1xuICAgIGxldCBjZWxsWCA9IE1hdGguZmxvb3IocGl4WCAvIGNlbGxEaW0pO1xuICAgIGxldCBjZWxsWSA9IE1hdGguZmxvb3IocGl4WSAvIGNlbGxEaW0pO1xuICAgIGNvbnNvbGUubG9nKFwiYnV0dG9uIGNlbGw6IFwiICsgY2VsbFggKyBcIixcIiArIGNlbGxZKTtcbiAgICBpZiAodGhpcy5jaGVja2VyQ2hhcmFjdGVyLmdldFN0YXRlKCkgPT0gXCJpbmFjdGl2ZVwiKSB7XG4gICAgICB0aGlzLmNoZWNrZXJDaGFyYWN0ZXIuc2V0UG9zaXRpb24oY2VsbFgsIGNlbGxZKTtcbiAgICAgIHRoaXMuY2hlY2tNYXJrQ2hhcmFjdGVyLnNldFBvc2l0aW9uKGNlbGxYLCBjZWxsWSk7XG4gICAgICB0aGlzLmluZm9UZXh0LnRleHQgPSBcIlRyYXZlbGluZy4uLlwiXG4gICAgICB0aGlzLmdhbWVTdGF0ZSA9IFwiaW4gcHJvZ3Jlc3NcIjtcbiAgICAgIHRoaXMucmVzZXRUZXh0LnZpc2libGUgPSBmYWxzZTtcbiAgICAgIHRoaXMucmVzaHVmZmxlVGV4dC52aXNpYmxlID0gZmFsc2U7XG4gICAgICB0aGlzLnBhdXNlVGV4dC52aXNpYmxlID0gdHJ1ZTtcbiAgICB9XG4gIH1cblxuICBoYW5kbGVDZWxsT3ZlcihwaXhYOm51bWJlciwgcGl4WTpudW1iZXIpIHtcbiAgICBsZXQgY2VsbFggPSBNYXRoLmZsb29yKHBpeFggLyBjZWxsRGltKTtcbiAgICBsZXQgY2VsbFkgPSBNYXRoLmZsb29yKHBpeFkgLyBjZWxsRGltKTtcbiAgICBsZXQgY2VsbDpHcmlkQ2VsbCA9IHRoaXMudGhlR3JpZC5nZXRDZWxsKGNlbGxYLCBjZWxsWSk7XG4gICAgY2VsbC5zZXRIaWdobGlnaHQodHJ1ZSk7XG4gIH1cblxuICBoYW5kbGVDZWxsT3V0KHBpeFg6bnVtYmVyLCBwaXhZOm51bWJlcikge1xuICAgIGxldCBjZWxsWCA9IE1hdGguZmxvb3IocGl4WCAvIGNlbGxEaW0pO1xuICAgIGxldCBjZWxsWSA9IE1hdGguZmxvb3IocGl4WSAvIGNlbGxEaW0pO1xuICAgIGxldCBjZWxsOkdyaWRDZWxsID0gdGhpcy50aGVHcmlkLmdldENlbGwoY2VsbFgsIGNlbGxZKTtcbiAgICBjZWxsLnNldEhpZ2hsaWdodChmYWxzZSk7XG4gIH1cblxuICBoYW5kbGVSZXNldFByZXNzZWQoKSB7XG4gICAgdGhpcy50aGVHcmlkLnJlc2V0QXJyb3dzKCk7XG4gICAgdGhpcy5jaGVja2VyQ2hhcmFjdGVyLnNldFN0YXRlKFwiaW5hY3RpdmVcIik7XG4gICAgdGhpcy5jaGVja01hcmtDaGFyYWN0ZXIuc2V0U3RhdGUoXCJpbmFjdGl2ZVwiKTtcbiAgICB0aGlzLmluZm9UZXh0LnRleHQgPSBcIlBsYWNlIHBpZWNlIG9uIGJvYXJkXCI7XG4gICAgdGhpcy5nYW1lU3RhdGUgPSBcInJlYWR5XCI7XG4gIH1cblxuICBoYW5kbGVSZXNodWZmbGVQcmVzc2VkKCkge1xuICAgIHRoaXMudGhlR3JpZC5yZXNodWZmbGVBcnJvd3MoKTtcbiAgICB0aGlzLmNoZWNrZXJDaGFyYWN0ZXIuc2V0U3RhdGUoXCJpbmFjdGl2ZVwiKTtcbiAgICB0aGlzLmNoZWNrTWFya0NoYXJhY3Rlci5zZXRTdGF0ZShcImluYWN0aXZlXCIpO1xuICAgIHRoaXMuaW5mb1RleHQudGV4dCA9IFwiUGxhY2UgcGllY2Ugb24gYm9hcmRcIjtcbiAgICB0aGlzLmdhbWVTdGF0ZSA9IFwicmVhZHlcIjtcbiAgfVxuXG4gIGhhbmRsZVBhdXNlUHJlc3NlZCgpIHtcbiAgICBsZXQgcGF1c2VkU3RhdGU6Ym9vbGVhbiA9ICF0aGlzLnBhdXNlZDtcblxuICAgIGlmIChwYXVzZWRTdGF0ZSkge1xuICAgICAgdGhpcy5wYXVzZVRleHQudGV4dCA9IFwiVW5wYXVzZVwiO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgIHRoaXMucGF1c2VUZXh0LnRleHQgPSBcIlBhdXNlXCI7XG4gICAgfVxuICAgIHRoaXMuY2hlY2tlckNoYXJhY3Rlci5zZXRQYXVzZWQocGF1c2VkU3RhdGUpO1xuICAgIHRoaXMuY2hlY2tNYXJrQ2hhcmFjdGVyLnNldFBhdXNlZChwYXVzZWRTdGF0ZSk7XG4gICAgdGhpcy5wYXVzZWQgPSBwYXVzZWRTdGF0ZTtcbiAgfVxufVxuXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLy8gR2xvYmFsIHZhcnMgYW5kIGJhc2ljIHNldHVwXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4vLyBHcmFwaGljYWwgY29udGFpbmVyXG5cbi8vIGNyZWF0ZSB0aGUgcm9vdCBvZiB0aGUgc2NlbmUgZ3JhcGhcbnZhciBzdGFnZSA9IG5ldyBQSVhJLkNvbnRhaW5lcigpO1xuXG4vLyBBcnJheSBhbmQgZGltZW5zaW9ucyBmb3IgdGhlIGdyaWRcbmxldCBjZWxsRGltOm51bWJlciA9IDUwO1xuXG5sZXQgZ2FtZUluc3RhbmNlOlRoZUdhbWU7XG5cbmRvU2V0dXAoKTtcblxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8vIEZ1bmN0aW9uIGRlZmluaXRpb25zXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4vLyBUaGVyZSdzIHByb2JhYmx5IGEgbGVzcyBhd2t3YXJkIHdheSB0byBkbyB0aGVzZSBidXR0b24gZnVuY3Rpb25zLCBidXQgb3V0dGEgdGltZS5cbi8vIFRoZXkgcmVzcG9uZCB0byBpbnRlcmFjdGlvbnMgd2l0aCBpbmRpdmlkdWFsIGFycm93cyBhbmQgcGFzcyB0aGUgY2FsbCBvbiB0b1xuLy8gdGhlIGFycm93IGdyaWQuXG5cbmZ1bmN0aW9uIG9uQnV0dG9uRG93bigpXG57XG4gIGdhbWVJbnN0YW5jZS5oYW5kbGVDZWxsUHJlc3ModGhpcy54LCB0aGlzLnkpO1xufVxuXG5mdW5jdGlvbiBvbkJ1dHRvbk92ZXIoKVxue1xuICBnYW1lSW5zdGFuY2UuaGFuZGxlQ2VsbE92ZXIodGhpcy54LCB0aGlzLnkpO1xufVxuXG5mdW5jdGlvbiBvbkJ1dHRvbk91dCgpXG57XG4gIGdhbWVJbnN0YW5jZS5oYW5kbGVDZWxsT3V0KHRoaXMueCwgdGhpcy55KTtcbn1cblxuZnVuY3Rpb24gdXBkYXRlKCkge1xuICAgIGdhbWVJbnN0YW5jZS51cGRhdGUoMC4wMSk7IC8vIGFkdmFuY2UgY2xvY2sgYnkgMS8xMDB0aCBvZiBhIHNlY29uZFxufVxuXG5mdW5jdGlvbiBkb1NldHVwKCkge1xuICAvL2NyZWF0ZUdyaWQoKTtcbiAgY29uc29sZS5sb2coXCJUZXN0XCIpO1xuICBnYW1lSW5zdGFuY2UgPSBuZXcgVGhlR2FtZSgpO1xuICAvLyBBIGZ1bmN0aW9uIHRoYXQgdXBkYXRlcyBhIGh1bmRyZWQgdGltZXMgYSBzZWNvbmRcbiAgc2V0SW50ZXJ2YWwodXBkYXRlLCAxMCk7XG4gIGFuaW1hdGUoKTtcbn1cblxuZnVuY3Rpb24gYW5pbWF0ZSgpIHtcblxuICAgIHJlcXVlc3RBbmltYXRpb25GcmFtZShhbmltYXRlKTtcblxuICAgIC8vIHJlbmRlciB0aGUgcm9vdCBjb250YWluZXJcbiAgICByZW5kZXJlci5yZW5kZXIoc3RhZ2UpO1xufVxuIl19
