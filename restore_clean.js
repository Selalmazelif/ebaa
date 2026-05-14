const fs = require('fs');

const derslerContent = `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <title>Dersler - EBA</title>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css">
  <link rel="stylesheet" href="panel.css">
  <script src="auth-utils.js"></script>
  <script>requireAuth();</script>
  <style>
    .banner { margin:20px; background:#284B63; border-radius:15px; padding:30px; color:white; display:flex; justify-content:space-between; align-items:center; }
    .cards { display:grid; grid-template-columns:repeat(auto-fill, minmax(250px, 1fr)); gap:20px; padding:20px; }
    .card { background:white; padding:20px; border-radius:12px; box-shadow:0 4px 10px rgba(0,0,0,0.05); transition:transform 0.3s; cursor:pointer; }
    .card:hover { transform:translateY(-5px); }
    .card img { width:100%; height:140px; object-fit:cover; border-radius:8px; margin-bottom:15px; }
    .card h3 { color:#284B63; margin:0; font-size:18px; }
    body.dark-mode .card { background:#1e2d3d; border:1px solid #2d4060; }
    body.dark-mode .card h3 { color:#a8d4f0; }
  </style>
</head>
<body>
  <div class="sidebar">
    <div class="logo">EBA</div>
    <div class="profile">
      <div class="profile-img-container" onclick="event.stopPropagation(); document.getElementById('picInput').click()" title="Fotoğrafı Değiştir">
        <div style="width:80px;height:80px;background:#fff;border-radius:50%;border:3px solid rgba(255,255,255,0.2);display:flex;align-items:center;justify-content:center;overflow:hidden;margin:0 auto 10px;position:relative;">
          <i class="fa fa-user" style="font-size:40px;color:#ccc;" id="default-avatar-icon"></i>
          <img src="" alt="" id="profile-img-display" style="display:none;width:100%;height:100%;object-fit:cover;z-index:2;position:relative;">
          <div id="sidebar-bg" style="position:absolute; inset:0; z-index:1; opacity:0.3;"></div>
        </div>
        <div class="edit-overlay"><i class="fa fa-camera"></i></div>
      </div>
      <p id="profile-name" style="font-weight:600;"></p>
      <p id="profile-school" style="font-size:12px;opacity:0.7;"></p>
      <input id="picInput" type="file" accept="image/*" style="display:none;">
      <button id="logoutBtn" style="margin-top:14px;padding:6px 14px;background:#fff;color:#4A748F;border-radius:8px;border:none;cursor:pointer;font-weight:700;font-size:12px;">Çıkış</button>
    </div>
    <ul id="sidebar-menu">
      <li><a href="ogrenci-panel.html"><i class="fa-solid fa-house"></i> Ana Sayfa</a></li>
      <li><a href="dersler.html" class="active"><i class="fa-solid fa-book"></i> Dersler</a></li>
      <li><a href="canli-ders.html"><i class="fa-solid fa-video"></i> Canlı Ders</a></li>
      <li><a href="sinavlar.html"><i class="fa-solid fa-pen"></i> Sınavlar</a></li>
    </ul>
  </div>

  <div class="main">
    <div class="banner">
      <div>
        <h2>Dersler</h2>
        <p id="class-info">Sınıfınıza göre dersler</p>
      </div>
    </div>
    <div class="cards" id="dersler-grid"></div>
  </div>

  <script>
    const user = requireAuth();
    if (user) {
      document.getElementById('profile-name').textContent = user.name;
      document.getElementById('profile-school').textContent = user.school;
      document.getElementById('logoutBtn').onclick = logout;

      const derslerGrid = document.getElementById('dersler-grid');
      const classInfo = document.getElementById('class-info');

      const derslerData = {
        '9': [
          { name: 'Türkçe', img: 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=400' },
          { name: 'Matematik', img: 'https://images.unsplash.com/photo-1509228468518-180dd482180c?w=400' },
          { name: 'Fen Bilimleri', img: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=400' },
          { name: 'Tarih', img: 'https://images.unsplash.com/photo-1461360343450-62117e543ea3?w=400' }
        ],
        '10': [
          { name: 'Türkçe', img: 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=400' },
          { name: 'Matematik', img: 'https://images.unsplash.com/photo-1509228468518-180dd482180c?w=400' },
          { name: 'Fizik', img: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=400' },
          { name: 'Kimya', img: 'https://images.unsplash.com/photo-1532187863486-abf9d343f835?w=400' }
        ],
        '11': [
          { name: 'Türkçe', img: 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=400' },
          { name: 'Matematik', img: 'https://images.unsplash.com/photo-1509228468518-180dd482180c?w=400' },
          { name: 'Fizik', img: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=400' },
          { name: 'Biyoloji', img: 'https://images.unsplash.com/photo-1530026405186-ed1f139313f8?w=400' }
        ],
        '12': [
          { name: 'Türkçe', img: 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=400' },
          { name: 'Matematik', img: 'https://images.unsplash.com/photo-1509228468518-180dd482180c?w=400' },
          { name: 'Tarih', img: 'https://images.unsplash.com/photo-1461360343450-62117e543ea3?w=400' },
          { name: 'Felsefe', img: 'https://images.unsplash.com/photo-1455390582262-044cdead277a?w=400' }
        ]
      };

      const userClass = user.level || user.class || '9';
      classInfo.textContent = userClass + ". Sınıf Dersleri";

      const classDersler = derslerData[userClass] || derslerData['9'];
      derslerGrid.innerHTML = classDersler.map(ders => '<div class="card" onclick="location.href=\\\'ders-detay.html?ders=' + encodeURIComponent(ders.name) + '\\\'"><img src="' + ders.img + '" alt="' + ders.name + '"><h3>' + ders.name + '</h3><p style="font-size:12px; color:#666; margin-top:8px;">Konuları görmek için tıklayın <i class="fa fa-arrow-right"></i></p></div>').join('');
    }
  </script>
</body>
</html>`;

const detayContent = `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <title>Ders Detayı - EBA</title>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css">
  <link rel="stylesheet" href="panel.css">
  <script src="auth-utils.js"></script>
  <script>requireAuth();</script>
</head>
<body>
  <div class="sidebar">
    <div class="logo">EBA</div>
    <div class="profile">
      <div class="profile-img-container" onclick="event.stopPropagation(); document.getElementById('picInput').click()" title="Fotoğrafı Değiştir">
        <div style="width:80px;height:80px;background:#fff;border-radius:50%;border:3px solid rgba(255,255,255,0.2);display:flex;align-items:center;justify-content:center;overflow:hidden;margin:0 auto 10px;position:relative;">
          <i class="fa fa-user" style="font-size:40px;color:#ccc;" id="default-avatar-icon"></i>
          <img src="" alt="" id="profile-img-display" style="display:none;width:100%;height:100%;object-fit:cover;z-index:2;position:relative;">
        </div>
        <div class="edit-overlay"><i class="fa fa-camera"></i></div>
      </div>
      <p id="profile-name" style="font-weight:600;"></p>
      <input id="picInput" type="file" accept="image/*" style="display:none;">
      <button id="logoutBtn" style="margin-top:14px;padding:6px 14px;background:#fff;color:#4A748F;border-radius:8px;border:none;cursor:pointer;font-weight:700;font-size:12px;">Çıkış</button>
    </div>
    <ul id="sidebar-menu">
      <li><a href="ogrenci-panel.html"><i class="fa-solid fa-house"></i> Ana Sayfa</a></li>
      <li><a href="dersler.html" class="active"><i class="fa-solid fa-book"></i> Dersler</a></li>
      <li><a href="canli-ders.html"><i class="fa-solid fa-video"></i> Canlı Ders</a></li>
      <li><a href="sinavlar.html"><i class="fa-solid fa-pen"></i> Sınavlar</a></li>
    </ul>
  </div>

  <div class="main">
    <div class="topbar" style="height:60px; background:white; display:flex; align-items:center; padding:0 20px; box-shadow:0 1px 5px rgba(0,0,0,0.1);">
      <h2 id="ders-header-title">Ders Detayı</h2>
    </div>
    <div class="banner" style="margin:20px; background:#284B63; border-radius:15px; padding:30px; color:white; display:flex; justify-content:space-between; align-items:center;">
      <div>
        <h2 id="ders-title">Yükleniyor...</h2>
        <p id="class-info">Sınıfınıza göre ders konuları</p>
      </div>
      <button onclick="window.history.back()" style="background:white; border:none; padding:10px 20px; border-radius:8px; cursor:pointer; font-weight:700; color:#284B63;">Geri Dön</button>
    </div>
    <div class="cards" id="topics-grid" style="padding:20px; display:grid; grid-template-columns:repeat(auto-fill, minmax(300px, 1fr)); gap:20px;"></div>
  </div>

  <script>
    const user = requireAuth();
    if (user) {
      document.getElementById('profile-name').textContent = user.name;
      document.getElementById('logoutBtn').onclick = logout;

      const topicsGrid = document.getElementById('topics-grid');
      const classInfo = document.getElementById('class-info');
      const dersTitle = document.getElementById('ders-title');

      const urlParams = new URLSearchParams(window.location.search);
      const selectedDers = urlParams.get('ders') || 'Türkçe';
      dersTitle.textContent = selectedDers;

      const derslerData = {
        'Türkçe': ['Fiil Çekimleri', 'Cümle Türleri', 'Noktalama İşaretleri', 'Paragraf Anlamı'],
        'Matematik': ['Üslü Sayılar', 'Köklü Sayılar', 'Denklemler', 'Polinomlar'],
        'Fizik': ['Elektrik', 'Kuvvet ve Hareket', 'Optik'],
        'Kimya': ['Atom ve Periyodik Sistem', 'Kimyasal Türler Arası Etkileşimler'],
        'Biyoloji': ['Hücre', 'Canlıların Dünyası', 'Ekosistem'],
        'Tarih': ['İlk Çağ Uygarlıkları', 'Osmanlı Kuruluş Dönemi'],
        'Fen Bilimleri': ['Madde ve Isı', 'Vücudumuzdaki Sistemler']
      };

      const topics = derslerData[selectedDers] || [];
      if (topics.length > 0) {
        topicsGrid.innerHTML = topics.map(topic => '<div class="card" style="background:white; padding:20px; border-radius:12px; box-shadow:0 4px 10px rgba(0,0,0,0.05);"><h3 style="margin:0; color:#284B63;">' + topic + '</h3><p style="font-size:12px; color:#666; margin-top:8px;">Konu detaylarını görmek için tıklayın <i class="fa fa-arrow-right"></i></p></div>').join('');
      } else {
        topicsGrid.innerHTML = '<p style="color:#888; grid-column:1/-1; text-align:center;">Bu ders için henüz konu bulunamadı.</p>';
      }
    }
  </script>
</body>
</html>`;

fs.writeFileSync('dersler.html', derslerContent, 'utf8');
fs.writeFileSync('ders-detay.html', detayContent, 'utf8');
console.log('Restored files with clean UTF-8');
