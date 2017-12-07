// Process and Transform raw pen events
// ------------------------------------
// Provides stream of complete strokes
// Provides stream of page change events
// Provides battery/status events

const debug = require('debug')('data');
// const Rx = require('rxjs/Rx');
const penEvent$ = require('./ws');
const db = require('./database');


// dump event data (for debugging)
db.events.allDocs({include_docs: true}).then(data => {
  debug("dump", data);
});


// Directly store all raw pen events
// adds timestamp field to every event
// uses sequential counter as pouch id
let timestampedEvent$ = penEvent$.map(event => {
  event.timestamp = Date.now();
  return event;
});

db.events.info().then(info => {
  // first get total event count
  let eventCount = info.doc_count;
  debug("total event count:", eventCount);
  
  timestampedEvent$.subscribe(event => {
    event._id = "" + eventCount++;
    db.events.put(event).then((res) => {
      debug('stored event:', event);
    });
  });
});



// Create Stroke array from event data
// Stroke: { downTime, upTime, duration, timeDiff, nodes:[Node] }
// Node: { x, y, timeDiff, pressure }
function strokesFromEvents(eventData) {
  return eventData.reduce((acc, event) => {
    if (event.type == 'updown') {
      if (event.status == 'down') {
        let timeDiff = acc.length == 0 ? 0 : event.time - acc[acc.length-1].upTime;
        acc.push({ downTime: event.time, upTime: 0, duration: 0, timeDiff, nodes: [] });
      } else if (event.status == 'up') {
        let stroke = acc[acc.length-1];
        stroke.upTime = event.time;
        stroke.duration = stroke.upTime - stroke.downTime;
      }
    } else if (event.type == 'stroke') {
      acc[acc.length-1].nodes.push(event.node);
      // TODO: add absolute time
    }
    return acc;
  }, []);
}
