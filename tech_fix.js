const fs = require('fs');

const technicalFixes = [
  // Filenames and Roles
  { find: /og[Ööğ]+renci-panel\.html/g, replace: 'ogrenci-panel.html' },
  { find: /og[Ööğ]+retmen-panel\.html/g, replace: 'ogretmen-panel.html' },
  { find: /og[Ööğ]+retmen-dersler\.html/g, replace: 'ogretmen-dersler.html' },
  { find: /og[Ööğ]+retmen-canli-ders\.html/g, replace: 'ogretmen-canli-ders.html' },
  { find: /user\.role === 'og[Ööğ]+renci'/g, replace: "user.role === 'ogrenci'" },
  { find: /user\.role === "og[Ööğ]+renci"/g, replace: 'user.role === "ogrenci"' },
  { find: /user\.role !== 'og[Ööğ]+renci'/g, replace: "user.role !== 'ogrenci'" },
  { find: /user\.role !== "og[Ööğ]+renci"/g, replace: 'user.role !== "ogrenci"' },
  { find: /role === 'og[Ööğ]+retmen'/g, replace: "role === 'ogretmen'" },
  { find: /role === "og[Ööğ]+retmen"/g, replace: 'role === "ogretmen"' },
  { find: /role !== 'og[Ööğ]+retmen'/g, replace: "role !== 'ogretmen'" },
  { find: /role !== "og[Ööğ]+retmen"/g, replace: 'role !== "ogretmen"' },
  
  // Tag corruption
  { find: /onclic[Ööğ]+k/g, replace: 'onclick' },
  { find: /bac[Ööğ]+kground/g, replace: 'background' },
  { find: /dar[Ööğ]+k-mode/g, replace: 'dark-mode' }
];

const files = ['dersler.html', 'ders-detay.html', 'sinavlar.html', 'ogrenci-panel.html', 'ogretmen-panel.html', 'canli-ders.html', 'chat.html', 'veli-panel.html', 'kütüphane.html', 'auth-utils.js', 'login.js', 'index.html'];

files.forEach(f => {
  if (fs.existsSync(f)) {
    let content = fs.readFileSync(f, 'utf8');
    technicalFixes.forEach(fix => {
      content = content.replace(fix.find, fix.replace);
    });
    // Ensure 'ogrenci' is always ogrenci in roles
    content = content.replace(/'ogrenci'/g, "'ogrenci'");
    content = content.replace(/"ogrenci"/g, '"ogrenci"');
    content = content.replace(/'ogretmen'/g, "'ogretmen'");
    content = content.replace(/"ogretmen"/g, '"ogretmen"');
    
    fs.writeFileSync(f, content, 'utf8');
    console.log(`Technically fixed ${f}`);
  }
});
