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

    let patterns = config.resources.patterns;
    let count = 0;

    while (count < config.resources.starting_count) {
        let random_x = Math.floor(Math.random() * width);
        let random_y = Math.floor(Math.random() * height);

        while (get_cell_at_position(random_x, random_y) != null) {
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

            if (!grid[random_y + y]) {
                grid[random_y + y] = [];
            }

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
        unit_id: unit_id,
        unit_type: 'hive',
        size: config.hub.starting_size,
        centre: { x: random_x, y: random_y },
        cells: [{ x: random_x, y: random_y }],
        hue: player.hue
    }

    units[unit_id] = hub;
    grid[random_y][random_x] = { player_id: player.id, unit_id: unit_id, unit_type: 'hive' };
    player['hub'] = unit_id;

    for (let i = 0; i < config.hub.starting_size - 1; i++) {
        grow_hub(player);
    }
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

function get_cell_at_position(x, y) {
    if (grid[y] != undefined && grid[y][x] != undefined) {
        return grid[y][x];
    }
    return null;
}

function get_type_of_cell(x, y) {

    const cell = get_cell_at_position(x, y);
    if (cell != null) {
        return units[cell.unit_id].unit_type;
    }

    return null;
}

function get_owner_of_cell(x, y) {
    const cell = get_cell_at_position(x, y);
    if (cell != null) {
        return units[cell.unit_id].player_id;
    }

    return null;
}


function shrink_hub(player) {
    let hub = units[player.hub];

    if (hub == undefined) {
        return;
    }
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
                    grid[j][i] = undefined;
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
                grid[j][i] = { player_id: player.id, unit_id: player.hub, unit_type: 'hive' };
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
                    grid[j][i] = { player_id: player.id, unit_id: player.hub, unit_type: 'hive' };
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
            if (unit.unit_type == 'worker' || unit.unit_type == 'thief') {
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
                    grid[current_pos.y][current_pos.x] = undefined;
                    // easystar.setGrid(grid);

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

                                    unit.carry = config.worker.carry;

                                    move_unit(hub.centre.x, hub.centre.y, unit.unit_id);
                                    unit.move = false;
                                } else {

                                    for (let i = 0; i < config[unit.unit_type].carry; i++) {
                                        grow_hub(player);
                                    }

                                    move_unit(objective.target_cell.x, objective.target_cell.y, unit.unit_id);
                                }
                            } else if (objective.action == 'steal') {

                                if (unit.position.x == unit.objective.target_cell.x &&
                                    unit.position.y == unit.objective.target_cell.y) {


                                    unit.carry = config.worker.carry;

                                    const player_id = units[unit.objective.target_unit_id].player_id;
                                    shrink_hub(players[player_id]);

                                    move_unit(hub.centre.x, hub.centre.y, unit.unit_id);
                                    unit.move = false;

                                } else {

                                    for (let i = 0; i < config[unit.unit_type].carry; i++) {
                                        grow_hub(player);
                                    }

                                    move_unit(objective.target_cell.x, objective.target_cell.y, unit.unit_id);
                                }
                            }
                        }
                    }
                }
            } // else if (unit.unit_type == "theif"){
            //      
            //}
        }
    }
}

function send_updates() {
    for (let [id, socket] of Object.entries(sockets)) {
        sockets[id].emit('game update', { units, players });
    }
}

function get_worker_spawn_position(player) {
    // const player = players[player_id];
    let hub = units[player.hub];

    let x = hub.centre.x;
    let y = hub.centre.y;

    let radius = hub.radius;

    for (let i = (x - radius) - 1; i <= (x + radius + 1); i++) {
        for (let j = (y - radius) - 1; j <= (y + radius + 1); j++) {
            if (i == (x - hub.radius) || i == (x + hub.radius) || j == (y - hub.radius) || j == (y + hub.radius)) {
                if (grid[j][i] == null) {
                    return { x: i, y: j };
                }
            }
        }
    }
}

function create_thief(player, position) {

    if (!position || get_cell_at_position(position.x, position.y) != undefined) {
        return;
    }

    // Cannot create worker
    if (!player.hub || !(player.hub in units)) {
        return;
    }

    const hub = units[player.hub];
    if (hub.size <= config.worker.cost) {
        return;
    }

    let thief = {
        player_id: player.id,
        unit_id: get_newest_id(),
        unit_type: 'thief',
        cells: [position],
        target: { x: -1, y: -1 },
        position: position,
        status: 'idle' // can be holds resource
    }
    const ref = { unit_id: thief.unit_id, unit_type: 'thief' };
    units[thief.unit_id] = thief;
    player.thieves.push(ref);
    if (position.x < 0 || position.x > config.width || position.y < 0 || position.y > config.width) {
        return;
    }
    if (grid[position.y] == undefined) {
        grid[position.y] = [];
    }
    grid[position.y][position.x] = ref;
}

/**
 * cells | [{x: int, y: int}], positi | {x: int, y: int}, 
 */
function create_worker(player, position) {

    // if (grid[position.y][position.x] != undefined) {
    //     return;
    // }
    if (!position || get_cell_at_position(position.x, position.y) != null) {
        return;
    }

    // Cannot create worker
    if (!player.hub || !(player.hub in units)) {
        return;
    }

    const hub = units[player.hub];
    if (hub.size <= config.worker.cost) {
        return;
    }

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
    if (position.x < 0 || position.x > config.width || position.y < 0 || position.y > config.width) {
        return;
    }
    if (grid[position.y] == undefined) {
        grid[position.y] = [];
    }
    grid[position.y][position.x] = ref;
}

function is_cell_in_list(cells, target) {
    for (let cell of cells) {
        if (cell.x == target.x && cell.y == target.y) {
            return true;
        }
    }
    return false;
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

    if (unit.position == undefined) {
        return;
    }
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
    return minimum_distance > 0 ? distances[minimum_distance] : null;

}

function move_unit(des_X, des_Y, unit_id, callback) {

    let unit = units[unit_id];
    if (!unit.position) {
        return;
    }

    let cur_X = unit.position.x;
    let cur_Y = unit.position.y;

    if (des_X < 0 || des_X > config.width || des_Y < 0 || des_Y > config.width) {
        return;
    }

    easystar.setGrid(grid);
    easystar.setAcceptableTiles([undefined, null, 0]);

    easystar.findPath(cur_X, cur_Y, des_X, des_Y, function(path) {

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

    easystar.setIterationsPerCalculation(100);
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

    io.on('connection', socket => {
        let type = socket.handshake.query.type;


        sockets[socket.id] = socket;
        let player = {
            id: socket.id,
            type: type,
            last_hearbeat: new Date().getTime(),
            workers: [],
            thieves: []
        }

        socket.on('play', client_player => {
            // First time connection
            if (client_player.id != -1) {
                player.id = client_player.id;
            }

            for (let p of Object.values(players)) {
                if (p.id == client_player.id) {
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
            const starting_position_theif = { x: hub.centre.x + 3, y: hub.centre.y + 3 };

            create_worker(player, starting_position);
            create_thief(player, starting_position_theif);

            players[player.id] = player;
            socket.emit('setup', {
                view: { topLeft: hub.centre },
                units: units
            });

            socket.emit('event');
        });

        socket.on('unit move', payload => {


            // For now, assume that we want first worker
            let position = { x: payload.x, y: payload.y };
            let unit_id = payload.unit_id;

            if (unit_id == -1) {
                return;
            }
            let unit = units[unit_id];
            if (unit == undefined) {
                return;
            }

            if (payload.x < 0 || payload.x > config.width || payload.y < 0 || payload.y > config.width) {
                return;
            }

            // if unit belongs to player
            // for (let i = 0; i < units.length; i++) {
            //     if (units[i].id == unit_id && units[i].player_id == player.id) {
            //
            //     }

            // }


            move_unit(position.x, position.y, unit.unit_id, (can_move, path, target) => {

                if (can_move) {
                    const cell = get_cell_at_position(position.x, position.y);
                    if (cell != null) {


                        if (unit.unit_type == 'worker' && cell.unit_type == 'resource') {
                            unit.objective = {
                                target: cell.unit_id,
                                target_cell: target,
                                action: 'mine'
                            };
                        } else if (unit.unit_type == 'thief' && cell.unit_type == 'hive') {
                            unit.objective = {
                                target: cell.unit_id,
                                target_cell: target,
                                target_unit_id: cell.unit_id,
                                action: 'steal'
                            };
                        } else {
                            unit.objective = {};
                        }
                    }
                } else {
                    unit.objective = {};
                }
            });
        });

        socket.on('grow hub', e => {
            grow_hub(player);
        });

        socket.on('shrink hub', e => {
            shrink_hub(player);
        });

        socket.on('make worker', e => {

            const player = players[socket.id];
            if (get_worker_spawn_position(player) == undefined) {
                return;
            } else {
                for (let i = 0; i < config.worker.cost; i++) {
                    shrink_hub(player);
                }
                create_worker(player, get_worker_spawn_position(player));
            }
        });

        socket.on('make thief', e => {

            const player = players[socket.id];
            if (get_worker_spawn_position(player) == undefined) {
                return;
            } else {
                create_thief(player, get_worker_spawn_position(player));

                for (let i = 0; i < config.thief.cost; i++) {
                    shrink_hub(player);
                }
            }

        });

        socket.on('thief returned', e => {
            /*
            Want player and destination(destination.x, destination.y)
            */


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
            for (let i = 0; i < config.worker.cost; i++) {
                grow_hub(player);
            }

            // remove unit from field
            remove_cell_from_grid(destination);

            // remove unit from units
            remove_cell_from_unit(units, destination)
        });

        socket.on('get cell', e => {
            socket.emit('read cell', { unit: get_cell_at_position(e.x, e.y), cell: e });
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