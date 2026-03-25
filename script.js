const searchBtn = document.querySelector('.search button');
const searchInput = document.querySelector('.search input');

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
    'türkçe': 'dersler.html'
  };

  for (const [key, url] of Object.entries(pages)) {
    if (query.includes(key)) {
      window.location.href = url;
      return;
    }
  }

  alert("Sonuç bulunamadı: " + query);
}

searchBtn.addEventListener('click', () => {
    const query = searchInput.value.trim();
    if(query) {
        handleSearch(query);
    } else {
        alert('Lütfen bir arama terimi girin.');
    }
});

searchInput.addEventListener('keypress', (e) => {
    if(e.key === 'Enter') searchBtn.click();
});