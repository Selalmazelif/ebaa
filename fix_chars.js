const fs = require('fs');

const replacements = [
  { find: /ÖğÖğrenci/g, replace: 'Öğrenci' },
  { find: /ogÖğrenci/g, replace: 'ogrenci' },
  { find: /Canl Ders/g, replace: 'Canlı Ders' },
  { find: /Snavlar/g, replace: 'Sınavlar' },
  { find: /Snf/g, replace: 'Sınıf' },
  { find: /Geri Dn/g, replace: 'Geri Dön' },
  { find: /iin/g, replace: 'için' },
  { find: /bulunamad/g, replace: 'bulunamadı' },
  { find: /Ders Detay/g, replace: 'Ders Detayı' },
  { find: /Sınıfnza/g, replace: 'Sınıfınıza' },
  { find: /Konular/g, replace: 'Konuları' },
  { find: /renci/g, replace: 'Öğrenci' },
  { find: /\ufffd/g, replace: '' }
];

const files = ['dersler.html', 'ders-detay.html', 'sinavlar.html', 'ogrenci-panel.html', 'ogretmen-panel.html', 'canli-ders.html', 'chat.html', 'veli-panel.html', 'kütüphane.html'];

files.forEach(f => {
  if (fs.existsSync(f)) {
    let content = fs.readFileSync(f, 'utf8');
    replacements.forEach(r => {
      content = content.replace(r.find, r.replace);
    });
    // Final polish for sidebar
    content = content.replace(/Canl Ders/g, 'Canlı Ders')
                     .replace(/Snavlar/g, 'Sınavlar')
                     .replace(/Mesajlar/g, 'Mesajlar');
    
    fs.writeFileSync(f, content, 'utf8');
    console.log(`Fixed ${f}`);
  }
});
