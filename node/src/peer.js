/*
-----------------------------------------------------------------------------------
|
| Imports
|
-----------------------------------------------------------------------------------
*/

import webrtc from 'wrtc'
import WebSocket from 'uws'
import uuid from 'uuid'
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
    if (msg.type === 'walker-request') {
      this._socket.send(this._readyOffer)
    }
    if (msg.type === 'walker-request-answer') {
      this.connectWalker(msg.payload)
    }
  }

  init () {
    this._initializedCon = new webrtc.RTCPeerConnection(config.iceConfig)
    this._recievedCon = new webrtc.RTCPeerConnection(config.iceConfig)
    this._readyCon = new webrtc.RTCPeerConnection(config.iceConfig)

    this._initializedChannel
    this._recievedChannel
    this._readyChannel

    this._readyOffer

    this.setupPeerConnection(this._initializedCon)
    this.setupPeerConnection(this._recievedCon)
    this.setupPeerConnection(this._readyCon)
    this.setupReadyCon()
    this.createOffer()
  }

  setupPeerConnection (peerConnection) {
    peerConnection.ondatachannel = (evt) => {
      var channel = evt.channel
      this._recievedChannel = channel
      channel.onopen = () => {
        channel.send(this._readyOffer)
      }
      channel.onmessage = (message) => {
        this.handleChannelMessage(message)
      }
    }
  }

  async setupReadyCon () {
    try {
      const dataChannelReady = this._readyCon.createDataChannel('ready-data-channel')
      // Setup handlers for the locally created channel
      dataChannelReady.onmessage = (message) => {
        this.handleChannelMessage(message, dataChannelReady)
      }
      // Config for a 'data-only' offer
      this._readyChannel = dataChannelReady
      // Create the offer for a p2p connection
      const offer = await this._readyCon.createOffer()
      await this._readyCon.setLocalDescription(offer)
      this._readyCon.onicecandidate = (candidate) => {
        if (candidate.candidate == null) {
          this._readyOffer = JSON.stringify({
            type: 'walker-request-offer',
            payload: this._readyCon.localDescription,
            uuid: this._uuid
          })
        }
      }
    } catch (err) {
      console.log(err)
    }
  }

  connectWalker (sdp) {
    this._readyCon.setRemoteDescription(sdp)
  }

  async createOffer () {
    try {
      // Create data channel
      const dataChannel = this._initializedCon.createDataChannel('data-channel')
      dataChannel.onmessage = (message) => {
        this.handleChannelMessage(message, dataChannel)
      }
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

  handleChannelMessage (channelMessage, channel) {
    const channelMessageData = channelMessage.data
    var message = JSON.parse(channelMessageData)
    switch (message.type) {
      case 'walker-request-offer':
        console.log('waiting')
        this._waitingOffer = JSON.stringify(message.payload)
        break
      case 'walker-to-middle':
        this._initializedChannel.send(JSON.stringify({
          type: 'middle-to-next',
          data: message.payload
        }))
        break
      case 'middle-to-next':
        var answer = new webrtc.RTCSessionDescription(message.data)
        this._readyCon.setRemoteDescription(answer)
        console.log('middleToNext')
        break
      case 'send-waiting':
        console.log('sendWaiting')
        channel.send(this._waitingOffer)
        break
      case 'chat':
        console.log(`FROM (${message.uuid}): ${message.payload}`)
        break
      default: console.log(`No case for type: ${message.type}`)
    }
  }
}

const newPeer = new Peer()
console.log('My ID is: ' + newPeer._uuid)
