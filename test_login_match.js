const bcrypt = require('bcryptjs');
const sql = require('mssql');
const config = {
  user: 'sa',
  password: '123456',
  server: 'localhost',
  database: 'EBA_DB',
  options: { encrypt: false, trustServerCertificate: true, enableArithAbort: true }
};

async function testLogin() {
  try {
    const pool = await sql.connect(config);
    const result = await pool.request()
      .input('tc', sql.NVarChar, '12345678002') // elif
      .query("SELECT password FROM Users WHERE tc=@tc");
    
    if (result.recordset.length === 0) {
      console.log('User not found');
      process.exit(1);
    }
    
    const hash = result.recordset[0].password;
    const match = await bcrypt.compare('elif', hash);
    console.log('Match for "elif":', match);
    process.exit(0);
  } catch(e) {
    console.error('Error:', e.message);
    process.exit(1);
  }
}
testLogin();
