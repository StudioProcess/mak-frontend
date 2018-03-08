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
