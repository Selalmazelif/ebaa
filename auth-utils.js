function getCurrentUser() {
  try {
    // Güvenlik: sessionStorage kullan (tab-specific, URL kopyalama saldırısı engelle)
    const currentUser = JSON.parse(sessionStorage.getItem('currentUser'));
    const tabId = sessionStorage.getItem('tabId');
    
    // TabId doğrulaması - farklı tab'de tabId farklıdır
    if (currentUser && tabId && currentUser.tabId === tabId) {
      return currentUser;
    }
    
    // Eski localStorage'dan geçiş (backward compatibility)
    const legacyUser = JSON.parse(localStorage.getItem('currentUser'));
    if (legacyUser && legacyUser.id && legacyUser.tc) {
      // Eski sessionStorage'a taşı
      const newTabId = 'tab_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      legacyUser.tabId = newTabId;
      sessionStorage.setItem('tabId', newTabId);
      sessionStorage.setItem('currentUser', JSON.stringify(legacyUser));
      localStorage.removeItem('currentUser'); // Eski veriyi sil
      return legacyUser;
    }
    
    return null;
  } catch {
    sessionStorage.removeItem('currentUser');
    sessionStorage.removeItem('tabId');
    return null;
  }
}

function requireAuth() {
  const currentUser = getCurrentUser();
  if (!currentUser || !isSessionValid()) {
    localStorage.removeItem('currentUser');
    window.location.href = 'index.html';
    return null;
  }
  return currentUser;
}

function logout() {
  // Güvenlik: sessionStorage + localStorage temizle (tab-specific)
  sessionStorage.removeItem('currentUser');
  sessionStorage.removeItem('tabId');
  localStorage.removeItem('currentUser'); // Eski data varsa sil
  localStorage.setItem('logoutTimestamp', Date.now().toString());
  window.location.href = 'goodbye.html';
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
