var PF = require("pathfinding")
var finder = new PF.AStarFinder();
var grid = new PF.Grid(3, 3); 

grid.setWalkableAt(1,1,false);
grid.setWalkableAt(0,1, false);

var path = finder.findPath(0,0,2,2, grid);
console.log(path)

function createArray(length) {
    var arr = new Array(length || 0),
        i = length;

    if (arguments.length > 1) {
        var args = Array.prototype.slice.call(arguments, 1);
        while(i--) arr[length-1 - i] = createArray.apply(this, args);
    }

    return arr;
}