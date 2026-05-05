const sql = require('mssql');
require('dotenv').config();

const config = {
  user: 'sa',
  password: '123456',
  server: 'localhost',
  database: 'EBA_DB',
  options: {
    encrypt: true,
    trustServerCertificate: true
  }
};

async function check() {
  try {
    let pool = await sql.connect(config);
    const posts = await pool.request().query('SELECT TOP 10 * FROM Posts ORDER BY createdAt DESC');
    console.log(JSON.stringify(posts.recordset, null, 2));
    await pool.close();
  } catch (err) {
    console.error('Error:', err.message);
  }
}

check();
