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

function place_random_resource(){
    NUMBER_RESOURCES = 10;
    for(var i = 0; i < NUMBER_RESOURCES; i++){
        let random_x = Math.floor(Math.random() * width);
        let random_y = Math.floor(Math.random() * height);

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

function move_worker(worker_id, player_id, direction){

    players[player_id]['workers'][worker_id][coordinate][0
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
