const fs = require('fs');
let txt = fs.readFileSync('server.js', 'utf8');

// Sınav sonucu veli bildirimi
if (!txt.includes('const vR = await p.request().input(\'stc\'')) {
  const marker = "await stuMsg)\n           .query(\"INSERT INTO Notifications(receiver_tc, text, isRead) VALUES(@ttc, @msg, 0)\");\n    } catch(e) {}";
  const replacement = marker + `

    // Veliyi bilgilendir
    try {
       const vR = await p.request().input('stc', sql.NVarChar, student_tc).query("SELECT veliTc FROM Users WHERE tc=@stc");
       if(vR.recordset.length && vR.recordset[0].veliTc) {
         const vM = \`Çocuğunuz \${student_tc}, '\${title}' sınavını tamamladı. Puan: \${score}/\${total}\`;
         await p.request().input('vtc', sql.NVarChar, vR.recordset[0].veliTc).input('msg', sql.NVarChar, vM)
                .query("INSERT INTO Notifications(receiver_tc, text, isRead) VALUES(@vtc, @msg, 0)");
       }
    } catch(e) {}`;
    
  if (txt.includes("await p.request().input('ttc', sql.NVarChar, student_tc).input('msg', sql.NVarChar, stuMsg)")) {
     txt = txt.replace("query(\"INSERT INTO Notifications(receiver_tc, text, isRead) VALUES(@ttc, @msg, 0)\");\n    } catch(e) {}", 
                       "query(\"INSERT INTO Notifications(receiver_tc, text, isRead) VALUES(@ttc, @msg, 0)\");\n    } catch(e) {}" + `

    // Veliyi bilgilendir
    try {
       const vR = await p.request().input('stc', sql.NVarChar, student_tc).query("SELECT veliTc FROM Users WHERE tc=@stc");
       if(vR.recordset.length && vR.recordset[0].veliTc) {
         const vM = \`Çocuğunuz \${student_tc}, '\${title}' sınavını tamamladı. Puan: \${score}/\${total}\`;
         await p.request().input('vtc', sql.NVarChar, vR.recordset[0].veliTc).input('msg', sql.NVarChar, vM)
                .query("INSERT INTO Notifications(receiver_tc, text, isRead) VALUES(@vtc, @msg, 0)");
       }
    } catch(e) {}`);
  }
}

// Ödev notu veli bildirimi
if (!txt.includes('Çocuğunuzun \'${info.title}\' ödevine not girildi')) {
  const marker = "await p.request().input('tc', sql.NVarChar, info.student_tc).input('t', sql.NVarChar, text)\n             .query('INSERT INTO Notifications(receiver_tc, text, isRead) VALUES(@tc,@t,0)');";
  const replacement = marker + `
              
       // Veliyi de bilgilendir
       const veliCheck = await p.request().input('stc', sql.NVarChar, info.student_tc).query("SELECT veliTc FROM Users WHERE tc=@stc");
       if(veliCheck.recordset.length && veliCheck.recordset[0].veliTc) {
          const veliMsg = \`Çocuğunuzun '\${info.title}' ödevine not girildi: \${grade}\`;
          await p.request().input('vtc', sql.NVarChar, veliCheck.recordset[0].veliTc).input('msg', sql.NVarChar, veliMsg)
                 .query("INSERT INTO Notifications(receiver_tc, text, isRead) VALUES(@vtc, @msg, 0)");
       }`;
  txt = txt.replace(marker, replacement);
}

fs.writeFileSync('server.js', txt, 'utf8');
console.log("Server.js yamalandı.");
