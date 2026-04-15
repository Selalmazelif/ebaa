const sql = require('mssql');
const config = {
  user: 'sa', password: '123456', server: 'localhost', database: 'EBA_DB',
  options: { encrypt: true, trustServerCertificate: true }
};

async function upgrade() {
  try {
    let pool = await sql.connect(config);
    console.log('DB connected.');

    // Assignment Submissions
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='AssignmentSubmissions' AND xtype='U')
      CREATE TABLE AssignmentSubmissions (
        id INT IDENTITY(1,1) PRIMARY KEY,
        assignment_id INT NOT NULL,
        student_tc NVARCHAR(11) NOT NULL,
        student_name NVARCHAR(100),
        answer_text NVARCHAR(MAX),
        grade INT,
        isGraded BIT DEFAULT 0,
        createdAt DATETIME DEFAULT GETDATE()
      )
    `);

    // TestResults update
    // Check correct_cnt
    try {
      await pool.request().query(`
        IF NOT COLUMNPROPERTY(OBJECT_ID('TestResults'), 'correct_cnt', 'ColumnId') IS NOT NULL
        ALTER TABLE TestResults ADD correct_cnt INT DEFAULT 0, wrong_cnt INT DEFAULT 0, blank_cnt INT DEFAULT 0, wrong_questions NVARCHAR(MAX);
      `);
    } catch(e) { console.log('TestResults update error or already exists:', e.message); }

    console.log('Upgrade completed.');
    await pool.close();
  } catch(e) {
    console.error(e);
  }
}
upgrade();
