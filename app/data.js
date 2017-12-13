// Process and Transform raw pen events
// ------------------------------------
// Provides stream of complete strokes
// Provides stream of page change events
// Provides battery/status events

const debug = require('debug')('data');
const Rx = require('rxjs/Rx');
const rawEvent$ = require('./ws');
const db = require('./database');
const config = require('../config');



const clearAllData = () => {
  return db.clear().then(() => {
    debug('CLEARED DATA');
  });
};
if (config.CLEAR_ALL_DATA) clearAllData();


const dumpAllData = () => {
  return db.dumpToJSON().then(() => {
    debug("dumped to JSON");
  });
};
if (config.DUMP_ALL_DATA) dumpAllData();


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


// Zero pad a number to a certain width
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
// omit strokeIdx to get: 00-00-00-0000
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
  let id = zeroFill(ni.ownerId, 2) 
    + "-" + zeroFill(ni.sectionId, 2) 
    + "-" + zeroFill(ni.noteId, 2)
    + "-" + zeroFill(ni.pageNum, 4)
  if (strokeIdx != undefined) id += "-" + zeroFill(strokeIdx, 16);
  return id;
};


// Create an NoteId Object for a certain page number using default values
const createNoteIdForPage = (pageNum) => {
  return {
    ownerId: config.DEFAULT_OWNER_ID,
    sectionId: config.DEFAULT_SECTION_ID,
    noteId: config.DEFAULT_NOTE_ID,
    pageNum
  };
};


// Get strokes for a certain page
// Returns: Promise<[Stroke]>
const getPage = (n) => {
  return db.strokes.allDocs({ 
    include_docs: true,
    startkey: generateStrokeId( createNoteIdForPage(n) ),
    endkey: generateStrokeId( createNoteIdForPage(n+1) ),
    inclusive_end: false
  }).then((result) => {
    return result.rows.map(row => row.doc);
  });
};


// Returns a Set() of available page numbers (i.e. pages with strokes)
const getPageNumbers = () => {
  return db.strokes.allDocs({
    include_docs: false
  }).then( result => {
    let pageSet = new Set();
    for (row of result.rows) {
      pageSet.add( parseInt(row.id.substring(9, 13)) ); // get page part from id
    }
    return pageSet;
  });
};

getPageNumbers().then(res => {
  debug(res);
});


// Find page bounds
// let xMin = Number.MAX_VALUE;
// let xMax = 0;
// let yMin = Number.MAX_VALUE;
// let yMax = 0;
// function printBounds() {
//   debug("x bounds", xMin, xMax, "y bounds", yMin, yMax);
// }
// 
// // find page bounds
// event$.subscribe(e => {
//   if (e.type == 'stroke') {
//     let node = e.node;
//     if (node.x < xMin) { xMin = node.x; printBounds(); }
//     else if (node.x > xMax) { xMax = node.x; printBounds(); }
//     if (node.y < yMin) { yMin = node.y; printBounds(); }
//     else if (node.y > yMax) { yMax = node.y; printBounds(); }
//   }
// });


module.exports = {
  event$,
  stroke$: Rx.Observable.from(stroke$),
  getPage,
  getPageNumbers
}
