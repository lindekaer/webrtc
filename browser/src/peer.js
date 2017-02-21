/*
-----------------------------------------------------------------------------------
|
| Version notes
|
-----------------------------------------------------------------------------------
*/
/*

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
    this.iceIdsForNextPeer = []
    this.isLastPeer = true
    this.connectToServer()
  }

  connectToServer () {
    console.log(config.webSocketUrl)
    this.signalingChannel = new window.WebSocket(config.webSocketUrl)
    this.signalingChannel.onopen = this.onSocketOpen.bind(this)
    this.signalingChannel.onmessage = this.onSocketMessage.bind(this)
  }

  onSocketOpen () {
    this.initialize()
  }

  onSocketMessage (message) {
    this.handleMessage(message.data, this.signalingChannel)
  }

  initialize () {
    this._entryCon = new window.RTCPeerConnection(config.iceConfig)
    this._extensionCon = new window.RTCPeerConnection(config.iceConfig)

    this._entryChannel
    this._extensionChannel

    this.setupPeerConnection(this._entryCon)
    this.setupPeerConnection(this._extensionCon)
    console.log('ConnectionState: ' + this._extensionCon.connectionState)
    this.joinNetwork()
  }

  setupPeerConnection (peerConnection) {
    peerConnection.ondatachannel = (evt) => {
      var channel = evt.channel
      this._extensionChannel = channel
      channel.onmessage = (message) => {
        this.handleMessage(message.data, channel)
      }
    }
  }

  async joinNetwork () {
    try {
      // Create data channel
      const dataChannel = this._entryCon.createDataChannel('data-channel')
      dataChannel.onmessage = (message) => {
        this.handleMessage(message.data, dataChannel)
      }
      dataChannel.onopen = () => {
        console.log('Joined network!')
      }
      this._entryChannel = dataChannel

      // Create the offer for a P2P connection
      const offer = await this._entryCon.createOffer()
      await this._entryCon.setLocalDescription(offer)
      this._entryCon.onicecandidate = (event) => {
        if (event.candidate == null) {
          const msg = JSON.stringify({
            type: 'joining',
            payload: this._entryCon.localDescription,
            joinerId: this._uuid
          })
          this.signalingChannel.send(msg)
        }
      }
    } catch (err) {
      console.log(err)
    }
  }

  async createNewWalkerConnection (walkerId, requestingChannel, offer, isJoining) {
    console.log('Start creating new PeerConnection for walker')
    const con = new window.RTCPeerConnection(config.iceConfig)
    try {
      const dataChannel = con.createDataChannel('data-channel')
      // Setup handlers for the locally created channel
      dataChannel.onmessage = (message) => {
        this.handleMessage(message.data, dataChannel)
      }

      dataChannel.onopen = (event) => {
        console.log('Connection opened to walker with id ' + walkerId)
        this._walkerConnections[[walkerId]] = {
          connection: con,
          channel: dataChannel
        }
        delete this._connectionsAwaitingAnswer[[walkerId]]
      }

      await con.setRemoteDescription(offer)
      const answer = await con.createAnswer()
      const jsonOffer = JSON.stringify({
        walkerId,
        type: isJoining ? 'walker-joining-answer' : 'answer-for-walker',
        payload: con.localDescription,
        uuid: this._uuid,
        walkerId
      })
      this._connectionsAwaitingAnswer[[walkerId]] = {
        connection: con,
        offer: jsonOffer,
        channel: dataChannel
      }
      requestingChannel.send(jsonOffer)
      con.onicecandidate = (event) => {
        if (event.candidate == null) {
          // TODO: send end of candidate event
        } else {
          if (event.candidate) {
            const jsonOffer = JSON.stringify({
              walkerId,
              type: isJoining ? 'walker-joining-ice-candidate' : 'ice-candidate-for-walker',
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

  addIceCandidateForWalkerConnection (candidate, walkerId) {
    console.log('Candidate: ' + JSON.stringify(candidate))
    this._connectionsAwaitingAnswer[[walkerId]].connection.addIceCandidate(candidate)
  }

  connectToWalker (answer, walkerId) {
    console.log('Answer from walker: ' + JSON.stringify(answer))
    this._connectionsAwaitingAnswer[[walkerId]].connection.setRemoteDescription(answer)
  }

  async handleAnswerFromLastPeer(answer) {
    this._entryCon.setRemoteDescription(new window.RTCSessionDescription(answer))
  }

  async sendAnswerToJoiningPeer(message) {
    const offer = new window.RTCSessionDescription(message.payload)
    this.iceIdsForNextPeer = this.getIdStringsFromOffer(JSON.stringify(message.payload.sdp))
    await this._extensionCon.setRemoteDescription(offer)
    this._extensionCon.onicecandidate = (event) => {
      if (event.candidate == null) {
        var answer = JSON.stringify({
          type: 'answer-for-joining',
          payload: this._extensionCon.localDescription,
          joinerId: message.joinerId
        })
        this.signalingChannel.send(answer)
      }
    }
    this._extensionCon.ondatachannel = (evt) => {
      console.log('Connected to next peer')
      this.isLastPeer = false
      const channel = evt.channel
      this._extensionChannel = channel
      channel.onmessage = (message) => {
        this.handleMessage(message.data, channel)
      }
    }

    const answer = await this._extensionCon.createAnswer()
    this._extensionCon.setLocalDescription(answer)
  }

  handleMessage (channelMessage, channel) {
    var message = JSON.parse(channelMessage)
    switch (message.type) {
      case 'walker-joining-offer':
        this.createNewWalkerConnection(message.walkerId, channel, message.payload, true)
        break
      // case 'answer-from-walker-relay':
      //   this._extensionChannel.send(JSON.stringify({
      //     type: 'answer-from-walker-destination',
      //     data: message.payload,
      //     walkerId: message.walkerId
      //   }))
      //   break
      // case 'answer-from-walker-destination':
      //   var answer = new window.RTCSessionDescription(message.data)
      //   this.connectToWalker(answer, message.walkerId)
      //   break
      case 'offer-for-last-peer':
        if (this.isLastPeer) {
          this.createNewWalkerConnection(message.walkerId, channel, message.payload)
        } else {
          this._extensionChannel.send(JSON.stringify(message))
        }
        break
      // case 'request-offer-for-walker':
      //   this.createNewWalkerConnection(message.walkerId, channel)
      //   break
      case 'offer-from-walker':
        var walker = this._walkerConnections[[message.walkerId]]
        if (walker) {
          walker.channel.send(JSON.stringify(message))
        } else {
          this._entryChannel.send(JSON.stringify(message))
        }
        // this._walkerConnections[[message.walkerId]].channel.send(JSON.stringify({
        //   payload: message.payload,
        //   iceIds: this.iceIdsForNextPeer
        // }))
        break
      case 'ice-candidate-for-walker':
        var walker = this._walkerConnections[[message.walkerId]]
        if (walker) {
          walker.channel.send(JSON.stringify(message))
        } else {
          this._entryChannel.send(JSON.stringify(message))
        }
        // this._walkerConnections[[message.walkerId]].channel.send(JSON.stringify(message))
        break
      case 'ice-candidate-for-last-peer':
        if (this.isLastPeer) {
          this.addIceCandidateForWalkerConnection(candidate, message.walkerId)
        } else {
          this._extensionChannel.send(JSON.stringify(message))
        }
        break
      case 'ice-candidate-for-peer':
        var candidate = new window.RTCIceCandidate(message.payload)
        this.addIceCandidateForWalkerConnection(candidate, message.walkerId)
        break
      case 'joining':
        this.sendAnswerToJoiningPeer(message)
        break
      case 'answer-for-joining':
        this.handleAnswerFromLastPeer(message.payload)
        break
      default: console.log(`No case for type: ${message.type}`)
    }
  }

  getIdStringsFromOffer (offer) {
    var startIndex = 0
    var index
    var strings = []
    while ((index = offer.indexOf('candidate:', startIndex)) > -1) {
      var localIndex = index
      for (var i = 0; i < 5; i++) {
        localIndex = offer.indexOf(' ', localIndex + 1)
      }
      var substring = offer.substring(index, localIndex)
      strings.push(substring)
      startIndex = index + 'candidate:'.length
    }
    return strings
  }

}

const newPeer = new Peer()
console.log('My ID is: ' + newPeer._uuid)
