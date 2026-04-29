const sql = require('mssql');
const DB_CONFIG = {
  user:     'sa',
  password: '123456',
  server:   'localhost',
  database: 'EBA_DB',
  options: { encrypt: false, trustServerCertificate: true }
};

async function test() {
  try {
    const pool = await sql.connect(DB_CONFIG);
    console.log("Connected to DB");
    const result = await pool.request()
      .input('sender', sql.NVarChar, '12345678940')
      .input('receiver', sql.NVarChar, '12345678941')
      .input('cont', sql.NVarChar, 'Test message')
      .query('INSERT INTO Messages(sender_tc, receiver_tc, content) VALUES(@sender, @receiver, @cont)');
    console.log("Inserted message:", result);
    
    // Also test notification
    const sender_name = "Test User";
    const content = "Test message";
    const notifText = `📩 ${sender_name}: ${content.slice(0, 50)}${content.length > 50 ? '...' : ''}`;
    const result2 = await pool.request()
      .input('rtc', sql.NVarChar, '12345678941')
      .input('txt', sql.NVarChar, notifText)
      .query('INSERT INTO Notifications(receiver_tc, text, isRead) VALUES(@rtc, @txt, 0)');
    console.log("Inserted notification:", result2);
    
    await pool.close();
  } catch (e) {
    console.error("Error:", e);
  }
}
test();
