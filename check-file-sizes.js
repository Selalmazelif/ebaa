const sql = require('mssql');
const config = {
  user: 'sa', password: '123456', server: 'localhost', database: 'EBA_DB',
  options: { encrypt: true, trustServerCertificate: true }
};

async function check() {
  try {
    await sql.connect(config);
    const res = await sql.query("SELECT id, title, LEN(file_data) as file_len FROM Assignments");
    console.log(JSON.stringify(res.recordset, null, 2));
    await sql.close();
  } catch(e) { console.error(e); }
}
check();
