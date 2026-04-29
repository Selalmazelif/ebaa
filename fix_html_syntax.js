const fs = require('fs');
const files = fs.readdirSync('.').filter(f => f.endsWith('.html'));

for (let file of files) {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;
  content = content.replace(/\\`/g, '`').replace(/\\\$\{/g, '${');
  if (content !== original) {
    fs.writeFileSync(file, content);
    console.log(`Fixed syntax in ${file}`);
  }
}
