// WebSocket Client
// ----------------
// Receives Pen events
// Automatically retries the connection when it is closed
// Exposes an Observable stream of events
const debug = require('debug')('ws');
const Rx = require('rxjs/Rx');
const wsSubject = new Rx.Subject();
const wsObservable = Rx.Observable.from(wsSubject);
const config = require('../config');


let ws; // websocket object
let reconnectAttempt = 0;


function connect() {
  ws = new WebSocket(config.WS_URI);
  ws.onopen = onOpen;
  ws.onclose = onClose;
  ws.onmessage = onMessage;
  ws.onerror = onError;
}

function reconnect() {
  setTimeout(function() {
    reconnectAttempt++;
    debug('reconnect attempt ' + reconnectAttempt);
    connect();
  }, config.WS_RECONNECT_INTERVAL);
}

function onOpen(evt) {
  reconnectAttempt = 0;
  debug('connection successful', evt);
}

function onClose(evt) {
  debug('connection closed', evt);
  reconnect();
}

function onMessage(evt) {
  // debug('msg');
  let data = JSON.parse(evt.data);
  // TODO: handle parse errors
  wsSubject.next(data);
}

function onError(evt) {
  debug('error', evt);
}

connect();

module.exports = wsObservable;
