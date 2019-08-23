import io from 'socket.io-client';
import socket from "../../src/socket";

socket.on('message', msg=>{
    console.log("Hello");
    socket.emit('callback');

})
