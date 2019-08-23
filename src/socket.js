const INITIAL_HEIGHT = 100;
const INITIAL_WIDTH = 100;

let height = INITIAL_HEIGHT
let width = INITIAL_WIDTH

let current_id = 0;

let PF = require("pathfinding");
let path_grid = PF.Grid(width,height);
let finder = new PF.AStarFinder();

/* 
Stored inside each element.
unit_id: int
player_id: int 
object_type, 
coordinates,
*/
let grid = createArray(width, height);

/* 
Stores location of every cell the player owns.
player_id:
{
id = int
workers = {hive : [], ...}
hive = []
}
 */
let players = {}

// stores location of every resource
let resources = {}

// stores works the lower the faster
let WORKER_SPEED = 100

function place_random_resource(){
    NUMBER_RESOURCES = 10;
    for(var i = 0; i < NUMBER_RESOURCES; i++){
        let random_x = Math.floor(Math.random() * width);
        let random_y = Math.floor(Math.random() * height);

        while (grid[random_x][random_y]!= null){
            random_x = Math.floor(Math.random() * width);
            random_y = Math.floor(Math.random() * height);
        }
        path_grid.setWalkableAt(random_x, random_y, false);

        grid[random_x][random_y] = {'id' : i, 'type' : 'resource'};
    }
}
function initialise_hub_location(player_id){
    let random_x = Math.floor(Math.random() * width);
    let random_y = Math.floor(Math.random() * height);

    players[player_id]['hive'] = [random_x, random_y];

    grid[random_x][random_y] = {'player_id' : player_id, 'unit_id' : ++current_id};

    path_grid.setWalkableAt(random_x, random_y, false)
}

function move_worker(cur_X, cur_Y, Des_X, Des_Y, workerId){
    var path = finder.findPath(cur_X, cur_Y, Des_X, Des_Y, path_grid);
    if (path.length == 0){
        throw "The destination can not be reached"
    }else{
        for(var i = 0; i < path.length; i++){
            path_grid.setWalkableAt(random_x, random_y, false);
            // Implement a setToTimeOut function here
            setTimeout(function() { 
                // have to change this part !!!!!!
                grid[path[i][0]][path[i][1]] = workerId;
            }, WORKER_SPEED);
        }
    }
}                                                         


export default function handleSockets(io) {

    io.on('connection', socket => {

        let type = socket.handshake.query.type;

        // todo not sure about id
        let id = socket.handleshake.query.id;

        console.log('[Server] User connected.');
        console.log("[Server] Player type: " + type);

        players[player_id] = {'id' : id, 'current_worker_id' : 0};

        socket.emit('message', 'Message sent from the server');
    });

    // on start
    io.on('on_start', socket => {
        
    })

}

// 
function movePlayer(player){
    var x = 0, y = 0;
}

function createArray(length) {
    var arr = new Array(length || 0),
        i = length;

    if (arguments.length > 1) {
        var args = Array.prototype.slice.call(arguments, 1);
        while(i--) arr[length-1 - i] = createArray.apply(this, args);
    }

    return arr;
}
