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
  }

  onSocketOpen () {
    this.init()
  }

  onSocketMessage (message) {
    const msg = JSON.parse(message.data)
    // console.log('Message from socket: ' + JSON.stringify(msg))
    switch (msg.type) {
      case 'offer':
        this.consume('offer', msg.payload, msg.uuid)
        break
      case 'answer':
        this.consume('answer', msg.payload)
        break
      case 'answer-from-walker':
        var answer = new window.RTCSessionDescription(msg.payload)
        this.connectWalker(answer, msg.walkerId)
        break
      case 'request-offer-for-walker':
        this.createNewWalkerConnection(msg.walkerId, this._socket)
        break
      default: console.log('Got message from socket with unknown type of: ' + msg.type)
    }
  }

  init () {
    this._initializedCon = new window.RTCPeerConnection(config.iceConfig)
    this._recievedCon = new window.RTCPeerConnection(config.iceConfig)
    this._readyCon = new window.RTCPeerConnection(config.iceConfig)

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
    const con = new window.RTCPeerConnection(config.iceConfig)
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
      console.log(jsonOffer)
      requestingChannel.send(jsonOffer)
      con.onicecandidate = (event) => {
        console.log('Got candidate event')
        if (event.candidate == null) {
          // TODO: send end of candidate event

          // const jsonOffer = JSON.stringify({
          //   walkerId,
          //   type: 'offer-for-walker',
          //   payload: con.localDescription,
          //   uuid: this._uuid
          // })
          // this._connectionsAwaitingAnswer[[walkerId]] = {
          //   connection: con,
          //   offer: jsonOffer,
          //   channel: dataChannelReady
          // }
          // console.log('Offer created, sending now')
          // requestingChannel.send(jsonOffer)
        } else {
          if (event.candidate) {
            const jsonOffer = JSON.stringify({
              walkerId,
              type: 'ice-candidate-for-walker',
              payload: event.candidate,
              uuid: this._uuid
            })
            requestingChannel.send(jsonOffer)
          }
        }
      }
    } catch (err) {
      console.log(err)
    }
  }

  addIceCandidate (candidate, walkerId) {
    this._connectionsAwaitingAnswer[[walkerId]].connection.addIceCandidate(candidate)
  }

  connectWalker (answer, walkerId) {
    console.log('answer', answer)
    this._connectionsAwaitingAnswer[[walkerId]].connection.setRemoteDescription(answer)
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
      this._initializedCon.onicecandidate = (event) => {
        if (event.candidate == null) {
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
        // console.log('Its an offer')
        const offer = new window.RTCSessionDescription(sdp)
        // console.log('Setting remote description')
        await this._recievedCon.setRemoteDescription(offer)
        // console.log('Done setting remote description')
        const answer = await this._recievedCon.createAnswer()
        // console.log('Answer created: ' + JSON.stringify(answer))
        this._recievedCon.setLocalDescription(answer)
        this._recievedCon.onicecandidate = (event) => {
          // console.log('On ice candidate: ' + JSON.stringify(event))
          if (event.candidate == null) {
            // console.log('Candidate is null')
            var answer = JSON.stringify({
              type: 'answer',
              payload: this._recievedCon.localDescription,
              uuid: inputUuid
            })
            // console.log(answer)
            this._socket.send(answer)
          }
        }
      } else if (type === 'answer') {
        const answer = new window.RTCSessionDescription(sdp)
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
      case 'answer-from-walker-relay':
        this._initializedChannel.send(JSON.stringify({
          type: 'answer-from-walker-destination',
          data: message.payload,
          walkerId: message.walkerId
        }))
        break
      case 'answer-from-walker-destination':
        console.log('Recived answer from walker')
        var answer = new window.RTCSessionDescription(message.data)
        this.connectWalker(answer, message.walkerId)
        break
      case 'get-offer-from-next-peer':
        this._initializedChannel.send(JSON.stringify({
          type: 'request-offer-for-walker',
          walkerId: message.walkerId
        }))
        break
      case 'request-offer-for-walker':
        this.createNewWalkerConnection(message.walkerId, channel)
        break
      case 'offer-for-walker':
        this._walkerConnections[[message.walkerId]].channel.send(JSON.stringify(message.payload))
        break
      case 'ice-candidate-for-walker':
        this._walkerConnections[[message.walkerId]].channel.send(JSON.stringify(message.payload))
        break
      default: console.log(`No case for type: ${message.type}`)
    }
  }
}

const newPeer = new Peer()
console.log('My ID is: ' + newPeer._uuid)
