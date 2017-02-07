var http = require('http');
var fs = require('fs');
var path = require('path');
var mime = require('mime');
var chatServer = require('./lib/chat_server');

var cache = {};

function send404(res){
  res.writeHead(404,{'Content-Type':'text/plain'});
  res.write('Error 404: Resource not found.');
  res.end();
};

function sendFile(res,filePath,fileContents) {
  res.writeHead(
    200,
    {'Content-Type': mime.lookup(filePath)}
  );
  res.end(fileContents);
};

function serverStatic(res, cache, absPath){
  if (cache[absPath]) {
    sendFile(res, absPath, cache[absPath]);
  } else {
    fs.exists(absPath,function (exist) {
      if (exist) {
        fs.readFile(absPath,function (error , data) {
          if (error ) {
            send404();
          } else {
            cache[absPath]=data;
            sendFile(res, absPath, data);
          }
        });
      } else {
        send404(res);
      }
    });
  }
}

var server = http.createServer(function(req,res){
  var filePath = false;

  if (req.url == '/') {
    filePath = 'public/index.html';
  }else {
    filePath = 'public' + req.url;
  }

  var absPath = './' + filePath;
  serverStatic(res,cache,absPath);
});

server.listen(3000, function () {
  console.log('Server lisening on port 3000');
});

chatServer.listen(server);
