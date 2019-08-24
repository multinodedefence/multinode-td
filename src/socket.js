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
let players = {};

let easystar = new easystarjs.js();


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

        while (grid[random_y][random_x] != undefined) {
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

            grid[random_y + y][random_x + x] = resource;
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
    grid[random_y][random_x] = { player_id: player.id, unit_id: unit_id };
    player['hub'] = unit_id;
}

// returns true if coordinate is next to a resource 
// returns a random coordinate next to the resource if coordinate is directly on the resource
function is_position_adjacent_or_destination(x, y, type) {

    // if on the grid
    if (grid[y][x]['type'] == type) {
        // hopefully not out of bound
        return [x - 1, y - 1];
    } else {
        if (grid[y + 1][x + 1]['type'] == type || grid[y][x + 1]['type'] == type || grid[y - 1][x + 1]['type' == type] || grid[y - 1][x]['type'] == type || grid[y - 1][x - 1]['type'] == type || grid[y][x - 1]['type'] == type || grid[y + 1][x - 1]['type'] == type || grid[y + 1][x]['type'] == type) {
            return true;
        } else {
            return false;
        }
    }
}

function get_type_of_cell(x, y) {

    const cell = grid[y][x];
    if (cell) {
        return units[cell.unit_id].unit_type;
    }

    return null;
}

function get_owner_of_cell(x, y) {
    const cell = grid[y][x];
    if (cell) {
        return units[cell.unit_id].player_id;
    }

    return null;
}



function shrink_hub(player) {
    let hub = units[player.hub];

    let x = hub.centre.x;
    let y = hub.centre.y;

    let range_x = [Math.abs(x - hub.radius), Math.abs(x + hub.radius)];
    let range_y = [Math.abs(y - hub.radius), Math.abs(y + hub.radius)];

    let empty = true;
    let removed = false;

    for (let i = range_x[0]; i <= range_x[1]; i++) {
        for (let j = range_y[0]; j <= range_y[1]; j++) {
            // if on the ring
            if (i == (x - hub.radius) || i == (x + hub.radius) || j == (y - hub.radius) || j == (y + hub.radius)) {
                // remove
                if (get_type_of_cell(i, j) == 'hive') {
                    grid[j][i] = null;
                    remove_cell_from_unit(hub, { x: i, y: j });
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


        for (let i = range_x[0]; i <= range_x[1]; i++) {
            for (let j = range_y[0]; j <= range_y[1]; j++) {
                // if on the ring
                if (i == (x - hub.radius) || i == (x + hub.radius) || j == (y - hub.radius) || j == (y + hub.radius)) {
                    // remove
                    if (get_type_of_cell(i, j) == 'hive') {
                        grid[j][i] = null;
                        remove_cell_from_unit(hub, { x: i, y: j });

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
                grid[j][i] = { player_id: player.id, unit_id: player.hub };
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
                    grid[j][i] = { player_id: player.id, unit_id: player.hub };
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

function unit_returned(player, unit) {
    /*
    Want player and destination(destination.x, destination.y)
    */

    console.log('[Player] unit returned.')

    for (let i = 0; i < config[unit.unt_type].carry; i++) {
        grow_hub(player);
    }


    // remove unit from field
    // remove_cell_from_grid(unit.);

    // // remove unit from units
    // remove_cell_from_unit(units, destination)
}

function game_loop() {

    game_counter++;

    // Every 10 ticks
    if (game_counter % 10 == 0) {

        easystar.calculate();
        for (let [id, unit] of Object.entries(units)) {
            if (unit.unit_type == 'worker') {
                if (unit.moving) {

                    if (!unit.path || !unit.path.length) {
                        unit.moving = false;
                        continue;
                    }

                    let i = unit.pathIndex;
                    const current_pos = { x: unit.position.x, y: unit.position.y };
                    const next_position = { x: unit.path[i].x, y: unit.path[i].y };

                    remove_cell_from_unit(unit, current_pos);
                    unit.position = next_position;
                    unit.cells.push(next_position);
                    unit.pathIndex++;

                    // Update grid
                    grid[next_position.y][next_position.x] = grid[current_pos.y][current_pos.x];
                    grid[current_pos.y][current_pos.x] = null;
                    easystar.setGrid(grid);

                    // Reached its target
                    if (unit.pathIndex == unit.path.length) {
                        unit.moving = false;

                        const objective = unit.objective;
                        if (objective && Object.keys(objective).length != 0) {

                            const player = players[unit.player_id];
                            const hub = units[player.hub];

                            // Reached the resource
                            if (objective.action == 'mine') {

                                if (unit.position.x == unit.objective.target_cell.x &&
                                    unit.position.y == unit.objective.target_cell.y) {

                                    console.log('[SERVER] Unit reached hub');
                                    unit.carry = config.worker.carry;

                                    move_unit(hub.centre.x, hub.centre.y, unit.unit_id);
                                } else {

                                    for (let i = 0; i < config[unit.unit_type].carry; i++) {
                                        grow_hub(player);
                                    }

                                    console.log('[SERVER] Unit reached target');

                                    move_unit(objective.target_cell.x, objective.target_cell.y, unit.unit_id);
                                }
                            } else if (objective.action == 'steal') {

                                // Do shit.
                            }
                        }
                    }
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

function get_worker_spawn_position(player_id) {
    let hub = units[player.hub];

    let x = hub.centre.x;
    let y = hub.centre.y;

    let radius = hub.radius;

    for (let i = (x - radius); i <= (x + radius + 1); i++) {
        for (let j = (y - radius); j <= (y + radius + 1); j++) {
            if (i == (x - hub.radius) || i == (x + hub.radius) || j == (y - hub.radius) || j == (y + hub.radius)) {
                // todo check if empty???
                return { x: x, y: y };

            }
        }
    }
}

function create_theif(player, position) {
    if (grid[position.y][position.x] != null) {
        return;

    }

    // Cannot create worker
    if (!player.hub || !(player.hub in units)) {
        return;
    }

    const hub = units[player.hub];

    let theif = {
        player_id: player.id,
        unit_id: get_newest_id(),
        unit_type: 'theif',
        cells: [position],
        target: { x: -1, y: -1 },
        position: position,
        status: 'idle' // can be holds resource
    }
    const ref = { unit_id: theif.unit_id, unit_type: 'theif' };
    units[theif.unit_id] = thief;
    player.theives.push(ref);

    grid[position.y][position.x] = ref;
}

/**
 * cells | [{x: int, y: int}], positi | {x: int, y: int}, 
 */
function create_worker(player, position) {

    if (grid[position.y][position.x] != null) {
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
        unit_type: 'worker',
        cells: [position],
        target: { x: -1, y: -1 },
        position: position,
        status: 'idle'
    }

    const ref = { unit_id: worker.unit_id, unit_type: 'worker' };
    units[worker.unit_id] = worker;
    player.workers.push(ref);

    grid[position.y][position.x] = ref;
}

function steal(thief_id, player_id) {
    let theif = units[player_id.theif.theif_id];

    let victom = get_owner_of_cell(thief.target.x, thief.target.y);


    let x = theif.position.x;
    let y = theif.position.y;

    if (is_position_adjacent_or_destination(x, y, 'hive')) {
        shrink_hub(victom);
        // todo other naming.
        thief[has_resource] = true;
    }

}

function is_cell_in_list(cells, target) {
    for (let cell of cells) {
        if (cell.x == target.x && cell.y == target.y) {
            return true;
        }
    }
    return false;
}

function create_unit_objective(unit, target_coodinates, action) {
    /* 
    objective{
        coordinate : {}
        action :  
        target :
    */
    units[unit][objective][coordinate][x] = target_coodinates.x;
    units[unit][objective][coordinate][y] = target_coodinates.y;

    units[unit][objective]['action'] = action;


}

function remove_cell_from_unit(unit, target) {
    unit.cells = unit.cells.filter(cell => cell.x != target.x || cell.y != target.y);
}

function remove_cell_from_grid(target) {
    grid[target.x][target.y] = null;
}

function get_border_cells(cells) {
    let border_cells = [];
    let neighbourMap = [
        [0, 1],
        [1, 0],
        [0, -1],
        [-1, 0]
    ];

    for (let cell of cells) {
        for (let [x, y] of neighbourMap) {
            let nCell = { x: cell.x + x, y: cell.y + y };
            if (!is_cell_in_list(cells, nCell)) {
                border_cells.push(nCell);
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
        // if (!grid[position.y][position.x]) {
        let distance = Math.abs(position.x - cur_X) +
            Math.abs(position.y - cur_Y);
        distances[distance] = position;
        // }
    }
    let minimum_distance = -1;
    for (let distance of Object.keys(distances)) {
        if (minimum_distance == -1) {
            minimum_distance = distance;
        }
        if (minimum_distance > distance) {
            minimum_distance = distance;
        }
    }
    // console.log(distances[minimum_distance]);
    // console.log(".....");
    return minimum_distance > 0 ? distances[minimum_distance] : null;

}

function move_unit(des_X, des_Y, unit_id, callback) {

    let unit = units[unit_id];

    let cur_X = unit.position.x;
    let cur_Y = unit.position.y;

    easystar.setGrid(grid);
    easystar.setAcceptableTiles([undefined, null, 0]);

    easystar.findPath(cur_X, cur_Y, des_X, des_Y, function(path) {

        console.log("PATH ", path);
        let can_move = true;
        let target_position = { x: des_X, y: des_Y };

        if (!path) {
            let target_unit = grid[des_Y][des_X];

            // Not inside a stucture, there is just no path.
            if (target_unit) {

                const cells = units[target_unit.unit_id].cells;
                let nearest_position = find_nearest_pos(des_X, des_Y, unit_id, cells);
                if (nearest_position != null) {
                    target_position = nearest_position;
                    move_unit(nearest_position.x, nearest_position.y, unit_id);
                } else {
                    can_move = false;
                }
            } else {
                can_move = false;
            }

        } else {
            unit.path = path;
            unit.pathIndex = 0;
            unit.moving = true;
        }

        if (callback) {
            callback(can_move, path, target_position);
        }
    });

    easystar.setIterationsPerCalculation(1000);
}



function return_home(unit_id) {
    let unit = units[unit_id];

    return_x = units.player.hub.centre.x;
    return_y = units.player.hub.centre.y;

    // move_unit

}



// Boolean method to check if the worker belongs to this player.
function check_workers(player_id, worker_id) {
    return units[worker_id][player_id] == player_id;
}


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
            last_hearbeat: new Date().getTime(),
            workers: []
        }

        socket.on('play', client_player => {

            console.log('[SERVER] Play recieved');

            // First time connection
            if (client_player.id != -1) {
                player.id = client_player.id;
            }

            for (let p of Object.values(players)) {
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

            const hub = units[player.hub];

            // Setup test worker
            const starting_position = { x: hub.centre.x + 2, y: hub.centre.y + 2 };
            create_worker(player, starting_position);
            console.log(starting_position);
            players[player.id] = player;
            socket.emit('setup', {
                view: { topLeft: hub.centre },
                units: units
            });

            socket.emit('event');
        });

        socket.on('unit move', payload => {

            console.log('[Player] Moving Player.');

            // For now, assume that we want first worker
            console.log(player.workers);
            let position = payload;
            let unit = units[player.workers[0].unit_id];

            move_unit(position.x, position.y, unit.unit_id, (can_move, path, target) => {

                if (can_move) {
                    const cell = grid[position.y][position.x];
                    if (cell) {

                        let action;
                        let set_action = false;

                        if (unit.unit_type == 'worker' && cell.unit_type == 'resource') {
                            action = 'mine';
                            set_action = true;
                        } else if (cell.unit_type == 'theif' && cell.unit_type == 'hive') {
                            action = 'steal';
                            set_action = true;
                        }

                        if (set_action) {
                            unit.objective = {
                                target: cell.unit_id,
                                target_cell: target,
                                action: action
                            };
                        }
                    }
                } else {
                    unit.objective = {};
                }

            });
        });

        socket.on('grow hub', e => {

            console.log('[Player] Growing hub.')
                // grow by 1
            grow_hub(player);
        });

        socket.on('shrink hub', e => {
            console.log('[Player] Shrink hub.')
            shrink_hub(player);
        });

        socket.on('create worker', e => {
            console.log('[Player] Spawned worker.')

            for (let i = 0; i < config.worker.cost; i++) {
                shrink_hub(player);
            }
            create_worker(player, get_worker_spawn_position(player));
        });

        socket.on('create theif', e => {
            console.log('[Player] Spawned thief.')

            for (let i = 0; i < config.thief.cost; i++) {
                shrink_hub(player);
            }
            create_theif(player, get_worker_spawn_position(player));
        });

        socket.on('theif returned', e => {
            /*
            Want player and destination(destination.x, destination.y)
            */

            console.log('[Player] Theif returned.')

            for (let i = 0; i < config.thief.cost; i++) {
                grow_hub(player);
            }

            // remove unit from field
            remove_cell_from_grid(destination);

            // remove unit from units
            remove_cell_from_unit(units, destination)
        });

        socket.on('worker returned', e => {
            /*
            Want player and destination(destination.x, destination.y)
            */

            console.log('[Player] Worker returned.')

            for (let i = 0; i < config.worker.cost; i++) {
                grow_hub(player);
            }

            // remove unit from field
            remove_cell_from_grid(destination);

            // remove unit from units
            remove_cell_from_unit(units, destination)
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
setInterval(game_loop, INTERVAL);
setInterval(send_updates, INTERVAL);