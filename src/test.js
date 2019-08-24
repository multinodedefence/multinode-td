var easystarjs = require('easystarjs');
var easystar = new easystarjs.js();

function createArray(length) {
    var arr = new Array(length || 0),
        i = length;

    if (arguments.length > 1) {
        var args = Array.prototype.slice.call(arguments, 1);
        while (i--) arr[length - 1 - i] = createArray.apply(this, args);
    }

    return arr;
}

// var grid = createArray(4, 3);
// console.log(grid);
// grid[2][0] = { x: 1, y: 1 };
// grid[2][1] = { x: 1, y: 1 };
// grid[3][1] = { x: 1, y: 1 };

var grid = [
    [0, 0, 0],
    [0, 0, 0],
    [1, 1, 0],
    [0, 1, 0]
];

// grid[y][x]

easystar.setGrid(grid);
easystar.setAcceptableTiles([0]);
easystar.findPath(0, 0, 2, 3, function(path) {
    if (path === null) {
        console.log("Path was not found.");
    } else {
        console.log(path);
        console.log(path[0].x)
    }
});
easystar.setIterationsPerCalculation(100);
easystar.calculate();