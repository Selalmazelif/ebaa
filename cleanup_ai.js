const fs = require('fs');
const files = ['ai-bot.js', 'inject_bot.js'];

files.forEach(f => {
  try {
    if (fs.existsSync(f)) {
      fs.unlinkSync(f);
      console.log(`Deleted ${f}`);
    } else {
      console.log(`${f} already gone`);
    }
  } catch (e) {
    console.error(`Error deleting ${f}: ${e.message}`);
    // Try to empty it if deletion fails
    try {
      fs.writeFileSync(f, '// Silindi');
      console.log(`Emptied ${f} since delete failed`);
    } catch (e2) {
      console.error(`Double fail for ${f}`);
    }
  }
});
