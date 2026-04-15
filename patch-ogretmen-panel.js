const fs = require('fs');
let html = fs.readFileSync('ogretmen-panel.html', 'utf8');

// 1. Gereksiz veya hatalı script bloklarını temizle
// Altta kalan fazlalık script bloğunu bul ve sil
const badScriptStart = html.lastIndexOf('<script>\nasync function loadSubmissions() {');
if (badScriptStart > -1) {
    html = html.substring(0, badScriptStart);
}

// 2. Ana init fonksiyonunun içini ve sonrasını düzenle
// loadSubmissions fonksiyonunu ve submitGrade fonksiyonunu ana bloğa ekle
const submissionsCode = `
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
             <div style="background:#f9f9f9; padding:8px; border-radius:6px; margin:5px 0; color:#444; word-break:break-word; border:1px solid #eee;">
               \${s.answer_text}
             </div>
             <div style="display:flex; gap:8px; align-items:center;">
               \${s.isGraded ? 
                 \`<span style="color:#2ecc71; font-weight:bold;">Not: \${s.grade}</span>\` :
                 \`
                   <input type="number" id="gradeInp_\${s.id}" placeholder="Not Gir" style="border:1px solid #ccc; border-radius:4px; padding:4px; width:60px;" max="100" min="0">
                   <button onclick="submitGrade(\${s.id})" style="background:#284B63; color:white; border:none; border-radius:4px; padding:4px 8px; cursor:pointer;">Kaydet</button>
                 \`
               }
             </div>
           </div>
         \`).join('');
      } else {
         el.innerHTML = '<div style="text-align:center;color:#aaa;padding:20px;">Bekleyen cevap yok.</div>';
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
       alert('Not başarıyla kaydedildi.');
       loadSubmissions();
       loadNotifs();
     }
   } catch(e) {}
}

init();
</script>
</body>
</html>`;

// Ana script bloğunun sonundaki init(); </script> kısmını bul ve değiştir
if (html.includes('init();\n</script>')) {
    html = html.replace('init();\n</script>', submissionsCode);
} else if (html.includes('init();</script>')) {
    html = html.replace('init();</script>', submissionsCode);
}

fs.writeFileSync('ogretmen-panel.html', html, 'utf8');
console.log('ogretmen-panel.html temizlendi ve güncellendi.');
