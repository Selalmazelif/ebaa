const fs = require('fs');
const sql = require('mssql');

const dbConfig = {
  user: 'sa',
  password: 'Elif1405*',
  server: 'localhost',
  database: 'EBA_DB',
  options: { encrypt: false, enableArithAbort: true }
};

async function run() {
  console.log("Bağlanıyor...");
  let pool = await sql.connect(dbConfig);
  try {
    console.log("Appointments tablosu düşürülüyor...");
    await pool.request().query("DROP TABLE Appointments");
  } catch (e) {
    console.log("DROP error:", e.message);
  }

  // ogrenci-panel.html fix
  const opFile = 'c:\\Users\\elifs\\OneDrive\\Desktop\\Yeni klasör\\ogrenci-panel.html';
  let opTxt = fs.readFileSync(opFile, 'utf8');
  opTxt = opTxt.replace(/function openAssignmentModal\(id\) \{[\s\S]*?document\.getElementById\('assignmentModal'\)\.style\.display = 'flex';\s*\}/m, 
    `function openAssignmentModal(id) {
      const a = assignmentsCache.find(x => x.id === id);
      if (!a) return;
      activeAssignmentId = id;
      currentAssignmentId = id;
      document.getElementById('asmTitle').textContent = a.title || 'İsimsiz Görev';
      document.getElementById('asmDesc').textContent = a.description || a.content || 'Açıklama bulunamadı.';
      document.getElementById('asmAnswer').value = '';
      const fb = document.getElementById('aiFeedback');
      if (fb) { fb.style.display = 'none'; fb.textContent = ''; }
      document.getElementById('assignmentModal').style.display = 'flex';
    }`);
  fs.writeFileSync(opFile, opTxt);

  // ogretmen-panel.html takvim fix
  const otFile = 'c:\\Users\\elifs\\OneDrive\\Desktop\\Yeni klasör\\ogretmen-panel.html';
  let otTxt = fs.readFileSync(otFile, 'utf8');
  if (!otTxt.includes('setTimeout(() => { if(typeof renderCal === "function") renderCal(); }, 1000);')) {
    otTxt = otTxt.replace('</body>', `  <script> setTimeout(() => { if(typeof renderCal === "function") renderCal(); }, 1000); </script>\n</body>`);
    fs.writeFileSync(otFile, otTxt);
  }

  // veli-panel.html öğretmen seçimi
  const vpFile = 'c:\\Users\\elifs\\OneDrive\\Desktop\\Yeni klasör\\veli-panel.html';
  let vpTxt = fs.readFileSync(vpFile, 'utf8');
  vpTxt = vpTxt.replace(/<input type="text" id="randevuTeacherTc" placeholder="Öğretmen TC Kimlik No" [^>]+>/g, 
    '<select id="randevuTeacherTc" style="width: 100%; padding: 10px; margin-bottom: 10px; border-radius: 6px; border: 1px solid #ccc;"><option value="">Öğretmen Seçin</option></select>');
  
  if(!vpTxt.includes('async function loadTeachers()')) {
    const addFn = `
    async function loadTeachers() {
      try {
        const res = await ebaFetch('/api/appointments/teachers?parent_tc=' + currentUser.tc);
        const data = await res.json();
        if(data.success && data.teachers) {
          const sel = document.getElementById('randevuTeacherTc');
          if(sel) {
            sel.innerHTML = '<option value="">Öğretmen Seçin</option>' + 
              data.teachers.map(t => '<option value="' + t.tc + '">' + t.name + ' (' + (t.branch || 'Öğretmen') + ')</option>').join('');
          }
        }
      } catch(e) {}
    }
    loadTeachers();
    `;
    vpTxt = vpTxt.replace('function randevuModalKapat()', addFn + '\n    function randevuModalKapat()');
    fs.writeFileSync(vpFile, vpTxt);
  }

  console.log("Bitti");
  process.exit();
}

run();
