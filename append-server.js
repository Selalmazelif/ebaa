const fs = require('fs');

const routes = `

// --- ÖDEV CEVABI GÖNDERME ---
app.post('/api/assignment-submit', async (req, res) => {
  const { assignment_id, student_tc, student_name, answer_text } = req.body;
  try {
    const p = await getPool();
    await p.request()
      .input('aid', sql.Int, parseInt(assignment_id))
      .input('tc', sql.NVarChar, student_tc)
      .input('name', sql.NVarChar, student_name)
      .input('ans', sql.NVarChar, answer_text)
      .query('INSERT INTO AssignmentSubmissions(assignment_id,student_tc,student_name,answer_text) VALUES(@aid,@tc,@name,@ans)');
    
    res.json({success: true, message: 'Cevabınız iletildi.'});
  } catch(e) { res.status(500).json({success:false, message:e.message}); }
});

// --- GELEN CEVAPLARI ÖĞRETMENE GÖSTERME (TÜMÜ VEYA BİR ÖDEV) ---
app.get('/api/assignment-submissions', async (req, res) => {
  const { teacher_tc } = req.query; // veya assignment_id
  try {
    const p = await getPool();
    const query = \`
      SELECT s.id, s.assignment_id, a.title, s.student_tc, s.student_name, s.answer_text, s.grade, s.isGraded, s.createdAt
      FROM AssignmentSubmissions s
      JOIN Assignments a ON s.assignment_id = a.id
      WHERE a.teacher_tc = @tc
      ORDER BY s.createdAt DESC
    \`;
    const r = await p.request().input('tc', sql.NVarChar, teacher_tc||'').query(query);
    res.json({success:true, submissions: r.recordset});
  } catch(e) { res.status(500).json({success:false, message:e.message}); }
});

// --- ÖĞRETMEN NOT GİRİŞİ ---
app.put('/api/assignment-grade', async (req, res) => {
  const { sub_id, grade, teacher_tc } = req.body;
  try {
    const p = await getPool();
    await p.request()
      .input('id', sql.Int, parseInt(sub_id))
      .input('grade', sql.Int, parseInt(grade))
      .query('UPDATE AssignmentSubmissions SET grade=@grade, isGraded=1 WHERE id=@id');
    
    // Öğrenciye bildirim gönderelim
    const subInfo = await p.request().input('id', sql.Int, parseInt(sub_id)).query('SELECT s.student_tc, a.title FROM AssignmentSubmissions s JOIN Assignments a ON s.assignment_id=a.id WHERE s.id=@id');
    if(subInfo.recordset.length) {
      const info = subInfo.recordset[0];
      const text = \`'\${info.title}' ödevinize not girildi: \${grade}\`;
      await p.request().input('tc', sql.NVarChar, info.student_tc).input('t', sql.NVarChar, text)
             .query('INSERT INTO Notifications(receiver_tc, text, isRead) VALUES(@tc,@t,0)');
    }
    
    res.json({success:true});
  } catch(e) { res.status(500).json({success:false, message:e.message}); }
});

// --- ÖĞRENCİ NOTLARI ÇEKME ---
app.get('/api/student-grades', async (req, res) => {
  const { student_tc } = req.query;
  try {
    const p = await getPool();
    const q = \`
      SELECT a.title as title, a.teacher_name as teacher, s.grade as score, 'Ödev' as type, s.createdAt as date
      FROM AssignmentSubmissions s
      JOIN Assignments a ON s.assignment_id = a.id
      WHERE s.student_tc = @tc AND s.isGraded = 1
      UNION ALL
      SELECT title, subject as teacher, score, 'Sınav' as type, takenAt as date
      FROM TestResults
      WHERE student_tc = @tc
      ORDER BY date DESC
    \`;
    const r = await p.request().input('tc', sql.NVarChar, student_tc).query(q);
    res.json({success:true, grades: r.recordset});
  } catch(e) { res.status(500).json({success:false, message:e.message}); }
});
`;

let code = fs.readFileSync('server.js', 'utf8');
if (!code.includes('/api/assignment-submit')) {
  // Try to append just before the end of file where basic exports or server start lines are
  const insertPos = code.lastIndexOf('app.listen');
  if(insertPos !== -1) {
    code = code.slice(0, insertPos) + routes + '\n' + code.slice(insertPos);
    fs.writeFileSync('server.js', code, 'utf8');
    console.log("Added new routes to server.js");
  } else {
    code += routes;
    fs.writeFileSync('server.js', code, 'utf8');
  }
} else {
  console.log("Routes already exist in server.js");
}
