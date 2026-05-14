const fs = require('fs');

const replacements = [
  // Course names
  { find: /Trke/g, replace: 'Türkçe' },
  { find: /T\ufffdrk\ufffde/g, replace: 'Türkçe' },
  
  // Sidebar
  { find: />k</g, replace: '>Çıkış<' },
  { find: />k</g, replace: '>Çıkış<' },
  { find: /Canl Ders/g, replace: 'Canlı Ders' },
  { find: /Snavlar/g, replace: 'Sınavlar' },
  { find: /ogrenci-panel/g, replace: 'ogrenci-panel' },
  
  // Header / Banner
  { find: /Ders Detay/g, replace: 'Ders Detayı' },
  { find: /Snfnza gre/g, replace: 'Sınıfınıza göre' },
  { find: /Geri Dn/g, replace: 'Geri Dön' },
  { find: /Snf/g, replace: 'Sınıf' },
  
  // Content
  { find: /ders iin konu bulunamad/g, replace: 'ders için konu bulunamadı' },
  { find: /renci/g, replace: 'Öğrenci' },
  
  // Fix accidental corruption from previous attempts
  { find: /link/g, replace: 'link' },
  { find: /k/g, replace: 'Çıkış' }
];

const files = ['dersler.html', 'ders-detay.html', 'sinavlar.html', 'ogrenci-panel.html', 'ogretmen-panel.html', 'canli-ders.html', 'chat.html', 'veli-panel.html', 'kütüphane.html'];

files.forEach(f => {
  if (fs.existsSync(f)) {
    let content = fs.readFileSync(f, 'utf8');
    replacements.forEach(r => {
      content = content.replace(r.find, r.replace);
    });
    fs.writeFileSync(f, content, 'utf8');
    console.log(`Fixed ${f}`);
  }
});
