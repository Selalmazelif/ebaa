const sql = require('mssql');
const config = {
  user: 'sa',
  password: '123456',
  server: 'localhost',
  database: 'EBA_DB',
  options: { encrypt: false, trustServerCertificate: true }
};
async function check() {
  try {
    await sql.connect(config);
    const tc = '12345678941';
    const q = `
      SELECT a.title as title, a.teacher_name as teacher, s.grade as score, 'Ödev' as type, s.createdAt as date
      FROM AssignmentSubmissions s
      JOIN Assignments a ON s.assignment_id = a.id
      WHERE s.student_tc = '${tc}' AND s.grade IS NOT NULL
      UNION ALL
      SELECT title, subject as teacher, score, 'Sınav' as type, takenAt as date
      FROM TestResults
      WHERE student_tc = '${tc}'
      ORDER BY date DESC
    `;
    const r = await sql.query(q);
    console.log(JSON.stringify(r.recordset, null, 2));
  } catch(e) {
    console.log(e.message);
  } finally {
    await sql.close();
  }
}
check();
