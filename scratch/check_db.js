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
    console.log('Connected to EBA_DB');
    
    const tables = ['Users', 'Posts', 'Assignments', 'Notifications'];
    for (let t of tables) {
      const res = await pool.request().query(`SELECT COUNT(*) as count FROM ${t}`);
      console.log(`${t}: ${res.recordset[0].count} records`);
    }
    
    if (pool.recordset && pool.recordset[0].count > 0) {
        const users = await pool.request().query('SELECT tc, name, role FROM Users');
        console.log('Users list:', users.recordset);
    } else {
        const users = await pool.request().query('SELECT tc, name, role FROM Users');
        console.log('Users list:', users.recordset);
    }

    await pool.close();
  } catch (err) {
    console.error('Error:', err.message);
  }
}

check();
