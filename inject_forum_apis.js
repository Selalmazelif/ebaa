const fs = require('fs');
let code = fs.readFileSync('server.js', 'utf8');

const apiEndpoints = `
// ─── FORUM API ────────────────────────────────────────────────────────
app.get('/api/forum', async (req, res) => {
  try {
    const p = await getPool();
    if (!p) return res.json({ success: true, questions: [] });
    const r = await p.request().query('SELECT * FROM ForumQuestions ORDER BY is_solved ASC, upvotes DESC, createdAt DESC');
    res.json({ success: true, questions: r.recordset });
  } catch (e) {
    res.json({ success: false, message: e.message });
  }
});

app.post('/api/forum', authenticateToken, async (req, res) => {
  try {
    const { title, content, category } = req.body;
    const u = req.user;
    const p = await getPool();
    if (!p) return res.json({ success: true });
    
    await p.request()
      .input('tc', sql.NVarChar, u.tc)
      .input('name', sql.NVarChar, u.name)
      .input('title', sql.NVarChar, title)
      .input('content', sql.NVarChar, content)
      .input('category', sql.NVarChar, category || 'Genel')
      .input('school', sql.NVarChar, u.school || '')
      .query('INSERT INTO ForumQuestions (author_tc, author_name, title, content, category, school) VALUES (@tc, @name, @title, @content, @category, @school)');
      
    // Puan ver
    await p.request().input('tc', sql.NVarChar, u.tc).query('UPDATE Users SET points = points + 5 WHERE tc=@tc');
    
    res.json({ success: true });
  } catch (e) {
    res.json({ success: false, message: e.message });
  }
});

app.get('/api/forum/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const p = await getPool();
    if (!p) return res.json({ success: false });
    
    await p.request().input('id', sql.Int, id).query('UPDATE ForumQuestions SET views = views + 1 WHERE id=@id');
    
    const rQ = await p.request().input('id', sql.Int, id).query('SELECT * FROM ForumQuestions WHERE id=@id');
    const rA = await p.request().input('id', sql.Int, id).query('SELECT * FROM ForumAnswers WHERE question_id=@id ORDER BY is_accepted DESC, upvotes DESC, createdAt ASC');
    
    res.json({ success: true, question: rQ.recordset[0], answers: rA.recordset });
  } catch (e) {
    res.json({ success: false, message: e.message });
  }
});

app.post('/api/forum/:id/answer', authenticateToken, async (req, res) => {
  try {
    const id = req.params.id;
    const { content } = req.body;
    const u = req.user;
    const p = await getPool();
    if (!p) return res.json({ success: true });
    
    await p.request()
      .input('qid', sql.Int, id)
      .input('tc', sql.NVarChar, u.tc)
      .input('name', sql.NVarChar, u.name)
      .input('content', sql.NVarChar, content)
      .query('INSERT INTO ForumAnswers (question_id, author_tc, author_name, content) VALUES (@qid, @tc, @name, @content)');
      
    // Puan ver
    await p.request().input('tc', sql.NVarChar, u.tc).query('UPDATE Users SET points = points + 10 WHERE tc=@tc');
    
    // Soru sahibine bildirim yolla
    const rQ = await p.request().input('id', sql.Int, id).query('SELECT author_tc, title FROM ForumQuestions WHERE id=@id');
    if(rQ.recordset.length > 0) {
       const qAuthor = rQ.recordset[0].author_tc;
       const qTitle = rQ.recordset[0].title;
       if(qAuthor !== u.tc) {
          const notifMsg = \`Forumda sorduğunuz "\${qTitle}" sorusuna \${u.name} cevap yazdı.===FORUM_ANS|\${id}===\`;
          await p.request()
            .input('rtc', sql.NVarChar, qAuthor)
            .input('txt', sql.NVarChar, notifMsg)
            .query('INSERT INTO Notifications (receiver_tc, text) VALUES (@rtc, @txt)');
       }
    }
    
    res.json({ success: true });
  } catch (e) {
    res.json({ success: false, message: e.message });
  }
});

app.post('/api/forum/:id/upvote', authenticateToken, async (req, res) => {
  try {
    const p = await getPool();
    if (!p) return res.json({ success: true });
    await p.request().input('id', sql.Int, req.params.id).query('UPDATE ForumQuestions SET upvotes = upvotes + 1 WHERE id=@id');
    res.json({ success: true });
  } catch (e) {
    res.json({ success: false, message: e.message });
  }
});

app.post('/api/forum/answer/:id/upvote', authenticateToken, async (req, res) => {
  try {
    const p = await getPool();
    if (!p) return res.json({ success: true });
    await p.request().input('id', sql.Int, req.params.id).query('UPDATE ForumAnswers SET upvotes = upvotes + 1 WHERE id=@id');
    res.json({ success: true });
  } catch (e) {
    res.json({ success: false, message: e.message });
  }
});

app.post('/api/forum/:id/solve', authenticateToken, async (req, res) => {
  try {
    const { answer_id } = req.body;
    const p = await getPool();
    if (!p) return res.json({ success: true });
    await p.request().input('id', sql.Int, req.params.id).query('UPDATE ForumQuestions SET is_solved = 1 WHERE id=@id');
    if(answer_id) {
       await p.request().input('aid', sql.Int, answer_id).query('UPDATE ForumAnswers SET is_accepted = 1 WHERE id=@aid');
       // Kabul edilen cevabın sahibine +50 puan
       const rA = await p.request().input('aid', sql.Int, answer_id).query('SELECT author_tc FROM ForumAnswers WHERE id=@aid');
       if(rA.recordset.length > 0) {
          await p.request().input('tc', sql.NVarChar, rA.recordset[0].author_tc).query('UPDATE Users SET points = points + 50 WHERE tc=@tc');
       }
    }
    res.json({ success: true });
  } catch (e) {
    res.json({ success: false, message: e.message });
  }
});
`;

if(!code.includes("FORUM API")) {
  // Inject before module.exports or at the end
  code = code + '\n' + apiEndpoints;
  fs.writeFileSync('server.js', code);
  console.log('API Injected successfully');
} else {
  console.log('Already exists');
}
