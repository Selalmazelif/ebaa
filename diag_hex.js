const fs = require('fs');
const b = fs.readFileSync('ders-detay.html');
const s = b.toString('hex');
const index = s.indexOf('43616e6c'); // Canl
console.log(s.slice(index, index + 20));
