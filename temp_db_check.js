const sql = require('mssql');
const config = {
  user: 'sa',
  password: '123456',
  server: 'localhost',
  database: 'EBA_DB',
  options: { encrypt: false, trustServerCertificate: true, enableArithAbort: true }
};

async function check() {
  try {
    const p = await sql.connect(config);
    const r = await p.request().query("SELECT name FROM sys.databases");
    console.log('Databases:', r.recordset.map(x => x.name));
    const r2 = await p.request().query("SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_CATALOG='EBA_DB'");
    console.log('Tables in EBA_DB:', r2.recordset.map(x => x.TABLE_NAME));
    const r3 = await p.request().query("SELECT TOP 5 tc, name, role FROM Users");
    console.log('Users:', r3.recordset);
    process.exit(0);
  } catch(e) {
    console.error('Hata:', e.message);
    process.exit(1);
  }
}
check();
