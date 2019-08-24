import { functionTypeAnnotation } from "@babel/types";

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
type, 
coordinates,
*/
let grid = createArray(width, height);

/* 
Stores location of every cell the player owns.
worker_id:
{
player_id = int
worker_type  = string
coordinate = [x,y]
}
 */
let workers = {}

// stores location of every resource
let resources = {}

// stores works the lower the faster
let WORKER_SPEED = 100

function get_newest_id(){
    return ++current_id;
}

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

        id = get_newest_id();

        workers[id][player_id] = null;
        worker[id][worker_type] = 'resource';
        worker[id][coordinate] = [random_x,random_y];

        grid[random_x][random_y] = {'id' : i, 'type' : 'resource'};
    }
}
function initialise_hub_location(player_id){
    let random_x = Math.floor(Math.random() * width);
    let random_y = Math.floor(Math.random() * height);

    worker_id = get_newest_id();
    workers[worker_id]['player_id'] = player_id;
    workers[worker_id][worker_type] = 'hive';
    workers[worker_id][coordinate] = [random_x,random_y];

    grid[random_x][random_y] = {'player_id' : player_id, 'unit_id' : ++current_id};

    path_grid.setWalkableAt(random_x, random_y, false)
}

// returns true if coordinate is next to a resource 
// returns a random coordinate next to the resource if coordinate is directly on the resource
function is_position_adjacent_or_destination(x, y, type){
    if (grid[x][y]['type'] == type) {
        return []
    } else{
        if(grid[x+1][y+1]['type'] == type || grid[x+1][y]['type'] == type||grid[x+1][y-1]['type' == type ||grid[x][y-1]['type'] == type ||grid[x-1][y-1]['type'] == type||grid[x-1][y]['type'] == type ||grid[x-1][y+1]['type'] == type||grid[x][y+1]['type'] == type){

        }//else if(grid[x][y+1]['type'] == type))
        
    }
    
}

//workers 


function move_worker(Des_X, Des_Y, worker_id){
    let cur_X = workers[worker_id][coordinate][0];
    let cur_Y = workers[worker_id][coordinate][1];

    let path = finder.findPath(cur_X, cur_Y, Des_X, Des_Y, path_grid);
    if (path.length == 0){
        throw "The destination can not be reached"
    }else{
        for(var i = 0; i < path.length; i++){
            path_grid.setWalkableAt(random_x, random_y, false);
            // Implement a setToTimeOut function here
            setTimeout(function() { 
                // have to change this part !!!!!!
                workers[coordinate][0] = path[i][]
            }, WORKER_SPEED);
        }
    }
}            

// Boolean method to check if the worker belongs to this player.
function check_workers(player_id, worker_id){
    return workers[worker_id][player_id] == worker_id;
}

function create_path(from_x, from_y, to_x, to_y){
    return finder.findPath(from_x,from_y,to_x,to_y, path_grid);
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

function createArray(length) {
    var arr = new Array(length || 0),
        i = length;

    if (arguments.length > 1) {
        var args = Array.prototype.slice.call(arguments, 1);
        while(i--) arr[length-1 - i] = createArray.apply(this, args);
    }

    return arr;
}
