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
    this.connectToServer()
    this._requestTimeSend = Date.now()
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
    this._requestTimeSend = Date.now()
  }

  handleMessage (message, peerConnection, channel) {
    if (message.sdp) {
      const offer = new window.RTCSessionDescription(message)
      this.handleDataChannels(peerConnection)
      peerConnection.setRemoteDescription(offer, () => {
        peerConnection.onicecandidate = (event) => {
          if (event.candidate == null) {
            // TODO: Send end of candidates event
            this._timeIceGathering = Date.now() - this._timeIceGatheringStart
          } else {
            this._timeHostCandidate = Date.now() - this._timeIceGatheringStart
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
        this._timeIceGatheringStart = Date.now()
        peerConnection.createAnswer((answer) => {
          peerConnection.setLocalDescription(answer)
          channel.send(JSON.stringify({
            type: 'answer-from-walker-relay',
            payload: peerConnection.localDescription,
            walkerId: this._uuid
          }))
        }, errorHandler)
      }, errorHandler)
    } else {
      // console.log(JSON.stringify(message))
      peerConnection.addIceCandidate(new window.RTCIceCandidate(message))
    }
  }

// 'walker-request-answer'
  handleDataChannels (peerConnection) {
    peerConnection.oniceconnectionstatechange = (event) => {
      // console.log('ICE state ' + JSON.stringify(event))
      // console.log('ICE connection state changed to: ' + peerConnection.iceConnectionState)
      if (peerConnection.iceConnectionState === 'connected') {
        this._timeConnectingPeer = Date.now() - this._timeInitEF
      }
    }
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
        console.log(`### LOG ###${Date.now()},${this._timeHostCandidate},${this._timeIceGathering},${this._timeConnectingPeer}`)
        this._requestTimeSend = Date.now()
        this._timeInitEF = Date.now()
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