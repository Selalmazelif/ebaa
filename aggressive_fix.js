const fs = require('fs');

function aggressiveFix(content) {
  // Fix course names
  content = content.replace(/Trke/g, 'Türkçe');
  content = content.replace(/Trke/g, 'Türkçe');
  content = content.replace(/Trke/g, 'Türkçe');
  
  // Fix sidebar and common words
  content = content.replace(/k /g, 'Çıkış ');
  content = content.replace(/Canl Ders/g, 'Canlı Ders');
  content = content.replace(/Snavlar/g, 'Sınavlar');
  content = content.replace(/Snf/g, 'Sınıf');
  content = content.replace(/Snf/g, 'Sınıf');
  content = content.replace(/gre/g, 'göre');
  content = content.replace(/gre/g, 'göre');
  content = content.replace(/iin/g, 'için');
  content = content.replace(/iin/g, 'için');
  content = content.replace(/Dn/g, 'Dön');
  content = content.replace(/Dn/g, 'Dön');
  content = content.replace(/bulunamad/g, 'bulunamadı');
  content = content.replace(/renci/g, 'Öğrenci');
  content = content.replace(/renci/g, 'Öğrenci');
  
  // Fix replacement characters if they are there as raw bytes
  // (Handling \ufffd is tricky because it depends on how we read the file)
  
  return content;
}

const files = ['dersler.html', 'ders-detay.html', 'sinavlar.html', 'ogrenci-panel.html', 'ogretmen-panel.html', 'canli-ders.html', 'chat.html', 'veli-panel.html', 'kütüphane.html'];

files.forEach(f => {
  if (fs.existsSync(f)) {
    // Read as binary to avoid utf8 replacement character issues initially
    let buffer = fs.readFileSync(f);
    let content = buffer.toString('utf8');
    
    let fixed = aggressiveFix(content);
    
    // Also try common single-byte replacements if it was Windows-1254
    //  in many contexts is c396 or similar
    
    fs.writeFileSync(f, fixed, 'utf8');
    console.log(`Aggressively fixed ${f}`);
  }
});
