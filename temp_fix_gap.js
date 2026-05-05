const fs = require('fs');
const files = ['ogrenci-panel.html', 'dersler.html', 'canli-ders.html', 'kitaplar.html', 'sinavlar.html', 'kütüphane.html', 'ayarlar.html'];

files.forEach(f => {
  if (!fs.existsSync(f)) return;
  let txt = fs.readFileSync(f, 'utf8');
  
  txt = txt.replace(/gap:15px; white-space:nowrap; padding-left:25px;/g, 'gap:8px; white-space:nowrap; padding-left:18px;');

  fs.writeFileSync(f, txt, 'utf8');
});
console.log('Fixed alignment gaps in sidebars');
