const fs = require('fs');

const files = ['canli-ders.html', 'ogretmen-canli-ders.html'];

for(const f of files) {
  if(!fs.existsSync(f)) continue;
  let code = fs.readFileSync(f, 'utf8');
  if(!code.includes('href="whiteboard.html"')) {
     // yan menüde
     code = code.replace(/<li><a href="canli-ders\.html"(.*?)>.*?<\/a><\/li>/g, match => {
        return `${match}\n      <li><a href="whiteboard.html" target="_blank"><i class="fa-solid fa-chalkboard"></i> Akıllı Tahta</a></li>`;
     });
     // ogretmen panelinde
     code = code.replace(/<li><a href="ogretmen-canli-ders\.html"(.*?)>.*?<\/a><\/li>/g, match => {
        return `${match}\n      <li><a href="whiteboard.html" target="_blank"><i class="fa-solid fa-chalkboard"></i> Akıllı Tahta</a></li>`;
     });
     fs.writeFileSync(f, code);
     console.log(`Added whiteboard link to ${f}`);
  }
}
