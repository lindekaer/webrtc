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
  }

  connectToServer () {
    this._socket = new window.WebSocket(config.webSocketUrl)
    this._socket.onopen = this.onSocketOpen.bind(this)
    this._socket.onmessage = this.onSocketMessage.bind(this)
  }

  onSocketOpen () {
    this.init()
  }

  onSocketMessage (message) {
    console.log(message)
    this.consume(message.data)
  }

  init () {
    this._currentCon = new RTCPeerConnection(config.iceConfig)
    this._nextCon
    this._nodeCount = 0
    const msg = JSON.stringify({
      type: 'walker-request',
      uuid: this._uuid
    })
    this._socket.send(msg)
  }

  async consume (rawMessage) {
    try {
      const message = JSON.parse(rawMessage)
      const offer = new RTCSessionDescription(message)
      this.handleDataChannels(this._currentCon)
      await this._currentCon.setRemoteDescription(offer)
      const answer = await this._currentCon.createAnswer()
      this._currentCon.setLocalDescription(answer)
      this._currentCon.onicecandidate = (candidate) => {
        if (candidate.candidate == null) {
          this._socket.send(JSON.stringify({
            type: 'walker-request-answer',
            payload: this._currentCon.localDescription
          }))
        }
      }
    } catch (err) {
      console.log(err)
    }
  }

  handleDataChannels (peerConnection) {
    peerConnection.ondatachannel = (event) => {
      const channel = event.channel
      channel.onmessage = (msg) => {
        const data = JSON.parse(msg.data)
        const offer = new RTCSessionDescription(data)
        this._currentCon = this._nextCon
        this._nextCon = new RTCPeerConnection(config.iceConfig)
        this.handleDataChannels(this._nextCon)

        this._nextCon.setRemoteDescription(offer, () => {
          this._nextCon.createAnswer((answer) => {
            this._nextCon.setLocalDescription(answer)
          }, errorHandler)
        }, errorHandler)
        this._nextCon.onicecandidate = (candidate) => {
          if (candidate.candidate == null) {
            channel.send(JSON.stringify({ type: 'walker-to-middle', payload: this._nextCon.localDescription }))
          }
        }
      }

      channel.onopen = (evt) => {
        this._nodeCount++
        console.log('Walker channel has opened')
        console.log('Connection established to node ' + this._nodeCount + ' @ ' + Date.now())
        channel.send(JSON.stringify({ type: 'send-waiting' }))
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
