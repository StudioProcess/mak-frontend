// Process and Transform raw pen events
// ------------------------------------
// Provides stream of complete strokes
// Provides stream of page change events
// Provides battery/status events

const debug = require('debug')('data');
const Rx = require('rxjs/Rx');
const penEvents = require('./ws');



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
