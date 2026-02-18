const pool = require('./db');

async function initServer(retries = 5) {
  try {
    console.log('Connecting to database...');

    await pool.query('SELECT 1');
    console.log('Connected to community_wallet database on Supabase');
  } catch (error) {
    console.error('Database connection failed:', error.message);
    if (retries > 0) {
      console.log(`Retrying... (${retries} left)`);
      await new Promise(res => setTimeout(res, 3000));
      return initServer(retries - 1);
    }

    console.error('Database unreachable. Starting server anyway.');
  }
}

module.exports = initServer;
