// WebSocket Client
// ----------------
// Receives Pen events
// Automatically retries the connection when it is closed
// Exposes an Observable stream of events

const Rx = require('rxjs/Rx');
const wsSubject = new Rx.Subject();
const wsObservable = Rx.Observable.from(wsSubject);

const wsURI = 'ws://localhost:8080';
const reconnectInterval = 3000;

let ws; // websocket object
let reconnectAttempt = 0;


function connect() {
  ws = new WebSocket(wsURI);
  ws.onopen = onOpen;
  ws.onclose = onClose;
  ws.onmessage = onMessage;
  ws.onerror = onError;
}

function reconnect() {
  setTimeout(function() {
    reconnectAttempt++;
    connect();
  }, reconnectInterval);
}

function onOpen(evt) {
  reconnectAttempt = 0;
  console.log('ws open', evt);
}

function onClose(evt) {
  console.log('ws close', evt);
  reconnect();
}

function onMessage(evt) {
  console.log('ws message');
  let data = JSON.parse(evt.data);
  // TODO: handle parse errors
  wsSubject.next(data);
}

function onError(evt) {
  console.log('ws error', evt);
}

connect();

module.exports = wsObservable;
