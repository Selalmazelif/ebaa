const fs = require('fs');
let txt = fs.readFileSync('ayarlar.html', 'utf8');

const blockToRemove = `  // Sidebar
  document.getElementById('sb-name').textContent   = cu.name   || '';
  document.getElementById('sb-role').textContent   = cu.role==='ogrenci'?'Öğrenci':cu.role==='ogretmen'?'Öğretmen':'Veli';
  document.getElementById('sb-school').textContent = cu.school || '';
  if (cu.profilePic) {
    document.getElementById('sb-av-icon').style.display = 'none';
    const img = document.getElementById('sb-av-img'); img.src=cu.profilePic; img.style.display='block';
  }`;

txt = txt.replace(blockToRemove, '  // Sidebar data is handled by auth-utils.js now');
fs.writeFileSync('ayarlar.html', txt, 'utf8');
console.log('Fixed ayarlar.html init()');
