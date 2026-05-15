require('dotenv').config();
const sql = require('mssql');

const config = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER,
    database: process.env.DB_NAME,
    port: parseInt(process.env.DB_PORT) || 1433,
    options: {
        encrypt: false,
        trustServerCertificate: true
    }
};

async function testConnection() {
    try {
        console.log('Connecting to database with config:', {
            server: config.server,
            database: config.database,
            user: config.user
        });
        const pool = await sql.connect(config);
        console.log('Successfully connected to SQL Server');
        
        const result = await pool.request().query('SELECT DB_NAME() AS DatabaseName');
        console.log('Connected to database:', result.recordset[0].DatabaseName);
        
        await sql.close();
        process.exit(0);
    } catch (err) {
        console.error('Database connection error:', err.message);
        process.exit(1);
    }
}

testConnection();
