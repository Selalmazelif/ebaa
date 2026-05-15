const fs = require('fs');

// VELI PANEL
let veliFile = 'c:\\Users\\elifs\\OneDrive\\Desktop\\Yeni klasör\\veli-panel.html';
if (fs.existsSync(veliFile)) {
  let veliContent = fs.readFileSync(veliFile, 'utf8');

  // Sidebar menüye ekle
  if (!veliContent.includes('section-appointments')) {
    veliContent = veliContent.replace(
      '<li><a href="#" onclick="scrollToSection(\'section-tests\')"><i class="fa-solid fa-pen"></i> Yapılan Testler</a></li>',
      '<li><a href="#" onclick="scrollToSection(\'section-tests\')"><i class="fa-solid fa-pen"></i> Yapılan Testler</a></li>\n    <li><a href="#" onclick="scrollToSection(\'section-appointments\')"><i class="fa-solid fa-handshake"></i> Randevularım</a></li>'
    );

    const veliUI = `
        <!-- RANDEVU SİSTEMİ -->
        <div class="data-section" id="section-appointments">
          <h4><i class="fa fa-handshake" style="color:#f39200;margin-right:8px;"></i>Öğretmen Randevu Talebi</h4>
          <div style="background:#f9f9f9; padding:15px; border-radius:10px; margin-bottom:15px; border:1px solid #eee;">
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:10px;">
               <input type="text" id="randevuTeacherTc" placeholder="Öğretmen TC Kimlik No" style="padding:8px; border:1px solid #ccc; border-radius:6px; width:100%; box-sizing:border-box;">
               <input type="date" id="randevuDate" style="padding:8px; border:1px solid #ccc; border-radius:6px; width:100%; box-sizing:border-box;">
               <input type="time" id="randevuTime" style="padding:8px; border:1px solid #ccc; border-radius:6px; width:100%; box-sizing:border-box;">
            </div>
            <button onclick="talepRandevu()" style="background:#4A748F; color:white; border:none; padding:8px 15px; border-radius:6px; cursor:pointer; font-weight:bold;">Randevu Talep Et</button>
          </div>
          <table class="data-table">
            <thead><tr><th>Öğretmen</th><th>Tarih / Saat</th><th>Durum</th></tr></thead>
            <tbody id="veliRandevuList"><tr><td colspan="3" style="text-align:center; color:#aaa; padding:15px;">Yükleniyor...</td></tr></tbody>
          </table>
        </div>
`;

    veliContent = veliContent.replace('<!-- DERS PROGRAMI -->', veliUI + '\n        <!-- DERS PROGRAMI -->');

    const veliJs = `
// ─── RANDEVU SİSTEMİ (VELİ) ──────────────────────────────────
async function loadVeliRandevu() {
  try {
    const r = await fetch('/api/appointments', { headers: { 'Authorization': 'Bearer ' + localStorage.getItem('authToken') } });
    const d = await r.json();
    const tbody = document.getElementById('veliRandevuList');
    if (d.success && d.appointments.length > 0) {
      tbody.innerHTML = d.appointments.map(a => \`
        <tr>
          <td>\${a.teacher_name || a.teacher_tc}</td>
          <td>\${a.appointment_date} \${a.appointment_time}</td>
          <td><span class="pill \${a.status === 'Onaylandı' ? 'pill-göreen' : a.status === 'Reddedildi' ? 'pill-orange' : 'pill-blue'}">\${a.status}</span></td>
        </tr>
      \`).join('');
    } else {
      tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;color:#aaa;padding:15px;">Randevu talebiniz bulunmuyor.</td></tr>';
    }
  } catch(e) {}
}

async function talepRandevu() {
  const teacherTc = document.getElementById('randevuTeacherTc').value;
  const date = document.getElementById('randevuDate').value;
  const time = document.getElementById('randevuTime').value;
  
  if (!teacherTc || !date || !time) return alert("Lütfen tüm alanları doldurun!");
  
  try {
    const r = await fetch('/api/appointments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + localStorage.getItem('authToken') },
      body: JSON.stringify({ teacher_tc: teacherTc, student_tc: childUser?.tc || '', appointment_date: date, appointment_time: time })
    });
    const d = await r.json();
    if (d.success) {
       alert("Randevu talebi gönderildi.");
       loadVeliRandevu();
    } else {
       alert("Hata: " + d.message);
    }
  } catch(e) { alert("Hata: " + e.message); }
}
`;
    veliContent = veliContent.replace('function loadSchedule(child) {', veliJs + '\nfunction loadSchedule(child) {');
    
    // Call loadVeliRandevu inside initVeliPanel
    veliContent = veliContent.replace('loadSchedule(childUser);', 'loadSchedule(childUser);\n    loadVeliRandevu();');

    fs.writeFileSync(veliFile, veliContent, 'utf8');
  }
}

// OGRETMEN PANEL
let ogretmenFile = 'c:\\Users\\elifs\\OneDrive\\Desktop\\Yeni klasör\\ogretmen-panel.html';
if (fs.existsSync(ogretmenFile)) {
  let ogrContent = fs.readFileSync(ogretmenFile, 'utf8');

  if (!ogrContent.includes('id="teacherRandevuList"')) {
    const ogrUI = `
        <!-- RANDEVULAR -->
        <div class="box">
          <div class="box-title"><i class="fa fa-handshake" style="color:#f39200;"></i> Randevu Talepleri</div>
          <div id="teacherRandevuList" style="max-height:250px; overflow-y:auto; font-size:12px;">
             <div style="text-align:center;color:#aaa;padding:10px;">Bekleyen randevu yok.</div>
          </div>
        </div>
`;
    ogrContent = ogrContent.replace('<!-- ÖDEV GÖNDER -->', ogrUI + '\n        <!-- ÖDEV GÖNDER -->');

    const ogrJs = `
async function loadTeacherRandevu() {
  try {
    const r = await ebaFetch('/api/appointments');
    const d = await r.json();
    const list = document.getElementById('teacherRandevuList');
    if (d.success && d.appointments.length > 0) {
      list.innerHTML = d.appointments.map(a => \`
        <div style="border-bottom:1px solid #eee; padding:10px 0;">
          <div style="display:flex; justify-content:space-between; margin-bottom:5px;">
            <strong>\${a.veli_name || 'Veli'} (Öğrenci: \${a.student_name || 'Bilinmiyor'})</strong>
            <span style="color:#aaa;">\${a.appointment_date} \${a.appointment_time}</span>
          </div>
          \${a.status === 'Bekliyor' ? \`
            <div style="display:flex; gap:5px; margin-top:5px;">
               <button onclick="updateRandevu(\${a.id}, 'Onaylandı')" style="background:#2ecc71; color:white; border:none; padding:4px 8px; border-radius:4px; cursor:pointer;">Onayla</button>
               <button onclick="updateRandevu(\${a.id}, 'Reddedildi')" style="background:#e74c3c; color:white; border:none; padding:4px 8px; border-radius:4px; cursor:pointer;">Reddet</button>
            </div>
          \` : \`
            <div style="font-weight:bold; color:\${a.status === 'Onaylandı' ? '#2ecc71' : '#e74c3c'};">\${a.status}</div>
          \`}
        </div>
      \`).join('');
    } else {
      list.innerHTML = '<div style="text-align:center;color:#aaa;padding:10px;">Bekleyen randevu yok.</div>';
    }
  } catch(e) {}
}

async function updateRandevu(id, status) {
  try {
    const r = await ebaFetch('/api/appointments/' + id, {
      method: 'PUT',
      body: JSON.stringify({ status })
    });
    const d = await r.json();
    if (d.success) loadTeacherRandevu();
  } catch(e) {}
}
`;
    // Add JS and renderCal fix
    ogrContent = ogrContent.replace('function editGrade', ogrJs + '\n\n      function editGrade');
    
    if (ogrContent.includes('init();')) {
      ogrContent = ogrContent.replace('init();', 'init();\n      loadTeacherRandevu();\n      renderCal();');
    }

    fs.writeFileSync(ogretmenFile, ogrContent, 'utf8');
  }
}
console.log("Randevu UI eklendi.");
