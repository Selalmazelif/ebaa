const fs = require('fs');
let code = fs.readFileSync('server.js', 'utf8');

const injection = `
// ─── WHITEBOARD API ──────────────────────────────────────────────────
let whiteboardStrokes = [];

app.get('/api/whiteboard', (req, res) => {
  res.json({ success: true, strokes: whiteboardStrokes });
});

app.post('/api/whiteboard', authenticateToken, (req, res) => {
  if (req.user.role !== 'ogretmen') return res.status(403).json({ success: false, message: 'Yetkisiz' });
  const { stroke } = req.body;
  if(stroke) whiteboardStrokes.push(stroke);
  // Sınırla (Çok dolmasın)
  if(whiteboardStrokes.length > 5000) whiteboardStrokes = whiteboardStrokes.slice(whiteboardStrokes.length - 5000);
  res.json({ success: true });
});

app.post('/api/whiteboard/clear', authenticateToken, (req, res) => {
  if (req.user.role !== 'ogretmen') return res.status(403).json({ success: false, message: 'Yetkisiz' });
  whiteboardStrokes = [];
  res.json({ success: true });
});
`;

if(!code.includes("WHITEBOARD API")) {
  code = code + '\n' + injection;
  fs.writeFileSync('server.js', code);
  console.log('Whiteboard API Injected successfully');
} else {
  console.log('Already exists');
}
