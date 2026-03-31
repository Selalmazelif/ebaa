// db.js — server.js doğrudan mssql kullandığı için bu dosya sadece config exports
const sql = require('mssql');

const config = {
  user:     'sa',
  password: '123456',
  server:   'localhost',
  database: 'EBA_DB',
  options: {
    encrypt:               false,
    trustServerCertificate: true,
    enableArithAbort:      true
  }
};

module.exports = { sql, config };
