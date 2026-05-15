const fs = require('fs');
const path = 'c:/Users/elifs/OneDrive/Desktop/Yeni klasör/server.js';
let content = fs.readFileSync(path, 'utf8');

// Use regex to remove the malformed block between /api/test-results and /api/teacher-stats
const malformedRegex = /\/\/ .* WHITEBOARD AUDIO CONTROL .*[\s\S]*?\}\);\s*\r?\n\s*\r?\n\/\/ .* TEACHER DASHBOARD STATS API .*/;
// We need to be careful. Let's just find the start and end.
const startMarker = "// \ufffd\ufffd\ufffd WHITEBOARD AUDIO CONTROL";
const endMarker = "// \ufffd\ufffd\ufffd TEACHER DASHBOARD STATS API";

// Alternatively, replace the specific lines by line number if possible, 
// but content is better.
// Let's try to remove lines 2606-2618 (approx) by looking at the content.

content = content.replace(/\/\/ [^\r\n]* WHITEBOARD AUDIO CONTROL [^\r\n]*\r?\n\s*if \(data\.all\) \{[\s\S]*?\}\);\r?\n/, '');

fs.writeFileSync(path, content, 'utf8');
console.log('Server.js cleaned.');
