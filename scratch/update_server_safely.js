const fs = require('fs');
const path = 'c:/Users/elifs/OneDrive/Desktop/Yeni klasör/server.js';
let content = fs.readFileSync(path, 'utf8');

// Move whiteboardUsers and competitionQueue to global
content = content.replace('let whiteboardStrokes = [];', 'let whiteboardStrokes = [];\nconst whiteboardUsers = new Map();\nconst competitionQueue = [];');
content = content.replace('  const whiteboardUsers = new Map(); // socketId -> { tc, name, role, hasHand, hasPermission }', '');
content = content.replace('  const competitionQueue = [];', '');

// Consolidated toggle_audio handler
const toggleAudioHandler = `  socket.on('toggle_audio', (data) => {
    if (data.all) {
      socket.to('whiteboard_room').emit('toggle_audio', { enabled: data.enabled, all: true });
    } else if (data.targetTc) {
      const targetSocketId = onlineUsers.get(String(data.targetTc));
      if (targetSocketId) {
        io.to(targetSocketId).emit('toggle_audio', { enabled: data.enabled, targetTc: data.targetTc });
      }
    } else {
      socket.to('whiteboard_room').emit('toggle_audio', { enabled: data.enabled, all: true });
    }
  });`;

// Add to main io.on('connection')
content = content.replace('    }\n    }\n  });', '      }\n    }\n  });\n\n' + toggleAudioHandler);

// Remove the orphaned handler at the end
const orphanedHandler = /io\.on\('connection', \(socket\) => \{\s*socket\.on\('toggle_audio', \(data\) => \{[\s\S]*?\}\);\s*\}\);/g;
content = content.replace(orphanedHandler, '');

fs.writeFileSync(path, content, 'utf8');
console.log('Server.js updated successfully.');
