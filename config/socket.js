const socketIO = require('socket.io');
require('dotenv').config();

let io;

module.exports = {
  init: (server) => {
    io = socketIO(server, {
      cors: {
        origin: process.env.CLIENT_URL,
        methods: ['GET', 'POST']
      }
    });
    return io;
  },
  
  getIO: () => {
    if (!io) {
      throw new Error('Socket.IO non initialisé');
    }
    return io;
  }
};