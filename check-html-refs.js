const fs = require('fs');
const path = require('path');
const htmlFiles = fs.readdirSync('.').filter(f=>f.endsWith('.html'));
const missing = [];
for(const file of htmlFiles){
  const content = fs.readFileSync(file,'utf8');
  const regex = /(?:src|href)=["']([^"']+)["']/g;
  let match;
  while((match = regex.exec(content))){
    const url = match[1];
    // Skip template literals and external URLs
    if(url.includes('${') || url.startsWith('http')||url.startsWith('//')||url.startsWith('mailto:')||url.startsWith('tel:')) continue;
    const clean = url.split('?')[0].split('#')[0];
    const target = path.join(path.dirname(file), clean);
    if(!fs.existsSync(target)){
      missing.push({file, ref: url, target});
    }
  }
}
if(missing.length === 0){
  console.log('✅ Tüm yerel referans edilen dosyalar mevcut.');
} else {
  console.log('⚠️ Eksik referanslar bulundu:');
  missing.forEach(m=> console.log(`- ${m.file} -> ${m.ref} (aranan: ${m.target})`));
  process.exit(1);
}
