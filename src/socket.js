import { functionTypeAnnotation } from "@babel/types";
import easystarjs from 'easystarjs';
import config from './config';

const INITIAL_HEIGHT = config.height;
const INITIAL_WIDTH = config.width;

const INTERVAL = 1000 / 60;

let game_counter = 0;

let height = INITIAL_HEIGHT
let width = INITIAL_WIDTH

let current_id = 0;

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
player_id = int
worker_type  = string
coordinate = [x,y]
target = [x,y]
}
 */

// Game settings
let units = {}
let sockets = {};
let players = [];


// Games settings
// stores works the lower the faster
const WORKER_SPEED = config.worker.speed;


function get_newest_id() {
    return ++current_id;
}

function place_random_resource() {

    let patterns = [
        [
            [0, 0],
            [0, 1],
            [0, -1],
            [1, 1],
            [1, 0]
        ],
        [
            [0, 0],
            [1, 1],
            [0, -1]
        ],
        [
            [0, 0],
            [0, 1]
        ]
    ]

    let count = 0;
    while (count < config.resources.starting_count) {
        let random_x = Math.floor(Math.random() * width);
        let random_y = Math.floor(Math.random() * height);

        while (grid[random_x][random_y] != null) {
            random_x = Math.floor(Math.random() * width);
            random_y = Math.floor(Math.random() * height);
        }
        count++;

        let cells = [];
        let pattern = patterns[Math.floor(Math.random() * (patterns.length))];

        // Resource has a unique unit id.
        let unit_id = get_newest_id();
        let resource = { unit_id: unit_id, unit_type: 'resource' };

        for (let i = 0; i < pattern.length; i++) {
            let [x, y] = pattern[i];
            cells.push({
                x: random_x + x,
                y: random_y + y
            });

            grid[random_x + x][random_y + y] = resource;
        }

        resource.cells = cells
        resource.hue = 220;
        units[unit_id] = resource;
    }
}

function initialise_hub(player) {
    let random_x = Math.floor(Math.random() * width);
    let random_y = Math.floor(Math.random() * height);

    let unit_id = get_newest_id();
    let hub = {
        player_id: player.id,
        unit_type: 'hive',
        size: config.hub.starting_size,
        centre: { x: random_x, y: random_y },
        cells: [{ x: random_x, y: random_y }],
        hue: player.hue
    }

    units[unit_id] = hub;
    grid[random_x, random_y] = { player_id: player.id, unit_id: unit_id };
    player['hub'] = unit_id;
}

// returns true if coordinate is next to a resource 
// returns a random coordinate next to the resource if coordinate is directly on the resource
function is_position_adjacent_or_destination(x, y, type) {
    // if on the grid
    if (grid[x][y]['type'] == type) {
        // hopefully not out of bound
        return [x - 1, y - 1];
    } else {
        if (grid[x + 1][y + 1]['type'] == type || grid[x + 1][y]['type'] == type || grid[x + 1][y - 1]['type' == type] || grid[x][y - 1]['type'] == type || grid[x - 1][y - 1]['type'] == type || grid[x - 1][y]['type'] == type || grid[x - 1][y + 1]['type'] == type || grid[x][y + 1]['type'] == type) {
            return true;
        } else {
            return false;
        }
    }
}

function get_type_of_cell(x, y) {

    const cell = grid[x][y];
    if (cell) {
        return units[cell.unit_id].unit_type;
    }

    return null;
}

function shrink_hub(player) {
    const hub = units[player.hub];

    let x = hub.centre.x;
    let y = hub.centre.y;

    let range_x = [Math.abs(x - hub.radius), Math.abs(x + hub.radius)];
    let range_y = [Math.abs(y - hub.radius), Math.abs(y + hub.radius)];

    let empty = true;
    let removed = false;

    for (let i = range_x[0]; range_x[1]; i++) {
        for (let j = range_y[0]; range_y[1]; j++) {
            // if on the ring
            if (i == (x - hub.radius) || i == (x + hub.radius) || j == (y - hub.radius) || j == (y + hub.radius)) {
                // remove
                if (get_type_of_cell(i, j) == 'hive') {
                    grid[i][j] = null;
                    empty = false;
                    removed = true;
                    break;
                }
            }
        }
        if (removed) {
            break;
        }
    }

    if (empty) {
        hub.radius--;
        let range_x = [Math.abs(x - hub.radius), Math.abs(x + hub.radius)];
        let range_y = [Math.abs(y - hub.radius), Math.abs(y + hub.radius)];


        for (let i = range_x[0]; range_x[1]; i++) {
            for (let j = range_y[0]; range_y[1]; j++) {
                // if on the ring
                if (i == (x - hub.radius) || i == (x + hub.radius) || j == (y - hub.radius) || j == (y + hub.radius)) {
                    // remove
                    if (get_type_of_cell(i, j) == 'hive') {
                        grid[i][j] = null;
                        empty = false;
                        removed = true;
                        break;
                    }
                }
            }
            if (removed) {
                break;
            }
        }

    }


}

function grow_hub(player) {

    let hub = units[player.hub];

    let x = hub.centre.x;
    let y = hub.centre.y;

    // if there is no direction attached to hive
    if (!hub.radius) {
        hub.radius = 1;
    }

    // range of coordinates it wants to check
    let range_x = [Math.abs(x - hub.radius), Math.abs(x + hub.radius)];
    let range_y = [Math.abs(y - hub.radius), Math.abs(y + hub.radius)];

    let full = true;
    let placed = false;

    for (let i = range_x[0]; i <= range_x[1]; i++) {
        for (let j = range_y[0]; j <= range_y[1]; j++) {

            // place
            if (get_type_of_cell(i, j) != 'hive') {
                console.log(i);
                console.log(j);
                console.log(hub.radius);
                console.log(range_x);
                console.log(range_y);
                grid[i][j] = { player_id: player.id, unit_id: player.hub };
                hub.cells.push({ x: i, y: j });
                full = false;
                placed = true;
                break;
            }

        }
        if (placed) {
            break;
        }
    }


    if (full) {
        // increase radius
        units[player.hub].radius++;
        let range_x = [Math.abs(x - hub.radius), Math.abs(x + hub.radius)];
        let range_y = [Math.abs(y - hub.radius), Math.abs(y + hub.radius)];

        for (let i = range_x[0]; range_x[1]; i++) {
            for (let j = range_y[0]; range_y[1]; j++) {

                // place
                if (get_type_of_cell(i, j) != 'hive') {
                    grid[i][j] = { player_id: player.id, unit_id: player.hub };
                    hub.cells.push({ x: i, y: j });
                    full = false;
                    placed = true;
                    break;
                }
            }
            if (placed) {
                break;
            }
        }
    }
}


function game_loop() {
    game_counter++;

    // Every 10 ticks
    if (game_counter % 10 == 0) {
        // Move every worker
        for (var id in units) {
            let target_x = parseInt(units[id][target][0]) || -1;
            let target_y = parseInt(units[id][target][1]) || -1;

            if (0 <= target_x < WIDTH && 0 <= target_y < HEIGHT) {
                if (Number.isInteger(target_x) && Number.isInteger(target_y)) {
                    move_worker(target_x, target_y, id);
                }
            }
        }
    }
}

function send_updates() {
    for (let [id, socket] of Object.entries(sockets)) {
        sockets[id].emit('game update', { units, players });
    }
}

/**
 * cells | [{x: int, y: int}], positi | {x: int, y: int}, 
 */
function create_worker(player, position) {

    if (grid[position.x][position.y] != null) {
        return;
    }

    // Cannot create worker
    if (!player.hub || !(player.hub in units)) {
        return;
    }

    const hub = units[player.hub];
    // if (hub.size <= config.worker.cost) {
    //     return;
    // }

    let worker = {
        player_id: player.id,
        unit_id: get_newest_id(),
        cells: [position],
        target: { x: -1, y: -1 },
        position: position,
        status: 'idle'
    }

    units[worker.unit_id] = worker;
    grid[position.x][position.y] = { unit_id: unit_id, unit_type: 'worker' }
}

function is_cell_in_list(cells, target) {
    for (let cell of cells) {
        if (cell.x == target.x && cell.y == target.y) {
            return true;
        }
    }
    return false;
}

/**
 * border_cells = [
 *      {x: 0, y: 1},
 *      {x: 1, y: 1}, ...
 * ]
 */
function get_border_cells(cells) {
    let border_cells = [];
    let neighbourMap = [
        [0, 1],
        [1, 0],
        [0, -1],
        [-1, 0]
    ];

    for (let cell of cells) {
        for (let [dir, nMap] of Object.entries(neighbourMap)) {

            let nCell = cell.slice();
            nCell[0] += nMap[0]
            nCell[1] += nMap[1]

            if (!is_cell_in_list(cells, nCell)) {
                border_cells.push({ x: nCell[0], y: nCell[1] });
            }
        }
    }

    return border_cells;
}

function find_nearest_pos(des_X, des_Y, unit_id, cells) {
    let nearest_positions = get_border_cells(cells);
    const unit = units[unit_id];

    let cur_X = unit.position.x;
    let cur_Y = unit.position.y;

    if (nearest_positions.length == 0) {
        return null;
    }
    let distances = {};

    for (let position of nearest_positions) {
        let distance = Math.abs(position.x - cur_X) +
            Math.abs(position.y - cur_Y);
        distances[distance] = position;
    }
    let minimum_distance = -1;
    for (let distance of distances) {
        if (minimum_distance == -1) {
            minimum_distance = distance;
        }
        if (minimum_distance > distance) {
            minimum_distance = distance;
        }
    }
    return distances[minimum_distance];

}

function move_unit(des_X, des_Y, unit_id, callback) {

    const unit = units[unit_id];

    let cur_X = unit.position.x;
    let cur_Y = unit.position.y;
    let easystar = new easystarjs.js();

    easystar.setGrid(grid);
    easystar.setAcceptableTiles([null]);
    easystar.findPath(cur_X, cur_Y, des_X, des_Y, function(path) {});
    easystar.setIterationsPerCalculation(100000);
    easystar.calculate();

    if (path == null) {
        let nearest_position = find_nearest_pos(des_X, des_Y, unit_id, unit.cells);
        if (nearest_position == null) {
            throw "no path";
        } else {
            // units[unit_id][target].x = nearest_position.x;
            // units[unit_id][target].y = nearest_position.y
            move_unit(nearest_position.x, nearest_position.y, unit_id);
        }

    } else {
        units[worker_id][coordinate][x] = path[0].x;
        units[worker_id][coordinate][y] = path[0].y;
        grid[path[0].x][path[0].y] = units[worker_id];
    }
}

function move_worker_resource(Des_X, Des_Y, re) {

}



// Boolean method to check if the worker belongs to this player.
function check_workers(player_id, worker_id) {
    return units[worker_id][player_id] == player_id;
}

//function collect_resources(worker_id, resources_id){
//     
//
//
//
//
//}



function create_path(from_x, from_y, to_x, to_y) {
    return finder.findPath(from_x, from_y, to_x, to_y, path_grid);
}

export default function handleSockets(io) {

    console.log('hi');
    io.on('connection', socket => {
        let type = socket.handshake.query.type;

        console.log('[Server] User connected.');
        console.log("[Server] Player type: " + type);

        sockets[socket.id] = socket;

        let player = {
            id: socket.id,
            type: type,
            last_hearbeat: new Date().getTime()
        }

        socket.on('play', client_player => {

            console.log('[SERVER] Play recieved');

            // First time connection
            if (client_player.id != -1) {
                player.id = client_player.id;
            }

            for (let p of players) {
                if (p.id == client_player.id) {
                    console.log(`[SERVER] Player already connected with id ${p.id}`);
                    socket.disconnect();
                }
            }

            player.last_hearbeat = new Date().getTime();
            player.hue = Math.round(Math.random() * 360);

            if (player.type == 'player') {
                initialise_hub(player);
            }

            players.push(player);

            const hub = units[player.hub];
            socket.emit('setup', {
                view: { topLeft: hub.centre },
                units: units
            });

            socket.emit('event');
        });

        socket.on('unit move', unit => {
            // do shit here
        });

        // socket.on('hub grow')

        socket.on('grow hub', e => {

            console.log('[Player] Growing hub.')
                // grow by 1
            grow_hub(player);
        });
    });
}

function createArray(length) {
    var arr = new Array(length || 0),
        i = length;

    if (arguments.length > 1) {
        var args = Array.prototype.slice.call(arguments, 1);
        while (i--) arr[length - 1 - i] = createArray.apply(this, args);
    }

    return arr;
}

// On start
place_random_resource();


// Periodic
// setInterval(game_loop, INTERVAL);
setInterval(send_updates, INTERVAL);