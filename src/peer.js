/*
-----------------------------------------------------------------------------------
|
| Version notes
|
-----------------------------------------------------------------------------------
*/
/*
  This version contains the first implementation of the jit creation
  and delivery of a walker offer.

  We have noticed that the ICE candidate collection is slow. The problem arise due to
  it taking 10 seconds from the first and only candidate is found to the last candidate
  event which is null, triggering the sending of the the offer.

  The walker appears to be unaffected by the ice candidate null time delay problem.
*/

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
}, 45000)

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
    this._connectionsAwaitingAnswer = {}
    this._walkerConnections = {}
    this.connectToServer()
  }

  connectToServer () {
    console.log(config.webSocketUrl)
    this._socket = new window.WebSocket(config.webSocketUrl)
    this._socket.onopen = this.onSocketOpen.bind(this)
    this._socket.onmessage = this.onSocketMessage.bind(this)
    this._socket.onerror = err => console.log('Error in socket connection')
  }

  onSocketOpen () {
    this.init()
  }

  onSocketMessage (message) {
    const msg = JSON.parse(message.data)
    // console.log('Got from socket: ' + message.data)
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
      this.connectWalker(msg.payload, msg.walkerId)
    }
    if (msg.type === 'request-offer-for-walker') {
      // console.log('walkerId from socket: ', message)
      this.createNewWalkerConnection(msg.walkerId, this._socket)
    }
  }

  init () {
    this._initializedCon = new RTCPeerConnection(config.iceConfig)
    this._recievedCon = new RTCPeerConnection(config.iceConfig)
    this._readyCon = new RTCPeerConnection(config.iceConfig)

    this._initializedChannel
    this._recievedChannel
    this._readyChannel

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
        // console.log('Opened connection to revievedPeer')
        // channel.send(this._readyOffer)
      }
      channel.onmessage = (message) => {
        this.handleChannelMessage(message, channel)
      }
    }
  }

  async createNewWalkerConnection (walkerId, requestingChannel) {
    console.log('Start creating new PeerConnection')
    const con = new RTCPeerConnection(config.iceConfig)
    try {
      const dataChannelReady = con.createDataChannel('ready-data-channel')
      // Setup handlers for the locally created channel
      dataChannelReady.onmessage = (message) => {
        // console.log('onMessage called')
        this.handleChannelMessage(message, dataChannelReady)
      }

      dataChannelReady.onopen = (event) => {
        console.log('Connection opened to walker with id ' + walkerId)
        this._walkerConnections[[walkerId]] = {
          connection: con,
          channel: dataChannelReady
        }
        delete this._connectionsAwaitingAnswer[[walkerId]]
      }

      // Create the offer for a p2p connection
      const offer = await con.createOffer()
      await con.setLocalDescription(offer)
      con.onicecandidate = (candidate) => {
        console.log('Got candidate event')
        if (candidate.candidate == null) {
          const jsonOffer = JSON.stringify({
            walkerId,
            type: 'offer-for-walker',
            payload: con.localDescription,
            uuid: this._uuid
          })
          this._connectionsAwaitingAnswer[[walkerId]] = {
            connection: con,
            offer: jsonOffer,
            channel: dataChannelReady
          }
          console.log('Offer created, sending')
          requestingChannel.send(jsonOffer)
        }
      }
    } catch (err) {
      console.log(err)
    }
  }

  connectWalker (sdp, walkerId) {
    // console.log('connect walkerId: ', walkerId)
    this._connectionsAwaitingAnswer[[walkerId]].connection.setRemoteDescription(sdp)
  }

  async createOffer () {
    try {
      // Create data channel
      const dataChannel = this._initializedCon.createDataChannel('data-channel')
      dataChannel.onmessage = (message) => {
        this.handleChannelMessage(message, dataChannel)
      }
      dataChannel.onopen = () => {
        console.log('Ready for walker')
      }
      this._initializedChannel = dataChannel

      // Create the offer for a P2P connection
      const offer = await this._initializedCon.createOffer()
      await this._initializedCon.setLocalDescription(offer)
      this._initializedCon.onicecandidate = (candidate) => {
        if (candidate.candidate == null) {
          const msg = JSON.stringify({
            type: 'joining',
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
        const offer = new RTCSessionDescription(sdp)
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
        const answer = new RTCSessionDescription(sdp)
        this._initializedCon.setRemoteDescription(answer)
        // console.log('initilizedCon has been set.')
      }
    } catch (err) {
      console.log(err)
    }
  }

  handleChannelMessage (channelMessage, channel) {
    // console.log('handling: ', channelMessage)
    const channelMessageData = channelMessage.data
    var message = JSON.parse(channelMessageData)
    switch (message.type) {
      // case 'walker-request-offer':
      //   console.log('waiting')
      //   this._waitingOffer = JSON.stringify(message.payload)
      //   break
      case 'walker-to-middle':
        // console.log('sending middle-to-next')
        this._initializedChannel.send(JSON.stringify({
          type: 'middle-to-next',
          data: message.payload,
          walkerId: message.walkerId
        }))
        break
      case 'middle-to-next':
        console.log('Recived answer from walker')
        var answer = new RTCSessionDescription(message.data)
        this.connectWalker(answer, message.walkerId)
        // console.log('middleToNext')
        break
      case 'get-offer-from-next-peer':
        // console.log('sending: request-offer-for-walker')
        this._initializedChannel.send(JSON.stringify({
          type: 'request-offer-for-walker',
          walkerId: message.walkerId
        }))
        // channel.send(this._waitingOffer)
        break
      case 'chat':
        console.log(`FROM (${message.uuid}): ${message.payload}`)
        break
      case 'request-offer-for-walker':
        // console.log('Current Channel: ', channel)
        this.createNewWalkerConnection(message.walkerId, channel)
        break
      case 'offer-for-walker':
        // console.log('sending offer to walker')
        this._walkerConnections[[message.walkerId]].channel.send(JSON.stringify(message.payload))
        break
      default: console.log(`No case for type: ${message.type}`)
    }
  }
}

const newPeer = new Peer()
console.log('My ID is: ' + newPeer._uuid)
