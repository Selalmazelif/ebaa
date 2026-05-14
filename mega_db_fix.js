const sql = require('mssql');
const config = {
  user: 'sa',
  password: 'Elif1405*',
  server: 'localhost',
  database: 'EBA_DB',
  options: {
    encrypt: false,
    trustServerCertificate: true
  }
};

async function megaFix() {
  try {
    await sql.connect(config);
    console.log('✅ Veritabanına bağlandı.');

    const changes = [
      // TestResults Fix
      { table: 'TestResults', col: 'correct_cnt', type: 'INT DEFAULT 0' },
      { table: 'TestResults', col: 'wrong_cnt',   type: 'INT DEFAULT 0' },
      { table: 'TestResults', col: 'blank_cnt',   type: 'INT DEFAULT 0' },
      { table: 'TestResults', col: 'wrong_questions', type: 'NVARCHAR(MAX)' },
      
      // Users Fix
      { table: 'Users', col: 'coins',           type: 'INT DEFAULT 0' },
      { table: 'Users', col: 'streak',          type: 'INT DEFAULT 0' },
      { table: 'Users', col: 'last_login',      type: 'DATETIME' },
      { table: 'Users', col: 'badges',          type: 'NVARCHAR(MAX)' },
      { table: 'Users', col: 'avatar_items',    type: 'NVARCHAR(MAX)' },
      { table: 'Users', col: 'selected_avatar', type: 'NVARCHAR(MAX)' },
      { table: 'Users', col: 'veliTc',          type: 'NVARCHAR(11)' },
      { table: 'Users', col: 'profilePic',      type: 'NVARCHAR(MAX)' },
      { table: 'Users', col: 'grade_avg',       type: 'FLOAT DEFAULT 0' },
      { table: 'Users', col: 'isOnline',        type: 'BIT DEFAULT 0' },
      { table: 'Users', col: 'lastSeen',        type: 'DATETIME' },
      { table: 'Users', col: 'points',          type: 'INT DEFAULT 0' },
      { table: 'Users', col: 'branch',          type: 'NVARCHAR(100)' },
      { table: 'Users', col: 'level',           type: 'NVARCHAR(50)' },

      // Assignments Fix
      { table: 'Assignments', col: 'file_name',       type: 'NVARCHAR(200)' },
      { table: 'Assignments', col: 'file_data',       type: 'NVARCHAR(MAX)' },
      { table: 'Assignments', col: 'assignment_type', type: 'NVARCHAR(50) DEFAULT \'Metin\'' },

      // Posts Fix
      { table: 'Posts', col: 'event_title', type: 'NVARCHAR(200)' },
      { table: 'Posts', col: 'event_start', type: 'NVARCHAR(50)' },
      { table: 'Posts', col: 'event_end',   type: 'NVARCHAR(50)' }
    ];

    for (const item of changes) {
      const q = `IF NOT COLUMNPROPERTY(OBJECT_ID('${item.table}'), '${item.col}', 'ColumnId') IS NOT NULL
                 ALTER TABLE ${item.table} ADD ${item.col} ${item.type};`;
      await sql.query(q);
      console.log(`ℹ️ Kontrol: ${item.table}.${item.col}`);
    }

    console.log('✅ Tüm veritabanı şeması kusursuz hale getirildi.');
    await sql.close();
    process.exit(0);
  } catch (err) {
    console.error('❌ Hata:', err.message);
    process.exit(1);
  }
}

megaFix();
