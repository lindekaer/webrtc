/*
-----------------------------------------------------------------------------------
|
| Configs
|
-----------------------------------------------------------------------------------
*/

// Basic ICE config
var iceConfig = {
  iceServers: [
    { url: 'stun:23.21.150.121' }
  ]
}

// Config for a 'data-only' offer
var mediaConstraints = {
  mandatory: {
    OfferToReceiveAudio: false,
    OfferToReceiveVideo: false
  }
}

/*
-----------------------------------------------------------------------------------
|
| Peer class
|
-----------------------------------------------------------------------------------
*/

var Peer = {}

Peer.start = function () {
  this._uuid = generateUuid()
  this.connectToServer()
}

Peer.connectToServer = function () {
  this._socket = new window.WebSocket('ws://localhost:8080/socketserver')
  this._socket.onopen = this.onSocketOpen.bind(this)
  this._socket.onmessage = this.onSocketMessage.bind(this)
}

Peer.onSocketOpen = function () {
  this._socket.send(JSON.stringify({
    type: 'joining',
    uuid: this._uuid
  }))
  this.init()
}

Peer.onSocketMessage = function (message) {
  var data = JSON.parse(message.data)
  if (data.payload.type === 'offer') {
    this.consume(data.payload, data.uuid)
  }
}

Peer.init = function () {
  this._initializedCon = new RTCPeerConnection(iceConfig)
  this._recievedCon = new RTCPeerConnection(iceConfig)
  this._readyCon = new RTCPeerConnection(iceConfig)

  this._initializedChannel
  this._recievedChannel
  this._readyChannel
  this._waitingOffer
  this._readyOffer

  this.setupPeerConnection(this._initializedCon)
  this.setupPeerConnection(this._recievedCon)
  this.setupPeerConnection(this._readyCon)
  this.setupReadyCon()
  this.addDomEventHandlers()
}

Peer.setupPeerConnection = function (peerConnection) {
  var self = this
  peerConnection.ondatachannel = function (evt) {
    var channel = evt.channel
    self._recievedChannel = channel
    channel.onopen = function () {
      console.log('Im now open.')
      channel.send('Hi there')
    }
    channel.onmessage = function (msg) {
      console.log(msg)
      self.handleMessage(JSON.parse(msg.data), channel)
    }
    channel.onerror = function (err) { console.log(err) }
    channel.onclose = function () { console.log('Closed!') }
    channel.onopen = function (evt) { console.log('Opened'); channel.send(self._readyOffer) }
  }
}

Peer.handleMessage = function (message, channel) {
  console.log(message)
  switch (message.type) {
    case 'waiting':
      console.log('waiting')
      this._waitingOffer = JSON.stringify(message.data)
      break
    case 'walkerToMiddle':
      this._initializedChannel.send(JSON.stringify({
        type: 'middleToNext',
        data: message.data
      }))
      console.log('walkerToMiddle')
      break
    case 'middleToNext':
      var answer = new RTCSessionDescription(message.data)
      this._readyCon.setRemoteDescription(answer)
      console.log('middleToNext')
      break
    case 'sendWaiting':
      console.log('sendWaiting')
      channel.send(this._waitingOffer)
      break
    default: console.log('No type: ')
  }
}

Peer.setupReadyCon = function () {
  var dataChannelReady = this._readyCon.createDataChannel('ready-channel')
  // Setup handlers for the locally create channel
  this.handleChannel(dataChannelReady)
  // Config for a 'data-only' offer
  var readyChannel = dataChannelReady
  // Create the offer for a p2p connection
  this._readyCon.createOffer(this.handleOfferReady.bind(this), function () {}, mediaConstraints)
  this._readyCon.onicecandidate = this.handlerOnIceCandidate.bind(this)
}

Peer.handleChannel = function (channel) {
  // Log new messages
  channel.onmessage = function (msg) {
    console.log('Getting data')
    console.log(msg)
    this.handleMessage(JSON.parse(msg.data), channel)
    this._waitingOffer = msg.data
  }
  // Other events
  channel.onerror = function (err) { console.log(err) }
  channel.onclose = function () { console.log('Closed!') }
  channel.onopen = function (evt) { console.log('Opened') }
}

Peer.addDomEventHandlers = function () {
  // DOM elements
  var generateBtn = document.querySelector('#generate-offer')
  var consumeBtn = document.querySelector('#consume-sdp')
  var sdp = document.querySelector('#sdp')
  var walkerBtn = document.querySelector('#consume-walker-offer')
  var showWalkerOffer = document.querySelector('#show-walker-offer')

  var self = this

  showWalkerOffer.addEventListener('click', function () {
    self.printSdp(JSON.parse(self._readyOffer))
  })

  walkerBtn.addEventListener('click', function () {
    var data = JSON.parse(sdp.value)
    var answer = new RTCSessionDescription(data)
    self._readyCon.setRemoteDescription(answer)
  })

  // Create offer for the initializedCon
  generateBtn.addEventListener('click', function () {
    // setUpPeerConnection(initializedCon)

    var dataChannel = self._initializedCon.createDataChannel('fun-channel')
    // Setup handlers for the locally create channel
    self.handleChannel(dataChannel)
    self._initializedChannel = dataChannel

    // Create the offer for a p2p connection
    self._initializedCon.createOffer(self.handleOfferInit.bind(self), function () {}, mediaConstraints)
    self._initializedCon.onicecandidate = function (candidate) {
      // When there are no more candidates...
      if (candidate.candidate == null) {
        // Print the offer in the DOM
        self.printSdp(self._initializedCon.localDescription)
      }
    }
  })

  // Listener for comsune buttom
  consumeBtn.addEventListener('click', function () {
    self.consume.bind(self, sdp.value)
  })
}

Peer.handleOfferInit = function (offer) {
  // Set local description
  this._initializedCon.setLocalDescription(offer)
}

Peer.handleOfferReady = function (offer) {
  // Set local description
  this._readyCon.setLocalDescription(offer)
}

Peer.printSdp = function (sdp) {
  // Print it to the DOM
  var generatedOffer = document.querySelector('#generated-content')
  generatedOffer.innerHTML = JSON.stringify(sdp, null, 2)
  // Send it to the server

  var msg = {
    data: sdp,
    type: 'offer',
    uuid: this._uuid
  }
  this._socket.send(JSON.stringify(msg, null, 2))
}

Peer.consume = function (data, offererUuid) {
  var json = new RTCSessionDescription(data)
  if (json.type === 'offer') {
    // the data is an offer and will be set up on recievingCon
    var offer = new RTCSessionDescription(data)
    var self = this
    self._recievedCon.onicecandidate = function (candidate) {
      if (candidate.candidate == null) {
        self.printSdp(self._recievedCon.localDescription)
      }
    }
    self._recievedCon.setRemoteDescription(offer, function () {
      self._recievedCon.createAnswer(function (answer) {
        self._recievedCon.setLocalDescription(answer)
        self._socket.send(JSON.stringify({
          type: 'answer',
          payload: answer,
          uuid: offererUuid
        }))
      }, function (err) {})
    })
  } else if (json.type === 'answer') {
    // the data is an answer and will be set up on initializedCon
    var answer = new RTCSessionDescription(data)
    self._initializedCon.setRemoteDescription(answer)
    // After this, the connection is established...
  }
}

Peer.handlerOnIceCandidate = function (candidate) {
  // When there are no more candidates...
  if (candidate.candidate == null) {
    // Print the offer in the DOM
    // console.log('Ready-offer: ', readyCon.localDescription)
    this._readyOffer = JSON.stringify({
      type: 'waiting',
      data: this._readyCon.localDescription
    })
  }
}

/*
-----------------------------------------------------------------------------------
|
| Utils
|
-----------------------------------------------------------------------------------
*/

function generateUuid () {
  var d = new Date().getTime()
  if (window.performance && typeof window.performance.now === 'function') {
    d += window.performance.now() // use high-precision timer if available
  }
  var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    var r = (d + Math.random() * 16) % 16 | 0
    d = Math.floor(d / 16)
    return (c === 'x' ? r : (r&0x3 | 0x8)).toString(16)
  })
  return uuid
}

/*
-----------------------------------------------------------------------------------
|
| Bootstrap application
|
-----------------------------------------------------------------------------------
*/

Peer.start()
