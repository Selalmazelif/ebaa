const sql = require('mssql');
const config = {
  user: 'sa', password: '123456', server: 'localhost', database: 'EBA_DB',
  options: { encrypt: true, trustServerCertificate: true }
};

async function upgrade() {
  try {
    let pool = await sql.connect(config);
    console.log('DB connected for gamification upgrade.');

    // Users tablosuna yeni sütunlar ekle
    const columns = [
      { name: 'points', type: 'INT DEFAULT 0' },
      { name: 'coins', type: 'INT DEFAULT 0' },
      { name: 'streak', type: 'INT DEFAULT 0' },
      { name: 'last_login', type: 'DATETIME' },
      { name: 'badges', type: 'NVARCHAR(MAX) DEFAULT \'[]\'' },
      { name: 'avatar_items', type: 'NVARCHAR(MAX) DEFAULT \'[]\'' },
      { name: 'selected_avatar', type: 'NVARCHAR(MAX)' }
    ];

    for (const col of columns) {
      try {
        await pool.request().query(`
          IF NOT COLUMNPROPERTY(OBJECT_ID('Users'), '${col.name}', 'ColumnId') IS NOT NULL
          ALTER TABLE Users ADD ${col.name} ${col.type};
        `);
        console.log(`Column ${col.name} added or already exists.`);
      } catch (e) {
        console.log(`Error adding ${col.name}:`, e.message);
      }
    }

    // Forum tablosu için 'is_solved' ve 'is_approved' sütunları
    try {
        await pool.request().query(`
          IF NOT COLUMNPROPERTY(OBJECT_ID('ForumPosts'), 'is_approved', 'ColumnId') IS NOT NULL
          ALTER TABLE ForumPosts ADD is_approved BIT DEFAULT 0;
        `);
    } catch(e) {}

    console.log('Gamification DB upgrade completed.');
    await pool.close();
  } catch(e) {
    console.error(e);
  }
}
upgrade();
