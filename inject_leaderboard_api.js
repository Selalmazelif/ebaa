const fs = require('fs');
let code = fs.readFileSync('server.js', 'utf8');

const injection = `
// ─── LEADERBOARD API ──────────────────────────────────────────────────
app.get('/api/leaderboard', async (req, res) => {
  try {
    const p = await getPool();
    if (!p) return res.json({ success: true, leaderboard: [] });
    
    // Sadece öğrencileri listele
    const r = await p.request().query('SELECT top 10 name, points, school, class FROM Users WHERE role=\\'ogrenci\\' ORDER BY points DESC');
    res.json({ success: true, leaderboard: r.recordset });
  } catch (e) {
    res.json({ success: false, message: e.message });
  }
});
`;

if(!code.includes("LEADERBOARD API")) {
  code = code + '\n' + injection;
  fs.writeFileSync('server.js', code);
  console.log('Leaderboard API Injected successfully');
} else {
  console.log('Already exists');
}
