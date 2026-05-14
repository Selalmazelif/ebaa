const fs = require('fs');
const path = 'veli-panel.html';
let content = fs.readFileSync(path, 'utf8');
let lines = content.split(/\r?\n/);

// Remove sidebar link (search by text)
lines = lines.map(l => l.includes('section-appointments') && l.includes('calendar-check') ? '' : l);

// Remove main section (search by ID)
let inAppSection = false;
lines = lines.map(l => {
  if(l.includes('id="section-appointments"')) inAppSection = true;
  if(inAppSection) {
    if(l.includes('</div>')) { inAppSection = false; return ''; }
    return '';
  }
  return l;
});

// Remove init call
lines = lines.map(l => l.replace('loadAppointments(childUser),', ''));

// Remove modal and script at end
let inModalOrScript = false;
lines = lines.map(l => {
  if(l.includes('<!-- RANDEVU MODAL -->')) inModalOrScript = true;
  if(inModalOrScript) {
    if(l.includes('</body>')) { inModalOrScript = false; return '</body>'; }
    return '';
  }
  return l;
});

fs.writeFileSync(path, lines.join('\n'), 'utf8');
console.log('Randevu removed from veli-panel.html');
