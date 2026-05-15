const fs = require('fs');

// 1. Server.js API Güncellemesi
const serverFile = 'c:\\Users\\elifs\\OneDrive\\Desktop\\Yeni klasör\\server.js';
let serverTxt = fs.readFileSync(serverFile, 'utf8');

const newApi = `app.get('/api/appointments/teachers', authenticateToken, async (req, res) => {
  try {
    const p = await getPool();
    const teacherR = await p.request().query("SELECT tc, name, branch, school FROM Users WHERE role='ogretmen'");
    const studentR = await p.request().input('vtc', require('mssql').NVarChar, req.user.tc).query("SELECT tc, name FROM Users WHERE veliTc=@vtc AND role='ogrenci'");
    res.json({ success: true, teachers: teacherR.recordset, students: studentR.recordset });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});`;

let lines = serverTxt.split('\n');
let startIdx = lines.findIndex(l => l.includes("app.get('/api/appointments/teachers'"));
if(startIdx !== -1) {
    let endIdx = startIdx;
    let openCount = 0;
    for(let i = startIdx; i < lines.length; i++) {
        if(lines[i].includes('{')) openCount += (lines[i].match(/\{/g) || []).length;
        if(lines[i].includes('}')) openCount -= (lines[i].match(/\}/g) || []).length;
        if(openCount === 0 && i > startIdx) { endIdx = i; break; }
    }
    lines.splice(startIdx, endIdx - startIdx + 1, newApi);
    fs.writeFileSync(serverFile, lines.join('\n'));
    console.log('Server.js teachers API manually updated.');
}

// 2. yarisma.html Shuffle ve Timeout Güncellemesi
const yarismaFile = 'c:\\Users\\elifs\\OneDrive\\Desktop\\Yeni klasör\\yarisma.html';
let yTxt = fs.readFileSync(yarismaFile, 'utf8');

yTxt = yTxt.replace(/setTimeout\(\(\)=>\{\s*if\(document\.getElementById\('waitScreen'\)\.style\.display!==\'none\'\) startSolo\(\);\s*\}, 5000\);/g, 
    "setTimeout(()=>{ if(document.getElementById('waitScreen').style.display!=='none') startSolo(); }, 30000);");

const showQuestionOld = `function showQuestion() {
  if(currentQ>=5){endGame();return;}
  const q = questions[currentQ];
  document.getElementById('qNum').textContent=currentQ+1;
  document.getElementById('progressFill').style.width=(currentQ/5*100)+'%';
  document.getElementById('questionText').textContent=q.q;
  const grid=document.getElementById('optionsGrid');
  grid.innerHTML=q.opts.map((o,i)=>\`<button class="opt-btn" onclick="answer(\${i})" id="opt\${i}">\${String.fromCharCode(65+i)}) \${o}</button>\`).join('');`;

const showQuestionNew = `function showQuestion() {
  if(currentQ>=5){endGame();return;}
  const q = questions[currentQ];
  
  if (!q.displayOpts) {
      let optsWithIndex = q.opts.map((opt, i) => ({ text: opt, isCorrect: i === q.ans }));
      optsWithIndex.sort(() => Math.random() - 0.5);
      q.displayOpts = optsWithIndex.map(o => o.text);
      q.displayAns = optsWithIndex.findIndex(o => o.isCorrect);
  }

  document.getElementById('qNum').textContent=currentQ+1;
  document.getElementById('progressFill').style.width=(currentQ/5*100)+'%';
  document.getElementById('questionText').textContent=q.q;
  const grid=document.getElementById('optionsGrid');
  grid.innerHTML=q.displayOpts.map((o,i)=>\`<button class="opt-btn" onclick="answer(\${i})" id="opt\${i}">\${String.fromCharCode(65+i)}) \${o || 'Cevap'}</button>\`).join('');`;

yTxt = yTxt.replace(showQuestionOld, showQuestionNew);

yTxt = yTxt.replace(/if\(i===q\.ans\) b\.classList\.add\('correct'\);/g, "if(i===(q.displayAns !== undefined ? q.displayAns : q.ans)) b.classList.add('correct');");
yTxt = yTxt.replace(/if\(selected===q\.ans\)/g, "if(selected===(q.displayAns !== undefined ? q.displayAns : q.ans))");

yTxt = yTxt.replace(/const aiAns=Math\.random\(\)<\(difficulty==='Kolay'\?0\.5:difficulty==='Orta'\?0\.65:0\.8\)\?questions\[currentQ\]\.ans:Math\.floor\(Math\.random\(\)\*4\);/g, 
    "const actualAns = questions[currentQ].displayAns !== undefined ? questions[currentQ].displayAns : questions[currentQ].ans; const aiAns=Math.random()<(difficulty==='Kolay'?0.5:difficulty==='Orta'?0.65:0.8)?actualAns:Math.floor(Math.random()*4);");
yTxt = yTxt.replace(/if\(aiAns===questions\[currentQ\]\.ans\)/g, "if(aiAns===actualAns)");

fs.writeFileSync(yarismaFile, yTxt);
console.log("Yarisma.html updated.");
