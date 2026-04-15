// ─── GLOBAL TEMA UYGULA (tüm sayfalarda çalışır) ─────────────────
(function applyThemeImmediately() {
  const user = (() => { try { return JSON.parse(localStorage.getItem('currentUser')); } catch(e) { return null; } })();
  const tc = user?.tc;
  
  // Önce kullanıcı tercihini, yoksa cihaz genelindeki tercihi kontrol et
  const userPrefs = tc ? JSON.parse(localStorage.getItem('eba_prefs_' + tc) || '{}') : {};
  const deviceTheme = localStorage.getItem('eba_device_theme');
  
  const theme = userPrefs.theme || deviceTheme;

  if (theme === 'dark') {
    document.documentElement.style.backgroundColor = '#0f1923';
    document.addEventListener('DOMContentLoaded', () => {
      document.body.classList.add('dark-mode');
    });
  }
})();

function getCurrentUser() {
  try {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    const token = localStorage.getItem('authToken');
    
    // JWT formatındaysa veya eski token ise currentUser ile eşleşmeli
    if (currentUser && token && (currentUser.token === token || !currentUser.token)) {
      currentUser.token = token; // Senkronize et
      return currentUser;
    }
    
    return null;
  } catch {
    localStorage.removeItem('currentUser');
    localStorage.removeItem('authToken');
    return null;
  }
}

function requireAuth() {
  const currentUser = getCurrentUser();
  if (!currentUser || !isSessionValid()) {
    localStorage.removeItem('currentUser');
    localStorage.removeItem('authToken');
    window.location.href = 'index.html';
    return null;
  }
  return currentUser;
}

async function logout() {
  const user = getCurrentUser();
  if (user) {
    try {
      await fetch('/api/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({ tc: user.tc })
      });
    } catch(e) {}
  }
  localStorage.removeItem('currentUser');
  localStorage.removeItem('authToken');
  localStorage.removeItem('eba_device_theme');
  window.location.href = 'index.html';
}

/**
 * Güvenli Fetch Yardımcısı: JWT token'ı otomatik ekler ve 401/403 hatalarını yönetir.
 */
async function ebaFetch(url, options = {}) {
  const token = localStorage.getItem('authToken');
  const defaultHeaders = {
    'Content-Type': 'application/json'
  };
  if (token) {
    defaultHeaders['Authorization'] = `Bearer ${token}`;
  }

  options.headers = {
    ...defaultHeaders,
    ...(options.headers || {})
  };

  try {
    const response = await fetch(url, options);
    
    if (response.status === 401) {
      alert("Oturum süreniz doldu, lütfen tekrar giriş yapın.");
      logout();
      return null;
    }
    
    if (response.status === 403) {
      const data = await response.json().catch(() => ({}));
      alert("Bu işlem için yetkiniz yok! " + (data.message || ""));
      return response;
    }
    
    return response;
  } catch (error) {
    console.error("ebaFetch Hatası:", error);
    throw error;
  }
}

function startHeartbeat() {
  const user = getCurrentUser();
  if (!user) return;

  const sendPing = async () => {
    try {
      await fetch('/api/heartbeat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tc: user.tc })
      });
    } catch(e) {}
  };

  // Hemen gönder ve sonra her 60 sn'de bir tekrarla
  sendPing();
  setInterval(sendPing, 60000);
}

// Pencere kapanırken çıkış yap (best effort)
window.addEventListener('beforeunload', () => {
  const user = getCurrentUser();
  if (user) {
    const data = JSON.stringify({ tc: user.tc });
    navigator.sendBeacon('/api/logout', data);
  }
});

// LocalStorage tabanlı eski fonksiyonlar temizlendi.
// updateOnlineStatus(true/false) artık kullanılmıyor, yerine heartbeat ve logout geldi.

function deleteCurrentUser() {
  const currentUser = getCurrentUser();
  if (!currentUser) return;
  
  let users = JSON.parse(localStorage.getItem('users') || '[]');
  users = users.filter(u => u.tc !== currentUser.tc);
  localStorage.setItem('users', JSON.stringify(users));
  
  let allNotifications = JSON.parse(localStorage.getItem('notifications') || '{}');
  delete allNotifications[currentUser.tc];
  localStorage.setItem('notifications', JSON.stringify(allNotifications));

  logout();
}

function isSessionValid() {
  const currentUser = getCurrentUser();
  if (!currentUser) return false;
  
  // XSS koruması: currentUser'ın type'ı kontrol et
  if (typeof currentUser !== 'object' || !currentUser.id || !currentUser.tc) {
    localStorage.removeItem('currentUser');
    return false;
  }
  
  return true;
}

function redirectByRole(role) {
  if (role === 'ogrenci') return 'ogrenci-panel.html';
  if (role === 'ogretmen') return 'ogretmen-panel.html';
  if (role === 'veli') return 'veli-panel.html';
  return 'ogrenci-panel.html';
}

// --- SEARCH FUNCTIONALITY ---
function handleSearch(query) {
  if (!query) return;
  query = query.toLowerCase().trim();

  const pages = {
    'ders': 'dersler.html',
    'sınav': 'sinavlar.html',
    'sinav': 'sinavlar.html',
    'canlı': 'canli-ders.html',
    'canli': 'canli-ders.html',
    'mesaj': 'chat.html',
    'chat': 'chat.html',
    'kitap': 'kitaplar.html',
    'ana': 'ogrenci-panel.html',
    'profil': 'ogrenci-panel.html',
    'matematik': 'dersler.html',
    'türkçe': 'dersler.html',
    'sürdürülebilir': 'surdurulebilir-dunya.html',
    'dünya': 'surdurulebilir-dunya.html',
    'dijital': 'dijital-teknolojiler.html',
    'teknoloji': 'dijital-teknolojiler.html',
    'dil': 'dil-ogrenimi.html',
    'öğrenim': 'dil-ogrenimi.html',
    'haber': 'haberimiz-olsun.html'
  };

  for (const [key, url] of Object.entries(pages)) {
    if (query.includes(key)) {
      window.location.href = url;
      return;
    }
  }

  alert("Sonuç bulunamadı: " + query);
}

function initSearch() {
  const searchInput = document.querySelector('.search input');
  const searchIcon = document.querySelector('.search i');
  
  if (searchInput) {
    searchInput.addEventListener('keypress', function(e) {
      if (e.key === 'Enter') {
        handleSearch(e.target.value);
      }
    });
  }
  
  if (searchIcon && searchInput) {
    searchIcon.addEventListener('click', function() {
      handleSearch(searchInput.value);
    });
  }
}

// --- NOTIFICATION FUNCTIONALITY (DEVRE DIŞI - MSSQL KULLANILIYOR) ---
function getNotifications(tc) { return []; }
function addNotification(tc, text) { }
function initNotifications() {
  // Bu fonksiyon artık MSSQL tabanlı toggleNotif ve loadNotifs (fix-notifications.js) tarafından karşılanıyor.
}

// ─── GLOBAL TERCİHLERİ UYGULA ────────────────────────────────────
async function applyGlobalPrefs() {
  const user = getCurrentUser();
  if(!user) return;
  try {
    const r = await fetch('/api/prefs?tc=' + user.tc);
    const d = await r.json();
    if(d.success && d.prefs) {
      const p = d.prefs;
      // Tema
      if(p.theme === 'dark') document.body.classList.add('dark-mode');
      else document.body.classList.remove('dark-mode');
      
      // Bildirim çanı görünürlüğü
      const badge = document.getElementById('notifBadge');
      const count = document.getElementById('notifCount');
      if(p.notifications === false || p.notifications === 0) {
        if(badge) badge.style.opacity = '0';
        if(count) count.style.opacity = '0';
      }
      
      // LocalStorage senkronize et (çevrimdışı/hızlı yükleme için)
      localStorage.setItem('eba_prefs_' + user.tc, JSON.stringify(p));
    }
  } catch(e) {}
}

// Init when DOM loads
document.addEventListener('DOMContentLoaded', () => {
  initSearch();
  // initNotifications(); // Devre dışı
  
  const user = getCurrentUser();
  if (user) {
    startHeartbeat();
    applyGlobalPrefs();
  }
});
