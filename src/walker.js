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

const Log = (msg) => {
  const data = Date.now() + ' - ' + msg
  console.log(data)
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

  onSocketMessage (message) {
    // console.log('Got message from socket: ' + message.data)
    this.consume(message.data)
  }

  init () {
    this._currentCon = new RTCPeerConnection(config.iceConfig)
    this._nextCon = new RTCPeerConnection(config.iceConfig)
    this._currentChannel
    this._nextChannel
    this._nodeCount = 0
    const msg = JSON.stringify({
      type: 'walker-request',
      uuid: this._uuid
    })
    this._socket.send(msg)
    this._requestTimeSend = Date.now()
  }

  async consume (rawMessage) {
    // console.log('Consuming')
    try {
      const message = JSON.parse(rawMessage)
      const offer = new RTCSessionDescription(message)
      this.handleDataChannels(this._nextCon)
      await this._nextCon.setRemoteDescription(offer)
      const answer = await this._nextCon.createAnswer()
      this._nextCon.setLocalDescription(answer)
      this._nextCon.onicecandidate = (candidate) => {
        if (candidate.candidate == null) {
          var answer = JSON.stringify({
            type: 'walker-request-answer',
            payload: this._nextCon.localDescription,
            walkerId: this._uuid
          })
          this._socket.send(answer)
          // console.log('Sending answer back: ' + answer)
        }
      }
    } catch (err) {
      console.log(err)
    }
  }

  handleDataChannels (peerConnection) {
    peerConnection.ondatachannel = (event) => {
      const channel = event.channel
      this._nextChannel = channel
      console.log('On data channel')
      channel.onmessage = (msg) => {
        console.log('On message')
        // console.log('Recieved offer from node ' + this._nodeCount)
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
          // console.log('Got candidate event')
          if (candidate.candidate == null) {
            var answer = JSON.stringify({
              type: 'walker-to-middle',
              payload: this._nextCon.localDescription,
              walkerId: this._uuid
            })
            // console.log('Sending answer to node ' + this._nodeCount)
            // console.log('Sending answer back: ' + answer)
            channel.send(answer)
          }
        }
      }

      channel.onopen = (evt) => {
        console.log('On open')
        this._nodeCount++
        // Log('Connection established to node ' + this._nodeCount)
        Log(`##LOG## Connection established to node ${this._nodeCount}`)
        channel.send(JSON.stringify({
          type: 'get-offer-from-next-peer',
          walkerId: this._uuid
        }))
        if (this._currentChannel) {
          console.log('Closing connection')
          this._currentChannel.send(JSON.stringify({type: 'close'}))
        }
        this._currentCon.close()
        // channel.close()
        this._currentCon = this._nextCon
        this._currentChannel = this._nextChannel
        this._requestTimeSend = Date.now()
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
