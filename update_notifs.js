const fs = require('fs');
const files = fs.readdirSync('.').filter(f => f.endsWith('.html'));

const newFunc = `// --- GLOBAL TOAST BİLDİRİM FONKSİYONU ---
function showGlobalToast(msg, type='info', targetUrl='#') {
  let toast = document.getElementById('toast-notif-global');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast-notif-global';
    toast.style.cssText = \`
      position:fixed; bottom:24px; right:24px; z-index:99999;
      padding:14px 22px; border-radius:12px; font-size:14px; font-weight:600;
      color:white; box-shadow:0 4px 20px rgba(0,0,0,0.2);
      transition:all 0.4s; opacity:0; transform:translateY(20px);
      max-width:320px; line-height:1.4; cursor:pointer;
    \`;
    document.body.appendChild(toast);
  }
  toast.style.background = type === 'success' ? '#27ae60' : type === 'error' ? '#e74c3c' : '#284B63';
  toast.innerHTML = '<i class="fa fa-bell" style="color:#f39200;margin-right:8px;"></i>' + msg;
  toast.onclick = () => {
    if(targetUrl && targetUrl !== '#') window.location.href = targetUrl;
    toast.style.opacity = '0';
  };
  toast.style.opacity = '1';
  toast.style.transform = 'translateY(0)';
  
  // Bildirim sesi
  try { new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3').play(); } catch(e){}
  
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(20px)';
  }, 6000);
}

let knownNotifs = new Set();
let isFirstLoad = true;

async function loadNotifs() {
  const cu = typeof currentUser !== 'undefined' ? currentUser : (typeof user !== 'undefined' ? user : JSON.parse(localStorage.getItem('currentUser') || 'null'));
  if (!cu || !cu.tc) return;
  
  let notifs=[];
  try {
    // BURASI ÇOK ÖNEMLİ: ebaFetch kullanarak 401 yetkisiz hatasını önlüyoruz
    const r = await (typeof ebaFetch !== 'undefined' ? ebaFetch : fetch)('/api/notifications?tc='+cu.tc, {
      headers: { 'Authorization': 'Bearer ' + localStorage.getItem('authToken') }
    });
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
    list.innerHTML=notifs.slice(0,10).map(n=>{
      let targetUrl = '#';
      const textLow = n.text.toLowerCase();
      
      if (textLow.includes('mesaj') || (n.text.includes('📩') && !textLow.includes('ödev') && !textLow.includes('teslim'))) {
         targetUrl = 'chat.html';
      }
      else if (textLow.includes('sınav') || textLow.includes('quiz') || n.text.includes('📝')) {
         targetUrl = cu.role === 'ogretmen' ? 'ogretmen-panel.html' : 'sinavlar.html';
      }
      else if (textLow.includes('ödev') || textLow.includes('görev') || textLow.includes('teslim')) {
         targetUrl = cu.role === 'ogretmen' ? 'ogretmen-panel.html' : 'ogrenci-panel.html';
      }
      else if (textLow.includes('canlı') || textLow.includes('ders')) {
         targetUrl = cu.role === 'ogretmen' ? 'ogretmen-canli-ders.html' : 'canli-ders.html';
      }
      
      // Dinamik Bildirim Kontrolü (TOAST)
      if (!isFirstLoad && !n.isRead && !knownNotifs.has(n.id)) {
          showGlobalToast(n.text.replace(/===EXAM_DET:.*?===/, ''), 'info', targetUrl);
      }
      knownNotifs.add(n.id);
      
      let parsedText = n.text;
      let btn = '';
      const match = parsedText.match(/===EXAM_DET:(.*?)===/);
      if(match) {
         const parts = match[1].split('|');
         const title = parts[0];
         const cor = parts[1];
         const wro = parts[2];
         const bla = parts[3];
         const jsonEscaped = (parts[4] || '[]').replace(/'/g, "&#39;").replace(/"/g, "&quot;");
         btn = '<br><button onclick="event.stopPropagation(); showExamDetails(\\''+title+'\\',\\''+cor+'\\',\\''+wro+'\\',\\''+bla+'\\',\\''+jsonEscaped+'\\')" style="margin-top:5px;background:#4A748F;color:white;border:none;padding:4px 8px;border-radius:4px;cursor:pointer;font-size:11px;">Hatalı Soruları Gör</button>';
         parsedText = parsedText.replace(match[0], '');
      }
      
      return \`<div onclick="window.location.href='\${targetUrl}'" style="cursor:pointer; padding:10px 16px; border-bottom:1px solid #f0f0f0; font-size:12px; line-height:1.5; \${n.isRead?'opacity:.65;':'font-weight:600;'} transition:background 0.2s;" onmouseover="this.style.background='#f9f9f9'" onmouseout="this.style.background='transparent'">
        \${parsedText} \${btn}
        <div style="font-size:10px;color:#bbb;margin-top:2px;">\${n.createdAt?new Date(n.createdAt).toLocaleString('tr-TR'):''}</div>
      </div>\`;
    }).join('') || '<div style="padding:10px 16px;color:#aaa;text-align:center;font-size:12px;">Bildirim yok</div>';
  }
  isFirstLoad = false;
}

async function markAllRead() {
  const cu = typeof currentUser !== 'undefined' ? currentUser : (typeof user !== 'undefined' ? user : JSON.parse(localStorage.getItem('currentUser') || 'null'));
  if (!cu || !cu.tc) return;
  try {
    await (typeof ebaFetch !== 'undefined' ? ebaFetch : fetch)('/api/notifications/read', {
      method:'PUT',
      headers:{'Content-Type':'application/json', 'Authorization': 'Bearer ' + localStorage.getItem('authToken')},
      body:JSON.stringify({tc:cu.tc})
    });
    const b = document.getElementById('notifBadge');
    if(b) b.style.display='none';
    loadNotifs();
  }catch(e){}
}

// 5 saniyede bir bildirimleri dinamik olarak güncelle
setInterval(loadNotifs, 5000);

async function toggleNotif() {`;

let count = 0;
for (const f of files) {
  let content = fs.readFileSync(f, 'utf8');
  
  // replace regex adjusted to match from "// --- GLOBAL TOAST" or "async function loadNotifs" 
  // We'll just replace the whole block if it exists
  if (content.includes('async function loadNotifs()')) {
    // Temizleme: Eğer önceki scriptte toast tanımlanmışsa onu da al, yoksa sadece loadNotifs'den başla
    let startStr = content.includes('// --- GLOBAL TOAST') ? '// --- GLOBAL TOAST' : 'async function loadNotifs() {';
    
    // Regex'i manuel yapmak yerine string split kullanmak daha güvenli olabilir
    let startIndex = content.indexOf(startStr);
    let endIndex = content.indexOf('async function toggleNotif() {');
    
    if(startIndex !== -1 && endIndex !== -1) {
       const updated = content.substring(0, startIndex) + newFunc + content.substring(endIndex + 'async function toggleNotif() {'.length);
       fs.writeFileSync(f, updated, 'utf8');
       count++;
    }
  }
}
console.log('Updated ' + count + ' files.');
