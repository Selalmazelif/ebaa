const fs = require('fs');
const files = ['ogrenci-panel.html', 'dersler.html', 'canli-ders.html', 'kitaplar.html', 'sinavlar.html', 'kütüphane.html', 'ayarlar.html'];

for (const f of files) {
  let txt = fs.readFileSync(f, 'utf8');
  // Remove all active classes from the sidebar menu
  txt = txt.replace(/<ul id="sidebar-menu">([\s\S]*?)<\/ul>/, (match) => {
    let newMenu = match.replace(/class="active"/g, '');
    // Add active class back to the current file's link
    let linkToMatch = f === 'ogrenci-panel.html' ? 'ogrenci-panel.html' : f;
    let regex = new RegExp('href="' + linkToMatch + '"(?!\\?)'); // Avoid matching ?modal=
    newMenu = newMenu.replace(regex, 'href="' + linkToMatch + '" class="active"');
    return newMenu;
  });
  fs.writeFileSync(f, txt, 'utf8');
}
