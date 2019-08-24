var easystarjs = require('easystarjs');
var easystar = new easystarjs.js();
var grid = [
    [0, 0, 0],
    [0, 0, 0]
    [1, 1, 1],
    [0, 1, 0]
];
grid[0][2] = 1;
grid[1][2] = 1;
grid[1][3] = 1;
grid[2][2] = 1;
easystar.setGrid(grid);
easystar.setAcceptableTiles([null]);
easystar.findPath(0, 0, 3, 2, function(path) {
    if (path === null) {
        console.log("Path was not found.");
    } else {
        console.log(path);
        console.log(path[0].x)
    }
});
easystar.setIterationsPerCalculation(7);
easystar.calculate();