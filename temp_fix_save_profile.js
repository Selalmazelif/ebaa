const fs = require('fs');
let txt = fs.readFileSync('ayarlar.html', 'utf8');

txt = txt.replace(/document\.getElementById\('sb-name'\)/g, "document.getElementById('profile-name')");
txt = txt.replace(/document\.getElementById\('sb-school'\)/g, "document.getElementById('profile-school')");

fs.writeFileSync('ayarlar.html', txt, 'utf8');
console.log('Fixed ayarlar.html saveProfile DOM IDs');
