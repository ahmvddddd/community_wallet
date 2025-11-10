const pool = require('./db');

async function initServer() {
  try {
    console.log('⏳ Connecting to database...');
    
    await pool.query('SELECT 1');
    console.log('Connected to community_wallet database on Supabase');
  } catch (err) {
    console.error('Database connection failed:', err.message);
    console.error('Shutting down server...');
    process.exit(1);
  }
}

module.exports = initServer;
