const WebSocket = require('ws');

const port = process.env.ETERNAL_SERVER_PORT || 9876;
const wss = new WebSocket.Server({port});

console.log(`ws listening on port ${port}`);

wss.on('connection', ws => {
  let t = 0;
  ws.send('connected');
  let interval = setInterval(_ => {
    ws.send('timer: ' + ++t);
  }, 100);
  ws.on('close', _ => {
    clearInterval(interval);
  });
  ws.on('message', msg => {
    console.log(ws.send('echoing: ' + msg));
  });
});
