// Process and Transform raw pen events
// ------------------------------------
// Provides stream of complete strokes
// Provides stream of page change events
// Provides battery/status events

const debug = require('debug')('data');
const Rx = require('rxjs/Rx');
const rawEvent$ = require('./ws');
const db = require('./database');


const DUMP_ALL_DATA = 0;

// ------ WARNING ------
const CLEAR_ALL_DATA = 0;
// ------ WARNING ------



const clearAllData = () => {
  return db.clear().then(() => {
    debug('CLEARED DATA');
  });
};
if (CLEAR_ALL_DATA) clearAllData();


const dumpAllData = () => {
  return db.dumpToJSON().then(() => {
    debug("dumped to JSON");
  });
};
if (DUMP_ALL_DATA) dumpAllData();


// log event data (for debugging)
db.events.allDocs({include_docs: true}).then(data => {
  debug("events data", data);
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
    stroke._id = generateStrokeId(stroke.noteId, count++)
    db.strokes.put(stroke).then((res) => {
      debug('stored stroke:', stroke);
    });
  });
});


// Equals function for NoteId object
// NoteId: { pageNum, ownerId, sectionId, noteId }
const noteIdEquals = (a, b) => {
  return a.pageNum === b.pageNum
      && a.noteId === b.noteId
      && a.sectionId === b.sectionId
      && a.ownerId === b.ownerId;
};


function zeroFill( number, width ) {
  width -= number.toString().length;
  if ( width > 0 ) {
    return new Array( width + (/\./.test( number ) ? 2 : 1) ).join( '0' ) + number;
  }
  return number + ""; // always return a string
}

// Generate an indexable/sortable stroke id
// will look like: 00-00-00-0000-0000000000000000
// ownerId-sectionId-noteId-pageNum-strokeIdx
const generateStrokeId = (noteId, strokeIdx) => {
  let ni = {
    ownerId: 0,
    sectionId: 0,
    noteId: 0,
    pageNum: 0
  };
  if (noteId) {
    if (noteId.ownerId) ni.ownerId = noteId.ownerId;
    if (noteId.sectionId) ni.sectionId = noteId.sectionId;
    if (noteId.noteId) ni.noteId = noteId.noteId;
    if (noteId.pageNum) ni.pageNum = noteId.pageNum;
  }
  if (!strokeIdx) strokeIdx = 0;
  
  return zeroFill(ni.ownerId, 2) 
  + "-" + zeroFill(ni.sectionId, 2) 
  + "-" + zeroFill(ni.noteId, 2)
  + "-" + zeroFill(ni.pageNum, 4)
  + "-" + zeroFill(strokeIdx, 16)
};

module.exports = {
  event$: event$,
  stroke$: Rx.Observable.from(stroke$)
}
