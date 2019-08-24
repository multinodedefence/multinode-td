import io from 'socket.io-client';
import { drawGrid, drawUnit, drawObject } from './graphics';
// import { configureMovement } from './mouse';

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
    id: -1
}
config.screen = {
    topLeft: { x: 0, y: 0 },
    gridTopLeft: { x: 0, y: 0 },
    height: config.height,
    width: config.width,
    cellSize: cellSize,
    panZoom: { x: 0, y: 0 }
}

function startGame(playerType = 'player') {

    config.width = window.innerWidth;
    config.height = window.innerHeight;

    // Setup mouse events
    configureMovement(ctx, canvas, config);

    if (!socket) {
        socket = io({ query: "type=" + playerType });
        setupSocket(socket);
    }

    if (!config.animLoopHandle) {
        animLoop();
    }

    document.getElementById('grow-hive').addEventListener('click', e => {
        socket.emit('grow hub');
    });

    document.getElementById('shrink-hive').addEventListener('click', e => {
        socket.emit('shrink hub');
    });

    document.getElementById('move-player').addEventListener('click', e => {
        const payload = {
            x: parseInt(document.getElementById('x').value),
            y: parseInt(document.getElementById('y').value)
        }
        socket.emit('unit move', payload);
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
        config.screen.gridTopLeft = payload.view.topLeft;
        config.screen.gridTopLeft.x -= 10;
        config.screen.gridTopLeft.y -= 10;
        config.gameData.units = payload.units;

        console.log(config.gameData.units);
    });

    socket.on('game update', payload => {
        config.gameData.units = payload.units;
        config.gameData.players = payload.players;
    });
}

function render(ctx, config) {

    for (let unit of Object.values(config.gameData.units)) {
        drawObject(ctx, config.screen, unit);
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