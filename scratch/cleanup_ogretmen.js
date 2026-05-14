const fs = require('fs');
const path = 'ogretmen-panel.html';
let content = fs.readFileSync(path, 'utf8');
let lines = content.split(/\r?\n/);

// Remove sidebar link (line 157)
lines[156] = '';

// Remove main section (407-415)
for(let i=406; i<=414; i++) lines[i] = '';

// Remove init call (470)
lines[469] = lines[469].replace('loadTeacherAppointments();', '');

// Remove socket setup (1257-1260)
lines[1256] = '      setupRealtimeUpdate(init);';
lines[1257] = ''; lines[1258] = ''; lines[1259] = '';

// Remove script at end (1273-1311)
for(let i=1272; i<=1310; i++) lines[i] = '';

fs.writeFileSync(path, lines.join('\n'), 'utf8');
console.log('Randevu removed from ogretmen-panel.html');
