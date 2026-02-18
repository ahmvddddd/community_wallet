const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 60000,
  connectionTimeoutMillis: 20000,
  ssl: {
    rejectUnauthorized: false,
  },
});

pool.on('connect', () => {
  console.log('Connected to community_wallet database on Supabase');
});

pool.on('error', (error) => {
  console.error('Unexpected PostgreSQL client error', error);
  // process.exit(-1);
});

module.exports = pool;
