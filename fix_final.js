const fs = require('fs');

const serverFile = 'c:\\Users\\elifs\\OneDrive\\Desktop\\Yeni klasör\\server.js';
let serverTxt = fs.readFileSync(serverFile, 'utf8');

// Replace shop items
const newShopItems = `
app.get('/api/shop/items', (req, res) => {
  res.json({
    success: true,
    items: [
      { id: 'swordmaster', name: 'Kılıç Ustası', price: 50, type: 'avatar', img: 'assets/char_swordmaster_1778791645252.png' },
      { id: 'mage', name: 'Büyücü', price: 100, type: 'avatar', img: 'assets/char_mage_1778791666481.png' },
      { id: 'archer', name: 'Okçu', price: 150, type: 'avatar', img: 'assets/char_archer_1778791685590.png' },
      { id: 'ninja', name: 'Ninja', price: 200, type: 'avatar', img: 'assets/char_ninja_1778791701344.png' }
    ]
  });
});`;

// Try to replace existing /api/shop/items
const shopRegex = /app\.get\(['"`]\/api\/shop\/items['"`],\s*\(req,\s*res\)\s*=>\s*\{[\s\S]*?\}\);/i;
if (shopRegex.test(serverTxt)) {
  serverTxt = serverTxt.replace(shopRegex, newShopItems.trim());
} else {
  serverTxt = serverTxt.replace('// ─── API ENDPOINTS', '// ─── API ENDPOINTS\n' + newShopItems.trim());
}
fs.writeFileSync(serverFile, serverTxt, 'utf8');

// fix renci bug in HTML files
const htmlFiles = ['ogrenci-panel.html', 'veli-panel.html'];
for (const file of htmlFiles) {
  if (fs.existsSync(file)) {
    let txt = fs.readFileSync(file, 'utf8');
    txt = txt.replace(/<title>renci Paneli/g, '<title>Öğrenci Paneli');
    txt = txt.replace(/>renci:/g, '>Öğrenci:');
    fs.writeFileSync(file, txt, 'utf8');
  }
}

// Fix profile-role bug
const filesWithRole = ['ayarlar.html', 'ogrenci-panel.html'];
for (const file of filesWithRole) {
    if (fs.existsSync(file)) {
        let txt = fs.readFileSync(file, 'utf8');
        // Rol text content inside JS
        txt = txt.replace(/cu\.role === 'ogrenci' \? 'Öğrenci'/g, "(cu.role === 'ogrenci' || cu.role === 'renci') ? 'Öğrenci'");
        // Hardcoded span/p inside HTML
        txt = txt.replace(/id="profile-role"([^>]*)>Rol: renci<\/p>/g, 'id="profile-role"$1>Rol: Öğrenci</p>');
        fs.writeFileSync(file, txt, 'utf8');
    }
}
console.log('EBA Market ve renci hataları giderildi.');
