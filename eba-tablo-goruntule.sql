-- =====================================================
-- EBA_DB TABLO GÖRÜNTÜLEYİCİ
-- SSMS'te bu dosyayı açıp F5 ile çalıştırın
-- Sağ üstten hangi sorguyu çalıştırmak istiyorsanız
-- o bloğu seçip F5'e basın
-- =====================================================

USE EBA_DB;
GO

-- ─── 1. MEVCUT TABLOLARI LİSTELE ──────────────────
SELECT 
    TABLE_NAME AS [Tablo Adı],
    TABLE_TYPE AS [Tür]
FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_TYPE = 'BASE TABLE'
ORDER BY TABLE_NAME;
GO

-- ─── 2. KULLANICILAR (Users) ──────────────────────
SELECT 
    id, tc, role AS [Rol], name AS [Ad Soyad],
    school AS [Okul], class AS [Sınıf],
    grade_avg AS [Ortalama], isOnline AS [Çevrimiçi],
    veliTc AS [Veli TC], createdAt AS [Kayıt Tarihi]
FROM Users
ORDER BY createdAt DESC;
GO

-- ─── 3. ÖĞRENCİ İSTATİSTİKLERİ (EBA'da Ne Yaptın?) ─
SELECT 
    ss.student_tc AS [Öğrenci TC],
    u.name AS [Öğrenci Adı],
    ss.content_count AS [İçerik Sayısı],
    ss.exam_count AS [Sınav Sayısı],
    ss.social_count AS [Sosyal Paylaşım],
    ss.video_minutes AS [Video (dk)],
    ss.week_start AS [Hafta Başlangıcı],
    ss.updatedAt AS [Son Güncelleme]
FROM StudentStats ss
LEFT JOIN Users u ON u.tc = ss.student_tc
ORDER BY ss.updatedAt DESC;
GO

-- ─── 4. PAYLAŞIMLAR (Posts / Feed) ───────────────
SELECT 
    id, author_tc AS [Yazar TC], author_name AS [Yazar Adı],
    type AS [Tür], 
    LEFT(content, 80) AS [İçerik (ilk 80 kar)],
    target_group AS [Hedef Grup],
    school AS [Okul], 
    createdAt AS [Tarih]
FROM Posts
ORDER BY createdAt DESC;
GO

-- ─── 5. GÖNDERİLEN ÖDEVLER (Assignments) ────────
SELECT 
    id, teacher_tc AS [Öğretmen TC], teacher_name AS [Öğretmen],
    title AS [Ödev Başlığı], subject AS [Ders],
    due_date AS [Son Tarih], target_class AS [Sınıf],
    school AS [Okul], createdAt AS [Gönderilme Tarihi]
FROM Assignments
ORDER BY createdAt DESC;
GO

-- ─── 6. İZLENEN VİDEOLAR (WatchedVideos) ────────
SELECT 
    wv.id, wv.student_tc AS [Öğrenci TC],
    u.name AS [Öğrenci Adı],
    wv.title AS [Video Başlığı],
    wv.subject AS [Ders],
    wv.duration AS [Süre (dk)],
    wv.watchedAt AS [İzlenme Tarihi]
FROM WatchedVideos wv
LEFT JOIN Users u ON u.tc = wv.student_tc
ORDER BY wv.watchedAt DESC;
GO

-- ─── 7. YAPILAN TESTLER / SINAVLAR (TestResults) ──
SELECT 
    tr.id, tr.student_tc AS [Öğrenci TC],
    u.name AS [Öğrenci Adı],
    tr.title AS [Test Adı],
    tr.subject AS [Ders],
    tr.score AS [Puan],
    tr.total AS [Toplam],
    CASE WHEN tr.total > 0 
         THEN CAST(ROUND(tr.score * 100.0 / tr.total, 1) AS NVARCHAR) + '%' 
         ELSE '-' END AS [Başarı %],
    tr.duration AS [Süre (dk)],
    tr.takenAt AS [Test Tarihi]
FROM TestResults tr
LEFT JOIN Users u ON u.tc = tr.student_tc
ORDER BY tr.takenAt DESC;
GO

-- ─── 8. AKTİVİTE LOGU (ActivityLogs) ────────────
SELECT 
    al.id, al.user_tc AS [Kullanıcı TC],
    u.name AS [Kullanıcı Adı], u.role AS [Rol],
    al.event_type AS [Olay Türü],
    al.event_desc AS [Açıklama],
    al.duration AS [Süre],
    al.createdAt AS [Tarih]
FROM ActivityLogs al
LEFT JOIN Users u ON u.tc = al.user_tc
ORDER BY al.createdAt DESC;
GO

-- ─── 9. AYARLAR DEĞİŞİKLİKLERİ (SettingsChanges) ─
SELECT 
    sc.id, sc.user_tc AS [Kullanıcı TC],
    u.name AS [Kullanıcı Adı], u.role AS [Rol],
    sc.field AS [Değiştirilen Alan],
    sc.old_value AS [Eski Değer],
    sc.new_value AS [Yeni Değer],
    sc.changedAt AS [Değiştirilme Tarihi]
FROM SettingsChanges sc
LEFT JOIN Users u ON u.tc = sc.user_tc
ORDER BY sc.changedAt DESC;
GO

-- ─── 10. NOTLAR (Grades) ─────────────────────────
SELECT 
    g.id, 
    g.student_tc AS [Öğrenci TC],
    us.name AS [Öğrenci Adı],
    g.teacher_tc AS [Öğretmen TC],
    ut.name AS [Öğretmen Adı],
    g.subject AS [Ders],
    g.grade AS [Not],
    g.note AS [Açıklama],
    g.createdAt AS [Tarih]
FROM Grades g
LEFT JOIN Users us ON us.tc = g.student_tc
LEFT JOIN Users ut ON ut.tc = g.teacher_tc
ORDER BY g.createdAt DESC;
GO

-- ─── 11. BİLDİRİMLER (Notifications) ────────────
SELECT 
    n.id, n.receiver_tc AS [Alıcı TC],
    u.name AS [Alıcı Adı],
    LEFT(n.text, 100) AS [Bildirim Metni],
    n.isRead AS [Okundu mu?],
    n.createdAt AS [Tarih]
FROM Notifications n
LEFT JOIN Users u ON u.tc = n.receiver_tc
ORDER BY n.createdAt DESC;
GO

-- ─── 12. CANLI DERSLER (LiveLessons) ─────────────
SELECT 
    id, teacher_tc AS [Öğretmen TC], teacher_name AS [Öğretmen],
    title AS [Ders Adı], link AS [Link],
    lesson_date AS [Tarih], lesson_time AS [Saat],
    target_class AS [Hedef Sınıf],
    school AS [Okul],
    createdAt AS [Oluşturulma]
FROM LiveLessons
ORDER BY createdAt DESC;
GO

-- ─── 13. KULLANICI TERCİHLERİ / AYARLAR (UserPrefs) ─
SELECT 
    up.tc AS [Kullanıcı TC],
    u.name AS [Ad Soyad], u.role AS [Rol],
    up.theme AS [Tema],
    CASE up.notifications WHEN 1 THEN 'Açık' ELSE 'Kapalı' END AS [Bildirimler],
    CASE up.sound WHEN 1 THEN 'Açık' ELSE 'Kapalı' END AS [Ses],
    CASE up.visible WHEN 1 THEN 'Görünür' ELSE 'Gizli' END AS [Profil Görünürlüğü],
    up.updatedAt AS [Son Güncelleme]
FROM UserPrefs up
LEFT JOIN Users u ON u.tc = up.tc
ORDER BY up.updatedAt DESC;
GO

-- ─── 14. ÖZET İSTATİSTİK ─────────────────────────
SELECT 
    (SELECT COUNT(*) FROM Users WHERE role='ogrenci')   AS [Toplam Öğrenci],
    (SELECT COUNT(*) FROM Users WHERE role='ogretmen')  AS [Toplam Öğretmen],
    (SELECT COUNT(*) FROM Users WHERE role='veli')      AS [Toplam Veli],
    (SELECT COUNT(*) FROM Posts)                        AS [Toplam Paylaşım],
    (SELECT COUNT(*) FROM Assignments)                  AS [Toplam Ödev],
    (SELECT COUNT(*) FROM WatchedVideos)                AS [İzlenen Video],
    (SELECT COUNT(*) FROM TestResults)                  AS [Yapılan Test],
    (SELECT COUNT(*) FROM ActivityLogs)                 AS [Aktivite Logu],
    (SELECT COUNT(*) FROM SettingsChanges)              AS [Ayar Değişikliği],
    (SELECT COUNT(*) FROM Grades)                       AS [Verilen Not];
GO
