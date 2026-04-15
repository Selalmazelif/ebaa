const fs = require('fs');
const files = [
  'kütüphane.html','sinavlar.html','kitaplar.html','dersler.html','ogretmen-dersler.html',
  'ogretmen-canli-ders.html','canli-ders.html','db-viewer.html','tarama-testleri.html',
  'tarama-testi.html','sinav-olustur.html','satranc.html','quiz.html','labirent.html',
  'ders-detay.html'
];

let replaced = 0;
for (const f of files) {
  if (!fs.existsSync(f)) continue;
  let txt = fs.readFileSync(f, 'utf8');

  let dirty = false;

  // Replace '<div class="icons">...<i class="fa fa-bell"></i>...</div>' ignoring nested tags if possible
  const topbarMatch = txt.match(/<div class="icons"(?:[\s\S]*?)<i class="fa fa-bell"><\/i>(?:[\s\S]*?)<\/div>/is);
  
  if (topbarMatch && !txt.includes('toggleNotif()')) {
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

  // Inject JS logic for toggleNotif if not exist
  if (dirty && !txt.includes('async function toggleNotif()')) {
    const jsPayload = `
<script>
async function loadNotifs() {
  if (typeof cu === 'undefined') return;
  let notifs=[];
  try {
    const r=await fetch('/api/notifications?tc='+cu.tc);
    const d=await r.json(); if(d.success) notifs=d.notifications;
  } catch(e) {}
  const unread=notifs.filter(n=>!n.isRead).length;
  const badge=document.getElementById('notifBadge');
  if(badge) {
    if(unread>0){
      badge.style.display='inline-flex';
      badge.textContent=unread>9?'9+':unread;
    } else {
      badge.style.display='none';
    }
  }
  const list=document.getElementById('notifList');
  if(list) {
    list.innerHTML=notifs.slice(0,10).map(n=>\`
      <div style="padding:10px 16px;border-bottom:1px solid #f0f0f0;font-size:12px;line-height:1.5;\${n.isRead?'opacity:.65;':'font-weight:600;'}">
        \${n.text}
        <div style="font-size:10px;color:#bbb;margin-top:2px;">\${n.createdAt?new Date(n.createdAt).toLocaleString('tr-TR'):''}</div>
      </div>
    \`).join('') || '<div style="padding:10px 16px;color:#aaa;text-align:center;font-size:12px;">Bildirim yok</div>';
  }
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

// Otomatik yükleme çalışması için gecikmeli olarak çağır
setTimeout(() => { loadNotifs(); }, 1500);
</script>
</body>`;
    txt = txt.replace('</body>', jsPayload);
  }

  if (dirty) {
    fs.writeFileSync(f, txt, 'utf8');
    replaced++;
    console.log("Updated", f);
  }
}
console.log("Total updated:", replaced);
