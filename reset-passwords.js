const bcrypt = require('bcryptjs');
const sql = require('mssql');

const config = {
  user: 'sa',
  password: '123456',
  server: 'localhost',
  database: 'EBA_DB',
  options: { encrypt: false, trustServerCertificate: true }
};

async function resetPasswords() {
  const pool = await sql.connect(config);
  const hash = await bcrypt.hash('123456', 10);
  
  await pool.request()
    .input('pwd', sql.NVarChar, hash)
    .query('UPDATE Users SET password=@pwd');
  
  console.log('✅ Tüm kullanıcıların şifresi 123456 olarak sıfırlandı.');
  process.exit(0);
}

resetPasswords().catch(e => { console.error('❌', e.message); process.exit(1); });
