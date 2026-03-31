const sql = require('mssql');

const masterConfig = {
  user: 'sa',
  password: '123456',
  server: 'localhost',
  database: 'master',
  options: {
    encrypt: true,
    trustServerCertificate: true
  }
};

async function setup() {
    try {
        let pool = await sql.connect(masterConfig);
        console.log('✅ SQL Server bağlandı. Veritabanı kontrol ediliyor...');

        const checkDB = await pool.request().query("SELECT name FROM sys.databases WHERE name = 'EBA_DB'");
        if (checkDB.recordset.length === 0) {
            console.log('📦 EBA_DB oluşturuluyor...');
            await pool.request().query('CREATE DATABASE EBA_DB');
            console.log('✅ EBA_DB başarıyla oluşturuldu.');
        } else {
            console.log('ℹ️ EBA_DB zaten mevcut.');
        }
        await pool.close();

        const dbConfig = { ...masterConfig, database: 'EBA_DB' };
        pool = await sql.connect(dbConfig);
        console.log('🛠️ Tablolar kontrol ediliyor...');

        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Users' AND xtype='U')
            BEGIN
                CREATE TABLE Users (
                    id INT IDENTITY(1,1) PRIMARY KEY,
                    tc NVARCHAR(11) NOT NULL UNIQUE,
                    password NVARCHAR(100) NOT NULL,
                    role NVARCHAR(20) NOT NULL,
                    name NVARCHAR(100),
                    school NVARCHAR(200),
                    class NVARCHAR(50),
                    isActive BIT DEFAULT 1,
                    createdAt DATETIME DEFAULT GETDATE()
                )
            END
        `);
        console.log('✅ Users tablosu hazır.');
        
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Messages' AND xtype='U')
            BEGIN
                CREATE TABLE Messages (
                    id INT IDENTITY(1,1) PRIMARY KEY,
                    sender_tc NVARCHAR(11) NOT NULL,
                    receiver_tc NVARCHAR(11) NOT NULL,
                    content NVARCHAR(MAX) NOT NULL,
                    sentAt DATETIME DEFAULT GETDATE(),
                    isRead BIT DEFAULT 0
                )
            END
        `);
        console.log('✅ Messages tablosu hazır.');

        await pool.close();
        console.log('🚀 Veritabanı kurulumu başarıyla tamamlandı!');
    } catch (err) {
        console.error('❌ Kurulum hatası:', err.message);
    }
}

setup();
