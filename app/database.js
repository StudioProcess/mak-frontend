// Handle persistence using PouchDB
// --------------------------------

const debug = require('debug')('db');
const path = require('path');
const PouchDB = require('pouchdb');

const DB_FOLDER = 'db_data/';

PouchDB.adapter('worker', require('worker-pouch'));
PouchDB.debug.disable(); // disable debug output

const folder = path.join(process.cwd(), DB_FOLDER) + "/";

let databases = {
  events: new PouchDB(folder + 'events'), // raw pen event stream
  strokes: new PouchDB(folder + 'strokes'), // collated strokes
  pages: new PouchDB(folder + 'pages') // contains refs to strokes
};

module.exports = databases;
