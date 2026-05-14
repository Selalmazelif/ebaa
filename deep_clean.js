const fs = require('fs');

const files = ['dersler.html', 'ders-detay.html', 'sinavlar.html', 'ogrenci-panel.html', 'ogretmen-panel.html', 'canli-ders.html', 'chat.html', 'veli-panel.html', 'kütüphane.html', 'auth-utils.js'];

files.forEach(f => {
  if (fs.existsSync(f)) {
    let content = fs.readFileSync(f, 'utf8');
    
    // Step 1: Revert all 'Çıkış' back to 'k' (since k was the source of corruption)
    content = content.replace(/Çıkış/g, 'k');
    
    // Step 2: Revert all 'Öğrenci' back to 'renci' (since renci was the source of corruption)
    content = content.replace(/Öğrenci/g, 'renci');
    
    // Step 3: Now fix the ACTUAL Turkish words we want
    // (Using context to avoid corruption)
    
    // Sidebar / Buttons
    content = content.replace(/>k</g, '>Çıkış<');
    content = content.replace(/'k'/g, "'Çıkış'");
    content = content.replace(/"k"/g, '"Çıkış"');
    
    // Common words
    content = content.replace(/ogrenci/g, 'ogrenci'); // Ensure role is ogrenci
    content = content.replace(/ogretmen/g, 'ogretmen');
    content = content.replace(/Snavlar/g, 'Sınavlar');
    content = content.replace(/Canl Ders/g, 'Canlı Ders');
    content = content.replace(/Snf/g, 'Sınıf');
    content = content.replace(/Trke/g, 'Türkçe');
    content = content.replace(/Geri Dn/g, 'Geri Dön');
    
    // Specific fixes for the "Eba'da Ne Yaptın" part and titles
    content = content.replace(/Gnlk Seri/g, 'Günlük Seri');
    content = content.replace(/Gnlk giri/g, 'Günlük giriş');
    content = content.replace(/Nasl kazanlr/g, 'Nasıl kazanılır');
    content = content.replace(/Oturumunuz d/g, 'Oturumunuz doldu');
    content = content.replace(/renciler/g, 'Öğrenciler');
    content = content.replace(/retmenler/g, 'Öğretmenler');
    
    // Fix roles in panel init
    content = content.replace(/role !== 'ogrenci'/g, "role !== 'ogrenci'");
    content = content.replace(/role !== 'ogretmen'/g, "role !== 'ogretmen'");
    
    fs.writeFileSync(f, content, 'utf8');
    console.log(`Deep cleaned ${f}`);
  }
});
