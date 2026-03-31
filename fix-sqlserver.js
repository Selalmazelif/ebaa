const { exec } = require('child_process');

// Try to enable Mixed Mode Authentication via registry and restart SQL Server
// This requires admin privileges

const commands = [
  // Enable Mixed Mode Auth in SQL Server registry
  `reg add "HKLM\\SOFTWARE\\Microsoft\\Microsoft SQL Server\\MSSQL16.MSSQLSERVER\\MSSQLServer" /v LoginMode /t REG_DWORD /d 2 /f`,
  // Try to start SQL Server
  `net start MSSQLSERVER`
];

async function fixSqlServer() {
  console.log('🔧 SQL Server Mixed Mode Authentication düzeltiliyor...');
  
  for (const cmd of commands) {
    await new Promise((resolve) => {
      exec(cmd, (error, stdout, stderr) => {
        if (error) {
          console.log(`⚠️ Komut: ${cmd}`);
          console.log(`   Hata: ${error.message}`);
        } else {
          console.log(`✅ Başarılı: ${cmd}`);
          if (stdout) console.log(stdout);
        }
        resolve();
      });
    });
  }
  
  // Wait for SQL Server to start
  console.log('⏳ SQL Server başlaması bekleniyor (10 saniye)...');
  await new Promise(r => setTimeout(r, 10000));
  
  // Test connection
  try {
    const sql = require('mssql');
    const config = {
      user: 'sa',
      password: '123456',
      server: 'localhost',
      database: 'master',
      options: { encrypt: true, trustServerCertificate: true }
    };
    const pool = await sql.connect(config);
    console.log('✅ SQL Server bağlantısı başarılı!');
    
    // Enable sa account and set password
    await pool.request().query(`
      ALTER LOGIN sa ENABLE;
      ALTER LOGIN sa WITH PASSWORD = '123456';
    `);
    console.log('✅ sa hesabı etkinleştirildi!');
    await pool.close();
  } catch (err) {
    console.log('❌ SQL Server bağlantısı hala çalışmıyor:', err.message);
    console.log('\n📋 MANUEL DÜZELTME ADIMLARI:');
    console.log('1. SQL Server Configuration Manager açın');
    console.log('2. SQL Server Services → SQL Server (MSSQLSERVER) → Sağ tıkla → Properties');
    console.log('3. Servisi "Local System" olarak başlatmayı deneyin');
    console.log('4. VEYA: SQL Server Management Studio açın');
    console.log('   → Server Properties → Security → SQL Server and Windows Authentication');
    console.log('   → Security → Logins → sa → Enable');
    console.log('5. Server\'ı yeniden başlatın');
  }
}

fixSqlServer();
