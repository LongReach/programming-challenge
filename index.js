(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.jiboProgrammingChallenge = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
"use strict";
var gridFile = require('./grid');
var PIXI = require('pixi.js');
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
exports.GridCharacter = GridCharacter;
/*
  --------------------------------------------
  Represents the game at the highest level. Manages UI features, an ArrowGrid
  instance, and the game pieces.
  --------------------------------------------
*/
var TheGame = (function () {
    function TheGame(stage) {
        this.theGrid = new gridFile.ArrowGrid(10, 10, stage);
        var gameInstance = this;
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
exports.TheGame = TheGame;
},{"./grid":2,"pixi.js":undefined}],2:[function(require,module,exports){
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvZ2FtZS50cyIsInNyYy9ncmlkLnRzIiwic3JjL2luZGV4LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOztBQ0FBLElBQU8sUUFBUSxXQUFXLFFBQVEsQ0FBQyxDQUFDO0FBQ3BDLElBQU8sSUFBSSxXQUFXLFNBQVMsQ0FBQyxDQUFDO0FBRWpDLElBQUksT0FBTyxHQUFVLEVBQUUsQ0FBQztBQUV4Qjs7Ozs7O0VBTUU7QUFDRjtJQW9CRSx1QkFBWSxJQUFXLEVBQUUsU0FBd0I7UUFDL0MsSUFBSSxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUMxQyxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssR0FBRyxPQUFPLENBQUM7UUFDNUIsSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLEdBQUcsT0FBTyxDQUFDO1FBQzdCLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsR0FBRyxHQUFHLENBQUM7UUFDM0IsSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBQztRQUMzQixJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssR0FBRyxDQUFDLENBQUM7UUFDdEIsU0FBUyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7UUFFaEMsSUFBSSxDQUFDLFlBQVksR0FBRyxDQUFDLENBQUM7UUFDdEIsSUFBSSxDQUFDLFlBQVksR0FBRyxDQUFDLENBQUM7UUFDdEIsSUFBSSxDQUFDLFFBQVEsR0FBRyxLQUFLLENBQUM7UUFDdEIsSUFBSSxDQUFDLFFBQVEsR0FBRyxJQUFJLENBQUM7UUFDckIsSUFBSSxDQUFDLE1BQU0sR0FBRyxLQUFLLENBQUM7UUFDcEIsSUFBSSxDQUFDLFNBQVMsR0FBRyxDQUFDLENBQUM7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LE9BQU8sRUFBRSxDQUFDO0FBQ1osQ0FBQztBQUVEO0lBRUkscUJBQXFCLENBQUMsT0FBTyxDQUFDLENBQUM7SUFFL0IsNEJBQTRCO0lBQzVCLFFBQVEsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUM7QUFDM0IsQ0FBQyIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJpbXBvcnQgZ3JpZEZpbGUgPSByZXF1aXJlKCcuL2dyaWQnKTtcclxuaW1wb3J0IFBJWEkgPSByZXF1aXJlKCdwaXhpLmpzJyk7XHJcblxyXG5sZXQgY2VsbERpbTpudW1iZXIgPSA1MDtcclxuXHJcbi8qXHJcbiAgLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuICBSZXByZXNlbnRzIGEgZ2FtZSBwaWVjZS4gQSBwaWVjZSBjYW4gb2NjdXB5IGEgY2VsbCBhbmQgdHJhbnNpdGlvbiBpbiBhXHJcbiAgdmlkZW9nYW1lLXkgbWFubmVyIGJldHdlZW4gY2VsbHMuIEl0IGFsc28gaGFzIGEgc3RhdGUgbWFjaGluZSBhbmRcclxuICBjYW4gcGVyZm9ybSBzZXZlcmFsIGFuaW1hdGlvbiBzZXF1ZW5jZXMuXHJcbiAgLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuKi9cclxuZXhwb3J0IGNsYXNzIEdyaWRDaGFyYWN0ZXIge1xyXG4gIHNwcml0ZTpQSVhJLlNwcml0ZTtcclxuICBjZWxsSW5kZXhSaWdodDpudW1iZXI7IC8vIGJvYXJkIGNvb3JkaW5hdGVcclxuICBjZWxsSW5kZXhEb3duOm51bWJlcjtcclxuICB4TW92ZW1lbnREaXI6bnVtYmVyOyAvLyBkaXJlY3Rpb24gb2YgY3VycmVudCBtb3ZlbWVudCwgKC0xID0gbGVmdCwgMSA9IHJpZ2h0KVxyXG4gIHlNb3ZlbWVudERpcjpudW1iZXI7IC8vIGRpcmVjdGlvbiBvZiBjdXJyZW50IG1vdmVtZW50LCAoLTEgPSB1cCwgMSA9IGRvd24pXHJcblxyXG4gIHNsaWRlVmFsdWU6bnVtYmVyOyAvLyBob3cgZmFyIHRoZSBwaWVjZSBoYXMgc2xpZCBhd2F5IGZyb20gY3VycmVudCBjZWxsXHJcbiAgICAgICAgICAgICAgICAgICAgIC8vIDAgdG8gMVxyXG4gIGVmZmVjdFNsaWRlcjpudW1iZXI7IC8vIFVzZWQgZm9yIHRoZSBhbmltYXRpb24gb2YgZWZmZWN0c1xyXG4gIHJlc3RUaW1lcjpudW1iZXI7ICAvLyB0aGUgcGllY2UgXCJyZXN0c1wiIGZvciBhIGJpdCBhZnRlciBhcnJpdmluZ1xyXG4gIG1vdmVUaW1lOm51bWJlcjsgLy8gaG93IG1hbnkgc2Vjb25kcyBhIG1vdmUgb3IgcmVzdCBwZXJpb2QgdGFrZXNcclxuXHJcbiAgb25Jbml0aWFsQ2VsbDpib29sZWFuO1xyXG4gIGlzTW92aW5nOmJvb2xlYW47XHJcbiAgaXNPbkdyaWQ6Ym9vbGVhbjsgLy8gZmFsc2UgaWYgcGllY2UgbW92ZXMgb2ZmIGJvYXJkXHJcbiAgcGF1c2VkOmJvb2xlYW47XHJcblxyXG4gIHByaXZhdGUgX3N0YXRlOnN0cmluZztcclxuXHJcbiAgY29uc3RydWN0b3IobmFtZTpzdHJpbmcsIGNvbnRhaW5lcjpQSVhJLkNvbnRhaW5lcikge1xyXG4gICAgdGhpcy5zcHJpdGUgPSBQSVhJLlNwcml0ZS5mcm9tSW1hZ2UobmFtZSk7XHJcbiAgICB0aGlzLnNwcml0ZS53aWR0aCA9IGNlbGxEaW07XHJcbiAgICB0aGlzLnNwcml0ZS5oZWlnaHQgPSBjZWxsRGltO1xyXG4gICAgdGhpcy5zcHJpdGUuYW5jaG9yLnggPSAwLjU7XHJcbiAgICB0aGlzLnNwcml0ZS5hbmNob3IueSA9IDAuNTtcclxuICAgIHRoaXMuc3ByaXRlLmFscGhhID0gMDtcclxuICAgIGNvbnRhaW5lci5hZGRDaGlsZCh0aGlzLnNwcml0ZSk7XHJcblxyXG4gICAgdGhpcy54TW92ZW1lbnREaXIgPSAwO1xyXG4gICAgdGhpcy55TW92ZW1lbnREaXIgPSAwO1xyXG4gICAgdGhpcy5pc01vdmluZyA9IGZhbHNlO1xyXG4gICAgdGhpcy5pc09uR3JpZCA9IHRydWU7XHJcbiAgICB0aGlzLnBhdXNlZCA9IGZhbHNlO1xyXG4gICAgdGhpcy5yZXN0VGltZXIgPSAwO1xyXG4gICAgdGhpcy5tb3ZlVGltZSA9IDEuMDtcclxuICAgIHRoaXMuX3N0YXRlID0gXCJpbmFjdGl2ZVwiO1xyXG4gIH1cclxuXHJcbiAgLy8gSW5zdGFudGx5IHBvc2l0aW9ucyB0aGUgcGllY2UgYXQgaXRzIHN0YXJ0IHBvc2l0aW9uXHJcbiAgc2V0UG9zaXRpb24oaTpudW1iZXIsIGo6bnVtYmVyKSB7XHJcbiAgICB0aGlzLnNwcml0ZS54ID0gY2VsbERpbSAqIChpICsgMC41KTtcclxuICAgIHRoaXMuc3ByaXRlLnkgPSBjZWxsRGltICogKGogKyAwLjUpO1xyXG4gICAgdGhpcy5zcHJpdGUud2lkdGggPSBjZWxsRGltO1xyXG4gICAgdGhpcy5zcHJpdGUuaGVpZ2h0ID0gY2VsbERpbTtcclxuICAgIHRoaXMuc3ByaXRlLmFscGhhID0gMTtcclxuICAgIHRoaXMuY2VsbEluZGV4RG93biA9IGo7XHJcbiAgICB0aGlzLmNlbGxJbmRleFJpZ2h0ID0gaTtcclxuICAgIHRoaXMub25Jbml0aWFsQ2VsbCA9IHRydWU7XHJcbiAgICB0aGlzLnBhdXNlZCA9IGZhbHNlO1xyXG4gICAgdGhpcy5pc01vdmluZyA9IGZhbHNlO1xyXG4gICAgdGhpcy5pc09uR3JpZCA9IHRydWU7XHJcbiAgICB0aGlzLnNsaWRlVmFsdWUgPSAwO1xyXG4gICAgdGhpcy5yZXN0VGltZXIgPSB0aGlzLm1vdmVUaW1lOyAvLyBsZXQgaXQgcmVzdCBiZWZvcmUgc3RhcnRpbmcgbW92ZVxyXG4gICAgdGhpcy5fc3RhdGUgPSBcImFjdGl2ZVwiO1xyXG4gIH1cclxuXHJcbiAgLy8gUmV0dXJucyB0cnVlIGlmIGNoYXJhY3RlciBjYW4gYmUgaXNzdWVkIGEgbmV3IG1vdmVcclxuICByZWFkeVRvTW92ZSgpIHtcclxuICAgIGlmICh0aGlzLl9zdGF0ZSAhPSBcImFjdGl2ZVwiKSB7XHJcbiAgICAgIHJldHVybiBmYWxzZTtcclxuICAgIH1cclxuICAgIHJldHVybiAoIXRoaXMuaXNNb3ZpbmcgJiYgdGhpcy5yZXN0VGltZXIgPT0gMCk7XHJcbiAgfVxyXG5cclxuICAvLyBSZXR1cm5zIHRydWUgaWYgdGhpcyBjaGFyYWN0ZXIgYW5kIHRoZSBvdGhlciBoYXZlIGNhdWdodCB1cCB0byBlYWNoIG90aGVyXHJcbiAgdGVzdENvbGxpc2lvbihvdGhlcjpHcmlkQ2hhcmFjdGVyKSB7XHJcbiAgICBpZiAodGhpcy5vbkluaXRpYWxDZWxsIHx8IG90aGVyLm9uSW5pdGlhbENlbGwgfHwgdGhpcy5fc3RhdGUgIT0gXCJhY3RpdmVcIikge1xyXG4gICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICB9XHJcbiAgICBpZiAodGhpcy5jZWxsSW5kZXhEb3duID09IG90aGVyLmNlbGxJbmRleERvd24gJiZcclxuICAgICAgdGhpcy5jZWxsSW5kZXhSaWdodCA9PSBvdGhlci5jZWxsSW5kZXhSaWdodCkge1xyXG4gICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gZmFsc2U7XHJcbiAgfVxyXG5cclxuICAvLyBUZWxscyB0aGUgcGllY2UgdG8gYmVnaW4gbW92aW5nIGluIHRoZSBnaXZlbiBkaXJlY3Rpb25cclxuICAvLyBTZWUgR3JpZENlbGwgZm9yIGRpcmVjdGlvbiB2YWx1ZXMuXHJcbiAgcmVxdWVzdE5ld01vdmUoZGlyZWN0aW9uKSB7XHJcbiAgICBpZiAodGhpcy5fc3RhdGUgIT0gXCJhY3RpdmVcIikge1xyXG4gICAgICByZXR1cm47XHJcbiAgICB9XHJcbiAgICBpZiAodGhpcy5pc01vdmluZykge1xyXG4gICAgICByZXR1cm47IC8vIGNhbid0IGNoYW5nZSB3aGlsZSBhbHJlYWR5IG1vdmluZ1xyXG4gICAgfVxyXG4gICAgaWYgKGRpcmVjdGlvbiA9PSAwKSAvLyBsZWZ0XHJcbiAgICB7XHJcbiAgICAgIHRoaXMueE1vdmVtZW50RGlyID0gLTEuMDtcclxuICAgICAgdGhpcy55TW92ZW1lbnREaXIgPSAgMC4wO1xyXG4gICAgfVxyXG4gICAgZWxzZSBpZiAoZGlyZWN0aW9uID09IDEpIC8vIHVwXHJcbiAgICB7XHJcbiAgICAgIHRoaXMueE1vdmVtZW50RGlyID0gIDAuMDtcclxuICAgICAgdGhpcy55TW92ZW1lbnREaXIgPSAtMS4wO1xyXG4gICAgfVxyXG4gICAgZWxzZSBpZiAoZGlyZWN0aW9uID09IDIpIC8vIHJpZ2h0XHJcbiAgICB7XHJcbiAgICAgIHRoaXMueE1vdmVtZW50RGlyID0gIDEuMDtcclxuICAgICAgdGhpcy55TW92ZW1lbnREaXIgPSAgMC4wO1xyXG4gICAgfVxyXG4gICAgZWxzZSAgLy8gZG93blxyXG4gICAge1xyXG4gICAgICB0aGlzLnhNb3ZlbWVudERpciA9ICAwLjA7XHJcbiAgICAgIHRoaXMueU1vdmVtZW50RGlyID0gIDEuMDtcclxuICAgIH1cclxuICAgIHRoaXMuc2xpZGVWYWx1ZSA9IDA7XHJcbiAgICB0aGlzLmlzTW92aW5nID0gdHJ1ZTtcclxuICB9XHJcblxyXG4gIC8vIFB1dHMgdGhlIHBpZWNlIGluIGEgbmV3IGFuaW1hdGlvbiBzdGF0ZVxyXG4gIC8vIChJIHdhcyBnb2luZyB0byB1c2UgYSB0eXBlc2NyaXB0IGFjY2Vzc29yLCBidXQgbm90IHN1cHBvcnRlZCBieSB0aGlzIGNvbXBpbGVyKVxyXG4gIHNldFN0YXRlKHN0YXRlOnN0cmluZykge1xyXG4gICAgaWYgKHRoaXMuX3N0YXRlID09IHN0YXRlIHx8IHRoaXMuX3N0YXRlID09IFwiaW5hY3RpdmVcIikge1xyXG4gICAgICAvLyBOb3RoaW5nIGhhcHBlbnMgaWYgd2UncmUgYWxyZWFkeSBpbiByZXF1ZXN0ZWQgc3RhdGUgb3IgaWYgY2hhcmFjdGVyXHJcbiAgICAgIC8vIGlzIGluYWN0aXZlXHJcbiAgICAgIHJldHVybjtcclxuICAgIH1cclxuICAgIGNvbnNvbGUubG9nKFwic3RhdGUgdG8gXCIgKyBzdGF0ZSk7XHJcbiAgICB0aGlzLl9zdGF0ZSA9IHN0YXRlO1xyXG4gICAgaWYgKHN0YXRlID09IFwiZnJvemVuXCIpIHtcclxuICAgICAgdGhpcy5lZmZlY3RTbGlkZXIgPSAwO1xyXG4gICAgfVxyXG4gICAgZWxzZSBpZiAoc3RhdGUgPT0gXCJkeWluZ1wiKSB7XHJcbiAgICAgIHRoaXMuZWZmZWN0U2xpZGVyID0gMTtcclxuICAgIH1cclxuICAgIGVsc2UgaWYgKHN0YXRlID09IFwiZXhwbG9kZVwiKSB7XHJcbiAgICAgIHRoaXMuZWZmZWN0U2xpZGVyID0gMTtcclxuICAgIH1cclxuICAgIGVsc2UgaWYgKHN0YXRlID09IFwiaW5hY3RpdmVcIikge1xyXG4gICAgICB0aGlzLnNwcml0ZS5hbHBoYSA9IDA7XHJcbiAgICAgIHRoaXMuaXNNb3ZpbmcgPSBmYWxzZTtcclxuICAgICAgdGhpcy5pc09uR3JpZCA9IHRydWU7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICAvLyBBY2Nlc3NvcnMgYW5kIHNldHRlcnMgYXJlIGdvb2QgOilcclxuICBnZXRTdGF0ZSgpIHtcclxuICAgIHJldHVybiB0aGlzLl9zdGF0ZTtcclxuICB9XHJcblxyXG4gIC8vIFVwZGF0ZSBmdW5jdGlvbiBjYWxsZWQgcGVyaW9kaWNhbGx5LiBkZWx0YVQgaXMgdGltZSBpbiBzZWNvbmRzIHNpbmNlIGxhc3RcclxuICAvLyBjYWxsLlxyXG4gIHVwZGF0ZShkZWx0YVQpIHtcclxuICAgIGlmICh0aGlzLl9zdGF0ZSA9PSBcImFjdGl2ZVwiKSB7XHJcbiAgICAgIHRoaXMuc3ByaXRlLnggPSBjZWxsRGltICogKHRoaXMuY2VsbEluZGV4UmlnaHQgKyAwLjUgKyB0aGlzLnhNb3ZlbWVudERpciAqIHRoaXMuc2xpZGVWYWx1ZSk7XHJcbiAgICAgIHRoaXMuc3ByaXRlLnkgPSBjZWxsRGltICogKHRoaXMuY2VsbEluZGV4RG93biArIDAuNSArIHRoaXMueU1vdmVtZW50RGlyICogdGhpcy5zbGlkZVZhbHVlKTtcclxuICAgICAgaWYgKHRoaXMuaXNNb3ZpbmcpIHtcclxuICAgICAgICAvLyBpdCB0YWtlcyBtb3ZlVGltZSBzZWNvbmRzIHRvIG1vdmUgb25lIHNxdWFyZVxyXG4gICAgICAgIHRoaXMuc2xpZGVWYWx1ZSA9IHRoaXMuc2xpZGVWYWx1ZSArIGRlbHRhVCAvIHRoaXMubW92ZVRpbWU7XHJcbiAgICAgICAgaWYgKHRoaXMuc2xpZGVWYWx1ZSA+IDEuMClcclxuICAgICAgICB7XHJcbiAgICAgICAgICAvLyBXZSd2ZSBhcnJpdmVkXHJcbiAgICAgICAgICB0aGlzLmNlbGxJbmRleFJpZ2h0ID0gdGhpcy5jZWxsSW5kZXhSaWdodCArIHRoaXMueE1vdmVtZW50RGlyO1xyXG4gICAgICAgICAgdGhpcy5jZWxsSW5kZXhEb3duID0gdGhpcy5jZWxsSW5kZXhEb3duICsgdGhpcy55TW92ZW1lbnREaXI7XHJcbiAgICAgICAgICB0aGlzLnNsaWRlVmFsdWUgPSAwO1xyXG4gICAgICAgICAgdGhpcy54TW92ZW1lbnREaXIgPSAwLjA7XHJcbiAgICAgICAgICB0aGlzLnlNb3ZlbWVudERpciA9IDAuMDtcclxuICAgICAgICAgIHRoaXMuaXNNb3ZpbmcgPSBmYWxzZTtcclxuICAgICAgICAgIHRoaXMub25Jbml0aWFsQ2VsbCA9IGZhbHNlO1xyXG4gICAgICAgICAgdGhpcy5yZXN0VGltZXIgPSB0aGlzLm1vdmVUaW1lO1xyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgICBlbHNlIGlmICh0aGlzLnJlc3RUaW1lciA+IDApXHJcbiAgICAgIHtcclxuICAgICAgICAvLyBQaWVjZSBpcyByZXN0aW5nIGFmdGVyIGNvbXBsZXRpbmcgbW92ZVxyXG4gICAgICAgIHRoaXMucmVzdFRpbWVyID0gdGhpcy5yZXN0VGltZXIgLSBkZWx0YVQ7XHJcbiAgICAgICAgaWYgKHRoaXMucmVzdFRpbWVyIDwgMCkge1xyXG4gICAgICAgICAgdGhpcy5yZXN0VGltZXIgPSAwO1xyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgfSAvLyBlbmQgaWYgYWN0aXZlIHN0YXRlXHJcbiAgICBlbHNlIGlmICh0aGlzLl9zdGF0ZSA9PSBcImZyb3plblwiKSB7XHJcbiAgICAgIC8vIHNpbmUgd2F2ZSBhbHBoYSBlZmZlY3RcclxuICAgICAgdGhpcy5zcHJpdGUuYWxwaGEgPSAwLjUgKyAwLjUgKiBNYXRoLmNvcyh0aGlzLmVmZmVjdFNsaWRlcik7XHJcbiAgICAgIHRoaXMuZWZmZWN0U2xpZGVyID0gdGhpcy5lZmZlY3RTbGlkZXIgKyBkZWx0YVQgKiA0O1xyXG4gICAgfVxyXG4gICAgZWxzZSBpZiAodGhpcy5fc3RhdGUgPT0gXCJkeWluZ1wiKSB7XHJcbiAgICAgIC8vIGZhZGUgYW5kIHNocmluayBlZmZlY3RcclxuICAgICAgdGhpcy5zcHJpdGUuYWxwaGEgPSB0aGlzLmVmZmVjdFNsaWRlcjtcclxuICAgICAgdGhpcy5zcHJpdGUud2lkdGggPSBjZWxsRGltICogKDAuNSArIHRoaXMuZWZmZWN0U2xpZGVyIC8gMik7XHJcbiAgICAgIHRoaXMuc3ByaXRlLmhlaWdodCA9IGNlbGxEaW0gKiAoMC41ICsgdGhpcy5lZmZlY3RTbGlkZXIgLyAyKTtcclxuICAgICAgdGhpcy5lZmZlY3RTbGlkZXIgPSB0aGlzLmVmZmVjdFNsaWRlciAtIGRlbHRhVCAvICh0aGlzLm1vdmVUaW1lICogNC4wKTtcclxuICAgICAgaWYgKHRoaXMuZWZmZWN0U2xpZGVyIDw9IDAuMCkge1xyXG4gICAgICAgIHRoaXMuc2V0U3RhdGUoXCJpbmFjdGl2ZVwiKTtcclxuICAgICAgfVxyXG4gICAgfVxyXG4gICAgZWxzZSBpZiAodGhpcy5fc3RhdGUgPT0gXCJleHBsb2RlXCIpIHtcclxuICAgICAgLy8gYnVyc3QgYW5kIGZhZGUgZWZmZWN0XHJcbiAgICAgIHRoaXMuc3ByaXRlLmFscGhhID0gdGhpcy5lZmZlY3RTbGlkZXI7XHJcbiAgICAgIHRoaXMuc3ByaXRlLndpZHRoID0gY2VsbERpbSAqICgxLjAgKyAoMy4wIC0gdGhpcy5lZmZlY3RTbGlkZXIgKiAzLjApKTtcclxuICAgICAgdGhpcy5zcHJpdGUuaGVpZ2h0ID0gY2VsbERpbSAqICgxLjAgKyAoMy4wIC0gdGhpcy5lZmZlY3RTbGlkZXIgKiAzLjApKTtcclxuICAgICAgdGhpcy5lZmZlY3RTbGlkZXIgPSB0aGlzLmVmZmVjdFNsaWRlciAtIGRlbHRhVCAvICh0aGlzLm1vdmVUaW1lICogNC4wKTtcclxuICAgICAgaWYgKHRoaXMuZWZmZWN0U2xpZGVyIDw9IDAuMCkge1xyXG4gICAgICAgIHRoaXMuZWZmZWN0U2xpZGVyID0gMTsgLy8ga2VlcCBleHBsb2RpbmcgZm9yZXZlclxyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICAvLyBQdXRzIHRoaXMgY2hhcmFjdGVyIGludG8gb3Igb3V0IG9mIHBhdXNlZCBzdGF0ZVxyXG4gIHNldFBhdXNlZCh2YWw6Ym9vbGVhbikge1xyXG4gICAgaWYgKHRoaXMucGF1c2VkID09IHZhbCkge1xyXG4gICAgICByZXR1cm47XHJcbiAgICB9XHJcblxyXG4gICAgdGhpcy5wYXVzZWQgPSB2YWw7XHJcbiAgICBpZiAodmFsKSB7XHJcbiAgICAgIHRoaXMuZWZmZWN0U2xpZGVyID0gMDtcclxuICAgIH1cclxuICAgIGVsc2Uge1xyXG4gICAgICB0aGlzLnNwcml0ZS5hbHBoYSA9IDE7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICAvLyBVcGRhdGUgZnVuY3Rpb24gY2FsbGVkIHdoaWxlIGNoYXJhY3RlciBpcyBwYXVzZWRcclxuICB1cGRhdGVQYXVzZWQoZGVsdGFUKSB7XHJcbiAgICAvLyBzaW5lIHdhdmUgYWxwaGEgZWZmZWN0XHJcbiAgICB0aGlzLnNwcml0ZS5hbHBoYSA9IDAuNSArIDAuNSAqIE1hdGguY29zKHRoaXMuZWZmZWN0U2xpZGVyKTtcclxuICAgIHRoaXMuZWZmZWN0U2xpZGVyID0gdGhpcy5lZmZlY3RTbGlkZXIgKyBkZWx0YVQgKiA0O1xyXG4gIH1cclxufVxyXG5cclxuLypcclxuICAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG4gIFJlcHJlc2VudHMgdGhlIGdhbWUgYXQgdGhlIGhpZ2hlc3QgbGV2ZWwuIE1hbmFnZXMgVUkgZmVhdHVyZXMsIGFuIEFycm93R3JpZFxyXG4gIGluc3RhbmNlLCBhbmQgdGhlIGdhbWUgcGllY2VzLlxyXG4gIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcbiovXHJcbmV4cG9ydCBjbGFzcyBUaGVHYW1lIHtcclxuICB0aGVHcmlkOmdyaWRGaWxlLkFycm93R3JpZDtcclxuXHJcbiAgY2hlY2tlckNoYXJhY3RlcjpHcmlkQ2hhcmFjdGVyO1xyXG4gIGNoZWNrTWFya0NoYXJhY3RlcjpHcmlkQ2hhcmFjdGVyO1xyXG5cclxuICBpbmZvVGV4dDpQSVhJLlRleHQ7XHJcbiAgcmVzZXRUZXh0OlBJWEkuVGV4dDtcclxuICByZXNodWZmbGVUZXh0OlBJWEkuVGV4dDtcclxuICBwYXVzZVRleHQ6UElYSS5UZXh0O1xyXG5cclxuICBnYW1lU3RhdGU6c3RyaW5nOyAvLyBcInJlYWR5XCIsIFwiaW4gcHJvZ3Jlc3NcIiwgb3IgXCJkb25lXCJcclxuICBwYXVzZWQ6Ym9vbGVhbjtcclxuXHJcbiAgY29uc3RydWN0b3Ioc3RhZ2U6UElYSS5Db250YWluZXIpIHtcclxuICAgIHRoaXMudGhlR3JpZCA9IG5ldyBncmlkRmlsZS5BcnJvd0dyaWQoMTAsIDEwLCBzdGFnZSk7XHJcbiAgICBsZXQgZ2FtZUluc3RhbmNlOlRoZUdhbWUgPSB0aGlzO1xyXG4gICAgbGV0IG9uQnV0dG9uRG93biA9IGZ1bmN0aW9uKCkge1xyXG4gICAgICBnYW1lSW5zdGFuY2UuaGFuZGxlQ2VsbFByZXNzKHRoaXMueCwgdGhpcy55KTtcclxuICAgIH1cclxuICAgIGxldCBvbkJ1dHRvbk92ZXIgPSBmdW5jdGlvbigpIHtcclxuICAgICAgZ2FtZUluc3RhbmNlLmhhbmRsZUNlbGxPdmVyKHRoaXMueCwgdGhpcy55KTtcclxuICAgIH1cclxuICAgIGxldCBvbkJ1dHRvbk91dCA9IGZ1bmN0aW9uKCkge1xyXG4gICAgICBnYW1lSW5zdGFuY2UuaGFuZGxlQ2VsbE91dCh0aGlzLngsIHRoaXMueSk7XHJcbiAgICB9XHJcbiAgICB0aGlzLnRoZUdyaWQuc2V0TW91c2VGdW5jdGlvbnMob25CdXR0b25Eb3duLCBvbkJ1dHRvbk92ZXIsIG9uQnV0dG9uT3V0KTtcclxuXHJcbiAgICAvLyBjcmVhdGUgYSB0ZXh0IG9iamVjdCB3aXRoIGEgbmljZSBzdHJva2VcclxuICAgIHRoaXMuaW5mb1RleHQgPSBuZXcgUElYSS5UZXh0KCdQbGFjZSBwaWVjZSBvbiBib2FyZCcsIHsgZm9udDogJ2JvbGQgMzZweCBBcmlhbCcsIGZpbGw6ICcjZmZmZjAwJywgYWxpZ246ICdsZWZ0Jywgc3Ryb2tlOiAnIzAwMDBGRicsIHN0cm9rZVRoaWNrbmVzczogNCB9KTtcclxuICAgIHRoaXMuaW5mb1RleHQucG9zaXRpb24ueCA9IHRoaXMudGhlR3JpZC5jb250YWluZXIueCArIGNlbGxEaW0gKiAodGhpcy50aGVHcmlkLmRpbVggKyAxKTtcclxuICAgIHRoaXMuaW5mb1RleHQucG9zaXRpb24ueSA9IHRoaXMudGhlR3JpZC5jb250YWluZXIueSArIGNlbGxEaW07XHJcbiAgICBzdGFnZS5hZGRDaGlsZCh0aGlzLmluZm9UZXh0KTtcclxuXHJcbiAgICBsZXQgY3VycmVudEdhbWU6VGhlR2FtZSA9IHRoaXM7XHJcbiAgICB0aGlzLnJlc2V0VGV4dCA9IG5ldyBQSVhJLlRleHQoJ1Jlc2V0JywgeyBmb250OiAnYm9sZCAzMHB4IEFyaWFsJywgZmlsbDogJyMwMDAwZmYnLCBhbGlnbjogJ2xlZnQnLCBzdHJva2U6ICcjRkYwMEZGJywgc3Ryb2tlVGhpY2tuZXNzOiA0IH0pO1xyXG4gICAgdGhpcy5yZXNldFRleHQucG9zaXRpb24ueCA9IHRoaXMudGhlR3JpZC5jb250YWluZXIueCArIGNlbGxEaW0gKiAodGhpcy50aGVHcmlkLmRpbVggKyAxKTtcclxuICAgIHRoaXMucmVzZXRUZXh0LnBvc2l0aW9uLnkgPSB0aGlzLnRoZUdyaWQuY29udGFpbmVyLnkgKyBjZWxsRGltICogKHRoaXMudGhlR3JpZC5kaW1ZIC0gMyk7XHJcbiAgICBzdGFnZS5hZGRDaGlsZCh0aGlzLnJlc2V0VGV4dCk7XHJcbiAgICB0aGlzLnJlc2V0VGV4dC5idXR0b25Nb2RlID0gdHJ1ZTtcclxuICAgIHRoaXMucmVzZXRUZXh0LmludGVyYWN0aXZlID0gdHJ1ZTtcclxuICAgIHRoaXMucmVzZXRUZXh0Lm9uKCdtb3VzZWRvd24nLCBmdW5jdGlvbigpIHtcclxuICAgICAgY3VycmVudEdhbWUuaGFuZGxlUmVzZXRQcmVzc2VkKCk7XHJcbiAgICB9KTtcclxuICAgIHRoaXMucmVzZXRUZXh0LnZpc2libGUgPSBmYWxzZTtcclxuXHJcbiAgICB0aGlzLnJlc2h1ZmZsZVRleHQgPSBuZXcgUElYSS5UZXh0KCdSZXNodWZmbGUnLCB7IGZvbnQ6ICdib2xkIDMwcHggQXJpYWwnLCBmaWxsOiAnIzAwMDBmZicsIGFsaWduOiAnbGVmdCcsIHN0cm9rZTogJyNGRjAwRkYnLCBzdHJva2VUaGlja25lc3M6IDQgfSk7XHJcbiAgICB0aGlzLnJlc2h1ZmZsZVRleHQucG9zaXRpb24ueCA9IHRoaXMudGhlR3JpZC5jb250YWluZXIueCArIGNlbGxEaW0gKiAodGhpcy50aGVHcmlkLmRpbVggKyAxKTtcclxuICAgIHRoaXMucmVzaHVmZmxlVGV4dC5wb3NpdGlvbi55ID0gdGhpcy50aGVHcmlkLmNvbnRhaW5lci55ICsgY2VsbERpbSAqICh0aGlzLnRoZUdyaWQuZGltWSAtIDIpO1xyXG4gICAgc3RhZ2UuYWRkQ2hpbGQodGhpcy5yZXNodWZmbGVUZXh0KTtcclxuICAgIHRoaXMucmVzaHVmZmxlVGV4dC5idXR0b25Nb2RlID0gdHJ1ZTtcclxuICAgIHRoaXMucmVzaHVmZmxlVGV4dC5pbnRlcmFjdGl2ZSA9IHRydWU7XHJcbiAgICB0aGlzLnJlc2h1ZmZsZVRleHQub24oJ21vdXNlZG93bicsIGZ1bmN0aW9uKCkge1xyXG4gICAgICBjdXJyZW50R2FtZS5oYW5kbGVSZXNodWZmbGVQcmVzc2VkKCk7XHJcbiAgICB9KTtcclxuXHJcbiAgICB0aGlzLnBhdXNlVGV4dCA9IG5ldyBQSVhJLlRleHQoJ1BhdXNlJywgeyBmb250OiAnYm9sZCAzMHB4IEFyaWFsJywgZmlsbDogJyMwMDAwZmYnLCBhbGlnbjogJ2xlZnQnLCBzdHJva2U6ICcjRkYwMEZGJywgc3Ryb2tlVGhpY2tuZXNzOiA0IH0pO1xyXG4gICAgdGhpcy5wYXVzZVRleHQucG9zaXRpb24ueCA9IHRoaXMudGhlR3JpZC5jb250YWluZXIueCArIGNlbGxEaW0gKiAodGhpcy50aGVHcmlkLmRpbVggKyAxKTtcclxuICAgIHRoaXMucGF1c2VUZXh0LnBvc2l0aW9uLnkgPSB0aGlzLnRoZUdyaWQuY29udGFpbmVyLnkgKyBjZWxsRGltICogKHRoaXMudGhlR3JpZC5kaW1ZIC0gMSk7XHJcbiAgICBzdGFnZS5hZGRDaGlsZCh0aGlzLnBhdXNlVGV4dCk7XHJcbiAgICB0aGlzLnBhdXNlVGV4dC5idXR0b25Nb2RlID0gdHJ1ZTtcclxuICAgIHRoaXMucGF1c2VUZXh0LmludGVyYWN0aXZlID0gdHJ1ZTtcclxuICAgIHRoaXMucGF1c2VUZXh0Lm9uKCdtb3VzZWRvd24nLCBmdW5jdGlvbigpIHtcclxuICAgICAgY3VycmVudEdhbWUuaGFuZGxlUGF1c2VQcmVzc2VkKCk7XHJcbiAgICB9KTtcclxuICAgIHRoaXMucGF1c2VUZXh0LnZpc2libGUgPSBmYWxzZTtcclxuXHJcbiAgICAvLyBJbml0aWFsaXplIGNoYXJhY3RlcnNcclxuICAgIHRoaXMuY2hlY2tlckNoYXJhY3RlciA9IG5ldyBHcmlkQ2hhcmFjdGVyKCdpbWFnZXMvcmVkLWNoZWNrZXIucG5nJywgdGhpcy50aGVHcmlkLmNvbnRhaW5lcik7XHJcbiAgICB0aGlzLmNoZWNrZXJDaGFyYWN0ZXIubW92ZVRpbWUgPSAwLjU7XHJcbiAgICB0aGlzLmNoZWNrTWFya0NoYXJhY3RlciA9IG5ldyBHcmlkQ2hhcmFjdGVyKCdpbWFnZXMvZ3JlZW4tY2hlY2stbWFyay5wbmcnLCB0aGlzLnRoZUdyaWQuY29udGFpbmVyKTtcclxuICAgIHRoaXMuY2hlY2tNYXJrQ2hhcmFjdGVyLm1vdmVUaW1lID0gMC4yNTtcclxuXHJcbiAgICB0aGlzLmdhbWVTdGF0ZSA9IFwicmVhZHlcIjtcclxuICAgIHRoaXMucGF1c2VkID0gZmFsc2U7XHJcbiAgfVxyXG5cclxuICAvLyBNYWluIHVwZGF0ZSBmdW5jdGlvbi4gZGVsdGFUIGlzIHNlY29uZHMgZWxhcHNlZCBzaW5jZSBsYXN0IGNhbGwuXHJcbiAgdXBkYXRlKGRlbHRhVDpudW1iZXIpIHtcclxuICAgIGxldCBjaGFyYWN0ZXJzOkdyaWRDaGFyYWN0ZXJbXSA9IFt0aGlzLmNoZWNrZXJDaGFyYWN0ZXIsIHRoaXMuY2hlY2tNYXJrQ2hhcmFjdGVyXTtcclxuXHJcbiAgICBpZiAodGhpcy5wYXVzZWQpIHtcclxuICAgICAgZm9yIChsZXQgY2hhciBvZiBjaGFyYWN0ZXJzKSB7XHJcbiAgICAgICAgY2hhci51cGRhdGVQYXVzZWQoZGVsdGFUKTtcclxuICAgICAgfVxyXG4gICAgICByZXR1cm47XHJcbiAgICB9XHJcblxyXG4gICAgZm9yIChsZXQgY2hhciBvZiBjaGFyYWN0ZXJzKSB7XHJcbiAgICAgIGNoYXIudXBkYXRlKGRlbHRhVCk7XHJcbiAgICAgIGlmIChjaGFyLnJlYWR5VG9Nb3ZlKCkpIHtcclxuICAgICAgICAvLyBIYXMgY2hhcmFjdGVyIGZhbGxlbiBvZmYgZ3JpZD9cclxuICAgICAgICBpZiAoY2hhci5jZWxsSW5kZXhEb3duIDwgMCB8fCBjaGFyLmNlbGxJbmRleERvd24gPj0gdGhpcy50aGVHcmlkLmRpbVkgfHxcclxuICAgICAgICAgIGNoYXIuY2VsbEluZGV4UmlnaHQgPCAwIHx8IGNoYXIuY2VsbEluZGV4UmlnaHQgPj0gdGhpcy50aGVHcmlkLmRpbVgpIHtcclxuICAgICAgICAgIGNoYXIuaXNPbkdyaWQgPSBmYWxzZTtcclxuICAgICAgICB9XHJcbiAgICAgICAgZWxzZVxyXG4gICAgICAgIHtcclxuICAgICAgICAgIC8vIENoYXJhY3RlciBpcyBzdGlsbCBvbiBib2FyZFxyXG4gICAgICAgICAgbGV0IGNlbGw6Z3JpZEZpbGUuR3JpZENlbGwgPSB0aGlzLnRoZUdyaWQuZ2V0Q2VsbChjaGFyLmNlbGxJbmRleFJpZ2h0LCBjaGFyLmNlbGxJbmRleERvd24pO1xyXG4gICAgICAgICAgY2VsbC5zZXRWaXNpdGVkKHRydWUpO1xyXG4gICAgICAgICAgY2hhci5yZXF1ZXN0TmV3TW92ZShjZWxsLmRpcmVjdGlvbik7XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICB9IC8vIGVuZCBmb3JcclxuXHJcbiAgICBpZiAoIXRoaXMuY2hlY2tlckNoYXJhY3Rlci5pc09uR3JpZCkge1xyXG4gICAgICAvLyBzbG93ZXItbW92aW5nIHBpZWNlIGhhcyBsZWZ0IHRoZSBib2FyZFxyXG4gICAgICB0aGlzLmNoZWNrZXJDaGFyYWN0ZXIuc2V0U3RhdGUoXCJmcm96ZW5cIik7XHJcbiAgICB9XHJcbiAgICBpZiAoIXRoaXMuY2hlY2tNYXJrQ2hhcmFjdGVyLmlzT25HcmlkKSB7XHJcbiAgICAgIC8vIGZhc3Rlci1tb3ZpbmcgcGllY2UgaGFzIGxlZnQgdGhlIGJvYXJkXHJcbiAgICAgIHRoaXMuY2hlY2tNYXJrQ2hhcmFjdGVyLnNldFN0YXRlKFwiZHlpbmdcIik7XHJcbiAgICAgIHRoaXMuY2hlY2tlckNoYXJhY3Rlci5zZXRTdGF0ZShcImZyb3plblwiKTtcclxuICAgICAgdGhpcy5pbmZvVGV4dC50ZXh0ID0gXCJObyBMb29wXCI7XHJcbiAgICAgIHRoaXMuZ2FtZVN0YXRlID0gXCJkb25lXCI7XHJcbiAgICAgIHRoaXMucmVzZXRUZXh0LnZpc2libGUgPSB0cnVlO1xyXG4gICAgICB0aGlzLnJlc2h1ZmZsZVRleHQudmlzaWJsZSA9IHRydWU7XHJcbiAgICAgIHRoaXMucGF1c2VUZXh0LnZpc2libGUgPSBmYWxzZTtcclxuICAgIH1cclxuICAgIC8vIEFyZSBib3RoIHBpZWNlcyBvbiB0aGUgc2FtZSBzcXVhcmU/IElmIHNvLCB0aGUgZmFzdGVyLW1vdmluZyBvbmUgaGFzIGNhdWdodCB1cCB3aXRoXHJcbiAgICAvLyB0aGUgc2xvd2VyLlxyXG4gICAgZWxzZSBpZiAoY2hhcmFjdGVyc1swXS50ZXN0Q29sbGlzaW9uKGNoYXJhY3RlcnNbMV0pKSB7XHJcbiAgICAgICAgLy8gV2UndmUgY2F1Z2h0IHVwXHJcbiAgICAgICAgdGhpcy5jaGVja2VyQ2hhcmFjdGVyLnNldFN0YXRlKFwiZnJvemVuXCIpO1xyXG4gICAgICAgIHRoaXMuY2hlY2tNYXJrQ2hhcmFjdGVyLnNldFN0YXRlKFwiZXhwbG9kZVwiKTtcclxuICAgICAgICB0aGlzLmluZm9UZXh0LnRleHQgPSBcIkxvb3AgRGV0ZWN0ZWQhXCJcclxuICAgICAgICB0aGlzLmdhbWVTdGF0ZSA9IFwiZG9uZVwiO1xyXG4gICAgICAgIHRoaXMucmVzZXRUZXh0LnZpc2libGUgPSB0cnVlO1xyXG4gICAgICAgIHRoaXMucmVzaHVmZmxlVGV4dC52aXNpYmxlID0gdHJ1ZTtcclxuICAgICAgICB0aGlzLnBhdXNlVGV4dC52aXNpYmxlID0gZmFsc2U7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICAvLyBDYWxsZWQgd2hlbiB1c2VyIGNsaWNrcyBvbiBhbiBhcnJvdyBjZWxsXHJcbiAgaGFuZGxlQ2VsbFByZXNzKHBpeFg6bnVtYmVyLCBwaXhZOm51bWJlcikge1xyXG4gICAgbGV0IGNlbGxYID0gTWF0aC5mbG9vcihwaXhYIC8gY2VsbERpbSk7XHJcbiAgICBsZXQgY2VsbFkgPSBNYXRoLmZsb29yKHBpeFkgLyBjZWxsRGltKTtcclxuICAgIGNvbnNvbGUubG9nKFwiYnV0dG9uIGNlbGw6IFwiICsgY2VsbFggKyBcIixcIiArIGNlbGxZKTtcclxuICAgIGlmICh0aGlzLmNoZWNrZXJDaGFyYWN0ZXIuZ2V0U3RhdGUoKSA9PSBcImluYWN0aXZlXCIpIHtcclxuICAgICAgdGhpcy5jaGVja2VyQ2hhcmFjdGVyLnNldFBvc2l0aW9uKGNlbGxYLCBjZWxsWSk7XHJcbiAgICAgIHRoaXMuY2hlY2tNYXJrQ2hhcmFjdGVyLnNldFBvc2l0aW9uKGNlbGxYLCBjZWxsWSk7XHJcbiAgICAgIHRoaXMuaW5mb1RleHQudGV4dCA9IFwiVHJhdmVsaW5nLi4uXCJcclxuICAgICAgdGhpcy5nYW1lU3RhdGUgPSBcImluIHByb2dyZXNzXCI7XHJcbiAgICAgIHRoaXMucmVzZXRUZXh0LnZpc2libGUgPSBmYWxzZTtcclxuICAgICAgdGhpcy5yZXNodWZmbGVUZXh0LnZpc2libGUgPSBmYWxzZTtcclxuICAgICAgdGhpcy5wYXVzZVRleHQudmlzaWJsZSA9IHRydWU7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBoYW5kbGVDZWxsT3ZlcihwaXhYOm51bWJlciwgcGl4WTpudW1iZXIpIHtcclxuICAgIGxldCBjZWxsWCA9IE1hdGguZmxvb3IocGl4WCAvIGNlbGxEaW0pO1xyXG4gICAgbGV0IGNlbGxZID0gTWF0aC5mbG9vcihwaXhZIC8gY2VsbERpbSk7XHJcbiAgICBsZXQgY2VsbDpncmlkRmlsZS5HcmlkQ2VsbCA9IHRoaXMudGhlR3JpZC5nZXRDZWxsKGNlbGxYLCBjZWxsWSk7XHJcbiAgICBjZWxsLnNldEhpZ2hsaWdodCh0cnVlKTtcclxuICB9XHJcblxyXG4gIGhhbmRsZUNlbGxPdXQocGl4WDpudW1iZXIsIHBpeFk6bnVtYmVyKSB7XHJcbiAgICBsZXQgY2VsbFggPSBNYXRoLmZsb29yKHBpeFggLyBjZWxsRGltKTtcclxuICAgIGxldCBjZWxsWSA9IE1hdGguZmxvb3IocGl4WSAvIGNlbGxEaW0pO1xyXG4gICAgbGV0IGNlbGw6Z3JpZEZpbGUuR3JpZENlbGwgPSB0aGlzLnRoZUdyaWQuZ2V0Q2VsbChjZWxsWCwgY2VsbFkpO1xyXG4gICAgY2VsbC5zZXRIaWdobGlnaHQoZmFsc2UpO1xyXG4gIH1cclxuXHJcbiAgaGFuZGxlUmVzZXRQcmVzc2VkKCkge1xyXG4gICAgdGhpcy50aGVHcmlkLnJlc2V0QXJyb3dzKCk7XHJcbiAgICB0aGlzLmNoZWNrZXJDaGFyYWN0ZXIuc2V0U3RhdGUoXCJpbmFjdGl2ZVwiKTtcclxuICAgIHRoaXMuY2hlY2tNYXJrQ2hhcmFjdGVyLnNldFN0YXRlKFwiaW5hY3RpdmVcIik7XHJcbiAgICB0aGlzLmluZm9UZXh0LnRleHQgPSBcIlBsYWNlIHBpZWNlIG9uIGJvYXJkXCI7XHJcbiAgICB0aGlzLmdhbWVTdGF0ZSA9IFwicmVhZHlcIjtcclxuICB9XHJcblxyXG4gIGhhbmRsZVJlc2h1ZmZsZVByZXNzZWQoKSB7XHJcbiAgICB0aGlzLnRoZUdyaWQucmVzaHVmZmxlQXJyb3dzKCk7XHJcbiAgICB0aGlzLmNoZWNrZXJDaGFyYWN0ZXIuc2V0U3RhdGUoXCJpbmFjdGl2ZVwiKTtcclxuICAgIHRoaXMuY2hlY2tNYXJrQ2hhcmFjdGVyLnNldFN0YXRlKFwiaW5hY3RpdmVcIik7XHJcbiAgICB0aGlzLmluZm9UZXh0LnRleHQgPSBcIlBsYWNlIHBpZWNlIG9uIGJvYXJkXCI7XHJcbiAgICB0aGlzLmdhbWVTdGF0ZSA9IFwicmVhZHlcIjtcclxuICB9XHJcblxyXG4gIGhhbmRsZVBhdXNlUHJlc3NlZCgpIHtcclxuICAgIGxldCBwYXVzZWRTdGF0ZTpib29sZWFuID0gIXRoaXMucGF1c2VkO1xyXG5cclxuICAgIGlmIChwYXVzZWRTdGF0ZSkge1xyXG4gICAgICB0aGlzLnBhdXNlVGV4dC50ZXh0ID0gXCJVbnBhdXNlXCI7XHJcbiAgICB9XHJcbiAgICBlbHNlIHtcclxuICAgICAgdGhpcy5wYXVzZVRleHQudGV4dCA9IFwiUGF1c2VcIjtcclxuICAgIH1cclxuICAgIHRoaXMuY2hlY2tlckNoYXJhY3Rlci5zZXRQYXVzZWQocGF1c2VkU3RhdGUpO1xyXG4gICAgdGhpcy5jaGVja01hcmtDaGFyYWN0ZXIuc2V0UGF1c2VkKHBhdXNlZFN0YXRlKTtcclxuICAgIHRoaXMucGF1c2VkID0gcGF1c2VkU3RhdGU7XHJcbiAgfVxyXG59XHJcbiIsImltcG9ydCBQSVhJID0gcmVxdWlyZSgncGl4aS5qcycpO1xyXG5cclxubGV0IGNlbGxEaW06bnVtYmVyID0gNTA7XHJcblxyXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG4vLyBDbGFzcyBkZWZpbml0aW9uc1xyXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG5cclxuLypcclxuICBSZXByZXNlbnRzIGEgY2VsbCBvbiB0aGUgZ2FtZSBib2FyZC4gQSBjZWxsIGNvbnRhaW5zIGFuIGFycm93IFNwcml0ZVxyXG4gIHdoaWNoIHBvaW50cyBpbiBvbmUgb2YgZm91ciBjYXJkaW5hbCBkaXJlY3Rpb25zLiBFYWNoIGNlbGwgYWN0cyBhc1xyXG4gIGEgYnV0dG9uIGFuZCBjYW4gYmUgY2xpY2tlZC5cclxuKi9cclxuZXhwb3J0IGNsYXNzIEdyaWRDZWxsIHtcclxuICBzcHJpdGU6UElYSS5TcHJpdGU7XHJcbiAgLy8gQXJyb3cncyBmYWNpbmcgZGlyZWN0aW9uOiAwPWxlZnQsIDE9dXAsIDI9cmlnaHQsIDM9ZG93blxyXG4gIGRpcmVjdGlvbjpudW1iZXI7XHJcbiAgY2VsbFg6bnVtYmVyOyAvLyBjb29yZGluYXRlIG9uIHRoZSBnYW1lIGJvYXJkLCBmcm9tIGxlZnRcclxuICBjZWxsWTpudW1iZXI7IC8vIGNvb3JkaW5hdGUgb24gdGhlIGdhbWUgYm9hcmQsIGZyb20gdG9wXHJcbiAgdmlzaXRlZDpib29sZWFuOyAvLyBpZiB0aGUgY2VsbCBoYXMgYmVlbiB2aXNpdGVkIGJ5IGdhbWUgcGllY2VcclxuXHJcbiAgY29uc3RydWN0b3IoaTpudW1iZXIsIGo6bnVtYmVyLCBjb250YWluZXI6UElYSS5Db250YWluZXIpIHtcclxuICAgIHZhciBhcnJvdyA9IFBJWEkuU3ByaXRlLmZyb21JbWFnZSgnaW1hZ2VzL2Fycm93LWljb24ucG5nJyk7XHJcbiAgICBhcnJvdy54ID0gY2VsbERpbSAqIChpICsgMC41KTtcclxuICAgIGFycm93LnkgPSBjZWxsRGltICogKGogKyAwLjUpO1xyXG4gICAgYXJyb3cud2lkdGggPSBjZWxsRGltO1xyXG4gICAgYXJyb3cuaGVpZ2h0ID0gY2VsbERpbTtcclxuICAgIGFycm93LmFuY2hvci54ID0gMC41O1xyXG4gICAgYXJyb3cuYW5jaG9yLnkgPSAwLjU7XHJcbiAgICBjb250YWluZXIuYWRkQ2hpbGQoYXJyb3cpO1xyXG4gICAgdGhpcy5jZWxsWCA9IGk7XHJcbiAgICB0aGlzLmNlbGxZID0gajtcclxuICAgIHRoaXMuc3ByaXRlID0gYXJyb3c7XHJcbiAgICB0aGlzLmRpcmVjdGlvbiA9IDA7XHJcbiAgICB0aGlzLnNldFZpc2l0ZWQoZmFsc2UpO1xyXG4gIH1cclxuXHJcbiAgc2V0TW91c2VGdW5jdGlvbnMob25CdXR0b25Eb3duOigpPT52b2lkLCBvbkJ1dHRvbk92ZXI6KCk9PnZvaWQsIG9uQnV0dG9uT3V0OigpPT52b2lkKSB7XHJcbiAgICAgIC8vIG9uRXZlbnQgZnVuY3Rpb25zIGFyZSBnbG9iYWwgZnVuY3Rpb25zICh0b3dhcmRzIGJvdHRvbSBvZiBmaWxlKVxyXG4gICAgICB0aGlzLnNwcml0ZS5idXR0b25Nb2RlID0gdHJ1ZTtcclxuICAgICAgdGhpcy5zcHJpdGUuaW50ZXJhY3RpdmUgPSB0cnVlO1xyXG4gICAgICB0aGlzLnNwcml0ZS5vbignbW91c2Vkb3duJywgb25CdXR0b25Eb3duKTtcclxuICAgICAgdGhpcy5zcHJpdGUub24oJ21vdXNlb3ZlcicsIG9uQnV0dG9uT3Zlcik7XHJcbiAgICAgIHRoaXMuc3ByaXRlLm9uKCdtb3VzZW91dCcsIG9uQnV0dG9uT3V0KVxyXG4gIH1cclxuXHJcbiAgLy8gU2V0cyB0aGUgZGlyZWN0aW9uIG9mIHRoZSBhcnJvdzogMD1sZWZ0LCAxPXVwLCAyPXJpZ2h0LCAzPWRvd25cclxuICBzZXREaXJlY3Rpb24odmFsKSB7XHJcbiAgICBjb25zdCBwaSA9IDMuMTQxNTkyNjU7XHJcbiAgICB0aGlzLnNwcml0ZS5yb3RhdGlvbiA9IHBpICogdmFsIC8gMi4wO1xyXG4gICAgdGhpcy5kaXJlY3Rpb24gPSB2YWw7XHJcbiAgfVxyXG5cclxuICAvLyBTZXRzIGlmIHRoZSBjZWxsIGhhcyBiZWVuIHZpc2l0ZWQgYnkgYSBnYW1lIHBpZWNlXHJcbiAgc2V0VmlzaXRlZCh2YWx1ZTpib29sZWFuKSB7XHJcbiAgICBpZiAodmFsdWUpIHtcclxuICAgICAgdGhpcy5zcHJpdGUudGludCA9IDB4ZmZmZmZmOyAvLyBtYWtlIGJyaWdodGVyXHJcbiAgICB9XHJcbiAgICBlbHNlIHtcclxuICAgICAgdGhpcy5zcHJpdGUudGludCA9IDB4ZmY3N2FhO1xyXG4gICAgfVxyXG4gICAgdGhpcy52aXNpdGVkID0gdmFsdWU7XHJcbiAgfVxyXG5cclxuICAvLyBJZiB2YWx1ZT09dHJ1ZSwgdGVtcG9yYXJpbHkgaGlnaGxpZ2h0cyB0aGUgY2VsbFxyXG4gIC8vIElmIHZhbHVlPT10cnVlLCBpdCByZXZlcnRzIHRvIGl0cyBwcmV2aW91cyBjb2xvclxyXG4gIHNldEhpZ2hsaWdodCh2YWx1ZTpib29sZWFuKSB7XHJcbiAgICBsZXQgY3VycmVudFZhbHVlOmJvb2xlYW4gPSB0aGlzLnZpc2l0ZWQ7XHJcbiAgICBpZiAoIXZhbHVlKSB7XHJcbiAgICAgIHZhbHVlID0gY3VycmVudFZhbHVlO1xyXG4gICAgfVxyXG4gICAgdGhpcy5zZXRWaXNpdGVkKHZhbHVlKTtcclxuICAgIHRoaXMudmlzaXRlZCA9IGN1cnJlbnRWYWx1ZTtcclxuICB9XHJcbn1cclxuXHJcbi8qXHJcbiAgLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuICBSZXByZXNlbnRzIHRoZSBlbnRpcmUgZ2FtZSBib2FyZC4gQ29udGFpbnMgYSAyZCBhcnJheSBvZiBHcmljQ2VsbCBvYmplY3RzLlxyXG4gIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcbiovXHJcbmV4cG9ydCBjbGFzcyBBcnJvd0dyaWQge1xyXG4gIGNvbnRhaW5lcjpQSVhJLkNvbnRhaW5lcjtcclxuICBncmlkOkdyaWRDZWxsW11bXTtcclxuICBkaW1YOm51bWJlcjsgLy8gZGltZW5zaW9uIG9mIGdhbWUgYm9hcmQgaW4gY2VsbHNcclxuICBkaW1ZOm51bWJlcjtcclxuXHJcbiAgY29uc3RydWN0b3Iod2lkdGg6bnVtYmVyLCBoZWlnaHQ6bnVtYmVyLCBzdGFnZTpQSVhJLkNvbnRhaW5lcikge1xyXG4gICAgdGhpcy5jb250YWluZXIgPSBuZXcgUElYSS5Db250YWluZXIoKTtcclxuICAgIHN0YWdlLmFkZENoaWxkKHRoaXMuY29udGFpbmVyKTtcclxuICAgIHRoaXMuY29udGFpbmVyLnggPSAxMDA7XHJcbiAgICB0aGlzLmNvbnRhaW5lci55ID0gNjA7XHJcbiAgICB0aGlzLmRpbVggPSB3aWR0aDtcclxuICAgIHRoaXMuZGltWSA9IGhlaWdodDtcclxuICAgIHRoaXMuZ3JpZCA9IFtdO1xyXG4gICAgZm9yICh2YXIgaiA9IDA7IGogPCBoZWlnaHQ7IGorKykge1xyXG4gICAgICB0aGlzLmdyaWRbal0gPSBbXTtcclxuICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCB3aWR0aDsgaSsrKSB7XHJcbiAgICAgICAgbGV0IG5ld0NlbGw6R3JpZENlbGwgPSBuZXcgR3JpZENlbGwoaSwgaiwgdGhpcy5jb250YWluZXIpO1xyXG4gICAgICAgIHRoaXMuZ3JpZFtqXVtpXSA9IG5ld0NlbGw7XHJcbiAgICAgIH07XHJcbiAgICB9XHJcbiAgICB0aGlzLnJlc2h1ZmZsZUFycm93cygpO1xyXG4gIH1cclxuXHJcbiAgc2V0TW91c2VGdW5jdGlvbnMob25CdXR0b25Eb3duOigpPT52b2lkLCBvbkJ1dHRvbk92ZXI6KCk9PnZvaWQsIG9uQnV0dG9uT3V0OigpPT52b2lkKSB7XHJcbiAgICBmb3IgKHZhciBqID0gMDsgaiA8IHRoaXMuZGltWTsgaisrKSB7XHJcbiAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5kaW1YOyBpKyspIHtcclxuICAgICAgICB0aGlzLmdyaWRbal1baV0uc2V0TW91c2VGdW5jdGlvbnMob25CdXR0b25Eb3duLCBvbkJ1dHRvbk92ZXIsIG9uQnV0dG9uT3V0KTtcclxuICAgICAgfTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIC8vIE1hcmtzIGFsbCBjZWxscyBhcyB1bnZpc2l0ZWRcclxuICByZXNldEFycm93cygpIHtcclxuICAgIGZvciAodmFyIGogPSAwOyBqIDwgdGhpcy5kaW1ZOyBqKyspIHtcclxuICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLmRpbVg7IGkrKykge1xyXG4gICAgICAgIHRoaXMuZ3JpZFtqXVtpXS5zZXRWaXNpdGVkKGZhbHNlKTtcclxuICAgICAgfTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIC8vIE1hcmtzIGFsbCBjZWxscyBhcyB1bnZpc2l0ZWQgYW5kIGNoYW5nZXMgYXJyb3cgZGlyZWN0aW9uc1xyXG4gIHJlc2h1ZmZsZUFycm93cygpIHtcclxuICAgIGZvciAodmFyIGogPSAwOyBqIDwgdGhpcy5kaW1ZOyBqKyspIHtcclxuICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLmRpbVg7IGkrKykge1xyXG4gICAgICAgIHRoaXMuZ3JpZFtqXVtpXS5zZXRWaXNpdGVkKGZhbHNlKTtcclxuICAgICAgICAvLyBJdCdzIGEgbGl0dGxlIGJvcmluZyB0byBoYXZlIHR3byBhcnJvd3MgcG9pbnRpbmcgYXQgZWFjaCBvdGhlciwgc28gcHJldmVudCB0aGF0XHJcbiAgICAgICAgbGV0IGFsbG93ZWREaXJlY3Rpb25zOmJvb2xlYW5bXSA9IFt0cnVlLCB0cnVlLCB0cnVlLCB0cnVlLCBmYWxzZV07XHJcbiAgICAgICAgLy8gSXMgdGhlIG9uZSBhYm92ZSBtZSBwb2ludGluZyBkb3duP1xyXG4gICAgICAgIGlmIChqID4gMCAmJiB0aGlzLmdyaWRbai0xXVtpXS5kaXJlY3Rpb24gPT0gMykge1xyXG4gICAgICAgICAgLy8gTm90IGFsbG93ZWQgdG8gcG9pbnQgc3RyYWlnaHQgdXBcclxuICAgICAgICAgIGFsbG93ZWREaXJlY3Rpb25zWzFdID0gZmFsc2U7XHJcbiAgICAgICAgICAvL2NvbnNvbGUubG9nKFwiRm9yYmlkZGVuIHVwIGF0IFwiICsgaSArIFwiLFwiICsgaik7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIC8vIElzIHRoZSBvbmUgdG8gbXkgbGVmdCBwb2ludGluZyByaWdodD9cclxuICAgICAgICBpZiAoaSA+IDAgJiYgdGhpcy5ncmlkW2pdW2ktMV0uZGlyZWN0aW9uID09IDIpIHtcclxuICAgICAgICAgIC8vIE5vdCBhbGxvd2VkIHRvIHBvaW50IGxlZnRcclxuICAgICAgICAgIGFsbG93ZWREaXJlY3Rpb25zWzBdID0gZmFsc2U7XHJcbiAgICAgICAgICAvL2NvbnNvbGUubG9nKFwiRm9yYmlkZGVuIGxlZnQgYXQgXCIgKyBpICsgXCIsXCIgKyBqKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgbGV0IHByb3Bvc2VkRGlyZWN0aW9uOm51bWJlciA9IDQ7IC8vIG5vdCBhIHZhbGlkIGRpcmVjdGlvbiwgc28gdGhlIGZpcnN0IHRlc3Qgd2lsbCBmYWlsXHJcbiAgICAgICAgd2hpbGUgKGFsbG93ZWREaXJlY3Rpb25zW3Byb3Bvc2VkRGlyZWN0aW9uXSA9PSBmYWxzZSlcclxuICAgICAgICB7XHJcbiAgICAgICAgICBwcm9wb3NlZERpcmVjdGlvbiA9IE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIDQuMCk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHRoaXMuZ3JpZFtqXVtpXS5zZXREaXJlY3Rpb24ocHJvcG9zZWREaXJlY3Rpb24pO1xyXG4gICAgICB9O1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgLy8gUmV0dXJucyByZWYgdG8gY2VsbCBhdCBwYXJ0aWN1bGFyIGdyaWQgbG9jYXRpb25cclxuICBnZXRDZWxsKGdyaWRYOm51bWJlciwgZ3JpZFk6bnVtYmVyKSB7XHJcbiAgICByZXR1cm4gdGhpcy5ncmlkW2dyaWRZXVtncmlkWF07XHJcbiAgfVxyXG59XHJcbiIsIi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi90eXBpbmdzL2luZGV4LmQudHNcIiAvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cImdyaWQudHNcIiAvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cImdhbWUudHNcIiAvPlxuXG5pbXBvcnQgZ3JpZEZpbGUgPSByZXF1aXJlKCcuL2dyaWQnKTtcbmltcG9ydCBnYW1lRmlsZSA9IHJlcXVpcmUoJy4vZ2FtZScpOyAvLyBcInJlcXVpcmVzIGdhbWVcIiwgaGFcbmltcG9ydCBQSVhJID0gcmVxdWlyZSgncGl4aS5qcycpO1xuY29uc3QgcmVuZGVyZXI6UElYSS5XZWJHTFJlbmRlcmVyID0gbmV3IFBJWEkuV2ViR0xSZW5kZXJlcigxMjgwLCA3MjApO1xuZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZChyZW5kZXJlci52aWV3KTtcblxubGV0IGNlbGxEaW06bnVtYmVyID0gNTA7XG5cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLyBHbG9iYWwgdmFycyBhbmQgYmFzaWMgc2V0dXBcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbi8vIEdyYXBoaWNhbCBjb250YWluZXJcblxuLy8gY3JlYXRlIHRoZSByb290IG9mIHRoZSBzY2VuZSBncmFwaFxudmFyIHN0YWdlID0gbmV3IFBJWEkuQ29udGFpbmVyKCk7XG5cbmxldCBnYW1lSW5zdGFuY2U6Z2FtZUZpbGUuVGhlR2FtZTtcblxuZG9TZXR1cCgpO1xuXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLy8gRnVuY3Rpb24gZGVmaW5pdGlvbnNcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbmZ1bmN0aW9uIHVwZGF0ZSgpIHtcbiAgICBnYW1lSW5zdGFuY2UudXBkYXRlKDAuMDEpOyAvLyBhZHZhbmNlIGNsb2NrIGJ5IDEvMTAwdGggb2YgYSBzZWNvbmRcbn1cblxuZnVuY3Rpb24gZG9TZXR1cCgpIHtcbiAgLy9jcmVhdGVHcmlkKCk7XG4gIGNvbnNvbGUubG9nKFwiVGVzdFwiKTtcbiAgZ2FtZUluc3RhbmNlID0gbmV3IGdhbWVGaWxlLlRoZUdhbWUoc3RhZ2UpO1xuICAvLyBBIGZ1bmN0aW9uIHRoYXQgdXBkYXRlcyBhIGh1bmRyZWQgdGltZXMgYSBzZWNvbmRcbiAgc2V0SW50ZXJ2YWwodXBkYXRlLCAxMCk7XG4gIGFuaW1hdGUoKTtcbn1cblxuZnVuY3Rpb24gYW5pbWF0ZSgpIHtcblxuICAgIHJlcXVlc3RBbmltYXRpb25GcmFtZShhbmltYXRlKTtcblxuICAgIC8vIHJlbmRlciB0aGUgcm9vdCBjb250YWluZXJcbiAgICByZW5kZXJlci5yZW5kZXIoc3RhZ2UpO1xufVxuIl19
