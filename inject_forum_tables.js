const fs = require('fs');
let code = fs.readFileSync('server.js', 'utf8');

const injection = `      )\`,

    // 24. FORUM SORULARI
    \`IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='ForumQuestions' AND xtype='U')
     CREATE TABLE ForumQuestions (
       id           INT IDENTITY(1,1) PRIMARY KEY,
       author_tc    NVARCHAR(11) NOT NULL,
       author_name  NVARCHAR(100),
       title        NVARCHAR(200) NOT NULL,
       content      NVARCHAR(MAX) NOT NULL,
       category     NVARCHAR(100) DEFAULT 'Genel',
       school       NVARCHAR(200),
       upvotes      INT DEFAULT 0,
       views        INT DEFAULT 0,
       is_solved    BIT DEFAULT 0,
       createdAt    DATETIME DEFAULT GETDATE()
     )\`,

    // 25. FORUM CEVAPLARI
    \`IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='ForumAnswers' AND xtype='U')
     CREATE TABLE ForumAnswers (
       id           INT IDENTITY(1,1) PRIMARY KEY,
       question_id  INT NOT NULL,
       author_tc    NVARCHAR(11) NOT NULL,
       author_name  NVARCHAR(100),
       content      NVARCHAR(MAX) NOT NULL,
       upvotes      INT DEFAULT 0,
       is_accepted  BIT DEFAULT 0,
       createdAt    DATETIME DEFAULT GETDATE()
     )\`
  ];`;

if(!code.includes("ForumQuestions")) {
  code = code.replace(/      \)`\r?\n\s*\];/g, injection);
  fs.writeFileSync('server.js', code);
  console.log('Injected successfully');
} else {
  console.log('Already exists');
}
