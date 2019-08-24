export function drawGrid(ctx, height, width, screenConfig) {

    const cellSize = screenConfig.cellSize;

    ctx.lineWidth = 1;
    ctx.strokeStyle = 'gray';
    ctx.globalAlpha = 0.15;
    ctx.beginPath();

    for (var x = screenConfig.topLeft.x * cellSize; x < width; x += cellSize) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
    }

    for (var y = screenConfig.topLeft.y * cellSize; y < height; y += cellSize) {
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
    }

    ctx.stroke();
    ctx.globalAlpha = 1;
}

export function drawCircle(ctx, centerX, centerY, radius, sides) {
    var theta = 0;
    var x = 0;
    var y = 0;

    ctx.beginPath();

    for (var i = 0; i < sides; i++) {
        theta = (i / sides) * 2 * Math.PI;
        x = centerX + radius * Math.sin(theta);
        y = centerY + radius * Math.cos(theta);
        ctx.lineTo(x, y);
    }

    ctx.closePath();
    ctx.stroke();
    ctx.fill();
}

/**
 * Required | Unit { hue: int, width: int, x: int, y: int }
 */
export function drawCircularUnit(ctx, unit, cellSize, res) {
    ctx.strokeStyle = 'hsl(' + unit.hue + ', 100%, 45%)';
    ctx.fillStyle = 'hsl(' + unit.hue + ', 100%, 50%)';
    ctx.lineWidth = unit.width * cellSize * (2 / 5);

    let circleRadius = (unit.width / 2) * cellSize - ctx.lineWidth / 2
    drawCircle(ctx, unit.x * cellSize, unit.y * cellSize, circleRadius, res);

    const fontSize = Math.max(unit.width / 2, 12);
    ctx.fillStyle = '#FFFFFF';
    ctx.miterLimit = 1;
    ctx.lineJoin = 'round';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold ' + fontSize + 'px sans-serif';

    const unitName = `${unit.type} ${unit.width}`;
    ctx.fillText(unitName, unit.x, unit.y);
}

/**
 * Required | Object { cells: array }
 */
export function drawObject(ctx, screen, object) {

    let hue = object.hue;
    const cellSize = screen.cellSize;

    ctx.strokeStyle = 'hsl(' + hue + ', 100%, 45%)';
    ctx.fillStyle = 'hsl(' + hue + ', 100%, 50%)';
    ctx.lineWidth = cellSize * (1 / 6);

    const [screenX, screenY] = [screen.gridTopLeft.x, screen.gridTopLeft.y];
    const [topLX, topLY] = [screen.topLeft.x, screen.topLeft.y];

    for (let cell of object.cells) {
        let [x, y] = [cell.x, cell.y];
        if (x < (screenX) || x > (screenX + screen.width / cellSize) ||
            y < (screenY) || y > (screenY + screen.width / cellSize)) {
            continue;
        }

        const posX = (topLX + x - screenX) * cellSize;
        const posY = (topLY + y - screenY) * cellSize;

        if (object.unit_type == 'worker') {
            drawCircle(ctx, posX + 0.5 * cellSize, posY + 0.5 * cellSize, cellSize / 2, 30);
        } else {
            ctx.fillRect(posX, posY, cellSize, cellSize);
            ctx.strokeRect(posX, posY, cellSize, cellSize);
        }
    }
}