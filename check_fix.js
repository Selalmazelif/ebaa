const fs = require('fs');

function fix(f) {
  if (!fs.existsSync(f)) return;
  let b = fs.readFileSync(f);
  // Replace typical replacement characters or broken patterns if we can find them
  // But usually rewrite is safer.
  // For now I'll just check if it has "??".
  let s = b.toString('utf8');
  if (s.includes('\ufffd') || s.includes('??')) {
    console.log(`Fixing ${f}...`);
    // Simple heuristic replacements
    s = s.replace(/\ufffd/g, '?'); // Placeholder
    // Actually, I'll just use the PowerShell rewrite trick for all main files.
  }
}

['ogretmen-panel.html', 'ogrenci-panel.html'].forEach(fix);
