const sql     = require('mssql');
const bcrypt  = require('bcryptjs');
const helmet  = require('helmet');

const app = express();
app.use(helmet({
  contentSecurityPolicy: false, // Yerel dosyalara erişim için
}));
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(__dirname));

// ─── MSSQL KONFİGÜRASYON ──────────────────────────────────────────
const DB_CONFIG = {
  user:     'sa',
  password: '123456',
  server:   'localhost',
  database: 'EBA_DB',
  options: {
    encrypt:              false,
    trustServerCertificate: true,
    enableArithAbort:     true
  },
  pool: {
    max: 10, min: 0,
    idleTimeoutMillis: 30000
  }
};

let pool = null;

async function getPool() {
  if (pool) {
    try { await pool.request().query('SELECT 1'); return pool; } catch(e) { pool = null; }
  }
  pool = await sql.connect(DB_CONFIG);
  return pool;
}

// ─── TABLOLARI OLUŞTUR ────────────────────────────────────────────
async function setupTables() {
  const p = await getPool();
  const queries = [
    // 1. KULLANICILAR
    `IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Users' AND xtype='U')
     CREATE TABLE Users (
       id         INT IDENTITY(1,1) PRIMARY KEY,
       tc         NVARCHAR(11)  NOT NULL UNIQUE,
       password   NVARCHAR(100) NOT NULL,
       role       NVARCHAR(20)  NOT NULL,
       name       NVARCHAR(100),
       school     NVARCHAR(200),
       class      NVARCHAR(50),
       branch     NVARCHAR(100),
       level      NVARCHAR(50),
       veliTc     NVARCHAR(11),
       profilePic NVARCHAR(MAX),
       grade_avg  FLOAT DEFAULT 0,
       isOnline   BIT   DEFAULT 0,
       lastSeen   DATETIME,
       createdAt  DATETIME DEFAULT GETDATE()
     )`,

    // 6. ÖDEVLER
    `IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Assignments' AND xtype='U')
     CREATE TABLE Assignments (
       id           INT IDENTITY(1,1) PRIMARY KEY,
       teacher_tc   NVARCHAR(11),
       teacher_name NVARCHAR(100),
       title        NVARCHAR(200) NOT NULL,
       subject      NVARCHAR(100),
       description  NVARCHAR(MAX),
       due_date     NVARCHAR(50),
       target_class NVARCHAR(50),
       school       NVARCHAR(200),
       file_name    NVARCHAR(200),
       file_data    NVARCHAR(MAX),
       assignment_type NVARCHAR(50) DEFAULT 'Metin',
       createdAt    DATETIME DEFAULT GETDATE()
     )
     ELSE
     BEGIN
       IF NOT COLUMNPROPERTY(OBJECT_ID('Assignments'), 'file_name', 'ColumnId') IS NOT NULL
         ALTER TABLE Assignments ADD file_name NVARCHAR(200), file_data NVARCHAR(MAX), assignment_type NVARCHAR(50) DEFAULT 'Metin';
     END`,

    // 2. PAYLAŞIMLAR / FEED (Updated with event fields)
    `IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Posts' AND xtype='U')
     CREATE TABLE Posts (
       id           INT IDENTITY(1,1) PRIMARY KEY,
       author_tc    NVARCHAR(11),
       author_name  NVARCHAR(100),
       type         NVARCHAR(30) DEFAULT 'İleti',
       content      NVARCHAR(MAX),
       file_name    NVARCHAR(200),
       file_data    NVARCHAR(MAX),
       target_group NVARCHAR(50) DEFAULT 'all',
       school       NVARCHAR(200),
       poll_options NVARCHAR(MAX),
       event_title  NVARCHAR(200),
       event_start  NVARCHAR(50),
       event_end    NVARCHAR(50),
       createdAt    DATETIME DEFAULT GETDATE()
     )
     ELSE
     BEGIN
       IF NOT COLUMNPROPERTY(OBJECT_ID('Posts'), 'event_title', 'ColumnId') IS NOT NULL
         ALTER TABLE Posts ADD event_title NVARCHAR(200), event_start NVARCHAR(50), event_end NVARCHAR(50);
     END`,

    // 7. KULLANICI TERCİHLERİ / AYARLAR
    `IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='UserPrefs' AND xtype='U')
     CREATE TABLE UserPrefs (
       tc       NVARCHAR(11) PRIMARY KEY,
       theme    NVARCHAR(20) DEFAULT 'light',
       notifications BIT DEFAULT 1,
       sound    BIT DEFAULT 1,
       visible  BIT DEFAULT 1,
       updatedAt DATETIME DEFAULT GETDATE()
     )`,

    // 8. ÖĞRENCİ İSTATİSTİKLERİ (EBA'da Ne Yaptın?)
    `IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='StudentStats' AND xtype='U')
     CREATE TABLE StudentStats (
       id            INT IDENTITY(1,1) PRIMARY KEY,
       student_tc    NVARCHAR(11) NOT NULL UNIQUE,
       content_count INT DEFAULT 0,
       exam_count    INT DEFAULT 0,
       social_count  INT DEFAULT 0,
       video_minutes INT DEFAULT 0,
       week_start    DATETIME DEFAULT GETDATE(),
       updatedAt     DATETIME DEFAULT GETDATE()
     )`,

    // 9. İZLENEN VİDEOLAR
    `IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='WatchedVideos' AND xtype='U')
     CREATE TABLE WatchedVideos (
       id         INT IDENTITY(1,1) PRIMARY KEY,
       student_tc NVARCHAR(11) NOT NULL,
       title      NVARCHAR(200),
       subject    NVARCHAR(100),
       duration   INT DEFAULT 0,
       watchedAt  DATETIME DEFAULT GETDATE()
     )`,

    // 10. AKTİVİTE LOGU (tüm olaylar)
    `IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='ActivityLogs' AND xtype='U')
     CREATE TABLE ActivityLogs (
       id         INT IDENTITY(1,1) PRIMARY KEY,
       user_tc    NVARCHAR(11) NOT NULL,
       event_type NVARCHAR(50) NOT NULL,
       event_desc NVARCHAR(500),
       duration   INT DEFAULT 0,
       createdAt  DATETIME DEFAULT GETDATE()
     )`,

    // 11. AYARLAR DEĞİŞİKLİK LOGU
    `IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='SettingsChanges' AND xtype='U')
     CREATE TABLE SettingsChanges (
       id         INT IDENTITY(1,1) PRIMARY KEY,
       user_tc    NVARCHAR(11) NOT NULL,
       field      NVARCHAR(100),
       old_value  NVARCHAR(500),
       new_value  NVARCHAR(500),
       changedAt  DATETIME DEFAULT GETDATE()
     )`,

    // 12. YAPILAN TESTLER / SINAVLAR
    `IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='TestResults' AND xtype='U')
     CREATE TABLE TestResults (
       id         INT IDENTITY(1,1) PRIMARY KEY,
       student_tc NVARCHAR(11) NOT NULL,
       title      NVARCHAR(200),
       subject    NVARCHAR(100),
       score      FLOAT DEFAULT 0,
       total      INT DEFAULT 0,
       duration   INT DEFAULT 0,
       takenAt    DATETIME DEFAULT GETDATE()
     )`
  ];

  for (const q of queries) {
    try { await p.request().query(q); } catch(e) { console.warn('Tablo hatası:', e.message); }
  }
  console.log('✅ Tüm tablolar hazır.');
}

// ─── BAŞLANGIÇ ────────────────────────────────────────────────────────
(async () => {
  console.log('🔌 MSSQL bağlantısı deneniyor: sa@localhost/EBA_DB ...');
  try {
    await getPool();
    await setupTables();
    console.log('✅ MSSQL bağlantısı BAŞARILI! EBA_DB hazır.');
  } catch(err) {
    console.error('❌ MSSQL bağlantısı BAŞARISIZ:', err.message);
    process.exit(1);
  }
})();

// ─── DB GÖRÜNTÜLEYICI ─────────────────────────────────────────────
app.get('/api/db-view', async (req, res) => {
  try {
    const p = await getPool();
    const [users, posts, grades, assignments, liveLessons, notifications, stats, videos, logs, settingsLogs, testResults] = await Promise.all([
      p.request().query('SELECT id,tc,role,name,school,class,grade_avg,isOnline,createdAt FROM Users ORDER BY createdAt DESC'),
      p.request().query('SELECT id,author_tc,author_name,type,content,file_name,target_group,school,createdAt FROM Posts ORDER BY createdAt DESC'),
      p.request().query('SELECT id,student_tc,teacher_tc,subject,grade,note,createdAt FROM Grades ORDER BY createdAt DESC'),
      p.request().query('SELECT id,teacher_tc,teacher_name,title,subject,due_date,target_class,school,createdAt FROM Assignments ORDER BY createdAt DESC'),
      p.request().query('SELECT id,teacher_tc,teacher_name,title,link,lesson_date,lesson_time,target_class,school,createdAt FROM LiveLessons ORDER BY createdAt DESC'),
      p.request().query('SELECT id,receiver_tc,text,isRead,createdAt FROM Notifications ORDER BY createdAt DESC'),
      p.request().query('SELECT * FROM StudentStats ORDER BY updatedAt DESC'),
      p.request().query('SELECT id,student_tc,title,subject,duration,watchedAt FROM WatchedVideos ORDER BY watchedAt DESC'),
      p.request().query('SELECT id,user_tc,event_type,event_desc,duration,createdAt FROM ActivityLogs ORDER BY createdAt DESC'),
      p.request().query('SELECT id,user_tc,field,old_value,new_value,changedAt FROM SettingsChanges ORDER BY changedAt DESC'),
      p.request().query('SELECT id,student_tc,title,subject,score,total,duration,takenAt FROM TestResults ORDER BY takenAt DESC'),
    ]);
    res.json({
      success: true, mode: 'mssql',
      db: {
        users:          users.recordset,
        posts:          posts.recordset,
        grades:         grades.recordset,
        assignments:    assignments.recordset,
        liveLessons:    liveLessons.recordset,
        notifications:  notifications.recordset,
        studentStats:   stats.recordset,
        watchedVideos:  videos.recordset,
        activityLogs:   logs.recordset,
        settingsChanges:settingsLogs.recordset,
        testResults:    testResults.recordset,
      }
    });
  } catch(err) {
    res.status(500).json({ success: false, message: 'MSSQL hatası: ' + err.message });
  }
});

// ─── REGISTER ─────────────────────────────────────────────────────
app.post('/api/register', async (req, res) => {
  const { tc, password, role, name, school, classNum, veliTc, branch, level } = req.body;
  if (!tc || !password || !role)
    return res.status(400).json({ success: false, message: 'TC, şifre ve rol zorunludur.' });

  try {
    const p = await getPool();
    const check = await p.request()
      .input('tc', sql.NVarChar, tc)
      .query('SELECT tc FROM Users WHERE tc=@tc');
    if (check.recordset.length > 0)
      return res.status(400).json({ success: false, message: 'Bu TC ile kayıt mevcut.' });

    // Şifreyi Hashle
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    await p.request()
      .input('tc',     sql.NVarChar, tc)
      .input('pwd',    sql.NVarChar, hashedPassword)
      .input('role',   sql.NVarChar, role)
      .input('name',   sql.NVarChar, name     || '')
      .input('school', sql.NVarChar, school   || '')
      .input('cls',    sql.NVarChar, classNum || '')
      .input('branch', sql.NVarChar, req.body.branch  || '')
      .input('level',  sql.NVarChar, level    || '')
      .input('veli',   sql.NVarChar, veliTc   || '')
      .query(`INSERT INTO Users(tc,password,role,name,school,class,branch,level,veliTc)
              VALUES(@tc,@pwd,@role,@name,@school,@cls,@branch,@level,@veli)`);

    // Öğrenci ise StudentStats kaydı oluştur
    if (role === 'ogrenci') {
      try {
        await p.request()
          .input('tc', sql.NVarChar, tc)
          .query(`IF NOT EXISTS (SELECT 1 FROM StudentStats WHERE student_tc=@tc)
                  INSERT INTO StudentStats(student_tc) VALUES(@tc)`);
      } catch(e) {}
    }

    // Aktivite logu
    await logActivity(p, tc, 'REGISTER', `Yeni kayıt: ${name} (${role})`);

    console.log(`✅ Kayıt: ${tc} (${role}) → MSSQL`);
    res.json({ success: true, message: '✅ Kayıt başarılı!' });
  } catch(err) {
    console.error('Kayıt hatası:', err.message);
    res.status(500).json({ success: false, message: 'Kayıt hatası: ' + err.message });
  }
});

// ─── LOGIN ─────────────────────────────────────────────────────────
app.post('/api/login', async (req, res) => {
  const { tc, password, role } = req.body;
  if (!tc || !password || !role)
    return res.status(400).json({ success: false, message: 'TC, şifre ve rol zorunludur.' });

  try {
    const p = await getPool();
    const result = await p.request()
      .input('tc',   sql.NVarChar, tc)
      .input('role', sql.NVarChar, role)
      .query(`SELECT id,tc,password,role,name,school,class as classNum,
              branch,level,veliTc,grade_avg,profilePic
              FROM Users WHERE tc=@tc AND role=@role`);

    if (!result.recordset.length)
      return res.status(401).json({ success: false, message: 'TC veya rol hatalı!' });

    const user = result.recordset[0];
    
    // Şifre Karşılaştır
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(401).json({ success: false, message: 'Hatalı şifre!' });

    // Şifreyi user nesnesinden çıkar
    delete user.password;

    await p.request()
      .input('tc', sql.NVarChar, tc)
      .query('UPDATE Users SET isOnline=1, lastSeen=GETDATE() WHERE tc=@tc');

    // Öğrenci ise StudentStats kaydını garanti et
    if (role === 'ogrenci') {
      try {
        await p.request()
          .input('tc', sql.NVarChar, tc)
          .query(`IF NOT EXISTS (SELECT 1 FROM StudentStats WHERE student_tc=@tc)
                  INSERT INTO StudentStats(student_tc) VALUES(@tc)`);
      } catch(e) {}
    }

    await logActivity(p, tc, 'LOGIN', `Giriş yapıldı (${role})`);

    console.log(`✅ Login: ${tc} (${role})`);
    res.json({ success: true, user, token: 'eba-' + Date.now() });
  } catch(err) {
    console.error('Login hatası:', err.message);
    res.status(500).json({ success: false, message: 'Giriş hatası: ' + err.message });
  }
});

// ─── LOGOUT ────────────────────────────────────────────────────────
app.post('/api/logout', async (req, res) => {
  const { tc } = req.body;
  try {
    const p = await getPool();
    await p.request()
      .input('tc', sql.NVarChar, tc)
      .query('UPDATE Users SET isOnline=0, lastSeen=GETDATE() WHERE tc=@tc');
    await logActivity(p, tc, 'LOGOUT', 'Çıkış yapıldı');
    res.json({ success: true });
  } catch(err) { res.status(500).json({ success: false, message: err.message }); }
});

// ─── HEARTBEAT (Nabız) ───────────────────────────────────────────
app.post('/api/heartbeat', async (req, res) => {
  const { tc } = req.body;
  if (!tc) return res.json({ success: false });
  try {
    const p = await getPool();
    await p.request()
      .input('tc', sql.NVarChar, tc)
      .query('UPDATE Users SET isOnline=1, lastSeen=GETDATE() WHERE tc=@tc');
    res.json({ success: true });
  } catch(e) { res.json({ success: false }); }
});

// ─── USERS ────────────────────────────────────────────────────────
app.get('/api/users', async (req, res) => {
  const { school, role } = req.query;
  try {
    const p = await getPool();
    const req2 = p.request();
    // Dinamik çevrim içi kontrolü (son 3 dakika)
    let q = `
      SELECT id, tc, role, name, school, class as classNum, grade_avg, veliTc,
      CASE 
        WHEN isOnline = 1 AND lastSeen > DATEADD(minute, -3, GETDATE()) THEN 1 
        ELSE 0 
      END as isOnline,
      lastSeen
      FROM Users 
      WHERE 1=1`;
    
    if (school) { q += ' AND school=@school'; req2.input('school', sql.NVarChar, school); }
    if (role)   { q += ' AND role=@role';     req2.input('role',   sql.NVarChar, role);   }
    q += ' ORDER BY name';
    const result = await req2.query(q);
    res.json({ success: true, users: result.recordset });
  } catch(err) { res.status(500).json({ success: false, message: err.message }); }
});

// ─── PROFİL GÜNCELLE ─────────────────────────────────────────────
app.put('/api/update-profile', async (req, res) => {
  const { tc, name, school, class: cls, profilePic } = req.body;
  if (!tc) return res.status(400).json({ success: false, message: 'TC zorunludur.' });
  try {
    const p = await getPool();

    // Eski değeri al
    const old = await p.request().input('tc', sql.NVarChar, tc)
      .query('SELECT name,school,class FROM Users WHERE tc=@tc');

    await p.request()
      .input('tc',     sql.NVarChar, tc)
      .input('name',   sql.NVarChar, name   || '')
      .input('school', sql.NVarChar, school || '')
      .input('cls',    sql.NVarChar, cls    || '')
      .input('pic',    sql.NVarChar, profilePic || '')
      .query('UPDATE Users SET name=@name, school=@school, class=@cls, profilePic=@pic WHERE tc=@tc');

    // --- CASCADING UPDATES FOR NAME CONSISTENCY ---
    // Update name in Posts
    await p.request()
      .input('tc', sql.NVarChar, tc)
      .input('newName', sql.NVarChar, name)
      .query('UPDATE Posts SET author_name=@newName WHERE author_tc=@tc');

    // Update name in Assignments
    await p.request()
      .input('tc', sql.NVarChar, tc)
      .input('newName', sql.NVarChar, name)
      .query('UPDATE Assignments SET teacher_name=@newName WHERE teacher_tc=@tc');

    // Update name in LiveLessons
    await p.request()
      .input('tc', sql.NVarChar, tc)
      .input('newName', sql.NVarChar, name)
      .query('UPDATE LiveLessons SET teacher_name=@newName WHERE teacher_tc=@tc');

    // Değişiklik logla
    if (old.recordset.length) {
      const o = old.recordset[0];
      if (o.name !== name)   await logSettings(p, tc, 'Ad Soyad', o.name, name);
      if (o.school !== school) await logSettings(p, tc, 'Okul', o.school, school);
      if (o.class !== cls)   await logSettings(p, tc, 'Sınıf/Branş', o.class, cls);
    }

    await logActivity(p, tc, 'PROFILE_UPDATE', `Profil güncellendi: ${name}`);
    res.json({ success: true, message: 'Profil güncellendi.' });
  } catch(err) { res.status(500).json({ success: false, message: err.message }); }
});

// ─── ŞİFRE DEĞİŞTİR ─────────────────────────────────────────────
app.post('/api/change-password', async (req, res) => {
  const { tc, oldPassword, newPassword } = req.body;
  try {
    const p = await getPool();
    const check = await p.request()
      .input('tc',  sql.NVarChar, tc)
      .query('SELECT password FROM Users WHERE tc=@tc');
    
    if (!check.recordset.length)
      return res.status(404).json({ success: false, message: 'Kullanıcı bulunamadı.' });

    // Mevcut şifreyi doğrula
    const isMatch = await bcrypt.compare(oldPassword, check.recordset[0].password);
    if (!isMatch)
      return res.status(401).json({ success: false, message: 'Mevcut şifre hatalı.' });

    // Yeni şifreyi Hashle
    const salt = await bcrypt.genSalt(10);
    const newHashedPassword = await bcrypt.hash(newPassword, salt);

    await p.request()
      .input('tc',  sql.NVarChar, tc)
      .input('pwd', sql.NVarChar, newHashedPassword)
      .query('UPDATE Users SET password=@pwd WHERE tc=@tc');
    await logSettings(p, tc, 'Şifre', '***', '***');
    await logActivity(p, tc, 'PASSWORD_CHANGE', 'Şifre değiştirildi');
    res.json({ success: true, message: 'Şifre güncellendi.' });
  } catch(err) { res.status(500).json({ success: false, message: err.message }); }
});

// ─── POSTS ────────────────────────────────────────────────────────
app.post('/api/posts', async (req, res) => {
  const { author_tc, author_name, type, content, file_name, file_data, target_group, school, poll_options, event_title, event_start, event_end } = req.body;
  try {
    const p = await getPool();
    await p.request()
      .input('atc',   sql.NVarChar, author_tc   || '')
      .input('aname', sql.NVarChar, author_name || '')
      .input('type',  sql.NVarChar, type        || 'İleti')
      .input('cont',  sql.NVarChar, content     || '')
      .input('fname', sql.NVarChar, file_name   || '')
      .input('fdata', sql.NVarChar, file_data   || '')
      .input('tg',    sql.NVarChar, target_group|| 'all')
      .input('school',sql.NVarChar, school      || '')
      .input('poll',  sql.NVarChar, JSON.stringify(poll_options||[]))
      .input('etitle',sql.NVarChar, event_title  || '')
      .input('estart',sql.NVarChar, event_start  || '')
      .input('eend',  sql.NVarChar, event_end    || '')
      .query(`INSERT INTO Posts(author_tc,author_name,type,content,file_name,file_data,target_group,school,poll_options,event_title,event_start,event_end)
              VALUES(@atc,@aname,@type,@cont,@fname,@fdata,@tg,@school,@poll,@etitle,@estart,@eend)`);

    // Sosyal paylaşım istatistiği güncelle
    if (author_tc) {
      try {
        await p.request().input('tc', sql.NVarChar, author_tc)
          .query(`IF EXISTS(SELECT 1 FROM StudentStats WHERE student_tc=@tc)
                  UPDATE StudentStats SET social_count=social_count+1, updatedAt=GETDATE() WHERE student_tc=@tc`);
        await logActivity(p, author_tc, 'SOCIAL_POST', `${type} paylaşıldı: ${(content||'').slice(0,80)}`);
      } catch(e) {}
    }

    res.json({ success: true });
  } catch(err) { res.status(500).json({ success: false, message: err.message }); }
});

app.get('/api/posts', async (req, res) => {
  const { school, group, userClass } = req.query;
  try {
    const p = await getPool();
    const result = await p.request()
      .input('school', sql.NVarChar, school    || '')
      .input('group',  sql.NVarChar, group     || '')
      .input('cls',    sql.NVarChar, userClass || '')
      .query(`SELECT * FROM Posts
              WHERE school=@school
              AND (target_group='all' OR target_group=@group OR target_group=@cls OR target_group='veliler')
              ORDER BY createdAt DESC`);
    // poll_options JSON parse
    const posts = result.recordset.map(p => {
      if (typeof p.poll_options === 'string' && p.poll_options) {
        try { p.poll_options = JSON.parse(p.poll_options); } catch(e) { p.poll_options = []; }
      }
      return p;
    });
    res.json({ success: true, posts });
  } catch(err) { res.status(500).json({ success: false, message: err.message }); }
});

// ─── BİLDİRİMLER ─────────────────────────────────────────────────
app.post('/api/notifications', async (req, res) => {
  const { receiver_tc, text } = req.body;
  try {
    const p = await getPool();
    await p.request()
      .input('tc',   sql.NVarChar, receiver_tc || '')
      .input('text', sql.NVarChar, text        || '')
      .query('INSERT INTO Notifications(receiver_tc,text) VALUES(@tc,@text)');
    res.json({ success: true });
  } catch(err) { res.status(500).json({ success: false, message: err.message }); }
});

app.get('/api/notifications', async (req, res) => {
  const { tc } = req.query;
  try {
    const p = await getPool();
    const result = await p.request()
      .input('tc', sql.NVarChar, tc || '')
      .query('SELECT * FROM Notifications WHERE receiver_tc=@tc ORDER BY createdAt DESC');
    res.json({ success: true, notifications: result.recordset });
  } catch(err) { res.status(500).json({ success: false, message: err.message }); }
});

app.put('/api/notifications/read', async (req, res) => {
  const { tc } = req.body;
  try {
    const p = await getPool();
    await p.request()
      .input('tc', sql.NVarChar, tc || '')
      .query('UPDATE Notifications SET isRead=1 WHERE receiver_tc=@tc');
    res.json({ success: true });
  } catch(err) { res.status(500).json({ success: false, message: err.message }); }
});

// ─── CANLI DERSLER ────────────────────────────────────────────────
app.post('/api/live-lessons', async (req, res) => {
  const { teacher_tc, teacher_name, title, link, lesson_date, lesson_time, target_class, school } = req.body;
  try {
    const p = await getPool();
    await p.request()
      .input('ttc',   sql.NVarChar, teacher_tc   || '')
      .input('tname', sql.NVarChar, teacher_name || '')
      .input('title', sql.NVarChar, title        || '')
      .input('link',  sql.NVarChar, link         || '')
      .input('date',  sql.NVarChar, lesson_date  || '')
      .input('time',  sql.NVarChar, lesson_time  || '')
      .input('cls',   sql.NVarChar, target_class || 'all')
      .input('school',sql.NVarChar, school       || '')
      .query(`INSERT INTO LiveLessons(teacher_tc,teacher_name,title,link,lesson_date,lesson_time,target_class,school)
              VALUES(@ttc,@tname,@title,@link,@date,@time,@cls,@school)`);
    await logActivity(p, teacher_tc, 'LIVE_LESSON_CREATE', `Canlı ders oluşturuldu: ${title}`);
    console.log(`✅ Canlı ders eklendi: ${title}`);
    res.json({ success: true });
  } catch(err) { res.status(500).json({ success: false, message: err.message }); }
});

app.get('/api/live-lessons', async (req, res) => {
  const { school, userClass } = req.query;
  try {
    const p = await getPool();
    const result = await p.request()
      .input('school', sql.NVarChar, school    || '')
      .input('cls',    sql.NVarChar, userClass || '')
      .query(`SELECT * FROM LiveLessons
              WHERE school=@school
              AND (target_class='all' OR target_class=@cls)
              ORDER BY createdAt DESC`);
    res.json({ success: true, lessons: result.recordset });
  } catch(err) { res.status(500).json({ success: false, message: err.message }); }
});

// ─── NOTLAR ───────────────────────────────────────────────────────
app.post('/api/grades', async (req, res) => {
  const { student_tc, teacher_tc, subject, grade, note } = req.body;
  try {
    const p = await getPool();
    await p.request()
      .input('stc',   sql.NVarChar, student_tc  || '')
      .input('ttc',   sql.NVarChar, teacher_tc  || '')
      .input('subj',  sql.NVarChar, subject     || '')
      .input('grade', sql.Float,    grade       || 0)
      .input('note',  sql.NVarChar, note        || '')
      .query('INSERT INTO Grades(student_tc,teacher_tc,subject,grade,note) VALUES(@stc,@ttc,@subj,@grade,@note)');

    // Ortalama güncelle
    const avgRes = await p.request()
      .input('tc', sql.NVarChar, student_tc || '')
      .query('SELECT AVG(grade) as avg FROM Grades WHERE student_tc=@tc');
    const avg = Math.round((avgRes.recordset[0]?.avg || 0) * 10) / 10;
    await p.request()
      .input('tc',  sql.NVarChar, student_tc || '')
      .input('avg', sql.Float,    avg)
      .query('UPDATE Users SET grade_avg=@avg WHERE tc=@tc');

    await logActivity(p, teacher_tc, 'GRADE_ENTRY', `Not girildi: ${student_tc} → ${subject}: ${grade}`);

    res.json({ success: true, avg });
  } catch(err) { res.status(500).json({ success: false, message: err.message }); }
});

app.get('/api/grades', async (req, res) => {
  const { student_tc } = req.query;
  try {
    const p = await getPool();
    const result = await p.request()
      .input('tc', sql.NVarChar, student_tc || '')
      .query('SELECT * FROM Grades WHERE student_tc=@tc ORDER BY createdAt DESC');
    res.json({ success: true, grades: result.recordset });
  } catch(err) { res.status(500).json({ success: false, message: err.message }); }
});

// ─── ÖDEVLER ──────────────────────────────────────────────────────
app.post('/api/assignments', async (req, res) => {
  const { teacher_tc, teacher_name, title, subject, description, due_date, target_class, school, file_name, file_data, assignment_type } = req.body;
  try {
    const p = await getPool();
    await p.request()
      .input('ttc',   sql.NVarChar, teacher_tc   || '')
      .input('tname', sql.NVarChar, teacher_name || '')
      .input('title', sql.NVarChar, title        || '')
      .input('subj',  sql.NVarChar, subject      || '')
      .input('desc',  sql.NVarChar, description  || '')
      .input('due',   sql.NVarChar, due_date     || '')
      .input('cls',   sql.NVarChar, target_class || 'all')
      .input('school',sql.NVarChar, school       || '')
      .input('fname', sql.NVarChar, file_name    || '')
      .input('fdata', sql.NVarChar, file_data    || '')
      .input('atype', sql.NVarChar, assignment_type || 'Metin')
      .query(`INSERT INTO Assignments(teacher_tc,teacher_name,title,subject,description,due_date,target_class,school,file_name,file_data,assignment_type)
              VALUES(@ttc,@tname,@title,@subj,@desc,@due,@cls,@school,@fname,@fdata,@atype)`);
    await logActivity(p, teacher_tc, 'ASSIGNMENT_SEND', `Ödev gönderildi: ${title} → ${target_class||'all'}`);
    res.json({ success: true });
  } catch(err) { res.status(500).json({ success: false, message: err.message }); }
});

app.get('/api/assignments', async (req, res) => {
  const { school, userClass, teacher_tc } = req.query;
  try {
    const p = await getPool();
    const req2 = p.request();
    let q = `SELECT * FROM Assignments WHERE 1=1`;
    if (school) { q += ' AND school=@school'; req2.input('school', sql.NVarChar, school); }
    if (userClass) { q += ' AND (target_class=\'all\' OR target_class=@cls)'; req2.input('cls', sql.NVarChar, userClass); }
    if (teacher_tc) { q += ' AND teacher_tc=@ttc'; req2.input('ttc', sql.NVarChar, teacher_tc); }
    q += ' ORDER BY createdAt DESC';
    const result = await req2.query(q);
    res.json({ success: true, assignments: result.recordset });
  } catch(err) { res.status(500).json({ success: false, message: err.message }); }
});

// ─── AYARLAR / TERCİHLER ─────────────────────────────────────────
app.get('/api/prefs', async (req, res) => {
  const { tc } = req.query;
  try {
    const p = await getPool();
    const r = await p.request()
      .input('tc', sql.NVarChar, tc || '')
      .query('SELECT * FROM UserPrefs WHERE tc=@tc');
    res.json({ success: true, prefs: r.recordset[0] || { theme:'light', notifications:1, sound:1, visible:1 } });
  } catch(err) { res.status(500).json({ success: false, message: err.message }); }
});

app.post('/api/prefs', async (req, res) => {
  const { tc, theme, notifications, sound, visible } = req.body;
  try {
    const p = await getPool();

    // Eski tercihler
    const old = await p.request().input('tc', sql.NVarChar, tc)
      .query('SELECT * FROM UserPrefs WHERE tc=@tc');
    const oldPrefs = old.recordset[0];

    await p.request()
      .input('tc',   sql.NVarChar, tc)
      .input('theme',sql.NVarChar, theme || 'light')
      .input('notif',sql.Bit, notifications === false ? 0 : 1)
      .input('sound',sql.Bit, sound       === false ? 0 : 1)
      .input('vis',  sql.Bit, visible     === false ? 0 : 1)
      .query(`IF EXISTS(SELECT 1 FROM UserPrefs WHERE tc=@tc)
                UPDATE UserPrefs SET theme=@theme,notifications=@notif,sound=@sound,visible=@vis,updatedAt=GETDATE() WHERE tc=@tc
              ELSE
                INSERT INTO UserPrefs(tc,theme,notifications,sound,visible) VALUES(@tc,@theme,@notif,@sound,@vis)`);

    // Değişiklik logla
    if (oldPrefs) {
      if (oldPrefs.theme !== (theme||'light'))
        await logSettings(p, tc, 'Tema', oldPrefs.theme, theme||'light');
      const newNotif = notifications === false ? 0 : 1;
      const newSound = sound === false ? 0 : 1;
      const newVis   = visible === false ? 0 : 1;
      if (oldPrefs.notifications !== newNotif)
        await logSettings(p, tc, 'Bildirimler', oldPrefs.notifications?'Açık':'Kapalı', newNotif?'Açık':'Kapalı');
      if (oldPrefs.sound !== newSound)
        await logSettings(p, tc, 'Ses Efektleri', oldPrefs.sound?'Açık':'Kapalı', newSound?'Açık':'Kapalı');
      if (oldPrefs.visible !== newVis)
        await logSettings(p, tc, 'Profil Görünürlüğü', oldPrefs.visible?'Görünür':'Gizli', newVis?'Görünür':'Gizli');
    }

    await logActivity(p, tc, 'SETTINGS_CHANGE', `Tercihler güncellendi: tema=${theme}`);
    res.json({ success: true });
  } catch(err) { res.status(500).json({ success: false, message: err.message }); }
});

// ─── ÖĞRENCİ İSTATİSTİKLERİ ─────────────────────────────────────
app.get('/api/student-stats', async (req, res) => {
  const { student_tc } = req.query;
  try {
    const p = await getPool();

    // Haftalık sıfırlama kontrolü
    const r = await p.request()
      .input('tc', sql.NVarChar, student_tc || '')
      .query('SELECT * FROM StudentStats WHERE student_tc=@tc');

    if (!r.recordset.length) {
      // Yeni kayıt oluştur
      await p.request().input('tc', sql.NVarChar, student_tc)
        .query('INSERT INTO StudentStats(student_tc) VALUES(@tc)');
      return res.json({ success: true, stats: { content_count:0, exam_count:0, social_count:0, video_minutes:0 } });
    }

    let stats = r.recordset[0];
    const weekAgo = new Date(Date.now() - 7*24*60*60*1000);
    if (stats.week_start && new Date(stats.week_start) < weekAgo) {
      await p.request().input('tc', sql.NVarChar, student_tc)
        .query(`UPDATE StudentStats
                SET content_count=0, exam_count=0, social_count=0, video_minutes=0,
                    week_start=GETDATE(), updatedAt=GETDATE()
                WHERE student_tc=@tc`);
      stats = { content_count:0, exam_count:0, social_count:0, video_minutes:0 };
    }

    res.json({ success: true, stats });
  } catch(err) { res.status(500).json({ success: false, message: err.message }); }
});

app.post('/api/student-stats', async (req, res) => {
  const { student_tc, type, value } = req.body;
  // type: 'content' | 'exam' | 'social' | 'video'
  // value: opsiyonel (video için dakika sayısı)
  try {
    const p = await getPool();
    const ensure = await p.request().input('tc', sql.NVarChar, student_tc)
      .query('SELECT 1 FROM StudentStats WHERE student_tc=@tc');
    if (!ensure.recordset.length)
      await p.request().input('tc', sql.NVarChar, student_tc)
        .query('INSERT INTO StudentStats(student_tc) VALUES(@tc)');

    let colExpr = '';
    if (type === 'content') colExpr = 'content_count=content_count+1';
    else if (type === 'exam')    colExpr = 'exam_count=exam_count+1';
    else if (type === 'social')  colExpr = 'social_count=social_count+1';
    else if (type === 'video')   colExpr = `video_minutes=video_minutes+${parseInt(value)||1}`;

    if (colExpr) {
      await p.request().input('tc', sql.NVarChar, student_tc)
        .query(`UPDATE StudentStats SET ${colExpr}, updatedAt=GETDATE() WHERE student_tc=@tc`);
    }

    res.json({ success: true });
  } catch(err) { res.status(500).json({ success: false, message: err.message }); }
});

// ─── İZLENEN VİDEOLAR ────────────────────────────────────────────
app.post('/api/watched-videos', async (req, res) => {
  const { student_tc, title, subject, duration } = req.body;
  try {
    const p = await getPool();
    await p.request()
      .input('tc',      sql.NVarChar, student_tc || '')
      .input('title',   sql.NVarChar, title      || '')
      .input('subject', sql.NVarChar, subject    || '')
      .input('dur',     sql.Int,      parseInt(duration)||0)
      .query('INSERT INTO WatchedVideos(student_tc,title,subject,duration) VALUES(@tc,@title,@subject,@dur)');

    // Video dakikalarını güncelle
    if (duration > 0) {
      try {
        await p.request().input('tc', sql.NVarChar, student_tc).input('dur', sql.Int, parseInt(duration))
          .query(`IF EXISTS(SELECT 1 FROM StudentStats WHERE student_tc=@tc)
                  UPDATE StudentStats SET video_minutes=video_minutes+@dur, updatedAt=GETDATE() WHERE student_tc=@tc`);
      } catch(e) {}
    }

    await logActivity(p, student_tc, 'VIDEO_WATCH', `Video izlendi: ${title} (${subject}) - ${duration} dk`);
    res.json({ success: true });
  } catch(err) { res.status(500).json({ success: false, message: err.message }); }
});

app.get('/api/watched-videos', async (req, res) => {
  const { student_tc } = req.query;
  try {
    const p = await getPool();
    const result = await p.request()
      .input('tc', sql.NVarChar, student_tc || '')
      .query('SELECT * FROM WatchedVideos WHERE student_tc=@tc ORDER BY watchedAt DESC');
    res.json({ success: true, videos: result.recordset });
  } catch(err) { res.status(500).json({ success: false, message: err.message }); }
});

// ─── TEST / SINAV SONUÇLARI ───────────────────────────────────────
app.post('/api/test-results', async (req, res) => {
  const { student_tc, title, subject, score, total, duration } = req.body;
  try {
    const p = await getPool();
    await p.request()
      .input('tc',      sql.NVarChar, student_tc || '')
      .input('title',   sql.NVarChar, title      || '')
      .input('subject', sql.NVarChar, subject    || '')
      .input('score',   sql.Float,    parseFloat(score)||0)
      .input('total',   sql.Int,      parseInt(total)||0)
      .input('dur',     sql.Int,      parseInt(duration)||0)
      .query('INSERT INTO TestResults(student_tc,title,subject,score,total,duration) VALUES(@tc,@title,@subject,@score,@total,@dur)');

    // Sınav istatistiği güncelle
    try {
      await p.request().input('tc', sql.NVarChar, student_tc)
        .query(`IF EXISTS(SELECT 1 FROM StudentStats WHERE student_tc=@tc)
                UPDATE StudentStats SET exam_count=exam_count+1, updatedAt=GETDATE() WHERE student_tc=@tc`);
    } catch(e) {}

    await logActivity(p, student_tc, 'TEST_DONE', `Test tamamlandı: ${title} (${score}/${total}) - ${duration} dk`);
    res.json({ success: true });
  } catch(err) { res.status(500).json({ success: false, message: err.message }); }
});

app.get('/api/test-results', async (req, res) => {
  const { student_tc } = req.query;
  try {
    const p = await getPool();
    const result = await p.request()
      .input('tc', sql.NVarChar, student_tc || '')
      .query('SELECT * FROM TestResults WHERE student_tc=@tc ORDER BY takenAt DESC');
    res.json({ success: true, tests: result.recordset });
  } catch(err) { res.status(500).json({ success: false, message: err.message }); }
});

// ─── AKTİVİTE LOGU ───────────────────────────────────────────────
app.get('/api/activity', async (req, res) => {
  const { user_tc, limit } = req.query;
  try {
    const p = await getPool();
    const lim = Math.min(parseInt(limit)||50, 200);
    const req2 = p.request().input('tc', sql.NVarChar, user_tc || '');
    const result = await req2.query(
      `SELECT TOP ${lim} * FROM ActivityLogs WHERE user_tc=@tc ORDER BY createdAt DESC`
    );
    res.json({ success: true, logs: result.recordset });
  } catch(err) { res.status(500).json({ success: false, message: err.message }); }
});

// ─── AYARLAR DEĞİŞİKLİK LOGU ─────────────────────────────────────
app.get('/api/settings-log', async (req, res) => {
  const { user_tc } = req.query;
  try {
    const p = await getPool();
    const result = await p.request()
      .input('tc', sql.NVarChar, user_tc || '')
      .query('SELECT TOP 50 * FROM SettingsChanges WHERE user_tc=@tc ORDER BY changedAt DESC');
    res.json({ success: true, logs: result.recordset });
  } catch(err) { res.status(500).json({ success: false, message: err.message }); }
});

// ─── YARDIMCI FONKSİYONLAR ───────────────────────────────────────
async function logActivity(p, tc, eventType, desc, duration) {
  try {
    await p.request()
      .input('tc',   sql.NVarChar, tc || '')
      .input('type', sql.NVarChar, eventType || '')
      .input('desc', sql.NVarChar, desc || '')
      .input('dur',  sql.Int, duration || 0)
      .query('INSERT INTO ActivityLogs(user_tc,event_type,event_desc,duration) VALUES(@tc,@type,@desc,@dur)');
  } catch(e) { /* log hatalarını yut */ }
}

async function logSettings(p, tc, field, oldVal, newVal) {
  try {
    await p.request()
      .input('tc',  sql.NVarChar, tc || '')
      .input('fld', sql.NVarChar, field   || '')
      .input('old', sql.NVarChar, String(oldVal||''))
      .input('new', sql.NVarChar, String(newVal||''))
      .query('INSERT INTO SettingsChanges(user_tc,field,old_value,new_value) VALUES(@tc,@fld,@old,@new)');
  } catch(e) { /* log hatalarını yut */ }
}

// ─── SUNUCU BAŞLAT ────────────────────────────────────────────────
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`🚀 Sunucu http://localhost:${PORT} üzerinde çalışıyor.`);
  console.log(`🗄️  Veritabanı: MSSQL (sa@localhost/EBA_DB) — Yerel fallback YOK.`);
});
