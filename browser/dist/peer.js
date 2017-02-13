'use strict';

var _uuid = require('uuid');

var _uuid2 = _interopRequireDefault(_uuid);

var _config = require('./config');

var _config2 = _interopRequireDefault(_config);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; } /*
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


const Log = console.log;
console.log = msg => {
  const data = Date.now() + ' - ' + msg;
  Log(data);
  document.querySelector('#info').textContent = document.querySelector('#info').textContent + '#!#' + data;
};

/*
-----------------------------------------------------------------------------------
|
| Peer class
|
-----------------------------------------------------------------------------------
*/

class Peer {
  constructor() {
    this._uuid = _uuid2.default.v1();
    this._connectionsAwaitingAnswer = {};
    this._walkerConnections = {};
    this.connectToServer();
  }

  connectToServer() {
    console.log(_config2.default.webSocketUrl);
    this._socket = new window.WebSocket(_config2.default.webSocketUrl);
    this._socket.onopen = this.onSocketOpen.bind(this);
    this._socket.onmessage = this.onSocketMessage.bind(this);
  }

  onSocketOpen() {
    this.init();
  }

  onSocketMessage(message) {
    const msg = JSON.parse(message.data);
    // console.log('Message from socket: ' + JSON.stringify(msg))
    switch (msg.type) {
      case 'offer':
        this.consume('offer', msg.payload, msg.uuid);
        break;
      case 'answer':
        this.consume('answer', msg.payload);
        break;
      case 'answer-from-walker':
        var answer = new window.RTCSessionDescription(msg.payload);
        this.connectWalker(answer, msg.walkerId);
        break;
      case 'request-offer-for-walker':
        this.createNewWalkerConnection(msg.walkerId, this._socket);
        break;
      default:
        console.log('Got message from socket with unknown type of: ' + msg.type);
    }
  }

  init() {
    this._initializedCon = new window.RTCPeerConnection(_config2.default.iceConfig);
    this._recievedCon = new window.RTCPeerConnection(_config2.default.iceConfig);
    this._readyCon = new window.RTCPeerConnection(_config2.default.iceConfig);

    this._initializedChannel;
    this._recievedChannel;
    this._readyChannel;

    this._readyOffer;

    this.setupPeerConnection(this._initializedCon);
    this.setupPeerConnection(this._recievedCon);
    this.setupPeerConnection(this._readyCon);
    // this.setupReadyCon()
    this.createOffer();
  }

  setupPeerConnection(peerConnection) {
    peerConnection.ondatachannel = evt => {
      var channel = evt.channel;
      this._recievedChannel = channel;
      channel.onopen = () => {
        // console.log('Opened connection to revievedPeer')
        // channel.send(this._readyOffer)
      };
      channel.onmessage = message => {
        this.handleChannelMessage(message, channel);
      };
    };
  }

  createNewWalkerConnection(walkerId, requestingChannel) {
    var _this = this;

    return _asyncToGenerator(function* () {
      console.log('Start creating new PeerConnection');
      const con = new window.RTCPeerConnection(_config2.default.iceConfig);
      try {
        const dataChannelReady = con.createDataChannel('ready-data-channel');
        // Setup handlers for the locally created channel
        dataChannelReady.onmessage = function (message) {
          // console.log('onMessage called')
          _this.handleChannelMessage(message, dataChannelReady);
        };

        dataChannelReady.onopen = function (event) {
          console.log('Connection opened to walker with id ' + walkerId);
          _this._walkerConnections[[walkerId]] = {
            connection: con,
            channel: dataChannelReady
          };
          delete _this._connectionsAwaitingAnswer[[walkerId]];
        };

        // Create the offer for a p2p connection
        const offer = yield con.createOffer();
        yield con.setLocalDescription(offer);
        const jsonOffer = JSON.stringify({
          walkerId: walkerId,
          type: 'offer-for-walker',
          payload: con.localDescription,
          uuid: _this._uuid
        });
        _this._connectionsAwaitingAnswer[[walkerId]] = {
          connection: con,
          offer: jsonOffer,
          channel: dataChannelReady
        };
        console.log(jsonOffer);
        requestingChannel.send(jsonOffer);
        con.onicecandidate = function (event) {
          console.log('Got candidate event');
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
                walkerId: walkerId,
                type: 'ice-candidate-for-walker',
                payload: event.candidate,
                uuid: _this._uuid
              });
              requestingChannel.send(jsonOffer);
            }
          }
        };
      } catch (err) {
        console.log(err);
      }
    })();
  }

  addIceCandidate(candidate, walkerId) {
    this._connectionsAwaitingAnswer[[walkerId]].connection.addIceCandidate(candidate);
  }

  connectWalker(answer, walkerId) {
    console.log('answer', answer);
    this._connectionsAwaitingAnswer[[walkerId]].connection.setRemoteDescription(answer);
  }

  createOffer() {
    var _this2 = this;

    return _asyncToGenerator(function* () {
      try {
        // Create data channel
        const dataChannel = _this2._initializedCon.createDataChannel('data-channel');
        dataChannel.onmessage = function (message) {
          _this2.handleChannelMessage(message, dataChannel);
        };
        dataChannel.onopen = function () {
          console.log('Ready for walker');
        };
        _this2._initializedChannel = dataChannel;

        // Create the offer for a P2P connection
        const offer = yield _this2._initializedCon.createOffer();
        yield _this2._initializedCon.setLocalDescription(offer);
        _this2._initializedCon.onicecandidate = function (event) {
          if (event.candidate == null) {
            const msg = JSON.stringify({
              type: 'joining',
              payload: _this2._initializedCon.localDescription,
              uuid: _this2._uuid
            });
            _this2._socket.send(msg);
          }
        };
      } catch (err) {
        console.log(err);
      }
    })();
  }

  consume(type, sdp, inputUuid) {
    var _this3 = this;

    return _asyncToGenerator(function* () {
      try {
        if (type === 'offer') {
          const offer = new window.RTCSessionDescription(sdp);
          yield _this3._recievedCon.setRemoteDescription(offer);
          const answer = yield _this3._recievedCon.createAnswer();
          _this3._recievedCon.setLocalDescription(answer);
          _this3._recievedCon.onicecandidate = function (event) {
            if (event.candidate == null) {
              _this3._socket.send(JSON.stringify({
                type: 'answer',
                payload: _this3._recievedCon.localDescription,
                uuid: inputUuid
              }));
            }
          };
        } else if (type === 'answer') {
          const answer = new window.RTCSessionDescription(sdp);
          _this3._initializedCon.setRemoteDescription(answer);
        }
      } catch (err) {
        console.log(err);
      }
    })();
  }

  handleChannelMessage(channelMessage, channel) {
    const channelMessageData = channelMessage.data;
    var message = JSON.parse(channelMessageData);
    switch (message.type) {
      case 'answer-from-walker-relay':
        this._initializedChannel.send(JSON.stringify({
          type: 'answer-from-walker-destination',
          data: message.payload,
          walkerId: message.walkerId
        }));
        break;
      case 'answer-from-walker-destination':
        console.log('Recived answer from walker');
        var answer = new window.RTCSessionDescription(message.data);
        this.connectWalker(answer, message.walkerId);
        break;
      case 'get-offer-from-next-peer':
        this._initializedChannel.send(JSON.stringify({
          type: 'request-offer-for-walker',
          walkerId: message.walkerId
        }));
        break;
      case 'request-offer-for-walker':
        this.createNewWalkerConnection(message.walkerId, channel);
        break;
      case 'offer-for-walker':
        this._walkerConnections[[message.walkerId]].channel.send(JSON.stringify(message.payload));
        break;
      case 'ice-candidate-for-walker':
        this._walkerConnections[[message.walkerId]].channel.send(JSON.stringify(message.payload));
        break;
      default:
        console.log(`No case for type: ${ message.type }`);
    }
  }
}

const newPeer = new Peer();
console.log('My ID is: ' + newPeer._uuid);