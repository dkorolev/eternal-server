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

const htmls = {
  index: '/html/index.html',
  frame: '/html/frame.html'
};

const htmlData = {};

Object.keys(htmls).forEach((html) => {
  htmlData[html] = {
    content: '',
    hash: '',
    lastModified: 0
  };
});

const rereadHtml = (html, lm) => {
  // TODO(dkorolev): Well, the hash needs to be computed differently.
  htmlData[html].lastModified = lm;
  const originalHtmlContent = String(fs.readFileSync(htmls[html]));
  const newHtmlHash = crypto.createHash('sha256').update(originalHtmlContent).digest('hex').substr(0, 16);
  if (newHtmlHash != htmlData[html].hash) {
    if (htmlData[html].hash === '') {
      console.log(`the html sha256 for ${html} is ${newHtmlHash}`);
    } else {
      console.log(`the html sha256 for ${html} changed from ${htmlData[html].hash} to ${newHtmlHash}`);
    }
    htmlData[html].hash = newHtmlHash;
    htmlData[html].content = originalHtmlContent.replace(/___SHA256___/g, htmlData[html].hash);
    // TODO(dkorolev): Retire everything but this `writeFile[sync]`.
    fs.writeFileSync(`/eternal/${html}.html`, htmlData[html].content);
    Object.keys(connectedClients).forEach((k) => {
      console.log(`notifying client ${k}`);
      connectedClients[k].send(JSON.stringify({cmd: 'reload', sha256: newHtmlHash}));
    });
  }
};

Object.keys(htmls).forEach((html) => {
  rereadHtml(html, fs.statSync(htmls[html]).mtimeMs);
});

setInterval(() => {
  Object.keys(htmls).forEach((html) => {
    try {
      const ts = fs.statSync(htmls[html]).mtimeMs;
      if (ts != htmlData[html].lastModified) {
        rereadHtml(html, ts);
      }
    } catch (ex) {
      console.log(`'stat'  failed for '${htmls[html]}'.`);
    }
  });
}, 250);

const httpPort = process.env.ETERNAL_SERVER_HTTP_PORT || 9876;
const wsPort = process.env.ETERNAL_SERVER_WS_PORT || 9877;

const app = express();
app.use(cors({ origin: '*' }));

// TODO(dkorolev): This is going away right after `nginx` is in place.
Object.keys(htmls).forEach((html) => {
  app.get('/' + html + '.html', (_, res) => {
    res.writeHead(200, {'Content-Type': 'text/html'});
    res.end(htmlData[html].content);
  });
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
