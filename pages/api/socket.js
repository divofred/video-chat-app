// pages/api/socket.js

import { Server } from 'socket.io';
import { customAlphabet } from 'nanoid';
const nanoid = customAlphabet('1234567890abcdef', 6);

const SocketServer = (req, res) => {
  if (res.socket.server.io) {
    console.log('Socket is created');
    return res.end();
  }

  const io = new Server(res.socket.server);
  res.socket.server.io = io;

  io.on('connection', socket => {
    let id = nanoid();
    //Creating the room
    socket.on('create-room', () => {
      //Sending the room ID to the host.
      socket.emit('me', id);
      socket.join(id);
      socket.emit('created');
    });
    //Joining a room
    socket.on('join-room', id => {
      const { rooms } = io.sockets.adapter;
      const room = rooms.get(id);
      //Checking if the room existing
      if (room === undefined) {
        socket.emit('not-existing');
      } else if (room.size === 1) {
        //Joining the other user to the room that contains only the host
        socket.join(id);
        //
        socket.broadcast.to(id).emit('ready', id);
      } else {
        // Returns an Error since they are already two in the room
        socket.emit('full');
      }
    });

    //Once we get the offer from the host, we will send it to the other user
    socket.on('offer', (offer, roomId) => {
      console.log('offer', roomId);
      socket.broadcast.to(roomId).emit('offer', offer, roomId);
    });

    //Once we get an icecandidate from the user, we will send it to the other user
    socket.on('ice-candidate', (candidate, roomId) => {
      console.log('icecandidate', roomId);
      socket.broadcast.to(roomId).emit('ice-candidate', candidate);
    });

    //Once we get an answer from the other user, we will send it to the host.
    socket.on('answer', (answer, roomId) => {
      console.log('answer', roomId);
      socket.broadcast.to(roomId).emit('answer', answer);
    });
  });
  return res.end();
};

export default SocketServer;
