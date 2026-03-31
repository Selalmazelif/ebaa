const sql = require('mssql');
const bcrypt = require('bcryptjs');

const DB_CONFIG = {
  user:     'sa',
  password: '123456',
  server:   'localhost',
  database: 'EBA_DB',
  options: {
    encrypt:              false,
    trustServerCertificate: true,
    enableArithAbort:     true
  }
};

async function migrate() {
  console.log('🚀 Şifre göç işlemi başlatılıyor...');
  let pool;
  try {
    pool = await sql.connect(DB_CONFIG);
    const result = await pool.request().query('SELECT tc, password FROM Users');
    const users = result.recordset;

    console.log(`📊 Toplam ${users.length} kullanıcı bulundu.`);

    for (const user of users) {
      // Eğer şifre zaten $2a$ ile başlıyorsa muhtemelen zaten hash'lenmiştir
      if (user.password.startsWith('$2a$') && user.password.length > 30) {
        console.log(`✅ ${user.tc} zaten hash'lenmiş, atlanıyor.`);
        continue;
      }

      console.log(`🔐 ${user.tc} için şifre hash'leniyor...`);
      const salt = await bcrypt.genSalt(10);
      const hash = await bcrypt.hash(user.password, salt);

      await pool.request()
        .input('tc', sql.NVarChar, user.tc)
        .input('hash', sql.NVarChar, hash)
        .query('UPDATE Users SET password=@hash WHERE tc=@tc');
    }

    console.log('✨ Şifrelerin tamamı başarıyla güvenli hale getirildi (Hashlendi).');
  } catch (err) {
    console.error('❌ Hata oluştu:', err.message);
  } finally {
    if (pool) await pool.close();
    process.exit(0);
  }
}

migrate();
