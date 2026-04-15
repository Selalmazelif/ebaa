const fs = require('fs');

let html = fs.readFileSync('ogrenci-panel.html', 'utf8');

const modalsHTML = `
  <!-- Sınav Yanlışları Modalı -->
  <div id="examDetailModal" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); z-index:10000; align-items:center; justify-content:center;">
    <div style="background:white; width:450px; max-width:90%; border-radius:12px; padding:20px; box-shadow:0 10px 30px rgba(0,0,0,0.2);">
      <h3 style="margin-top:0; color:#284B63; border-bottom:1px solid #eee; padding-bottom:10px;">Sınav Detayı: <span id="examTitleSpan"></span></h3>
      <div style="display:flex; justify-content:space-around; margin-bottom:15px; text-align:center;">
         <div style="color:#2ecc71; font-weight:bold; font-size:18px;"><span id="exCor">0</span><br><span style="font-size:12px; font-weight:normal;">Doğru</span></div>
         <div style="color:#e74c3c; font-weight:bold; font-size:18px;"><span id="exWro">0</span><br><span style="font-size:12px; font-weight:normal;">Yanlış</span></div>
         <div style="color:#f39200; font-weight:bold; font-size:18px;"><span id="exBla">0</span><br><span style="font-size:12px; font-weight:normal;">Boş</span></div>
      </div>
      <div id="wrongQuestionsList" style="max-height:200px; overflow-y:auto; font-size:13px; color:#444;"></div>
      <div style="text-align:right; margin-top:20px;">
        <button onclick="document.getElementById('examDetailModal').style.display='none'" style="padding:8px 16px; background:#4A748F; color:white; border:none; border-radius:6px; cursor:pointer;">Kapat</button>
      </div>
    </div>
  </div>

  <!-- Çalışma Cevap Gönderme Modalı -->
  <div id="assignmentModal" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); z-index:10000; align-items:center; justify-content:center;">
    <div style="background:white; width:450px; max-width:90%; border-radius:12px; padding:20px; box-shadow:0 10px 30px rgba(0,0,0,0.2);">
      <h3 style="margin-top:0; color:#284B63; border-bottom:1px solid #eee; padding-bottom:10px;">Çalışma Cevap Ekranı</h3>
      <p id="asmTitle" style="font-weight:bold; color:#444; margin-bottom:5px;"></p>
      <p id="asmDesc" style="font-size:12px; color:#888; margin-bottom:15px;"></p>
      <textarea id="asmAnswer" placeholder="Cevabınızı buraya yazın..." style="width:100%; height:120px; box-sizing:border-box; border:1px solid #ccc; border-radius:6px; padding:10px; font-family:inherit; resize:none;"></textarea>
      <div style="text-align:right; margin-top:15px;">
        <button onclick="document.getElementById('assignmentModal').style.display='none'" style="padding:8px 16px; background:#eee; color:#444; border:none; border-radius:6px; cursor:pointer; margin-right:8px;">İptal</button>
        <button onclick="submitAssignment()" style="padding:8px 16px; background:#2ecc71; color:white; border:none; border-radius:6px; cursor:pointer;">Gönder</button>
      </div>
    </div>
  </div>
`;

if (!html.includes('id="examDetailModal"')) {
   html = html.replace('</body>', modalsHTML + '</body>');
}

const gradesHTML = `
    <!-- ALDIĞIM NOTLAR -->
    <div class="panel-card" style="width:285px; padding:20px; border-radius:12px; box-shadow:0 2px 10px rgba(0,0,0,0.05); margin-top:20px;">
      <h4 style="margin:0 0 12px; color:#284B63; font-size:14px; border-bottom:1px solid #f0f0f0; padding-bottom:8px;">
        <i class="fa fa-star" style="color:#f39200;"></i> Aldığım Notlar
      </h4>
      <div id="studentGradesList">
         <div style="text-align:center;color:#ccc;font-size:12px;padding:10px;">Henüz not bulunamadı</div>
      </div>
    </div>
`;

if (!html.includes('id="studentGradesList"')) {
  html = html.replace(/<div id="calLegend"(?:[\s\S]*?)<\/div>(?:\s*)<\/div>/i, `$& \n\n ${gradesHTML}`);
}

const studentJS = `
<script>
let currentAssignmentId = null;

function openTaskModal(id) {
  const t = assignmentsCache.find(a => a.id == id);
  if(!t) return;
  currentAssignmentId = id;
  document.getElementById('asmTitle').textContent = t.title;
  document.getElementById('asmDesc').textContent = t.description || (t.file_name ? 'Ek dosya: ' + t.file_name : 'Açıklama yok.');
  document.getElementById('asmAnswer').value = '';
  document.getElementById('assignmentModal').style.display='flex';
}

async function submitAssignment() {
  const ans = document.getElementById('asmAnswer').value.trim();
  if(!ans) return alert('Lütfen cevabınızı yazın!');
  
  try {
    const res = await fetch('/api/assignment-submit', {
      method: 'POST', headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        assignment_id: currentAssignmentId,
        student_tc: currentUser.tc,
        student_name: currentUser.name,
        answer_text: ans
      })
    });
    const d = await res.json();
    if(d.success) {
       document.getElementById('assignmentModal').style.display='none';
       assignmentsCache = assignmentsCache.filter(a => a.id != currentAssignmentId);
       renderPendingTasks();
       
       // İstatistik artır (Tamamladığın İçerik/Çalışma olarak sayılabilir)
       try {
           await fetch('/api/student-stats', {
             method: 'POST', headers: {'Content-Type': 'application/json'},
             body: JSON.stringify({student_tc: currentUser.tc, type: 'content'})
           });
           loadStats(currentUser);
       } catch(e){}
       alert('Cevabınız öğretmene iletildi.');
    } else {
       alert(d.message);
    }
  } catch(e) {}
}

function renderPendingTasks() {
  const el = document.getElementById('pending-tasks-list');
  if(!assignmentsCache.length) {
    el.innerHTML = '<div style="text-align:center;padding:20px;color:#ccc;"><i class="fa fa-check-circle" style="font-size:36px;display:block;margin-bottom:8px;"></i><span style="font-size:12px;">Bekleyen çalışma yok</span></div>';
    return;
  }
  el.innerHTML = assignmentsCache.slice(0,5).map(a => \`
    <div class="pending-item" onclick="openTaskModal(\${a.id})">
      <div style="font-size:12px;color:#5C8EAD;font-weight:700;">\${a.subject||'Genel'} · \${a.assignment_type || 'Metin'}</div>
      <strong>\${a.title}</strong>
      \${a.file_name ? '<div style="font-size:11px;color:#4A748F;margin-top:2px;"><i class="fa fa-paperclip"></i> '+a.file_name+'</div>' : ''}
      \${a.due_date ? '<div style="font-size:10px;color:#e74c3c;margin-top:2px;"><i class="fa fa-clock"></i> Son: '+a.due_date+'</div>' : ''}
    </div>
  \`).join('');
}

async function fetchGrades() {
  try {
     const r = await fetch('/api/student-grades?student_tc='+currentUser.tc);
     const d = await r.json();
     if(d.success && d.grades && d.grades.length) {
       document.getElementById('studentGradesList').innerHTML = d.grades.map(g => \`
         <div style="padding:8px 0; border-bottom:1px solid #f0f0f0; font-size:12px; display:flex; justify-content:space-between; align-items:center;">
           <div>
             <strong style="color:#284B63;">\${g.title}</strong><br>
             <span style="font-size:10px; color:#aaa;">\${g.teacher} · \${g.type}</span>
           </div>
           <div style="background:#EBF5FB; padding:4px 8px; border-radius:6px; font-weight:bold; color:#4A748F;">\${g.score}</div>
         </div>
       \`).join('');
     } else {
       document.getElementById('studentGradesList').innerHTML = '<div style="text-align:center;color:#ccc;font-size:12px;padding:10px;">Henüz not bulunamadı</div>';
     }
  } catch(e) {}
}

function showExamDetails(title, cc, wc, bc, wqStr) {
  document.getElementById('examTitleSpan').textContent = title;
  document.getElementById('exCor').textContent = cc;
  document.getElementById('exWro').textContent = wc;
  document.getElementById('exBla').textContent = bc;
  
  const cont = document.getElementById('wrongQuestionsList');
  if(!wqStr || wqStr === 'null' || wqStr === '' || wqStr === 'undefined') {
     cont.innerHTML = '<div style="color:#aaa; text-align:center; padding:10px; font-style:italic;">Yanlış sorunuz bulunmuyor veya detay kaydedilmemiş.</div>';
  } else {
     let wq = [];
     try { wq = JSON.parse(wqStr); } catch(e){}
     if(wq.length) {
        cont.innerHTML = wq.map((q,i) => \`
          <div style="margin-top:10px; padding:10px; border:1px solid #ffcccc; background:#fff5f5; border-radius:6px;">
             <strong>Soru:</strong> \${q.q}<br>
             <span style="color:#e74c3c">Sizin Cevabınız: \${q.ans || 'Boş'}</span><br>
             <span style="color:#2ecc71">Doğru Cevap: \${q.corr}</span>
          </div>
        \`).join('');
     } else {
        cont.innerHTML = '<div style="color:#aaa; text-align:center; padding:10px; font-style:italic;">Yanlış sorunuz bulunmuyor.</div>';
     }
  }
  document.getElementById('examDetailModal').style.display='flex';
}

const origInit = initStudentPanel;
initStudentPanel = async function() {
   await origInit();
   fetchGrades();
   renderPendingTasks();
};

const _origLoadNotif = loadNotifications;
loadNotifications = async function(user) {
   await _origLoadNotif(user);
   // Bildirim listesindeki sınav tıklamaları için onClick eventini test-results API ile ekleyeceğiz
}
</script>
`;

if (!html.includes('submitAssignment()')) {
  html = html.replace(/const el = document.getElementById\('pending-tasks-list'\);(?:[\s\S]*?)el.innerHTML = assignmentsCache(?:[\s\S]*?)\.join\(''\);/, 'renderPendingTasks();');
  html = html.replace('</body>', studentJS + '</body>');
}

fs.writeFileSync('ogrenci-panel.html', html, 'utf8');
console.log('ogrenci-panel.html updated successfully.');
