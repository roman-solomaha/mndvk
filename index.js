const WebSocket = require('ws');
const http = require('http');
const fs = require('fs');
const url = require('url');
const path = require('path');

const HTTP_PORT = 10000;

const mimeTypes = {
  "html": "text/html",
  "jpeg": "image/jpeg",
  "jpg": "image/jpeg",
  "png": "image/png",
  "ico": "image/vnd.microsoft.icon",
  "js": "text/javascript",
  "css": "text/css",
  "svg": "image/svg+xml",
  "json": "application/json",
  "txt": "text/plain",
};

const server = http.createServer(function(request, response) {
  const pathname = url.parse(request.url).pathname;
  let filename = path.join(process.cwd(), 'build', pathname);

  if (pathname === '/') {
    filename += 'index.html';
  }

  fs.stat(filename, function(err) {
    if(err) {
      response.writeHead(404, {"Content-Type": "text/plain"});
      response.write("404 Not Found\n");
      response.end();
      return;
    }

    fs.readFile(filename, function(err, file) {
      if(err) {
        response.writeHead(500, {"Content-Type": "text/plain"});
        response.write(err + "\n");
        response.end();
        return;
      }
      
      const splitFilename = filename.split('.');
      const ext = splitFilename.at(-1) === 'map' ? splitFilename.at(-2) : splitFilename.at(-1);
      const type = mimeTypes[ext];
      response.writeHead(200, {"Content-Type": type});
      response.write(file);
      response.end();
    });
  });

}).listen(HTTP_PORT, () => console.log('listen http on ', HTTP_PORT));

// WebSocket

const wss = new WebSocket.Server({ server });

const initialState = {
  players: [],
  activePlayer: 0,
  chipPositions: [
    [-1.1, -1.2, -1.3, -1.4],
    [-2.1, -2.2, -2.3, -2.4],
    [-3.1, -3.2, -3.3, -3.4],
    [-4.1, -4.2, -4.3, -4.4],
  ],
  diceValues: [6, 6],
};

let state = { ...initialState };
let clients = [];

function sendAll(from, message) {
  for (let i = 0; i < clients.length; i++) {
    if (clients[i] !== from) {
      clients[i].send(message);
    }
  }
}

wss.on('connection', (ws) => {
  ws.send(JSON.stringify({ state }));
  
  ws.on('message', (data) => {
    const req = JSON.parse(data);

    if (req?.name === 'clean') {
      state = { ...initialState };
      sendAll(ws, JSON.stringify({ name: 'clean' }));
      return;
    }

    if (req?.userID) {
      const alreadyConnectedIndex = clients.findIndex((client) => client.userID === ws.userID);
      if (alreadyConnectedIndex > -1) {
        clients.splice(alreadyConnectedIndex, 1);
      }
      ws.userID = req.userID;
      clients.push(ws);
      return;
    }

    state = {
      ...state,
      ...req,
    };
    sendAll(ws, JSON.stringify({ changedData: req }));
  });
  
  ws.on('close', (code, data) => {
    const removeClientIndex = clients.findIndex((client) => client.user === ws.user);
    if (removeClientIndex > -1) {
      clients.splice(removeClientIndex, 1);
    }
  })
});

wss.on('listening', () => {
   console.log('starting wss...')
});


