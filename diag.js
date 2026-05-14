const fs = require('fs');
const b = fs.readFileSync('ders-detay.html');
console.log(b.slice(0, 500).toString('hex'));
console.log(b.slice(0, 500).toString('utf8'));
