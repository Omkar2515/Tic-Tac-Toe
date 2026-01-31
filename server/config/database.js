const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'pp123',
    database: process.env.DB_NAME || 'tictactoe',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Test connection
async function testConnection() {
    try {
        const connection = await pool.getConnection();
        console.log('✅ Database connected successfully');
        connection.release();
    } catch (err) {
        console.error('❌ Database connection failed:', err.message);
        console.error('   Make sure MySQL is running and credentials are correct in .env file');
    }
}

testConnection();

module.exports = pool;