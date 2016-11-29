/*
-----------------------------------------------------------------------------------
|
| Imports
|
-----------------------------------------------------------------------------------
*/

import webrtc from 'wrtc'
import WebSocket from 'uws'
import uuid from 'node-uuid'
import config from './config'

/*
-----------------------------------------------------------------------------------
|
| Peer class
|
-----------------------------------------------------------------------------------
*/

class Peer {
  constructor () {
    this._uuid = uuid.v1()
    this.connectToServer()
  }

  connectToServer () {
    this._socket = new WebSocket(config.webSocketUrl)
    this._socket.on('open', this.onSocketOpen.bind(this))
    this._socket.on('message', this.onSocketMessage.bind(this))
  }

  onSocketOpen () {
    const msg = JSON.stringify({
      type: 'joining',
      uuid: this._uuid
    })
    this._socket.send(msg)
    this.init()
  }

  onSocketMessage (message) {
    const msg = JSON.parse(message)
    if (msg.type === 'offer') {
      this.consume('offer', msg.payload, msg.uuid)
    }
    if (msg.type === 'answer') {
      this.consume('answer', msg.payload)
    }
  }

  init () {
    this._initializedCon = new webrtc.RTCPeerConnection(config.iceConfig)
    this._recievedCon = new webrtc.RTCPeerConnection(config.iceConfig)
    this._readyCon = new webrtc.RTCPeerConnection(config.iceConfig)

    this._initializedChannel
    this._recievedChannel
    this._readyChannel

    this._waitingOffer
    this._readyOffer

    this.setupPeerConnection(this._initializedCon)
    this.setupPeerConnection(this._recievedCon)
    this.setupPeerConnection(this._readyCon)
    // this.setupReadyCon()
    this.createOffer()
  }

  setupPeerConnection (peerConnection) {
    peerConnection.ondatachannel = (evt) => {
      var channel = evt.channel
      this._recievedChannel = channel
      channel.onopen = () => {
        const msg = JSON.stringify({
          type: 'chat',
          payload: 'Hey!',
          uuid: this._uuid
        })
        channel.send(msg)
      }
      channel.onmessage = (message) => {
        const msg = JSON.parse(message)
        if (msg.type === 'chat') {
          console.log('From: ' + msg.uuid)
          console.log(msg.payload)
        }
      }
    }
  }

  async createOffer () {
    try {
      // Create data channel
      const dataChannel = this._initializedCon.createDataChannel('data-channel')
      this.handleChannel(dataChannel)
      this._initializedChannel = dataChannel

      // Create the offer for a P2P connection
      const offer = await this._initializedCon.createOffer()
      await this._initializedCon.setLocalDescription(offer)
      this._initializedCon.onicecandidate = (candidate) => {
        if (candidate.candidate == null) {
          const msg = JSON.stringify({
            type: 'offer',
            payload: this._initializedCon.localDescription,
            uuid: this._uuid
          })
          this._socket.send(msg)
        }
      }
    } catch (err) {
      console.log(err)
    }
  }

  handleChannel (channel) {
    // Log new messages
    channel.onmessage = function (message) {
      const msg = JSON.parse(message.data)
      if (msg.type === 'chat') {
        console.log('\n')
        console.log('From: ' + msg.uuid)
        console.log(msg.payload)
      }
    }
  }

  async consume (type, sdp, inputUuid) {
    try {
      if (type === 'offer') {
        const offer = new webrtc.RTCSessionDescription(sdp)
        await this._recievedCon.setRemoteDescription(offer)
        const answer = await this._recievedCon.createAnswer()
        this._recievedCon.setLocalDescription(answer)
        this._recievedCon.onicecandidate = (candidate) => {
          if (candidate.candidate == null) {
            this._socket.send(JSON.stringify({
              type: 'answer',
              payload: this._recievedCon.localDescription,
              uuid: inputUuid
            }))
          }
        }
      } else if (type === 'answer') {
        const answer = new webrtc.RTCSessionDescription(sdp)
        this._initializedCon.setRemoteDescription(answer)
      }
    } catch (err) {
      console.log(err)
    }
  }
}

const newPeer = new Peer()
console.log('My ID is: ' + newPeer._uuid)

// Peer.init = function () {

// Peer.handleMessage = function (message, channel) {
//   console.log(message)
//   switch (message.type) {
//     case 'waiting':
//       console.log('waiting')
//       this._waitingOffer = JSON.stringify(message.data)
//       break
//     case 'walkerToMiddle':
//       this._initializedChannel.send(JSON.stringify({
//         type: 'middleToNext',
//         data: message.data
//       }))
//       console.log('walkerToMiddle')
//       break
//     case 'middleToNext':
//       var answer = new RTCSessionDescription(message.data)
//       this._readyCon.setRemoteDescription(answer)
//       console.log('middleToNext')
//       break
//     case 'sendWaiting':
//       console.log('sendWaiting')
//       channel.send(this._waitingOffer)
//       break
//     default: console.log('No type: ')
//   }
// }

// Peer.setupReadyCon = function () {
//   var dataChannelReady = this._readyCon.createDataChannel('ready-channel')
//   // Setup handlers for the locally create channel
//   this.handleChannel(dataChannelReady)
//   // Config for a 'data-only' offer
//   var readyChannel = dataChannelReady
//   // Create the offer for a p2p connection
//   this._readyCon.createOffer(this.handleOfferReady.bind(this), function () {}, mediaConstraints)
//   this._readyCon.onicecandidate = this.handlerOnIceCandidate.bind(this)
// }



// Peer.addDomEventHandlers = function () {
//   // DOM elements
//   var generateBtn = document.querySelector('#generate-offer')
//   var consumeBtn = document.querySelector('#consume-sdp')
//   var sdp = document.querySelector('#sdp')
//   var walkerBtn = document.querySelector('#consume-walker-offer')
//   var showWalkerOffer = document.querySelector('#show-walker-offer')

//   var self = this

//   showWalkerOffer.addEventListener('click', function () {
//     self.printSdp(JSON.parse(self._readyOffer))
//   })

//   walkerBtn.addEventListener('click', function () {
//     var data = JSON.parse(sdp.value)
//     var answer = new RTCSessionDescription(data)
//     self._readyCon.setRemoteDescription(answer)
//   })

//   // Listener for comsune buttom
//   consumeBtn.addEventListener('click', function () {
//     self.consume.bind(self, sdp.value)
//   })
// }

// Peer.handleOfferInit = function (offer) {
//   // Set local description
//   this._initializedCon.setLocalDescription(offer)
// }

// Peer.handleOfferReady = function (offer) {
//   // Set local description
//   this._readyCon.setLocalDescription(offer)
// }

// Peer.printSdp = function (sdp) {
//   // Print it to the DOM
//   var generatedOffer = document.querySelector('#generated-content')
//   generatedOffer.innerHTML = JSON.stringify(sdp, null, 2)
//   // Send it to the server

//   var msg = {
//     data: sdp,
//     type: 'offer',
//     uuid: this._uuid
//   }
//   this._socket.send(JSON.stringify(msg, null, 2))
// }

// Peer.consume = function (data, offererUuid) {
//   var json = new RTCSessionDescription(data)
//   if (json.type === 'offer') {
//     // the data is an offer and will be set up on recievingCon
//     var offer = new RTCSessionDescription(data)
//     var self = this
//     self._recievedCon.onicecandidate = function (candidate) {
//       if (candidate.candidate == null) {
//         self.printSdp(self._recievedCon.localDescription)
//       }
//     }
//     self._recievedCon.setRemoteDescription(offer, function () {
//       self._recievedCon.createAnswer(function (answer) {
//         self._recievedCon.setLocalDescription(answer)
//         self._socket.send(JSON.stringify({
//           type: 'answer',
//           payload: answer,
//           uuid: offererUuid
//         }))
//       }, function (err) {})
//     })
//   } else if (json.type === 'answer') {
//     // the data is an answer and will be set up on initializedCon
//     var answer = new RTCSessionDescription(data)
//     self._initializedCon.setRemoteDescription(answer)
//     // After this, the connection is established...
//   }
// }

// Peer.handlerOnIceCandidate = function (candidate) {
//   // When there are no more candidates...
//   if (candidate.candidate == null) {
//     // Print the offer in the DOM
//     // console.log('Ready-offer: ', readyCon.localDescription)
//     this._readyOffer = JSON.stringify({
//       type: 'waiting',
//       data: this._readyCon.localDescription
//     })
//   }
// }

// /*
// -----------------------------------------------------------------------------------
// |
// | Utils
// |
// -----------------------------------------------------------------------------------
// */

// function generateUuid () {
//   var d = new Date().getTime()
//   if (window.performance && typeof window.performance.now === 'function') {
//     d += window.performance.now() // use high-precision timer if available
//   }
//   var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
//     var r = (d + Math.random() * 16) % 16 | 0
//     d = Math.floor(d / 16)
//     return (c === 'x' ? r : (r&0x3 | 0x8)).toString(16)
//   })
//   return uuid
// }

// /*
// -----------------------------------------------------------------------------------
// |
// | Bootstrap application
// |
// -----------------------------------------------------------------------------------
// */

// Peer.start()
