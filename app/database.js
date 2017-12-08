// Handle persistence using PouchDB
// --------------------------------

const debug = require('debug')('db');
const path = require('path');
const PouchDB = require('pouchdb');

const DB_FOLDER = 'db_data';

PouchDB.adapter('worker', require('worker-pouch'));
PouchDB.debug.disable(); // disable debug output

const folder = path.join(process.cwd(), DB_FOLDER) + "/";

const createOrOpenDB = (name) => {
  return new PouchDB(folder + name);
};

const databases = {};

const createOrOpenAll = () => {
  databases.events = createOrOpenDB('events'); // raw pen event stream
  databases.strokes = createOrOpenDB('strokes'); // collated strokes
  databases.pages = createOrOpenDB('pages'); // contains refs to strokes
};

createOrOpenAll();

databases.clear = () => {
  return Promise.all([
    databases.events.destroy(),
    databases.strokes.destroy(),
    databases.pages.destroy()
  ]).then(() => {
    return createOrOpenAll();
  });
};

module.exports = databases;

// API:
// { events, strokes, pages, clear }
