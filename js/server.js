const express = require('express');
const cors = require('cors');
const WebSocket = require('ws');
const crypto = require('node:crypto');

const signalHandler = async (signal) => {
  console.log(`\ngot signal: ${signal}`);
  process.exit(signal);
};

process.on('SIGINT', signalHandler);
process.on('SIGTERM', signalHandler);

let shas = process.argv[2];
if (!(typeof shas === 'string' && shas.length > 0)) {
  console.log('the first argument should be the shas sum of the data to serve');
  process.exit(1);
}

console.log(`shas: ${shas}`);

// TODO(dkorolev): Use a random ID per opened page! In case the page is opened more than once.
let connectedClients = {};

const httpPort = process.env.ETERNAL_SERVER_HTTP_PORT || 9876;
const wsPort = process.env.ETERNAL_SERVER_WS_PORT || 9877;

const app = express();

app.get('/update', (req, res) => {
  console.log(`update: ${req.query.shas}`);
  Object.keys(connectedClients).forEach((k) => {
    console.log(`notifying client ${k}`);
    connectedClients[k].send(JSON.stringify({cmd: 'reload', shas: req.query.shas}));
  });
  res.end('yay!\n');
});

app.listen(httpPort, () => { console.log(`http listening on localhost:${httpPort}`); });

const wsServer = new WebSocket.Server({port: wsPort});

console.log(`ws listening on localhost:${wsPort}`);

wsServer.on('connection', ws => {
  let saveNonce = '';
  ws.on('close', () => {
    if (saveNonce !== '') {
      delete connectedClients[saveNonce];
      console.log('client disconnected');
    }
  });
  ws.on('message', (msg) => {
    const json = JSON.parse(msg);
    if (typeof json === 'object') {
      if (json.cmd === 'ping') {
        saveNonce = json.nonce;
        connectedClients[json.nonce] = ws;
        console.log('client connected');
        ws.send(JSON.stringify({cmd: 'pong', n: json.n, ts: Date.now()}));
      }
    }
  });
});
