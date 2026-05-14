-- EBA_DB veritabanını oluşturma scripti
-- Bu scripti SQL Server Management Studio'da çalıştırın

USE master;
GO

-- EBA_DB veritabanını oluştur
IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = 'EBA_DB')
BEGIN
    CREATE DATABASE EBA_DB;
    PRINT 'EBA_DB veritabanı oluşturuldu.';
END
ELSE
BEGIN
    PRINT 'EBA_DB veritabanı zaten mevcut.';
END
GO

-- Veritabanını kullan
USE EBA_DB;
GO

-- Kullanıcılar tablosu
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Users' AND xtype='U')
BEGIN
    CREATE TABLE Users (
        id INT IDENTITY(1,1) PRIMARY KEY,
        tc NVARCHAR(11) UNIQUE NOT NULL,
        name NVARCHAR(100) NOT NULL,
        surname NVARCHAR(100) NOT NULL,
        email NVARCHAR(255) UNIQUE,
        password NVARCHAR(255) NOT NULL,
        role NVARCHAR(20) NOT NULL CHECK (role IN ('ogrenci', 'ogretmen', 'veli')),
        school NVARCHAR(255),
        class NVARCHAR(50),
        classNum NVARCHAR(10),
        profilePic NVARCHAR(500),
        created_at DATETIME DEFAULT GETDATE(),
        last_login DATETIME,
        is_active BIT DEFAULT 1
    );
    PRINT 'Users tablosu oluşturuldu.';
END

-- Diğer tablolar buraya eklenecek...
PRINT 'Veritabanı kurulumu tamamlandı.';