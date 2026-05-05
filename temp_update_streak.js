const fs = require('fs');
let txt = fs.readFileSync('server.js', 'utf8');

const oldLogic = `    // Streak kontrolü (basit)
    const now = new Date();
    const lastLogin = user.last_login ? new Date(user.last_login) : null;
    let newStreak = user.streak || 0;
    
    if (lastLogin) {
      const diffDays = Math.floor((now - lastLogin) / (1000 * 60 * 60 * 24));
      if (diffDays === 1) {
        newStreak += 1;
        // Günlük giriş ödülü
        await p.request()
          .input('tc', sql.NVarChar, req.user.tc)
          .input('s', sql.Int, newStreak)
          .query('UPDATE Users SET coins = coins + 10, last_login = GETDATE(), streak = @s WHERE tc=@tc');
      } else if (diffDays > 1) {
        newStreak = 1;
        await p.request()
          .input('tc', sql.NVarChar, req.user.tc)
          .query('UPDATE Users SET last_login = GETDATE(), streak = 1 WHERE tc=@tc');
      }
    } else {
      newStreak = 1;
      await p.request().input('tc', req.user.tc).query('UPDATE Users SET last_login = GETDATE(), streak = 1 WHERE tc=@tc');
    }`;

const newLogic = `    // Streak kontrolü (basit)
    let newStreak = user.streak || 0;
    const now = new Date();
    
    // JS tarihi yerel saate göre formatlamak için
    const todayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    if (user.last_login) {
      const lastLoginObj = new Date(user.last_login);
      const lastDate = new Date(lastLoginObj.getFullYear(), lastLoginObj.getMonth(), lastLoginObj.getDate());
      const diffDays = Math.round((todayDate - lastDate) / (1000 * 60 * 60 * 24));
      
      if (diffDays === 1) {
        newStreak += 1;
        // Günlük giriş ödülü
        await p.request()
          .input('tc', sql.NVarChar, req.user.tc)
          .input('s', sql.Int, newStreak)
          .query('UPDATE Users SET coins = coins + 10, last_login = GETDATE(), streak = @s WHERE tc=@tc');
      } else if (diffDays > 1) {
        newStreak = 1;
        await p.request()
          .input('tc', sql.NVarChar, req.user.tc)
          .query('UPDATE Users SET last_login = GETDATE(), streak = 1 WHERE tc=@tc');
      }
    } else {
      newStreak = 1;
      await p.request().input('tc', sql.NVarChar, req.user.tc).query('UPDATE Users SET last_login = GETDATE(), streak = 1 WHERE tc=@tc');
    }`;

if(txt.includes('Math.floor((now - lastLogin)')) {
    txt = txt.replace(oldLogic, newLogic);
    fs.writeFileSync('server.js', txt, 'utf8');
    console.log('Fixed streak logic in server.js');
} else {
    console.log('Could not find old logic block');
}
