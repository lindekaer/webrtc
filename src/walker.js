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

setTimeout(() => {
  document.querySelector('#info').classList.remove('hidden')
}, 20000)

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
    console.log('Connect to server...')
    this._socket = new window.WebSocket(config.webSocketUrl)
    this._socket.onopen = this.onSocketOpen.bind(this)
    this._socket.onmessage = this.onSocketMessage.bind(this)
  }

  onSocketOpen () {
    this.init()
  }

  onSocketMessage (message) {
    console.log('Got message...')
    console.log(message)
    console.log(message.data)
    this.consume(message.data)
  }

  init () {
    console.log('Init...')
    this._currentCon = new RTCPeerConnection(config.iceConfig)
    this._nextCon
    this._nodeCount = 0
    console.log('Send walker request...')
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
      console.log('Answer:')
      console.log(answer.type)
      console.log(answer.sdp)
      this._currentCon.setLocalDescription(answer)
      this._currentCon.onicecandidate = (candidate) => {
        console.log(candidate.candidate)
        if (candidate.candidate == null) {
          this._socket.send(JSON.stringify({
            type: 'walker-request-answer',
            payload: this._currentCon.localDescription,
            walkerId: this._uuid
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
            // console.log('Sending answer to node ' + this._nodeCount)
            channel.send(JSON.stringify({
              type: 'walker-to-middle',
              payload: this._nextCon.localDescription,
              walkerId: this._uuid
            }))
          }
        }
      }

      channel.onopen = (evt) => {
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
