const fs = require('fs');
const path = require('path');

const DIR = 'C:\\Users\\Diego G. Damacena\\Downloads\\Claudia Rangel Podologa';

const files = fs.readdirSync(DIR);

// Files already published or already scheduled:
const ALREADY_HANDLED = [
  'Podologa em votorantim - claudia rangel (11).mp4',
  'Produtos para podologia em Votorantim, São Paulo..mp4',
  'Podóloga em Votorantim, São Paulo..jpeg',
  'Onicomicose  (2).jpeg',
  'Screenshot_1.png',
  'Screenshot_2.png',
  'Screenshot_3.png'
];

const pendingFiles = files.filter(f => !ALREADY_HANDLED.includes(f));
console.log('Total pending files to handle:', pendingFiles.length);

const pendingVideos = pendingFiles.filter(f => f.endsWith('.mp4'));
const pendingImages = pendingFiles.filter(f => !f.endsWith('.mp4'));

console.log('Pending Videos:', pendingVideos);
console.log('\nPending Images Count:', pendingImages.length);
console.log('Pending Images:', pendingImages);

