const fs = require('fs');
const files = [
  'ogrenci-panel.html', 'dersler.html', 'canli-ders.html', 'kitaplar.html', 
  'sinavlar.html', 'kütüphane.html', 'ders-detay.html', 'sinavlar.html',
  'tarama-testleri.html', 'quiz.html'
];

for (const f of files) {
  if (!fs.existsSync(f)) continue;
  let txt = fs.readFileSync(f, 'utf8');
  let dirty = false;

  // Sidebar menüsünde Ayarlar yoksa ekle
  if (txt.includes('id="sidebar-menu"') || txt.includes('class="sidebar"')) {
    if (!txt.includes('ayarlar.html')) {
       // Farklı sidebar formatları olabilir. Yaygın olan ul bloğunu bulalım.
       const ulMatch = txt.match(/<ul id="sidebar-menu">([\s\S]*?)<\/ul>/) || txt.match(/<ul(?:[\s\S]*?)>([\s\S]*?)<\/ul>/);
       if (ulMatch) {
          const oldUl = ulMatch[0];
          const newLi = '<li><a href="ayarlar.html"><i class="fa-solid fa-gear"></i> Ayarlar</a></li>';
          if (!oldUl.includes('ayarlar.html')) {
             txt = txt.replace('</ul>', newLi + '\n      </ul>');
             dirty = true;
          }
       }
    }
  }

  // ders-detay.html özel: Video İstatistiği
  if (f === 'ders-detay.html' && !txt.includes('watchTopic')) {
     const jsTopic = `
<script>
async function watchTopic(name) {
  alert(name + ' konusunu çalışmaya başladınız. Video/İçerik süresi istatistiklerinize eklenecek.');
  try {
     const user = JSON.parse(localStorage.getItem('currentUser'));
     // Video istatistiği olarak 15 dakika ekleyelim (örnek)
     await fetch('/api/student-stats', {
       method: 'POST',
       headers: {'Content-Type': 'application/json'},
       body: JSON.stringify({ student_tc: user.tc, type: 'video', value: 15 })
     });
  } catch(e) {}
}
</script>
`;
     txt = txt.replace('</body>', jsTopic + '\n</body>');
     // Butonu güncelle
     txt = txt.replace(/<button style="margin-top:15px; padding:8px 15px; border:none; background:#4A748F; color:white; border-radius:20px; cursor:pointer;">\s*Konuya Git\s*<\/button>/g, 
                       '<button onclick="watchTopic(\'${topic}\')" style="margin-top:15px; padding:8px 15px; border:none; background:#4A748F; color:white; border-radius:20px; cursor:pointer;">Konuya Git</button>');
     dirty = true;
  }

  if (dirty) {
    fs.writeFileSync(f, txt, 'utf8');
    console.log("Yan menü/İstatistik düzeltildi: " + f);
  }
}
