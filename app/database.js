// Handle persistence using PouchDB
// --------------------------------

const debug = require('debug')('db');
const PouchDB = require('pouchdb');

const folder = './db/';

PouchDB.adapter('worker', require('worker-pouch'));

let databases = {
  events: new PouchDB(folder + 'events'), // raw pen event stream
  strokes: new PouchDB(folder + 'strokes'), // collated strokes
  pages: new PouchDB(folder + 'pages') // contains refs to strokes
};

module.exports = databases;
