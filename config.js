module.exports = {
  W: 1280,
  H: 720,
  RENDER_SCALE: 1,
  
  LAUNCH_FULLSCREEN: 0,
  
  WS_URI: 'ws://localhost:8080',
  WS_RECONNECT_INTERVAL: 10000,
  
  DB_FOLDER: 'db_data',
  DUMP_FOLDER: 'db_dump_json',
  
  MAX_POINTS: 8000,
  ANIM_SPEED: 400,
  ANIM_SPEED_LIVE: 200,
  IDLE_BEFORE_SLIDESHOW: 120000,
  SLIDE_TIME: 45000,
  START_PAGE: 501,
  
  /* Mapping of NeoSmartpen NoteIds <--> Printed book pages */
  PAGE_NUM_MAPPING: [
    { sectionId:3, ownerId:28, noteId:24, pageNum:1, pages:500, bookPage:1 },
    { sectionId:3, ownerId:28, noteId:25, pageNum:1, pages:500, bookPage:501 },
  ],
  
  PAGE_OFFSET: [1, 1],
  PAGE_DIMENSIONS: [125, 90],
  
  DUMP_ALL_DATA: 0,
  CLEAR_ALL_DATA: 0 // !!! WARNING !!!
};
