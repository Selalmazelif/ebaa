const fs = require('fs');

const cleanups = [
  // Restore roles
  { find: /og[Öğ]+renci/g, replace: 'ogrenci' },
  { find: /og[Öğ]+retmen/g, replace: 'ogretmen' },
  { find: /veli/g, replace: 'veli' }, // Just in case
  
  // Restore corrupted Turkish words
  { find: /Çı[Çıkış]+ış/g, replace: 'Çıkış' },
  { find: /Öğ[Öğ]+renci/g, replace: 'Öğrenci' },
  { find: /Atatür[Çıkış]+'ü/g, replace: "Atatürk'ü" },
  { find: /Gençli[ÇıÇıkış]+ış/g, replace: 'Gençlik' },
  { find: /Birli[ÇıÇıkış]+ış/g, replace: 'Birlik' },
  { find: /Eme[ÇıÇıkış]+ış/g, replace: 'Emek' },
  { find: /Demo[Çıkış]+rasi/g, replace: 'Demokrasi' },
  { find: /Sı[Sınıf]+ıf/g, replace: 'Sınıf' },
  { find: /Sı[Sınıf]+ıf/g, replace: 'Sınıf' },
  { find: /Sı[Sınıf]+ıf/g, replace: 'Sınıf' },
  
  // Specific role checks in panels
  { find: /user\.role !== 'ogrenci'/g, replace: "user.role !== 'ogrenci'" },
  { find: /user\.role !== 'ogretmen'/g, replace: "user.role !== 'ogretmen'" },
  
  // Fix 'Çıkış' replacement inside 'link' and 'click'
  { find: /linÇıkış/g, replace: 'link' },
  { find: /cliÇıkış/g, replace: 'click' },
  { find: /clicÇıkış/g, replace: 'click' },
  { find: /onclicÇıkış/g, replace: 'onclick' },
  { find: /onclicÇıkış/g, replace: 'onclick' },
  { find: /onclicÇıkış/g, replace: 'onclick' },
  { find: /bacÇıkışground/g, replace: 'background' },
  { find: /darÇıkış-mode/g, replace: 'dark-mode' }
];

const files = ['dersler.html', 'ders-detay.html', 'sinavlar.html', 'ogrenci-panel.html', 'ogretmen-panel.html', 'canli-ders.html', 'chat.html', 'veli-panel.html', 'kütüphane.html', 'auth-utils.js'];

files.forEach(f => {
  if (fs.existsSync(f)) {
    let content = fs.readFileSync(f, 'utf8');
    cleanups.forEach(c => {
      content = content.replace(c.find, c.replace);
    });
    // One more pass for roles in JS comparisons
    content = content.replace(/!== 'ogrenci'/g, "!== 'ogrenci'");
    content = content.replace(/!== 'ogretmen'/g, "!== 'ogretmen'");
    
    fs.writeFileSync(f, content, 'utf8');
    console.log(`Cleaned up ${f}`);
  }
});
