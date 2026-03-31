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
    
    if (currentUser && token && currentUser.token === token) {
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tc: user.tc })
      });
    } catch(e) {}
  }
  localStorage.removeItem('currentUser');
  localStorage.removeItem('authToken');
  localStorage.removeItem('eba_device_theme'); // Opsiyonel: Cihaz temasını sıfırlamak isterseniz
  window.location.href = 'index.html';
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

// --- NOTIFICATION FUNCTIONALITY ---
function getNotifications(tc) {
  const allNotifications = JSON.parse(localStorage.getItem('notifications') || '{}');
  return allNotifications[tc] || [];
}

function addNotification(tc, text) {
  const allNotifications = JSON.parse(localStorage.getItem('notifications') || '{}');
  if (!allNotifications[tc]) allNotifications[tc] = [];
  allNotifications[tc].unshift({
    text: text,
    date: new Date().toISOString(),
    read: false
  });
  localStorage.setItem('notifications', JSON.stringify(allNotifications));
}

function initNotifications() {
  const bellIcon = document.querySelector('.fa-bell');
  if (!bellIcon) return;

  const user = getCurrentUser();
  if (!user) return;

  let container = bellIcon.parentElement;
  if (!container.classList.contains('notification-container')) {
    const wrapper = document.createElement('div');
    wrapper.className = 'notification-container';
    bellIcon.parentNode.insertBefore(wrapper, bellIcon);
    wrapper.appendChild(bellIcon);
    container = wrapper;
  }

  let badge = container.querySelector('.notification-badge');
  if (!badge) {
    badge = document.createElement('span');
    badge.className = 'notification-badge';
    container.appendChild(badge);
  }

  let dropdown = container.querySelector('.notification-dropdown');
  if (!dropdown) {
    dropdown = document.createElement('div');
    dropdown.className = 'notification-dropdown';
    container.appendChild(dropdown);
  }

  const notifs = getNotifications(user.tc);
  const unreadCount = notifs.filter(n => !n.read).length;

  if (unreadCount > 0) {
    badge.style.display = 'block';
    badge.textContent = unreadCount > 9 ? '9+' : unreadCount;
  } else {
    badge.style.display = 'none';
  }

  if (notifs.length === 0) {
    dropdown.innerHTML = '<div class="notification-empty">Bildiriminiz yok</div>';
  } else {
    dropdown.innerHTML = notifs.map(n => `
      <div class="notification-item" style="${n.read ? 'opacity: 0.7;' : 'font-weight: bold;'}">
        ${n.text} <br>
        <small style="color:#888; font-size:10px;">${new Date(n.date).toLocaleDateString('tr-TR')}</small>
      </div>
    `).join('');
  }

  bellIcon.addEventListener('click', (e) => {
    e.stopPropagation();
    const isVisible = dropdown.style.display === 'block';
    dropdown.style.display = isVisible ? 'none' : 'block';
    
    if (!isVisible && unreadCount > 0) {
      const allNotifications = JSON.parse(localStorage.getItem('notifications') || '{}');
      if (allNotifications[user.tc]) {
        allNotifications[user.tc].forEach(n => n.read = true);
        localStorage.setItem('notifications', JSON.stringify(allNotifications));
      }
      badge.style.display = 'none';
      const items = dropdown.querySelectorAll('.notification-item');
      items.forEach(item => { item.style.fontWeight = 'normal'; item.style.opacity = '0.7'; });
    }
  });

  document.addEventListener('click', (e) => {
    if (!container.contains(e.target)) {
      dropdown.style.display = 'none';
    }
  });
}

// Init when DOM loads
document.addEventListener('DOMContentLoaded', () => {
  initSearch();
  initNotifications();
  
  if (getCurrentUser()) {
    startHeartbeat();
  }
});
