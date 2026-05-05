const sql = require('mssql');
const bcrypt = require('bcryptjs');

const config = {
  user: 'sa',
  password: '123456',
  server: 'localhost',
  database: 'EBA_DB',
  options: { encrypt: false, trustServerCertificate: true, enableArithAbort: true }
};

async function fixAll() {
  try {
    const pool = await sql.connect(config);
    const newHash = await bcrypt.hash('elif', 10);
    
    // Update all users
    await pool.request()
      .input('hash', sql.NVarChar, newHash)
      .query("UPDATE Users SET password = @hash");
    
    console.log('✅ All passwords reset to "elif" hash.');
    
    // Verify a few
    const testUsers = await pool.request().query("SELECT TOP 3 tc, password FROM Users");
    for (const u of testUsers.recordset) {
      const isMatch = await bcrypt.compare('elif', u.password);
      console.log(`TC: ${u.tc} | Match 'elif': ${isMatch}`);
    }
    
    process.exit(0);
  } catch(e) {
    console.error('Error:', e.message);
    process.exit(1);
  }
}
fixAll();
