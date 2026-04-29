const fs = require('fs');
let code = fs.readFileSync('ai-bot.js', 'utf8');
code = code.replace(/\\`/g, '`');
fs.writeFileSync('ai-bot.js', code);
console.log('Fixed ai-bot.js syntax');
