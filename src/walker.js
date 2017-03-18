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
    this._requestTimeSend = Date.now()
    this._socket.send(msg)
  }

  handleMessage (message, peerConnection, channel) {
    // console.log('message: ' + JSON.stringify(message))
    if (message.iceIds) {
      // console.log('Got offer')
      // console.log(JSON.stringify(message))
      // console.log('Got ids too: ' + JSON.stringify(message.iceIds))
      this.iceIds = message.iceIds
      const offer = new window.RTCSessionDescription(message.payload)
      this.handleDataChannels(peerConnection)
      peerConnection.setRemoteDescription(offer, () => {
        peerConnection.onicecandidate = (event) => {
          if (event.candidate == null) {
            // TODO: Send end of candidates event
          } else {
            if (event.candidate) {
              if (this.isHostIceCandidate(event.candidate.candidate)) {
                // console.log('Host candidate, sending')
                const jsonIceCandidate = JSON.stringify({
                  type: 'ice-candidate-for-peer-relay',
                  payload: event.candidate,
                  uuid: this._uuid
                })
                channel.send(jsonIceCandidate)
                console.log('Sending 10 fake candidates')
                this.sendFakeCandidates(channel, this.findUfragInCandidate(event.candidate.candidate))
                if (this.myIds.length > 0) {
                  // // Create artificial ICE
                  // var candidate = this.constructIceStringsFromLocalHostCandidate(event.candidate.candidate, ['candidate:3870334310 1 udp 2113937151 193.168.1.133'])
                  // // console.log('Sending DICE: ' + JSON.stringify(candidate))
                  // const articificalIce = JSON.stringify({
                  //   type: 'ice-candidate-for-peer-relay',
                  //   payload: candidate,
                  //   uuid: this._uuid
                  // })
                  // channel.send(articificalIce)
                } else {
                  // console.log('Cant send DICE yet')
                }
              } else {
                // if (this.myIds.length === 0) {
                //   // console.log('Not host candidate, sending anyway')
                //   const jsonOffer = JSON.stringify({
                //     type: 'ice-candidate-for-peer-relay',
                //     payload: event.candidate,
                //     uuid: this._uuid
                //   })
                //   channel.send(jsonOffer)
                //   this.myIds.push(this.getIdStringsFromCandidate(event.candidate.candidate))
                // } else {
                  // console.log('Not host candidate, not sending')
                  // console.log('Not sending candidate: ' + JSON.stringify(event.candidate))
                  const jsonOffer = JSON.stringify({
                    type: 'ice-candidate-for-peer-relay',
                    payload: event.candidate,
                    uuid: this._uuid
                  })
                  channel.send(jsonOffer)
                // }
              }
            }
          }
        }
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
      if (this.isHostIceCandidate(message.candidate)) {
        this.sendFakeCandidates(channel, this.findUfragInCandidate(message.candidate.candidate))
        // for (var i = 1; i < this.iceIds.length; i++) {
        // var candidate = this.constructIceStringsFromLocalHostCandidate(message.candidate, this.iceIds[0])
          // peerConnection.addIceCandidate(new window.RTCIceCandidate(message))
          // console.log('Candidate: ' + JSON.stringify(candidate))
          // console.log('Adding DICE now')
        // peerConnection.addIceCandidate(new window.RTCIceCandidate(candidate))
        // }
      }
      peerConnection.addIceCandidate(new window.RTCIceCandidate(message))
    }
  }

  isHostIceCandidate (candidate) {
    return candidate.indexOf('host') > -1
  }

  sendFakeCandidates (channel, ufrag) {
    // console.log('Sending DICE: ' + JSON.stringify(candidate))
    var foundation = 3870334310
    var priority = 2113937151
    var port = 678678
    for (var i = 0; i < 10; i++) {
      var ids = `candidate:${foundation} 1 udp ${priority} 193.168.1.133`
      var candidateString = `${ids} ${port} typ srflx raddr 78.134.34.55 rport ${port} generation 0 ufrag ${ufrag} network-cost 50`
      var candidate = {
        candidate: candidateString,
        sdpMid: 'data',
        sdpMLineIndex: 0
      }

      const articificalIce = JSON.stringify({
        type: 'ice-candidate-for-peer-relay',
        payload: candidate,
        uuid: this._uuid
      })
      channel.send(articificalIce)
      foundation++
      priority++
      port++
    }
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
    var newCandidate = {
      candidate: candidateString,
      sdpMid: 'data',
      sdpMLineIndex: 0
    }
    // console.log(JSON.stringify(candidate))
    return newCandidate
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

// 'walker-request-answer'
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
