const fs = require('fs');
let txt = fs.readFileSync('server.js', 'utf8');

txt = txt.replace(/\{ id:\s*'([^']+)',([\s\S]*?)img:\s*'https:\/\/cdn-icons-png\.flaticon\.com[^']+'/g, (match, p1, p2) => {
    return '{ id: \'' + p1 + '\',' + p2 + 'img: \'/assets/' + p1 + '.png\'';
});

fs.writeFileSync('server.js', txt, 'utf8');
console.log('Updated server.js to use local assets.');
