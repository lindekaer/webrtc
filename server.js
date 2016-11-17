/*
-----------------------------------------------------------------------------------
|
| Imports
|
-----------------------------------------------------------------------------------
*/

var WebSocketServer = require('uws').Server

/*
-----------------------------------------------------------------------------------
|
| Web socket server configuration
|
-----------------------------------------------------------------------------------
*/

var peers = []

var server = new WebSocketServer({ port: 3000 }, () => { console.log('Server running on port 3000') })

server.on('connection', (socket) => {
  socket.send('Hello from server!')

  peers.push(socket)
  console.log('Added new peer to "peers"');

  socket.on('message', (data) => {
    msg = JSON.parse(data)
    if (msg.type === 'offer') {
      for (let peer of peers) {
        if (peer !== socket) {
          peer.send(JSON.stringify(msg))
        }
      }
    }
  })

})
