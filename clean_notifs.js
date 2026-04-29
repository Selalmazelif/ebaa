const fs = require('fs');
const path = require('path');

const fixNotifsContent = `// --- GLOBAL TOAST BİLDİRİM FONKSİYONU ---
let userPrefsCache = { sound: true };
let prefsLoaded = false;
let knownNotifs = new Set();
let isFirstLoad = true;

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
  
  if (userPrefsCache.sound) {
    try { new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3').play(); } catch(e){}
  }
  
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(20px)';
  }, 6000);
}

function showExamDetails(t,c,w,b,sJson) {
  document.getElementById('examTitleSpan').textContent=t;
  document.getElementById('exCor').textContent=c;
  document.getElementById('exWro').textContent=w;
  document.getElementById('exBla').textContent=b;
  const el = document.getElementById('wrongQuestionsList');
  if(!sJson || sJson==='[]' || sJson==='null') {
    if(el) el.innerHTML='<div style="text-align:center;color:#aaa;padding:10px;">Yanlış soru detayı yok.</div>';
  } else {
    try {
      const arr = JSON.parse(sJson);
      if(el) el.innerHTML = arr.map(q => '<div style="border:1px solid #ffcccc;background:#fff5f5;padding:10px;border-radius:6px;margin-top:10px;"><b>Soru:</b> '+q.q+'<br><span style="color:#e74c3c">Cevabınız: '+(q.ans||'Boş')+'</span><br><span style="color:#2ecc71">Doğru: '+q.corr+'</span></div>').join('');
    } catch(e){ if(el) el.innerHTML='Hata: '+e.message; }
  }
  const modal = document.getElementById('examDetailModal');
  if(modal) modal.style.display='flex';
}

async function loadNotifs() {
  const cu = typeof currentUser !== 'undefined' ? currentUser : (typeof user !== 'undefined' ? user : JSON.parse(localStorage.getItem('currentUser') || 'null'));
  if (!cu || !cu.tc) return;
  
  // Sesi kapatma/açma ayarını al
  if (!prefsLoaded) {
     try {
       const pr = await (typeof ebaFetch !== 'undefined' ? ebaFetch : fetch)('/api/prefs?tc='+cu.tc, {
         headers: { 'Authorization': 'Bearer ' + localStorage.getItem('authToken') }
       });
       const pd = await pr.json();
       if(pd.success && pd.prefs) {
          userPrefsCache.sound = !!pd.prefs.sound;
       }
     } catch(e) {}
     prefsLoaded = true;
  }
  
  let notifs=[];
  try {
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

setInterval(loadNotifs, 5000);
setTimeout(loadNotifs, 1000);

async function toggleNotif() {
  const p=document.getElementById('notifPanel');
  if(!p) return;
  if(p.style.display==='block'){ p.style.display='none'; return; }
  p.style.display='block';
}

document.addEventListener('click', e => {
  const p = document.getElementById('notifPanel');
  if (p && !e.target.closest('#notifPanel') && !e.target.closest('[onclick*="toggleNotif"]')) {
    p.style.display = 'none';
  }
});
`;

fs.writeFileSync('fix-notifications.js', fixNotifsContent, 'utf8');

const files = fs.readdirSync('.').filter(f => f.endsWith('.html'));

for (const f of files) {
  let content = fs.readFileSync(f, 'utf8');
  let changed = false;

  // notifCount -> notifBadge in ogrenci-panel
  if (content.includes('id="notifCount"')) {
    content = content.replace(/id="notifCount"/g, 'id="notifBadge"');
    changed = true;
  }
  // toggleNotifPanel -> toggleNotif
  if (content.includes('toggleNotifPanel()')) {
    content = content.replace(/toggleNotifPanel\(\)/g, 'toggleNotif()');
    changed = true;
  }
  // Remove loadNotifications
  if (content.includes('async function loadNotifications(')) {
    content = content.replace(/async function loadNotifications[\s\S]*?\}\n\s*function renderNotifications[\s\S]*?\}\n\s*async function markAllRead[\s\S]*?\n\s*\}/g, '');
    changed = true;
  }

  // Remove the inline fix-notifications blocks if they exist
  // We can just use a heavy regex to strip out everything from "// --- GLOBAL TOAST" to the end of document.addEventListener('click', ...)
  const inlineRegex = /\/\/ --- GLOBAL TOAST BİLDİRİM FONKSİYONU ---[\s\S]*?document\.addEventListener\('click'[\s\S]*?\}\);/g;
  if (inlineRegex.test(content)) {
    content = content.replace(inlineRegex, '');
    changed = true;
  }

  // Same for the older inline block
  const oldRegex = /async function loadNotifs\(\) \{[\s\S]*?document\.addEventListener\('click'[\s\S]*?\}\);/g;
  if (oldRegex.test(content)) {
    content = content.replace(oldRegex, '');
    changed = true;
  }

  // Inject script tag before </body> if not present
  if (!content.includes('src="fix-notifications.js"')) {
    content = content.replace(/<\/body>/i, '  <script src="fix-notifications.js"></script>\n</body>');
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(f, content, 'utf8');
    console.log('Cleaned and linked fix-notifications.js in: ' + f);
  }
}
