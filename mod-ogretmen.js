const fs = require('fs');

let html = fs.readFileSync('ogretmen-panel.html', 'utf8');

const gradedHTML = `
      <!-- GELEN CEVAPLAR VE NOT GİRİŞİ -->
      <div class="box">
        <div class="box-title" style="color:#284B63;"><i class="fa fa-inbox" style="color:#4A748F;"></i> Cevaplanan Ödevler</div>
        <div id="submissionsList" style="max-height:300px; overflow-y:auto; font-size:12px;">
           <div style="text-align:center;color:#aaa;padding:10px;">Yükleniyor...</div>
        </div>
      </div>
`;

if (!html.includes('id="submissionsList"')) {
   html = html.replace('<!-- GÖNDERİLEN ÖDEVLER -->', gradedHTML + '\n      <!-- GÖNDERİLEN ÖDEVLER -->');
}

const scriptJS = `
<script>
async function loadSubmissions() {
   try {
      const r = await fetch('/api/assignment-submissions?teacher_tc=' + cu.tc);
      const d = await r.json();
      const el = document.getElementById('submissionsList');
      if (d.success && d.submissions.length) {
         el.innerHTML = d.submissions.map(s => \`
           <div style="border-bottom:1px solid #eee; padding:10px 0;">
             <div style="display:flex; justify-content:space-between;">
                <strong>\${s.student_name} (\${s.student_tc})</strong>
                <span style="font-size:10px; color:#aaa;">\${new Date(s.createdAt).toLocaleDateString('tr-TR')}</span>
             </div>
             <div style="font-size:11px; color:#5c8ead; margin-top:3px;">Ödev: \${s.title}</div>
             <div style="background:#f9f9f9; padding:8px; border-radius:6px; margin:5px 0; color:#444; word-break:break-word;">
               \${s.answer_text}
             </div>
             <div style="display:flex; gap:8px; align-items:center;">
               \${s.isGraded ? 
                 \`<span style="color:#2ecc71; font-weight:bold;">Not: \${s.grade}</span>\` :
                 \`
                   <input type="number" id="gradeInp_\${s.id}" placeholder="Not Gir" style="border:1px solid #ccc; border-radius:4px; padding:4px;" max="100" min="0">
                   <button onclick="submitGrade(\${s.id})" style="background:#284B63; color:white; border:none; border-radius:4px; padding:4px 8px; cursor:pointer;">Kaydet</button>
                 \`
               }
             </div>
           </div>
         \`).join('');
      } else {
         el.innerHTML = '<div style="text-align:center;color:#aaa;padding:10px;">Bekleyen cevap yok.</div>';
      }
   } catch(e) {}
}

async function submitGrade(sub_id) {
   const gv = document.getElementById('gradeInp_'+sub_id).value;
   if(!gv) return alert('Lütfen not giriniz!');
   try {
     const r = await fetch('/api/assignment-grade', {
       method: 'PUT', headers: {'Content-Type': 'application/json'},
       body: JSON.stringify({sub_id, grade: gv, teacher_tc: cu.tc})
     });
     const d = await r.json();
     if(d.success) {
       alert('Not kaydedildi.');
       loadSubmissions();
     }
   } catch(e) {}
}

const origInitOgrt = init;
init = async function() {
   await origInitOgrt();
   if(cu && cu.role === 'ogretmen') {
       loadSubmissions();
   }
}
</script>
`;

if (!html.includes('loadSubmissions()')) {
   html = html.replace('</body>', scriptJS + '</body>');
}

fs.writeFileSync('ogretmen-panel.html', html, 'utf8');
console.log('ogretmen-panel.html updated successfully.');
