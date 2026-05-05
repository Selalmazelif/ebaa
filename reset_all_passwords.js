const sql = require('mssql');
const bcrypt = require('bcryptjs');

const config = {
  user: 'sa',
  password: '123456',
  server: 'localhost',
  database: 'EBA_DB',
  options: { encrypt: false, trustServerCertificate: true, enableArithAbort: true }
};

async function resetAll() {
  try {
    const pool = await sql.connect(config);
    
    // Tüm kullanıcıları listele
    const users = await pool.request().query("SELECT tc, name, role FROM Users");
    console.log(`Toplam ${users.recordset.length} kullanıcı bulundu.`);
    
    // Yeni şifre: "elif" (bcrypt hash)
    const newHash = await bcrypt.hash('elif', 10);
    
    // Hepsinin şifresini güncelle
    await pool.request()
      .input('hash', sql.NVarChar, newHash)
      .query("UPDATE Users SET password = @hash");
    
    console.log('✅ Tüm kullanıcıların şifresi "elif" olarak güncellendi!');
    console.log('\nKullanıcı listesi:');
    users.recordset.forEach(u => {
      console.log(`  TC: ${u.tc} | Ad: ${u.name} | Rol: ${u.role} | Şifre: elif`);
    });
    
    process.exit(0);
  } catch(e) {
    console.error('Hata:', e.message);
    process.exit(1);
  }
}

resetAll();
