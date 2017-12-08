// Process and Transform raw pen events
// ------------------------------------
// Provides stream of complete strokes
// Provides stream of page change events
// Provides battery/status events

const debug = require('debug')('data');
const Rx = require('rxjs/Rx');
const rawEvent$ = require('./ws');
const db = require('./database');

// ------ WARNING ------
const CLEAR_ALL_DATA = false;
// ------ WARNING ------



const clearAllData = () => {
  return db.clear().then(() => {
    debug('CLEARED DATA');
    return true;
  });
};
if (CLEAR_ALL_DATA) clearAllData();



// dump event data (for debugging)
db.events.allDocs({include_docs: true}).then(data => {
  debug("dump events", data);
});

db.strokes.allDocs({include_docs: true}).then(data => {
  debug("dump strokes", data);
});



// Directly store all raw pen events
// adds timestamp field to every event
// uses sequential counter as pouch id
const event$ = rawEvent$.map(event => {
  event.timestamp = Date.now();
  return event;
});

db.events.info().then(info => {
  // first get total event count
  let eventCount = info.doc_count;
  debug("total event count:", eventCount);
  
  event$.subscribe(event => {
    event._id = "" + eventCount++;
    db.events.put(event).then((res) => {
      // debug('stored event:', event);
    });
  });
});



// Transform live event data into stroke stream
// Stroke: { downTime, upTime, duration, timeDiff, noteId:NoteId, nodes:[Node] }
// NoteId: { pageNum, ownerId, sectionId, noteId }
// Node:   { x, y, timeDiff, pressure, time }
const stroke$ = new Rx.Subject();
let currentStroke, lastStroke;
let currentTime = 0;
let currentNoteId;

event$.subscribe(event => {
  
  if (event.type == 'stroke') { // add stroke data
    // TODO: what happens if we don't have a new stroke at that point?
    currentTime += event.node.timeDiff;
    event.node.time = currentTime;
    currentStroke.nodes.push( event.node );
  } else if (event.type == 'updown') { // begin or end a stroke
    if (event.status == 'down') { // begin stroke
      currentStroke = { downTime:0, upTime:0, duration:0, timeDiff:0, noteId:undefined, nodes:[] };
      currentStroke.downTime = event.time;
      currentTime = event.time;
      if (lastStroke != undefined) {
        currentStroke.timeDiff = event.time - lastStroke.upTime;
      }
    } else if (event.status == 'up') { // end stroke
      currentStroke.upTime = event.time;
      currentStroke.duration = currentStroke.upTime - currentStroke.downTime;
      currentStroke.noteId = currentNoteId;
      stroke$.next( currentStroke );
      lastStroke = currentStroke;
    }
  } else if (event.type == 'activeNoteId') {
      currentNoteId = event;
      // debug("note_id", event);
  }
  
});


// Store stroke events
db.strokes.info().then(info => {
  // get total stroke count
  let count = info.doc_count;
  debug("stroke count:", count);
  
  stroke$.subscribe(stroke => {
    // debug("stroke", stroke);
    stroke._id = "" + count++;
    db.strokes.put(stroke).then((res) => {
      debug('stored stroke:', stroke);
    });
  });
});


module.exports = {
  event$: event$,
  stroke$: Rx.Observable.from(stroke$)
}
