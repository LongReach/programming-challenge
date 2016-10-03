(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.jiboProgrammingChallenge = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
/// <reference path="../typings/index.d.ts" />
"use strict";
var PIXI = require('pixi.js');
var renderer = new PIXI.WebGLRenderer(1280, 720);
document.body.appendChild(renderer.view);
// -----------------------
// Class definitions
// -----------------------
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
        this.sprite = arrow;
        this.direction = 0;
    }
    GridCell.prototype.setDirection = function (val) {
        var pi = 3.14159265;
        this.sprite.rotation = pi * val / 2.0;
        this.direction = val;
    };
    return GridCell;
}());
var GridCharacter = (function () {
    function GridCharacter(name, container) {
        this.sprite = PIXI.Sprite.fromImage(name);
        this.sprite.width = cellDim;
        this.sprite.height = cellDim;
        this.sprite.anchor.x = 0.5;
        this.sprite.anchor.y = 0.5;
        container.addChild(this.sprite);
        this.isMoving = false;
        this.restTimer = 0;
        this.moveTime = 1.0;
        this.state = "inactive";
    }
    GridCharacter.prototype.setPosition = function (i, j) {
        this.sprite.x = cellDim * (i + 0.5);
        this.sprite.y = cellDim * (j + 0.5);
        this.cellIndexDown = i;
        this.cellIndexRight = j;
        this.isMoving = false;
        this.isOnGrid = true;
        this.slideValue = 0;
        this.state = "active";
    };
    GridCharacter.prototype.readyToMove = function () {
        if (this.state != "active") {
            return false;
        }
        return (!this.isMoving && this.restTimer == 0);
    };
    GridCharacter.prototype.requestNewMove = function (direction) {
        if (this.state != "active") {
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
    GridCharacter.prototype.setState = function (state) {
        if (this.state == state) {
            return;
        }
        console.log("state to " + state);
        this.state = state;
        if (state == "frozen") {
            this.slideValue = 0;
        }
        else if (state == "dying") {
            this.slideValue = 1;
        }
        else if (state == "explode") {
            this.slideValue = 1;
        }
    };
    GridCharacter.prototype.update = function (deltaT) {
        if (this.state == "active") {
            this.sprite.x = cellDim * (this.cellIndexRight + 0.5 + this.xMovementDir * this.slideValue);
            this.sprite.y = cellDim * (this.cellIndexDown + 0.5 + this.yMovementDir * this.slideValue);
            if (this.isMoving) {
                // it takes half a second to move one square
                this.slideValue = this.slideValue + deltaT / this.moveTime;
                if (this.slideValue > 1.0) {
                    // We've arrived
                    this.cellIndexRight = this.cellIndexRight + this.xMovementDir;
                    this.cellIndexDown = this.cellIndexDown + this.yMovementDir;
                    this.slideValue = 0;
                    this.xMovementDir = 0.0;
                    this.yMovementDir = 0.0;
                    this.isMoving = false;
                    this.restTimer = this.moveTime;
                }
            }
            else if (this.restTimer > 0) {
                this.restTimer = this.restTimer - deltaT;
                if (this.restTimer < 0) {
                    this.restTimer = 0;
                }
            }
        } // end if active state
        else if (this.state == "frozen") {
            // sine wave effect
            this.sprite.alpha = 0.5 + 0.5 * Math.cos(this.slideValue);
            this.slideValue = this.slideValue + deltaT * 4;
        }
        else if (this.state == "dying") {
            // fade and shrink effect
            this.sprite.alpha = this.slideValue;
            this.sprite.width = cellDim * (0.5 + this.slideValue / 2);
            this.sprite.height = cellDim * (0.5 + this.slideValue / 2);
            this.slideValue = this.slideValue - deltaT / (this.moveTime * 4.0);
            if (this.slideValue <= 0.0) {
                this.setState("inactive");
            }
        }
        else if (this.state == "explode") {
            // burst and fade effect
            this.sprite.alpha = this.slideValue;
            this.sprite.width = cellDim * (1.0 + (3.0 - this.slideValue * 3.0));
            this.sprite.height = cellDim * (1.0 + (3.0 - this.slideValue * 3.0));
            this.slideValue = this.slideValue - deltaT / (this.moveTime * 4.0);
            if (this.slideValue <= 0.0) {
                this.slideValue = 1; // keep exploding forever
            }
        }
    };
    return GridCharacter;
}());
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
                    console.log("Forbidden direction of " + proposedDirection + " at " + i + "," + j);
                    proposedDirection = Math.floor(Math.random() * 4.0);
                    console.log("  switching to " + proposedDirection);
                }
                newCell.setDirection(proposedDirection);
                this.grid[j][i] = newCell;
            }
            ;
        }
        ;
        //let startPosX:number = Math.floor(Math.random() * this.dimX);
        //let startPosY:number = Math.floor(Math.random() * this.dimY);
        var startPosX = 2 + Math.floor(Math.random() * 5);
        var startPosY = 2 + Math.floor(Math.random() * 5);
        this.checkerCharacter = new GridCharacter('images/red-checker.png', this.container);
        this.checkerCharacter.moveTime = 0.5;
        this.checkerCharacter.setPosition(startPosX, startPosY);
        this.checkMarkCharacter = new GridCharacter('images/green-check-mark.png', this.container);
        this.checkMarkCharacter.moveTime = 0.25;
        this.checkMarkCharacter.setPosition(startPosX, startPosY);
    }
    ArrowGrid.prototype.update = function (deltaT) {
        var characters = [this.checkerCharacter, this.checkMarkCharacter];
        for (var _i = 0, characters_1 = characters; _i < characters_1.length; _i++) {
            var char = characters_1[_i];
            char.update(deltaT);
            if (char.readyToMove()) {
                if (char.cellIndexDown < 0 || char.cellIndexDown >= this.dimY ||
                    char.cellIndexRight < 0 || char.cellIndexRight >= this.dimX) {
                    char.isOnGrid = false;
                }
                else {
                    char.requestNewMove(this.grid[char.cellIndexDown][char.cellIndexRight].direction);
                }
            }
        } // end for
        if (!this.checkerCharacter.isOnGrid) {
            this.checkerCharacter.setState("frozen");
        }
        if (!this.checkMarkCharacter.isOnGrid) {
            this.checkMarkCharacter.setState("dying");
        }
        else if (!characters[0].isMoving && !characters[1].isMoving &&
            characters[0].cellIndexDown == characters[1].cellIndexDown &&
            characters[0].cellIndexRight == characters[1].cellIndexRight) {
            this.checkerCharacter.setState("frozen");
            this.checkMarkCharacter.setState("explode");
        }
    };
    return ArrowGrid;
}());
// -----------------------
// Global vars and basic setup
// -----------------------
// Graphical container
// create the root of the scene graph
var stage = new PIXI.Container();
// Array and dimensions for the grid
var cellDim = 50;
var theGrid;
doSetup();
// -----------------------
// Function definitions
// -----------------------
function update() {
    theGrid.update(0.01);
}
function doSetup() {
    //createGrid();
    console.log("Test");
    theGrid = new ArrowGrid(10, 10);
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQSw4Q0FBOEM7O0FBRTlDLElBQU8sSUFBSSxXQUFXLFNBQVMsQ0FBQyxDQUFDO0FBQ2pDLElBQU0sUUFBUSxHQUFzQixJQUFJLElBQUksQ0FBQyxhQUFhLENBQUMsSUFBSSxFQUFFLEdBQUcsQ0FBQyxDQUFDO0FBQ3RFLFFBQVEsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQztBQUV6QywwQkFBMEI7QUFDMUIsb0JBQW9CO0FBQ3BCLDBCQUEwQjtBQUUxQjtJQUtFLGtCQUFZLENBQVEsRUFBRSxDQUFRLEVBQUUsU0FBd0I7UUFDdEQsSUFBSSxLQUFLLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsdUJBQXVCLENBQUMsQ0FBQztRQUMzRCxLQUFLLENBQUMsQ0FBQyxHQUFHLE9BQU8sR0FBRyxDQUFDLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQztRQUM5QixLQUFLLENBQUMsQ0FBQyxHQUFHLE9BQU8sR0FBRyxDQUFDLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQztRQUM5QixLQUFLLENBQUMsS0FBSyxHQUFHLE9BQU8sQ0FBQztRQUN0QixLQUFLLENBQUMsTUFBTSxHQUFHLE9BQU8sQ0FBQztRQUN2QixLQUFLLENBQUMsTUFBTSxDQUFDLENBQUMsR0FBRyxHQUFHLENBQUM7UUFDckIsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDLEdBQUcsR0FBRyxDQUFDO1FBQ3JCLFNBQVMsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDMUIsSUFBSSxDQUFDLE1BQU0sR0FBRyxLQUFLLENBQUM7UUFDcEIsSUFBSSxDQUFDLFNBQVMsR0FBRyxDQUFDLENBQUM7SUFDckIsQ0FBQztJQUVELCtCQUFZLEdBQVos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QUksQ0FBQyxTQUFTLEVBQUUsQ0FBQztBQUVqQyxvQ0FBb0M7QUFDcEMsSUFBSSxPQUFPLEdBQVUsRUFBRSxDQUFDO0FBRXhCLElBQUksT0FBaUIsQ0FBQztBQUV0QixPQUFPLEVBQUUsQ0FBQztBQUVWLDBCQUEwQjtBQUMxQix1QkFBdUI7QUFDdkIsMEJBQTBCO0FBRTFCO0lBQ0ksT0FBTyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQztBQUN6QixDQUFDO0FBRUQ7SUFDRSxlQUFlO0lBQ2YsT0FBTyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQztJQUNwQixPQUFPLEdBQUcsSUFBSSxTQUFTLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDO0lBQ2hDLFdBQVcsQ0FBQyxNQUFNLEVBQUUsRUFBRSxDQUFDLENBQUM7SUFDeEIsT0FBTyxFQUFFLENBQUM7QUFDWixDQUFDO0FBRUQ7SUFFSSxxQkFBcUIsQ0FBQyxPQUFPLENBQUMsQ0FBQztJQUUvQiw0QkFBNEI7SUFDNUIsUUFBUSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQztBQUMzQixDQUFDIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi90eXBpbmdzL2luZGV4LmQudHNcIiAvPlxuXG5pbXBvcnQgUElYSSA9IHJlcXVpcmUoJ3BpeGkuanMnKTtcbmNvbnN0IHJlbmRlcmVyOlBJWEkuV2ViR0xSZW5kZXJlciA9IG5ldyBQSVhJLldlYkdMUmVuZGVyZXIoMTI4MCwgNzIwKTtcbmRvY3VtZW50LmJvZHkuYXBwZW5kQ2hpbGQocmVuZGVyZXIudmlldyk7XG5cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLyBDbGFzcyBkZWZpbml0aW9uc1xuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuY2xhc3MgR3JpZENlbGwge1xuICBzcHJpdGU6UElYSS5TcHJpdGU7XG4gIC8vIEFycm93J3MgZmFjaW5nIGRpcmVjdGlvbjogMD1sZWZ0LCAxPXVwLCAyPXJpZ2h0LCAzPWRvd25cbiAgZGlyZWN0aW9uOm51bWJlcjtcblxuICBjb25zdHJ1Y3RvcihpOm51bWJlciwgajpudW1iZXIsIGNvbnRhaW5lcjpQSVhJLkNvbnRhaW5lcikge1xuICAgIHZhciBhcnJvdyA9IFBJWEkuU3ByaXRlLmZyb21JbWFnZSgnaW1hZ2VzL2Fycm93LWljb24ucG5nJyk7XG4gICAgYXJyb3cueCA9IGNlbGxEaW0gKiAoaSArIDAuNSk7XG4gICAgYXJyb3cueSA9IGNlbGxEaW0gKiAoaiArIDAuNSk7XG4gICAgYXJyb3cud2lkdGggPSBjZWxsRGltO1xuICAgIGFycm93LmhlaWdodCA9IGNlbGxEaW07XG4gICAgYXJyb3cuYW5jaG9yLnggPSAwLjU7XG4gICAgYXJyb3cuYW5jaG9yLnkgPSAwLjU7XG4gICAgY29udGFpbmVyLmFkZENoaWxkKGFycm93KTtcbiAgICB0aGlzLnNwcml0ZSA9IGFycm93O1xuICAgIHRoaXMuZGlyZWN0aW9uID0gMDtcbiAgfVxuXG4gIHNldERpcmVjdGlvbih2YWwpIHtcbiAgICBjb25zdCBwaSA9IDMuMTQxNTkyNjU7XG4gICAgdGhpcy5zcHJpdGUucm90YXRpb24gPSBwaSAqIHZhbCAvIDIuMDtcbiAgICB0aGlzLmRpcmVjdGlvbiA9IHZhbDtcbiAgfVxufVxuXG5jbGFzcyBHcmlkQ2hhcmFjdGVyIHtcbiAgc3ByaXRlOlBJWEkuU3ByaXRlO1xuICBjZWxsSW5kZXhSaWdodDpudW1iZXI7XG4gIGNlbGxJbmRleERvd246bnVtYmVyO1xuICB4TW92ZW1lbnREaXI6bnVtYmVyO1xuICB5TW92ZW1lbnREaXI6bnVtYmVyO1xuXG4gIHNsaWRlVmFsdWU6bnVtYmVyO1xuICByZXN0VGltZXI6bnVtYmVyO1xuICBtb3ZlVGltZTpudW1iZXI7XG5cbiAgaXNNb3Zpbmc6Ym9vbGVhbjtcbiAgaXNPbkdyaWQ6Ym9vbGVhbjtcbiAgc3RhdGU6c3RyaW5nO1xuXG4gIGNvbnN0cnVjdG9yKG5hbWU6c3RyaW5nLCBjb250YWluZXI6UElYSS5Db250YWluZXIpIHtcbiAgICB0aGlzLnNwcml0ZSA9IFBJWEkuU3ByaXRlLmZyb21JbWFnZShuYW1lKTtcbiAgICB0aGlzLnNwcml0ZS53aWR0aCA9IGNlbGxEaW07XG4gICAgdGhpcy5zcHJpdGUuaGVpZ2h0ID0gY2VsbERpbTtcbiAgICB0aGlzLnNwcml0ZS5hbmNob3IueCA9IDAuNTtcbiAgICB0aGlzLnNwcml0ZS5hbmNob3IueSA9IDAuNTtcbiAgICBjb250YWluZXIuYWRkQ2hpbGQodGhpcy5zcHJpdGUpO1xuXG4gICAgdGhpcy5pc01vdmluZyA9IGZhbHNlO1xuICAgIHRoaXMucmVzdFRpbWVyID0gMDtcbiAgICB0aGlzLm1vdmVUaW1lID0gMS4wO1xuICAgIHRoaXMuc3RhdGUgPSBcImluYWN0aXZlXCI7XG4gIH1cblxuICBzZXRQb3NpdGlvbihpOm51bWJlciwgajpudW1iZXIpIHtcbiAgICB0aGlzLnNwcml0ZS54ID0gY2VsbERpbSAqIChpICsgMC41KTtcbiAgICB0aGlzLnNwcml0ZS55ID0gY2VsbERpbSAqIChqICsgMC41KTtcbiAgICB0aGlzLmNlbGxJbmRleERvd24gPSBpO1xuICAgIHRoaXMuY2VsbEluZGV4UmlnaHQgPSBqO1xuICAgIHRoaXMuaXNNb3ZpbmcgPSBmYWxzZTtcbiAgICB0aGlzLmlzT25HcmlkID0gdHJ1ZTtcbiAgICB0aGlzLnNsaWRlVmFsdWUgPSAwO1xuICAgIHRoaXMuc3RhdGUgPSBcImFjdGl2ZVwiO1xuICB9XG5cbiAgcmVhZHlUb01vdmUoKSB7XG4gICAgaWYgKHRoaXMuc3RhdGUgIT0gXCJhY3RpdmVcIikge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIHJldHVybiAoIXRoaXMuaXNNb3ZpbmcgJiYgdGhpcy5yZXN0VGltZXIgPT0gMCk7XG4gIH1cblxuICByZXF1ZXN0TmV3TW92ZShkaXJlY3Rpb24pIHtcbiAgICBpZiAodGhpcy5zdGF0ZSAhPSBcImFjdGl2ZVwiKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGlmICh0aGlzLmlzTW92aW5nKSB7XG4gICAgICByZXR1cm47IC8vIGNhbid0IGNoYW5nZSB3aGlsZSBhbHJlYWR5IG1vdmluZ1xuICAgIH1cbiAgICBpZiAoZGlyZWN0aW9uID09IDApIC8vIGxlZnRcbiAgICB7XG4gICAgICB0aGlzLnhNb3ZlbWVudERpciA9IC0xLjA7XG4gICAgICB0aGlzLnlNb3ZlbWVudERpciA9ICAwLjA7XG4gICAgfVxuICAgIGVsc2UgaWYgKGRpcmVjdGlvbiA9PSAxKSAvLyB1cFxuICAgIHtcbiAgICAgIHRoaXMueE1vdmVtZW50RGlyID0gIDAuMDtcbiAgICAgIHRoaXMueU1vdmVtZW50RGlyID0gLTEuMDtcbiAgICB9XG4gICAgZWxzZSBpZiAoZGlyZWN0aW9uID09IDIpIC8vIHJpZ2h0XG4gICAge1xuICAgICAgdGhpcy54TW92ZW1lbnREaXIgPSAgMS4wO1xuICAgICAgdGhpcy55TW92ZW1lbnREaXIgPSAgMC4wO1xuICAgIH1cbiAgICBlbHNlICAvLyBkb3duXG4gICAge1xuICAgICAgdGhpcy54TW92ZW1lbnREaXIgPSAgMC4wO1xuICAgICAgdGhpcy55TW92ZW1lbnREaXIgPSAgMS4wO1xuICAgIH1cbiAgICB0aGlzLnNsaWRlVmFsdWUgPSAwO1xuICAgIHRoaXMuaXNNb3ZpbmcgPSB0cnVlO1xuICB9XG5cbiAgc2V0U3RhdGUoc3RhdGU6c3RyaW5nKSB7XG4gICAgaWYgKHRoaXMuc3RhdGUgPT0gc3RhdGUpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgY29uc29sZS5sb2coXCJzdGF0ZSB0byBcIiArIHN0YXRlKTtcbiAgICB0aGlzLnN0YXRlID0gc3RhdGU7XG4gICAgaWYgKHN0YXRlID09IFwiZnJvemVuXCIpIHtcbiAgICAgIHRoaXMuc2xpZGVWYWx1ZSA9IDA7XG4gICAgfVxuICAgIGVsc2UgaWYgKHN0YXRlID09IFwiZHlpbmdcIikge1xuICAgICAgdGhpcy5zbGlkZVZhbHVlID0gMTtcbiAgICB9XG4gICAgZWxzZSBpZiAoc3RhdGUgPT0gXCJleHBsb2RlXCIpIHtcbiAgICAgIHRoaXMuc2xpZGVWYWx1ZSA9IDE7XG4gICAgfVxuICB9XG5cbiAgdXBkYXRlKGRlbHRhVCkge1xuICAgIGlmICh0aGlzLnN0YXRlID09IFwiYWN0aXZlXCIpIHtcbiAgICAgIHRoaXMuc3ByaXRlLnggPSBjZWxsRGltICogKHRoaXMuY2VsbEluZGV4UmlnaHQgKyAwLjUgKyB0aGlzLnhNb3ZlbWVudERpciAqIHRoaXMuc2xpZGVWYWx1ZSk7XG4gICAgICB0aGlzLnNwcml0ZS55ID0gY2VsbERpbSAqICh0aGlzLmNlbGxJbmRleERvd24gKyAwLjUgKyB0aGlzLnlNb3ZlbWVudERpciAqIHRoaXMuc2xpZGVWYWx1ZSk7XG4gICAgICBpZiAodGhpcy5pc01vdmluZykge1xuICAgICAgICAvLyBpdCB0YWtlcyBoYWxmIGEgc2Vjb25kIHRvIG1vdmUgb25lIHNxdWFyZVxuICAgICAgICB0aGlzLnNsaWRlVmFsdWUgPSB0aGlzLnNsaWRlVmFsdWUgKyBkZWx0YVQgLyB0aGlzLm1vdmVUaW1lO1xuICAgICAgICBpZiAodGhpcy5zbGlkZVZhbHVlID4gMS4wKVxuICAgICAgICB7XG4gICAgICAgICAgLy8gV2UndmUgYXJyaXZlZFxuICAgICAgICAgIHRoaXMuY2VsbEluZGV4UmlnaHQgPSB0aGlzLmNlbGxJbmRleFJpZ2h0ICsgdGhpcy54TW92ZW1lbnREaXI7XG4gICAgICAgICAgdGhpcy5jZWxsSW5kZXhEb3duID0gdGhpcy5jZWxsSW5kZXhEb3duICsgdGhpcy55TW92ZW1lbnREaXI7XG4gICAgICAgICAgdGhpcy5zbGlkZVZhbHVlID0gMDtcbiAgICAgICAgICB0aGlzLnhNb3ZlbWVudERpciA9IDAuMDtcbiAgICAgICAgICB0aGlzLnlNb3ZlbWVudERpciA9IDAuMDtcbiAgICAgICAgICB0aGlzLmlzTW92aW5nID0gZmFsc2U7XG4gICAgICAgICAgdGhpcy5yZXN0VGltZXIgPSB0aGlzLm1vdmVUaW1lO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBlbHNlIGlmICh0aGlzLnJlc3RUaW1lciA+IDApXG4gICAgICB7XG4gICAgICAgIHRoaXMucmVzdFRpbWVyID0gdGhpcy5yZXN0VGltZXIgLSBkZWx0YVQ7XG4gICAgICAgIGlmICh0aGlzLnJlc3RUaW1lciA8IDApIHtcbiAgICAgICAgICB0aGlzLnJlc3RUaW1lciA9IDA7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9IC8vIGVuZCBpZiBhY3RpdmUgc3RhdGVcbiAgICBlbHNlIGlmICh0aGlzLnN0YXRlID09IFwiZnJvemVuXCIpIHtcbiAgICAgIC8vIHNpbmUgd2F2ZSBlZmZlY3RcbiAgICAgIHRoaXMuc3ByaXRlLmFscGhhID0gMC41ICsgMC41ICogTWF0aC5jb3ModGhpcy5zbGlkZVZhbHVlKTtcbiAgICAgIHRoaXMuc2xpZGVWYWx1ZSA9IHRoaXMuc2xpZGVWYWx1ZSArIGRlbHRhVCAqIDQ7XG4gICAgfVxuICAgIGVsc2UgaWYgKHRoaXMuc3RhdGUgPT0gXCJkeWluZ1wiKSB7XG4gICAgICAvLyBmYWRlIGFuZCBzaHJpbmsgZWZmZWN0XG4gICAgICB0aGlzLnNwcml0ZS5hbHBoYSA9IHRoaXMuc2xpZGVWYWx1ZTtcbiAgICAgIHRoaXMuc3ByaXRlLndpZHRoID0gY2VsbERpbSAqICgwLjUgKyB0aGlzLnNsaWRlVmFsdWUgLyAyKTtcbiAgICAgIHRoaXMuc3ByaXRlLmhlaWdodCA9IGNlbGxEaW0gKiAoMC41ICsgdGhpcy5zbGlkZVZhbHVlIC8gMik7XG4gICAgICB0aGlzLnNsaWRlVmFsdWUgPSB0aGlzLnNsaWRlVmFsdWUgLSBkZWx0YVQgLyAodGhpcy5tb3ZlVGltZSAqIDQuMCk7XG4gICAgICBpZiAodGhpcy5zbGlkZVZhbHVlIDw9IDAuMCkge1xuICAgICAgICB0aGlzLnNldFN0YXRlKFwiaW5hY3RpdmVcIik7XG4gICAgICB9XG4gICAgfVxuICAgIGVsc2UgaWYgKHRoaXMuc3RhdGUgPT0gXCJleHBsb2RlXCIpIHtcbiAgICAgIC8vIGJ1cnN0IGFuZCBmYWRlIGVmZmVjdFxuICAgICAgdGhpcy5zcHJpdGUuYWxwaGEgPSB0aGlzLnNsaWRlVmFsdWU7XG4gICAgICB0aGlzLnNwcml0ZS53aWR0aCA9IGNlbGxEaW0gKiAoMS4wICsgKDMuMCAtIHRoaXMuc2xpZGVWYWx1ZSAqIDMuMCkpO1xuICAgICAgdGhpcy5zcHJpdGUuaGVpZ2h0ID0gY2VsbERpbSAqICgxLjAgKyAoMy4wIC0gdGhpcy5zbGlkZVZhbHVlICogMy4wKSk7XG4gICAgICB0aGlzLnNsaWRlVmFsdWUgPSB0aGlzLnNsaWRlVmFsdWUgLSBkZWx0YVQgLyAodGhpcy5tb3ZlVGltZSAqIDQuMCk7XG4gICAgICBpZiAodGhpcy5zbGlkZVZhbHVlIDw9IDAuMCkge1xuICAgICAgICB0aGlzLnNsaWRlVmFsdWUgPSAxOyAvLyBrZWVwIGV4cGxvZGluZyBmb3JldmVyXG4gICAgICB9XG4gICAgfVxuICB9XG59XG5cbmNsYXNzIEFycm93R3JpZCB7XG4gIGNvbnRhaW5lcjpQSVhJLkNvbnRhaW5lcjtcbiAgZ3JpZDpHcmlkQ2VsbFtdW107XG4gIGRpbVg6bnVtYmVyO1xuICBkaW1ZOm51bWJlcjtcblxuICBjaGVja2VyQ2hhcmFjdGVyOkdyaWRDaGFyYWN0ZXI7XG4gIGNoZWNrTWFya0NoYXJhY3RlcjpHcmlkQ2hhcmFjdGVyO1xuXG4gIGNvbnN0cnVjdG9yKHdpZHRoOm51bWJlciwgaGVpZ2h0Om51bWJlcikge1xuICAgIHRoaXMuY29udGFpbmVyID0gbmV3IFBJWEkuQ29udGFpbmVyKCk7XG4gICAgc3RhZ2UuYWRkQ2hpbGQodGhpcy5jb250YWluZXIpO1xuICAgIHRoaXMuY29udGFpbmVyLnggPSAxMDA7XG4gICAgdGhpcy5jb250YWluZXIueSA9IDYwO1xuICAgIHRoaXMuZGltWCA9IHdpZHRoO1xuICAgIHRoaXMuZGltWSA9IGhlaWdodDtcbiAgICB0aGlzLmdyaWQgPSBbXTtcbiAgICBmb3IgKHZhciBqID0gMDsgaiA8IGhlaWdodDsgaisrKSB7XG4gICAgICAgIHRoaXMuZ3JpZFtqXSA9IFtdO1xuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHdpZHRoOyBpKyspIHtcbiAgICAgICAgICBsZXQgbmV3Q2VsbDpHcmlkQ2VsbCA9IG5ldyBHcmlkQ2VsbChpLCBqLCB0aGlzLmNvbnRhaW5lcik7XG4gICAgICAgICAgLy8gSXQncyBhIGxpdHRsZSBib3JpbmcgdG8gaGF2ZSB0d28gYXJyb3dzIHBvaW50aW5nIGF0IGVhY2ggb3RoZXIsIHNvIHByZXZlbnQgdGhhdFxuICAgICAgICAgIGxldCBhbGxvd2VkRGlyZWN0aW9uczpib29sZWFuW10gPSBbdHJ1ZSwgdHJ1ZSwgdHJ1ZSwgdHJ1ZSwgZmFsc2VdO1xuICAgICAgICAgIC8vIElzIHRoZSBvbmUgYWJvdmUgbWUgcG9pbnRpbmcgZG93bj9cbiAgICAgICAgICBpZiAoaiA+IDAgJiYgdGhpcy5ncmlkW2otMV1baV0uZGlyZWN0aW9uID09IDMpIHtcbiAgICAgICAgICAgIC8vIE5vdCBhbGxvd2VkIHRvIHBvaW50IHN0cmFpZ2h0IHVwXG4gICAgICAgICAgICBhbGxvd2VkRGlyZWN0aW9uc1sxXSA9IGZhbHNlO1xuICAgICAgICAgICAgLy9jb25zb2xlLmxvZyhcIkZvcmJpZGRlbiB1cCBhdCBcIiArIGkgKyBcIixcIiArIGopO1xuICAgICAgICAgIH1cbiAgICAgICAgICAvLyBJcyB0aGUgb25lIHRvIG15IGxlZnQgcG9pbnRpbmcgcmlnaHQ/XG4gICAgICAgICAgaWYgKGkgPiAwICYmIHRoaXMuZ3JpZFtqXVtpLTFdLmRpcmVjdGlvbiA9PSAyKSB7XG4gICAgICAgICAgICAvLyBOb3QgYWxsb3dlZCB0byBwb2ludCBsZWZ0XG4gICAgICAgICAgICBhbGxvd2VkRGlyZWN0aW9uc1swXSA9IGZhbHNlO1xuICAgICAgICAgICAgLy9jb25zb2xlLmxvZyhcIkZvcmJpZGRlbiBsZWZ0IGF0IFwiICsgaSArIFwiLFwiICsgaik7XG4gICAgICAgICAgfVxuICAgICAgICAgIGxldCBwcm9wb3NlZERpcmVjdGlvbjpudW1iZXIgPSA0OyAvLyBub3QgYSB2YWxpZCBkaXJlY3Rpb24sIHNvIHRoZSBmaXJzdCB0ZXN0IHdpbGwgZmFpbFxuICAgICAgICAgIHdoaWxlIChhbGxvd2VkRGlyZWN0aW9uc1twcm9wb3NlZERpcmVjdGlvbl0gPT0gZmFsc2UpXG4gICAgICAgICAge1xuICAgICAgICAgICAgY29uc29sZS5sb2coXCJGb3JiaWRkZW4gZGlyZWN0aW9uIG9mIFwiICsgcHJvcG9zZWREaXJlY3Rpb24gKyBcIiBhdCBcIiArIGkgKyBcIixcIiArIGopO1xuICAgICAgICAgICAgcHJvcG9zZWREaXJlY3Rpb24gPSBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiA0LjApO1xuICAgICAgICAgICAgY29uc29sZS5sb2coXCIgIHN3aXRjaGluZyB0byBcIiArIHByb3Bvc2VkRGlyZWN0aW9uKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgbmV3Q2VsbC5zZXREaXJlY3Rpb24ocHJvcG9zZWREaXJlY3Rpb24pO1xuICAgICAgICAgIHRoaXMuZ3JpZFtqXVtpXSA9IG5ld0NlbGw7XG4gICAgICAgIH07XG4gICAgfTtcblxuICAgIC8vbGV0IHN0YXJ0UG9zWDpudW1iZXIgPSBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiB0aGlzLmRpbVgpO1xuICAgIC8vbGV0IHN0YXJ0UG9zWTpudW1iZXIgPSBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiB0aGlzLmRpbVkpO1xuICAgIGxldCBzdGFydFBvc1g6bnVtYmVyID0gMiArIE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIDUpO1xuICAgIGxldCBzdGFydFBvc1k6bnVtYmVyID0gMiArIE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIDUpO1xuICAgIHRoaXMuY2hlY2tlckNoYXJhY3RlciA9IG5ldyBHcmlkQ2hhcmFjdGVyKCdpbWFnZXMvcmVkLWNoZWNrZXIucG5nJywgdGhpcy5jb250YWluZXIpO1xuICAgIHRoaXMuY2hlY2tlckNoYXJhY3Rlci5tb3ZlVGltZSA9IDAuNTtcbiAgICB0aGlzLmNoZWNrZXJDaGFyYWN0ZXIuc2V0UG9zaXRpb24oc3RhcnRQb3NYLCBzdGFydFBvc1kpO1xuICAgIHRoaXMuY2hlY2tNYXJrQ2hhcmFjdGVyID0gbmV3IEdyaWRDaGFyYWN0ZXIoJ2ltYWdlcy9ncmVlbi1jaGVjay1tYXJrLnBuZycsIHRoaXMuY29udGFpbmVyKTtcbiAgICB0aGlzLmNoZWNrTWFya0NoYXJhY3Rlci5tb3ZlVGltZSA9IDAuMjU7XG4gICAgdGhpcy5jaGVja01hcmtDaGFyYWN0ZXIuc2V0UG9zaXRpb24oc3RhcnRQb3NYLCBzdGFydFBvc1kpO1xuICB9XG5cbiAgdXBkYXRlKGRlbHRhVDpudW1iZXIpIHtcbiAgICBsZXQgY2hhcmFjdGVyczpHcmlkQ2hhcmFjdGVyW10gPSBbdGhpcy5jaGVja2VyQ2hhcmFjdGVyLCB0aGlzLmNoZWNrTWFya0NoYXJhY3Rlcl07XG5cbiAgICBmb3IgKGxldCBjaGFyIG9mIGNoYXJhY3RlcnMpIHtcbiAgICAgIGNoYXIudXBkYXRlKGRlbHRhVCk7XG4gICAgICBpZiAoY2hhci5yZWFkeVRvTW92ZSgpKSB7XG4gICAgICAgIGlmIChjaGFyLmNlbGxJbmRleERvd24gPCAwIHx8IGNoYXIuY2VsbEluZGV4RG93biA+PSB0aGlzLmRpbVkgfHxcbiAgICAgICAgICBjaGFyLmNlbGxJbmRleFJpZ2h0IDwgMCB8fCBjaGFyLmNlbGxJbmRleFJpZ2h0ID49IHRoaXMuZGltWCkge1xuICAgICAgICAgIGNoYXIuaXNPbkdyaWQgPSBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlXG4gICAgICAgIHtcbiAgICAgICAgICBjaGFyLnJlcXVlc3ROZXdNb3ZlKHRoaXMuZ3JpZFtjaGFyLmNlbGxJbmRleERvd25dW2NoYXIuY2VsbEluZGV4UmlnaHRdLmRpcmVjdGlvbik7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9IC8vIGVuZCBmb3JcblxuICAgIGlmICghdGhpcy5jaGVja2VyQ2hhcmFjdGVyLmlzT25HcmlkKSB7XG4gICAgICB0aGlzLmNoZWNrZXJDaGFyYWN0ZXIuc2V0U3RhdGUoXCJmcm96ZW5cIik7XG4gICAgfVxuICAgIGlmICghdGhpcy5jaGVja01hcmtDaGFyYWN0ZXIuaXNPbkdyaWQpIHtcbiAgICAgIHRoaXMuY2hlY2tNYXJrQ2hhcmFjdGVyLnNldFN0YXRlKFwiZHlpbmdcIik7XG4gICAgfVxuICAgIC8vIEFyZSBib3RoIHBpZWNlcyBvbiB0aGUgc2FtZSBzcXVhcmU/IElmIHNvLCB0aGUgZmFzdGVyLW1vdmluZyBvbmUgaGFzIGNhdWdodCB1cCB3aXRoXG4gICAgLy8gdGhlIHNsb3dlci5cbiAgICBlbHNlIGlmICghY2hhcmFjdGVyc1swXS5pc01vdmluZyAmJiAhY2hhcmFjdGVyc1sxXS5pc01vdmluZyAmJlxuICAgICAgY2hhcmFjdGVyc1swXS5jZWxsSW5kZXhEb3duID09IGNoYXJhY3RlcnNbMV0uY2VsbEluZGV4RG93biAmJlxuICAgICAgY2hhcmFjdGVyc1swXS5jZWxsSW5kZXhSaWdodCA9PSBjaGFyYWN0ZXJzWzFdLmNlbGxJbmRleFJpZ2h0KSB7XG4gICAgICAgIHRoaXMuY2hlY2tlckNoYXJhY3Rlci5zZXRTdGF0ZShcImZyb3plblwiKTtcbiAgICAgICAgdGhpcy5jaGVja01hcmtDaGFyYWN0ZXIuc2V0U3RhdGUoXCJleHBsb2RlXCIpO1xuICAgIH1cbiAgfVxufVxuXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLy8gR2xvYmFsIHZhcnMgYW5kIGJhc2ljIHNldHVwXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4vLyBHcmFwaGljYWwgY29udGFpbmVyXG5cbi8vIGNyZWF0ZSB0aGUgcm9vdCBvZiB0aGUgc2NlbmUgZ3JhcGhcbnZhciBzdGFnZSA9IG5ldyBQSVhJLkNvbnRhaW5lcigpO1xuXG4vLyBBcnJheSBhbmQgZGltZW5zaW9ucyBmb3IgdGhlIGdyaWRcbmxldCBjZWxsRGltOm51bWJlciA9IDUwO1xuXG5sZXQgdGhlR3JpZDpBcnJvd0dyaWQ7XG5cbmRvU2V0dXAoKTtcblxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8vIEZ1bmN0aW9uIGRlZmluaXRpb25zXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG5mdW5jdGlvbiB1cGRhdGUoKSB7XG4gICAgdGhlR3JpZC51cGRhdGUoMC4wMSk7XG59XG5cbmZ1bmN0aW9uIGRvU2V0dXAoKSB7XG4gIC8vY3JlYXRlR3JpZCgpO1xuICBjb25zb2xlLmxvZyhcIlRlc3RcIik7XG4gIHRoZUdyaWQgPSBuZXcgQXJyb3dHcmlkKDEwLCAxMCk7XG4gIHNldEludGVydmFsKHVwZGF0ZSwgMTApO1xuICBhbmltYXRlKCk7XG59XG5cbmZ1bmN0aW9uIGFuaW1hdGUoKSB7XG5cbiAgICByZXF1ZXN0QW5pbWF0aW9uRnJhbWUoYW5pbWF0ZSk7XG5cbiAgICAvLyByZW5kZXIgdGhlIHJvb3QgY29udGFpbmVyXG4gICAgcmVuZGVyZXIucmVuZGVyKHN0YWdlKTtcbn1cbiJdfQ==
