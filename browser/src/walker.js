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
    console.log(JSON.stringify(message))
    console.log('message: ' + JSON.stringify(message.data))
    this.consume(message.data)
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

  async consume (rawMessage) {
    try {
      const message = JSON.parse(rawMessage)
      if (message.sdp) {
        const offer = new window.RTCSessionDescription(message)
        this.handleDataChannels(this._currentCon)
        this._currentCon.onicecandidate = (event) => {
          if (event.candidate == null) {
            this._socket.send(JSON.stringify({
              type: 'answer-from-walker',
              payload: this._currentCon.localDescription,
              walkerId: this._uuid
            }))
          }
        }
        await this._currentCon.setRemoteDescription(offer)
        const answer = await this._currentCon.createAnswer()
        this._currentCon.setLocalDescription(answer)
      } else {
        this._currentCon.addIceCandidate(new window.RTCIceCandidate(message))
      }

    } catch (err) {
      console.log(err)
    }
  }
// 'walker-request-answer'
  handleDataChannels (peerConnection) {
    peerConnection.ondatachannel = (event) => {
      const channel = event.channel
      channel.onmessage = (msg) => {
        const data = JSON.parse(msg.data)
        if (data.sdp) {
          console.log('Offer: ')
          console.log(JSON.stringify(data))
          const offer = new window.RTCSessionDescription(data)
          this.handleDataChannels(this._nextCon)
          this._nextCon.setRemoteDescription(offer, () => {
            this._nextCon.onicecandidate = (event) => {
              if (event.candidate == null) {
                // TODO: Send end of candidates event
              } else {
                if (event.candidate) {
                  const jsonOffer = JSON.stringify({
                    type: 'ice-candidate-for-peer',
                    payload: event.candidate,
                    uuid: this._uuid
                  })
                  channel.send(jsonOffer)
                }
              }
            } 
            this._nextCon.createAnswer((answer) => {
              this._nextCon.setLocalDescription(answer)
              channel.send(JSON.stringify({
                type: 'answer-from-walker-relay',
                payload: this._nextCon.localDescription,
                walkerId: this._uuid
              }))
            }, errorHandler)
          }, errorHandler)
        } else {
          // console.log('Adding ice candidate')
          // console.log('should be ice: ')
          // console.log(JSON.stringify(data))
          console.log('Candidate: ')
          console.log(JSON.stringify(data))
          this._nextCon.addIceCandidate(new window.RTCIceCandidate(data))
        }
      }

      channel.onopen = (evt) => {
        this._currentCon = this._nextCon
        this._nextCon = new window.RTCPeerConnection(config.iceConfig)
        this._nextCon.onicecandidate = (event) => {
          if (event.candidate == null) {
            // channel.send(JSON.stringify({
            //   type: 'answer-from-walker-relay',
            //   payload: this._nextCon.localDescription,
            //   walkerId: this._uuid
            // }))
          }
        }
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
