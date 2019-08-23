// let players = [];


export default function handleSockets(io) {

    io.on('connection', socket => {

        let type = socket.handshake.query.type;
        console.log('[Server] User connected.');
        console.log("[Server] Player type: " + type);

        socket.emit('message', 'Message sent from the server');
    });
}