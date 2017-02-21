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
    this.myIds = []
    this._requestTimeSend = Date.now()
    this.connectToServer()
  }

  connectToServer () {
    this._signalingChannel = new window.WebSocket(config.webSocketUrl)
    this._signalingChannel.onopen = this.onSocketOpen.bind(this)
    this._signalingChannel.onmessage = this.onSocketMessage.bind(this)
  }

  onSocketOpen () {
    this.init()
  }

  onSocketMessage (rawMessage) {
    const message = JSON.parse(rawMessage.data)
    this.handleMessage(message, this._currentCon, this._signalingChannel)
  }

  init () {
    this._firstPeerCon = new window.RTCPeerConnection(config.iceConfig)
    this._firstPeerCannel
    this._lastPeerCon = new window.RTCPeerConnection(config.iceConfig)
    this._lastPeerChannel
    this._nodeCount = 0
    this._requestTimeSend = Date.now()
    this.joinNetwork()
  }

  // Connect to to the first peer through the signaling server
  async joinNetwork () {
    try {
      // Create data channel
      const dataChannel = this._firstPeerCon.createDataChannel()
      dataChannel.onmessage = (message) => {
        this.handleMessage(message.data, dataChannel)
      }
      dataChannel.onopen = () => {
        console.log('Joined network!')
        this.connectToLastPeer()
        // TODO: Initiate request
      }
      this._lastPeerChannel = dataChannel

      const offer = await this._firstPeerCon.createOffer()
      await this._firstPeerCon.setLocalDescription(offer)
      this._firstPeerCon.onicecandidate = (event) => {
        if (event.candidate !== null) {
          const msg = JSON.stringify({
            type: 'ice-candidate-for-peer',
            payload: event.candidate,
            walkerId: this._uuid
          })
          this.signalingChannel.send(msg)
        }
      }
      const msg = JSON.stringify({
        type: 'walker-joining-offer',
        payload: this._firstPeerCon.localDescription,
        walkerId: this._uuid
      })
      this.signalingChannel.send(msg)

    } catch (err) {
      console.log(err)
    }
  }

  handleMessage (message) {
    switch (message.type) {
      case 'answer-for-walker':
        var answer = new window.RTCSessionDescription(message.payload)
        this._lastPeerCon.setRemoteDescription(answer)
        break
      case 'ice-candidate-for-walker':
        this._lastPeerCon.addIceCandidate(new window.RTCIceCandidate(message.payload))
        break
      case 'walker-joining-ice-candidate':
        this._firstPeerCon.addIceCandidate(new window.RTCIceCandidate(message.payload))
        break
      case 'walker-joining-answer':
        var answer = new window.RTCSessionDescription(message.payload)
        this._firstPeerCon.setRemoteDescription(answer)
        break
      default: console.log('Message type unknown')
    }
  }

  // handleMessage (message, peerConnection, channel) {
  //   // console.log('message: ' + JSON.stringify(message))
  //   if (message.iceIds) {
  //     // console.log('Got offer')
  //     // console.log('Got ids too: ' + JSON.stringify(message.iceIds[1]))
  //     this.iceIds = message.iceIds
  //     const offer = new window.RTCSessionDescription(message.payload)
  //     this.handleDataChannels(peerConnection)
  //     peerConnection.setRemoteDescription(offer, () => {
  //       peerConnection.onicecandidate = (event) => {
  //         if (event.candidate == null) {
  //           // TODO: Send end of candidates event
  //         } else {
  //           if (event.candidate) {
  //             if (this.isHostIceCandidate(event.candidate.candidate)) {
  //               // console.log('Host candidate, sending')
  //               const jsonOffer = JSON.stringify({
  //                 type: 'ice-candidate-for-peer-relay',
  //                 payload: event.candidate,
  //                 uuid: this._uuid
  //               })
  //               channel.send(jsonOffer)
  //               if (this.myIds.length > 0) {
  //                 // Create artificial ICE
  //                 var candidate = this.constructIceStringsFromLocalHostCandidate(event.candidate.candidate, this.myIds)
  //                 // console.log('Sending artificial ICE')
  //                 const articificalIce = JSON.stringify({
  //                   type: 'ice-candidate-for-peer-relay',
  //                   payload: candidate,
  //                   uuid: this._uuid
  //                 })
  //                 channel.send(articificalIce)
  //               } else {
  //                 // console.log('Cant send AICE yet')
  //               }
                
  //             } else {
  //               if (this.myIds.length === 0) {
  //                 // console.log('Not host candidate, sending anyway')
  //                 const jsonOffer = JSON.stringify({
  //                   type: 'ice-candidate-for-peer-relay',
  //                   payload: event.candidate,
  //                   uuid: this._uuid
  //                 })
  //                 channel.send(jsonOffer)
  //                 this.myIds.push(this.getIdStringsFromCandidate(event.candidate.candidate))
  //               } else {
  //                 // console.log('Not host candidate, not sending')
  //               }
  //             }
  //           }
  //         }
  //       } 
  //       peerConnection.createAnswer((answer) => {
  //         peerConnection.setLocalDescription(answer)
  //         channel.send(JSON.stringify({
  //           type: 'answer-from-walker-relay',
  //           payload: peerConnection.localDescription,
  //           walkerId: this._uuid
  //         }))
  //       }, errorHandler)
  //     }, errorHandler)
  //   } else {
  //     // console.log(JSON.stringify(message))
  //     if (this.isHostIceCandidate(message.candidate)) {
  //       var candidate = this.constructIceStringsFromLocalHostCandidate(message.candidate, this.iceIds[1])
  //       // peerConnection.addIceCandidate(new window.RTCIceCandidate(message))
  //       // console.log('Adding artificial ICE now')
  //       peerConnection.addIceCandidate(new window.RTCIceCandidate(candidate))
  //     }
  //     // peerConnection.addIceCandidate(new window.RTCIceCandidate(message))
  //   }
  // }

  // Creates a new PeerConnection on the _nextCon and sends an offer to _currentCon
  async connectToLastPeer () {
    const con = new window.RTCPeerConnection(config.iceConfig)
    try {
      const dataChannel = con.createDataChannel('data-channel')
      // Setup handlers for the locally created channel
      dataChannel.onmessage = (message) => {
        this.handleMessage(message.data, con, dataChannel)
      }

      dataChannel.onopen = (event) => {
        console.log('Connected to last peer')
      }

      // Create the offer for a p2p connection
      const offer = await con.createOffer()
      await con.setLocalDescription(offer)
      const jsonOffer = JSON.stringify({
        walkerId,
        type: 'offer-for-last-peer',
        payload: con.localDescription,
        uuid: this._uuid,
        walkerId
      })
      this._connectionsAwaitingAnswer[[walkerId]] = {
        connection: con,
        offer: jsonOffer,
        channel: dataChannel
      }
      console.log('Initiating request to connect with last peer')
      this._lastPeerChannel.send(jsonOffer)
      con.onicecandidate = (event) => {
        if (event.candidate == null) {
          // TODO: send end of candidate event
        } else {
          if (event.candidate) {
            const jsonOffer = JSON.stringify({
              walkerId,
              type: 'ice-candidate-for-last-peer',
              payload: event.candidate,
              uuid: this._uuid
            })
            this._lastPeerChannel.send(jsonOffer)
          }
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
        const message = JSON.parse(msg.data)
        this.handleMessage(message, this._nextCon, channel)
      }

      channel.onopen = (evt) => {
        this._currentCon = this._nextCon
        this._nextCon = new window.RTCPeerConnection(config.iceConfig)
        this._nodeCount++
        // console.log(this._requestTimeSend)
        console.log(`Connection established to node ${this._nodeCount}, took: ${JSON.stringify(Date.now() - this._requestTimeSend)} ms`)
        // console.log('Sending next request.')
        this._requestTimeSend = Date.now()
        channel.send(JSON.stringify({
          type: 'get-offer-from-next-peer',
          walkerId: this._uuid
        }))
      }
    }
  }

  /*
  -----------------------------------------------------------------------------------
  |
  | DICE Candidate Creation Functions
  |
  -----------------------------------------------------------------------------------
  */

  isHostIceCandidate (candidate) {
    return candidate.indexOf('host') > -1
  }

  constructIceStringsFromLocalHostCandidate (candidate, ids) {
    // Get port number
    var port = this.findPortInCandidate(candidate)
    // console.log('Port is: ' + port)
    var ufrag = this.findUfragInCandidate(candidate)
    // console.log('Ufrag is: ' + ufrag)
    var ip = this.findLocalIpFromCandidate(candidate)
    // console.log('IP is: ' + ip)
    var candidateString = `${ids} ${port} typ srflx raddr ${ip} rport ${port} generation 0 ufrag ${ufrag} network-cost 50`
    var candidate = {
      candidate: candidateString,
      sdpMid: 'data',
      sdpMLineIndex: 0
    }
    // console.log(JSON.stringify(candidate))
    return candidate
  }

  findPortInCandidate (candidate) {
    var startIndex = 0
    var endIndex = 0
    for (var i = 0; i < 5; i++) {
      startIndex = candidate.indexOf(' ', startIndex+1)
    }
    endIndex = candidate.indexOf(' ', startIndex+1)
    return candidate.substring(startIndex+1, endIndex)
  }

  findUfragInCandidate (candidate) {
    var startIndex = 0
    var endIndex = 0
    var ufragIndex = candidate.indexOf('ufrag', startIndex)
    startIndex = ufragIndex + 6
    endIndex = startIndex + 4
    return candidate.substring(startIndex, endIndex)
  }

  findLocalIpFromCandidate (candidate) {
    var startIndex = 0
    var endIndex = 0
    for (var i = 0; i < 4; i++) {
      startIndex = candidate.indexOf(' ', startIndex+1)
    }
    endIndex = candidate.indexOf(' ', startIndex+1)
    return candidate.substring(startIndex+1, endIndex)
  }

  getIdStringsFromCandidate (candidate) {
    var startIndex = 0, index;
    var localIndex = index
    for (var i = 0; i < 5; i++) {
      localIndex = candidate.indexOf(' ', localIndex+1)
    }
    var substring = candidate.substring(index, localIndex)
    // console.log('Found string: ' + substring)
    return substring
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
