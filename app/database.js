// Handle persistence using PouchDB
// --------------------------------

const debug = require('debug')('db');
const path = require('path');
const fs = require('fs');
const PouchDB = require('pouchdb');

const DB_FOLDER = 'db_data';
const DUMP_FOLDER = 'db_dump_json';



PouchDB.adapter('worker', require('worker-pouch'));
PouchDB.debug.disable(); // disable debug output

const db_folder = path.join(process.cwd(), DB_FOLDER) + "/";
const dump_folder = path.join(process.cwd(), DUMP_FOLDER) + "/";

const createOrOpenDB = (name) => {
  return new PouchDB(db_folder + name);
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


function ensureDirectoryExistence(dirname) {
  if (fs.existsSync(dirname)) {
    return true;
  }
  return fs.mkdirSync(dirname);
}


databases.dumpToJSON = () => {
  const timestamp = new Date().toISOString();
  ensureDirectoryExistence(dump_folder);
  
  return Promise.all([
    databases.events.allDocs({include_docs: true}).then(data => {
      fs.writeFile(dump_folder + timestamp + '_events.json', JSON.stringify(data), 'utf8', () => true);
    }),
    databases.strokes.allDocs({include_docs: true}).then(data => {
      fs.writeFile(dump_folder + timestamp + '_strokes.json', JSON.stringify(data), 'utf8', () => true);
    }),
    databases.pages.allDocs({include_docs: true}).then(data => {
      fs.writeFile(dump_folder + timestamp + '_pages.json', JSON.stringify(data), 'utf8', () => true);
    })
  ]);
};

module.exports = databases;

// API:
// { events, strokes, pages, clear }
