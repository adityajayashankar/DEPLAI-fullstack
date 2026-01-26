const mysql = require('mysql2/promise');

async function testConnection() {
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'aditya2004j16',
      database: 'deplai'
    });

    console.log('✅ Connected to MySQL successfully!');

    const [tables] = await connection.execute('SHOW TABLES');
    console.log('✅ Tables found:', tables.length);
    tables.forEach(table => {
      console.log('  -', Object.values(table)[0]);
    });

    await connection.end();
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
  }
}

testConnection();