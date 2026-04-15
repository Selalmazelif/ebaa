const fs = require('fs');
const files = [
  'kütüphane.html','sinavlar.html','kitaplar.html','dersler.html','ogretmen-dersler.html',
  'ogretmen-canli-ders.html','canli-ders.html','db-viewer.html','tarama-testleri.html',
  'tarama-testi.html','sinav-olustur.html','satranc.html','quiz.html','labirent.html',
  'ders-detay.html', 'ayarlar.html'
];

let replaced = 0;
for (const f of files) {
  if (!fs.existsSync(f)) continue;
  let txt = fs.readFileSync(f, 'utf8');

  let dirty = false;

  // 1. Üst bar bildirimi düzeltme (Eğer yoksa veya eskiyse)
  const topbarMatch = txt.match(/<div class="icons"(?:[\s\S]*?)<i class="fa fa-bell"><\/i>(?:[\s\S]*?)<\/div>/is);
  if (topbarMatch && !txt.includes('id="notifPanel"')) {
    const replacement = `
    <div class="icons" style="position:relative;">
      <span style="position:relative;cursor:pointer;" onclick="toggleNotif()">
        <i class="fa fa-bell"></i>
        <span id="notifBadge" style="display:none;background:#e74c3c;color:white;border-radius:50%;width:16px;height:16px;font-size:10px;align-items:center;justify-content:center;position:absolute;top:-6px;right:-6px;display:inline-flex;"></span>
      </span>
      <a href="chat.html"><i class="fa fa-envelope"></i></a>
    </div>

    <!-- Bildirim paneli -->
    <div id="notifPanel" style="display:none;position:fixed;top:64px;right:20px;width:300px;max-height:360px;overflow-y:auto;background:white;border-radius:12px;box-shadow:0 8px 30px rgba(0,0,0,0.15);z-index:9999;">
      <div style="padding:12px 16px;border-bottom:1px solid #eee;font-weight:700;color:#284B63;font-size:13px;">🔔 Bildirimler</div>
      <div id="notifList"></div>
    </div>
    `;
    txt = txt.replace(topbarMatch[0], replacement);
    dirty = true;
  }

  // 2. Sınav Detay Modalını Ekle
  if (!txt.includes('id="examDetailModal"')) {
     const modalHTML = `
  <!-- Sınav Yanlışları Modalı -->
  <div id="examDetailModal" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); z-index:10000; align-items:center; justify-content:center;">
    <div style="background:white; width:450px; max-width:90%; border-radius:12px; padding:20px; box-shadow:0 10px 30px rgba(0,0,0,0.2);">
      <h3 style="margin-top:0; color:#284B63; border-bottom:1px solid #eee; padding-bottom:10px;">Sınav Detayı: <span id="examTitleSpan"></span></h3>
      <div style="display:flex; justify-content:space-around; margin-bottom:15px; text-align:center;">
         <div style="color:#2ecc71; font-weight:bold; font-size:18px;"><span id="exCor">0</span><br><span style="font-size:12px; font-weight:normal;">Doğru</span></div>
         <div style="color:#e74c3c; font-weight:bold; font-size:18px;"><span id="exWro">0</span><br><span style="font-size:12px; font-weight:normal;">Yanlış</span></div>
         <div style="color:#f39200; font-weight:bold; font-size:18px;"><span id="exBla">0</span><br><span style="font-size:12px; font-weight:normal;">Boş</span></div>
      </div>
      <div id="wrongQuestionsList" style="max-height:200px; overflow-y:auto; font-size:13px; color:#444;"></div>
      <div style="text-align:right; margin-top:20px;">
        <button onclick="document.getElementById('examDetailModal').style.display='none'" style="padding:8px 16px; background:#4A748F; color:white; border:none; border-radius:6px; cursor:pointer;">Kapat</button>
      </div>
    </div>
  </div>`;
     txt = txt.replace('</body>', modalHTML + "\n</body>");
     dirty = true;
  }

  // 3. Güncel JS Kodunu Enjekte Et (Eskisini bulup değiştiriyoruz)
  const newJs = `
<script>
function showExamDetails(t,c,w,b,sJson) {
  document.getElementById('examTitleSpan').textContent=t;
  document.getElementById('exCor').textContent=c;
  document.getElementById('exWro').textContent=w;
  document.getElementById('exBla').textContent=b;
  const el = document.getElementById('wrongQuestionsList');
  if(!sJson || sJson==='[]' || sJson==='null') {
    el.innerHTML='<div style="text-align:center;color:#aaa;padding:10px;">Yanlış soru detayı yok.</div>';
  } else {
    try {
      const arr = JSON.parse(sJson);
      el.innerHTML = arr.map(q => '<div style="border:1px solid #ffcccc;background:#fff5f5;padding:10px;border-radius:6px;margin-top:10px;"><b>Soru:</b> '+q.q+'<br><span style="color:#e74c3c">Cevabınız: '+(q.ans||'Boş')+'</span><br><span style="color:#2ecc71">Doğru: '+q.corr+'</span></div>').join('');
    } catch(e){ el.innerHTML='Hata: '+e.message; }
  }
  document.getElementById('examDetailModal').style.display='flex';
}

function parseNotifText(originalText) {
  let txt = originalText;
  let btn = '';
  const match = txt.match(/===EXAM_DET:(.*?)===/);
  if(match) {
     const parts = match[1].split('|');
     const title = parts[0];
     const cor = parts[1];
     const wro = parts[2];
     const bla = parts[3];
     const json = parts[4] || '[]';
     const jsonEscaped = json.replace(/'/g, "&#39;").replace(/"/g, "&quot;");
     btn = '<br><button onclick="showExamDetails(\\''+title+'\\',\\''+cor+'\\',\\''+wro+'\\',\\''+bla+'\\',\\''+jsonEscaped+'\\')" style="margin-top:5px;background:#4A748F;color:white;border:none;padding:4px 8px;border-radius:4px;cursor:pointer;font-size:11px;">Hatalı Soruları Gör</button>';
     txt = txt.replace(match[0], '');
  }
  return txt + btn;
}

async function loadNotifs() {
  if (typeof cu === 'undefined') return;
  try {
    // Ödev durum kontrolünü tetikle (Sadece öğrenci için backend kısıtlamalı)
    fetch('/api/check-homework-status', {
      method: 'POST',
      headers: { 
        'Authorization': \`Bearer \${localStorage.getItem('eba_token')}\`,
        'Content-Type': 'application/json'
      }
    }).catch(e => {});

    const r=await fetch('/api/notifications?tc='+cu.tc, {
      headers: { 'Authorization': \`Bearer \${localStorage.getItem('eba_token')}\` }
    });
    const d=await r.json(); 
    if(!d.success) return;
    const notifs = d.notifications;
    const unread = notifs.filter(n=>!n.isRead).length;
    const badge = document.getElementById('notifBadge');
    if(badge) {
      if(unread>0){ badge.style.display='inline-flex'; badge.textContent=unread; }
      else badge.style.display='none';
    }
    const list = document.getElementById('notifList');
    if(list) {
      list.innerHTML = notifs.slice(0,10).map(n => \`
        <div style="padding:10px 16px;border-bottom:1px solid #f0f0f0;font-size:12px;line-height:1.5;\${n.isRead?'opacity:.65;':'font-weight:600;'}">
          \${parseNotifText(n.text)}
          <div style="font-size:10px;color:#bbb;margin-top:2px;">\${new Date(n.createdAt).toLocaleString('tr-TR')}</div>
        </div>
      \`).join('') || '<div style="padding:10px 16px;color:#aaa;text-align:center;font-size:12px;">Bildirim yok</div>';
    }
  } catch(e) {}
}

async function toggleNotif() {
  const p=document.getElementById('notifPanel');
  if(!p) return;
  if(p.style.display==='block'){ p.style.display='none'; return; }
  p.style.display='block';
  if(typeof cu !== 'undefined') {
    try {
      await fetch('/api/notifications/read',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({tc:cu.tc})});
      const b = document.getElementById('notifBadge');
      if(b) b.style.display='none';
    }catch(e){}
  }
}
document.addEventListener('click',e=>{
  const p=document.getElementById('notifPanel');
  if(p&&!e.target.closest('#notifPanel')&&!e.target.closest('span[onclick*="toggleNotif"]'))p.style.display='none';
});
setTimeout(() => { loadNotifs(); }, 1000);
</script>
`;

  // Mevcut eski script bloğunu (loadNotifs içeren) bul ve sil/değiştir
  const scriptRegex = /<script>\s*async function loadNotifs\(\) \{[\s\S]*?setTimeout\(\(\) => \{ loadNotifs\(\); \}, 1500\);\s*<\/script>/;
  if (txt.match(scriptRegex)) {
    txt = txt.replace(scriptRegex, newJs);
    dirty = true;
  } else if (!txt.includes('parseNotifText')) {
    txt = txt.replace('</body>', newJs + "\n</body>");
    dirty = true;
  }

  if (dirty) {
    fs.writeFileSync(f, txt, 'utf8');
    replaced++;
    console.log("Güncellendi: " + f);
  }
}
console.log("Toplam güncellenen dosya: " + replaced);
