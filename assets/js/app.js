import io from 'socket.io-client';
import { drawGrid, drawUnit, drawObject, centerScreen, get_cell_at_position } from './graphics';
import config from './config';

// Set type player for now
// let type = "player";
// let socket = io({ query: "type=" + type });
let socket;

// Setup Canvas
const canvas = document.getElementById('cvs');
const width = config.width;
const height = config.height;

canvas.width = config.width;
canvas.height = config.height;

let ctx = canvas.getContext('2d');

// Setup Grid
const cellSize = height / config.gridScaleFactor;
const mouse = { x: 0, y: 0, button: false, wheel: 0, lastX: 0, lastY: 0, drag: false };

console.log(mouse);

// Setup Game
config.gameData = {
    units: [],
    players: []
};

config.player = {
    id: -1,
    firstClick: true,
    source: {
        unit_id: -1,
        x: -1,
        y: -1
    },
    target: {
        x: -1,
        y: -1
    }
}
config.screen = {
    topLeft: { x: 0, y: 0 },
    gridTopLeft: { x: 0, y: 0 },
    height: config.height,
    width: config.width,
    cellSize: cellSize,
    panZoom: { x: 0, y: 0 }
}

window.oncontextmenu = function() {
    return false;
}

function startGame(playerType = 'player') {

    config.width = window.innerWidth;
    config.height = window.innerHeight;

    // Setup mouse events
    configureMovement(ctx, canvas, config);
    canvas.addEventListener("mousedown", e => {
        const bounds = canvas.getBoundingClientRect();
        const clickPos = { x: e.clientX - bounds.left, y: e.clientY - bounds.top };
        const cell = get_cell_at_position(clickPos, config.screen);

        let isRightMB;
        e = e || window.event;
        if ("which" in e)
            isRightMB = e.which == 3;
        else if ("button" in e)
            isRightMB = e.button == 2;

        if (isRightMB) {
            socket.emit('get cell', cell);
        } else {

            // Left click after selecting unit
            if (config.player.source.x != -1 && config.player.source.y != -1 && config.player.source.unit_id != -1) {

                config.player.target = cell;

                socket.emit('unit move', {
                    unit_id: config.player.source.unit_id,
                    x: config.player.target.x,
                    y: config.player.target.y
                });
            }
        }
    });

    if (!socket) {
        socket = io({ query: "type=" + playerType });
        setupSocket(socket);
    }

    if (!config.animLoopHandle) {
        animLoop();
    }

    // document.getElementById('grow-hive').addEventListener('click', e => {
    //     socket.emit('grow hub');
    // });

    // document.getElementById('shrink-hive').addEventListener('click', e => {
    //     socket.emit('shrink hub');
    // });

    document.getElementById('make-worker').addEventListener('click', e => {
        socket.emit('make worker');
    });

    document.getElementById('make-thief').addEventListener('click', e => {
        socket.emit('make thief');
    });

    socket.emit('play', config.player);
}

function setupSocket(socket) {

    console.log('Configuring Sockets');
    /**
     * Connection recieved.
     */
    socket.on('update', payload => {
        config.gameData = payload.gameData;
    });

    socket.on('setup', payload => {
        centerScreen(payload.view.topLeft, config.screen);
        console.log(config.gameData);
    });

    socket.on('game update', payload => {
        config.gameData.units = payload.units;
        config.gameData.players = payload.players;
    });

    socket.on('read cell', payload => {

        const unit_id = payload.unit ? payload.unit.unit_id : -1;
        if (unit_id == -1) {
            return;
        }

        const unit = config.gameData.units[unit_id];
        const player = config.gameData.players[unit.player_id];

        const contains = true;
        // console.log(player);
        // const player_units = player[unit.unit_type];
        // for (let i = 0; i < player_units.length; i++) {
        //     if (player_units[i].unit_id == unit_id) {
        //         contains = true;
        //     }
        // }

        // Check if source is owned by the player
        if (contains) {
            config.player.source.unit_id = unit_id;
            config.player.source.x = payload.cell.x;
            config.player.source.y = payload.cell.y;
        }
    });
}

function render(ctx, config) {

    for (let unit of Object.values(config.gameData.units)) {
        const selected = unit.unit_id == config.player.source.unit_id;

        let hue;
        if (unit.player_id) {
            hue = config.gameData.players[unit.player_id].hue;
        } else {
            hue = unit.hue;
        }
        drawObject(ctx, config.screen, unit, hue, selected);
    }
}

function mouseEvents(canvas, e) {
    const bounds = canvas.getBoundingClientRect();
    mouse.x = e.pageX - bounds.left - scrollX;
    mouse.y = e.pageY - bounds.top - scrollY;
    mouse.button = e.type === "mousedown" ? true : e.type === "mouseup" ? false : mouse.button;
}

function configureMovement(ctx, canvas, config) {
    let events = ["mousedown", "mouseup", "mousemove", "wheel"];
    for (let event of events) {
        document.addEventListener(event, e => mouseEvents(canvas, e));
    }
}

function update(ctx, config) {

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;

    const width = config.screen.width;
    const height = config.screen.height;

    if (mouse.button) {
        if (!mouse.drag) {
            mouse.lastX = mouse.x;
            mouse.lastY = mouse.y;
            mouse.drag = true;
        } else {
            config.screen.panZoom.x += mouse.x - mouse.lastX;
            config.screen.panZoom.y += mouse.y - mouse.lastY;
            mouse.lastX = mouse.x;
            mouse.lastY = mouse.y;
        }

    } else if (mouse.drag) {
        mouse.drag = false;
    }

    config.screen.topLeft.x = (config.screen.panZoom.x) / config.screen.cellSize;
    config.screen.topLeft.y = (config.screen.panZoom.y) / config.screen.cellSize;
    config.screen.gridTopLeft.x = Math.max(0, Math.abs(config.screen.gridTopLeft.x))
    config.screen.gridTopLeft.y = Math.max(0, Math.abs(config.screen.gridTopLeft.y));

    drawGrid(ctx, height, width, config.screen);
}

function animLoop() {
    config.animLoopHandle = window.requestAnimFrame(animLoop);

    // Clear canvas
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, width, height);

    update(ctx, config);
    render(ctx, config);
}

// Setup browser animation
window.requestAnimFrame = (function() {
    return window.requestAnimationFrame ||
        window.webkitRequestAnimationFrame ||
        window.mozRequestAnimationFrame ||
        window.msRequestAnimationFrame ||

        function(callback) {
            window.setTimeout(callback, 1000 / 60);
        };
})();

startGame();