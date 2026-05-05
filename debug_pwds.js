const sql = require('mssql');
const config = {
  user: 'sa',
  password: '123456',
  server: 'localhost',
  database: 'EBA_DB',
  options: { encrypt: false, trustServerCertificate: true, enableArithAbort: true }
};

async function checkPasswords() {
  try {
    const pool = await sql.connect(config);
    const result = await pool.request().query("SELECT tc, name, password FROM Users");
    console.log('User Passwords:');
    result.recordset.forEach(u => {
      console.log(`TC: ${u.tc} | Name: ${u.name} | Pwd Length: ${u.password.length} | Pwd Start: ${u.password.substring(0, 10)}...`);
    });
    process.exit(0);
  } catch(e) {
    console.error('Error:', e.message);
    process.exit(1);
  }
}
checkPasswords();
