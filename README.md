# `eternal-server`
node.js + WS-powered hot reload + emscripten

## State Machines in `index.html`

TODO(dkorolev): Clean this up.

1. Because the crypto-random nonce generation is async. This is simple: don't start anything until that part is generated.
2. Because a Websocket may get disconnected. This is less simple, but the signature should only be sent once, the rest is pings and hot reload.
3. Hot reload.
