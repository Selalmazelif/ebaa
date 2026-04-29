const fs = require('fs');
const files = fs.readdirSync('.').filter(f => f.endsWith('.html'));

let count = 0;
for(const f of files) {
  let content = fs.readFileSync(f, 'utf8');
  if(!content.includes('ai-bot.js')) {
    content = content.replace(/<\/body>/i, '  <script src="ai-bot.js"></script>\n</body>');
    fs.writeFileSync(f, content, 'utf8');
    count++;
  }
}
console.log(`Injected ai-bot.js into ${count} files.`);
