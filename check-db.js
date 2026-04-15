const sql = require('mssql');
const config = {
  user: 'sa', password: '123456', server: 'localhost', database: 'EBA_DB',
  options: { encrypt: true, trustServerCertificate: true }
};

async function check() {
  try {
    await sql.connect(config);
    console.log("DB Connected.");
    
    console.log("\n--- Assignments Table Columns ---");
    const resA = await sql.query("SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Assignments'");
    resA.recordset.forEach(c => console.log(`${c.COLUMN_NAME}: ${c.DATA_TYPE}`));
    
    console.log("\n--- Existing Assignments Count ---");
    const countA = await sql.query("SELECT COUNT(*) as cnt FROM Assignments");
    console.log(`Total Assignments: ${countA.recordset[0].cnt}`);
    
    await sql.close();
  } catch(e) { console.error(e); }
}
check();
