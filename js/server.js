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

const httpPort = process.env.ETERNAL_SERVER_HTTP_PORT || 9876;
const wsPort = process.env.ETERNAL_SERVER_WS_PORT || 9877;

const app = express();
app.use(cors({ origin: '*' }));

const originalHtmlContent = String(fs.readFileSync('/html/index.html'));
const sha256 = crypto.createHash('sha256').update(originalHtmlContent).digest('hex');

const htmlContent = originalHtmlContent.replace(/___SHA256___/g, sha256);

app.get('/', (_, res) => {
  res.writeHead(200, {'Content-Type': 'text/html'});
  res.end(htmlContent);
});

app.listen(httpPort, () => { console.log(`http listening on localhost:${httpPort}`); });

const wsServer = new WebSocket.Server({port: wsPort});

console.log(`ws listening on localhost:${wsPort}`);

wsServer.on('connection', ws => {
  let t = 0;
  ws.send('connected');
  let interval = setInterval(() => {
    ws.send('timer: ' + ++t);
  }, 100);
  ws.on('close', () => {
    clearInterval(interval);
  });
  ws.on('message', msg => {
    console.log(ws.send('echoing: ' + msg));
  });
});
