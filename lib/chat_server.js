var socketio = require('socket.io');
var io;
var guestNumber = 1;
var nickNames = {};
var namesUsed = [];
var currentRoom = {};

exports.listen = function(server){
  io = socketio.listen(server);
  // io.set('log level', 1);

  io.sockets.on('connection',function(socket){
    guestNumber = assignGuestName(socket, guestNumber, nickNames, namesUsed);
    joinRoom(socket, 'Lobby');
    handleMessageBroadcasting(socket, nickNames);
    handleNameChangeAttemps(socket, nickNames, namesUsed);
    handleRoomJoining(socket);
    socket.on('rooms', function(){
      var rooms = {};
      for (var roomName in io.sockets.adapter.rooms) {
           var room=io.sockets.adapter.rooms[roomName];
          if (!(room.length==1 && roomName in room.sockets)) {
            rooms[roomName]=room;
          }
      }
      socket.emit('rooms',rooms);
    });

    handleClientDisconnect(socket, nickNames, namesUsed);
  });
};

function assignGuestName(socket, guestNumber, nickNames, namesUsed){
  var name = 'Guest'+ guestNumber;
  nickNames[socket.id] = name;
  socket.emit('nameResult', {
    success: true,
    name: name
  });
  namesUsed.push(name);
  return guestNumber+1;
};

function joinRoom(socket,room){
  socket.join(room);
  currentRoom[socket.id] = room;
  socket.emit('joinResult',{room: room});
  socket.broadcast.to(room).emit('message',{
    text: nickNames[socket.id]+' has joined '+room+'.'
  });

  var usersInRoom = io.sockets.adapter.rooms[room];
  if (usersInRoom.length>1) {
    var usersInRoomSummary = 'Users currently in '+room+': ';
    var index=0;
    for (var userSocketId in usersInRoom.sockets) {
      if (userSocketId != socket.id) {
        if (index>0) {
          usersInRoomSummary+=', ';
        }
        usersInRoomSummary+=nickNames[userSocketId];
        index++;
      }
    }
    usersInRoomSummary+='.';
    socket.emit('message',{text: usersInRoomSummary});
  }
};

function handleNameChangeAttemps(socket, nickNames, namesUsed){
  socket.on('nameAttempt',function(name){
    if (name.indexOf('Guest')==0) {
      socket.emit('nameResult',{
        success: false,
        message: 'Names cannot begin with "Guest"'
      });
    }else {
      if (namesUsed.indexOf(name) == -1) {
        var previousName = nickNames[socket.id];
        var previousNameIndex = namesUsed.indexOf(previousName);
        namesUsed.push(name);
        nickNames[socket.id] = name;
        delete namesUsed[previousNameIndex];
        socket.emit('nameResult',{
          success: true,
          name: name
        });
        socket.broadcast.to(currentRoom[socket.id]).emit('message',{
          text: previousName+' is now known as '+name+'.'
        });
      }else {
        socket.emit({
          success: false,
          message: 'That name is already in use.'
        });
      }
    }
  })
};

function handleMessageBroadcasting(socket, nickNames){
  socket.on('message',function(message){
    socket.broadcast.to(message.room).emit('message',{
      text: nickNames[socket.id] + ':' + message.text
    });
  });
};

function handleRoomJoining(socket){
  socket.on('join', function(room){
    socket.leave(currentRoom[socket.id]);
    joinRoom(socket,room.newRoom);
  });
};

function handleClientDisconnect(socket, nickNames, namesUsed){
  socket.on('disconnect',function(){
    var nameIndex = namesUsed.indexOf(nickNames[socket.id]);
    delete nickNames[socket.id];
    delete namesUsed[nameIndex];
  });
};
