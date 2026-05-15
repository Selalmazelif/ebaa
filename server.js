const sql     = require('mssql');
const bcrypt  = require('bcryptjs');
const helmet  = require('helmet');
const express = require('express');
const cors    = require('cors');
const jwt     = require('jsonwebtoken');
const http    = require('http');
const axios   = require('axios');
const { Server } = require('socket.io');
require('dotenv').config();

// ─── ICONV-LITE PRE-WARM (OneDrive Fix) ──────────────────────────
try {
  const iconv = require('iconv-lite');
  // Trigger lazy loading of all encodings at startup
  iconv.getCodec('utf8');
  iconv.getCodec('windows-1254');
  iconv.getCodec('iso-8859-9');
  console.log('✅ iconv-lite codecs (UTF8, CP1254, ISO8859-9) pre-warmed.');
} catch (e) {
  console.warn('⚠️ iconv-lite pre-warm warning:', e.message);
}

// Gemini AI kaldırıldı


const JWT_SECRET = 'eba-secret-2026';

// ─── MODERASYON & OYUNLAŞTIRMA YARDIMCILARI ────────────────────────
const badWords = ['küfür1', 'küfür2', 'argo1', 'uygunsuz']; // Örnek liste
function censorText(text) {
  let censored = text;
  badWords.forEach(word => {
    const reg = new RegExp(word, 'gi');
    censored = censored.replace(reg, '***');
  });
  return censored;
}

async function awardPoints(p, tc, amount) {
  try {
    await p.request().input('tc', sql.NVarChar, tc).input('pts', sql.Int, amount)
      .query('UPDATE Users SET points = points + @pts WHERE tc = @tc');
  } catch(e) { console.error('Puan hatası:', e); }
}

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ success: false, message: 'Oturum açmanız gerekiyor.' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ success: false, message: 'Geçersiz veya süresi dolmuş oturum.' });
    req.user = user;
    next();
  });
}

const app = express();
app.use(helmet({
  contentSecurityPolicy: false, // Yerel dosyalara erişim için
}));
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Geliştirme kolaylığı: Tarayıcı önbelleğini devre dışı bırak (F5 yapınca güncel gelsin)
app.use((req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  next();
});

app.use(express.static(__dirname));

// ─── MSSQL KONFİGÜRASYON ──────────────────────────────────────────
const DB_CONFIG = {
  user:     process.env.DB_USER || 'sa',
  password: process.env.DB_PASSWORD || 'Elif1405*',
  server:   process.env.DB_SERVER || 'localhost',
  port:     parseInt(process.env.DB_PORT) || 1433,
  database: process.env.DB_NAME || 'EBA_DB',
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
let isMockMode = false;

async function getPool() {
  if (pool) {
    try {
      await pool.request().query('SELECT 1');
      return pool;
    } catch (e) {
      console.warn('⚠️ Mevcut havuz bozulmuş, yeniden bağlanılıyor...');
      pool = null;
    }
  }
  try {
    pool = await sql.connect(DB_CONFIG);
    console.log('✅ MSSQL Bağlantısı Başarılı');
    isMockMode = false;
    return pool;
  } catch (e) {
    console.error('❌ MSSQL Bağlantı Hatası: ', e.message);
    isMockMode = true;
    return null;
  }
}

// ─── TABLOLARI OLUŞTUR ────────────────────────────────────────────
async function setupTables() {
  const p = await getPool();
  if(!p) {
    console.log('ℹ️ Veritabanı bağlantısı yok, tablo kurulumu atlanıyor.');
    return;
  }
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
       points     INT   DEFAULT 0,
       coins      INT   DEFAULT 0,
       streak     INT   DEFAULT 0,
       last_login DATETIME,
       badges     NVARCHAR(MAX),
       avatar_items NVARCHAR(MAX),
       selected_avatar NVARCHAR(MAX),
       createdAt  DATETIME DEFAULT GETDATE()
     )
     ELSE
     BEGIN
       IF NOT COLUMNPROPERTY(OBJECT_ID('Users'), 'points', 'ColumnId') IS NOT NULL
         ALTER TABLE Users ADD points INT DEFAULT 0;
       IF NOT COLUMNPROPERTY(OBJECT_ID('Users'), 'coins', 'ColumnId') IS NOT NULL
         ALTER TABLE Users ADD coins INT DEFAULT 0;
       IF NOT COLUMNPROPERTY(OBJECT_ID('Users'), 'streak', 'ColumnId') IS NOT NULL
         ALTER TABLE Users ADD streak INT DEFAULT 0;
       IF NOT COLUMNPROPERTY(OBJECT_ID('Users'), 'last_login', 'ColumnId') IS NOT NULL
         ALTER TABLE Users ADD last_login DATETIME;
       IF NOT COLUMNPROPERTY(OBJECT_ID('Users'), 'badges', 'ColumnId') IS NOT NULL
         ALTER TABLE Users ADD badges NVARCHAR(MAX);
       IF NOT COLUMNPROPERTY(OBJECT_ID('Users'), 'avatar_items', 'ColumnId') IS NOT NULL
         ALTER TABLE Users ADD avatar_items NVARCHAR(MAX);
       IF NOT COLUMNPROPERTY(OBJECT_ID('Users'), 'selected_avatar', 'ColumnId') IS NOT NULL
         ALTER TABLE Users ADD selected_avatar NVARCHAR(MAX);
       IF NOT COLUMNPROPERTY(OBJECT_ID('Users'), 'classNum', 'ColumnId') IS NOT NULL
         ALTER TABLE Users ADD classNum NVARCHAR(MAX);
     END`,

    // 2. RANDEVULAR (YENİ EKLENDİ)
    `IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Appointments' AND xtype='U')
     CREATE TABLE Appointments (
       id           INT IDENTITY(1,1) PRIMARY KEY,
       parent_tc    NVARCHAR(11) NOT NULL,
       parent_name  NVARCHAR(100),
       teacher_tc   NVARCHAR(11) NOT NULL,
       teacher_name NVARCHAR(100),
       student_tc   NVARCHAR(11),
       student_name NVARCHAR(100),
       appt_date    NVARCHAR(50),
       appt_time    NVARCHAR(50),
       note         NVARCHAR(MAX),
       status       NVARCHAR(20) DEFAULT 'beklemede',
       createdAt    DATETIME DEFAULT GETDATE()
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
       correct_cnt INT DEFAULT 0,
       wrong_cnt   INT DEFAULT 0,
       blank_cnt   INT DEFAULT 0,
       wrong_questions NVARCHAR(MAX),
       takenAt    DATETIME DEFAULT GETDATE()
     )
     ELSE
     BEGIN
       IF NOT COLUMNPROPERTY(OBJECT_ID('TestResults'), 'correct_cnt', 'ColumnId') IS NOT NULL
         ALTER TABLE TestResults ADD correct_cnt INT DEFAULT 0, wrong_cnt INT DEFAULT 0, blank_cnt INT DEFAULT 0, wrong_questions NVARCHAR(MAX);
     END`,

    // 13. KÜTÜPHANE (Kaynaklar)
    `IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Library' AND xtype='U')
     CREATE TABLE Library (
       id           INT IDENTITY(1,1) PRIMARY KEY,
       teacher_tc   NVARCHAR(11),
       teacher_name NVARCHAR(100),
       title        NVARCHAR(200) NOT NULL,
       description  NVARCHAR(MAX),
       file_name    NVARCHAR(200),
       file_data    NVARCHAR(MAX),
       category     NVARCHAR(50),
       school       NVARCHAR(200),
       createdAt    DATETIME DEFAULT GETDATE()
     )`,

    // 14. SINAV SİSTEMİ (Quizler)
    `IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Quizzes' AND xtype='U')
     CREATE TABLE Quizzes (
       id           INT IDENTITY(1,1) PRIMARY KEY,
       teacher_tc   NVARCHAR(11),
       teacher_name NVARCHAR(100),
       title        NVARCHAR(200) NOT NULL,
       subject      NVARCHAR(100),
       target_class NVARCHAR(50),
       school       NVARCHAR(200),
       time_limit   INT DEFAULT 20, -- dakika
       createdAt    DATETIME DEFAULT GETDATE()
     )`,

    // 15. SINAV SORULARI
    `IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='QuizQuestions' AND xtype='U')
     CREATE TABLE QuizQuestions (
       id           INT IDENTITY(1,1) PRIMARY KEY,
       quiz_id      INT NOT NULL,
       question_text NVARCHAR(MAX) NOT NULL,
       opt_a        NVARCHAR(MAX),
       opt_b        NVARCHAR(MAX),
       opt_c        NVARCHAR(MAX),
       opt_d        NVARCHAR(MAX),
       correct_opt  NVARCHAR(1), -- 'A', 'B', 'C', 'D'
       points       INT DEFAULT 10
     )`,

    // 16. SINAV SONUÇLARI
    `IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='QuizResults' AND xtype='U')
     CREATE TABLE QuizResults (
       id           INT IDENTITY(1,1) PRIMARY KEY,
       student_tc   NVARCHAR(11) NOT NULL,
       student_name NVARCHAR(100),
       quiz_id      INT NOT NULL,
       quiz_title   NVARCHAR(200),
       score        INT DEFAULT 0,
       total_score  INT DEFAULT 0,
       correct_count INT DEFAULT 0,
       wrong_count  INT DEFAULT 0,
       takenAt      DATETIME DEFAULT GETDATE()
     )`,

    // 17. ROZETLER (Badges)
    `IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Badges' AND xtype='U')
     CREATE TABLE Badges (
       id           INT IDENTITY(1,1) PRIMARY KEY,
       name         NVARCHAR(100) NOT NULL,
       description  NVARCHAR(300),
       icon         NVARCHAR(100), -- FontAwesome class
       req_points   INT DEFAULT 0
     )`,

    // 18. KULLANICI ROZETLERİ (Bridge)
    `IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='UserBadges' AND xtype='U')
     CREATE TABLE UserBadges (
       id           INT IDENTITY(1,1) PRIMARY KEY,
       user_tc      NVARCHAR(11) NOT NULL,
       badge_id     INT NOT NULL,
       awardedAt    DATETIME DEFAULT GETDATE()
     )`,

    // 19. BİLDİRİMLER
    `IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Notifications' AND xtype='U')
     CREATE TABLE Notifications (
       id           INT IDENTITY(1,1) PRIMARY KEY,
       receiver_tc  NVARCHAR(11) NOT NULL,
       text         NVARCHAR(MAX) NOT NULL,
       isRead       BIT DEFAULT 0,
       createdAt    DATETIME DEFAULT GETDATE()
     )`,

    // 20. ÖDEV CEVAPLARI
    `IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='AssignmentSubmissions' AND xtype='U')
     CREATE TABLE AssignmentSubmissions (
       id            INT IDENTITY(1,1) PRIMARY KEY,
       assignment_id INT NOT NULL,
       student_tc    NVARCHAR(11) NOT NULL,
       student_name  NVARCHAR(100),
       answer_text   NVARCHAR(MAX),
       grade         INT DEFAULT 0,
       isGraded      BIT DEFAULT 0,
       createdAt     DATETIME DEFAULT GETDATE()
     )`,

    // 21. MESAJLAR
    `IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Messages' AND xtype='U')
     CREATE TABLE Messages (
       id           INT IDENTITY(1,1) PRIMARY KEY,
       sender_tc    NVARCHAR(11) NOT NULL,
       receiver_tc  NVARCHAR(11) NOT NULL,
       content      NVARCHAR(MAX) NOT NULL,
       sentAt       DATETIME DEFAULT GETDATE(),
       isRead       BIT DEFAULT 0
     )`,

    // 22. CANLI DERSLER (Eksikse ekle)
    `IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='LiveLessons' AND xtype='U')
     CREATE TABLE LiveLessons (
       id           INT IDENTITY(1,1) PRIMARY KEY,
       teacher_tc   NVARCHAR(11),
       teacher_name NVARCHAR(100),
       title        NVARCHAR(200) NOT NULL,
       link         NVARCHAR(MAX),
       lesson_date  NVARCHAR(50),
       lesson_time  NVARCHAR(50),
       target_class NVARCHAR(50),
       school       NVARCHAR(200),
       createdAt    DATETIME DEFAULT GETDATE()
     )`,

    // 23. NOTLAR (Eksikse ekle)
    `IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Grades' AND xtype='U')
     CREATE TABLE Grades (
       id           INT IDENTITY(1,1) PRIMARY KEY,
       student_tc   NVARCHAR(11) NOT NULL,
       teacher_tc   NVARCHAR(11) NOT NULL,
       subject      NVARCHAR(100),
       grade        FLOAT DEFAULT 0,
       note         NVARCHAR(MAX),
       createdAt    DATETIME DEFAULT GETDATE()
     )`,

    // 24. CHAT GROUPS
    `IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='ChatGroups' AND xtype='U')
     CREATE TABLE ChatGroups (
       id         NVARCHAR(50) PRIMARY KEY,
       name       NVARCHAR(100) NOT NULL,
       created_by NVARCHAR(11) NOT NULL,
       members    NVARCHAR(MAX),
       createdAt  DATETIME DEFAULT GETDATE()
     )`,

    // 25. GROUP MESSAGES
    `IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='GroupMessages' AND xtype='U')
     CREATE TABLE GroupMessages (
       id         INT IDENTITY(1,1) PRIMARY KEY,
       group_id   NVARCHAR(50) NOT NULL,
       sender_tc  NVARCHAR(11) NOT NULL,
       sender_name NVARCHAR(100),
       content    NVARCHAR(MAX) NOT NULL,
       sentAt     DATETIME DEFAULT GETDATE()
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
    
    // Rozet Tohumlama (Seed)
    const p = await getPool();
    await p.request().query(`
      IF NOT EXISTS (SELECT 1 FROM Badges)
      INSERT INTO Badges (name, description, icon, req_points) VALUES 
      ('EBA Yıldızı', 'Sisteme düzenli giriş ödülü', 'fa-star', 100),
      ('Ödev Uzmanı', 'Ödevlerini aksatmayanlara', 'fa-book', 500),
      ('Quiz Şampiyonu', 'Sınavlarda üstün başarı', 'fa-trophy', 1000),
      ('Sosyal Kelebek', 'Paylaşımcı kişilik', 'fa-comments', 300)
    `);
    
    console.log('✅ MSSQL bağlantısı BAŞARILI! EBA_DB hazır.');
  } catch(err) {
    console.error('❌ MSSQL bağlantısı BAŞARISIZ:', err.message);
    console.warn('⚠️ Sunucu ÇALIŞMAYA DEVAM EDİYOR (Yedek Mod aktif).');
    isMockMode = true;
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
    if (!p) return res.status(503).json({ success: false, message: 'Servis şu anda veritabanı olmadan sınırlı modda çalışıyor (Yedek Mod).' });
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
    if (!p) return res.status(503).json({ success: false, message: 'Servis şu anda veritabanı olmadan sınırlı modda çalışıyor (Yedek Mod).' });
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

    // JWT İmzala
    const token = jwt.sign(
      { id: user.id, tc: user.tc, role: user.role, name: user.name, school: user.school },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    try {
      const today = new Date().toISOString().split('T')[0];
      const pData = await p.request().input('tc', sql.NVarChar, tc)
        .query('SELECT last_login, streak FROM Users WHERE tc=@tc');
      
      const lastLogin = pData.recordset[0]?.last_login;
      const streak = pData.recordset[0]?.streak || 0;
      const lastDayStr = lastLogin ? new Date(lastLogin).toISOString().split('T')[0] : null;

      if (lastDayStr !== today) {
        let newStreak = streak;
        if (lastDayStr) {
          const lastDate = new Date(lastDayStr);
          const diff = Math.floor((new Date(today) - lastDate) / (1000 * 60 * 60 * 24));
          if (diff === 1) newStreak++;
          else newStreak = 1;
        } else {
          newStreak = 1;
        }
        
        await p.request()
          .input('tc', sql.NVarChar, tc)
          .input('s', sql.Int, newStreak)
          .query('UPDATE Users SET points = ISNULL(points,0) + 10, coins = ISNULL(coins,0) + 10, last_login = GETDATE(), streak = @s WHERE tc=@tc');
        user.dailyBonus = true;
      }
    } catch(e) { console.error('Daily bonus error:', e); }
    
    console.log(`✅ Login: ${tc} (${role})`);
    res.json({ success: true, user, token });
  } catch(err) {
    console.error('Login hatası:', err.message);
    res.status(500).json({ success: false, message: 'Giriş hatası: ' + err.message });
  }
});

// ─── LOGOUT ────────────────────────────────────────────────────
app.post('/api/logout', async (req, res) => {
  const { tc } = req.body || {};
  if (!tc) return res.json({ success: true });
  try {
    const p = await getPool();
    if (p) {
      await p.request()
        .input('tc', sql.NVarChar, tc)
        .query('UPDATE Users SET isOnline=0, lastSeen=GETDATE() WHERE tc=@tc');
      await logActivity(p, tc, 'LOGOUT', 'Çıkış yapıldı');
    }
    res.json({ success: true });
  } catch(err) { res.status(500).json({ success: false, message: err.message }); }
});

// ─── HEARTBEAT (Nabız) ──────────────────────────────────────────────────
app.post('/api/heartbeat', async (req, res) => {
  const { tc } = req.body || {};
  if (!tc) return res.json({ success: false });
  try {
    const p = await getPool();
    if (!p) return res.json({ success: false });
    await p.request()
      .input('tc', sql.NVarChar, tc)
      .query('UPDATE Users SET isOnline=1, lastSeen=GETDATE() WHERE tc=@tc');
    res.json({ success: true });
  } catch(e) { res.json({ success: false }); }
});

// ─── PUANLAR API ─────────────────────────────────────────────────────────
app.get('/api/my-points', async (req, res) => {
  const { tc } = req.query;
  if (!tc) return res.json({ success: false, points: 0 });
  try {
    const p = await getPool();
    if (!p) return res.json({ success: false, points: 0 });
    const r = await p.request().input('tc', sql.NVarChar, tc)
      .query('SELECT ISNULL(points,0) as points FROM Users WHERE tc=@tc');
    res.json({ success: true, points: r.recordset[0]?.points || 0 });
  } catch(e) { res.json({ success: false, points: 0 }); }
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
app.put('/api/update-profile', authenticateToken, async (req, res) => {
  const { tc, name, school, class: cls, profilePic } = req.body;
  if (req.user.tc !== tc) return res.status(403).json({ success: false, message: 'Yetkisiz işlem!' });
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
      .input('pic',    sql.NVarChar(sql.MAX), profilePic || '')
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
app.post('/api/change-password', authenticateToken, async (req, res) => {
  const { tc, oldPassword, newPassword } = req.body;
  if (req.user.tc !== tc) return res.status(403).json({ success: false, message: 'Yetkisiz işlem!' });
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

// ─── ŞİFRE SIFIRLA (PUBLIC - TC İLE) ───────────────────────────────
app.post('/api/public/reset-password', async (req, res) => {
  const { tc, newPassword } = req.body;
  if (!tc || !newPassword) return res.status(400).json({ success: false, message: 'TC ve yeni şifre zorunludur.' });
  
  try {
    const p = await getPool();
    if (!p) return res.status(503).json({ success: false, message: 'Veritabanı bağlantısı yok.' });
    
    // Şifreyi Hashle
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    const result = await p.request()
      .input('tc',  sql.NVarChar, tc)
      .input('pwd', sql.NVarChar, hashedPassword)
      .query('UPDATE Users SET password=@pwd WHERE tc=@tc');

    if (result.rowsAffected[0] === 0)
      return res.status(404).json({ success: false, message: 'Kullanıcı bulunamadı.' });

    await logActivity(p, tc, 'RESET_PASSWORD', 'Şifre sıfırlandı');
    res.json({ success: true, message: 'Şifre başarıyla sıfırlandı.' });
  } catch(err) { res.status(500).json({ success: false, message: err.message }); }
});

// ─── POSTS ────────────────────────────────────────────────────────
app.post('/api/posts', authenticateToken, async (req, res) => {
  const { author_tc, author_name, type, content, file_name, file_data, target_group, school, poll_options, event_title, event_start, event_end } = req.body;
  try {
    const p = await getPool();
    await p.request()
      .input('atc',   sql.NVarChar, author_tc   || '')
      .input('aname', sql.NVarChar, author_name || '')
      .input('type',  sql.NVarChar, type        || 'İleti')
      .input('cont',  sql.NVarChar(sql.MAX), content     || '')
      .input('fname', sql.NVarChar, file_name   || '')
      .input('fdata', sql.NVarChar(sql.MAX), file_data   || '')
      .input('tg',    sql.NVarChar, target_group|| 'all')
      .input('school',sql.NVarChar, school      || '')
      .input('poll',  sql.NVarChar(sql.MAX), JSON.stringify(poll_options||[]))
      .input('etitle',sql.NVarChar, event_title  || '')
      .input('estart',sql.NVarChar, event_start  || '')
      .input('eend',  sql.NVarChar, event_end    || '')
      .query(`INSERT INTO Posts(author_tc,author_name,type,content,file_name,file_data,target_group,school,poll_options,event_title,event_start,event_end)
              VALUES(@atc,@aname,@type,@cont,@fname,@fdata,@tg,@school,@poll,@etitle,@estart,@eend)`);

    // 🏆 PUAN: Paylaşım = +10 puan
    if (author_tc) {
      try {
        await p.request().input('tc', sql.NVarChar, author_tc)
          .query('UPDATE Users SET points = ISNULL(points,0) + 5, coins = ISNULL(coins,0) + 5 WHERE tc=@tc');
        // EBA Yıldızı rozeti kontrolü (100 puan)
        const pts = await p.request().input('tc', sql.NVarChar, author_tc).query('SELECT points FROM Users WHERE tc=@tc');
        const userPoints = pts.recordset[0]?.points || 0;
        if (userPoints >= 100) {
          const badge = await p.request().query("SELECT id FROM Badges WHERE name='EBA Yıldızı'");
          if (badge.recordset.length) {
            const bid = badge.recordset[0].id;
            const hasBadge = await p.request().input('tc', sql.NVarChar, author_tc).input('bid', sql.Int, bid).query('SELECT id FROM UserBadges WHERE user_tc=@tc AND badge_id=@bid');
            if (!hasBadge.recordset.length) {
              await p.request().input('tc', sql.NVarChar, author_tc).input('bid', sql.Int, bid).query('INSERT INTO UserBadges(user_tc, badge_id) VALUES(@tc, @bid)');
              await p.request().input('tc', sql.NVarChar, author_tc).input('txt', sql.NVarChar, '⭐ "EBA Yıldızı" rozetini kazandınız!')
                .query('INSERT INTO Notifications(receiver_tc, text, isRead) VALUES(@tc,@txt,0)');
            }
          }
        }
      } catch(e) { console.warn('Puan eklenemedi:', e.message); }
    }

    // Sosyal paylaşım istatistiği güncelle
    if (author_tc) {
      try {
        await p.request().input('tc', sql.NVarChar, author_tc)
          .query(`IF EXISTS(SELECT 1 FROM StudentStats WHERE student_tc=@tc)
                  UPDATE StudentStats SET social_count=social_count+1, updatedAt=GETDATE() WHERE student_tc=@tc`);
        await logActivity(p, author_tc, 'SOCIAL_POST', `${type} paylaşıldı: ${(content||'').slice(0,80)}`);
      } catch(e) {}
    }

    // Bildirim gönder (ilgili sınıfa veya tüm okula)
    try {
       const notifText = `${author_name} yeni bir ${type} paylaştı: ${(content||'').slice(0,50)}...`;
       let q = "SELECT tc FROM Users WHERE school=@sch AND tc<>@atc";
       const reqN = p.request().input('sch', sql.NVarChar, school).input('atc', sql.NVarChar, author_tc);
       if(target_group && target_group !== 'all' && target_group !== 'veliler') {
          q += " AND (class=@tg OR classNum=@tg)";
          reqN.input('tg', sql.NVarChar, target_group);
       }
       const users = await reqN.query(q);
       for(const u of users.recordset) {
         await p.request().input('utc', sql.NVarChar, u.tc).input('txt', sql.NVarChar, notifText)
                .query("INSERT INTO Notifications(receiver_tc, text, isRead) VALUES(@utc, @txt, 0)");
       }
    } catch(e) {}

    res.json({ success: true });
    io.emit('refresh_data');
  } catch(err) { res.status(500).json({ success: false, message: err.message }); }
});

// ─── MESAJLAŞMA API ──────────────────────────────────────────────
app.get('/api/messages', authenticateToken, async (req, res) => {
  const { with_tc } = req.query;
  const my_tc = req.user.tc;
  try {
    const p = await getPool();
    const result = await p.request()
      .input('me', sql.NVarChar, my_tc)
      .input('them', sql.NVarChar, with_tc)
      .query(`
        SELECT * FROM Messages 
        WHERE (sender_tc=@me AND receiver_tc=@them) 
           OR (sender_tc=@them AND receiver_tc=@me)
        ORDER BY sentAt ASC
      `);
    res.json({ success: true, messages: result.recordset });
  } catch(err) { res.status(500).json({ success: false, message: err.message }); }
});

app.post('/api/messages', authenticateToken, async (req, res) => {
  let { receiver_tc, content } = req.body;
  const sender_tc = req.user.tc;
  const sender_name = req.user.name;

  if (!content) return res.status(400).json({ success: false });
  content = censorText(content);

  try {
    const p = await getPool();
    await p.request()
      .input('sender', sql.NVarChar, sender_tc)
      .input('receiver', sql.NVarChar, receiver_tc)
      .input('cont', sql.NVarChar, content)
      .query('INSERT INTO Messages(sender_tc, receiver_tc, content) VALUES(@sender, @receiver, @cont)');
    
    await awardPoints(p, sender_tc, 1);

    // Bildirim gönder
    const notifText = `📩 ${sender_name}: ${content.slice(0, 50)}${content.length > 50 ? '...' : ''}`;
    await p.request()
      .input('rtc', sql.NVarChar, receiver_tc)
      .input('txt', sql.NVarChar, notifText)
      .query('INSERT INTO Notifications(receiver_tc, text, isRead) VALUES(@rtc, @txt, 0)');
      
    // Real-time ilet (Socket.io)
    if(typeof io !== 'undefined') {
      const receiverSocketId = onlineUsers.get(String(receiver_tc));
      if(receiverSocketId) {
        io.to(receiverSocketId).emit('new_message', {
          sender_tc,
          content,
          sentAt: new Date().toISOString()
        });
      }
    }
      
    res.json({ success: true, content }); // Sansürlü halini dön
  } catch(err) { res.status(500).json({ success: false, message: err.message }); }
});

// ─── GRUP SOHBET API ──────────────────────────────────────────────
app.get('/api/chat-groups', authenticateToken, async (req, res) => {
  const my_tc = req.user.tc;
  try {
    const p = await getPool();
    const result = await p.request().query('SELECT * FROM ChatGroups');
    const myGroups = result.recordset.filter(g => {
      try {
        const members = JSON.parse(g.members || '[]');
        return members.includes(String(my_tc));
      } catch(e) { return false; }
    });
    res.json({ success: true, groups: myGroups });
  } catch(err) { res.status(500).json({ success: false, message: err.message }); }
});

app.post('/api/chat-groups', authenticateToken, async (req, res) => {
  const { name, members } = req.body;
  const my_tc = req.user.tc;
  try {
    const p = await getPool();
    const groupId = 'grp_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
    const allMembers = Array.from(new Set([...(members || []), String(my_tc)]));
    await p.request()
      .input('id',    sql.NVarChar, groupId)
      .input('name',  sql.NVarChar, name)
      .input('creator', sql.NVarChar, my_tc)
      .input('members', sql.NVarChar, JSON.stringify(allMembers))
      .query('INSERT INTO ChatGroups(id, name, created_by, members) VALUES(@id, @name, @creator, @members)');
    res.json({ success: true });
  } catch(err) { res.status(500).json({ success: false, message: err.message }); }
});

app.get('/api/chat-groups/:id/messages', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    const p = await getPool();
    const result = await p.request()
      .input('gid', sql.NVarChar, id)
      .query('SELECT * FROM GroupMessages WHERE group_id=@gid ORDER BY sentAt ASC');
    res.json({ success: true, messages: result.recordset });
  } catch(err) { res.status(500).json({ success: false, message: err.message }); }
});

app.post('/api/chat-groups/:id/messages', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { content } = req.body;
  const sender_tc = req.user.tc;
  const sender_name = req.user.name;
  try {
    const p = await getPool();
    await p.request()
      .input('gid', sql.NVarChar, id)
      .input('sender', sql.NVarChar, sender_tc)
      .input('name', sql.NVarChar, sender_name)
      .input('cont', sql.NVarChar, content)
      .query('INSERT INTO GroupMessages(group_id, sender_tc, sender_name, content) VALUES(@gid, @sender, @name, @cont)');
    
    // Real-time ilet
    if(typeof io !== 'undefined') {
      io.to(`group_${id}`).emit('group_message', {
        group_id: id,
        sender_tc,
        sender_name,
        content,
        sentAt: new Date().toISOString()
      });
    }
    res.json({ success: true });
  } catch(err) { res.status(500).json({ success: false, message: err.message }); }
});

app.get('/api/chat-groups/:id/members', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    const p = await getPool();
    const gRes = await p.request().input('id', sql.NVarChar, id).query('SELECT members FROM ChatGroups WHERE id=@id');
    if(!gRes.recordset.length) return res.status(404).json({ success: false, message: 'Grup bulunamadı' });
    
    const members = JSON.parse(gRes.recordset[0].members || '[]');
    if (!members.length) return res.json({ success: true, members: [] });
    
    const result = await p.request().query(`SELECT tc, name FROM Users WHERE tc IN ('${members.join("','")}')`);
    res.json({ success: true, members: result.recordset });
  } catch(err) { res.status(500).json({ success: false, message: err.message }); }
});

app.delete('/api/chat-groups/:id/leave', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const my_tc = req.user.tc;
  try {
    const p = await getPool();
    const gRes = await p.request().input('id', sql.NVarChar, id).query('SELECT members FROM ChatGroups WHERE id=@id');
    if(!gRes.recordset.length) return res.status(404).json({ success: false });
    
    let members = JSON.parse(gRes.recordset[0].members || '[]');
    members = members.filter(m => String(m) !== String(my_tc));
    
    await p.request()
      .input('id', sql.NVarChar, id)
      .input('m', sql.NVarChar, JSON.stringify(members))
      .query('UPDATE ChatGroups SET members=@m WHERE id=@id');
    res.json({ success: true });
  } catch(err) { res.status(500).json({ success: false, message: err.message }); }
});

// ─── SOHBET LİSTESİ (SON MESAJLARLA) ─────────────────────────────
app.get('/api/chat-conversations', authenticateToken, async (req, res) => {
  const my_tc = req.user.tc;
  const { school } = req.query;
  try {
    const p = await getPool();
    // Okuldaki tüm kullanıcıları getir (kendimiz hariç)
    const uRes = await p.request()
      .input('sch', sql.NVarChar, school || '')
      .input('me', sql.NVarChar, my_tc)
      .query(`
        SELECT tc, name, role, 
        (SELECT TOP 1 content FROM Messages 
         WHERE (sender_tc=@me AND receiver_tc=Users.tc) OR (sender_tc=Users.tc AND receiver_tc=@me)
         ORDER BY sentAt DESC) as lastMessage,
        (SELECT TOP 1 sentAt FROM Messages 
         WHERE (sender_tc=@me AND receiver_tc=Users.tc) OR (sender_tc=Users.tc AND receiver_tc=@me)
         ORDER BY sentAt DESC) as lastMessageAt
        FROM Users 
        WHERE school=@sch AND tc<>@me
        ORDER BY lastMessageAt DESC, name ASC
      `);
    res.json({ success: true, conversations: uRes.recordset });
  } catch(err) { res.status(500).json({ success: false, message: err.message }); }
});

// ─── ÖDEV DURUM KONTROLÜ (OTOMATİK BİLDİRİM) ──────────────────────
app.post('/api/check-homework-status', authenticateToken, async (req, res) => {
  const { tc, role, school, classNum } = req.user;
  if (role !== 'ogrenci') return res.json({ success: true });

  try {
    const p = await getPool();
    
    // 1. Süresi geçen ancak teslim edilmeyen ödevleri bul
    const overdue = await p.request()
      .input('stc', sql.NVarChar, tc)
      .input('sch', sql.NVarChar, school)
      .input('cls', sql.NVarChar, classNum)
      .query(`
        SELECT a.id, a.title, a.due_date 
        FROM Assignments a
        WHERE a.school=@sch AND (a.target_class='all' OR a.target_class=@cls)
        AND a.id NOT IN (SELECT assignment_id FROM AssignmentSubmissions WHERE student_tc=@stc)
        AND TRY_PARSE(a.due_date AS DATETIME USING 'tr-TR') < GETDATE()
      `);
    
    for (const hw of overdue.recordset) {
      const msg = `⚠️ SÜRESİ GEÇTİ: '${hw.title}' ödevini henüz teslim etmediniz. Son Tarih: ${hw.due_date}`;
      const checkNotif = await p.request()
        .input('stc', sql.NVarChar, tc)
        .input('txt', sql.NVarChar, msg)
        .query("SELECT 1 FROM Notifications WHERE receiver_tc=@stc AND text=@txt");
      
      if (!checkNotif.recordset.length) {
        await p.request()
          .input('stc', sql.NVarChar, tc)
          .input('txt', sql.NVarChar, msg)
          .query("INSERT INTO Notifications(receiver_tc, text, isRead) VALUES(@stc, @txt, 0)");
      }
    }

    // 2. Yaklaşan ödevler için hatırlatma (Örn: 24 saatten az kalanlar)
    const upcoming = await p.request()
      .input('stc', sql.NVarChar, tc)
      .input('sch', sql.NVarChar, school)
      .input('cls', sql.NVarChar, classNum)
      .query(`
        SELECT a.id, a.title, a.due_date 
        FROM Assignments a
        WHERE a.school=@sch AND (a.target_class='all' OR a.target_class=@cls)
        AND a.id NOT IN (SELECT assignment_id FROM AssignmentSubmissions WHERE student_tc=@stc)
        AND TRY_PARSE(a.due_date AS DATETIME USING 'tr-TR') BETWEEN GETDATE() AND DATEADD(hour, 24, GETDATE())
      `);

    for (const hw of upcoming.recordset) {
      const msg = `⏰ HATIRLATMA: '${hw.title}' ödevinin bitmesine az kaldı! Son Tarih: ${hw.due_date}`;
      const checkNotif = await p.request()
        .input('stc', sql.NVarChar, tc)
        .input('txt', sql.NVarChar, msg)
        .query("SELECT 1 FROM Notifications WHERE receiver_tc=@stc AND text=@txt");
      
      if (!checkNotif.recordset.length) {
        await p.request()
          .input('stc', sql.NVarChar, tc)
          .input('txt', sql.NVarChar, msg)
          .query("INSERT INTO Notifications(receiver_tc, text, isRead) VALUES(@stc, @txt, 0)");
      }
    }

    res.json({ success: true });
  } catch(err) { 
    console.error("Homework check error:", err);
    res.json({ success: false }); 
  }
});


// ─── ÖĞRENCİ NOTLARI (frontend için özel endpoint) ─────────────────────────
// Grades tablosundan (öğretmenden girilen notlar) öğrenciye göre getirir
app.get('/api/student-grades', async (req, res) => {
  const { student_tc } = req.query;
  try {
    const p = await getPool();
    if (!p) return res.json({ success: false, grades: [] });
    const result = await p.request()
      .input('tc', sql.NVarChar, student_tc || '')
      .query(`SELECT g.id, g.subject as title, 'Not' as type, g.grade as score, g.note, g.teacher_tc, g.createdAt 
              FROM Grades g
              WHERE g.student_tc=@tc
              ORDER BY g.createdAt DESC`);
    res.json({ success: true, grades: result.recordset });
  } catch(err) { res.status(500).json({ success: false, grades: [], message: err.message }); }
});

app.get('/api/posts', authenticateToken, async (req, res) => {
  const { school, group, userClass } = req.query;
  const user = req.user;
  try {
    const p = await getPool();
    if (!p) return res.status(503).json({ success: false, message: 'Veritabanı bağlantısı yok.' });

    const req2 = p.request();
    req2.input('school', sql.NVarChar, school || user.school || '');
    
    let query = "SELECT * FROM Posts WHERE school=@school";
    
    // Öğretmenler kendi okullarındaki tüm paylaşımları görebilir
    if (user.role !== 'ogretmen') {
      req2.input('group',  sql.NVarChar, group     || 'all');
      req2.input('cls',    sql.NVarChar, userClass || user.classNum || user.class || '');
      query += " AND (target_group='all' OR target_group=@group OR target_group=@cls OR target_group='veliler')";
    }
    
    query += " ORDER BY createdAt DESC";
    
    const result = await req2.query(query);
    const posts = result.recordset.map(p => {
      if (typeof p.poll_options === 'string' && p.poll_options) {
        try { p.poll_options = JSON.parse(p.poll_options); } catch(e) { p.poll_options = []; }
      }
      return p;
    });
    res.json({ success: true, posts });
  } catch(err) { res.status(500).json({ success: false, message: err.message }); }
});

// --- SINAV SONUÇLARINI ÖĞRETMENE GÖSTERME ---
app.get('/api/quizzes/results', authenticateToken, async (req, res) => {
  if(req.user.role !== 'ogretmen') return res.status(403).json({ success: false });
  const { quiz_id } = req.query;
  try {
    const p = await getPool();
    let query = `
      SELECT qr.*, q.title as quiz_title 
      FROM QuizResults qr
      JOIN Quizzes q ON qr.quiz_id = q.id
      WHERE q.teacher_tc = @tc
    `;
    const request = p.request().input('tc', sql.NVarChar, req.user.tc);
    if (quiz_id) {
      query += " AND qr.quiz_id = @qid";
      request.input('qid', sql.Int, quiz_id);
    }
    query += " ORDER BY qr.takenAt DESC";
    const r = await request.query(query);
    res.json({ success: true, results: r.recordset });
  } catch(e) { res.status(500).json({ success: false, message: e.message }); }
});

// ─── BİLDİRİMLER ─────────────────────────────────────────────────
app.post('/api/notifications', authenticateToken, async (req, res) => {
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

app.get('/api/notifications', authenticateToken, async (req, res) => {
  const { tc } = req.query;
  if (req.user.tc !== tc) return res.status(403).json({ success: false, message: 'Yetkisiz erişim!' });
  try {
    const p = await getPool();
    const result = await p.request()
      .input('tc', sql.NVarChar, tc || '')
      .query('SELECT * FROM Notifications WHERE receiver_tc=@tc ORDER BY createdAt DESC');
    res.json({ success: true, notifications: result.recordset });
  } catch(err) { res.status(500).json({ success: false, message: err.message }); }
});

app.put('/api/notifications/read', authenticateToken, async (req, res) => {
  const { tc } = req.body;
  if (req.user.tc !== tc) return res.status(403).json({ success: false, message: 'Yetkisiz işlem!' });
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
    
    // Öğrencilere bildirim gönder
    try {
       const notifText = `${teacher_name} için yeni canlı ders: ${title} (${lesson_date} ${lesson_time})`;
       let q = "SELECT tc FROM Users WHERE role='ogrenci' AND school=@sch";
       const reqN = p.request().input('sch', sql.NVarChar, school);
       if(target_class && target_class !== 'all') {
          q += " AND (class=@cls OR classNum=@cls)";
          reqN.input('cls', sql.NVarChar, target_class);
       }
       const students = await reqN.query(q);
       for(const s of students.recordset) {
         await p.request().input('stc', sql.NVarChar, s.tc).input('txt', sql.NVarChar, notifText)
                .query("INSERT INTO Notifications(receiver_tc, text, isRead) VALUES(@stc, @txt, 0)");
       }
    } catch(e) {}
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
// Eski Not Sistemi Kaldırıldı




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
      .input('desc',  sql.NVarChar(sql.MAX), description || '')
      .input('due',   sql.NVarChar, due_date     || '')
      .input('cls',   sql.NVarChar, target_class || 'all')
      .input('school',sql.NVarChar, school       || '')
      .input('fname', sql.NVarChar, file_name    || '')
      .input('fdata', sql.NVarChar(sql.MAX), file_data || '')
      .input('atype', sql.NVarChar, assignment_type || 'Metin')
      .query(`INSERT INTO Assignments(teacher_tc,teacher_name,title,subject,description,due_date,target_class,school,file_name,file_data,assignment_type)
              VALUES(@ttc,@tname,@title,@subj,@desc,@due,@cls,@school,@fname,@fdata,@atype)`);
    await p.request().input('ttc', sql.NVarChar, teacher_tc)
      .query('UPDATE Users SET points = ISNULL(points,0) + 15, coins = ISNULL(coins,0) + 15 WHERE tc=@ttc');

    await logActivity(p, teacher_tc, 'ASSIGNMENT_SEND', `Ödev gönderildi: ${title} → ${target_class||'all'}`);
    
    // Öğrencilere bildirim gönder
    try {
       const notifText = `Yeni Ödev: ${title} (${subject}) - Son: ${due_date||'Belirtilmedi'}`;
       let q = "SELECT tc FROM Users WHERE role='ogrenci' AND school=@sch";
       const reqN = p.request().input('sch', sql.NVarChar, school);
       if(target_class && target_class !== 'all') {
         q += " AND (class LIKE '%' + @cls + '%' OR @cls LIKE '%' + class + '%')";
         reqN.input('cls', sql.NVarChar, target_class);
       }
       const students = await reqN.query(q);
       for(const s of students.recordset) {
         await p.request().input('stc', sql.NVarChar, s.tc).input('txt', sql.NVarChar, notifText)
                .query("INSERT INTO Notifications(receiver_tc, text, isRead) VALUES(@stc, @txt, 0)");
       }
    } catch(e) {}
    res.json({ success: true });
  } catch(err) { res.status(500).json({ success: false, message: err.message }); }
});

app.get('/api/assignments', async (req, res) => {
  const { school, userClass, teacher_tc, student_tc } = req.query;
  try {
    const p = await getPool();
    const req2 = p.request();
    let q = `SELECT * FROM Assignments WHERE 1=1`;
    if (school) { q += ' AND school=@school'; req2.input('school', sql.NVarChar, school); }
    if (userClass) { q += " AND (target_class='all' OR target_class LIKE '%' + @cls + '%' OR @cls LIKE '%' + target_class + '%')"; req2.input('cls', sql.NVarChar, userClass); }
    if (teacher_tc) { q += ' AND teacher_tc=@ttc'; req2.input('ttc', sql.NVarChar, teacher_tc); }
    if (student_tc) {
      q += ' AND id NOT IN (SELECT assignment_id FROM AssignmentSubmissions WHERE student_tc=@stc)';
      req2.input('stc', sql.NVarChar, student_tc);
    }
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
      .query(`INSERT INTO WatchedVideos(student_tc,title,subject,duration) VALUES(@tc,@title,@subject,@dur);
              UPDATE Users SET points = ISNULL(points,0) + 10 WHERE tc=@tc;`);

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
  const { student_tc, title, subject, score, total, duration, correct_cnt, wrong_cnt, blank_cnt, wrong_questions } = req.body;
  try {
    const p = await getPool();
    await p.request()
      .input('tc',      sql.NVarChar, student_tc || '')
      .input('title',   sql.NVarChar, title      || '')
      .input('subject', sql.NVarChar, subject    || '')
      .input('score',   sql.Float,    parseFloat(score)||0)
      .input('total',   sql.Int,      parseInt(total)||0)
      .input('dur',     sql.Int,      parseInt(duration)||0)
      .input('cc',      sql.Int,      parseInt(correct_cnt)||0)
      .input('wc',      sql.Int,      parseInt(wrong_cnt)||0)
      .input('bc',      sql.Int,      parseInt(blank_cnt)||0)
      .input('wq',      sql.NVarChar, wrong_questions ? JSON.stringify(wrong_questions) : null)
      .query(`INSERT INTO TestResults(student_tc,title,subject,score,total,duration,correct_cnt,wrong_cnt,blank_cnt,wrong_questions) 
              VALUES(@tc,@title,@subject,@score,@total,@dur,@cc,@wc,@bc,@wq)`);

    // 🏆 ÖDÜL: Sınav tamamlama = +20 puan + 20 Coin
    try {
      await p.request().input('tc', sql.NVarChar, student_tc)
        .query(`IF EXISTS(SELECT 1 FROM StudentStats WHERE student_tc=@tc)
                UPDATE StudentStats SET exam_count=exam_count+1, updatedAt=GETDATE() WHERE student_tc=@tc;
                UPDATE Users SET points = ISNULL(points,0) + 20, coins = ISNULL(coins,0) + 20 WHERE tc=@tc;`);
    } catch(e) {}

    // Kendi hocasına veya velisine bildirim gönderebilir (öğretmene atayalım)
    try {
      const uInfo = await p.request().input('tc', sql.NVarChar, student_tc).query('SELECT name, school, class FROM Users WHERE tc=@tc');
      if (uInfo.recordset.length > 0) {
        const d = uInfo.recordset[0];
         // Aynı okul ve sınıftan öğretmene atalım (veya o dersin hocasına)
        const tr = await p.request().input('school', sql.NVarChar, d.school).input('cls', sql.NVarChar, d.class)
            .query("SELECT tc FROM Users WHERE role='ogretmen' AND school=@school AND class=@cls");
        if (tr.recordset.length>0) {
            const notifMsg = `\${d.name}, '\${title}' sınavını \${correct_cnt||score} Doğru, \${wrong_cnt||0} Yanlış ile tamamladı.`;
            for (const tch of tr.recordset) {
                await p.request().input('ttc', sql.NVarChar, tch.tc).input('msg', sql.NVarChar, notifMsg)
                    .query("INSERT INTO Notifications(receiver_tc, text, isRead) VALUES(@ttc, @msg, 0)");
            }
        }
      }
    } catch(e) {}

    // Öğrenciye de bir bildirim atalım ki tıklayıp hangi soruları yanlış yaptığını görsün
    try {
       const stuMsg = `'\${title}' sınav sonucun: \${correct_cnt||score} Doğru, \${wrong_cnt||0} Yanlış. ===EXAM_DET:\${title}|\${correct_cnt||0}|\${wrong_cnt||0}|\${blank_cnt||0}|\${wrong_questions?JSON.stringify(wrong_questions):'[]'}===`;
       await p.request().input('ttc', sql.NVarChar, student_tc).input('msg', sql.NVarChar, stuMsg)
           .query("INSERT INTO Notifications(receiver_tc, text, isRead) VALUES(@ttc, @msg, 0)");
    } catch(e) {}

    // Veliyi bilgilendir
    try {
       const vR = await p.request().input('stc', sql.NVarChar, student_tc).query("SELECT veliTc FROM Users WHERE tc=@stc");
       if(vR.recordset.length && vR.recordset[0].veliTc) {
         const vM = `Çocuğunuz ${student_tc}, '${title}' sınavını tamamladı. Puan: ${score}/${total}`;
         await p.request().input('vtc', sql.NVarChar, vR.recordset[0].veliTc).input('msg', sql.NVarChar, vM)
                .query("INSERT INTO Notifications(receiver_tc, text, isRead) VALUES(@vtc, @msg, 0)");
       }
    } catch(e) {}

    await logActivity(p, student_tc, 'TEST_DONE', `Test tamamlandı: \${title} (\${score}/\${total}) - \${duration} dk`);
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

app.get('/api/teacher-stats', authenticateToken, async (req, res) => {
  if (req.user.role !== 'ogretmen') return res.status(403).json({ success: false });
  try {
    const p = await getPool();
    const school = req.user.school;
    const tc = req.user.tc;
    const studentR = await p.request().input('sch', sql.NVarChar, school).query('SELECT COUNT(*) as count FROM Users WHERE role=\'ogrenci\' AND school=@sch');
    const assignmentR = await p.request().input('tc', sql.NVarChar, tc).query('SELECT COUNT(*) as count FROM Assignments WHERE teacher_tc=@tc');
    const submissionR = await p.request().input('tc', sql.NVarChar, tc).query('SELECT COUNT(*) as count FROM AssignmentSubmissions s JOIN Assignments a ON s.assignment_id = a.id WHERE a.teacher_tc=@tc AND s.isGraded=0');
    res.json({ success: true, stats: { studentCount: studentR.recordset[0].count, activeAssignments: assignmentR.recordset[0].count, pendingSubmissions: submissionR.recordset[0].count, averageSuccess: 85 } });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

app.get('/api/user-stats', authenticateToken, async (req, res) => {
  const tc = req.query.tc || req.user.tc;
  try {
    const p = await getPool();
    const userR = await p.request().input('tc', sql.NVarChar, tc).query('SELECT name, school, [class] as classNum, points, coins, profilePic FROM Users WHERE tc=@tc');
    const statR = await p.request().input('tc', sql.NVarChar, tc).query('SELECT * FROM StudentStats WHERE student_tc=@tc');
    res.json({ success: true, user: userR.recordset[0] || {}, stats: statR.recordset[0] || {} });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

app.get('/api/test-results', authenticateToken, async (req, res) => {
  const tc = req.query.tc || req.user.tc;
  try {
    const p = await getPool();
    const r = await p.request().input('tc', sql.NVarChar, tc).query('SELECT title, subject, score, total_score as total, createdAt as takenAt FROM QuizResults WHERE student_tc=@tc ORDER BY createdAt DESC');
    res.json({ success: true, tests: r.recordset });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

const PORT = process.env.PORT || 8080;


// --- ÖDEV CEVABI GÖNDERME ---
app.post('/api/assignment-submit', async (req, res) => {
  const { assignment_id, student_tc, student_name, answer_text } = req.body;
  try {
    const p = await getPool();
    
    // Mükerrer gönderim kontrolü
    const check = await p.request()
      .input('aid', sql.Int, parseInt(assignment_id))
      .input('tc', sql.NVarChar, student_tc)
      .query('SELECT id FROM AssignmentSubmissions WHERE assignment_id=@aid AND student_tc=@tc');
    
    if(check.recordset.length > 0) {
      return res.status(400).json({success: false, message: 'Bu ödevi zaten tamamladınız.'});
    }

    await p.request()
      .input('aid', sql.Int, parseInt(assignment_id))
      .input('tc', sql.NVarChar, student_tc)
      .input('name', sql.NVarChar, student_name)
      .input('ans', sql.NVarChar, answer_text)
      .query('INSERT INTO AssignmentSubmissions(assignment_id,student_tc,student_name,answer_text) VALUES(@aid,@tc,@name,@ans)');
    
    // Öğretmene bildirim gönder
    try {
       const asm = await p.request().input('aid', sql.Int, parseInt(assignment_id)).query('SELECT teacher_tc, title FROM Assignments WHERE id=@aid');
       if(asm.recordset.length) {
          const info = asm.recordset[0];
          const notifMsg = `${student_name}, '${info.title}' ödevine cevap gönderdi.`;
          await p.request().input('ttc', sql.NVarChar, info.teacher_tc).input('txt', sql.NVarChar, notifMsg)
                 .query("INSERT INTO Notifications(receiver_tc, text, isRead) VALUES(@ttc, @txt, 0)");
       }
    } catch(e) {}

    // 🏆 ÖDÜL: Ödev teslim = +20 puan + 15 Coin
    try {
      await p.request()
        .input('tc', sql.NVarChar, student_tc)
        .query('UPDATE Users SET points = ISNULL(points,0) + 15, coins = ISNULL(coins,0) + 15 WHERE tc=@tc');
      // Ödev Uzmanı rozeti kontrolü (500 puan)
      const pts = await p.request().input('tc', sql.NVarChar, student_tc).query('SELECT points FROM Users WHERE tc=@tc');
      const userPoints = pts.recordset[0]?.points || 0;
      if (userPoints >= 500) {
        const badge = await p.request().query("SELECT id FROM Badges WHERE name='Ödev Uzmanı'");
        if (badge.recordset.length) {
          const bid = badge.recordset[0].id;
          const hasBadge = await p.request().input('tc', sql.NVarChar, student_tc).input('bid', sql.Int, bid).query('SELECT id FROM UserBadges WHERE user_tc=@tc AND badge_id=@bid');
          if (!hasBadge.recordset.length) {
            await p.request().input('tc', sql.NVarChar, student_tc).input('bid', sql.Int, bid).query('INSERT INTO UserBadges(user_tc, badge_id) VALUES(@tc, @bid)');
            await p.request().input('tc', sql.NVarChar, student_tc).input('txt', sql.NVarChar, '🏅 "Ödev Uzmanı" rozetini kazandınız!')
              .query('INSERT INTO Notifications(receiver_tc, text, isRead) VALUES(@tc,@txt,0)');
          }
        }
      }
    } catch(e) { console.warn('Puan eklenemedi:', e.message); }

    res.json({success: true, message: 'Cevabınız iletildi. +20 puan kazandınız! 🎉'});
  } catch(e) { res.status(500).json({success:false, message:e.message}); }
});

// --- YAPAY ZEKA ÖDEV KONTROLÜ (GROQ API) ---
app.post('/api/assignment-ai-check', authenticateToken, async (req, res) => {
  const { assignment_id, student_answer } = req.body;
  if (!student_answer) return res.status(400).json({ success: false, message: 'Cevap boş olamaz.' });
  
  try {
    const p = await getPool();
    const asm = await p.request().input('id', sql.Int, parseInt(assignment_id)).query('SELECT title, description FROM Assignments WHERE id=@id');
    if(!asm.recordset.length) return res.status(404).json({ success: false, message: 'Ödev bulunamadı.' });
    
    const info = asm.recordset[0];
    const prompt = `Sen bir öğretmensin. Aşağıdaki ödev konusuna göre öğrencinin cevabını kontrol et ve 0-100 arası bir not ver. 
    Ödev Konusu: ${info.title}
    Ödev Açıklaması: ${info.description}
    Öğrencinin Cevabı: ${student_answer}
    
    Yanıtını SADECE şu JSON formatında ver:
    { "isCorrect": boolean, "score": number, "message": "öğrenciye çok kısa geri bildirim" }`;

    const groqRes = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: "Sen bir öğretmensin ve her zaman JSON formatında yanıt verirsin." },
        { role: "user", content: prompt }
      ],
      temperature: 0.3,
      response_format: { type: "json_object" }
    }, {
      headers: { 
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`, 
        'Content-Type': 'application/json' 
      },
      timeout: 10000
    });

    const aiResult = JSON.parse(groqRes.data.choices[0].message.content);
    res.json(aiResult);
  } catch (e) { 
    const errorDetail = e.response?.data?.error?.message || e.message;
    console.error('AI Check Error Detail:', errorDetail);
    res.status(500).json({ success: false, message: 'Yapay zeka hatası: ' + errorDetail }); 
  }
});

// --- GELEN CEVAPLARI ÖĞRETMENE GÖSTERME (TÜMÜ VEYA BİR ÖDEV) ---
app.get('/api/assignment-submissions', async (req, res) => {
  const { teacher_tc } = req.query; // veya assignment_id
  try {
    const p = await getPool();
    const query = `
      SELECT s.id, s.assignment_id, a.title, s.student_tc, s.student_name, s.answer_text, s.grade, s.isGraded, s.createdAt
      FROM AssignmentSubmissions s
      JOIN Assignments a ON s.assignment_id = a.id
      WHERE a.teacher_tc = @tc
      ORDER BY s.createdAt DESC
    `;
    const r = await p.request().input('tc', sql.NVarChar, teacher_tc||'').query(query);
    res.json({success:true, submissions: r.recordset});
  } catch(e) { res.status(500).json({success:false, message:e.message}); }
});

// --- ÖĞRETMEN NOT GİRİŞİ ---
app.put('/api/assignment-grade', async (req, res) => {
  const { sub_id, grade, teacher_tc } = req.body;
  try {
    const p = await getPool();
    
    // Mevcut durumu kontrol et (yeni mi güncelleme mi?)
    const check = await p.request().input('id', sql.Int, parseInt(sub_id)).query('SELECT isGraded, grade FROM AssignmentSubmissions WHERE id=@id');
    const isUpdate = check.recordset.length && check.recordset[0].isGraded;

    await p.request()
      .input('id', sql.Int, parseInt(sub_id))
      .input('grade', sql.Int, parseInt(grade))
      .query('UPDATE AssignmentSubmissions SET grade=@grade, isGraded=1 WHERE id=@id');
    
    // Öğrenciye bildirim gönderelim
    const subInfo = await p.request().input('id', sql.Int, parseInt(sub_id)).query('SELECT s.student_tc, a.title FROM AssignmentSubmissions s JOIN Assignments a ON s.assignment_id=a.id WHERE s.id=@id');
    if(subInfo.recordset.length) {
      const info = subInfo.recordset[0];
      const text = isUpdate ? 
        `'${info.title}' ödevine ait notunuz ${grade} olarak güncellendi.` :
        `'${info.title}' ödevinize not girildi: ${grade}`;
      
      await p.request().input('tc', sql.NVarChar, info.student_tc).input('t', sql.NVarChar, text)
             .query('INSERT INTO Notifications(receiver_tc, text, isRead) VALUES(@tc,@t,0)');
              
       // Veliyi de bilgilendir
       const veliCheck = await p.request().input('stc', sql.NVarChar, info.student_tc).query("SELECT veliTc FROM Users WHERE tc=@stc");
       if(veliCheck.recordset.length && veliCheck.recordset[0].veliTc) {
          const veliMsg = isUpdate ? 
            `Çocuğunuzun '${info.title}' ödev notu ${grade} olarak güncellendi.` :
            `Çocuğunuzun '${info.title}' ödevine not girildi: ${grade}`;
          await p.request().input('vtc', sql.NVarChar, veliCheck.recordset[0].veliTc).input('msg', sql.NVarChar, veliMsg)
                 .query("INSERT INTO Notifications(receiver_tc, text, isRead) VALUES(@vtc, @msg, 0)");
       }
    }
    
    res.json({success:true});
  } catch(e) { res.status(500).json({success:false, message:e.message}); }
});

// --- ÖĞRENCİ NOTLARI ÇEKME (ödev notları + sınav notları) ---
app.get('/api/student-grades', async (req, res) => {
  const { student_tc } = req.query;
  try {
    const p = await getPool();
    if (!p) return res.json({ success: false, grades: [] });
    const q = `
      SELECT a.title as title, a.teacher_name as teacher, s.grade as score, 'Ödev' as type, s.createdAt as date
      FROM AssignmentSubmissions s
      JOIN Assignments a ON s.assignment_id = a.id
      WHERE s.student_tc = @tc AND s.grade IS NOT NULL
      UNION ALL
      SELECT title, subject as teacher, score, 'Sınav' as type, takenAt as date
      FROM TestResults
      WHERE student_tc = @tc
      ORDER BY date DESC
    `;
    const r = await p.request().input('tc', sql.NVarChar, student_tc).query(q);
    res.json({success:true, grades: r.recordset});
  } catch(e) { res.status(500).json({success:false, grades:[], message:e.message}); }
});


// ─── ÖĞRENME ANALİZİ API ─────────────────────────────────────────
app.get('/api/analytics/weak-subjects', authenticateToken, async (req, res) => {
  const tc = req.user.tc;
  try {
    const p = await getPool();
    const r = await p.request().input('tc', sql.NVarChar, tc).query("SELECT subject, AVG(score*100/total) as avg_score FROM TestResults WHERE student_tc=@tc GROUP BY subject HAVING AVG(score*100/total) < 60");
    res.json({ success: true, weakSubjects: r.recordset });
  } catch(e) { res.status(500).json({ success: false, message: e.message }); }
});

// Global Hata Yakalayıcı
app.use((err, req, res, next) => {
  console.error('❌ Sunucu Hatası:', err);
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ success: false, message: 'Gönderilen dosya çok büyük! (Max 50MB)' });
  }
  res.status(500).json({ success: false, message: 'Bir sunucu hatası oluştu: ' + err.message });
});

// ─── KÜTÜPHANE ────────────────────────────────────────────────────
app.get('/api/library', authenticateToken, async (req, res) => {
  const { school, category } = req.query;
  try {
    const p = await getPool();
    let q = 'SELECT * FROM Library WHERE school=@sch';
    const reqL = p.request().input('sch', sql.NVarChar, school);
    if(category && category !== 'Tümü') {
      q += ' AND category=@cat';
      reqL.input('cat', sql.NVarChar, category);
    }
    q += ' ORDER BY createdAt DESC';
    const r = await reqL.query(q);
    res.json({ success: true, materials: r.recordset });
  } catch(e) { res.status(500).json({ success: false, message: e.message }); }
});

app.post('/api/library', authenticateToken, async (req, res) => {
  if(req.user.role !== 'ogretmen') return res.status(403).json({ success: false, message: 'Sadece öğretmenler kaynak yükleyebilir.' });
  const { title, description, file_name, file_data, category, school } = req.body;
  try {
    const p = await getPool();
    await p.request()
      .input('tc',    sql.NVarChar, req.user.tc)
      .input('name',  sql.NVarChar, req.user.name)
      .input('title', sql.NVarChar, title)
      .input('desc',  sql.NVarChar, description)
      .input('fname', sql.NVarChar, file_name)
      .input('fdata', sql.NVarChar, file_data)
      .input('cat',   sql.NVarChar, category)
      .input('sch',   sql.NVarChar, school)
      .query(`INSERT INTO Library (teacher_tc, teacher_name, title, description, file_name, file_data, category, school)
              VALUES (@tc, @name, @title, @desc, @fname, @fdata, @cat, @sch)`);
    res.json({ success: true });
  } catch(e) { res.status(500).json({ success: false, message: e.message }); }
});

// ─── QUIZ SISTEMI ──────────────────────────────────────────────────
app.get('/api/quizzes', authenticateToken, async (req, res) => {
  const { school, target_class } = req.query;
  try {
    const p = await getPool();
    let q = 'SELECT * FROM Quizzes WHERE school=@sch AND id NOT IN (SELECT quiz_id FROM QuizResults WHERE student_tc=@utc)';
    const reqQ = p.request().input('sch', sql.NVarChar, school).input('utc', sql.NVarChar, req.user.tc);
    if(target_class && target_class !== 'all') {
      q += " AND (target_class LIKE '%' + @cls + '%' OR @cls LIKE '%' + target_class + '%' OR target_class='all')";
      reqQ.input('cls', sql.NVarChar, target_class);
    }
    const r = await reqQ.query(q);
    res.json({ success: true, quizzes: r.recordset });
  } catch(e) { res.status(500).json({ success: false, message: e.message }); }
});

// ─── LEADERBOARD API ──────────────────────────────────────────────────
app.get('/api/leaderboard', async (req, res) => {
  try {
    const p = await getPool();
    if (!p) return res.json({ success: true, leaderboard: [] });
    const r = await p.request().query('SELECT TOP 10 name, points, school, [class] FROM Users WHERE role=\'ogrenci\' ORDER BY points DESC');
    res.json({ success: true, leaderboard: r.recordset });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

app.post('/api/quizzes', authenticateToken, async (req, res) => {
  if(req.user.role !== 'ogretmen') return res.status(403).json({ success: false, message: 'Yetkisiz işlem.' });
  const { title, subject, target_class, school, time_limit, questions } = req.body;
  try {
    const p = await getPool();
    const transaction = new sql.Transaction(p);
    await transaction.begin();
    try {
      const quizRes = await transaction.request()
        .input('tc',    sql.NVarChar, req.user.tc)
        .input('name',  sql.NVarChar, req.user.name)
        .input('title', sql.NVarChar, title)
        .input('subj',  sql.NVarChar, subject)
        .input('cls',   sql.NVarChar, target_class)
        .input('sch',   sql.NVarChar, school)
        .input('time',  sql.Int,      time_limit)
        .query(`INSERT INTO Quizzes (teacher_tc, teacher_name, title, subject, target_class, school, time_limit)
                OUTPUT INSERTED.id VALUES (@tc, @name, @title, @subj, @cls, @sch, @time)`);
      
      const quizId = quizRes.recordset[0].id;
      
      // Sorular varsa ekle
      if (Array.isArray(questions)) {
        for(const q of questions) {
          await transaction.request()
            .input('qid',   sql.Int, quizId)
            .input('txt',   sql.NVarChar, q.question_text)
            .input('a',     sql.NVarChar, q.opt_a)
            .input('b',     sql.NVarChar, q.opt_b)
            .input('c',     sql.NVarChar, q.opt_c)
            .input('d',     sql.NVarChar, q.opt_d)
            .input('corr',  sql.NVarChar, q.correct_opt)
            .input('p',     sql.Int,      q.points || 10)
            .query(`INSERT INTO QuizQuestions (quiz_id, question_text, opt_a, opt_b, opt_c, opt_d, correct_opt, points)
                    VALUES (@qid, @txt, @a, @b, @c, @d, @corr, @p)`);
        }
      }
      
      await transaction.commit();

      // 📢 Bildirim gönder (Arka planda, transaction dışında yapılması daha güvenli olabilir veya içinde)
      try {
        const notifText = `📝 Yeni Sınav: "${title}" (${subject}) yayına girdi!`;
        let q = "SELECT tc FROM Users WHERE role='ogrenci' AND school=@sch";
        const reqN = p.request().input('sch', sql.NVarChar, school);
        if(target_class && target_class !== 'all') {
          q += " AND (class LIKE '%' + @cls + '%' OR @cls LIKE '%' + class + '%')";
          reqN.input('cls', sql.NVarChar, target_class);
        }
        const students = await reqN.query(q);
        for(const s of students.recordset) {
          await p.request().input('stc', sql.NVarChar, s.tc).input('txt', sql.NVarChar, notifText)
                 .query("INSERT INTO Notifications(receiver_tc, text, isRead) VALUES(@stc, @txt, 0)");
        }
      } catch(e) { console.error('Quiz bildirim hatası:', e); }

      res.json({ success: true, quizId });
    } catch(e) { await transaction.rollback(); throw e; }
  } catch(e) { res.status(500).json({ success: false, message: e.message }); }
});

app.get('/api/quiz-questions', authenticateToken, async (req, res) => {
  const { quiz_id } = req.query;
  try {
    const p = await getPool();
    const r = await p.request().input('qid', sql.Int, quiz_id).query('SELECT * FROM QuizQuestions WHERE quiz_id=@qid');
    res.json({ success: true, questions: r.recordset });
  } catch(e) { res.status(500).json({ success: false, message: e.message }); }
});

app.post('/api/quiz-submit', authenticateToken, async (req, res) => {
  const { quiz_id, quiz_title, answers } = req.body;
  try {
    const p = await getPool();
    const questionsR = await p.request().input('qid', sql.Int, quiz_id).query('SELECT id, correct_opt, points FROM QuizQuestions WHERE quiz_id=@qid');
    const questions = questionsR.recordset;

    let score = 0, total = 0, correct = 0, wrong = 0;
    questions.forEach(q => {
      total += q.points;
      if(answers[q.id] === q.correct_opt) { score += q.points; correct++; }
      else { wrong++; }
    });

    await p.request()
      .input('stc',   sql.NVarChar, req.user.tc)
      .input('sname', sql.NVarChar, req.user.name)
      .input('qid',   sql.Int,      quiz_id)
      .input('qtitle',sql.NVarChar, quiz_title)
      .input('score', sql.Int,      score)
      .input('total', sql.Int,      total)
      .input('corr',  sql.Int,      correct)
      .input('wrng',  sql.Int,      wrong)
      .query(`INSERT INTO QuizResults (student_tc, student_name, quiz_id, quiz_title, score, total_score, correct_count, wrong_count)
              VALUES (@stc, @sname, @qid, @qtitle, @score, @total, @corr, @wrng)`);

    // 🏆 ÖDÜL: Quiz bitirme = Puan + 20 Coin
    await p.request().input('tc', sql.NVarChar, req.user.tc).input('pts', sql.Int, score)
           .query('UPDATE Users SET points = points + @pts, coins = ISNULL(coins,0) + 20 WHERE tc=@tc');
    
    // Rozet Kontrolü (Basit örnek: Her sınav bitirene ilk sınav rozeti verilebilir veya belli puanda)
    // 📈 İSTATİSTİK: EBA'da ne yaptın kısmını güncelle
    try {
      await p.request().input('tc', sql.NVarChar, req.user.tc)
        .query(`IF EXISTS(SELECT 1 FROM StudentStats WHERE student_tc=@tc)
                UPDATE StudentStats SET exam_count=exam_count+1, updatedAt=GETDATE() WHERE student_tc=@tc
                ELSE
                INSERT INTO StudentStats(student_tc, exam_count) VALUES(@tc, 1)`);
      
      // Rozet Kontrolü (Geri eklendi)
      if(score >= total * 0.9) {
        const badge = await p.request().query("SELECT id FROM Badges WHERE name='Quiz Şampiyonu'");
        if(badge.recordset.length) {
          const bid = badge.recordset[0].id;
          await p.request().input('tc', req.user.tc).input('bid', bid)
                 .query('IF NOT EXISTS(SELECT 1 FROM UserBadges WHERE user_tc=@tc AND badge_id=@bid) INSERT INTO UserBadges(user_tc, badge_id) VALUES(@tc,@bid)');
        }
      }
    } catch(e) {}

    res.json({ success: true, score, total, correct, wrong });
    io.emit('refresh_data');
  } catch(e) { res.status(500).json({ success: false, message: e.message }); }
});

// ─── OYUNLAŞTIRMA / ROZETLER ──────────────────────────────────────
app.get('/api/user-badges', authenticateToken, async (req, res) => {
  const { tc } = req.query;
  try {
    const p = await getPool();
    const r = await p.request().input('tc', sql.NVarChar, tc)
           .query('SELECT b.*, ub.awardedAt FROM UserBadges ub JOIN Badges b ON ub.badge_id=b.id WHERE ub.user_tc=@tc');
    res.json({ success: true, badges: r.recordset });
  } catch(e) { res.status(500).json({ success: false, message: e.message }); }
});

// Leaderboard API (Dosya sonundaki /api/leaderboard kullanılıyor)


// ─── ANALITIK / CHART VERISI ─────────────────────────────────────
app.get('/api/analytics/student-performance', authenticateToken, async (req, res) => {
  const { tc } = req.query;
  try {
    const p = await getPool();
    // Son 10 sınav/ödev puanını çekelim
    const grades = await p.request().input('tc', sql.NVarChar, tc)
                 .query('SELECT TOP 10 score as value, takenAt as date, \'Quiz\' as label FROM QuizResults WHERE student_tc=@tc UNION ALL SELECT TOP 10 grade as value, createdAt as date, \'Ödev\' as label FROM AssignmentSubmissions WHERE student_tc=@tc AND isGraded=1 ORDER BY date ASC');
    res.json({ success: true, performance: grades.recordset });
  } catch(e) { res.status(500).json({ success: false, message: e.message }); }
});

app.get('/api/competition/leaderboard', async (req, res) => {
  const { school } = req.query;
  try {
    const p = await getPool();
    let q = "SELECT TOP 10 winner_tc as tc, winner_name as name, COUNT(*) as wins, SUM(points_awarded) as total_points FROM CompetitionResults cr";
    const r = p.request();
    if (school) { q += " JOIN Users u ON cr.winner_tc = u.tc WHERE u.school = @sch"; r.input('sch', sql.NVarChar, school); }
    q += " GROUP BY winner_tc, winner_name ORDER BY total_points DESC";
    const result = await r.query(q);
    res.json({ success: true, leaderboard: result.recordset });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

app.get('/api/appointments/teachers', authenticateToken, async (req, res) => {
  try {
    const p = await getPool();
    // 1. Velinin öğrencilerini bul (veliTc ile eşleşen)
    const studentR = await p.request().input('vtc', sql.NVarChar, req.user.tc)
      .query("SELECT tc, name, TRIM(school) as school, ISNULL(classNum, class) as classNum FROM Users WHERE veliTc=@vtc AND role='ogrenci'");
    const students = studentR.recordset;
    
    // 2. Filtreleme kriterlerini belirle
    let schools = students.map(s => s.school).filter(s => s);
    let studentClasses = students.map(s => s.classNum).filter(s => s);

    // Eğer velinin bağlı öğrencisi yoksa ama velinin kendi okul bilgisi varsa onu kullan (Fallback)
    if (schools.length === 0 && req.user.school) {
      schools.push(req.user.school.trim());
    }

    if (schools.length === 0) return res.json({ success: true, teachers: [], students: [] });

    // 3. Bu okullardaki öğretmenleri getir
    let teacherQuery = "SELECT tc, name, branch, TRIM(school) as school, ISNULL(classNum, class) as taughtClasses FROM Users WHERE role='ogretmen'";
    teacherQuery += " AND TRIM(school) IN (" + schools.map((s, i) => "@sch" + i).join(",") + ")";

    const request = p.request();
    schools.forEach((s, i) => request.input("sch" + i, sql.NVarChar, s));
    
    const teacherR = await request.query(teacherQuery);
    let allTeachers = teacherR.recordset;

    // 4. Eğer öğrenci sınıfları belliyse, o sınıfların öğretmenlerini önceliklendir veya sadece onları göster
    let filteredTeachers = allTeachers;
    if (studentClasses.length > 0) {
      filteredTeachers = allTeachers.filter(t => {
        if (!t.taughtClasses) return true; 
        return studentClasses.some(sc => t.taughtClasses.includes(sc));
      });
    }

    // Eğer filtreleme sonucu boş kalırsa okulun tüm öğretmenlerini göster (Hiç yoktan iyidir)
    if (filteredTeachers.length === 0) filteredTeachers = allTeachers;

    res.json({ success: true, teachers: filteredTeachers, students: students });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

app.get('/api/appointments', authenticateToken, async (req, res) => {
  try {
    const p = await getPool();
    let q = "SELECT * FROM Appointments WHERE teacher_tc=@tc OR parent_tc=@tc ORDER BY appt_date DESC, appt_time DESC";
    const r = await p.request().input('tc', sql.NVarChar, req.user.tc).query(q);
    res.json({ success: true, appointments: r.recordset });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

app.post('/api/appointments', authenticateToken, async (req, res) => {
  const { teacher_tc, teacher_name, student_tc, student_name, appt_date, appt_time, note } = req.body;
  try {
    const p = await getPool();
    await p.request()
      .input('ptc', req.user.tc)
      .input('pname', req.user.name)
      .input('ttc', teacher_tc)
      .input('tname', teacher_name)
      .input('stc', student_tc)
      .input('sname', student_name)
      .input('date', appt_date)
      .input('time', appt_time)
      .input('note', note || '')
      .query("INSERT INTO Appointments (parent_tc, parent_name, teacher_tc, teacher_name, student_tc, student_name, appt_date, appt_time, note, status) VALUES (@ptc, @pname, @ttc, @tname, @stc, @sname, @date, @time, @note, 'beklemede')");
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

app.put('/api/appointments/:id', authenticateToken, async (req, res) => {
  const { status } = req.body;
  try {
    const p = await getPool();
    await p.request()
      .input('id', req.params.id)
      .input('status', status)
      .query("UPDATE Appointments SET status=@status WHERE id=@id");
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});



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
      .query(`INSERT INTO ForumQuestions (author_tc, author_name, title, content, category, school) VALUES (@tc, @name, @title, @content, @category, @school);
              UPDATE Users SET points = ISNULL(points,0) + 5, coins = ISNULL(coins,0) + 5 WHERE tc=@tc;`);
      
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
          const notifMsg = `Forumda sorduğunuz "${qTitle}" sorusuna ${u.name} cevap yazdı.===FORUM_ANS|${id}===`;
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


// ─── WHITEBOARD API ──────────────────────────────────────────────────
let whiteboardStrokes = [];
const whiteboardUsers = new Map(); // socketId -> { tc, name, role, hasHand, hasPermission }
const competitionQueue = [];

app.get('/api/whiteboard', (req, res) => {
  res.json({ success: true, strokes: whiteboardStrokes });
});

app.post('/api/whiteboard', authenticateToken, (req, res) => {
  if (req.user.role !== 'ogretmen') return res.status(403).json({ success: false, message: 'Yetkisiz' });
  const { stroke } = req.body;
  if(stroke) whiteboardStrokes.push(stroke);
  // Sınırla (Çok dolmasın)
  if(whiteboardStrokes.length > 5000) whiteboardStrokes = whiteboardStrokes.slice(whiteboardStrokes.length - 5000);
  res.json({ success: true });
});

app.post('/api/whiteboard/clear', authenticateToken, (req, res) => {
  if (req.user.role !== 'ogretmen') return res.status(403).json({ success: false, message: 'Yetkisiz' });
  whiteboardStrokes = [];
  res.json({ success: true });
});


// AI Chat kaldırıldı

// ─── GAMIFICATION & SHOP API ─────────────────────────────────────────
app.get('/api/user/gamification-status', authenticateToken, async (req, res) => {
  try {
    const p = await getPool();
    const r = await p.request().input('tc', sql.NVarChar, req.user.tc)
           .query('SELECT points, coins, streak, last_login, badges, avatar_items, selected_avatar FROM Users WHERE tc=@tc');
    
    if (r.recordset.length === 0) return res.status(404).json({ success: false });
    
    const user = r.recordset[0];
    let newStreak = user.streak || 0;
    // Günlük giriş kontrolü artık login aşamasında yapılıyor.

    res.json({ 
      success: true, 
      points: user.points, 
      coins: user.coins, 
      streak: newStreak, 
      badges: JSON.parse(user.badges || '[]'),
      avatar_items: JSON.parse(user.avatar_items || '[]'),
      selected_avatar: user.selected_avatar ? JSON.parse(user.selected_avatar) : null
    });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

app.get('/api/shop/items', (req, res) => {
  const items = [
    // ŞAPKALAR
    { id: 'hat_cool', name: 'Havalı Şapka', price: 50, category: 'hat', img: '/assets/hat_cool.png' },
    { id: 'hat_crown', name: 'Altın Taç', price: 500, category: 'hat', img: '/assets/hat_crown.png' },
    { id: 'hat_chef', name: 'Aşçı Şapkası', price: 120, category: 'hat', img: '/assets/hat_chef.png' },
    { id: 'hat_viking', name: 'Viking Miğferi', price: 250, category: 'hat', img: '/assets/hat_viking.png' },
    { id: 'hat_ninja', name: 'Ninja Bandana', price: 180, category: 'hat', img: '/assets/hat_ninja.png' },
    { id: 'hat_magic', name: 'Sihirbaz Şapkası', price: 300, category: 'hat', img: '/assets/hat_magic.png' },
    { id: 'hat_cowboy', name: 'Kovboy Şapkası', price: 150, category: 'hat', img: '/assets/hat_cowboy.png' },
    { id: 'hat_pirate', name: 'Korsan Şapkası', price: 280, category: 'hat', img: '/assets/hat_pirate.png' },
    
    // GÖZLÜKLER
    { id: 'glasses_gold', name: 'Altın Gözlük', price: 100, category: 'glasses', img: '/assets/glasses_gold.png' },
    { id: 'glasses_sun', name: 'Güneş Gözlüğü', price: 60, category: 'glasses', img: '/assets/glasses_sun.png' },
    { id: 'glasses_monocle', name: 'Monokl', price: 200, category: 'glasses', img: '/assets/glasses_monocle.png' },
    { id: 'glasses_3d', name: '3D Gözlük', price: 150, category: 'glasses', img: '/assets/glasses_3d.png' },
    { id: 'glasses_nerd', name: 'İnek Gözlüğü', price: 80, category: 'glasses', img: '/assets/glasses_nerd.png' },
    { id: 'glasses_vr', name: 'VR Gözlük', price: 350, category: 'glasses', img: '/assets/glasses_vr.png' },
    { id: 'glasses_heart', name: 'Kalp Gözlük', price: 120, category: 'glasses', img: '/assets/glasses_heart.png' },
    
    // ARKA PLANLAR
    { id: 'bg_space', name: 'Uzay Arka Planı', price: 150, category: 'background', img: '/assets/bg_space.png' },
    { id: 'bg_beach', name: 'Plaj Teması', price: 220, category: 'background', img: '/assets/bg_beach.png' },
    { id: 'bg_matrix', name: 'Dijital Matrix', price: 400, category: 'background', img: '/assets/bg_matrix.png' },
    { id: 'bg_gold', name: 'Lüks Altın', price: 1000, category: 'background', img: '/assets/bg_gold.png' },
    { id: 'bg_forest', name: 'Mistik Orman', price: 300, category: 'background', img: '/assets/bg_forest.png' },
    { id: 'bg_fire', name: 'Alevler', price: 450, category: 'background', img: '/assets/bg_fire.png' },
    { id: 'bg_underwater', name: 'Sualtı Dünyası', price: 280, category: 'background', img: '/assets/bg_underwater.png' },
    
    // EVCİL HAYVANLAR
    { id: 'pet_cat', name: 'Robot Kedi', price: 300, category: 'pet', img: '/assets/pet_cat.png' },
    { id: 'pet_dragon', name: 'Yavru Ejderha', price: 800, category: 'pet', img: '/assets/pet_dragon.png' },
    { id: 'pet_owl', name: 'Bilge Baykuş', price: 450, category: 'pet', img: '/assets/pet_owl.png' },
    { id: 'pet_dog', name: 'Sadık Köpek', price: 350, category: 'pet', img: '/assets/pet_dog.png' },
    { id: 'pet_phoenix', name: 'Zümrüdüanka', price: 1200, category: 'pet', img: '/assets/pet_phoenix.png' },
    { id: 'pet_dinosaur', name: 'Mini Dinozor', price: 600, category: 'pet', img: '/assets/pet_dinosaur.png' }
  ];
  res.json({ success: true, items });
});

app.post('/api/shop/buy', authenticateToken, async (req, res) => {
  const { itemId, price } = req.body;
  try {
    const p = await getPool();
    const userR = await p.request().input('tc', req.user.tc).query('SELECT coins, avatar_items FROM Users WHERE tc=@tc');
    const user = userR.recordset[0];
    
    if (user.coins < price) return res.status(400).json({ success: false, message: 'Yetersiz EBA Coin!' });
    
    let items = JSON.parse(user.avatar_items || '[]');
    if (items.includes(itemId)) return res.status(400).json({ success: false, message: 'Bu eşyaya zaten sahipsiniz.' });
    
    items.push(itemId);
    await p.request()
      .input('tc', sql.NVarChar, req.user.tc)
      .input('price', sql.Int, price)
      .input('items', sql.NVarChar(sql.MAX), JSON.stringify(items))
      .query('UPDATE Users SET coins = coins - @price, avatar_items = @items WHERE tc=@tc');
      
    res.json({ success: true, message: 'Başarıyla satın alındı!' });
    io.emit('refresh_data');
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

app.post('/api/user/update-avatar', authenticateToken, async (req, res) => {
  const { avatar } = req.body; // { hat, glasses, background, etc }
  try {
    const p = await getPool();
    await p.request().input('tc', sql.NVarChar, req.user.tc).input('av', sql.NVarChar(sql.MAX), JSON.stringify(avatar)).query('UPDATE Users SET selected_avatar = @av WHERE tc=@tc');
    res.json({ success: true });
    io.emit('refresh_data');
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});


const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" }
});

const onlineUsers = new Map(); // tc -> socket.id

io.on('connection', (socket) => {
  console.log('⚡ Bir kullanıcı bağlandı:', socket.id);

  socket.on('login', (tc) => {
    if(tc) {
      onlineUsers.set(String(tc), socket.id);
      console.log(`👤 Kullanıcı giriş yaptı: ${tc} (Socket: ${socket.id})`);
    }
  });

  socket.on('join_group', (groupId) => {
    socket.join(`group_${groupId}`);
  });

  // --- WHITEBOARD SOCKET EVENTS ---
  socket.on('join_whiteboard', (userData) => {
    socket.join('whiteboard_room');
    if (userData && userData.tc) {
      whiteboardUsers.set(socket.id, { ...userData, hasHand: false, hasPermission: false, socketId: socket.id });
    }
    io.to('whiteboard_room').emit('participant_list', Array.from(whiteboardUsers.values()));
  });

  socket.on('draw', (data) => {
    socket.to('whiteboard_room').emit('draw', data);
    whiteboardStrokes.push(data.stroke);
    if(whiteboardStrokes.length > 5000) whiteboardStrokes.shift();
  });

  socket.on('clear_board', () => {
    socket.to('whiteboard_room').emit('clear_board');
    whiteboardStrokes = [];
  });

  socket.on('raise_hand', () => {
    const u = whiteboardUsers.get(socket.id);
    if(u) { u.hasHand = true; io.to('whiteboard_room').emit('participant_list', Array.from(whiteboardUsers.values())); }
  });

  socket.on('lower_hand', () => {
    const u = whiteboardUsers.get(socket.id);
    if(u) { u.hasHand = false; io.to('whiteboard_room').emit('participant_list', Array.from(whiteboardUsers.values())); }
  });

  socket.on('grant_permission', (sid) => {
    const sender = whiteboardUsers.get(socket.id);
    if (!sender || sender.role !== 'ogretmen') return;
    const target = whiteboardUsers.get(sid);
    if(target) { target.hasPermission = true; io.to(sid).emit('permission_granted'); }
    io.to('whiteboard_room').emit('participant_list', Array.from(whiteboardUsers.values()));
  });

  socket.on('revoke_permission', (sid) => {
    const sender = whiteboardUsers.get(socket.id);
    if (!sender || sender.role !== 'ogretmen') return;
    const target = whiteboardUsers.get(sid);
    if(target) { target.hasPermission = false; io.to(sid).emit('permission_revoked'); }
    io.to('whiteboard_room').emit('participant_list', Array.from(whiteboardUsers.values()));
  });

  socket.on('toggle_audio', (data) => {
    socket.to('whiteboard_room').emit('toggle_audio', data);
  });

  socket.on('toggle_lesson', (data) => {
    socket.to('whiteboard_room').emit('toggle_lesson', data);
  });

  socket.on('join_competition', (data) => {
    competitionQueue.push({ ...data, socketId: socket.id });
    if(competitionQueue.length >= 2) {
       const p1 = competitionQueue.shift(); const p2 = competitionQueue.shift();
       io.to(p1.socketId).emit('competition_matched', { opponentTc: p2.tc, opponentName: p2.name });
       io.to(p2.socketId).emit('competition_matched', { opponentTc: p1.tc, opponentName: p1.name });
    }
  });

  socket.on('disconnect', () => {
    whiteboardUsers.delete(socket.id);
    io.to('whiteboard_room').emit('participant_list', Array.from(whiteboardUsers.values()));
    const idx = competitionQueue.findIndex(x => x.socketId === socket.id);
    if(idx !== -1) competitionQueue.splice(idx, 1);
    for (let [tc, id] of onlineUsers.entries()) {
      if (id === socket.id) {
        onlineUsers.delete(tc);
        break;
      }
    }
  });
});

server.listen(PORT, () => {
  console.log(`🚀 Sunucu http://localhost:${PORT} üzerinde çalışıyor.`);
  console.log(`🗄️  Veritabanı: MSSQL (sa@localhost/EBA_DB) — Yerel fallback YOK.`);
}).on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} zaten kullanımda. Lütfen çalışan diğer sunucu süreçlerini kapatın.`);
  } else {
    console.error('❌ Sunucu başlatılamadı:', err);
  }
});
