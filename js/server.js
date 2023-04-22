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
    if (connectedClients[k].signature !== req.query.shas) {
      console.log(`notifying client ${k}`);
      connectedClients[k].ws.send(JSON.stringify({cmd: 'reload', shas: req.query.shas}));
    } else {
      console.log(`client ${k} is already on the right version`);
    }
  });
  res.end('yay!\n');
});

app.listen(httpPort, () => { console.log(`http listening on localhost:${httpPort}`); });

const wsServer = new WebSocket.Server({port: wsPort});

console.log(`ws listening on localhost:${wsPort}`);

wsServer.on('connection', ws => {
  let saveVirtue = '';
  ws.on('close', () => {
    if (saveVirtue !== '') {
      delete connectedClients[saveVirtue];
      console.log('client disconnected');
    }
  });
  ws.on('message', (msg) => {
    const json = JSON.parse(msg);
    if (typeof json === 'object') {
      if (json.cmd === 'identify') {
        console.log(`identify: ${json.virtue} -> ${JSON.stringify({cookie: json.cookie, ua: json.ua})}`);
        saveVirtue = json.virtue;
        connectedClients[json.virtue] = {
          ws,
          signature: null
        };
        console.log('client connected');
      } else if (json.cmd == 'signature') {
        console.log(`signature: ${json.virtue} => ${json.signature}`);
        // NOTE(dkorolev): Invariant: `identify` should always come before `signature`. But we're liberal.
        if (!(json.virtue in connectedClients)) {
          connectedClients[json.virtue] = {
            ws,
            signature: null,
          };
        };
        connectedClients[json.virtue].signature = json.signature;
      } else if (json.cmd === 'ping') {
        ws.send(JSON.stringify({cmd: 'pong', n: json.n, ts: Date.now()}));
      } else {
        console.log(`unknown command: '${json.cmd}'`);
      }
    }
  });
});
