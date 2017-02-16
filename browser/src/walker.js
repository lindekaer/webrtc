/*
-----------------------------------------------------------------------------------
|
| Imports
|
-----------------------------------------------------------------------------------
*/

// import webrtc from 'wrtc'
// import WebSocket from 'uws'
import uuid from 'uuid'
import config from './config'

const Log = console.log
console.log = (msg) => {
  const data = Date.now() + ' - ' + msg
  Log(data)
  document.querySelector('#info').textContent = document.querySelector('#info').textContent + '#!#' + data
}

/*
-----------------------------------------------------------------------------------
|
| Peer class
|
-----------------------------------------------------------------------------------
*/

class WalkerPeer {
  constructor () {
    this._uuid = uuid.v1()
    this.iceIds = []
    this.connectToServer()
  }

  connectToServer () {
    this._socket = new window.WebSocket(config.webSocketUrl)
    this._socket.onopen = this.onSocketOpen.bind(this)
    this._socket.onmessage = this.onSocketMessage.bind(this)
  }

  onSocketOpen () {
    this.init()
  }

  onSocketMessage (rawMessage) {
    const message = JSON.parse(rawMessage.data)
    this.handleMessage(message, this._currentCon, this._socket)
  }

  init () {
    this._currentCon = new window.RTCPeerConnection(config.iceConfig)
    this._nextCon
    this._nodeCount = 0
    const msg = JSON.stringify({
      type: 'walker-request',
      uuid: this._uuid
    })
    this._socket.send(msg)
  }

  handleMessage (message, peerConnection, channel) {

    // console.log('message: ' + JSON.stringify(message))
    if (message.iceIds) {
      console.log('Got offer')
      const offer = new window.RTCSessionDescription(message.payload)
      this.handleDataChannels(peerConnection)
      peerConnection.setRemoteDescription(offer, () => {
        peerConnection.onicecandidate = (event) => {
          if (event.candidate == null) {
            // TODO: Send end of candidates event
          } else {
            if (event.candidate) {
              const jsonOffer = JSON.stringify({
                type: 'ice-candidate-for-peer-relay',
                payload: event.candidate,
                uuid: this._uuid
              })
              channel.send(jsonOffer)
            }
          }
        } 
        peerConnection.createAnswer((answer) => {
          peerConnection.setLocalDescription(answer)
          channel.send(JSON.stringify({
            type: 'answer-from-walker-relay',
            payload: peerConnection.localDescription,
            walkerId: this._uuid
          }))
        }, errorHandler)
        console.log('Got ids too: ' + JSON.stringify(message.iceIds[1]))
        this.iceIds = message.iceIds
      }, errorHandler)
    } else {
      console.log(JSON.stringify(message))
      this.constructIceStringsFromLocalHostCandidate(message.candidate)
      peerConnection.addIceCandidate(new window.RTCIceCandidate(message))
    }
  }

  constructIceStringsFromLocalHostCandidate (candidate) {
    // Get port number
    var startIndex = 0
    var endIndex = 0
    for (var i = 0; i < 5; i++) {
      startIndex = offer.indexOf(' ', startIndex+1)
    }
    endIndex = offer.indexOf(' ', startIndex+1)
    var substring = offer.substring(startIndex+1, endIndex)
    console.log('Port is: ', substring)
  }

// 'walker-request-answer'
  handleDataChannels (peerConnection) {
    peerConnection.ondatachannel = (event) => {
      const channel = event.channel

      channel.onmessage = (msg) => {
        const message = JSON.parse(msg.data)
        this.handleMessage(message, this._nextCon, channel)
      }

      channel.onopen = (evt) => {
        this._currentCon = this._nextCon
        this._nextCon = new window.RTCPeerConnection(config.iceConfig)
        this._nodeCount++
        console.log('Connection established to node ' + this._nodeCount)
        channel.send(JSON.stringify({
          type: 'get-offer-from-next-peer',
          walkerId: this._uuid
        }))
      }
    }
  }
}

const newPeer = new WalkerPeer()
console.log('I am a walker and my ID is: ' + newPeer._uuid)

/*
-----------------------------------------------------------------------------------
|
| Utility functions
|
-----------------------------------------------------------------------------------
*/

function errorHandler (err) {
  console.log(err)
}
