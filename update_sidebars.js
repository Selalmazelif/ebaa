const fs = require('fs');

const sidebarHtml = `  <div class="sidebar">
    <div class="logo">EBA</div>
    <div class="profile">
      <div class="profile-img-container" onclick="document.getElementById('profilePicInput') ? document.getElementById('profilePicInput').click() : null" title="Fotoğrafı Değiştir">
        <div style="width:70px;height:70px;background:#fff;border-radius:50%;border:3px solid rgba(255,255,255,0.2);display:flex;align-items:center;justify-content:center;overflow:hidden;margin:0 auto 8px;position:relative;">
          <i class="fa fa-user" style="font-size:35px;color:#ccc;" id="default-avatar-icon"></i>
          <img src="" alt="" id="profile-img-display" style="display:none;width:100%;height:100%;object-fit:cover;z-index:2;position:relative;">
          
          <!-- Avatar Overlays -->
          <img id="sidebar-hat" style="position:absolute; top:5px; left:50%; transform:translateX(-50%); width:30px; z-index:3; display:none;">
          <img id="sidebar-glasses" style="position:absolute; top:25px; left:50%; transform:translateX(-50%); width:25px; z-index:4; display:none;">
          <img id="sidebar-pet" style="position:absolute; bottom:5px; right:5px; width:20px; z-index:5; display:none;">
          <div id="sidebar-bg" style="position:absolute; inset:0; z-index:1; opacity:0.3;"></div>
        </div>
        <div class="edit-overlay"><i class="fa fa-camera"></i></div>
        <div class="status-indicator" title="Çevrimiçi"></div>
      </div>
      <p id="profile-name" style="font-weight:600;font-size:16px;margin-bottom:2px;"></p>
      <p id="profile-role" style="font-size:12px;opacity:0.8;margin-bottom:4px;">Rol: Öğrenci</p>
      <p id="profile-school" style="font-size:12px;opacity:0.7;">–</p>
      <input id="profilePicInput" type="file" accept="image/*" style="display:none;">

      <div style="margin-top:10px; display:flex; flex-direction:column; gap:5px; color:white; align-items:center; width:100%; padding:0 20px; box-sizing:border-box;">
        <div style="background:rgba(255,147,0,0.2); padding:5px 10px; border-radius:10px; font-size:12px; width:100%; display:flex; justify-content:center; gap:8px;">
          <i class="fa fa-gem" style="color:#f39200;"></i> <span id="user-points">0</span> Puan
        </div>
        <div style="background:rgba(0,201,255,0.2); padding:5px 10px; border-radius:10px; font-size:12px; width:100%; display:flex; justify-content:center; gap:8px; cursor:help;" title="Nasıl kazanılır?&#10;• Günlük giriş: 10 Coin&#10;• Ödev tamamlama: 15 Coin&#10;• Sınav çözme: 20 Coin&#10;• Forum katılımı: 5 Coin">
          <i class="fa fa-coins" style="color:#00C9FF;"></i> <span id="user-coins">0</span> EBA Coin
        </div>
        <div style="background:rgba(146,254,157,0.2); padding:5px 10px; border-radius:10px; font-size:12px; width:100%; display:flex; justify-content:center; gap:8px;">
          <i class="fa fa-fire" style="color:#92FE9D;"></i> <span id="user-streak">0</span> Günlük Seri
        </div>
      </div>

      <div id="cert-btn-container" style="text-align:center; margin-top:10px; display:none; width:100%; padding:0 20px; box-sizing:border-box;">
        <button onclick="downloadCertificate()" style="background:linear-gradient(135deg, #f39200, #d35400); color:white; border:none; padding:8px 0; width:100%; border-radius:8px; font-size:11px; font-weight:700; cursor:pointer; box-shadow:0 4px 10px rgba(243,146,0,0.3);"><i class="fa-solid fa-award"></i> Başarı Belgesi İndir</button>
      </div>

      <div id="user-badges-container" style="margin-top:10px; display:flex; gap:6px; justify-content:center; flex-wrap:wrap;">
        <!-- Rozetler buraya gelecek -->
      </div>
      
      <div style="width:100%; padding:0 20px; box-sizing:border-box;">
        <button id="logoutBtn" style="width:100%; margin-top:15px;padding:6px 12px;background:#fff;color:#284B63;border-radius:8px;border:none;cursor:pointer;font-weight:700;font-size:12px;">Çıkış</button>
      </div>
    </div>
    
    <ul id="sidebar-menu">
      <li><a href="ogrenci-panel.html" class="active"><i class="fa-solid fa-house"></i> Ana Sayfa</a></li>
      <li><a href="dersler.html"><i class="fa-solid fa-book"></i> Dersler</a></li>
      <li><a href="canli-ders.html"><i class="fa-solid fa-video"></i> Canlı Ders</a></li>
      <li><a href="kitaplar.html"><i class="fa-solid fa-file"></i> Kitaplar</a></li>
      <li><a href="sinavlar.html"><i class="fa-solid fa-pen"></i> Sınavlar</a></li>
      <li><a href="kütüphane.html"><i class="fa-solid fa-building-columns"></i> Kütüphane</a></li>
      <li><a href="ogrenci-panel.html?modal=shop"><i class="fa-solid fa-store"></i> EBA Market</a></li>
      <li><a href="ogrenci-panel.html?modal=avatar"><i class="fa-solid fa-user-ninja"></i> Avatarım</a></li>
      <li><a href="ayarlar.html"><i class="fa-solid fa-gear"></i> Ayarlar</a></li>
    </ul>
  </div>`;

const files = [
  'ogrenci-panel.html', 'dersler.html', 'canli-ders.html', 'kitaplar.html', 
  'sinavlar.html', 'kütüphane.html', 'ayarlar.html'
];

for (const f of files) {
  if (!fs.existsSync(f)) continue;
  let txt = fs.readFileSync(f, 'utf8');

  // Regex to match the entire sidebar div. We find the matching pair of </div> manually if regex is hard,
  // but since it's exactly the block before <div class="main">, we can do:
  const match = txt.match(/<div class="sidebar">([\s\S]*?)<div class="main">/);
  if (match) {
    // Replace the entire sidebar block up to <div class="main">
    const newTxt = txt.replace(/<div class="sidebar">([\s\S]*?)<div class="main">/, sidebarHtml + '\n\n  <div class="main">');
    fs.writeFileSync(f, newTxt, 'utf8');
    console.log("Updated " + f);
  }
}
