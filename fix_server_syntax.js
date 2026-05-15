const fs = require('fs');
const file = 'c:\\Users\\elifs\\OneDrive\\Desktop\\Yeni klasör\\server.js';
let txt = fs.readFileSync(file, 'utf8');

// Replace standard newline and carriage return variants
txt = txt.replace(/}\);\s*}\);\s*app\.post\('\/api\/shop\/buy'/g, "});\n\napp.post('/api/shop/buy'");

fs.writeFileSync(file, txt, 'utf8');
console.log("Syntax hatası giderildi.");
