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
    if (currentStroke == undefined) return;
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
      if (currentStroke == undefined) return;
      currentStroke.upTime = event.time;
      currentStroke.duration = currentStroke.upTime - currentStroke.downTime;
      currentStroke.noteId = currentNoteId;
      stroke$.next( currentStroke );
      lastStroke = currentStroke;
      currentStroke = undefined;
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

const parseNoteId = (strokeId) => {
  let strokePart = strokeId.substring(14)
  let n = {
    ownerId: parseInt( strokeId.substring(0, 2) ),
    sectionId: parseInt( strokeId.substring(3, 5) ),
    noteId: parseInt( strokeId.substring(6, 8) ),
    pageNum: parseInt( strokeId.substring(9, 13) ),
    strokeIdx: parseInt( strokePart ),
  };
  if (strokePart === '') { delete n.strokeIdx; }
  if ( strokePart && Number.isNaN(n.strokeIdx) ) { return undefined; }
  if ( Number.isNaN(n.ownerId) || Number.isNaN(n.sectionId) || Number.isNaN(n.noteId) || Number.isNaN(n.pageNum) ) return undefined;
  return n;
};


// Equals function for NoteId object
// NoteId: { pageNum, ownerId, sectionId, noteId }
const noteIdEquals = (a, b, options = {ignorePage: false}) => {
  if (!a || !b) return false;
  let equals = a.noteId === b.noteId
    && a.sectionId === b.sectionId
    && a.ownerId === b.ownerId;
  if (options && options.ignorePage) { return equals; }
  return equals && a.pageNum === b.pageNum;
};

// noteId --> printed book page (according to PAGE_NUM_MAPPING config)
const noteIdToBookPageNum = (noteId) => {
  let mappings = config.PAGE_NUM_MAPPING.filter( m => noteIdEquals(m, noteId, {ignorePage:true}) );
  for (let m of mappings) {
    if (noteId.pageNum >= m.pageNum && noteId.pageNum <= m.pageNum + m.pages - 1) {
      return noteId.pageNum - m.pageNum + m.bookPage;
    }
  }
  return undefined;
};

// Printed book page --> NoteId (according to PAGE_NUM_MAPPING config)
const bookPageNumToNoteId = (pageNum) => {
  for (let m of config.PAGE_NUM_MAPPING) {
    if (pageNum >= m.bookPage && pageNum <= m.bookPage + m.pages - 1) {
      return { 
        sectionId: m.sectionId, ownerId: m.ownerId, noteId: m.noteId,
        pageNum: pageNum - m.bookPage + m.pageNum
      };
    }
  }
  return undefined;
};


// Get strokes for a certain page
// Returns: Promise<[Stroke]>
const getPage = (n) => {
  let noteId = bookPageNumToNoteId( n ); // Get noteId according to mapping 
  let noteIdEnd = Object.assign( {}, noteId, {pageNum: noteId.pageNum+1} ); // simply increment pageNum
  // debug( generateStrokeId(noteId), generateStrokeId(noteIdEnd) );
  return db.strokes.allDocs({ 
    include_docs: true,
    startkey: generateStrokeId( noteId ),
    endkey: generateStrokeId( noteIdEnd ),
    inclusive_end: false
  }).then((result) => {
    return result.rows.map(row => row.doc);
  });
};


// Returns an array of available page numbers (i.e. pages with strokes)
const getPageNumbers = () => {
  return db.strokes.allDocs({
    include_docs: false
  }).then( result => {
    let pageSet = new Set();
    for (row of result.rows) {
      let noteId = parseNoteId(row.id); if (noteId === undefined) continue;
      // Only keep pageNums that have valid mappings as defined in config
      let pageNum = noteIdToBookPageNum(noteId); if (pageNum === undefined) continue;
      pageSet.add( pageNum );
    }
    return Array.from(pageSet);
  });
};

// getPageNumbers().then(res => {
//   debug(res);
// });


// Returns a random page number
const getRandomPageNumber = () => {
  return getPageNumbers().then(pageNums => {
    let idx = Math.floor( Math.random() * pageNums.length );
    return pageNums[idx];
  });
};

// Returns a random page from pages with data
const getRandomPage = () => {
  return getRandomPageNumber().then( pageNum => getPage(pageNum) );
};




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
  noteIdEquals,
  generateStrokeId,
  parseNoteId,
  getPage,
  getPageNumbers,
  getRandomPage,
  getRandomPageNumber,
  noteIdToBookPageNum,
  bookPageNumToNoteId
}
