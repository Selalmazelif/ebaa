const fs = require('fs');
const files = ['dersler.html', 'canli-ders.html', 'kitaplar.html', 'sinavlar.html', 'kütüphane.html', 'ayarlar.html'];
const ogrenciTxt = fs.readFileSync('ogrenci-panel.html', 'utf8');
const sidebarMatch = ogrenciTxt.match(/<div class="sidebar">([\s\S]*?)<div class="main">/);
if (!sidebarMatch) { console.error('Sidebar not found in ogrenci-panel.html'); process.exit(1); }
const sidebarHtml = '<div class="sidebar">' + sidebarMatch[1];

files.forEach(f => {
  if (!fs.existsSync(f)) return;
  let txt = fs.readFileSync(f, 'utf8');
  
  // Replace the sidebar HTML
  txt = txt.replace(/<div class="sidebar">([\s\S]*?)<div class="main">/, sidebarHtml + '<div class="main">');
  
  // Set the correct active class
  txt = txt.replace(/<ul id="sidebar-menu">([\s\S]*?)<\/ul>/, (match) => {
    let newMenu = match.replace(/class="active"/g, '');
    let regex = new RegExp('href="' + f + '"(?!\\?)');
    newMenu = newMenu.replace(regex, 'href="' + f + '" class="active"');
    return newMenu;
  });

  // Remove the JS that overrides the sidebar-menu
  txt = txt.replace(/document\.getElementById\('sidebar-menu'\)\.innerHTML\s*=\s*`[\s\S]*?`;/, '');
  
  fs.writeFileSync(f, txt, 'utf8');
  console.log('Fixed ' + f);
});
