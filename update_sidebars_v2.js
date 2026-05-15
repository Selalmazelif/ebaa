const fs = require('fs');
const files = [
  'ayarlar.html', 'canli-ders.html', 'ders-detay.html', 'dersler.html', 
  'kitaplar.html', 'kütüphane.html', 'portfolyo.html', 'sinavlar.html',
  'whiteboard.html', 'yarisma.html', 'ogrenci-panel.html', 'quiz.html'
];

const targetSidebar = `    <ul id="sidebar-menu">
      <li><a href="ogrenci-panel.html"><i class="fa-solid fa-house"></i> Ana Sayfa</a></li>
      <li><a href="dersler.html"><i class="fa-solid fa-book"></i> Dersler</a></li>
      <li><a href="canli-ders.html"><i class="fa-solid fa-video"></i> Canlı Ders</a></li>
      <li><a href="kitaplar.html"><i class="fa-solid fa-file"></i> Kitaplar</a></li>
      <li><a href="sinavlar.html"><i class="fa-solid fa-pen"></i> Sınavlar</a></li>
      <li><a href="portfolyo.html"><i class="fa-solid fa-id-card"></i> Portfolyo</a></li>
      <li><a href="kütüphane.html"><i class="fa-solid fa-building-columns"></i> Kütüphane</a></li>
      <li><a href="whiteboard.html"><i class="fa-solid fa-chalkboard"></i> Akıllı Tahta</a></li>
      <li><a href="yarisma.html"><i class="fa-solid fa-bolt"></i> 1v1 Yarışma</a></li>
      <li><a href="ogrenci-panel.html?modal=shop"><i class="fa-solid fa-store"></i> EBA Market</a></li>
      <li><a href="ogrenci-panel.html?modal=avatar"><i class="fa-solid fa-user-ninja"></i> Avatarım</a></li>
      <li><a href="ayarlar.html"><i class="fa-solid fa-gear"></i> Ayarlar</a></li>
    </ul>`;

let updated = 0;
for (const f of files) {
  if (!fs.existsSync(f)) continue;
  let txt = fs.readFileSync(f, 'utf8');
  
  // Bul
  const regex = /<ul id="sidebar-menu">[\s\S]*?<\/ul>/;
  if (regex.test(txt)) {
    // Replace and set active class correctly
    let newMenu = targetSidebar;
    // Activate the right link
    const basename = f;
    const activeRegex = new RegExp(`href="${basename}"`);
    if (activeRegex.test(newMenu)) {
       newMenu = newMenu.replace(activeRegex, `href="${basename}" class="active"`);
    }
    
    txt = txt.replace(regex, newMenu);
    fs.writeFileSync(f, txt, 'utf8');
    updated++;
  }
}
console.log(updated + " file(s) updated with new sidebar.");
