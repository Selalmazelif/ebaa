const fs = require('fs');

const files = ['ogrenci-panel.html', 'ogretmen-panel.html', 'veli-panel.html'];

for(const f of files) {
  if(!fs.existsSync(f)) continue;
  let code = fs.readFileSync(f, 'utf8');
  
  // Regex to remove the li containing forum.html
  const newCode = code.replace(/<li><a href="forum\.html".*?<\/li>/g, '');
  
  if (newCode !== code) {
    fs.writeFileSync(f, newCode);
    console.log(`Removed forum link from ${f}`);
  }
}
