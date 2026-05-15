const fs = require('fs');

const serverFile = 'c:\\Users\\elifs\\OneDrive\\Desktop\\Yeni klasör\\server.js';
let content = fs.readFileSync(serverFile, 'utf8');

if (!content.includes('CREATE TABLE Appointments')) {
  const tableSql = `
    IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Appointments' AND xtype='U')
    CREATE TABLE Appointments (
        id INT IDENTITY(1,1) PRIMARY KEY,
        teacher_tc VARCHAR(20),
        veli_tc VARCHAR(20),
        student_tc VARCHAR(20),
        appointment_date VARCHAR(50),
        appointment_time VARCHAR(20),
        status VARCHAR(20) DEFAULT 'Bekliyor',
        createdAt DATETIME DEFAULT GETDATE()
    );`;

  content = content.replace(
    "CREATE TABLE Posts",
    tableSql + "\n\n    IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Posts' AND xtype='U')\n    CREATE TABLE Posts"
  );
}

if (!content.includes('/api/appointments')) {
  const endpoints = `
// ─── RANDEVU SİSTEMİ ──────────────────────────────────────────────────
app.get('/api/appointments', authenticateToken, async (req, res) => {
  try {
    const { role, tc } = req.user;
    const pool = await poolPromise;
    let query = "SELECT a.*, (SELECT name FROM Users WHERE tc = a.teacher_tc) as teacher_name, (SELECT name FROM Users WHERE tc = a.veli_tc) as veli_name, (SELECT name FROM Users WHERE tc = a.student_tc) as student_name FROM Appointments a WHERE ";
    
    if (role === 'ogretmen') {
      query += "a.teacher_tc = @tc";
    } else {
      query += "a.veli_tc = @tc OR a.student_tc = @tc";
    }
    query += " ORDER BY a.createdAt DESC";
    
    const r = await pool.request().input('tc', sql.VarChar, tc).query(query);
    res.json({ success: true, appointments: r.recordset });
  } catch(e) { res.status(500).json({success:false, message:e.message}); }
});

app.post('/api/appointments', authenticateToken, async (req, res) => {
  try {
    const { teacher_tc, student_tc, appointment_date, appointment_time } = req.body;
    const pool = await poolPromise;
    
    const r = await pool.request()
      .input('teacher_tc', sql.VarChar, teacher_tc)
      .input('veli_tc', sql.VarChar, req.user.tc)
      .input('student_tc', sql.VarChar, student_tc)
      .input('date', sql.VarChar, appointment_date)
      .input('time', sql.VarChar, appointment_time)
      .query(\`INSERT INTO Appointments (teacher_tc, veli_tc, student_tc, appointment_date, appointment_time)
              VALUES (@teacher_tc, @veli_tc, @student_tc, @date, @time)\`);
              
    res.json({ success: true, message: 'Randevu talebi gönderildi.' });
  } catch(e) { res.status(500).json({success:false, message:e.message}); }
});

app.put('/api/appointments/:id', authenticateToken, async (req, res) => {
  try {
    const { status } = req.body;
    const pool = await poolPromise;
    
    await pool.request()
      .input('id', sql.Int, req.params.id)
      .input('status', sql.VarChar, status)
      .query("UPDATE Appointments SET status = @status WHERE id = @id");
              
    res.json({ success: true, message: 'Randevu durumu güncellendi.' });
  } catch(e) { res.status(500).json({success:false, message:e.message}); }
});
`;

  content = content.replace('// ─── KULLANICI / LOGIN / REGISTER ───', endpoints + '\n// ─── KULLANICI / LOGIN / REGISTER ───');
}

fs.writeFileSync(serverFile, content, 'utf8');
console.log("Appointments tablosu ve API eklendi.");
