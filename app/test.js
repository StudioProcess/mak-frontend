let data = require('./data.js');

console.log("RUNNING TESTS (Watch out for 'Assertion failed' messages below)");


/* Testing noteId equality */
let n1 = {
  sectionId: 1,
  ownerId: 2,
  noteId: 3,
  pageNum: 0
};

let n2 = {
  sectionId: 1,
  ownerId: 2,
  noteId: 3,
  pageNum: 1
};

console.assert( data.noteIdEquals(n1, n1), 'matching noteIds' );
console.assert( !data.noteIdEquals(n1, n2), 'differnet noteIds' );
console.assert( data.noteIdEquals(n1, n2, {ignorePage:true}), 'noteIds w/ignore page' );


/* Testing book page number --> note id mapping function */
for (let p=1; p<500; p++) {
  let n = {
    sectionId: 3,
    ownerId: 28,
    noteId: 24,
    pageNum: p
  };
  console.assert( data.noteIdEquals( data.bookPageNumToNoteId(p), n ), 'pages 1-500: p.' + p );
}
for (let p=501; p<1000; p++) {
  let n = {
    sectionId: 3,
    ownerId: 28,
    noteId: 25,
    pageNum: p-500
  };
  console.assert( data.noteIdEquals( data.bookPageNumToNoteId(p), n ), 'pages 501-1000: p.' + p );
}
for (let p=-999; p<=0; p++) {
  console.assert( data.bookPageNumToNoteId(p) === undefined, 'out of bounds pageNum (low): p.' + p )
}
for (let p=1001; p<=2000; p++) {
  console.assert( data.bookPageNumToNoteId(p) === undefined, 'out of bounds pageNum (high): p.' + p )
}


/* Testing note id --> book page number mapping function */
for (let p=1; p<=500; p++) {
  let n1 = {
    sectionId: 3,
    ownerId: 28,
    noteId: 24,
    pageNum: p
  };
  console.assert( data.noteIdToBookPageNum(n1) == p, 'book 24, pageNum ' + p );
  
  let n2 = {
    sectionId: 3,
    ownerId: 28,
    noteId: 25,
    pageNum: p
  };
  console.assert( data.noteIdToBookPageNum(n2) == p+500, 'book 25, pageNum ' + p );
}

for (let p=-999; p<=0; p++) {
  let n1 = { sectionId:3, ownerId:28, noteId:24, pageNum:p };
  console.assert( data.noteIdToBookPageNum(n1) === undefined, 'wrong page (low), book 24, page ' + p );
  
  let n2 = { sectionId:3, ownerId:28, noteId:25, pageNum:p };
  console.assert( data.noteIdToBookPageNum(n2) === undefined, 'wrong page (low), book 25, page ' + p );
}

for (let p=501; p<=1000; p++) {
  let n1 = { sectionId:3, ownerId:28, noteId:24, pageNum:p };
  console.assert( data.noteIdToBookPageNum(n1) === undefined, 'wrong page (high), book 24, page ' + p );
  
  let n2 = { sectionId:3, ownerId:28, noteId:25, pageNum:p };
  console.assert( data.noteIdToBookPageNum(n2) === undefined, 'wrong page (high), book 25, page ' + p );
}



function seq(from, to) {
  let seq = [];
  for (let i=from; i<=to; i++) {
    seq.push(i);
  }
  return seq;
}

function notin(list) {
  return (val) => !list.includes(val);
}

let sections = seq(-999, 999).filter( notin([3]) );
for (let s of sections) {
  let n = {
    sectionId: s,
    ownerId: 28,
    noteId: 24,
    pageNum: 1
  };
  console.assert( data.noteIdToBookPageNum(n) === undefined, 'wrong sectionId: ' + s );
}

let owners = seq(-999, 999).filter( notin([28]) );
for (let o of owners) {
  let n = {
    sectionId: 3,
    ownerId: o,
    noteId: 24,
    pageNum: 1
  };
  console.assert( data.noteIdToBookPageNum(n) === undefined, 'wrong ownerId: ' + o );
}

let books = seq(-999, 999).filter( notin([24,25]) );
for (let b of books) {
  let n = {
    sectionId: 3,
    ownerId: 28,
    noteId: b,
    pageNum: 1
  };
  console.assert( data.noteIdToBookPageNum(n) === undefined, 'wrong noteId: ' + b );
}



/* StrokeId <--> NoteId */
for (let i=0; i<90; i++) {
  let n = {
    sectionId: 0 + i,
    ownerId: 1 + i,
    noteId: 2 + i,
    pageNum: 3 + i,
  };
  let expected = (''+n.ownerId).padStart(2, '0') 
    + '-' + (''+n.sectionId).padStart(2, '0') 
    + '-' + (''+n.noteId).padStart(2, '0') 
    + '-' + (''+n.pageNum).padStart(4, '0');
  let generated = data.generateStrokeId(n);
  console.assert( generated === expected, 'generate stroke id (without stroke idx)' );
  let parsed = data.parseNoteId(generated);
  console.assert( data.noteIdEquals(parsed, n), 'parse note id (without stroke idx)' );
  
  let strokeIdx = 9999 + i;
  expected += '-' + (''+strokeIdx).padStart(16, '0');
  generated = data.generateStrokeId(n, strokeIdx);
  console.assert( generated === expected, 'generate stroke id (with stroke idx) ' + data.generateStrokeId(n) );
  parsed = data.parseNoteId(generated);
  console.assert( data.noteIdEquals(parsed, n), 'parse note id (with stroke idx)' );
  console.assert( parsed.strokeIdx === strokeIdx), 'parse note id: stroke idx)' ;

  strokeIdx = undefined;
  if (i % 5 == 0) n.sectionId = 'xx';
  else if (i % 5 == 1) n.ownerId = 'xx';
  else if (i % 5 == 2) n.noteId = 'xx';
  else if (i % 5 == 3) n.pageNum = 'xxxx';
  else if (i % 5 == 4) strokeIdx = 'xxxxxxxxxxxxxxxx';
  generated = data.generateStrokeId(n, strokeIdx);
  parsed = data.parseNoteId(generated);
  console.assert( parsed === undefined, 'parse note id: erroneous input ' + JSON.stringify(parsed) );
}
