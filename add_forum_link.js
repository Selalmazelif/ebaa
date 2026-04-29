const fs = require('fs');
const files = ['ogrenci-panel.html', 'ogretmen-panel.html', 'veli-panel.html'];

for(const f of files) {
  if(!fs.existsSync(f)) continue;
  let code = fs.readFileSync(f, 'utf8');
  if(!code.includes('href="forum.html"')) {
     code = code.replace(/<li><a href="kütüphane\.html">.*?<\/a><\/li>/g, match => {
        return `<li><a href="forum.html"><i class="fa-solid fa-comments"></i> Okul Forumu</a></li>\n      ${match}`;
     });
     fs.writeFileSync(f, code);
     console.log(`Added forum link to ${f}`);
  }
}
