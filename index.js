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
        if (this.checkerCharacter.getState() == "inactive") {
            this.checkerCharacter.setPosition(cellX, cellY);
            this.checkMarkCharacter.setPosition(cellX, cellY);
            this.infoText.text = "Traveling...";
            this.gameState = "in progress";
            this.resetText.visible = false;
            this.reshuffleText.visible = false;
            this.pauseText.visible = true;
        }
        console.log("button cell: " + cellX + "," + cellY);
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQSw4Q0FBOEM7O0FBRTlDLElBQU8sSUFBSSxXQUFXLFNBQVMsQ0FBQyxDQUFDO0FBQ2pDLElBQU0sUUFBUSxHQUFzQixJQUFJLElBQUksQ0FBQyxhQUFhLENBQUMsSUFBSSxFQUFFLEdBQUcsQ0FBQyxDQUFDO0FBQ3RFLFFBQVEsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQztBQUV6QywwQkFBMEI7QUFDMUIsb0JBQW9CO0FBQ3BCLDBCQUEwQjtBQUUxQjs7OztFQUlFO0FBQ0Y7SUFRRSxrQkFBWSxDQUFRLEVBQUUsQ0FBUSxFQUFFLFNBQXdCO1FBQ3RELElBQUksS0FBSyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLHVCQUF1QixDQUFDLENBQUM7UUFDM0QsS0FBSyxDQUFDLENBQUMsR0FBRyxPQUFPLEdBQUcsQ0FBQyxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUM7UUFDOUIsS0FBSyxDQUFDLENBQUMsR0FBRyxPQUFPLEdBQUcsQ0FBQyxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUM7UUFDOUIsS0FBSyxDQUFDLEtBQUssR0FBRyxPQUFPLENBQUM7UUFDdEIsS0FBSyxDQUFDLE1BQU0sR0FBRyxPQUFPLENBQUM7UUFDdkIsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDLEdBQUcsR0FBRyxDQUFDO1FBQ3JCLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBQztRQUNyQixTQUFTLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQzFCLElBQUksQ0FBQyxLQUFLLEdBQUcsQ0FBQyxDQUFDO1FBQ2YsSUFBSSxDQUFDLEtBQUssR0FBRyxDQUFDLENBQUM7UUFDZixJQUFJLENBQUMs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QUFJLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQztBQUVqQyxvQ0FBb0M7QUFDcEMsSUFBSSxPQUFPLEdBQVUsRUFBRSxDQUFDO0FBRXhCLElBQUksWUFBb0IsQ0FBQztBQUV6QixPQUFPLEVBQUUsQ0FBQztBQUVWLDBCQUEwQjtBQUMxQix1QkFBdUI7QUFDdkIsMEJBQTBCO0FBRTFCLG9GQUFvRjtBQUNwRiw4RUFBOEU7QUFDOUUsa0JBQWtCO0FBRWxCO0lBRUUsWUFBWSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUMvQyxDQUFDO0FBRUQ7SUFFRSxZQUFZLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQzlDLENBQUM7QUFFRDtJQUVFLFlBQVksQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDN0MsQ0FBQztBQUVEO0lBQ0ksWUFBWSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLHVDQUF1QztBQUN0RSxDQUFDO0FBRUQ7SUFDRSxlQUFlO0lBQ2YsT0FBTyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQztJQUNwQixZQUFZLEdBQUcsSUFBSSxPQUFPLEVBQUUsQ0FBQztJQUM3QixtREFBbUQ7SUFDbkQsV0FBVyxDQUFDLE1BQU0sRUFBRSxFQUFFLENBQUMsQ0FBQztJQUN4QixPQUFPLEVBQUUsQ0FBQztBQUNaLENBQUM7QUFFRDtJQUVJLHFCQUFxQixDQUFDLE9BQU8sQ0FBQyxDQUFDO0lBRS9CLDRCQUE0QjtJQUM1QixRQUFRLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDO0FBQzNCLENBQUMiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uL3R5cGluZ3MvaW5kZXguZC50c1wiIC8+XG5cbmltcG9ydCBQSVhJID0gcmVxdWlyZSgncGl4aS5qcycpO1xuY29uc3QgcmVuZGVyZXI6UElYSS5XZWJHTFJlbmRlcmVyID0gbmV3IFBJWEkuV2ViR0xSZW5kZXJlcigxMjgwLCA3MjApO1xuZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZChyZW5kZXJlci52aWV3KTtcblxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8vIENsYXNzIGRlZmluaXRpb25zXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4vKlxuICBSZXByZXNlbnRzIGEgY2VsbCBvbiB0aGUgZ2FtZSBib2FyZC4gQSBjZWxsIGNvbnRhaW5zIGFuIGFycm93IFNwcml0ZVxuICB3aGljaCBwb2ludHMgaW4gb25lIG9mIGZvdXIgY2FyZGluYWwgZGlyZWN0aW9ucy4gRWFjaCBjZWxsIGFjdHMgYXNcbiAgYSBidXR0b24gYW5kIGNhbiBiZSBjbGlja2VkLlxuKi9cbmNsYXNzIEdyaWRDZWxsIHtcbiAgc3ByaXRlOlBJWEkuU3ByaXRlO1xuICAvLyBBcnJvdydzIGZhY2luZyBkaXJlY3Rpb246IDA9bGVmdCwgMT11cCwgMj1yaWdodCwgMz1kb3duXG4gIGRpcmVjdGlvbjpudW1iZXI7XG4gIGNlbGxYOm51bWJlcjsgLy8gY29vcmRpbmF0ZSBvbiB0aGUgZ2FtZSBib2FyZCwgZnJvbSBsZWZ0XG4gIGNlbGxZOm51bWJlcjsgLy8gY29vcmRpbmF0ZSBvbiB0aGUgZ2FtZSBib2FyZCwgZnJvbSB0b3BcbiAgdmlzaXRlZDpib29sZWFuOyAvLyBpZiB0aGUgY2VsbCBoYXMgYmVlbiB2aXNpdGVkIGJ5IGdhbWUgcGllY2VcblxuICBjb25zdHJ1Y3RvcihpOm51bWJlciwgajpudW1iZXIsIGNvbnRhaW5lcjpQSVhJLkNvbnRhaW5lcikge1xuICAgIHZhciBhcnJvdyA9IFBJWEkuU3ByaXRlLmZyb21JbWFnZSgnaW1hZ2VzL2Fycm93LWljb24ucG5nJyk7XG4gICAgYXJyb3cueCA9IGNlbGxEaW0gKiAoaSArIDAuNSk7XG4gICAgYXJyb3cueSA9IGNlbGxEaW0gKiAoaiArIDAuNSk7XG4gICAgYXJyb3cud2lkdGggPSBjZWxsRGltO1xuICAgIGFycm93LmhlaWdodCA9IGNlbGxEaW07XG4gICAgYXJyb3cuYW5jaG9yLnggPSAwLjU7XG4gICAgYXJyb3cuYW5jaG9yLnkgPSAwLjU7XG4gICAgY29udGFpbmVyLmFkZENoaWxkKGFycm93KTtcbiAgICB0aGlzLmNlbGxYID0gaTtcbiAgICB0aGlzLmNlbGxZID0gajtcbiAgICB0aGlzLnNwcml0ZSA9IGFycm93O1xuICAgIHRoaXMuZGlyZWN0aW9uID0gMDtcbiAgICB0aGlzLnNldFZpc2l0ZWQoZmFsc2UpO1xuXG4gICAgLy8gb25FdmVudCBmdW5jdGlvbnMgYXJlIGdsb2JhbCBmdW5jdGlvbnMgKHRvd2FyZHMgYm90dG9tIG9mIGZpbGUpXG4gICAgYXJyb3cuYnV0dG9uTW9kZSA9IHRydWU7XG4gICAgYXJyb3cuaW50ZXJhY3RpdmUgPSB0cnVlO1xuICAgIGFycm93Lm9uKCdtb3VzZWRvd24nLCBvbkJ1dHRvbkRvd24pO1xuICAgIGFycm93Lm9uKCdtb3VzZW92ZXInLCBvbkJ1dHRvbk92ZXIpO1xuICAgIGFycm93Lm9uKCdtb3VzZW91dCcsIG9uQnV0dG9uT3V0KVxuICB9XG5cbiAgLy8gU2V0cyB0aGUgZGlyZWN0aW9uIG9mIHRoZSBhcnJvdzogMD1sZWZ0LCAxPXVwLCAyPXJpZ2h0LCAzPWRvd25cbiAgc2V0RGlyZWN0aW9uKHZhbCkge1xuICAgIGNvbnN0IHBpID0gMy4xNDE1OTI2NTtcbiAgICB0aGlzLnNwcml0ZS5yb3RhdGlvbiA9IHBpICogdmFsIC8gMi4wO1xuICAgIHRoaXMuZGlyZWN0aW9uID0gdmFsO1xuICB9XG5cbiAgLy8gU2V0cyBpZiB0aGUgY2VsbCBoYXMgYmVlbiB2aXNpdGVkIGJ5IGEgZ2FtZSBwaWVjZVxuICBzZXRWaXNpdGVkKHZhbHVlOmJvb2xlYW4pIHtcbiAgICBpZiAodmFsdWUpIHtcbiAgICAgIHRoaXMuc3ByaXRlLnRpbnQgPSAweGZmZmZmZjsgLy8gbWFrZSBicmlnaHRlclxuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgIHRoaXMuc3ByaXRlLnRpbnQgPSAweGZmNzdhYTtcbiAgICB9XG4gICAgdGhpcy52aXNpdGVkID0gdmFsdWU7XG4gIH1cblxuICAvLyBJZiB2YWx1ZT09dHJ1ZSwgdGVtcG9yYXJpbHkgaGlnaGxpZ2h0cyB0aGUgY2VsbFxuICAvLyBJZiB2YWx1ZT09dHJ1ZSwgaXQgcmV2ZXJ0cyB0byBpdHMgcHJldmlvdXMgY29sb3JcbiAgc2V0SGlnaGxpZ2h0KHZhbHVlOmJvb2xlYW4pIHtcbiAgICBsZXQgY3VycmVudFZhbHVlOmJvb2xlYW4gPSB0aGlzLnZpc2l0ZWQ7XG4gICAgaWYgKCF2YWx1ZSkge1xuICAgICAgdmFsdWUgPSBjdXJyZW50VmFsdWU7XG4gICAgfVxuICAgIHRoaXMuc2V0VmlzaXRlZCh2YWx1ZSk7XG4gICAgdGhpcy52aXNpdGVkID0gY3VycmVudFZhbHVlO1xuICB9XG59XG5cbi8qXG4gIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIFJlcHJlc2VudHMgdGhlIGVudGlyZSBnYW1lIGJvYXJkLiBDb250YWlucyBhIDJkIGFycmF5IG9mIEdyaWNDZWxsIG9iamVjdHMuXG4gIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4qL1xuY2xhc3MgQXJyb3dHcmlkIHtcbiAgY29udGFpbmVyOlBJWEkuQ29udGFpbmVyO1xuICBncmlkOkdyaWRDZWxsW11bXTtcbiAgZGltWDpudW1iZXI7IC8vIGRpbWVuc2lvbiBvZiBnYW1lIGJvYXJkIGluIGNlbGxzXG4gIGRpbVk6bnVtYmVyO1xuXG4gIGNvbnN0cnVjdG9yKHdpZHRoOm51bWJlciwgaGVpZ2h0Om51bWJlcikge1xuICAgIHRoaXMuY29udGFpbmVyID0gbmV3IFBJWEkuQ29udGFpbmVyKCk7XG4gICAgc3RhZ2UuYWRkQ2hpbGQodGhpcy5jb250YWluZXIpO1xuICAgIHRoaXMuY29udGFpbmVyLnggPSAxMDA7XG4gICAgdGhpcy5jb250YWluZXIueSA9IDYwO1xuICAgIHRoaXMuZGltWCA9IHdpZHRoO1xuICAgIHRoaXMuZGltWSA9IGhlaWdodDtcbiAgICB0aGlzLmdyaWQgPSBbXTtcbiAgICBmb3IgKHZhciBqID0gMDsgaiA8IGhlaWdodDsgaisrKSB7XG4gICAgICB0aGlzLmdyaWRbal0gPSBbXTtcbiAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgd2lkdGg7IGkrKykge1xuICAgICAgICBsZXQgbmV3Q2VsbDpHcmlkQ2VsbCA9IG5ldyBHcmlkQ2VsbChpLCBqLCB0aGlzLmNvbnRhaW5lcik7XG4gICAgICAgIHRoaXMuZ3JpZFtqXVtpXSA9IG5ld0NlbGw7XG4gICAgICB9O1xuICAgIH1cbiAgICB0aGlzLnJlc2h1ZmZsZUFycm93cygpO1xuICB9XG5cbiAgLy8gTWFya3MgYWxsIGNlbGxzIGFzIHVudmlzaXRlZFxuICByZXNldEFycm93cygpIHtcbiAgICBmb3IgKHZhciBqID0gMDsgaiA8IHRoaXMuZGltWTsgaisrKSB7XG4gICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMuZGltWDsgaSsrKSB7XG4gICAgICAgIHRoaXMuZ3JpZFtqXVtpXS5zZXRWaXNpdGVkKGZhbHNlKTtcbiAgICAgIH07XG4gICAgfVxuICB9XG5cbiAgLy8gTWFya3MgYWxsIGNlbGxzIGFzIHVudmlzaXRlZCBhbmQgY2hhbmdlcyBhcnJvdyBkaXJlY3Rpb25zXG4gIHJlc2h1ZmZsZUFycm93cygpIHtcbiAgICBmb3IgKHZhciBqID0gMDsgaiA8IHRoaXMuZGltWTsgaisrKSB7XG4gICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMuZGltWDsgaSsrKSB7XG4gICAgICAgIHRoaXMuZ3JpZFtqXVtpXS5zZXRWaXNpdGVkKGZhbHNlKTtcbiAgICAgICAgLy8gSXQncyBhIGxpdHRsZSBib3JpbmcgdG8gaGF2ZSB0d28gYXJyb3dzIHBvaW50aW5nIGF0IGVhY2ggb3RoZXIsIHNvIHByZXZlbnQgdGhhdFxuICAgICAgICBsZXQgYWxsb3dlZERpcmVjdGlvbnM6Ym9vbGVhbltdID0gW3RydWUsIHRydWUsIHRydWUsIHRydWUsIGZhbHNlXTtcbiAgICAgICAgLy8gSXMgdGhlIG9uZSBhYm92ZSBtZSBwb2ludGluZyBkb3duP1xuICAgICAgICBpZiAoaiA+IDAgJiYgdGhpcy5ncmlkW2otMV1baV0uZGlyZWN0aW9uID09IDMpIHtcbiAgICAgICAgICAvLyBOb3QgYWxsb3dlZCB0byBwb2ludCBzdHJhaWdodCB1cFxuICAgICAgICAgIGFsbG93ZWREaXJlY3Rpb25zWzFdID0gZmFsc2U7XG4gICAgICAgICAgLy9jb25zb2xlLmxvZyhcIkZvcmJpZGRlbiB1cCBhdCBcIiArIGkgKyBcIixcIiArIGopO1xuICAgICAgICB9XG4gICAgICAgIC8vIElzIHRoZSBvbmUgdG8gbXkgbGVmdCBwb2ludGluZyByaWdodD9cbiAgICAgICAgaWYgKGkgPiAwICYmIHRoaXMuZ3JpZFtqXVtpLTFdLmRpcmVjdGlvbiA9PSAyKSB7XG4gICAgICAgICAgLy8gTm90IGFsbG93ZWQgdG8gcG9pbnQgbGVmdFxuICAgICAgICAgIGFsbG93ZWREaXJlY3Rpb25zWzBdID0gZmFsc2U7XG4gICAgICAgICAgLy9jb25zb2xlLmxvZyhcIkZvcmJpZGRlbiBsZWZ0IGF0IFwiICsgaSArIFwiLFwiICsgaik7XG4gICAgICAgIH1cbiAgICAgICAgbGV0IHByb3Bvc2VkRGlyZWN0aW9uOm51bWJlciA9IDQ7IC8vIG5vdCBhIHZhbGlkIGRpcmVjdGlvbiwgc28gdGhlIGZpcnN0IHRlc3Qgd2lsbCBmYWlsXG4gICAgICAgIHdoaWxlIChhbGxvd2VkRGlyZWN0aW9uc1twcm9wb3NlZERpcmVjdGlvbl0gPT0gZmFsc2UpXG4gICAgICAgIHtcbiAgICAgICAgICBwcm9wb3NlZERpcmVjdGlvbiA9IE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIDQuMCk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5ncmlkW2pdW2ldLnNldERpcmVjdGlvbihwcm9wb3NlZERpcmVjdGlvbik7XG4gICAgICB9O1xuICAgIH1cbiAgfVxuXG4gIC8vIFJldHVybnMgcmVmIHRvIGNlbGwgYXQgcGFydGljdWxhciBncmlkIGxvY2F0aW9uXG4gIGdldENlbGwoZ3JpZFg6bnVtYmVyLCBncmlkWTpudW1iZXIpIHtcbiAgICByZXR1cm4gdGhpcy5ncmlkW2dyaWRZXVtncmlkWF07XG4gIH1cbn1cblxuLypcbiAgLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgUmVwcmVzZW50cyBhIGdhbWUgcGllY2UuIEEgcGllY2UgY2FuIG9jY3VweSBhIGNlbGwgYW5kIHRyYW5zaXRpb24gaW4gYVxuICB2aWRlb2dhbWUteSBtYW5uZXIgYmV0d2VlbiBjZWxscy4gSXQgYWxzbyBoYXMgYSBzdGF0ZSBtYWNoaW5lIGFuZFxuICBjYW4gcGVyZm9ybSBzZXZlcmFsIGFuaW1hdGlvbiBzZXF1ZW5jZXMuXG4gIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4qL1xuY2xhc3MgR3JpZENoYXJhY3RlciB7XG4gIHNwcml0ZTpQSVhJLlNwcml0ZTtcbiAgY2VsbEluZGV4UmlnaHQ6bnVtYmVyOyAvLyBib2FyZCBjb29yZGluYXRlXG4gIGNlbGxJbmRleERvd246bnVtYmVyO1xuICB4TW92ZW1lbnREaXI6bnVtYmVyOyAvLyBkaXJlY3Rpb24gb2YgY3VycmVudCBtb3ZlbWVudCwgKC0xID0gbGVmdCwgMSA9IHJpZ2h0KVxuICB5TW92ZW1lbnREaXI6bnVtYmVyOyAvLyBkaXJlY3Rpb24gb2YgY3VycmVudCBtb3ZlbWVudCwgKC0xID0gdXAsIDEgPSBkb3duKVxuXG4gIHNsaWRlVmFsdWU6bnVtYmVyOyAvLyBob3cgZmFyIHRoZSBwaWVjZSBoYXMgc2xpZCBhd2F5IGZyb20gY3VycmVudCBjZWxsXG4gICAgICAgICAgICAgICAgICAgICAvLyAwIHRvIDFcbiAgZWZmZWN0U2xpZGVyOm51bWJlcjsgLy8gVXNlZCBmb3IgdGhlIGFuaW1hdGlvbiBvZiBlZmZlY3RzXG4gIHJlc3RUaW1lcjpudW1iZXI7ICAvLyB0aGUgcGllY2UgXCJyZXN0c1wiIGZvciBhIGJpdCBhZnRlciBhcnJpdmluZ1xuICBtb3ZlVGltZTpudW1iZXI7IC8vIGhvdyBtYW55IHNlY29uZHMgYSBtb3ZlIG9yIHJlc3QgcGVyaW9kIHRha2VzXG5cbiAgb25Jbml0aWFsQ2VsbDpib29sZWFuO1xuICBpc01vdmluZzpib29sZWFuO1xuICBpc09uR3JpZDpib29sZWFuOyAvLyBmYWxzZSBpZiBwaWVjZSBtb3ZlcyBvZmYgYm9hcmRcbiAgcGF1c2VkOmJvb2xlYW47XG5cbiAgcHJpdmF0ZSBfc3RhdGU6c3RyaW5nO1xuXG4gIGNvbnN0cnVjdG9yKG5hbWU6c3RyaW5nLCBjb250YWluZXI6UElYSS5Db250YWluZXIpIHtcbiAgICB0aGlzLnNwcml0ZSA9IFBJWEkuU3ByaXRlLmZyb21JbWFnZShuYW1lKTtcbiAgICB0aGlzLnNwcml0ZS53aWR0aCA9IGNlbGxEaW07XG4gICAgdGhpcy5zcHJpdGUuaGVpZ2h0ID0gY2VsbERpbTtcbiAgICB0aGlzLnNwcml0ZS5hbmNob3IueCA9IDAuNTtcbiAgICB0aGlzLnNwcml0ZS5hbmNob3IueSA9IDAuNTtcbiAgICB0aGlzLnNwcml0ZS5hbHBoYSA9IDA7XG4gICAgY29udGFpbmVyLmFkZENoaWxkKHRoaXMuc3ByaXRlKTtcblxuICAgIHRoaXMuaXNNb3ZpbmcgPSBmYWxzZTtcbiAgICB0aGlzLmlzT25HcmlkID0gdHJ1ZTtcbiAgICB0aGlzLnBhdXNlZCA9IGZhbHNlO1xuICAgIHRoaXMucmVzdFRpbWVyID0gMDtcbiAgICB0aGlzLm1vdmVUaW1lID0gMS4wO1xuICAgIHRoaXMuX3N0YXRlID0gXCJpbmFjdGl2ZVwiO1xuICB9XG5cbiAgLy8gSW5zdGFudGx5IHBvc2l0aW9ucyB0aGUgcGllY2UgYXQgaXRzIHN0YXJ0IHBvc2l0aW9uXG4gIHNldFBvc2l0aW9uKGk6bnVtYmVyLCBqOm51bWJlcikge1xuICAgIHRoaXMuc3ByaXRlLnggPSBjZWxsRGltICogKGkgKyAwLjUpO1xuICAgIHRoaXMuc3ByaXRlLnkgPSBjZWxsRGltICogKGogKyAwLjUpO1xuICAgIHRoaXMuc3ByaXRlLndpZHRoID0gY2VsbERpbTtcbiAgICB0aGlzLnNwcml0ZS5oZWlnaHQgPSBjZWxsRGltO1xuICAgIHRoaXMuc3ByaXRlLmFscGhhID0gMTtcbiAgICB0aGlzLmNlbGxJbmRleERvd24gPSBqO1xuICAgIHRoaXMuY2VsbEluZGV4UmlnaHQgPSBpO1xuICAgIHRoaXMub25Jbml0aWFsQ2VsbCA9IHRydWU7XG4gICAgdGhpcy5wYXVzZWQgPSBmYWxzZTtcbiAgICB0aGlzLmlzTW92aW5nID0gZmFsc2U7XG4gICAgdGhpcy5pc09uR3JpZCA9IHRydWU7XG4gICAgdGhpcy5zbGlkZVZhbHVlID0gMDtcbiAgICB0aGlzLnJlc3RUaW1lciA9IHRoaXMubW92ZVRpbWU7IC8vIGxldCBpdCByZXN0IGJlZm9yZSBzdGFydGluZyBtb3ZlXG4gICAgdGhpcy5fc3RhdGUgPSBcImFjdGl2ZVwiO1xuICB9XG5cbiAgLy8gUmV0dXJucyB0cnVlIGlmIGNoYXJhY3RlciBjYW4gYmUgaXNzdWVkIGEgbmV3IG1vdmVcbiAgcmVhZHlUb01vdmUoKSB7XG4gICAgaWYgKHRoaXMuX3N0YXRlICE9IFwiYWN0aXZlXCIpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgcmV0dXJuICghdGhpcy5pc01vdmluZyAmJiB0aGlzLnJlc3RUaW1lciA9PSAwKTtcbiAgfVxuXG4gIC8vIFJldHVybnMgdHJ1ZSBpZiB0aGlzIGNoYXJhY3RlciBhbmQgdGhlIG90aGVyIGhhdmUgY2F1Z2h0IHVwIHRvIGVhY2ggb3RoZXJcbiAgdGVzdENvbGxpc2lvbihvdGhlcjpHcmlkQ2hhcmFjdGVyKSB7XG4gICAgaWYgKHRoaXMub25Jbml0aWFsQ2VsbCB8fCBvdGhlci5vbkluaXRpYWxDZWxsIHx8IHRoaXMuX3N0YXRlICE9IFwiYWN0aXZlXCIpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgaWYgKHRoaXMuY2VsbEluZGV4RG93biA9PSBvdGhlci5jZWxsSW5kZXhEb3duICYmXG4gICAgICB0aGlzLmNlbGxJbmRleFJpZ2h0ID09IG90aGVyLmNlbGxJbmRleFJpZ2h0KSB7XG4gICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIC8vIFRlbGxzIHRoZSBwaWVjZSB0byBiZWdpbiBtb3ZpbmcgaW4gdGhlIGdpdmVuIGRpcmVjdGlvblxuICAvLyBTZWUgR3JpZENlbGwgZm9yIGRpcmVjdGlvbiB2YWx1ZXMuXG4gIHJlcXVlc3ROZXdNb3ZlKGRpcmVjdGlvbikge1xuICAgIGlmICh0aGlzLl9zdGF0ZSAhPSBcImFjdGl2ZVwiKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGlmICh0aGlzLmlzTW92aW5nKSB7XG4gICAgICByZXR1cm47IC8vIGNhbid0IGNoYW5nZSB3aGlsZSBhbHJlYWR5IG1vdmluZ1xuICAgIH1cbiAgICBpZiAoZGlyZWN0aW9uID09IDApIC8vIGxlZnRcbiAgICB7XG4gICAgICB0aGlzLnhNb3ZlbWVudERpciA9IC0xLjA7XG4gICAgICB0aGlzLnlNb3ZlbWVudERpciA9ICAwLjA7XG4gICAgfVxuICAgIGVsc2UgaWYgKGRpcmVjdGlvbiA9PSAxKSAvLyB1cFxuICAgIHtcbiAgICAgIHRoaXMueE1vdmVtZW50RGlyID0gIDAuMDtcbiAgICAgIHRoaXMueU1vdmVtZW50RGlyID0gLTEuMDtcbiAgICB9XG4gICAgZWxzZSBpZiAoZGlyZWN0aW9uID09IDIpIC8vIHJpZ2h0XG4gICAge1xuICAgICAgdGhpcy54TW92ZW1lbnREaXIgPSAgMS4wO1xuICAgICAgdGhpcy55TW92ZW1lbnREaXIgPSAgMC4wO1xuICAgIH1cbiAgICBlbHNlICAvLyBkb3duXG4gICAge1xuICAgICAgdGhpcy54TW92ZW1lbnREaXIgPSAgMC4wO1xuICAgICAgdGhpcy55TW92ZW1lbnREaXIgPSAgMS4wO1xuICAgIH1cbiAgICB0aGlzLnNsaWRlVmFsdWUgPSAwO1xuICAgIHRoaXMuaXNNb3ZpbmcgPSB0cnVlO1xuICB9XG5cbiAgLy8gUHV0cyB0aGUgcGllY2UgaW4gYSBuZXcgYW5pbWF0aW9uIHN0YXRlXG4gIC8vIChJIHdhcyBnb2luZyB0byB1c2UgYSB0eXBlc2NyaXB0IGFjY2Vzc29yLCBidXQgbm90IHN1cHBvcnRlZCBieSB0aGlzIGNvbXBpbGVyKVxuICBzZXRTdGF0ZShzdGF0ZTpzdHJpbmcpIHtcbiAgICBpZiAodGhpcy5fc3RhdGUgPT0gc3RhdGUgfHwgdGhpcy5fc3RhdGUgPT0gXCJpbmFjdGl2ZVwiKSB7XG4gICAgICAvLyBOb3RoaW5nIGhhcHBlbnMgaWYgd2UncmUgYWxyZWFkeSBpbiByZXF1ZXN0ZWQgc3RhdGUgb3IgaWYgY2hhcmFjdGVyXG4gICAgICAvLyBpcyBpbmFjdGl2ZVxuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBjb25zb2xlLmxvZyhcInN0YXRlIHRvIFwiICsgc3RhdGUpO1xuICAgIHRoaXMuX3N0YXRlID0gc3RhdGU7XG4gICAgaWYgKHN0YXRlID09IFwiZnJvemVuXCIpIHtcbiAgICAgIHRoaXMuZWZmZWN0U2xpZGVyID0gMDtcbiAgICB9XG4gICAgZWxzZSBpZiAoc3RhdGUgPT0gXCJkeWluZ1wiKSB7XG4gICAgICB0aGlzLmVmZmVjdFNsaWRlciA9IDE7XG4gICAgfVxuICAgIGVsc2UgaWYgKHN0YXRlID09IFwiZXhwbG9kZVwiKSB7XG4gICAgICB0aGlzLmVmZmVjdFNsaWRlciA9IDE7XG4gICAgfVxuICAgIGVsc2UgaWYgKHN0YXRlID09IFwiaW5hY3RpdmVcIikge1xuICAgICAgdGhpcy5zcHJpdGUuYWxwaGEgPSAwO1xuICAgICAgdGhpcy5pc01vdmluZyA9IGZhbHNlO1xuICAgICAgdGhpcy5pc09uR3JpZCA9IHRydWU7XG4gICAgfVxuICB9XG5cbiAgLy8gQWNjZXNzb3JzIGFuZCBzZXR0ZXJzIGFyZSBnb29kIDopXG4gIGdldFN0YXRlKCkge1xuICAgIHJldHVybiB0aGlzLl9zdGF0ZTtcbiAgfVxuXG4gIC8vIFVwZGF0ZSBmdW5jdGlvbiBjYWxsZWQgcGVyaW9kaWNhbGx5LiBkZWx0YVQgaXMgdGltZSBpbiBzZWNvbmRzIHNpbmNlIGxhc3RcbiAgLy8gY2FsbC5cbiAgdXBkYXRlKGRlbHRhVCkge1xuICAgIGlmICh0aGlzLl9zdGF0ZSA9PSBcImFjdGl2ZVwiKSB7XG4gICAgICB0aGlzLnNwcml0ZS54ID0gY2VsbERpbSAqICh0aGlzLmNlbGxJbmRleFJpZ2h0ICsgMC41ICsgdGhpcy54TW92ZW1lbnREaXIgKiB0aGlzLnNsaWRlVmFsdWUpO1xuICAgICAgdGhpcy5zcHJpdGUueSA9IGNlbGxEaW0gKiAodGhpcy5jZWxsSW5kZXhEb3duICsgMC41ICsgdGhpcy55TW92ZW1lbnREaXIgKiB0aGlzLnNsaWRlVmFsdWUpO1xuICAgICAgaWYgKHRoaXMuaXNNb3ZpbmcpIHtcbiAgICAgICAgLy8gaXQgdGFrZXMgbW92ZVRpbWUgc2Vjb25kcyB0byBtb3ZlIG9uZSBzcXVhcmVcbiAgICAgICAgdGhpcy5zbGlkZVZhbHVlID0gdGhpcy5zbGlkZVZhbHVlICsgZGVsdGFUIC8gdGhpcy5tb3ZlVGltZTtcbiAgICAgICAgaWYgKHRoaXMuc2xpZGVWYWx1ZSA+IDEuMClcbiAgICAgICAge1xuICAgICAgICAgIC8vIFdlJ3ZlIGFycml2ZWRcbiAgICAgICAgICB0aGlzLmNlbGxJbmRleFJpZ2h0ID0gdGhpcy5jZWxsSW5kZXhSaWdodCArIHRoaXMueE1vdmVtZW50RGlyO1xuICAgICAgICAgIHRoaXMuY2VsbEluZGV4RG93biA9IHRoaXMuY2VsbEluZGV4RG93biArIHRoaXMueU1vdmVtZW50RGlyO1xuICAgICAgICAgIHRoaXMuc2xpZGVWYWx1ZSA9IDA7XG4gICAgICAgICAgdGhpcy54TW92ZW1lbnREaXIgPSAwLjA7XG4gICAgICAgICAgdGhpcy55TW92ZW1lbnREaXIgPSAwLjA7XG4gICAgICAgICAgdGhpcy5pc01vdmluZyA9IGZhbHNlO1xuICAgICAgICAgIHRoaXMub25Jbml0aWFsQ2VsbCA9IGZhbHNlO1xuICAgICAgICAgIHRoaXMucmVzdFRpbWVyID0gdGhpcy5tb3ZlVGltZTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgZWxzZSBpZiAodGhpcy5yZXN0VGltZXIgPiAwKVxuICAgICAge1xuICAgICAgICAvLyBQaWVjZSBpcyByZXN0aW5nIGFmdGVyIGNvbXBsZXRpbmcgbW92ZVxuICAgICAgICB0aGlzLnJlc3RUaW1lciA9IHRoaXMucmVzdFRpbWVyIC0gZGVsdGFUO1xuICAgICAgICBpZiAodGhpcy5yZXN0VGltZXIgPCAwKSB7XG4gICAgICAgICAgdGhpcy5yZXN0VGltZXIgPSAwO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSAvLyBlbmQgaWYgYWN0aXZlIHN0YXRlXG4gICAgZWxzZSBpZiAodGhpcy5fc3RhdGUgPT0gXCJmcm96ZW5cIikge1xuICAgICAgLy8gc2luZSB3YXZlIGFscGhhIGVmZmVjdFxuICAgICAgdGhpcy5zcHJpdGUuYWxwaGEgPSAwLjUgKyAwLjUgKiBNYXRoLmNvcyh0aGlzLmVmZmVjdFNsaWRlcik7XG4gICAgICB0aGlzLmVmZmVjdFNsaWRlciA9IHRoaXMuZWZmZWN0U2xpZGVyICsgZGVsdGFUICogNDtcbiAgICB9XG4gICAgZWxzZSBpZiAodGhpcy5fc3RhdGUgPT0gXCJkeWluZ1wiKSB7XG4gICAgICAvLyBmYWRlIGFuZCBzaHJpbmsgZWZmZWN0XG4gICAgICB0aGlzLnNwcml0ZS5hbHBoYSA9IHRoaXMuZWZmZWN0U2xpZGVyO1xuICAgICAgdGhpcy5zcHJpdGUud2lkdGggPSBjZWxsRGltICogKDAuNSArIHRoaXMuZWZmZWN0U2xpZGVyIC8gMik7XG4gICAgICB0aGlzLnNwcml0ZS5oZWlnaHQgPSBjZWxsRGltICogKDAuNSArIHRoaXMuZWZmZWN0U2xpZGVyIC8gMik7XG4gICAgICB0aGlzLmVmZmVjdFNsaWRlciA9IHRoaXMuZWZmZWN0U2xpZGVyIC0gZGVsdGFUIC8gKHRoaXMubW92ZVRpbWUgKiA0LjApO1xuICAgICAgaWYgKHRoaXMuZWZmZWN0U2xpZGVyIDw9IDAuMCkge1xuICAgICAgICB0aGlzLnNldFN0YXRlKFwiaW5hY3RpdmVcIik7XG4gICAgICB9XG4gICAgfVxuICAgIGVsc2UgaWYgKHRoaXMuX3N0YXRlID09IFwiZXhwbG9kZVwiKSB7XG4gICAgICAvLyBidXJzdCBhbmQgZmFkZSBlZmZlY3RcbiAgICAgIHRoaXMuc3ByaXRlLmFscGhhID0gdGhpcy5lZmZlY3RTbGlkZXI7XG4gICAgICB0aGlzLnNwcml0ZS53aWR0aCA9IGNlbGxEaW0gKiAoMS4wICsgKDMuMCAtIHRoaXMuZWZmZWN0U2xpZGVyICogMy4wKSk7XG4gICAgICB0aGlzLnNwcml0ZS5oZWlnaHQgPSBjZWxsRGltICogKDEuMCArICgzLjAgLSB0aGlzLmVmZmVjdFNsaWRlciAqIDMuMCkpO1xuICAgICAgdGhpcy5lZmZlY3RTbGlkZXIgPSB0aGlzLmVmZmVjdFNsaWRlciAtIGRlbHRhVCAvICh0aGlzLm1vdmVUaW1lICogNC4wKTtcbiAgICAgIGlmICh0aGlzLmVmZmVjdFNsaWRlciA8PSAwLjApIHtcbiAgICAgICAgdGhpcy5lZmZlY3RTbGlkZXIgPSAxOyAvLyBrZWVwIGV4cGxvZGluZyBmb3JldmVyXG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgLy8gUHV0cyB0aGlzIGNoYXJhY3RlciBpbnRvIG9yIG91dCBvZiBwYXVzZWQgc3RhdGVcbiAgc2V0UGF1c2VkKHZhbDpib29sZWFuKSB7XG4gICAgaWYgKHRoaXMucGF1c2VkID09IHZhbCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHRoaXMucGF1c2VkID0gdmFsO1xuICAgIGlmICh2YWwpIHtcbiAgICAgIHRoaXMuZWZmZWN0U2xpZGVyID0gMDtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICB0aGlzLnNwcml0ZS5hbHBoYSA9IDE7XG4gICAgfVxuICB9XG5cbiAgLy8gVXBkYXRlIGZ1bmN0aW9uIGNhbGxlZCB3aGlsZSBjaGFyYWN0ZXIgaXMgcGF1c2VkXG4gIHVwZGF0ZVBhdXNlZChkZWx0YVQpIHtcbiAgICAvLyBzaW5lIHdhdmUgYWxwaGEgZWZmZWN0XG4gICAgdGhpcy5zcHJpdGUuYWxwaGEgPSAwLjUgKyAwLjUgKiBNYXRoLmNvcyh0aGlzLmVmZmVjdFNsaWRlcik7XG4gICAgdGhpcy5lZmZlY3RTbGlkZXIgPSB0aGlzLmVmZmVjdFNsaWRlciArIGRlbHRhVCAqIDQ7XG4gIH1cbn1cblxuLypcbiAgLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgUmVwcmVzZW50cyB0aGUgZ2FtZSBhdCB0aGUgaGlnaGVzdCBsZXZlbC4gTWFuYWdlcyBVSSBmZWF0dXJlcywgYW4gQXJyb3dHcmlkXG4gIGluc3RhbmNlLCBhbmQgdGhlIGdhbWUgcGllY2VzLlxuICAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuKi9cbmNsYXNzIFRoZUdhbWUge1xuICB0aGVHcmlkOkFycm93R3JpZDtcblxuICBjaGVja2VyQ2hhcmFjdGVyOkdyaWRDaGFyYWN0ZXI7XG4gIGNoZWNrTWFya0NoYXJhY3RlcjpHcmlkQ2hhcmFjdGVyO1xuXG4gIGluZm9UZXh0OlBJWEkuVGV4dDtcbiAgcmVzZXRUZXh0OlBJWEkuVGV4dDtcbiAgcmVzaHVmZmxlVGV4dDpQSVhJLlRleHQ7XG4gIHBhdXNlVGV4dDpQSVhJLlRleHQ7XG5cbiAgZ2FtZVN0YXRlOnN0cmluZzsgLy8gXCJyZWFkeVwiLCBcImluIHByb2dyZXNzXCIsIG9yIFwiZG9uZVwiXG4gIHBhdXNlZDpib29sZWFuO1xuXG4gIGNvbnN0cnVjdG9yKCkge1xuICAgIHRoaXMudGhlR3JpZCA9IG5ldyBBcnJvd0dyaWQoMTAsIDEwKTtcblxuICAgIC8vIGNyZWF0ZSBhIHRleHQgb2JqZWN0IHdpdGggYSBuaWNlIHN0cm9rZVxuICAgIHRoaXMuaW5mb1RleHQgPSBuZXcgUElYSS5UZXh0KCdQbGFjZSBwaWVjZSBvbiBib2FyZCcsIHsgZm9udDogJ2JvbGQgMzZweCBBcmlhbCcsIGZpbGw6ICcjZmZmZjAwJywgYWxpZ246ICdsZWZ0Jywgc3Ryb2tlOiAnIzAwMDBGRicsIHN0cm9rZVRoaWNrbmVzczogNCB9KTtcbiAgICB0aGlzLmluZm9UZXh0LnBvc2l0aW9uLnggPSB0aGlzLnRoZUdyaWQuY29udGFpbmVyLnggKyBjZWxsRGltICogKHRoaXMudGhlR3JpZC5kaW1YICsgMSk7XG4gICAgdGhpcy5pbmZvVGV4dC5wb3NpdGlvbi55ID0gdGhpcy50aGVHcmlkLmNvbnRhaW5lci55ICsgY2VsbERpbTtcbiAgICBzdGFnZS5hZGRDaGlsZCh0aGlzLmluZm9UZXh0KTtcblxuICAgIGxldCBjdXJyZW50R2FtZTpUaGVHYW1lID0gdGhpcztcbiAgICB0aGlzLnJlc2V0VGV4dCA9IG5ldyBQSVhJLlRleHQoJ1Jlc2V0JywgeyBmb250OiAnYm9sZCAzMHB4IEFyaWFsJywgZmlsbDogJyMwMDAwZmYnLCBhbGlnbjogJ2xlZnQnLCBzdHJva2U6ICcjRkYwMEZGJywgc3Ryb2tlVGhpY2tuZXNzOiA0IH0pO1xuICAgIHRoaXMucmVzZXRUZXh0LnBvc2l0aW9uLnggPSB0aGlzLnRoZUdyaWQuY29udGFpbmVyLnggKyBjZWxsRGltICogKHRoaXMudGhlR3JpZC5kaW1YICsgMSk7XG4gICAgdGhpcy5yZXNldFRleHQucG9zaXRpb24ueSA9IHRoaXMudGhlR3JpZC5jb250YWluZXIueSArIGNlbGxEaW0gKiAodGhpcy50aGVHcmlkLmRpbVkgLSAzKTtcbiAgICBzdGFnZS5hZGRDaGlsZCh0aGlzLnJlc2V0VGV4dCk7XG4gICAgdGhpcy5yZXNldFRleHQuYnV0dG9uTW9kZSA9IHRydWU7XG4gICAgdGhpcy5yZXNldFRleHQuaW50ZXJhY3RpdmUgPSB0cnVlO1xuICAgIHRoaXMucmVzZXRUZXh0Lm9uKCdtb3VzZWRvd24nLCBmdW5jdGlvbigpIHtcbiAgICAgIGN1cnJlbnRHYW1lLmhhbmRsZVJlc2V0UHJlc3NlZCgpO1xuICAgIH0pO1xuICAgIHRoaXMucmVzZXRUZXh0LnZpc2libGUgPSBmYWxzZTtcblxuICAgIHRoaXMucmVzaHVmZmxlVGV4dCA9IG5ldyBQSVhJLlRleHQoJ1Jlc2h1ZmZsZScsIHsgZm9udDogJ2JvbGQgMzBweCBBcmlhbCcsIGZpbGw6ICcjMDAwMGZmJywgYWxpZ246ICdsZWZ0Jywgc3Ryb2tlOiAnI0ZGMDBGRicsIHN0cm9rZVRoaWNrbmVzczogNCB9KTtcbiAgICB0aGlzLnJlc2h1ZmZsZVRleHQucG9zaXRpb24ueCA9IHRoaXMudGhlR3JpZC5jb250YWluZXIueCArIGNlbGxEaW0gKiAodGhpcy50aGVHcmlkLmRpbVggKyAxKTtcbiAgICB0aGlzLnJlc2h1ZmZsZVRleHQucG9zaXRpb24ueSA9IHRoaXMudGhlR3JpZC5jb250YWluZXIueSArIGNlbGxEaW0gKiAodGhpcy50aGVHcmlkLmRpbVkgLSAyKTtcbiAgICBzdGFnZS5hZGRDaGlsZCh0aGlzLnJlc2h1ZmZsZVRleHQpO1xuICAgIHRoaXMucmVzaHVmZmxlVGV4dC5idXR0b25Nb2RlID0gdHJ1ZTtcbiAgICB0aGlzLnJlc2h1ZmZsZVRleHQuaW50ZXJhY3RpdmUgPSB0cnVlO1xuICAgIHRoaXMucmVzaHVmZmxlVGV4dC5vbignbW91c2Vkb3duJywgZnVuY3Rpb24oKSB7XG4gICAgICBjdXJyZW50R2FtZS5oYW5kbGVSZXNodWZmbGVQcmVzc2VkKCk7XG4gICAgfSk7XG5cbiAgICB0aGlzLnBhdXNlVGV4dCA9IG5ldyBQSVhJLlRleHQoJ1BhdXNlJywgeyBmb250OiAnYm9sZCAzMHB4IEFyaWFsJywgZmlsbDogJyMwMDAwZmYnLCBhbGlnbjogJ2xlZnQnLCBzdHJva2U6ICcjRkYwMEZGJywgc3Ryb2tlVGhpY2tuZXNzOiA0IH0pO1xuICAgIHRoaXMucGF1c2VUZXh0LnBvc2l0aW9uLnggPSB0aGlzLnRoZUdyaWQuY29udGFpbmVyLnggKyBjZWxsRGltICogKHRoaXMudGhlR3JpZC5kaW1YICsgMSk7XG4gICAgdGhpcy5wYXVzZVRleHQucG9zaXRpb24ueSA9IHRoaXMudGhlR3JpZC5jb250YWluZXIueSArIGNlbGxEaW0gKiAodGhpcy50aGVHcmlkLmRpbVkgLSAxKTtcbiAgICBzdGFnZS5hZGRDaGlsZCh0aGlzLnBhdXNlVGV4dCk7XG4gICAgdGhpcy5wYXVzZVRleHQuYnV0dG9uTW9kZSA9IHRydWU7XG4gICAgdGhpcy5wYXVzZVRleHQuaW50ZXJhY3RpdmUgPSB0cnVlO1xuICAgIHRoaXMucGF1c2VUZXh0Lm9uKCdtb3VzZWRvd24nLCBmdW5jdGlvbigpIHtcbiAgICAgIGN1cnJlbnRHYW1lLmhhbmRsZVBhdXNlUHJlc3NlZCgpO1xuICAgIH0pO1xuICAgIHRoaXMucGF1c2VUZXh0LnZpc2libGUgPSBmYWxzZTtcblxuICAgIC8vIEluaXRpYWxpemUgY2hhcmFjdGVyc1xuICAgIHRoaXMuY2hlY2tlckNoYXJhY3RlciA9IG5ldyBHcmlkQ2hhcmFjdGVyKCdpbWFnZXMvcmVkLWNoZWNrZXIucG5nJywgdGhpcy50aGVHcmlkLmNvbnRhaW5lcik7XG4gICAgdGhpcy5jaGVja2VyQ2hhcmFjdGVyLm1vdmVUaW1lID0gMC41O1xuICAgIHRoaXMuY2hlY2tNYXJrQ2hhcmFjdGVyID0gbmV3IEdyaWRDaGFyYWN0ZXIoJ2ltYWdlcy9ncmVlbi1jaGVjay1tYXJrLnBuZycsIHRoaXMudGhlR3JpZC5jb250YWluZXIpO1xuICAgIHRoaXMuY2hlY2tNYXJrQ2hhcmFjdGVyLm1vdmVUaW1lID0gMC4yNTtcblxuICAgIHRoaXMuZ2FtZVN0YXRlID0gXCJyZWFkeVwiO1xuICAgIHRoaXMucGF1c2VkID0gZmFsc2U7XG4gIH1cblxuICAvLyBNYWluIHVwZGF0ZSBmdW5jdGlvbi4gZGVsdGFUIGlzIHNlY29uZHMgZWxhcHNlZCBzaW5jZSBsYXN0IGNhbGwuXG4gIHVwZGF0ZShkZWx0YVQ6bnVtYmVyKSB7XG4gICAgbGV0IGNoYXJhY3RlcnM6R3JpZENoYXJhY3RlcltdID0gW3RoaXMuY2hlY2tlckNoYXJhY3RlciwgdGhpcy5jaGVja01hcmtDaGFyYWN0ZXJdO1xuXG4gICAgaWYgKHRoaXMucGF1c2VkKSB7XG4gICAgICBmb3IgKGxldCBjaGFyIG9mIGNoYXJhY3RlcnMpIHtcbiAgICAgICAgY2hhci51cGRhdGVQYXVzZWQoZGVsdGFUKTtcbiAgICAgIH1cbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBmb3IgKGxldCBjaGFyIG9mIGNoYXJhY3RlcnMpIHtcbiAgICAgIGNoYXIudXBkYXRlKGRlbHRhVCk7XG4gICAgICBpZiAoY2hhci5yZWFkeVRvTW92ZSgpKSB7XG4gICAgICAgIC8vIEhhcyBjaGFyYWN0ZXIgZmFsbGVuIG9mZiBncmlkP1xuICAgICAgICBpZiAoY2hhci5jZWxsSW5kZXhEb3duIDwgMCB8fCBjaGFyLmNlbGxJbmRleERvd24gPj0gdGhpcy50aGVHcmlkLmRpbVkgfHxcbiAgICAgICAgICBjaGFyLmNlbGxJbmRleFJpZ2h0IDwgMCB8fCBjaGFyLmNlbGxJbmRleFJpZ2h0ID49IHRoaXMudGhlR3JpZC5kaW1YKSB7XG4gICAgICAgICAgY2hhci5pc09uR3JpZCA9IGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIGVsc2VcbiAgICAgICAge1xuICAgICAgICAgIC8vIENoYXJhY3RlciBpcyBzdGlsbCBvbiBib2FyZFxuICAgICAgICAgIGxldCBjZWxsOkdyaWRDZWxsID0gdGhpcy50aGVHcmlkLmdldENlbGwoY2hhci5jZWxsSW5kZXhSaWdodCwgY2hhci5jZWxsSW5kZXhEb3duKTtcbiAgICAgICAgICBjZWxsLnNldFZpc2l0ZWQodHJ1ZSk7XG4gICAgICAgICAgY2hhci5yZXF1ZXN0TmV3TW92ZShjZWxsLmRpcmVjdGlvbik7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9IC8vIGVuZCBmb3JcblxuICAgIGlmICghdGhpcy5jaGVja2VyQ2hhcmFjdGVyLmlzT25HcmlkKSB7XG4gICAgICAvLyBzbG93ZXItbW92aW5nIHBpZWNlIGhhcyBsZWZ0IHRoZSBib2FyZFxuICAgICAgdGhpcy5jaGVja2VyQ2hhcmFjdGVyLnNldFN0YXRlKFwiZnJvemVuXCIpO1xuICAgIH1cbiAgICBpZiAoIXRoaXMuY2hlY2tNYXJrQ2hhcmFjdGVyLmlzT25HcmlkKSB7XG4gICAgICAvLyBmYXN0ZXItbW92aW5nIHBpZWNlIGhhcyBsZWZ0IHRoZSBib2FyZFxuICAgICAgdGhpcy5jaGVja01hcmtDaGFyYWN0ZXIuc2V0U3RhdGUoXCJkeWluZ1wiKTtcbiAgICAgIHRoaXMuY2hlY2tlckNoYXJhY3Rlci5zZXRTdGF0ZShcImZyb3plblwiKTtcbiAgICAgIHRoaXMuaW5mb1RleHQudGV4dCA9IFwiTm8gTG9vcFwiO1xuICAgICAgdGhpcy5nYW1lU3RhdGUgPSBcImRvbmVcIjtcbiAgICAgIHRoaXMucmVzZXRUZXh0LnZpc2libGUgPSB0cnVlO1xuICAgICAgdGhpcy5yZXNodWZmbGVUZXh0LnZpc2libGUgPSB0cnVlO1xuICAgICAgdGhpcy5wYXVzZVRleHQudmlzaWJsZSA9IGZhbHNlO1xuICAgIH1cbiAgICAvLyBBcmUgYm90aCBwaWVjZXMgb24gdGhlIHNhbWUgc3F1YXJlPyBJZiBzbywgdGhlIGZhc3Rlci1tb3Zpbmcgb25lIGhhcyBjYXVnaHQgdXAgd2l0aFxuICAgIC8vIHRoZSBzbG93ZXIuXG4gICAgZWxzZSBpZiAoY2hhcmFjdGVyc1swXS50ZXN0Q29sbGlzaW9uKGNoYXJhY3RlcnNbMV0pKSB7XG4gICAgICAgIC8vIFdlJ3ZlIGNhdWdodCB1cFxuICAgICAgICB0aGlzLmNoZWNrZXJDaGFyYWN0ZXIuc2V0U3RhdGUoXCJmcm96ZW5cIik7XG4gICAgICAgIHRoaXMuY2hlY2tNYXJrQ2hhcmFjdGVyLnNldFN0YXRlKFwiZXhwbG9kZVwiKTtcbiAgICAgICAgdGhpcy5pbmZvVGV4dC50ZXh0ID0gXCJMb29wIERldGVjdGVkIVwiXG4gICAgICAgIHRoaXMuZ2FtZVN0YXRlID0gXCJkb25lXCI7XG4gICAgICAgIHRoaXMucmVzZXRUZXh0LnZpc2libGUgPSB0cnVlO1xuICAgICAgICB0aGlzLnJlc2h1ZmZsZVRleHQudmlzaWJsZSA9IHRydWU7XG4gICAgICAgIHRoaXMucGF1c2VUZXh0LnZpc2libGUgPSBmYWxzZTtcbiAgICB9XG4gIH1cblxuICAvLyBDYWxsZWQgd2hlbiB1c2VyIGNsaWNrcyBvbiBhbiBhcnJvdyBjZWxsXG4gIGhhbmRsZUNlbGxQcmVzcyhwaXhYOm51bWJlciwgcGl4WTpudW1iZXIpIHtcbiAgICBsZXQgY2VsbFggPSBNYXRoLmZsb29yKHBpeFggLyBjZWxsRGltKTtcbiAgICBsZXQgY2VsbFkgPSBNYXRoLmZsb29yKHBpeFkgLyBjZWxsRGltKTtcbiAgICBpZiAodGhpcy5jaGVja2VyQ2hhcmFjdGVyLmdldFN0YXRlKCkgPT0gXCJpbmFjdGl2ZVwiKSB7XG4gICAgICB0aGlzLmNoZWNrZXJDaGFyYWN0ZXIuc2V0UG9zaXRpb24oY2VsbFgsIGNlbGxZKTtcbiAgICAgIHRoaXMuY2hlY2tNYXJrQ2hhcmFjdGVyLnNldFBvc2l0aW9uKGNlbGxYLCBjZWxsWSk7XG4gICAgICB0aGlzLmluZm9UZXh0LnRleHQgPSBcIlRyYXZlbGluZy4uLlwiXG4gICAgICB0aGlzLmdhbWVTdGF0ZSA9IFwiaW4gcHJvZ3Jlc3NcIjtcbiAgICAgIHRoaXMucmVzZXRUZXh0LnZpc2libGUgPSBmYWxzZTtcbiAgICAgIHRoaXMucmVzaHVmZmxlVGV4dC52aXNpYmxlID0gZmFsc2U7XG4gICAgICB0aGlzLnBhdXNlVGV4dC52aXNpYmxlID0gdHJ1ZTtcbiAgICB9XG4gICAgY29uc29sZS5sb2coXCJidXR0b24gY2VsbDogXCIgKyBjZWxsWCArIFwiLFwiICsgY2VsbFkpO1xuICB9XG5cbiAgaGFuZGxlQ2VsbE92ZXIocGl4WDpudW1iZXIsIHBpeFk6bnVtYmVyKSB7XG4gICAgbGV0IGNlbGxYID0gTWF0aC5mbG9vcihwaXhYIC8gY2VsbERpbSk7XG4gICAgbGV0IGNlbGxZID0gTWF0aC5mbG9vcihwaXhZIC8gY2VsbERpbSk7XG4gICAgbGV0IGNlbGw6R3JpZENlbGwgPSB0aGlzLnRoZUdyaWQuZ2V0Q2VsbChjZWxsWCwgY2VsbFkpO1xuICAgIGNlbGwuc2V0SGlnaGxpZ2h0KHRydWUpO1xuICB9XG5cbiAgaGFuZGxlQ2VsbE91dChwaXhYOm51bWJlciwgcGl4WTpudW1iZXIpIHtcbiAgICBsZXQgY2VsbFggPSBNYXRoLmZsb29yKHBpeFggLyBjZWxsRGltKTtcbiAgICBsZXQgY2VsbFkgPSBNYXRoLmZsb29yKHBpeFkgLyBjZWxsRGltKTtcbiAgICBsZXQgY2VsbDpHcmlkQ2VsbCA9IHRoaXMudGhlR3JpZC5nZXRDZWxsKGNlbGxYLCBjZWxsWSk7XG4gICAgY2VsbC5zZXRIaWdobGlnaHQoZmFsc2UpO1xuICB9XG5cbiAgaGFuZGxlUmVzZXRQcmVzc2VkKCkge1xuICAgIHRoaXMudGhlR3JpZC5yZXNldEFycm93cygpO1xuICAgIHRoaXMuY2hlY2tlckNoYXJhY3Rlci5zZXRTdGF0ZShcImluYWN0aXZlXCIpO1xuICAgIHRoaXMuY2hlY2tNYXJrQ2hhcmFjdGVyLnNldFN0YXRlKFwiaW5hY3RpdmVcIik7XG4gICAgdGhpcy5pbmZvVGV4dC50ZXh0ID0gXCJQbGFjZSBwaWVjZSBvbiBib2FyZFwiO1xuICAgIHRoaXMuZ2FtZVN0YXRlID0gXCJyZWFkeVwiO1xuICB9XG5cbiAgaGFuZGxlUmVzaHVmZmxlUHJlc3NlZCgpIHtcbiAgICB0aGlzLnRoZUdyaWQucmVzaHVmZmxlQXJyb3dzKCk7XG4gICAgdGhpcy5jaGVja2VyQ2hhcmFjdGVyLnNldFN0YXRlKFwiaW5hY3RpdmVcIik7XG4gICAgdGhpcy5jaGVja01hcmtDaGFyYWN0ZXIuc2V0U3RhdGUoXCJpbmFjdGl2ZVwiKTtcbiAgICB0aGlzLmluZm9UZXh0LnRleHQgPSBcIlBsYWNlIHBpZWNlIG9uIGJvYXJkXCI7XG4gICAgdGhpcy5nYW1lU3RhdGUgPSBcInJlYWR5XCI7XG4gIH1cblxuICBoYW5kbGVQYXVzZVByZXNzZWQoKSB7XG4gICAgbGV0IHBhdXNlZFN0YXRlOmJvb2xlYW4gPSAhdGhpcy5wYXVzZWQ7XG5cbiAgICBpZiAocGF1c2VkU3RhdGUpIHtcbiAgICAgIHRoaXMucGF1c2VUZXh0LnRleHQgPSBcIlVucGF1c2VcIjtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICB0aGlzLnBhdXNlVGV4dC50ZXh0ID0gXCJQYXVzZVwiO1xuICAgIH1cbiAgICB0aGlzLmNoZWNrZXJDaGFyYWN0ZXIuc2V0UGF1c2VkKHBhdXNlZFN0YXRlKTtcbiAgICB0aGlzLmNoZWNrTWFya0NoYXJhY3Rlci5zZXRQYXVzZWQocGF1c2VkU3RhdGUpO1xuICAgIHRoaXMucGF1c2VkID0gcGF1c2VkU3RhdGU7XG4gIH1cbn1cblxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8vIEdsb2JhbCB2YXJzIGFuZCBiYXNpYyBzZXR1cFxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuLy8gR3JhcGhpY2FsIGNvbnRhaW5lclxuXG4vLyBjcmVhdGUgdGhlIHJvb3Qgb2YgdGhlIHNjZW5lIGdyYXBoXG52YXIgc3RhZ2UgPSBuZXcgUElYSS5Db250YWluZXIoKTtcblxuLy8gQXJyYXkgYW5kIGRpbWVuc2lvbnMgZm9yIHRoZSBncmlkXG5sZXQgY2VsbERpbTpudW1iZXIgPSA1MDtcblxubGV0IGdhbWVJbnN0YW5jZTpUaGVHYW1lO1xuXG5kb1NldHVwKCk7XG5cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLyBGdW5jdGlvbiBkZWZpbml0aW9uc1xuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuLy8gVGhlcmUncyBwcm9iYWJseSBhIGxlc3MgYXdrd2FyZCB3YXkgdG8gZG8gdGhlc2UgYnV0dG9uIGZ1bmN0aW9ucywgYnV0IG91dHRhIHRpbWUuXG4vLyBUaGV5IHJlc3BvbmQgdG8gaW50ZXJhY3Rpb25zIHdpdGggaW5kaXZpZHVhbCBhcnJvd3MgYW5kIHBhc3MgdGhlIGNhbGwgb24gdG9cbi8vIHRoZSBhcnJvdyBncmlkLlxuXG5mdW5jdGlvbiBvbkJ1dHRvbkRvd24oKVxue1xuICBnYW1lSW5zdGFuY2UuaGFuZGxlQ2VsbFByZXNzKHRoaXMueCwgdGhpcy55KTtcbn1cblxuZnVuY3Rpb24gb25CdXR0b25PdmVyKClcbntcbiAgZ2FtZUluc3RhbmNlLmhhbmRsZUNlbGxPdmVyKHRoaXMueCwgdGhpcy55KTtcbn1cblxuZnVuY3Rpb24gb25CdXR0b25PdXQoKVxue1xuICBnYW1lSW5zdGFuY2UuaGFuZGxlQ2VsbE91dCh0aGlzLngsIHRoaXMueSk7XG59XG5cbmZ1bmN0aW9uIHVwZGF0ZSgpIHtcbiAgICBnYW1lSW5zdGFuY2UudXBkYXRlKDAuMDEpOyAvLyBhZHZhbmNlIGNsb2NrIGJ5IDEvMTAwdGggb2YgYSBzZWNvbmRcbn1cblxuZnVuY3Rpb24gZG9TZXR1cCgpIHtcbiAgLy9jcmVhdGVHcmlkKCk7XG4gIGNvbnNvbGUubG9nKFwiVGVzdFwiKTtcbiAgZ2FtZUluc3RhbmNlID0gbmV3IFRoZUdhbWUoKTtcbiAgLy8gQSBmdW5jdGlvbiB0aGF0IHVwZGF0ZXMgYSBodW5kcmVkIHRpbWVzIGEgc2Vjb25kXG4gIHNldEludGVydmFsKHVwZGF0ZSwgMTApO1xuICBhbmltYXRlKCk7XG59XG5cbmZ1bmN0aW9uIGFuaW1hdGUoKSB7XG5cbiAgICByZXF1ZXN0QW5pbWF0aW9uRnJhbWUoYW5pbWF0ZSk7XG5cbiAgICAvLyByZW5kZXIgdGhlIHJvb3QgY29udGFpbmVyXG4gICAgcmVuZGVyZXIucmVuZGVyKHN0YWdlKTtcbn1cbiJdfQ==
