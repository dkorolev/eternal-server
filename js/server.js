const fs = require('fs');
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

// TODO(dkorolev): Use a random ID per opened page! In case the page is opened more than once.
let connectedClients = {};

let htmlContent = '';
let htmlHash = '';
let htmlLastModified = 0;
const htmlPath = '/html/index.html';

const rereadHtml = (lm) => {
  htmlLastModified = lm;
  const originalHtmlContent = String(fs.readFileSync(htmlPath));
  const newHtmlHash = crypto.createHash('sha256').update(originalHtmlContent).digest('hex').substr(0, 16);
  if (newHtmlHash != htmlHash) {
    if (htmlHash === '') {
      console.log(`the html sha256 is ${newHtmlHash}`);
    } else {
      console.log(`the html sha256 changed from ${htmlHash} to ${newHtmlHash}`);
    }
    htmlHash = newHtmlHash;
    htmlContent = originalHtmlContent.replace(/___SHA256___/g, htmlHash);
    Object.keys(connectedClients).forEach((k) => {
      console.log(`notifying client ${k}`);
      connectedClients[k].send(JSON.stringify({cmd: 'reload', sha256: newHtmlHash}));
    });
  }
};

rereadHtml(fs.statSync(htmlPath).mtimeMs);

setInterval(() => {
  const ts = fs.statSync(htmlPath).mtimeMs;
  if (ts != htmlLastModified) {
    rereadHtml(ts);
  }
}, 250);

const httpPort = process.env.ETERNAL_SERVER_HTTP_PORT || 9876;
const wsPort = process.env.ETERNAL_SERVER_WS_PORT || 9877;

const app = express();
app.use(cors({ origin: '*' }));

app.get('/', (_, res) => {
  res.writeHead(200, {'Content-Type': 'text/html'});
  res.end(htmlContent);
});

app.listen(httpPort, () => { console.log(`http listening on localhost:${httpPort}`); });

const wsServer = new WebSocket.Server({port: wsPort});

console.log(`ws listening on localhost:${wsPort}`);

wsServer.on('connection', ws => {
  let saveNonce = '';
  ws.on('close', () => {
    if (saveNonce !== '') {
      delete connectedClients[saveNonce];
    }
  });
  ws.on('message', (msg) => {
    const json = JSON.parse(msg);
    if (typeof json === 'object') {
      if (json.cmd === 'ping') {
        saveNonce = json.nonce;
        connectedClients[json.nonce] = ws;
        ws.send(JSON.stringify({cmd: 'pong', n: json.n, ts: Date.now()}));
      }
    }
  });
});
