const fs = require('fs');
const files = ['ogrenci-panel.html', 'dersler.html', 'canli-ders.html', 'kitaplar.html', 'sinavlar.html', 'kütüphane.html', 'ayarlar.html'];

files.forEach(f => {
  if (!fs.existsSync(f)) return;
  let txt = fs.readFileSync(f, 'utf8');
  
  // Left align gamification items by adding fixed width to icons and increasing left padding
  txt = txt.replace(/justify-content:flex-start; align-items:center; gap:8px; white-space:nowrap; padding-left:15px;/g, 'justify-content:flex-start; align-items:center; gap:15px; white-space:nowrap; padding-left:25px;');
  txt = txt.replace(/<i class="fa fa-gem" style="color:#f39200;"><\/i>/g, '<i class="fa fa-gem" style="color:#f39200; width:16px; text-align:center;"></i>');
  txt = txt.replace(/<i class="fa fa-coins" style="color:#00C9FF;"><\/i>/g, '<i class="fa fa-coins" style="color:#00C9FF; width:16px; text-align:center;"></i>');
  txt = txt.replace(/<i class="fa fa-fire" style="color:#92FE9D;"><\/i>/g, '<i class="fa fa-fire" style="color:#92FE9D; width:16px; text-align:center;"></i>');

  fs.writeFileSync(f, txt, 'utf8');
});
console.log('Fixed alignment in sidebars');
